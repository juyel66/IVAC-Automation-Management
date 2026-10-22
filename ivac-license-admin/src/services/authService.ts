import { apiFetch } from './api.js';
import { AdminUser } from '../types/index.js';

export const authService = {
  async login(identifier: string, password: string) {
    const res = await apiFetch<{
      token: string;
      expiresAt: string;
      admin: AdminUser;
    }>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });

    localStorage.setItem('ivac_admin_token', res.data.token);
    localStorage.setItem('ivac_admin_user', JSON.stringify(res.data.admin));
    return res.data;
  },

  async logout() {
    try {
      await apiFetch('/admin/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('ivac_admin_token');
      localStorage.removeItem('ivac_admin_user');
    }
  },

  async getMe() {
    const res = await apiFetch<AdminUser>('/admin/auth/me');
    return res.data;
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const res = await apiFetch('/admin/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return res;
  },

  getCurrentUser(): AdminUser | null {
    const stored = localStorage.getItem('ivac_admin_user');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('ivac_admin_token');
  },
};
