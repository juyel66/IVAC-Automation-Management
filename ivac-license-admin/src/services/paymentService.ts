import { apiFetch } from './api.js';
import { PaymentRequest, PaymentSettings, PaymentPlan, Pagination } from '../types/index.js';

export const paymentService = {
  async listPayments(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{ items: PaymentRequest[]; pagination: Pagination }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);

    const res = await apiFetch<PaymentRequest[]>(`/admin/payments?${query.toString()}`);
    return {
      items: res.data,
      pagination: res.meta as Pagination,
    };
  },

  async approvePayment(id: string, adminNote?: string, targetLicenseId?: string) {
    const res = await apiFetch(`/admin/payments/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ adminNote, targetLicenseId }),
    });
    return res.data;
  },

  async rejectPayment(id: string, adminNote: string) {
    const res = await apiFetch(`/admin/payments/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ adminNote }),
    });
    return res.data;
  },

  async getPublicInstructions(): Promise<{
    settings: PaymentSettings;
    plans: PaymentPlan[];
  }> {
    const res = await apiFetch<{
      settings: PaymentSettings;
      plans: PaymentPlan[];
    }>('/public/payment-instructions');
    return res.data;
  },

  async updateSettings(data: PaymentSettings): Promise<PaymentSettings> {
    const res = await apiFetch<PaymentSettings>('/admin/payment-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data;
  },
};
