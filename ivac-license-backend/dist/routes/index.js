import { Router } from 'express';
import publicRoutes from './public.routes.js';
import adminRoutes from './admin.routes.js';
const router = Router();
router.use('/', publicRoutes);
router.use('/', adminRoutes);
// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'ivac-license-backend',
        timestamp: new Date().toISOString(),
    });
});
export default router;
