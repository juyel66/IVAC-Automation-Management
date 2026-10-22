import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { AdminAuthService } from './adminAuth.service.js';
import { sendSuccess } from '../../utils/response.js';

export class AdminAuthController {
  public static async login(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const result = await AdminAuthService.login(req.body, ip);
      sendSuccess(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  }

  public static async logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const result = await AdminAuthService.logout(req.admin!.adminId, ip);
      sendSuccess(res, result, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AdminAuthService.getProfile(req.admin!.adminId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  public static async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const result = await AdminAuthService.changePassword(req.admin!.adminId, req.body, ip);
      sendSuccess(res, result, 'Password changed successfully');
    } catch (err) {
      next(err);
    }
  }
}
