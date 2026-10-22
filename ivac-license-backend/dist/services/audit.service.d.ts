export interface CreateAuditLogParams {
    adminId?: string | null;
    action: string;
    entityType: 'LICENSE' | 'INSTALLATION' | 'PAYMENT' | 'ADMIN' | 'SETTINGS' | 'SYSTEM';
    entityId?: string | null;
    details?: Record<string, any> | string;
    ipAddress?: string;
}
export declare class AuditService {
    static log(params: CreateAuditLogParams): Promise<void>;
}
