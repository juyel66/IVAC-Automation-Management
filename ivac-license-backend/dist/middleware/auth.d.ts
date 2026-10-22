import { Request, Response, NextFunction } from 'express';
import { AdminJwtPayload } from '../services/crypto.service.js';
export interface AuthenticatedRequest extends Request {
    admin?: AdminJwtPayload;
}
export declare function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
