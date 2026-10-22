import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
export declare class LicenseController {
    static create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static revoke(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static renew(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static reissue(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static getStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}
