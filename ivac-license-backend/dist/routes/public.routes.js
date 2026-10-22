import { Router } from 'express';
import { ActivationController } from '../modules/activations/activation.controller.js';
import { PaymentController } from '../modules/payments/payment.controller.js';
import { validateBody } from '../middleware/validation.js';
import { ActivateLicenseSchema, ValidateLicenseSchema, HeartbeatSchema, ReleaseInstallationSchema, } from '../modules/activations/activation.schema.js';
import { SubmitPaymentRequestSchema } from '../modules/payments/payment.schema.js';
import { standardRateLimiter, publicSubmitRateLimiter } from '../middleware/rateLimiter.js';
const router = Router();
// Public payment instructions
router.get('/public/payment-instructions', standardRateLimiter, PaymentController.getInstructions);
// Public payment submission
router.post('/payments/requests', publicSubmitRateLimiter, validateBody(SubmitPaymentRequestSchema), PaymentController.submitRequest);
// Client license activations and validations
router.post('/licenses/activate', publicSubmitRateLimiter, validateBody(ActivateLicenseSchema), ActivationController.activate);
router.post('/licenses/validate', standardRateLimiter, validateBody(ValidateLicenseSchema), ActivationController.validate);
router.post('/licenses/heartbeat', standardRateLimiter, validateBody(HeartbeatSchema), ActivationController.heartbeat);
router.post('/licenses/release-installation', standardRateLimiter, validateBody(ReleaseInstallationSchema), ActivationController.releaseInstallation);
router.get('/licenses/me', standardRateLimiter, ActivationController.getMyLicense);
export default router;
