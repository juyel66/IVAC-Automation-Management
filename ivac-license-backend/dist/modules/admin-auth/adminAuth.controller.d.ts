import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
export declare class AdminAuthController {
    static login(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}
