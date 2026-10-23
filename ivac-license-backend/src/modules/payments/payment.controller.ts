import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { PaymentService } from './payment.service.js';
import { sendSuccess } from '../../utils/response.js';

export class PaymentController {
  public static async getPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PaymentService.getPublicPlans();
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
  public static async getInstructions(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PaymentService.getPublicPaymentInstructions();
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  public static async submitRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const result = await PaymentService.submitPaymentRequest(req.body, ip);
      sendSuccess(res, result, 'Payment request submitted', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await PaymentService.listPayments(req.query as any);
      sendSuccess(res, result.items, undefined, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  public static async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const result = await PaymentService.approvePayment(req.params.id as string, req.body, req.admin!.adminId, ip);
      sendSuccess(res, result, 'Payment approved');
    } catch (err) {
      next(err);
    }
  }

  public static async reject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const result = await PaymentService.rejectPayment(req.params.id as string, req.body, req.admin!.adminId, ip);
      sendSuccess(res, result, 'Payment rejected');
    } catch (err) {
      next(err);
    }
  }

  public static async updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const result = await PaymentService.updateSettings(req.body, req.admin!.adminId, ip);
      sendSuccess(res, result, 'Payment settings updated');
    } catch (err) {
      next(err);
    }
  }
}
