import { ActivationService } from './activation.service.js';
import { sendSuccess } from '../../utils/response.js';
export class ActivationController {
    static async activate(req, res, next) {
        try {
            const ip = req.ip || req.socket.remoteAddress;
            const result = await ActivationService.activateLicense(req.body, ip);
            sendSuccess(res, result, 'License successfully activated');
        }
        catch (err) {
            next(err);
        }
    }
    static async validate(req, res, next) {
        try {
            const ip = req.ip || req.socket.remoteAddress;
            const result = await ActivationService.validateLicense(req.body, ip);
            sendSuccess(res, result, 'License validated successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async heartbeat(req, res, next) {
        try {
            const result = await ActivationService.heartbeat(req.body);
            sendSuccess(res, result);
        }
        catch (err) {
            next(err);
        }
    }
    static async releaseInstallation(req, res, next) {
        try {
            const ip = req.ip || req.socket.remoteAddress;
            const result = await ActivationService.releaseInstallation(req.body, ip);
            sendSuccess(res, result, 'Browser installation released');
        }
        catch (err) {
            next(err);
        }
    }
    static async getMyLicense(req, res, next) {
        try {
            const installationId = req.query.installationId;
            if (!installationId) {
                throw { status: 400, message: 'installationId query parameter is required', code: 'BAD_REQUEST' };
            }
            const result = await ActivationService.getLicenseByInstallation(installationId);
            sendSuccess(res, result);
        }
        catch (err) {
            next(err);
        }
    }
    static async revokeInstallationByAdmin(req, res, next) {
        try {
            const ip = req.ip || req.socket.remoteAddress;
            const result = await ActivationService.revokeInstallationByAdmin(req.params.id, req.admin.adminId, ip);
            sendSuccess(res, result, 'Installation revoked successfully');
        }
        catch (err) {
            next(err);
        }
    }
}
