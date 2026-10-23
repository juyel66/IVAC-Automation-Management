import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { PlanService } from './plan.service.js';
import { sendSuccess } from '../../utils/response.js';

export class PlanController {
  /**
   * Admin: List all subscription plans
   * GET /api/v1/admin/plans
   */
  public static async listAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await PlanService.listAdminPlans(req.query as any);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Get plan by ID
   * GET /api/v1/admin/plans/:id
   */
  public static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await PlanService.getPlanById(req.params.id as string);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Create a new plan
   * POST /api/v1/admin/plans
   */
  public static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const result = await PlanService.createPlan(req.body, req.admin!.adminId, ip);
      sendSuccess(res, result, 'Subscription plan created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Update an existing plan
   * PATCH /api/v1/admin/plans/:id
   */
  public static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const result = await PlanService.updatePlan(req.params.id as string, req.body, req.admin!.adminId, ip);
      sendSuccess(res, result, 'Subscription plan updated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Safely archive or delete a plan
   * DELETE /api/v1/admin/plans/:id
   */
  public static async deleteOrArchive(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const result = await PlanService.deleteOrArchivePlan(req.params.id as string, req.admin!.adminId, ip);
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public: List active plans for the Chrome extension & public checkout
   * GET /api/v1/public/plans
   */
  public static async listPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PlanService.listPublicPlans();
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}
