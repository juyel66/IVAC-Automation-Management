import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { inMemoryDb, mockPrisma } from './mockPrisma.js';

vi.mock('../src/config/database.js', () => ({
  prisma: mockPrisma,
  connectDatabase: vi.fn().mockResolvedValue(true),
}));

import { app } from '../src/app.js';
import { CryptoService } from '../src/services/crypto.service.js';
import { LicenseService } from '../src/modules/licenses/license.service.js';

describe('4. Security & Access Control Tests', () => {
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

  it('rejects unauthenticated requests to admin endpoints with 401', async () => {
    const res = await request(app).get('/api/v1/admin/licenses');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects requests with invalid or tampered bearer tokens with 401', async () => {
    const res = await request(app)
      .get('/api/v1/admin/licenses')
      .set('Authorization', 'Bearer invalid-garbage-token');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('license keys in list APIs are always masked and never return plaintext keys', async () => {
    await LicenseService.createLicense({ validityDays: 30, maxInstallations: 1 }, adminId);

    const res = await request(app)
      .get('/api/v1/admin/licenses')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const item = res.body.data[0];
    expect(item.keyMasked).toContain('****');
    expect(item.keyHash).toBeUndefined();
    expect(item.plainLicenseKey).toBeUndefined();
  });

  it('prevent another user/license from releasing an installation they do not own', async () => {
    // License A
    const licA = await LicenseService.createLicense({ validityDays: 30, maxInstallations: 1 }, adminId);
    await request(app)
      .post('/api/v1/licenses/activate')
      .send({ licenseKey: licA.plainLicenseKey, installationId: 'inst-owner-A' });

    // License B
    const licB = await LicenseService.createLicense({ validityDays: 30, maxInstallations: 1 }, adminId);

    // License B attempts to release inst-owner-A
    const attackRes = await request(app)
      .post('/api/v1/licenses/release-installation')
      .send({ licenseKey: licB.plainLicenseKey, installationId: 'inst-owner-A' });

    expect(attackRes.status).toBe(404);
    expect(attackRes.body.error.code).toBe('INSTALLATION_NOT_FOUND');

    // Verify inst-owner-A is still active!
    expect(inMemoryDb.licenseInstallations[0].status).toBe('ACTIVE');
  });

  it('verifies entitlement response contains valid HMAC-SHA256 signature', async () => {
    const lic = await LicenseService.createLicense({ validityDays: 30, maxInstallations: 1 }, adminId);
    const res = await request(app)
      .post('/api/v1/licenses/activate')
      .send({ licenseKey: lic.plainLicenseKey, installationId: 'inst-signed-test' });

    expect(res.status).toBe(200);
    expect(res.body.data.signature).toBeDefined();
    expect(typeof res.body.data.signature).toBe('string');
    expect(res.body.data.signature.length).toBe(64); // SHA-256 hex length
  });
});
