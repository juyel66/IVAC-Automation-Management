import { z } from 'zod';
export declare const SubmitPaymentRequestSchema: z.ZodEffects<z.ZodObject<{
    transactionId: z.ZodString;
    paymentMethod: z.ZodEnum<["BKASH", "NAGAD", "ROCKET", "UPAY", "BANK"]>;
    planId: z.ZodOptional<z.ZodString>;
    planCode: z.ZodOptional<z.ZodString>;
    payerContact: z.ZodString;
    payerName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    customerName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    licenseId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    transactionId: string;
    paymentMethod: "BKASH" | "NAGAD" | "ROCKET" | "UPAY" | "BANK";
    payerContact: string;
    licenseId?: string | null | undefined;
    customerName?: string | null | undefined;
    planId?: string | undefined;
    planCode?: string | undefined;
    payerName?: string | null | undefined;
}, {
    transactionId: string;
    paymentMethod: "BKASH" | "NAGAD" | "ROCKET" | "UPAY" | "BANK";
    payerContact: string;
    licenseId?: string | null | undefined;
    customerName?: string | null | undefined;
    planId?: string | undefined;
    planCode?: string | undefined;
    payerName?: string | null | undefined;
}>, {
    transactionId: string;
    paymentMethod: "BKASH" | "NAGAD" | "ROCKET" | "UPAY" | "BANK";
    payerContact: string;
    licenseId?: string | null | undefined;
    customerName?: string | null | undefined;
    planId?: string | undefined;
    planCode?: string | undefined;
    payerName?: string | null | undefined;
}, {
    transactionId: string;
    paymentMethod: "BKASH" | "NAGAD" | "ROCKET" | "UPAY" | "BANK";
    payerContact: string;
    licenseId?: string | null | undefined;
    customerName?: string | null | undefined;
    planId?: string | undefined;
    planCode?: string | undefined;
    payerName?: string | null | undefined;
}>;
export declare const ApprovePaymentSchema: z.ZodObject<{
    adminNote: z.ZodOptional<z.ZodString>;
    targetLicenseId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    adminNote?: string | undefined;
    targetLicenseId?: string | undefined;
}, {
    adminNote?: string | undefined;
    targetLicenseId?: string | undefined;
}>;
export declare const RejectPaymentSchema: z.ZodObject<{
    adminNote: z.ZodString;
}, "strip", z.ZodTypeAny, {
    adminNote: string;
}, {
    adminNote: string;
}>;
export declare const UpdatePaymentSettingsSchema: z.ZodObject<{
    bkashNumber: z.ZodString;
    nagadNumber: z.ZodString;
    bankInstructions: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    whatsappNumber: z.ZodString;
    instructionText: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    bkashNumber: string;
    nagadNumber: string;
    whatsappNumber: string;
    bankInstructions?: string | null | undefined;
    instructionText?: string | null | undefined;
}, {
    bkashNumber: string;
    nagadNumber: string;
    whatsappNumber: string;
    bankInstructions?: string | null | undefined;
    instructionText?: string | null | undefined;
}>;
export declare const ListPaymentsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    status: z.ZodDefault<z.ZodEnum<["ALL", "PENDING", "APPROVED", "REJECTED"]>>;
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "PENDING" | "ALL" | "APPROVED" | "REJECTED";
    page: number;
    limit: number;
    search?: string | undefined;
}, {
    search?: string | undefined;
    status?: "PENDING" | "ALL" | "APPROVED" | "REJECTED" | undefined;
    page?: number | undefined;
    limit?: number | undefined;
}>;
export type SubmitPaymentRequestInput = z.infer<typeof SubmitPaymentRequestSchema>;
export type ApprovePaymentInput = z.infer<typeof ApprovePaymentSchema>;
export type RejectPaymentInput = z.infer<typeof RejectPaymentSchema>;
export type UpdatePaymentSettingsInput = z.infer<typeof UpdatePaymentSettingsSchema>;
export type ListPaymentsQuery = z.infer<typeof ListPaymentsQuerySchema>;
