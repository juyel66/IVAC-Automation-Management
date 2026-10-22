import { SubmitPaymentRequestInput, ApprovePaymentInput, RejectPaymentInput, UpdatePaymentSettingsInput, ListPaymentsQuery } from './payment.schema.js';
export declare class PaymentService {
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
            code: string;
            name: string;
            validityDays: number;
            maxInstallations: number;
            price: number;
            currency: string;
        }[];
    }>;
    /**
     * User submits a manual payment request
     */
    static submitPaymentRequest(input: SubmitPaymentRequestInput, ipAddress?: string): Promise<{
        requestId: string;
        transactionId: string;
        status: string;
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
                customerName: string | null;
            } | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.PaymentStatus;
            licenseId: string | null;
            adminNote: string | null;
            transactionId: string;
            paymentMethod: string;
            planCode: string;
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
        } & {
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
        };
        isAlreadyApproved: boolean;
        success?: undefined;
        generatedPlainKey?: undefined;
        linkedLicenseId?: undefined;
    } | {
        success: boolean;
        message: string;
        paymentRequest: {
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
        };
        generatedPlainKey: string | undefined;
        linkedLicenseId: string;
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
        adminNote: string | null;
        transactionId: string;
        paymentMethod: string;
        planCode: string;
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
