import { CreateLicenseInput, UpdateLicenseInput, RenewLicenseInput, ListLicensesQuery } from './license.schema.js';
export declare class LicenseService {
    /**
     * Generates a new license with a secure key
     */
    static createLicense(input: CreateLicenseInput, adminId: string, ipAddress?: string): Promise<{
        license: {
            currentInstallations: number;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.LicenseStatus;
            keyHash: string;
            keyMasked: string;
            plainKey: string | null;
            validityDays: number;
            activatedAt: Date | null;
            expiresAt: Date | null;
            maxInstallations: number;
            customerName: string | null;
            customerContact: string | null;
            adminNotes: string | null;
            lastValidatedAt: Date | null;
            createdByAdminId: string | null;
            updatedByAdminId: string | null;
        };
        plainLicenseKey: string;
    }>;
    /**
     * List licenses with filters, search, and pagination
     */
    static listLicenses(query: ListLicensesQuery): Promise<{
        items: {
            id: string;
            keyMasked: string;
            plainKey: string | null;
            status: import("@prisma/client").$Enums.LicenseStatus;
            validityDays: number;
            activatedAt: Date | null;
            expiresAt: Date | null;
            maxInstallations: number;
            activeInstallationsCount: number;
            customerName: string | null;
            customerContact: string | null;
            adminNotes: string | null;
            lastValidatedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    /**
     * Get single license details
     */
    static getLicenseById(id: string): Promise<{
        keyHash: undefined;
        status: import("@prisma/client").$Enums.LicenseStatus;
        activeInstallationsCount: number;
        availableSlots: number;
        installations: {
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
        }[];
        paymentRequests: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.PaymentStatus;
            licenseId: string | null;
            adminNote: string | null;
            transactionId: string;
            paymentMethod: string;
            planCode: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            payerContact: string;
            reviewedByAdminId: string | null;
            reviewedAt: Date | null;
        }[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        keyMasked: string;
        plainKey: string | null;
        validityDays: number;
        activatedAt: Date | null;
        expiresAt: Date | null;
        maxInstallations: number;
        currentInstallations: number;
        customerName: string | null;
        customerContact: string | null;
        adminNotes: string | null;
        lastValidatedAt: Date | null;
        createdByAdminId: string | null;
        updatedByAdminId: string | null;
    }>;
    /**
     * Update license fields (status, limits, notes)
     */
    static updateLicense(id: string, input: UpdateLicenseInput, adminId: string, ipAddress?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.LicenseStatus;
        keyHash: string;
        keyMasked: string;
        plainKey: string | null;
        validityDays: number;
        activatedAt: Date | null;
        expiresAt: Date | null;
        maxInstallations: number;
        currentInstallations: number;
        customerName: string | null;
        customerContact: string | null;
        adminNotes: string | null;
        lastValidatedAt: Date | null;
        createdByAdminId: string | null;
        updatedByAdminId: string | null;
    }>;
    /**
     * Revoke license immediately
     */
    static revokeLicense(id: string, reason: string | undefined, adminId: string, ipAddress?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.LicenseStatus;
        keyHash: string;
        keyMasked: string;
        plainKey: string | null;
        validityDays: number;
        activatedAt: Date | null;
        expiresAt: Date | null;
        maxInstallations: number;
        currentInstallations: number;
        customerName: string | null;
        customerContact: string | null;
        adminNotes: string | null;
        lastValidatedAt: Date | null;
        createdByAdminId: string | null;
        updatedByAdminId: string | null;
    }>;
    /**
     * Renew or extend license validity
     */
    static renewLicense(id: string, input: RenewLicenseInput, adminId: string, ipAddress?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.LicenseStatus;
        keyHash: string;
        keyMasked: string;
        plainKey: string | null;
        validityDays: number;
        activatedAt: Date | null;
        expiresAt: Date | null;
        maxInstallations: number;
        currentInstallations: number;
        customerName: string | null;
        customerContact: string | null;
        adminNotes: string | null;
        lastValidatedAt: Date | null;
        createdByAdminId: string | null;
        updatedByAdminId: string | null;
    }>;
    /**
     * Reissue / rotate key (generates new plaintext key, invalidates old key)
     */
    static reissueKey(id: string, adminId: string, ipAddress?: string): Promise<{
        id: string;
        plainLicenseKey: string;
        keyMasked: string;
    }>;
    /**
     * Admin dashboard summary statistics
     */
    static getDashboardStats(): Promise<{
        totalLicenses: number;
        activeLicenses: number;
        pendingLicenses: number;
        expiredLicenses: number;
        revokedLicenses: number;
        suspendedLicenses: number;
        pendingPayments: number;
        activeInstallations: number;
        licensesExpiringSoon: number;
    }>;
}
