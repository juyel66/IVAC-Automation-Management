import { z } from 'zod';
export const SubmitPaymentRequestSchema = z.object({
    transactionId: z.string().min(5, 'Valid transaction ID is required').max(100),
    paymentMethod: z.enum(['BKASH', 'NAGAD', 'ROCKET', 'UPAY', 'BANK']),
    planCode: z.string().min(2).max(50),
    payerContact: z.string().min(6, 'Valid contact number is required').max(50),
    licenseId: z.string().uuid().optional().nullable(),
    customerName: z.string().max(100).optional().nullable(),
});
export const ApprovePaymentSchema = z.object({
    adminNote: z.string().max(500).optional(),
    targetLicenseId: z.string().uuid().optional(), // In case admin manually overrides/links a specific license
});
export const RejectPaymentSchema = z.object({
    adminNote: z.string().min(2, 'Reason for rejection is required').max(500),
});
export const UpdatePaymentSettingsSchema = z.object({
    bkashNumber: z.string().min(10).max(50),
    nagadNumber: z.string().min(10).max(50),
    bankInstructions: z.string().max(1000).optional().nullable(),
    whatsappNumber: z.string().min(10).max(50),
    instructionText: z.string().max(2000).optional().nullable(),
});
export const ListPaymentsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum(['ALL', 'PENDING', 'APPROVED', 'REJECTED']).default('ALL'),
    search: z.string().optional(),
});
