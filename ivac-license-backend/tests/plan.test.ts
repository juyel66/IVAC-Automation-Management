import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { inMemoryDb, mockPrisma } from './mockPrisma.js';

vi.mock('../src/config/database.js', () => ({
  prisma: mockPrisma,
  connectDatabase: vi.fn().mockResolvedValue(true),
}));

import { app } from '../src/app.js';
import { CryptoService } from '../src/services/crypto.service.js';

describe('5. Dynamic Subscription Plan & Pricing Management Tests', () => {
  let adminToken: string;
  const adminId = 'admin-super-uuid';

  beforeEach(() => {
    inMemoryDb.reset();
    adminToken = CryptoService.generateAdminToken({
      adminId,
      email: 'admin@ivac-automation.com',
      username: 'admin',
      role: 'SUPER_ADMIN',
    });
    inMemoryDb.admins.push({
      id: adminId,
      email: 'admin@ivac-automation.com',
      username: 'admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    });
  });

  describe('Admin Authorization', () => {
    it('rejects unauthenticated requests to GET /api/v1/admin/plans with 401', async () => {
      const res = await request(app).get('/api/v1/admin/plans');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects unauthenticated requests to POST /api/v1/admin/plans with 401', async () => {
      const res = await request(app)
        .post('/api/v1/admin/plans')
        .send({
          code: 'TEST_PLAN',
          name: 'Test Plan',
          price: 500,
          validityDays: 10,
          maxInstallations: 1,
        });
      expect(res.status).toBe(401);
    });
  });

  describe('Plan Creation & Validation', () => {
    it('successfully creates a plan with valid inputs and logs audit trail', async () => {
      const res = await request(app)
        .post('/api/v1/admin/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'PLAN_VIP_60D',
          name: '60 Days VIP Partner Pass',
          description: 'Designed for high volume partner agents',
          price: 1800,
          validityDays: 60,
          maxInstallations: 3,
          sortOrder: 10,
          isActive: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('PLAN_VIP_60D');
      expect(res.body.data.price).toBe(1800);
      expect(res.body.data.validityDays).toBe(60);
      expect(res.body.data.maxInstallations).toBe(3);

      // Verify audit log was recorded
      expect(inMemoryDb.auditLogs.some((l) => l.action === 'PLAN_CREATED' && l.entityId === res.body.data.id)).toBe(true);
    });

    it('rejects negative price amounts with 422 validation error', async () => {
      const res = await request(app)
        .post('/api/v1/admin/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'PLAN_INVALID',
          name: 'Invalid Price Plan',
          price: -100,
          validityDays: 30,
          maxInstallations: 1,
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects zero or negative validity days with 422 validation error', async () => {
      const res = await request(app)
        .post('/api/v1/admin/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'PLAN_ZERO_DAYS',
          name: 'Zero Days Plan',
          price: 100,
          validityDays: 0,
          maxInstallations: 1,
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects zero or negative browser installation limits with 422 validation error', async () => {
      const res = await request(app)
        .post('/api/v1/admin/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'PLAN_ZERO_LIMIT',
          name: 'Zero Limit Plan',
          price: 100,
          validityDays: 15,
          maxInstallations: 0,
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects duplicate plan code with 409 conflict', async () => {
      const res = await request(app)
        .post('/api/v1/admin/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'PLAN_30D', // already in inMemoryDb
          name: 'Duplicate 30 Days',
          price: 1000,
          validityDays: 30,
          maxInstallations: 1,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_PLAN_CODE');
    });
  });

  describe('Plan Editing & Management', () => {
    it('retrieves plan details by ID', async () => {
      const res = await request(app)
        .get('/api/v1/admin/plans/2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('2');
      expect(res.body.data.code).toBe('PLAN_30D');
    });

    it('updates plan fields (price, validity, limit, status)', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/plans/2')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price: 1250,
          validityDays: 35,
          maxInstallations: 2,
          name: '35 Days Deluxe Standard',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.price).toBe(1250);
      expect(res.body.data.validityDays).toBe(35);
      expect(res.body.data.maxInstallations).toBe(2);
      expect(res.body.data.name).toBe('35 Days Deluxe Standard');

      // Verify audit log
      expect(inMemoryDb.auditLogs.some((l) => l.action === 'PLAN_UPDATED')).toBe(true);
    });

    it('can deactivate a plan via PATCH isActive = false', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/plans/2')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });

    it('safely deletes a plan when no purchase requests are associated with it', async () => {
      // Plan '1' has no payment requests
      const res = await request(app)
        .delete('/api/v1/admin/plans/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.action).toBe('DELETED');
      expect(inMemoryDb.paymentPlans.some((p) => p.id === '1')).toBe(false);
    });

    it('safely archives/deactivates a plan when payment requests exist', async () => {
      // Simulate an associated payment request for plan '2'
      inMemoryDb.paymentRequests.push({
        id: 'pr-123',
        transactionId: 'TRX_ASSOCIATED',
        paymentMethod: 'BKASH',
        planId: '2',
        planCode: 'PLAN_30D',
        amount: 1000,
        currency: 'BDT',
        payerContact: '01711223344',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .delete('/api/v1/admin/plans/2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.action).toBe('ARCHIVED');
      expect(res.body.data.message).toContain('safely archived/deactivated');

      // Plan still exists in database, but marked inactive
      const plan = inMemoryDb.paymentPlans.find((p) => p.id === '2');
      expect(plan).toBeDefined();
      expect(plan.isActive).toBe(false);
    });
  });

  describe('Public Plans API for Extension', () => {
    it('GET /api/v1/public/plans exposes ONLY active plans ordered by sortOrder', async () => {
      // Deactivate plan '2'
      inMemoryDb.paymentPlans[1].isActive = false;

      const res = await request(app).get('/api/v1/public/plans');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const plans = res.body.data;
      expect(plans.length).toBe(2); // Only plans 1 and 3 are active
      expect(plans.some((p: any) => p.code === 'PLAN_30D')).toBe(false);
      expect(plans[0].code).toBe('PLAN_7D');

      // Check required public schema fields
      const p = plans[0];
      expect(p.id).toBeDefined();
      expect(p.code).toBeDefined();
      expect(p.name).toBeDefined();
      expect(p.price).toBe(300);
      expect(p.currency).toBe('BDT');
      expect(p.validityDays).toBe(7);
      expect(p.maxInstallations).toBe(1);
    });
  });

  describe('Payment Workflow & Authoritative Purchase Snapshots', () => {
    it('uses server database price and terms rather than trusting client-supplied values', async () => {
      // Attempt to submit a request with tampered amount and validity
      const res = await request(app)
        .post('/api/v1/payments/requests')
        .send({
          transactionId: 'TAMPER_TEST_99',
          paymentMethod: 'BKASH',
          planCode: 'PLAN_30D',
          payerContact: '01700112233',
          customerName: 'Sufian Ahmed',
          // Client attempts to tamper with price and validity
          amount: 1, // Tampered!
          validityDays: 365, // Tampered!
        });

      expect(res.status).toBe(201);
      // Authoritative database price for PLAN_30D is 1000 BDT, validity is 30 days
      const saved = inMemoryDb.paymentRequests.find((p) => p.transactionId === 'TAMPER_TEST_99');
      expect(saved).toBeDefined();
      expect(saved.amount).toBe(1000); // Server-authoritative!
      expect(saved.validityDays).toBe(30); // Server-authoritative!
      expect(saved.maxInstallations).toBe(1);
      expect(saved.planName).toBe('30 Days');
      expect(saved.planId).toBe('2');
    });

    it('purchase snapshot remains completely stable when plan is edited subsequently, and approval honors snapshot terms', async () => {
      // 1. User submits payment request for PLAN_30D (price: 1000, validity: 30 days, limit: 1)
      const subRes = await request(app)
        .post('/api/v1/payments/requests')
        .send({
          transactionId: 'SNAPSHOT_STABLE_01',
          paymentMethod: 'NAGAD',
          planCode: 'PLAN_30D',
          payerContact: '01899112233',
          customerName: 'Rahim Uddin',
        });

      expect(subRes.status).toBe(201);
      const paymentId = subRes.body.data.requestId;

      // 2. Admin subsequently EDITS the plan in database (e.g. price increased to 1500, validity reduced to 25 days)
      await request(app)
        .patch('/api/v1/admin/plans/2')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price: 1500,
          validityDays: 25,
          maxInstallations: 4,
          name: '30 Days New Price',
        });

      // Verify the plan in DB was changed
      const updatedPlan = inMemoryDb.paymentPlans.find((p) => p.id === '2');
      expect(updatedPlan.price).toBe(1500);
      expect(updatedPlan.validityDays).toBe(25);

      // 3. Verify the pending purchase request's snapshot remained intact with original terms (1000 BDT, 30 days)
      const pendingReq = inMemoryDb.paymentRequests.find((p) => p.id === paymentId);
      expect(pendingReq.amount).toBe(1000);
      expect(pendingReq.validityDays).toBe(30);
      expect(pendingReq.maxInstallations).toBe(1);

      // 4. Admin approves the payment request
      const approveRes = await request(app)
        .post(`/api/v1/admin/payments/${paymentId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ adminNote: 'Verified Nagad payment' });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.paymentRequest.status).toBe('APPROVED');

      // 5. The generated license MUST use the approved purchase snapshot terms (30 days, 1 installation)
      // and NOT the newly updated plan terms (25 days, 4 installations)!
      const generatedLicenseId = approveRes.body.data.linkedLicenseId;
      const createdLicense = inMemoryDb.licenses.find((l) => l.id === generatedLicenseId);

      expect(createdLicense).toBeDefined();
      expect(createdLicense.validityDays).toBe(30); // Honored snapshot 30 days!
      expect(createdLicense.maxInstallations).toBe(1); // Honored snapshot limit 1!
      expect(createdLicense.customerName).toBe('Rahim Uddin');
    });
  });
});
