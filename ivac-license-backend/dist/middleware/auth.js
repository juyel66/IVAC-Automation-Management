import { CryptoService } from '../services/crypto.service.js';
import { sendError } from '../utils/response.js';
import { prisma } from '../config/database.js';
export async function requireAdminAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        sendError(res, 'Authentication required. Missing Bearer token.', 401, 'UNAUTHORIZED');
        return;
    }
    const token = authHeader.substring(7).trim();
    const payload = CryptoService.verifyAdminToken(token);
    if (!payload) {
        sendError(res, 'Invalid or expired session token.', 401, 'INVALID_TOKEN');
        return;
    }
    // Check if admin account is still active in database
    try {
        const admin = await prisma.admin.findUnique({
            where: { id: payload.adminId },
            select: { id: true, isActive: true, role: true },
        });
        if (!admin || !admin.isActive) {
            sendError(res, 'Admin account not found or has been deactivated.', 403, 'FORBIDDEN');
            return;
        }
        req.admin = payload;
        next();
    }
    catch (err) {
        sendError(res, 'Database error during authentication check.', 500, 'INTERNAL_SERVER_ERROR');
    }
}
