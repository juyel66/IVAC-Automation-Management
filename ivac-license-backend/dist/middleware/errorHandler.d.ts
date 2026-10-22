import { Request, Response, NextFunction } from 'express';
export declare function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void;
export declare function notFoundHandler(req: Request, res: Response): void;
