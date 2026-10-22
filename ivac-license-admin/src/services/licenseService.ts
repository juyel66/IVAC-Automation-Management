import { apiFetch } from './api.js';
import { License, DashboardStats, Pagination } from '../types/index.js';

export interface CreateLicenseParams {
  validityDays: number;
  maxInstallations: number;
  customerName?: string;
  customerContact?: string;
  adminNotes?: string;
}

export const licenseService = {
  async getStats(): Promise<DashboardStats> {
    const res = await apiFetch<DashboardStats>('/admin/dashboard');
    return res.data;
  },

  async listLicenses(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{ items: License[]; pagination: Pagination }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);

    const res = await apiFetch<License[]>(`/admin/licenses?${query.toString()}`);
    return {
      items: res.data,
      pagination: res.meta as Pagination,
    };
  },

  async getLicense(id: string): Promise<License> {
    const res = await apiFetch<License>(`/admin/licenses/${id}`);
    return res.data;
  },

  async createLicense(data: CreateLicenseParams): Promise<{
    license: License;
    plainLicenseKey: string;
  }> {
    const res = await apiFetch<{
      license: License;
      plainLicenseKey: string;
    }>('/admin/licenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async updateLicense(id: string, data: Partial<CreateLicenseParams> & { status?: string }): Promise<License> {
    const res = await apiFetch<License>(`/admin/licenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async renewLicense(id: string, additionalDays: number, adminNote?: string): Promise<License> {
    const res = await apiFetch<License>(`/admin/licenses/${id}/renew`, {
      method: 'POST',
      body: JSON.stringify({ additionalDays, adminNote }),
    });
    return res.data;
  },

  async revokeLicense(id: string, reason?: string): Promise<License> {
    const res = await apiFetch<License>(`/admin/licenses/${id}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return res.data;
  },

  async reissueKey(id: string): Promise<{ id: string; plainLicenseKey: string; keyMasked: string }> {
    const res = await apiFetch<{ id: string; plainLicenseKey: string; keyMasked: string }>(
      `/admin/licenses/${id}/reissue`,
      { method: 'POST' }
    );
    return res.data;
  },

  async revokeInstallation(installationId: string): Promise<void> {
    await apiFetch(`/admin/installations/${installationId}/revoke`, {
      method: 'POST',
    });
  },
};
