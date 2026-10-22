import { Response } from 'express';
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    meta?: Record<string, any>;
    error?: {
        code: string;
        details?: any;
    };
}
export declare function sendSuccess<T>(res: Response, data?: T, message?: string, statusCode?: number, meta?: Record<string, any>): Response;
export declare function sendError(res: Response, message: string, statusCode?: number, code?: string, details?: any): Response;
