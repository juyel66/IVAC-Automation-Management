import { prisma } from '../../config/database.js';
export class AuditLogService {
    static async listLogs(query) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;
        const where = {};
        if (query.action) {
            where.action = query.action;
        }
        if (query.entityType) {
            where.entityType = query.entityType;
        }
        if (query.search && query.search.trim()) {
            const term = query.search.trim();
            where.OR = [
                { action: { contains: term, mode: 'insensitive' } },
                { entityId: { contains: term, mode: 'insensitive' } },
                { details: { contains: term, mode: 'insensitive' } },
                { ipAddress: { contains: term, mode: 'insensitive' } },
            ];
        }
        const [total, items] = await Promise.all([
            prisma.auditLog.count({ where }),
            prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    admin: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                },
            }),
        ]);
        return {
            items,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}
