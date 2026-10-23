import { SubmitPaymentRequestInput, ApprovePaymentInput, RejectPaymentInput, UpdatePaymentSettingsInput, ListPaymentsQuery } from './payment.schema.js';
export declare class PaymentService {
    /**
     * Retrieves public active subscription plans
     */
    static getPublicPlans(): Promise<{
        id: string;
        code: string;
        name: string;
        validityDays: number;
        maxInstallations: number;
        price: number;
        currency: string;
        description: any;
        isActive: boolean;
        sortOrder: number;
    }[]>;
    /**
     * Retrieves public payment instructions and available plans
     */
    static getPublicPaymentInstructions(): Promise<{
        settings: {
            bkashNumber: string;
            nagadNumber: string;
            bankInstructions: string | null;
            whatsappNumber: string;
            instructionText: string | null;
        };
        plans: {
            id: string;
            code: string;
            name: string;
            validityDays: number;
            maxInstallations: number;
            price: number;
            currency: string;
            description: any;
        }[];
    }>;
    /**
     * User submits a manual payment request
     */
    static submitPaymentRequest(input: SubmitPaymentRequestInput, ipAddress?: string): Promise<{
        requestId: string;
        transactionId: string;
        status: string;
        snapshot: {
            planId: string;
            planCode: string;
            planName: string;
            price: number;
            currency: string;
            validityDays: number;
            maxInstallations: number;
        };
        message: string;
    }>;
    /**
     * Admin lists payment requests
     */
    static listPayments(query: ListPaymentsQuery): Promise<{
        items: {
            amount: number;
            license: {
                id: string;
                status: import("@prisma/client").$Enums.LicenseStatus;
                keyMasked: string;
                plainKey: string | null;
                customerName: string | null;
            } | null;
            plan: {
                code: string;
                id: string;
                name: string;
                validityDays: number;
                maxInstallations: number;
                price: import("@prisma/client/runtime/library").Decimal;
            } | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.PaymentStatus;
            licenseId: string | null;
            validityDays: number | null;
            maxInstallations: number | null;
            customerName: string | null;
            adminNote: string | null;
            transactionId: string;
            paymentMethod: string;
            planId: string | null;
            planCode: string;
            planName: string | null;
            currency: string;
            payerContact: string;
            reviewedByAdminId: string | null;
            reviewedAt: Date | null;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    /**
     * Admin approves a payment request (Idempotent!)
     * Uses authoritative snapshot terms recorded at submission time.
     * Always generates and returns the license key according to the plan criteria and browser seats!
     */
    static approvePayment(paymentId: string, input: ApprovePaymentInput, adminId: string, ipAddress?: string): Promise<{
        message: string;
        paymentRequest: {
            license: {
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
            } | null;
            plan: {
                code: string;
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                validityDays: number;
                maxInstallations: number;
                currency: string;
                description: string | null;
                price: import("@prisma/client/runtime/library").Decimal;
                sortOrder: number;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.PaymentStatus;
            licenseId: string | null;
            validityDays: number | null;
            maxInstallations: number | null;
            customerName: string | null;
            adminNote: string | null;
            transactionId: string;
            paymentMethod: string;
            planId: string | null;
            planCode: string;
            planName: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            payerContact: string;
            reviewedByAdminId: string | null;
            reviewedAt: Date | null;
        };
        isAlreadyApproved: boolean;
        generatedPlainKey: string | undefined;
        linkedLicenseId: string | null;
        license: {
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
        } | null;
        success?: undefined;
        plan?: undefined;
        actionResult?: undefined;
    } | {
        success: boolean;
        message: string;
        paymentRequest: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.PaymentStatus;
            licenseId: string | null;
            validityDays: number | null;
            maxInstallations: number | null;
            customerName: string | null;
            adminNote: string | null;
            transactionId: string;
            paymentMethod: string;
            planId: string | null;
            planCode: string;
            planName: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            payerContact: string;
            reviewedByAdminId: string | null;
            reviewedAt: Date | null;
        };
        generatedPlainKey: string;
        linkedLicenseId: string;
        license: {
            id: any;
            keyMasked: any;
            plainKey: string;
            validityDays: number;
            maxInstallations: number;
            status: any;
        };
        plan: {
            name: string;
            validityDays: number;
            maxInstallations: number;
        };
        actionResult: "CREATED" | "RENEWED";
        isAlreadyApproved?: undefined;
    }>;
    /**
     * Admin rejects a payment request
     */
    static rejectPayment(paymentId: string, input: RejectPaymentInput, adminId: string, ipAddress?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.PaymentStatus;
        licenseId: string | null;
        validityDays: number | null;
        maxInstallations: number | null;
        customerName: string | null;
        adminNote: string | null;
        transactionId: string;
        paymentMethod: string;
        planId: string | null;
        planCode: string;
        planName: string | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        currency: string;
        payerContact: string;
        reviewedByAdminId: string | null;
        reviewedAt: Date | null;
    }>;
    /**
     * Update payment settings (bKash, Nagad, WhatsApp, etc.)
     */
    static updateSettings(input: UpdatePaymentSettingsInput, adminId: string, ipAddress?: string): Promise<{
        id: string;
        updatedAt: Date;
        bkashNumber: string;
        nagadNumber: string;
        bankInstructions: string | null;
        whatsappNumber: string;
        instructionText: string | null;
    }>;
}
