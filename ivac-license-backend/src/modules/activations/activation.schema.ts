import { z } from 'zod';

export const ActivateLicenseSchema = z.object({
  licenseKey: z.string().min(10, 'License key is required').max(100),
  installationId: z.string().min(8, 'Installation ID is required').max(100),
  installationLabel: z.string().max(100).optional(),
});

export const ValidateLicenseSchema = z.object({
  licenseKey: z.string().max(100).optional(),
  licenseId: z.string().uuid().optional(),
  installationId: z.string().min(8, 'Installation ID is required').max(100),
}).refine((data) => data.licenseKey || data.licenseId, {
  message: 'Either licenseKey or licenseId must be provided',
  path: ['licenseKey'],
});

export const HeartbeatSchema = z.object({
  licenseId: z.string().uuid('Valid License ID is required'),
  installationId: z.string().min(8, 'Installation ID is required').max(100),
});

export const ReleaseInstallationSchema = z.object({
  licenseKey: z.string().min(10, 'License key is required').max(100),
  installationId: z.string().min(8, 'Installation ID is required').max(100),
});

export type ActivateLicenseInput = z.infer<typeof ActivateLicenseSchema>;
export type ValidateLicenseInput = z.infer<typeof ValidateLicenseSchema>;
export type HeartbeatInput = z.infer<typeof HeartbeatSchema>;
export type ReleaseInstallationInput = z.infer<typeof ReleaseInstallationSchema>;
