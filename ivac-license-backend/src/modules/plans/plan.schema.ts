import { z } from 'zod';

export const CreatePlanSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Plan code must be at least 2 characters')
    .max(50, 'Plan code must not exceed 50 characters')
    .regex(/^[A-Za-z0-9_-]+$/, 'Plan code must contain only letters, numbers, hyphens, and underscores'),
  name: z.string().trim().min(2, 'Plan name must be at least 2 characters').max(100),
  description: z.string().trim().max(500).optional().nullable(),
  price: z.coerce.number().min(0, 'Price must be a valid non-negative BDT amount'),
  currency: z.string().trim().default('BDT'),
  validityDays: z.coerce
    .number()
    .int('Validity days must be an integer')
    .positive('Validity days must be a positive integer (at least 1)'),
  maxInstallations: z.coerce
    .number()
    .int('Browser installation limit must be an integer')
    .positive('Browser installation limit must be a positive integer (at least 1)')
    .default(1),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

export const UpdatePlanSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Plan code must be at least 2 characters')
    .max(50, 'Plan code must not exceed 50 characters')
    .regex(/^[A-Za-z0-9_-]+$/, 'Plan code must contain only letters, numbers, hyphens, and underscores')
    .optional(),
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  price: z.coerce.number().min(0, 'Price must be a valid non-negative BDT amount').optional(),
  currency: z.string().trim().optional(),
  validityDays: z.coerce
    .number()
    .int('Validity days must be an integer')
    .positive('Validity days must be a positive integer')
    .optional(),
  maxInstallations: z.coerce
    .number()
    .int('Browser installation limit must be an integer')
    .positive('Browser installation limit must be a positive integer')
    .optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const ListPlansQuerySchema = z.object({
  isActive: z.enum(['true', 'false', 'ALL']).optional().default('ALL'),
  search: z.string().optional(),
});

export type CreatePlanInput = z.infer<typeof CreatePlanSchema>;
export type UpdatePlanInput = z.infer<typeof UpdatePlanSchema>;
export type ListPlansQuery = z.infer<typeof ListPlansQuerySchema>;
