import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
export declare class AuditLogController {
    static list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}
