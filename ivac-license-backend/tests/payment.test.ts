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

describe('3. Manual Payment Workflow Tests', () => {
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

  it('provides public dynamic plans via GET /api/v1/public/plans', async () => {
    const res = await request(app).get('/api/v1/public/plans');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    const plan = res.body.data[0];
    expect(plan.id).toBeDefined();
    expect(plan.code).toBeDefined();
    expect(plan.name).toBeDefined();
    expect(plan.price).toBeDefined();
    expect(plan.validityDays).toBeDefined();
    expect(plan.maxInstallations).toBeDefined();
  });

  it('submits a payment request using stable planId', async () => {
    const res = await request(app)
      .post('/api/v1/payments/requests')
      .send({
        transactionId: 'PLANIDTRX123',
        paymentMethod: 'BKASH',
        planId: '2',
        payerContact: '01711223344',
        payerName: 'John Doe',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');
  });

  it('rejects payment submission for an inactive plan', async () => {
    inMemoryDb.paymentPlans.push({
      id: 'inactive-plan',
      code: 'INACTIVE_PLAN',
      name: 'Inactive Pass',
      validityDays: 30,
      price: 500,
      maxInstallations: 1,
      currency: 'BDT',
      isActive: false,
      sortOrder: 99,
    });

    const res = await request(app)
      .post('/api/v1/payments/requests')
      .send({
        transactionId: 'INACTIVETRX123',
        paymentMethod: 'BKASH',
        planId: 'inactive-plan',
        payerContact: '01711223344',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PLAN');
  });

  it('provides public payment instructions and available plans without authentication', async () => {
    const res = await request(app).get('/api/v1/public/payment-instructions');
    expect(res.status).toBe(200);
    expect(res.body.data.settings.bkashNumber).toBeDefined();
    expect(res.body.data.settings.nagadNumber).toBeDefined();
    expect(res.body.data.plans.length).toBeGreaterThan(0);
  });

  it('submits a manual payment request and stores it in PENDING status', async () => {
    const res = await request(app)
      .post('/api/v1/payments/requests')
      .send({
        transactionId: 'BKASH99281734',
        paymentMethod: 'BKASH',
        planCode: 'PLAN_30D',
        payerContact: '01711223344',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.transactionId).toBe('BKASH99281734');
    expect(res.body.data.message).toContain('awaiting manual admin verification');
  });

  it('rejects duplicate submission with the same pending transaction ID', async () => {
    await request(app)
      .post('/api/v1/payments/requests')
      .send({
        transactionId: 'DUPETRX12345',
        paymentMethod: 'BKASH',
        planCode: 'PLAN_30D',
        payerContact: '01711223344',
      });

    const secondRes = await request(app)
      .post('/api/v1/payments/requests')
      .send({
        transactionId: 'DUPETRX12345',
        paymentMethod: 'BKASH',
        planCode: 'PLAN_30D',
        payerContact: '01711223344',
      });

    expect(secondRes.status).toBe(409);
    expect(secondRes.body.error.code).toBe('DUPLICATE_PENDING_TRANSACTION');
  });

  it('admin approves payment and generates a new license key when no prior license exists', async () => {
    const subRes = await request(app)
      .post('/api/v1/payments/requests')
      .send({
        transactionId: 'APPROVE12345',
        paymentMethod: 'NAGAD',
        planCode: 'PLAN_30D',
        payerContact: '01899887766',
      });

    const paymentId = subRes.body.data.requestId;

    const approveRes = await request(app)
      .post(`/api/v1/admin/payments/${paymentId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adminNote: 'Verified with Nagad statement' });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.paymentRequest.status).toBe('APPROVED');
    expect(approveRes.body.data.generatedPlainKey).toMatch(/^IVAC-/);
    expect(approveRes.body.data.linkedLicenseId).toBeDefined();
  });

  it('idempotent approval: approving twice does not double-extend license', async () => {
    const created = await LicenseService.createLicense({ validityDays: 30, maxInstallations: 1 }, adminId);
    inMemoryDb.licenses[0].activatedAt = new Date();
    inMemoryDb.licenses[0].expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const initialExpiry = inMemoryDb.licenses[0].expiresAt.getTime();

    const subRes = await request(app)
      .post('/api/v1/payments/requests')
      .send({
        transactionId: 'IDEMPOTENT99',
        paymentMethod: 'BKASH',
        planCode: 'PLAN_30D',
        payerContact: '01711223344',
        licenseId: created.license.id,
      });

    const paymentId = subRes.body.data.requestId;

    // 1st approval extends by 30 days
    await request(app)
      .post(`/api/v1/admin/payments/${paymentId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    const firstExpiry = inMemoryDb.licenses[0].expiresAt.getTime();
    expect(firstExpiry).toBeGreaterThan(initialExpiry);

    // 2nd approval of the same payment request must NOT extend it again!
    const secondApprove = await request(app)
      .post(`/api/v1/admin/payments/${paymentId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(secondApprove.status).toBe(200);
    expect(secondApprove.body.data.isAlreadyApproved).toBe(true);
    expect(inMemoryDb.licenses[0].expiresAt.getTime()).toBe(firstExpiry);
  });

  it('admin can reject payment with a required reason', async () => {
    const subRes = await request(app)
      .post('/api/v1/payments/requests')
      .send({
        transactionId: 'REJECT99182',
        paymentMethod: 'BKASH',
        planCode: 'PLAN_30D',
        payerContact: '01711223344',
      });

    const paymentId = subRes.body.data.requestId;

    const rejectRes = await request(app)
      .post(`/api/v1/admin/payments/${paymentId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adminNote: 'Transaction ID not found in bKash statement' });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe('REJECTED');
    expect(rejectRes.body.data.adminNote).toContain('not found in bKash statement');
  });

  it('admin approves payment with actionType GENERATE_NEW generates a brand new key with exact validity and seat quota', async () => {
    // Customer had an old license
    const oldLic = await LicenseService.createLicense({ validityDays: 7, maxInstallations: 1 }, adminId);

    // Creates payment request with 15 days validity and 2 seats
    const subRes = await request(app)
      .post('/api/v1/payments/requests')
      .send({
        transactionId: 'NEWKEY123456',
        paymentMethod: 'BKASH',
        planCode: 'PLAN_30D',
        payerContact: '01799887766',
        licenseId: oldLic.license.id,
      });

    const paymentId = subRes.body.data.requestId;

    // Approve with actionType = GENERATE_NEW
    const approveRes = await request(app)
      .post(`/api/v1/admin/payments/${paymentId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        actionType: 'GENERATE_NEW',
        adminNote: 'Generated new key for customer',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.actionResult).toBe('CREATED');
    expect(approveRes.body.data.generatedPlainKey).toMatch(/^IVAC-/);
    expect(approveRes.body.data.linkedLicenseId).not.toBe(oldLic.license.id);
    expect(approveRes.body.data.license.validityDays).toBe(30);
    expect(approveRes.body.data.license.maxInstallations).toBe(1);
    expect(approveRes.body.data.license.plainKey).toMatch(/^IVAC-/);
  });

  it('admin approves payment with actionType RENEW_EXISTING extends linked license and returns plain key', async () => {
    const oldLic = await LicenseService.createLicense({ validityDays: 10, maxInstallations: 1 }, adminId);

    const subRes = await request(app)
      .post('/api/v1/payments/requests')
      .send({
        transactionId: 'RENEWKEY8888',
        paymentMethod: 'NAGAD',
        planCode: 'PLAN_30D',
        payerContact: '01511223344',
        licenseId: oldLic.license.id,
      });

    const paymentId = subRes.body.data.requestId;

    const approveRes = await request(app)
      .post(`/api/v1/admin/payments/${paymentId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        actionType: 'RENEW_EXISTING',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.actionResult).toBe('RENEWED');
    expect(approveRes.body.data.linkedLicenseId).toBe(oldLic.license.id);
    expect(approveRes.body.data.generatedPlainKey).toBe(oldLic.plainLicenseKey);
  });
});
