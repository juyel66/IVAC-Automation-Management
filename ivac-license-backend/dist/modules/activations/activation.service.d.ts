import { ActivateLicenseInput, ValidateLicenseInput, HeartbeatInput, ReleaseInstallationInput } from './activation.schema.js';
export declare class ActivationService {
    /**
     * Helper to format client entitlement response
     */
    private static formatEntitlement;
    /**
     * Activates a license on a browser installation
     */
    static activateLicense(input: ActivateLicenseInput, ipAddress?: string): Promise<{
        signature: string;
        licenseId: any;
        status: any;
        activatedAt: string | null;
        expiresAt: string | null;
        daysRemaining: number;
        maxInstallations: any;
        activeInstallationsCount: number;
        availableSlots: number;
        installationId: string;
        serverTime: string;
    }>;
    /**
     * Validates an existing license and installation
     */
    static validateLicense(input: ValidateLicenseInput, ipAddress?: string): Promise<{
        signature: string;
        licenseId: any;
        status: any;
        activatedAt: string | null;
        expiresAt: string | null;
        daysRemaining: number;
        maxInstallations: any;
        activeInstallationsCount: number;
        availableSlots: number;
        installationId: string;
        serverTime: string;
    }>;
    /**
     * Lightweight periodic heartbeat
     */
    static heartbeat(input: HeartbeatInput): Promise<{
        status: string;
        timestamp: string;
    }>;
    /**
     * Releases an installation slot from the extension
     */
    static releaseInstallation(input: ReleaseInstallationInput, ipAddress?: string): Promise<{
        message: string;
        success?: undefined;
        activeInstallationsCount?: undefined;
        availableSlots?: undefined;
    } | {
        success: boolean;
        message: string;
        activeInstallationsCount: number;
        availableSlots: number;
    }>;
    /**
     * Admin revokes a specific installation
     */
    static revokeInstallationByAdmin(installationId: string, adminId: string, ipAddress?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        installationId: string;
        installationLabel: string | null;
        status: import("@prisma/client").$Enums.InstallationStatus;
        licenseId: string;
        firstActivatedAt: Date;
        lastSeenAt: Date;
        revokedAt: Date | null;
        revokedBy: string | null;
    }>;
    /**
     * Extension gets details about its own license
     */
    static getLicenseByInstallation(installationId: string): Promise<{
        licenseId: string;
        status: import("@prisma/client").$Enums.LicenseStatus;
        validityDays: number;
        activatedAt: Date | null;
        expiresAt: Date | null;
        maxInstallations: number;
        activeInstallationsCount: number;
        availableSlots: number;
        installations: {
            id: string;
            installationId: string;
            installationLabel: string | null;
            status: import("@prisma/client").$Enums.InstallationStatus;
            firstActivatedAt: Date;
            lastSeenAt: Date;
        }[];
    }>;
}
