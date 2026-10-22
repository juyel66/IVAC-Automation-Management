import { apiFetch } from './api.js';
import { AuditLog, Pagination } from '../types/index.js';

export const auditService = {
  async listLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    entityType?: string;
    search?: string;
  }): Promise<{ items: AuditLog[]; pagination: Pagination }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.action) query.append('action', params.action);
    if (params.entityType) query.append('entityType', params.entityType);
    if (params.search) query.append('search', params.search);

    const res = await apiFetch<AuditLog[]>(`/admin/audit-logs?${query.toString()}`);
    return {
      items: res.data,
      pagination: res.meta as Pagination,
    };
  },
};
