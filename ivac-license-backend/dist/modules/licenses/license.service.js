import { prisma } from '../../config/database.js';
import { generateLicenseKey, hashLicenseKey, maskLicenseKey } from '../../utils/keyGenerator.js';
import { AuditService } from '../../services/audit.service.js';
export class LicenseService {
    /**
     * Generates a new license with a secure key
     */
    static async createLicense(input, adminId, ipAddress) {
        const rawKey = generateLicenseKey();
        const keyHash = hashLicenseKey(rawKey);
        const keyMasked = maskLicenseKey(rawKey);
        const license = await prisma.license.create({
            data: {
                keyHash,
                keyMasked,
                plainKey: rawKey,
                status: 'PENDING',
                validityDays: input.validityDays,
                maxInstallations: input.maxInstallations,
                customerName: input.customerName || null,
                customerContact: input.customerContact || null,
                adminNotes: input.adminNotes || null,
                createdByAdminId: adminId,
                updatedByAdminId: adminId,
            },
        });
        await AuditService.log({
            adminId,
            action: 'LICENSE_CREATED',
            entityType: 'LICENSE',
            entityId: license.id,
            details: {
                validityDays: input.validityDays,
                maxInstallations: input.maxInstallations,
                customerName: input.customerName,
            },
            ipAddress,
        });
        // Plaintext rawKey is returned ONLY here so admin can copy it!
        return {
            license: {
                ...license,
                currentInstallations: 0,
            },
            plainLicenseKey: rawKey,
        };
    }
    /**
     * List licenses with filters, search, and pagination
     */
    static async listLicenses(query) {
        const { page, limit, status, search } = query;
        const skip = (page - 1) * limit;
        const where = {};
        if (status && status !== 'ALL') {
            where.status = status;
        }
        if (search && search.trim()) {
            const term = search.trim();
            where.OR = [
                { id: { contains: term, mode: 'insensitive' } },
                { customerName: { contains: term, mode: 'insensitive' } },
                { customerContact: { contains: term, mode: 'insensitive' } },
                { keyMasked: { contains: term, mode: 'insensitive' } },
                { adminNotes: { contains: term, mode: 'insensitive' } },
            ];
        }
        const [total, items] = await Promise.all([
            prisma.license.count({ where }),
            prisma.license.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: {
                            installations: {
                                where: { status: 'ACTIVE' },
                            },
                        },
                    },
                },
            }),
        ]);
        // Check dynamic expiration on returned items
        const now = new Date();
        const formatted = items.map((lic) => {
            let currentStatus = lic.status;
            if (lic.status === 'ACTIVE' && lic.expiresAt && lic.expiresAt < now) {
                currentStatus = 'EXPIRED';
            }
            return {
                id: lic.id,
                keyMasked: lic.keyMasked,
                plainKey: lic.plainKey,
                status: currentStatus,
                validityDays: lic.validityDays,
                activatedAt: lic.activatedAt,
                expiresAt: lic.expiresAt,
                maxInstallations: lic.maxInstallations,
                activeInstallationsCount: lic._count.installations,
                customerName: lic.customerName,
                customerContact: lic.customerContact,
                adminNotes: lic.adminNotes,
                lastValidatedAt: lic.lastValidatedAt,
                createdAt: lic.createdAt,
                updatedAt: lic.updatedAt,
            };
        });
        return {
            items: formatted,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Get single license details
     */
    static async getLicenseById(id) {
        const license = await prisma.license.findUnique({
            where: { id },
            include: {
                installations: {
                    orderBy: { createdAt: 'desc' },
                },
                paymentRequests: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!license) {
            throw { status: 404, message: 'License not found', code: 'NOT_FOUND' };
        }
        const now = new Date();
        let currentStatus = license.status;
        if (license.status === 'ACTIVE' && license.expiresAt && license.expiresAt < now) {
            currentStatus = 'EXPIRED';
        }
        const activeInstallations = license.installations.filter((i) => i.status === 'ACTIVE');
        return {
            ...license,
            keyHash: undefined, // Never expose key hash to admin UI unnecessarily
            status: currentStatus,
            activeInstallationsCount: activeInstallations.length,
            availableSlots: Math.max(0, license.maxInstallations - activeInstallations.length),
        };
    }
    /**
     * Update license fields (status, limits, notes)
     */
    static async updateLicense(id, input, adminId, ipAddress) {
        const existing = await prisma.license.findUnique({
            where: { id },
            include: {
                installations: { where: { status: 'ACTIVE' } },
            },
        });
        if (!existing) {
            throw { status: 404, message: 'License not found', code: 'NOT_FOUND' };
        }
        // If admin is reducing maxInstallations below current active count, validate
        if (input.maxInstallations !== undefined && input.maxInstallations < existing.installations.length) {
            throw {
                status: 400,
                message: `Cannot reduce limit to ${input.maxInstallations}. Currently ${existing.installations.length} active installation(s) are registered. Please revoke individual installations first.`,
                code: 'LIMIT_BELOW_ACTIVE_COUNT',
            };
        }
        const updated = await prisma.license.update({
            where: { id },
            data: {
                customerName: input.customerName !== undefined ? input.customerName : existing.customerName,
                customerContact: input.customerContact !== undefined ? input.customerContact : existing.customerContact,
                adminNotes: input.adminNotes !== undefined ? input.adminNotes : existing.adminNotes,
                maxInstallations: input.maxInstallations !== undefined ? input.maxInstallations : existing.maxInstallations,
                status: input.status !== undefined ? input.status : existing.status,
                updatedByAdminId: adminId,
            },
        });
        await AuditService.log({
            adminId,
            action: 'LICENSE_UPDATED',
            entityType: 'LICENSE',
            entityId: id,
            details: input,
            ipAddress,
        });
        return updated;
    }
    /**
     * Revoke license immediately
     */
    static async revokeLicense(id, reason, adminId, ipAddress) {
        const license = await prisma.license.findUnique({ where: { id } });
        if (!license) {
            throw { status: 404, message: 'License not found', code: 'NOT_FOUND' };
        }
        const updated = await prisma.$transaction(async (tx) => {
            const lic = await tx.license.update({
                where: { id },
                data: {
                    status: 'REVOKED',
                    updatedByAdminId: adminId,
                },
            });
            // Mark all installations as revoked
            await tx.licenseInstallation.updateMany({
                where: { licenseId: id, status: 'ACTIVE' },
                data: {
                    status: 'REVOKED',
                    revokedAt: new Date(),
                    revokedBy: 'ADMIN',
                },
            });
            return lic;
        });
        await AuditService.log({
            adminId,
            action: 'LICENSE_REVOKED',
            entityType: 'LICENSE',
            entityId: id,
            details: { reason: reason || 'Revoked by admin' },
            ipAddress,
        });
        return updated;
    }
    /**
     * Renew or extend license validity
     */
    static async renewLicense(id, input, adminId, ipAddress) {
        const license = await prisma.license.findUnique({ where: { id } });
        if (!license) {
            throw { status: 404, message: 'License not found', code: 'NOT_FOUND' };
        }
        const now = new Date();
        let baseTime = now;
        // If currently active and expiry is in the future, extend from current expiry
        if (license.expiresAt && license.expiresAt > now) {
            baseTime = license.expiresAt;
        }
        const newExpiresAt = new Date(baseTime.getTime() + input.additionalDays * 24 * 3600 * 1000);
        const updated = await prisma.license.update({
            where: { id },
            data: {
                status: 'ACTIVE',
                expiresAt: newExpiresAt,
                activatedAt: license.activatedAt || now,
                updatedByAdminId: adminId,
                adminNotes: input.adminNote ? `${license.adminNotes || ''}\n[Renewal]: ${input.adminNote}`.trim() : license.adminNotes,
            },
        });
        await AuditService.log({
            adminId,
            action: 'LICENSE_RENEWED',
            entityType: 'LICENSE',
            entityId: id,
            details: {
                additionalDays: input.additionalDays,
                newExpiresAt: newExpiresAt.toISOString(),
                note: input.adminNote,
            },
            ipAddress,
        });
        return updated;
    }
    /**
     * Reissue / rotate key (generates new plaintext key, invalidates old key)
     */
    static async reissueKey(id, adminId, ipAddress) {
        const license = await prisma.license.findUnique({ where: { id } });
        if (!license) {
            throw { status: 404, message: 'License not found', code: 'NOT_FOUND' };
        }
        const newRawKey = generateLicenseKey();
        const newHash = hashLicenseKey(newRawKey);
        const newMasked = maskLicenseKey(newRawKey);
        await prisma.license.update({
            where: { id },
            data: {
                keyHash: newHash,
                keyMasked: newMasked,
                plainKey: newRawKey,
                updatedByAdminId: adminId,
            },
        });
        await AuditService.log({
            adminId,
            action: 'LICENSE_KEY_REISSUED',
            entityType: 'LICENSE',
            entityId: id,
            details: { newMasked },
            ipAddress,
        });
        return {
            id,
            plainLicenseKey: newRawKey,
            keyMasked: newMasked,
        };
    }
    /**
     * Admin dashboard summary statistics
     */
    static async getDashboardStats() {
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
        const [totalLicenses, activeLicenses, pendingLicenses, revokedLicenses, suspendedLicenses, pendingPayments, activeInstallations, expiringSoon,] = await Promise.all([
            prisma.license.count(),
            prisma.license.count({
                where: {
                    status: 'ACTIVE',
                    expiresAt: { gt: now },
                },
            }),
            prisma.license.count({ where: { status: 'PENDING' } }),
            prisma.license.count({ where: { status: 'REVOKED' } }),
            prisma.license.count({ where: { status: 'SUSPENDED' } }),
            prisma.paymentRequest.count({ where: { status: 'PENDING' } }),
            prisma.licenseInstallation.count({ where: { status: 'ACTIVE' } }),
            prisma.license.count({
                where: {
                    status: 'ACTIVE',
                    expiresAt: {
                        gte: now,
                        lte: sevenDaysFromNow,
                    },
                },
            }),
        ]);
        // Count expired licenses (either status EXPIRED or ACTIVE with expiresAt <= now)
        const expiredCount = await prisma.license.count({
            where: {
                OR: [
                    { status: 'EXPIRED' },
                    { status: 'ACTIVE', expiresAt: { lte: now } },
                ],
            },
        });
        return {
            totalLicenses,
            activeLicenses,
            pendingLicenses,
            expiredLicenses: expiredCount,
            revokedLicenses,
            suspendedLicenses,
            pendingPayments,
            activeInstallations,
            licensesExpiringSoon: expiringSoon,
        };
    }
}
