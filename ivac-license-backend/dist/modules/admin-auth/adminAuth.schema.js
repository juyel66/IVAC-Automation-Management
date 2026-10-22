import { z } from 'zod';
export const AdminLoginSchema = z.object({
    identifier: z.string().min(3, 'Username or Email is required').max(100),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});
export const AdminChangePasswordSchema = z.object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});
