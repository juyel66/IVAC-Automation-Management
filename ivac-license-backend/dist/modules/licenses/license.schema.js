import { z } from 'zod';
export const CreateLicenseSchema = z.object({
    validityDays: z.number().int().min(1).max(3650).default(30),
    maxInstallations: z.number().int().min(1).max(100).default(1),
    customerName: z.string().max(100).optional().nullable(),
    customerContact: z.string().max(100).optional().nullable(),
    adminNotes: z.string().max(500).optional().nullable(),
});
export const UpdateLicenseSchema = z.object({
    customerName: z.string().max(100).optional().nullable(),
    customerContact: z.string().max(100).optional().nullable(),
    adminNotes: z.string().max(500).optional().nullable(),
    maxInstallations: z.number().int().min(1).max(100).optional(),
    status: z.enum(['PENDING', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'REVOKED']).optional(),
});
export const RenewLicenseSchema = z.object({
    additionalDays: z.number().int().min(1).max(3650).default(30),
    adminNote: z.string().max(500).optional(),
});
export const ListLicensesQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum(['ALL', 'PENDING', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'REVOKED']).default('ALL'),
    search: z.string().optional(),
});
