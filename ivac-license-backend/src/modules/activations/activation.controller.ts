import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { ActivationService } from './activation.service.js';
import { sendSuccess } from '../../utils/response.js';

export class ActivationController {
  public static async activate(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const result = await ActivationService.activateLicense(req.body, ip);
      sendSuccess(res, result, 'License successfully activated');
    } catch (err) {
      next(err);
    }
  }

  public static async validate(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const result = await ActivationService.validateLicense(req.body, ip);
      sendSuccess(res, result, 'License validated successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async heartbeat(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ActivationService.heartbeat(req.body);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  public static async releaseInstallation(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const result = await ActivationService.releaseInstallation(req.body, ip);
      sendSuccess(res, result, 'Browser installation released');
    } catch (err) {
      next(err);
    }
  }

  public static async getMyLicense(req: Request, res: Response, next: NextFunction) {
    try {
      const installationId = req.query.installationId as string;
      if (!installationId) {
        throw { status: 400, message: 'installationId query parameter is required', code: 'BAD_REQUEST' };
      }
      const result = await ActivationService.getLicenseByInstallation(installationId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  public static async revokeInstallationByAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const result = await ActivationService.revokeInstallationByAdmin(req.params.id as string, req.admin!.adminId, ip);
      sendSuccess(res, result, 'Installation revoked successfully');
    } catch (err) {
      next(err);
    }
  }
}
