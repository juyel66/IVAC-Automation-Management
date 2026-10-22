import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { inMemoryDb, mockPrisma } from './mockPrisma.js';

// Mock database module
vi.mock('../src/config/database.js', () => ({
  prisma: mockPrisma,
  connectDatabase: vi.fn().mockResolvedValue(true),
}));

import { app } from '../src/app.js';
import { LicenseService } from '../src/modules/licenses/license.service.js';
import { CryptoService } from '../src/services/crypto.service.js';

describe('1. Core License System Tests', () => {
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

  it('generates a new license with pending status, masked key, and returns plaintext key only once', async () => {
    const res = await request(app)
      .post('/api/v1/admin/licenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        validityDays: 30,
        maxInstallations: 2,
        customerName: 'Juyel Rana',
        customerContact: '+8801700000000',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.plainLicenseKey).toMatch(/^IVAC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(res.body.data.license.keyMasked).toContain('****');
    expect(res.body.data.license.status).toBe('PENDING');
    expect(res.body.data.license.activatedAt).toBeNull();
    expect(res.body.data.license.expiresAt).toBeNull();
    expect(res.body.data.license.validityDays).toBe(30);
    expect(res.body.data.license.maxInstallations).toBe(2);
  });

  it('first-time activation establishes the activation and expiry timestamp', async () => {
    const created = await LicenseService.createLicense(
      { validityDays: 30, maxInstallations: 2 },
      adminId
    );
    const plainKey = created.plainLicenseKey;

    const res = await request(app)
      .post('/api/v1/licenses/activate')
      .send({
        licenseKey: plainKey,
        installationId: 'inst-browser-1',
        installationLabel: 'Chrome Work Laptop',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.activatedAt).toBeDefined();
    expect(res.body.data.expiresAt).toBeDefined();
    expect(res.body.data.daysRemaining).toBe(30);
    expect(res.body.data.activeInstallationsCount).toBe(1);
    expect(res.body.data.availableSlots).toBe(1);
    expect(res.body.data.signature).toBeDefined();

    const activatedDate = new Date(res.body.data.activatedAt);
    const expiryDate = new Date(res.body.data.expiresAt);
    const diffHours = (expiryDate.getTime() - activatedDate.getTime()) / (1000 * 3600);
    expect(diffHours).toBeCloseTo(30 * 24, 0);
  });

  it('subsequent activations on another browser preserve the exact same expiry date and do not reset validity', async () => {
    const created = await LicenseService.createLicense(
      { validityDays: 30, maxInstallations: 2 },
      adminId
    );
    const plainKey = created.plainLicenseKey;

    // 1st browser activation
    const firstRes = await request(app)
      .post('/api/v1/licenses/activate')
      .send({ licenseKey: plainKey, installationId: 'browser-slot-1' });

    expect(firstRes.status).toBe(200);
    const originalExpiry = firstRes.body.data.expiresAt;
    const originalActivation = firstRes.body.data.activatedAt;

    // 2nd browser activation
    const secondRes = await request(app)
      .post('/api/v1/licenses/activate')
      .send({ licenseKey: plainKey, installationId: 'browser-slot-2' });

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.data.activatedAt).toBe(originalActivation);
    expect(secondRes.body.data.expiresAt).toBe(originalExpiry);
    expect(secondRes.body.data.activeInstallationsCount).toBe(2);
    expect(secondRes.body.data.availableSlots).toBe(0);
  });

  it('rejects invalid license key with 404', async () => {
    const res = await request(app)
      .post('/api/v1/licenses/activate')
      .send({ licenseKey: 'IVAC-FAKE-KEYS-DOES-NTEX', installationId: 'browser-1' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('INVALID_LICENSE_KEY');
  });

  it('rejects suspended license with 403', async () => {
    const created = await LicenseService.createLicense({ validityDays: 30, maxInstallations: 1 }, adminId);
    inMemoryDb.licenses[0].status = 'SUSPENDED';

    const res = await request(app)
      .post('/api/v1/licenses/activate')
      .send({ licenseKey: created.plainLicenseKey, installationId: 'browser-1' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('LICENSE_SUSPENDED');
  });

  it('rejects revoked license with 403', async () => {
    const created = await LicenseService.createLicense({ validityDays: 30, maxInstallations: 1 }, adminId);
    inMemoryDb.licenses[0].status = 'REVOKED';

    const res = await request(app)
      .post('/api/v1/licenses/activate')
      .send({ licenseKey: created.plainLicenseKey, installationId: 'browser-1' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('LICENSE_REVOKED');
  });

  it('admin renewal extends validity according to documented rule', async () => {
    const created = await LicenseService.createLicense({ validityDays: 30, maxInstallations: 1 }, adminId);
    // Activate
    const actRes = await request(app)
      .post('/api/v1/licenses/activate')
      .send({ licenseKey: created.plainLicenseKey, installationId: 'browser-1' });
    const originalExpiry = new Date(actRes.body.data.expiresAt);

    // Admin renews by 30 days
    const renewRes = await request(app)
      .post(`/api/v1/admin/licenses/${created.license.id}/renew`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ additionalDays: 30, adminNote: 'Customer renewed via bKash' });

    expect(renewRes.status).toBe(200);
    const newExpiry = new Date(renewRes.body.data.expiresAt);
    const diffDays = (newExpiry.getTime() - originalExpiry.getTime()) / (24 * 3600 * 1000);
    expect(diffDays).toBeCloseTo(30, 0);
  });
});
