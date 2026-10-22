import { PaymentService } from './payment.service.js';
import { sendSuccess } from '../../utils/response.js';
export class PaymentController {
    static async getInstructions(req, res, next) {
        try {
            const result = await PaymentService.getPublicPaymentInstructions();
            sendSuccess(res, result);
        }
        catch (err) {
            next(err);
        }
    }
    static async submitRequest(req, res, next) {
        try {
            const ip = req.ip || req.socket.remoteAddress;
            const result = await PaymentService.submitPaymentRequest(req.body, ip);
            sendSuccess(res, result, 'Payment request submitted', 201);
        }
        catch (err) {
            next(err);
        }
    }
    static async list(req, res, next) {
        try {
            const result = await PaymentService.listPayments(req.query);
            sendSuccess(res, result.items, undefined, 200, result.pagination);
        }
        catch (err) {
            next(err);
        }
    }
    static async approve(req, res, next) {
        try {
            const ip = req.ip || req.socket.remoteAddress;
            const result = await PaymentService.approvePayment(req.params.id, req.body, req.admin.adminId, ip);
            sendSuccess(res, result, 'Payment approved');
        }
        catch (err) {
            next(err);
        }
    }
    static async reject(req, res, next) {
        try {
            const ip = req.ip || req.socket.remoteAddress;
            const result = await PaymentService.rejectPayment(req.params.id, req.body, req.admin.adminId, ip);
            sendSuccess(res, result, 'Payment rejected');
        }
        catch (err) {
            next(err);
        }
    }
    static async updateSettings(req, res, next) {
        try {
            const ip = req.ip || req.socket.remoteAddress;
            const result = await PaymentService.updateSettings(req.body, req.admin.adminId, ip);
            sendSuccess(res, result, 'Payment settings updated');
        }
        catch (err) {
            next(err);
        }
    }
}
