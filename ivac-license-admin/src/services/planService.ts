import { apiFetch } from './api.js';
import { PaymentPlan, CreatePlanInput, UpdatePlanInput } from '../types/index.js';

export const planService = {
  /**
   * Admin: List all subscription plans with optional status/search filters
   */
  async listPlans(params?: {
    isActive?: 'true' | 'false' | 'ALL';
    search?: string;
  }): Promise<PaymentPlan[]> {
    const query = new URLSearchParams();
    if (params?.isActive && params.isActive !== 'ALL') {
      query.append('isActive', params.isActive);
    }
    if (params?.search && params.search.trim()) {
      query.append('search', params.search.trim());
    }

    const qStr = query.toString();
    const endpoint = qStr ? `/admin/plans?${qStr}` : '/admin/plans';
    const res = await apiFetch<PaymentPlan[]>(endpoint);
    return res.data;
  },

  /**
   * Admin: Get plan by ID
   */
  async getPlan(id: string): Promise<PaymentPlan> {
    const res = await apiFetch<PaymentPlan>(`/admin/plans/${id}`);
    return res.data;
  },

  /**
   * Admin: Create a new plan
   */
  async createPlan(data: CreatePlanInput): Promise<PaymentPlan> {
    const res = await apiFetch<PaymentPlan>('/admin/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  /**
   * Admin: Update an existing plan
   */
  async updatePlan(id: string, data: UpdatePlanInput): Promise<PaymentPlan> {
    const res = await apiFetch<PaymentPlan>(`/admin/plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  /**
   * Admin: Toggle active state of a plan
   */
  async togglePlanStatus(id: string, isActive: boolean): Promise<PaymentPlan> {
    const res = await apiFetch<PaymentPlan>(`/admin/plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    return res.data;
  },

  /**
   * Admin: Safely archive or delete a plan
   */
  async deleteOrArchivePlan(id: string): Promise<{
    action: 'ARCHIVED' | 'DELETED';
    message: string;
    plan: Partial<PaymentPlan>;
  }> {
    const res = await apiFetch<{
      action: 'ARCHIVED' | 'DELETED';
      message: string;
      plan: Partial<PaymentPlan>;
    }>(`/admin/plans/${id}`, {
      method: 'DELETE',
    });
    return res.data;
  },

  /**
   * Public: List active plans for public/extension consumption
   */
  async getPublicPlans(): Promise<PaymentPlan[]> {
    const res = await apiFetch<PaymentPlan[]>('/public/plans');
    return res.data;
  },
};
