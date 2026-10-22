import { AuditLogService } from './auditLog.service.js';
import { sendSuccess } from '../../utils/response.js';
export class AuditLogController {
    static async list(req, res, next) {
        try {
            const result = await AuditLogService.listLogs(req.query);
            sendSuccess(res, result.items, undefined, 200, result.pagination);
        }
        catch (err) {
            next(err);
        }
    }
}
