export interface ListAuditLogsQuery {
    page?: number;
    limit?: number;
    action?: string;
    entityType?: string;
    search?: string;
}
export declare class AuditLogService {
    static listLogs(query: ListAuditLogsQuery): Promise<{
        items: ({
            admin: {
                id: string;
                email: string;
                username: string;
            } | null;
        } & {
            details: string | null;
            id: string;
            createdAt: Date;
            action: string;
            entityType: string;
            entityId: string | null;
            ipAddress: string | null;
            adminId: string | null;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
