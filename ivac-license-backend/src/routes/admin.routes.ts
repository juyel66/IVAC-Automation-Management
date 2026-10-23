import { Router } from 'express';
import { AdminAuthController } from '../modules/admin-auth/adminAuth.controller.js';
import { LicenseController } from '../modules/licenses/license.controller.js';
import { ActivationController } from '../modules/activations/activation.controller.js';
import { PaymentController } from '../modules/payments/payment.controller.js';
import { PlanController } from '../modules/plans/plan.controller.js';
import { AuditLogController } from '../modules/audit-logs/auditLog.controller.js';
import { requireAdminAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validation.js';
import { authRateLimiter, standardRateLimiter } from '../middleware/rateLimiter.js';
import {
  AdminLoginSchema,
  AdminChangePasswordSchema,
} from '../modules/admin-auth/adminAuth.schema.js';
import {
  CreateLicenseSchema,
  UpdateLicenseSchema,
  RenewLicenseSchema,
  ListLicensesQuerySchema,
} from '../modules/licenses/license.schema.js';
import {
  ApprovePaymentSchema,
  RejectPaymentSchema,
  UpdatePaymentSettingsSchema,
  ListPaymentsQuerySchema,
} from '../modules/payments/payment.schema.js';
import {
  CreatePlanSchema,
  UpdatePlanSchema,
  ListPlansQuerySchema,
} from '../modules/plans/plan.schema.js';

const router = Router();

// ================= ADMIN AUTH =================
router.post('/admin/auth/login', authRateLimiter, validateBody(AdminLoginSchema), AdminAuthController.login);
router.post('/admin/auth/logout', requireAdminAuth, AdminAuthController.logout);
router.get('/admin/auth/me', requireAdminAuth, AdminAuthController.me);
router.post(
  '/admin/auth/change-password',
  requireAdminAuth,
  validateBody(AdminChangePasswordSchema),
  AdminAuthController.changePassword
);

// ================= DASHBOARD =================
router.get('/admin/dashboard', requireAdminAuth, standardRateLimiter, LicenseController.getStats);

// ================= LICENSES =================
router.get(
  '/admin/licenses',
  requireAdminAuth,
  standardRateLimiter,
  validateQuery(ListLicensesQuerySchema),
  LicenseController.list
);

router.post(
  '/admin/licenses',
  requireAdminAuth,
  validateBody(CreateLicenseSchema),
  LicenseController.create
);

router.get('/admin/licenses/:id', requireAdminAuth, LicenseController.getById);

router.patch(
  '/admin/licenses/:id',
  requireAdminAuth,
  validateBody(UpdateLicenseSchema),
  LicenseController.update
);

router.post(
  '/admin/licenses/:id/revoke',
  requireAdminAuth,
  LicenseController.revoke
);

router.post(
  '/admin/licenses/:id/renew',
  requireAdminAuth,
  validateBody(RenewLicenseSchema),
  LicenseController.renew
);

router.post(
  '/admin/licenses/:id/reissue',
  requireAdminAuth,
  LicenseController.reissue
);

// ================= INSTALLATIONS =================
router.post(
  '/admin/installations/:id/revoke',
  requireAdminAuth,
  ActivationController.revokeInstallationByAdmin
);

// ================= PAYMENTS =================
router.get(
  '/admin/payments',
  requireAdminAuth,
  standardRateLimiter,
  validateQuery(ListPaymentsQuerySchema),
  PaymentController.list
);

router.post(
  '/admin/payments/:id/approve',
  requireAdminAuth,
  validateBody(ApprovePaymentSchema),
  PaymentController.approve
);

router.post(
  '/admin/payments/:id/reject',
  requireAdminAuth,
  validateBody(RejectPaymentSchema),
  PaymentController.reject
);

router.put(
  '/admin/payment-settings',
  requireAdminAuth,
  validateBody(UpdatePaymentSettingsSchema),
  PaymentController.updateSettings
);

// ================= PLANS & PRICING =================
router.get(
  '/admin/plans',
  requireAdminAuth,
  standardRateLimiter,
  validateQuery(ListPlansQuerySchema),
  PlanController.listAdmin
);

router.post(
  '/admin/plans',
  requireAdminAuth,
  validateBody(CreatePlanSchema),
  PlanController.create
);

router.get(
  '/admin/plans/:id',
  requireAdminAuth,
  PlanController.getById
);

router.patch(
  '/admin/plans/:id',
  requireAdminAuth,
  validateBody(UpdatePlanSchema),
  PlanController.update
);

router.delete(
  '/admin/plans/:id',
  requireAdminAuth,
  PlanController.deleteOrArchive
);

// ================= AUDIT LOGS =================
router.get(
  '/admin/audit-logs',
  requireAdminAuth,
  standardRateLimiter,
  AuditLogController.list
);

export default router;
