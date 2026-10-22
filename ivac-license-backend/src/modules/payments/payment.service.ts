import { prisma } from '../../config/database.js';
import { AuditService } from '../../services/audit.service.js';
import { LicenseService } from '../licenses/license.service.js';
import {
  SubmitPaymentRequestInput,
  ApprovePaymentInput,
  RejectPaymentInput,
  UpdatePaymentSettingsInput,
  ListPaymentsQuery,
} from './payment.schema.js';

export class PaymentService {
  /**
   * Retrieves public payment instructions and available plans
   */
  public static async getPublicPaymentInstructions() {
    let settings = await prisma.paymentSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      // Create default settings if not yet initialized
      settings = await prisma.paymentSettings.create({
        data: {
          id: 'default',
          bkashNumber: '01700000000',
          nagadNumber: '01800000000',
          bankInstructions: 'City Bank AC: 1102938472910 | AC Name: IVAC Assistant Portal',
          whatsappNumber: '+8801700000000',
          instructionText:
            '1. Send money via bKash or Nagad Personal/Merchant to the given number.\n2. Note down your Transaction ID (TrxID).\n3. Enter the TrxID and your phone number below and click Submit.\n4. Admin will verify and activate/renew your license within 15-30 minutes.',
        },
      });
    }

    let plans = await prisma.paymentPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (plans.length === 0) {
      // Seed default plans if none exist
      await prisma.paymentPlan.createMany({
        data: [
          { code: 'PLAN_7D', name: '7 Days Trial Pass', validityDays: 7, price: 300, maxInstallations: 1, sortOrder: 1 },
          { code: 'PLAN_15D', name: '15 Days Starter Pass', validityDays: 15, price: 600, maxInstallations: 1, sortOrder: 2 },
          { code: 'PLAN_30D', name: '30 Days Standard License', validityDays: 30, price: 1000, maxInstallations: 1, sortOrder: 3 },
          { code: 'PLAN_90D', name: '90 Days Agency Pass', validityDays: 90, price: 2700, maxInstallations: 2, sortOrder: 4 },
        ],
      });
      plans = await prisma.paymentPlan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
    }

