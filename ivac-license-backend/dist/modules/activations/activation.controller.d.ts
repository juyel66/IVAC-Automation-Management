import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
export declare class ActivationController {
    static activate(req: Request, res: Response, next: NextFunction): Promise<void>;
    static validate(req: Request, res: Response, next: NextFunction): Promise<void>;
    static heartbeat(req: Request, res: Response, next: NextFunction): Promise<void>;
    static releaseInstallation(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getMyLicense(req: Request, res: Response, next: NextFunction): Promise<void>;
    static revokeInstallationByAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}
