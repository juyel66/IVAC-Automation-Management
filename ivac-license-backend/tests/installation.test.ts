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

  it('handles repeated activation with the same installation ID idempotently without constraint error', async () => {
    const created = await LicenseService.createLicense({ validityDays: 30, maxInstallations: 1 }, adminId);
    const plainKey = created.plainLicenseKey;

    // First activation
    const firstRes = await request(app)
      .post('/api/v1/licenses/activate')
      .send({ licenseKey: plainKey, installationId: 'browser-device-repeat-test', installationLabel: 'Label 1' });
    expect(firstRes.status).toBe(200);
    expect(firstRes.body.data.activeInstallationsCount).toBe(1);

    // Repeated activation with same installation ID and same key
    const secondRes = await request(app)
      .post('/api/v1/licenses/activate')
      .send({ licenseKey: plainKey, installationId: 'browser-device-repeat-test', installationLabel: 'Label 2' });
    expect(secondRes.status).toBe(200);
    expect(secondRes.body.data.status).toBe('ACTIVE');
    expect(secondRes.body.data.activeInstallationsCount).toBe(1);
    expect(secondRes.body.data.availableSlots).toBe(0);

    // Verify only 1 record exists in database
    const matchingRecords = inMemoryDb.licenseInstallations.filter(
      (i) => i.installationId === 'browser-device-repeat-test'
    );
    expect(matchingRecords.length).toBe(1);
  });

  it('rejects activation when installation ID is actively bound to another license, but allows activation once released', async () => {
    // License A
    const licA = await LicenseService.createLicense({ validityDays: 30, maxInstallations: 2 }, adminId);
    // License B
    const licB = await LicenseService.createLicense({ validityDays: 30, maxInstallations: 2 }, adminId);

    // 1. Activate on License A
    const resA = await request(app)
      .post('/api/v1/licenses/activate')
      .send({ licenseKey: licA.plainLicenseKey, installationId: 'shared-device-id' });
    expect(resA.status).toBe(200);

    // 2. Attempt to activate same installation ID under License B while still active on A -> rejected
    const resB = await request(app)
      .post('/api/v1/licenses/activate')
      .send({ licenseKey: licB.plainLicenseKey, installationId: 'shared-device-id' });

    expect(resB.status).toBe(409);
    expect(resB.body.error.code).toBe('INSTALLATION_ALREADY_REGISTERED');
    expect(resB.body.message).toContain('active under another license');

    // Confirm installation still belongs strictly to License A
    const inst = inMemoryDb.licenseInstallations.find((i) => i.installationId === 'shared-device-id');
    expect(inst.licenseId).toBe(licA.license.id);

    // 3. Release installation slot from License A
    const releaseRes = await request(app)
      .post('/api/v1/licenses/release-installation')
      .send({ licenseKey: licA.plainLicenseKey, installationId: 'shared-device-id' });
    expect(releaseRes.status).toBe(200);
    expect(releaseRes.body.success).toBe(true);

    // 4. Now activate same installation ID on License B -> succeeds!
    const activateResB = await request(app)
      .post('/api/v1/licenses/activate')
      .send({ licenseKey: licB.plainLicenseKey, installationId: 'shared-device-id' });
    expect(activateResB.status).toBe(200);
    expect(activateResB.body.data.status).toBe('ACTIVE');
    expect(activateResB.body.data.activeInstallationsCount).toBe(1);

    // Confirm installation is now transferred and bound to License B
    const transferredInst = inMemoryDb.licenseInstallations.find((i) => i.installationId === 'shared-device-id');
    expect(transferredInst.licenseId).toBe(licB.license.id);
    expect(transferredInst.status).toBe('ACTIVE');
  });

  it('allows activating a new license if previous license has expired without manual release', async () => {
    // License A with 1 day validity
    const licA = await LicenseService.createLicense({ validityDays: 1, maxInstallations: 1 }, adminId);
    const licB = await LicenseService.createLicense({ validityDays: 30, maxInstallations: 1 }, adminId);

    // Activate on License A
    await request(app)
      .post('/api/v1/licenses/activate')
      .send({ licenseKey: licA.plainLicenseKey, installationId: 'expired-switch-device' });

    // Simulate License A expiry
    const licARecord = inMemoryDb.licenses.find((l) => l.id === licA.license.id);
    licARecord.expiresAt = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
    licARecord.status = 'EXPIRED';

    // Activate on License B -> should succeed without error
    const resB = await request(app)
      .post('/api/v1/licenses/activate')
      .send({ licenseKey: licB.plainLicenseKey, installationId: 'expired-switch-device' });

    expect(resB.status).toBe(200);
    expect(resB.body.data.status).toBe('ACTIVE');
    expect(resB.body.data.activeInstallationsCount).toBe(1);

    const inst = inMemoryDb.licenseInstallations.find((i) => i.installationId === 'expired-switch-device');
    expect(inst.licenseId).toBe(licB.license.id);
    expect(inst.status).toBe('ACTIVE');
  });

  it('reactivates a previously revoked installation on the same license without duplicate creation', async () => {
    const created = await LicenseService.createLicense({ validityDays: 30, maxInstallations: 1 }, adminId);
    const plainKey = created.plainLicenseKey;

    // Activate
    await request(app)
      .post('/api/v1/licenses/activate')
      .send({ licenseKey: plainKey, installationId: 'reactivate-test-device' });

    // Release
    await request(app)
      .post('/api/v1/licenses/release-installation')
      .send({ licenseKey: plainKey, installationId: 'reactivate-test-device' });

    expect(inMemoryDb.licenseInstallations[0].status).toBe('REVOKED');

    // Reactivate on same license
    const reactivateRes = await request(app)
      .post('/api/v1/licenses/activate')
      .send({ licenseKey: plainKey, installationId: 'reactivate-test-device' });

    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.data.activeInstallationsCount).toBe(1);
    expect(reactivateRes.body.data.status).toBe('ACTIVE');

    // Confirm only 1 database row exists
    const records = inMemoryDb.licenseInstallations.filter((i) => i.installationId === 'reactivate-test-device');
    expect(records.length).toBe(1);
    expect(records[0].status).toBe('ACTIVE');
  });

  it('handles concurrent activation requests safely without exceeding limit or throwing unique constraint error', async () => {
    const created = await LicenseService.createLicense({ validityDays: 30, maxInstallations: 1 }, adminId);
    const plainKey = created.plainLicenseKey;

    // Concurrent requests with SAME installation ID
    const [res1, res2] = await Promise.all([
      request(app).post('/api/v1/licenses/activate').send({ licenseKey: plainKey, installationId: 'concurrent-device-same' }),
      request(app).post('/api/v1/licenses/activate').send({ licenseKey: plainKey, installationId: 'concurrent-device-same' }),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const sameRecords = inMemoryDb.licenseInstallations.filter((i) => i.installationId === 'concurrent-device-same');
    expect(sameRecords.length).toBe(1);

    // Now test concurrent requests with DIFFERENT installation IDs on a limit-1 license
    const created2 = await LicenseService.createLicense({ validityDays: 30, maxInstallations: 1 }, adminId);
    const plainKey2 = created2.plainLicenseKey;

    const [c1, c2] = await Promise.all([
      request(app).post('/api/v1/licenses/activate').send({ licenseKey: plainKey2, installationId: 'concurrent-diff-1' }),
      request(app).post('/api/v1/licenses/activate').send({ licenseKey: plainKey2, installationId: 'concurrent-diff-2' }),
    ]);

    const statuses = [c1.status, c2.status].sort();
    expect(statuses).toEqual([200, 409]);

    const activeInstsForLic2 = inMemoryDb.licenseInstallations.filter(
      (i) => i.licenseId === created2.license.id && i.status === 'ACTIVE'
    );
    expect(activeInstsForLic2.length).toBe(1);
  });

  it('handles Prisma P2028 transaction timeout gracefully with 503 status code', async () => {
    const created = await LicenseService.createLicense({ validityDays: 30, maxInstallations: 1 }, adminId);
    const plainKey = created.plainLicenseKey;

    const txSpy = vi.spyOn(mockPrisma, '$transaction').mockRejectedValueOnce({
      code: 'P2028',
      message: 'Transaction already closed: A commit cannot be executed on an expired transaction.',
    });

    const res = await request(app)
      .post('/api/v1/licenses/activate')
      .send({ licenseKey: plainKey, installationId: 'timeout-test-device' });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('TRANSACTION_TIMEOUT');
    expect(res.body.message).toContain('timed out');

    txSpy.mockRestore();
  });
});
