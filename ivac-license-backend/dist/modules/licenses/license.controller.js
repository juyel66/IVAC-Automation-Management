import { LicenseService } from './license.service.js';
import { sendSuccess } from '../../utils/response.js';
export class LicenseController {
    static async create(req, res, next) {
        try {
            const ip = req.ip || req.socket.remoteAddress;
            const result = await LicenseService.createLicense(req.body, req.admin.adminId, ip);
            sendSuccess(res, result, 'License created successfully', 201);
        }
        catch (err) {
            next(err);
        }
    }
    static async list(req, res, next) {
        try {
            const result = await LicenseService.listLicenses(req.query);
            sendSuccess(res, result.items, undefined, 200, result.pagination);
        }
        catch (err) {
            next(err);
        }
    }
    static async getById(req, res, next) {
        try {
            const result = await LicenseService.getLicenseById(req.params.id);
            sendSuccess(res, result);
        }
        catch (err) {
            next(err);
        }
    }
    static async update(req, res, next) {
        try {
            const ip = req.ip || req.socket.remoteAddress;
            const result = await LicenseService.updateLicense(req.params.id, req.body, req.admin.adminId, ip);
            sendSuccess(res, result, 'License updated successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async revoke(req, res, next) {
        try {
            const ip = req.ip || req.socket.remoteAddress;
            const result = await LicenseService.revokeLicense(req.params.id, req.body.reason, req.admin.adminId, ip);
            sendSuccess(res, result, 'License revoked successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async renew(req, res, next) {
        try {
            const ip = req.ip || req.socket.remoteAddress;
            const result = await LicenseService.renewLicense(req.params.id, req.body, req.admin.adminId, ip);
            sendSuccess(res, result, 'License renewed successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async reissue(req, res, next) {
        try {
            const ip = req.ip || req.socket.remoteAddress;
            const result = await LicenseService.reissueKey(req.params.id, req.admin.adminId, ip);
            sendSuccess(res, result, 'License key reissued successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async getStats(req, res, next) {
        try {
            const result = await LicenseService.getDashboardStats();
            sendSuccess(res, result);
        }
        catch (err) {
            next(err);
        }
    }
}
