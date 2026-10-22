import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
export declare class PaymentController {
    static getInstructions(req: Request, res: Response, next: NextFunction): Promise<void>;
    static submitRequest(req: Request, res: Response, next: NextFunction): Promise<void>;
    static list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static approve(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static reject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}