    return {
      settings: {
        bkashNumber: settings.bkashNumber,
        nagadNumber: settings.nagadNumber,
        bankInstructions: settings.bankInstructions,
        whatsappNumber: settings.whatsappNumber,
        instructionText: settings.instructionText,
      },
      plans: plans.map((p) => ({
        code: p.code,
        name: p.name,
        validityDays: p.validityDays,
        maxInstallations: p.maxInstallations,
        price: Number(p.price),
        currency: p.currency,
      })),
    };
  }

  /**
   * User submits a manual payment request
   */
  public static async submitPaymentRequest(input: SubmitPaymentRequestInput, ipAddress?: string) {
    const trxId = input.transactionId.trim().toUpperCase();

    // Check for duplicate pending transaction ID
    const existing = await prisma.paymentRequest.findUnique({
      where: { transactionId: trxId },
    });

    if (existing) {
      if (existing.status === 'PENDING') {
        throw {
          status: 409,
          message: 'A payment request with this Transaction ID is already pending review.',
          code: 'DUPLICATE_PENDING_TRANSACTION',
        };
      } else if (existing.status === 'APPROVED') {
        throw {
          status: 409,
          message: 'This Transaction ID has already been approved and credited.',
          code: 'TRANSACTION_ALREADY_USED',
        };
      }
    }

    // Look up plan
    const plan = await prisma.paymentPlan.findUnique({
      where: { code: input.planCode },
    });

    if (!plan) {
      throw { status: 400, message: 'Invalid subscription plan selected.', code: 'INVALID_PLAN' };
    }

    const paymentRequest = await prisma.paymentRequest.create({
      data: {
        transactionId: trxId,
        paymentMethod: input.paymentMethod,
        planCode: plan.code,
        amount: plan.price,
        currency: plan.currency,
        payerContact: input.payerContact.trim(),
        licenseId: input.licenseId || null,
        status: 'PENDING',
      },
    });

    await AuditService.log({
      action: 'PAYMENT_REQUEST_SUBMITTED',
      entityType: 'PAYMENT',
      entityId: paymentRequest.id,
      details: {
        transactionId: trxId,
        method: input.paymentMethod,
        plan: plan.code,
        payerContact: input.payerContact,
        licenseId: input.licenseId,
      },
      ipAddress,
    });

    return {
      requestId: paymentRequest.id,
      transactionId: trxId,
      status: 'PENDING',
      message:
        'Payment request received successfully. It is now awaiting manual admin verification. Your license will be issued/renewed once payment is confirmed.',
    };
  }

  /**
   * Admin lists payment requests
   */
  public static async listPayments(query: ListPaymentsQuery) {
    const { page, limit, status, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { transactionId: { contains: term, mode: 'insensitive' } },
        { payerContact: { contains: term, mode: 'insensitive' } },
        { licenseId: { contains: term, mode: 'insensitive' } },
        { adminNote: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.paymentRequest.count({ where }),
      prisma.paymentRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          license: {
            select: {
              id: true,
              keyMasked: true,
              status: true,
              customerName: true,
            },
          },
        },
      }),
    ]);

    return {
      items: items.map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin approves a payment request (Idempotent!)
   */
  public static async approvePayment(
    paymentId: string,
    input: ApprovePaymentInput,
    adminId: string,
    ipAddress?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const payment = await tx.paymentRequest.findUnique({
        where: { id: paymentId },
        include: { license: true },
      });

      if (!payment) {
        throw { status: 404, message: 'Payment request not found.', code: 'NOT_FOUND' };
      }

      // Idempotency: If already approved, return without duplicating license action
      if (payment.status === 'APPROVED') {
        return {
          message: 'Payment was already approved previously.',
          paymentRequest: payment,
          isAlreadyApproved: true,
        };
      }

      // Find plan details
      const plan = await tx.paymentPlan.findUnique({
        where: { code: payment.planCode },
      });
      const validityDays = plan ? plan.validityDays : 30;
      const maxInstallations = plan ? plan.maxInstallations : 1;

      let targetLicenseId = input.targetLicenseId || payment.licenseId;
      let generatedPlainKey: string | undefined;

      if (targetLicenseId) {
        // Renew existing license
        const targetLic = await tx.license.findUnique({ where: { id: targetLicenseId } });
        if (!targetLic) {
          throw { status: 404, message: 'Linked license not found.', code: 'LICENSE_NOT_FOUND' };
        }

        const now = new Date();
        const baseTime = targetLic.expiresAt && targetLic.expiresAt > now ? targetLic.expiresAt : now;
        const newExpiresAt = new Date(baseTime.getTime() + validityDays * 24 * 3600 * 1000);

        await tx.license.update({
          where: { id: targetLicenseId },
          data: {
            status: 'ACTIVE',
            expiresAt: newExpiresAt,
            activatedAt: targetLic.activatedAt || now,
            updatedByAdminId: adminId,
            adminNotes: `${targetLic.adminNotes || ''}\n[Approved Payment ${payment.transactionId}]`.trim(),
          },
        });
      } else {
        // No existing license -> generate a new license for this approved payment
        const newLicense = await LicenseService.createLicense(
          {
            validityDays,
            maxInstallations,
            customerContact: payment.payerContact,
            adminNotes: `Generated from manual payment TrxID: ${payment.transactionId}`,
          },
          adminId,
          ipAddress
        );

        targetLicenseId = newLicense.license.id;
        generatedPlainKey = newLicense.plainLicenseKey;
      }

      // Mark payment as approved
      const updatedPayment = await tx.paymentRequest.update({
        where: { id: paymentId },
        data: {
          status: 'APPROVED',
          licenseId: targetLicenseId,
          adminNote: input.adminNote || 'Payment verified and approved.',
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
        },
      });

      await AuditService.log({
        adminId,
        action: 'PAYMENT_APPROVED',
        entityType: 'PAYMENT',
        entityId: paymentId,
        details: {
          transactionId: payment.transactionId,
          licenseId: targetLicenseId,
          plan: payment.planCode,
          generatedNewLicense: !!generatedPlainKey,
        },
        ipAddress,
      });

      return {
        success: true,
        message: 'Payment approved successfully.',
        paymentRequest: updatedPayment,
        generatedPlainKey,
        linkedLicenseId: targetLicenseId,
      };
    });
  }

  /**
   * Admin rejects a payment request
   */
  public static async rejectPayment(
    paymentId: string,
    input: RejectPaymentInput,
    adminId: string,
    ipAddress?: string
  ) {
    const payment = await prisma.paymentRequest.findUnique({ where: { id: paymentId } });
    if (!payment) {
      throw { status: 404, message: 'Payment request not found', code: 'NOT_FOUND' };
    }

    if (payment.status === 'APPROVED') {
      throw { status: 400, message: 'Cannot reject an already approved payment', code: 'ALREADY_APPROVED' };
    }

    const updated = await prisma.paymentRequest.update({
      where: { id: paymentId },
      data: {
        status: 'REJECTED',
        adminNote: input.adminNote,
        reviewedByAdminId: adminId,
        reviewedAt: new Date(),
      },
    });

    await AuditService.log({
      adminId,
      action: 'PAYMENT_REJECTED',
      entityType: 'PAYMENT',
      entityId: paymentId,
      details: {
        transactionId: payment.transactionId,
        reason: input.adminNote,
      },
      ipAddress,
    });

    return updated;
  }

  /**
   * Update payment settings (bKash, Nagad, WhatsApp, etc.)
   */
  public static async updateSettings(input: UpdatePaymentSettingsInput, adminId: string, ipAddress?: string) {
    const updated = await prisma.paymentSettings.upsert({
      where: { id: 'default' },
      update: input,
      create: {
        id: 'default',
        ...input,
      },
    });

    await AuditService.log({
      adminId,
      action: 'PAYMENT_SETTINGS_UPDATED',
      entityType: 'SETTINGS',
      entityId: 'default',
      details: input,
      ipAddress,
    });

    return updated;
  }
}
