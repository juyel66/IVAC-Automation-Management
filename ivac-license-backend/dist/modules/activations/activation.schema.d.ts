import { z } from 'zod';
export declare const ActivateLicenseSchema: z.ZodObject<{
    licenseKey: z.ZodString;
    installationId: z.ZodString;
    installationLabel: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    licenseKey: string;
    installationId: string;
    installationLabel?: string | undefined;
}, {
    licenseKey: string;
    installationId: string;
    installationLabel?: string | undefined;
}>;
export declare const ValidateLicenseSchema: z.ZodEffects<z.ZodObject<{
    licenseKey: z.ZodOptional<z.ZodString>;
    licenseId: z.ZodOptional<z.ZodString>;
    installationId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    installationId: string;
    licenseKey?: string | undefined;
    licenseId?: string | undefined;
}, {
    installationId: string;
    licenseKey?: string | undefined;
    licenseId?: string | undefined;
}>, {
    installationId: string;
    licenseKey?: string | undefined;
    licenseId?: string | undefined;
}, {
    installationId: string;
    licenseKey?: string | undefined;
    licenseId?: string | undefined;
}>;
export declare const HeartbeatSchema: z.ZodObject<{
    licenseId: z.ZodString;
    installationId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    installationId: string;
    licenseId: string;
}, {
    installationId: string;
    licenseId: string;
}>;
export declare const ReleaseInstallationSchema: z.ZodObject<{
    licenseKey: z.ZodString;
    installationId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    licenseKey: string;
    installationId: string;
}, {
    licenseKey: string;
    installationId: string;
}>;
export type ActivateLicenseInput = z.infer<typeof ActivateLicenseSchema>;
export type ValidateLicenseInput = z.infer<typeof ValidateLicenseSchema>;
export type HeartbeatInput = z.infer<typeof HeartbeatSchema>;
export type ReleaseInstallationInput = z.infer<typeof ReleaseInstallationSchema>;
