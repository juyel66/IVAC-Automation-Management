import { prisma } from '../config/database.js';

export interface CreateAuditLogParams {
  adminId?: string | null;
  action: string;
  entityType: 'LICENSE' | 'INSTALLATION' | 'PAYMENT' | 'ADMIN' | 'SETTINGS' | 'SYSTEM' | 'PLAN';
  entityId?: string | null;
  details?: Record<string, any> | string;
  ipAddress?: string;
}

export class AuditService {
  public static async log(params: CreateAuditLogParams): Promise<void> {
    try {
      const detailsStr =
        typeof params.details === 'object'
          ? JSON.stringify(params.details)
          : params.details || null;

      await prisma.auditLog.create({
        data: {
          adminId: params.adminId || null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId || null,
          details: detailsStr,
          ipAddress: params.ipAddress || null,
        },
      });
    } catch (err: any) {
      console.error('[AuditService] Failed to record audit log:', err.message);
    }
  }
}
