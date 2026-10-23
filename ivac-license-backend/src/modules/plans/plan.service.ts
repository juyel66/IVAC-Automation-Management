import { prisma } from '../../config/database.js';
import { AuditService } from '../../services/audit.service.js';
import { CreatePlanInput, UpdatePlanInput, ListPlansQuery } from './plan.schema.js';

export class PlanService {
  /**
   * Admin lists all plans (active & inactive) with optional search & status filter
   */
  public static async listAdminPlans(query: ListPlansQuery) {
    const { isActive, search } = query;

    const where: any = {};

    if (isActive === 'true') {
      where.isActive = true;
    } else if (isActive === 'false') {
      where.isActive = false;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    const plans = await prisma.paymentPlan.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: {
            paymentRequests: true,
          },
        },
      },
    });

    return plans.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      validityDays: p.validityDays,
      maxInstallations: p.maxInstallations,
      price: Number(p.price),
      currency: p.currency,
      isActive: p.isActive,
      sortOrder: p.sortOrder,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      _count: p._count,
    }));
  }

  /**
   * Admin retrieves plan details by ID
   */
  public static async getPlanById(id: string) {
    const plan = await prisma.paymentPlan.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            paymentRequests: true,
          },
        },
      },
    });

    if (!plan) {
      throw { status: 404, message: 'Subscription plan not found', code: 'PLAN_NOT_FOUND' };
    }

    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description,
      validityDays: plan.validityDays,
      maxInstallations: plan.maxInstallations,
      price: Number(plan.price),
      currency: plan.currency,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      _count: plan._count,
    };
  }

  /**
   * Admin creates a new subscription plan
   */
  public static async createPlan(input: CreatePlanInput, adminId: string, ipAddress?: string) {
    const cleanCode = input.code.trim().toUpperCase();

    // Check code uniqueness
    const existing = await prisma.paymentPlan.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      throw {
        status: 409,
        message: `A subscription plan with code "${cleanCode}" already exists.`,
        code: 'DUPLICATE_PLAN_CODE',
      };
    }

    const plan = await prisma.paymentPlan.create({
      data: {
        code: cleanCode,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        price: input.price,
        currency: input.currency?.trim() || 'BDT',
        validityDays: input.validityDays,
        maxInstallations: input.maxInstallations ?? 1,
        isActive: input.isActive !== undefined ? input.isActive : true,
        sortOrder: input.sortOrder ?? 0,
      },
    });

    await AuditService.log({
      adminId,
      action: 'PLAN_CREATED',
      entityType: 'PLAN',
      entityId: plan.id,
      details: {
        code: plan.code,
        name: plan.name,
        price: Number(plan.price),
        validityDays: plan.validityDays,
        maxInstallations: plan.maxInstallations,
        isActive: plan.isActive,
      },
      ipAddress,
    });

    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description,
      validityDays: plan.validityDays,
      maxInstallations: plan.maxInstallations,
      price: Number(plan.price),
      currency: plan.currency,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  /**
   * Admin updates an existing subscription plan
   */
  public static async updatePlan(id: string, input: UpdatePlanInput, adminId: string, ipAddress?: string) {
    const existing = await prisma.paymentPlan.findUnique({
      where: { id },
    });

    if (!existing) {
      throw { status: 404, message: 'Subscription plan not found', code: 'PLAN_NOT_FOUND' };
    }

    let codeToUse = existing.code;
    if (input.code && input.code.trim().toUpperCase() !== existing.code) {
      const newCode = input.code.trim().toUpperCase();
      const duplicate = await prisma.paymentPlan.findUnique({
        where: { code: newCode },
      });
      if (duplicate && duplicate.id !== id) {
        throw {
          status: 409,
          message: `A subscription plan with code "${newCode}" already exists.`,
          code: 'DUPLICATE_PLAN_CODE',
        };
      }
      codeToUse = newCode;
    }

    const updated = await prisma.paymentPlan.update({
      where: { id },
      data: {
        code: codeToUse,
        name: input.name !== undefined ? input.name.trim() : existing.name,
        description: input.description !== undefined ? (input.description?.trim() || null) : existing.description,
        price: input.price !== undefined ? input.price : existing.price,
        currency: input.currency !== undefined ? input.currency.trim() : existing.currency,
        validityDays: input.validityDays !== undefined ? input.validityDays : existing.validityDays,
        maxInstallations: input.maxInstallations !== undefined ? input.maxInstallations : existing.maxInstallations,
        isActive: input.isActive !== undefined ? input.isActive : existing.isActive,
        sortOrder: input.sortOrder !== undefined ? input.sortOrder : existing.sortOrder,
      },
    });

    await AuditService.log({
      adminId,
      action: 'PLAN_UPDATED',
      entityType: 'PLAN',
      entityId: id,
      details: {
        changes: input,
        before: {
          code: existing.code,
          name: existing.name,
          price: Number(existing.price),
          validityDays: existing.validityDays,
          maxInstallations: existing.maxInstallations,
          isActive: existing.isActive,
        },
        after: {
          code: updated.code,
          name: updated.name,
          price: Number(updated.price),
          validityDays: updated.validityDays,
          maxInstallations: updated.maxInstallations,
          isActive: updated.isActive,
        },
      },
      ipAddress,
    });

    return {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      description: updated.description,
      validityDays: updated.validityDays,
      maxInstallations: updated.maxInstallations,
      price: Number(updated.price),
      currency: updated.currency,
      isActive: updated.isActive,
      sortOrder: updated.sortOrder,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Admin safely archives/deactivates or deletes a plan.
   * If the plan has associated payment requests, it cannot be hard-deleted; it is safely archived/deactivated.
   */
  public static async deleteOrArchivePlan(id: string, adminId: string, ipAddress?: string) {
    const existing = await prisma.paymentPlan.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            paymentRequests: true,
          },
        },
      },
    });

    if (!existing) {
      throw { status: 404, message: 'Subscription plan not found', code: 'PLAN_NOT_FOUND' };
    }

    const hasAssociatedRequests = (existing._count?.paymentRequests ?? 0) > 0;

    if (hasAssociatedRequests) {
      // Safely archive / deactivate
      const archived = await prisma.paymentPlan.update({
        where: { id },
        data: { isActive: false },
      });

      await AuditService.log({
        adminId,
        action: 'PLAN_ARCHIVED',
        entityType: 'PLAN',
        entityId: id,
        details: {
          code: existing.code,
          name: existing.name,
          reason: 'Plan has associated payment requests and was safely archived/deactivated.',
          paymentRequestsCount: existing._count?.paymentRequests,
        },
        ipAddress,
      });

      return {
        action: 'ARCHIVED',
        message: `Plan has ${existing._count?.paymentRequests} associated payment record(s) and was safely archived/deactivated.`,
        plan: {
          id: archived.id,
          code: archived.code,
          name: archived.name,
          isActive: archived.isActive,
        },
      };
    } else {
      // Safe to delete permanently
      await prisma.paymentPlan.delete({
        where: { id },
      });

      await AuditService.log({
        adminId,
        action: 'PLAN_DELETED',
        entityType: 'PLAN',
        entityId: id,
        details: {
          code: existing.code,
          name: existing.name,
        },
        ipAddress,
      });

      return {
        action: 'DELETED',
        message: 'Plan has no associated payment records and was permanently deleted.',
        plan: {
          id: existing.id,
          code: existing.code,
          name: existing.name,
        },
      };
    }
  }

  /**
   * Public API: List active plans only for the extension and client
   */
  public static async listPublicPlans() {
    const plans = await prisma.paymentPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return plans.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description || '',
      price: Number(p.price),
      currency: p.currency,
      validityDays: p.validityDays,
      maxInstallations: p.maxInstallations,
    }));
  }
}
