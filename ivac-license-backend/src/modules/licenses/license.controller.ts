import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { LicenseService } from './license.service.js';
import { sendSuccess } from '../../utils/response.js';

export class LicenseController {
  public static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const result = await LicenseService.createLicense(req.body, req.admin!.adminId, ip);
      sendSuccess(res, result, 'License created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await LicenseService.listLicenses(req.query as any);
      sendSuccess(res, result.items, undefined, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  public static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await LicenseService.getLicenseById(req.params.id as string);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  public static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const result = await LicenseService.updateLicense(req.params.id as string, req.body, req.admin!.adminId, ip);
      sendSuccess(res, result, 'License updated successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async revoke(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const result = await LicenseService.revokeLicense(req.params.id as string, req.body.reason, req.admin!.adminId, ip);
      sendSuccess(res, result, 'License revoked successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async renew(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const result = await LicenseService.renewLicense(req.params.id as string, req.body, req.admin!.adminId, ip);
      sendSuccess(res, result, 'License renewed successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async reissue(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const result = await LicenseService.reissueKey(req.params.id as string, req.admin!.adminId, ip);
      sendSuccess(res, result, 'License key reissued successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await LicenseService.getDashboardStats();
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}
