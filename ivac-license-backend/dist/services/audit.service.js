import { prisma } from '../config/database.js';
export class AuditService {
    static async log(params) {
        try {
            const detailsStr = typeof params.details === 'object'
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
        }
        catch (err) {
            console.error('[AuditService] Failed to record audit log:', err.message);
        }
    }
}
