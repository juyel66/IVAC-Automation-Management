import { z } from 'zod';
export declare const CreateLicenseSchema: z.ZodObject<{
    validityDays: z.ZodDefault<z.ZodNumber>;
    maxInstallations: z.ZodDefault<z.ZodNumber>;
    customerName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    customerContact: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    adminNotes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    validityDays: number;
    maxInstallations: number;
    customerName?: string | null | undefined;
    customerContact?: string | null | undefined;
    adminNotes?: string | null | undefined;
}, {
    validityDays?: number | undefined;
    maxInstallations?: number | undefined;
    customerName?: string | null | undefined;
    customerContact?: string | null | undefined;
    adminNotes?: string | null | undefined;
}>;
export declare const UpdateLicenseSchema: z.ZodObject<{
    customerName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    customerContact: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    adminNotes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    maxInstallations: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<["PENDING", "ACTIVE", "EXPIRED", "SUSPENDED", "REVOKED"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "ACTIVE" | "EXPIRED" | "PENDING" | "SUSPENDED" | "REVOKED" | undefined;
    maxInstallations?: number | undefined;
    customerName?: string | null | undefined;
    customerContact?: string | null | undefined;
    adminNotes?: string | null | undefined;
}, {
    status?: "ACTIVE" | "EXPIRED" | "PENDING" | "SUSPENDED" | "REVOKED" | undefined;
    maxInstallations?: number | undefined;
    customerName?: string | null | undefined;
    customerContact?: string | null | undefined;
    adminNotes?: string | null | undefined;
}>;
export declare const RenewLicenseSchema: z.ZodObject<{
    additionalDays: z.ZodDefault<z.ZodNumber>;
    adminNote: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    additionalDays: number;
    adminNote?: string | undefined;
}, {
    additionalDays?: number | undefined;
    adminNote?: string | undefined;
}>;
export declare const ListLicensesQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    status: z.ZodDefault<z.ZodEnum<["ALL", "PENDING", "ACTIVE", "EXPIRED", "SUSPENDED", "REVOKED"]>>;
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "EXPIRED" | "PENDING" | "SUSPENDED" | "REVOKED" | "ALL";
    page: number;
    limit: number;
    search?: string | undefined;
}, {
    search?: string | undefined;
    status?: "ACTIVE" | "EXPIRED" | "PENDING" | "SUSPENDED" | "REVOKED" | "ALL" | undefined;
    page?: number | undefined;
    limit?: number | undefined;
}>;
export type CreateLicenseInput = z.infer<typeof CreateLicenseSchema>;
export type UpdateLicenseInput = z.infer<typeof UpdateLicenseSchema>;
export type RenewLicenseInput = z.infer<typeof RenewLicenseSchema>;
export type ListLicensesQuery = z.infer<typeof ListLicensesQuerySchema>;
