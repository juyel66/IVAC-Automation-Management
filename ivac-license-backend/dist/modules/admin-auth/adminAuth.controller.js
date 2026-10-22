import { AdminAuthService } from './adminAuth.service.js';
import { sendSuccess } from '../../utils/response.js';
export class AdminAuthController {
    static async login(req, res, next) {
        try {
            const ip = req.ip || req.socket.remoteAddress;
            const result = await AdminAuthService.login(req.body, ip);
            sendSuccess(res, result, 'Login successful');
        }
        catch (err) {
            next(err);
        }
    }
    static async logout(req, res, next) {
        try {
            const ip = req.ip || req.socket.remoteAddress;
            const result = await AdminAuthService.logout(req.admin.adminId, ip);
            sendSuccess(res, result, 'Logged out successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async me(req, res, next) {
        try {
            const result = await AdminAuthService.getProfile(req.admin.adminId);
            sendSuccess(res, result);
        }
        catch (err) {
            next(err);
        }
    }
    static async changePassword(req, res, next) {
        try {
            const ip = req.ip || req.socket.remoteAddress;
            const result = await AdminAuthService.changePassword(req.admin.adminId, req.body, ip);
            sendSuccess(res, result, 'Password changed successfully');
        }
        catch (err) {
            next(err);
        }
    }
}
