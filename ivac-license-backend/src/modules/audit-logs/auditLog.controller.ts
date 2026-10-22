import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { AuditLogService } from './auditLog.service.js';
import { sendSuccess } from '../../utils/response.js';

export class AuditLogController {
  public static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AuditLogService.listLogs(req.query as any);
      sendSuccess(res, result.items, undefined, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }
}
