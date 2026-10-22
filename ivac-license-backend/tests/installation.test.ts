import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { inMemoryDb, mockPrisma } from './mockPrisma.js';

vi.mock('../src/config/database.js', () => ({
  prisma: mockPrisma,
  connectDatabase: vi.fn().mockResolvedValue(true),
}));

import { app } from '../src/app.js';
import { LicenseService } from '../src/modules/licenses/license.service.js';
import { CryptoService } from '../src/services/crypto.service.js';

describe('2. Browser Installation Limits & Release Tests', () => {
  let adminToken: string;
  const adminId = 'admin-test-uuid';

  beforeEach(async () => {
    inMemoryDb.reset();
    adminToken = CryptoService.generateAdminToken({
      adminId,
      email: 'admin@test.com',
      username: 'admin',
      role: 'SUPER_ADMIN',
    });
    inMemoryDb.admins.push({
      id: adminId,
      email: 'admin@test.com',
      username: 'admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    });
  });

  it('enforces installation limit strictly and rejects installation exceeding limit', async () => {
    // Create license with limit 1
    const created = await LicenseService.createLicense({ validityDays: 30, maxInstallations: 1 }, adminId);
    const plainKey = created.plainLicenseKey;

    // 1st installation succeeds
    const firstRes = await request(app)
      .post('/api/v1/licenses/activate')
      .send({ licenseKey: plainKey, installationId: 'browser-device-alpha' });
    expect(firstRes.status).toBe(200);
    expect(firstRes.body.data.availableSlots).toBe(0);

    // 2nd installation fails with 409
    const secondRes = await request(app)
      .post('/api/v1/licenses/activate')
      .send({ licenseKey: plainKey, installationId: 'browser-device-beta' });
    expect(secondRes.status).toBe(409);
    expect(secondRes.body.error.code).toBe('INSTALLATION_LIMIT_REACHED');
    expect(secondRes.body.message).toContain('Maximum browser installation limit reached');
  });

  it('releases an installation slot from client and allows another browser to take the slot', async () => {
    const created = await LicenseService.createLicense({ validityDays: 30, maxInstallations: 1 }, adminId);
    const plainKey = created.plainLicenseKey;

    // Browser A activates
    await request(app)
      .post('/api/v1/licenses/activate')
      .send({ licenseKey: plainKey, installationId: 'browser-device-alpha' });

    // Browser B attempts activation -> rejected
    const rejectRes = await request(app)
      .post('/api/v1/licenses/activate')
      .send({ licenseKey: plainKey, installationId: 'browser-device-beta' });
    expect(rejectRes.status).toBe(409);

    // Browser A releases its slot
    const releaseRes = await request(app)
      .post('/api/v1/licenses/release-installation')
      .send({ licenseKey: plainKey, installationId: 'browser-device-alpha' });
    expect(releaseRes.status).toBe(200);
    expect(releaseRes.body.success).toBe(true);

    // Now Browser B can activate!
    const betaRes = await request(app)
      .post('/api/v1/licenses/activate')
      .send({ licenseKey: plainKey, installationId: 'browser-device-beta' });
    expect(betaRes.status).toBe(200);
    expect(betaRes.body.data.activeInstallationsCount).toBe(1);
  });

  it('admin can revoke an individual installation directly', async () => {
    const created = await LicenseService.createLicense({ validityDays: 30, maxInstallations: 2 }, adminId);
    const plainKey = created.plainLicenseKey;

    await request(app)
      .post('/api/v1/licenses/activate')
      .send({ licenseKey: plainKey, installationId: 'browser-device-alpha' });

    const registeredInst = inMemoryDb.licenseInstallations[0];
    expect(registeredInst.status).toBe('ACTIVE');

    // Admin revokes installation
    const revokeRes = await request(app)
      .post(`/api/v1/admin/installations/${registeredInst.id}/revoke`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(revokeRes.status).toBe(200);
    expect(inMemoryDb.licenseInstallations[0].status).toBe('REVOKED');
    expect(inMemoryDb.licenseInstallations[0].revokedBy).toBe('ADMIN');

    // Browser device alpha now gets 403 on validation
    const valRes = await request(app)
      .post('/api/v1/licenses/validate')
      .send({ licenseKey: plainKey, installationId: 'browser-device-alpha' });
    expect(valRes.status).toBe(403);
    expect(valRes.body.error.code).toBe('INSTALLATION_REVOKED');
  });
});
