import { prisma } from '../../config/database.js';
import { hashLicenseKey, normalizeLicenseKey } from '../../utils/keyGenerator.js';
import { CryptoService } from '../../services/crypto.service.js';
import { AuditService } from '../../services/audit.service.js';
import {
  ActivateLicenseInput,
  ValidateLicenseInput,
  HeartbeatInput,
  ReleaseInstallationInput,
} from './activation.schema.js';

export class ActivationService {
  /**
   * Helper to format client entitlement response
   */
  private static formatEntitlement(
    license: any,
    installationId: string,
    activeInstallationsCount: number
  ) {
    const now = new Date();
    const expiresAtDate = license.expiresAt ? new Date(license.expiresAt) : null;
    const isExpired = expiresAtDate ? expiresAtDate < now : false;

    let computedStatus = license.status;
    if (license.status === 'ACTIVE' && isExpired) {
      computedStatus = 'EXPIRED';
    }

    const msRemaining = expiresAtDate ? Math.max(0, expiresAtDate.getTime() - now.getTime()) : 0;
    const daysRemaining = Math.ceil(msRemaining / (24 * 3600 * 1000));

    const entitlementData = {
      licenseId: license.id,
      status: computedStatus,
      activatedAt: license.activatedAt ? new Date(license.activatedAt).toISOString() : null,
      expiresAt: expiresAtDate ? expiresAtDate.toISOString() : null,
      daysRemaining,
      maxInstallations: license.maxInstallations,
      activeInstallationsCount,
      availableSlots: Math.max(0, license.maxInstallations - activeInstallationsCount),
      installationId,
      serverTime: now.toISOString(),
    };

    const signature = CryptoService.generateEntitlementSignature(entitlementData);

    return {
      ...entitlementData,
      signature,
    };
  }

  /**
   * Activates a license on a browser installation
   */
  public static async activateLicense(input: ActivateLicenseInput, ipAddress?: string) {
    const normalizedKey = normalizeLicenseKey(input.licenseKey);
    const keyHash = hashLicenseKey(normalizedKey);
    const now = new Date();

    // 1. Independent read-only pre-check: Reject invalid, revoked, suspended, or expired licenses immediately
    // without acquiring or holding a database transaction lock.
    const preliminaryLicense = await prisma.license.findUnique({
      where: { keyHash },
      select: {
        id: true,
        status: true,
        expiresAt: true,
      },
    });

    if (!preliminaryLicense) {
      throw { status: 404, message: 'Invalid license key. Please check and try again.', code: 'INVALID_LICENSE_KEY' };
    }
    if (preliminaryLicense.status === 'REVOKED') {
      throw { status: 403, message: 'This license has been revoked by administration.', code: 'LICENSE_REVOKED' };
    }
    if (preliminaryLicense.status === 'SUSPENDED') {
      throw { status: 403, message: 'This license has been temporarily suspended.', code: 'LICENSE_SUSPENDED' };
    }
    if (preliminaryLicense.expiresAt && preliminaryLicense.expiresAt < now) {
      throw {
        status: 403,
        message: `This license expired on ${preliminaryLicense.expiresAt.toISOString()}. Please renew your subscription.`,
        code: 'LICENSE_EXPIRED',
      };
    }

    // 2. Execute minimal atomic operations inside an interactive transaction with 10s timeout
    let txResult: {
      updatedLicense: any;
      finalActiveCount: number;
      auditAction: any | null;
    };

    try {
      txResult = await prisma.$transaction(
        async (tx) => {
          // Re-fetch latest license state inside transaction
          const license = await tx.license.findUnique({
            where: { id: preliminaryLicense.id },
            select: {
              id: true,
              status: true,
              validityDays: true,
              activatedAt: true,
              expiresAt: true,
              maxInstallations: true,
            },
          });

          if (!license) {
            throw { status: 404, message: 'Invalid license key. Please check and try again.', code: 'INVALID_LICENSE_KEY' };
          }
          if (license.status === 'REVOKED') {
            throw { status: 403, message: 'This license has been revoked by administration.', code: 'LICENSE_REVOKED' };
          }
          if (license.status === 'SUSPENDED') {
            throw { status: 403, message: 'This license has been temporarily suspended.', code: 'LICENSE_SUSPENDED' };
          }
          if (license.expiresAt && license.expiresAt < now) {
            throw {
              status: 403,
              message: `This license expired on ${license.expiresAt.toISOString()}. Please renew your subscription.`,
              code: 'LICENSE_EXPIRED',
            };
          }

          // Concurrently fetch existing global installation & active installations for this license
          const [existingGlobalInstallation, activeInstallationsForLicense] = await Promise.all([
            tx.licenseInstallation.findUnique({
              where: { installationId: input.installationId },
            }),
            tx.licenseInstallation.findMany({
              where: { licenseId: license.id, status: 'ACTIVE' },
              select: { id: true },
            }),
          ]);

          let finalActiveCount = activeInstallationsForLicense.length;
          let auditAction: any = null;

          if (existingGlobalInstallation) {
            if (existingGlobalInstallation.licenseId !== license.id) {
              // Check if this installation is actively registered under another valid license
              const previousLicense = await tx.license.findUnique({
                where: { id: existingGlobalInstallation.licenseId },
                select: { status: true, expiresAt: true },
              });

              const isPreviouslyActive =
                existingGlobalInstallation.status === 'ACTIVE' &&
                previousLicense &&
                previousLicense.status === 'ACTIVE' &&
                (!previousLicense.expiresAt || previousLicense.expiresAt > now);

              if (isPreviouslyActive) {
                throw {
                  status: 409,
                  message: 'This browser installation is currently active under another license. Please release it from the original license first before activating a new key.',
                  code: 'INSTALLATION_ALREADY_REGISTERED',
                };
              }

              // Installation was released or previous license expired -> transfer to this license
              if (activeInstallationsForLicense.length >= license.maxInstallations) {
                throw {
                  status: 409,
                  message: `Maximum browser installation limit reached (${activeInstallationsForLicense.length}/${license.maxInstallations}). Please release another browser first.`,
                  code: 'INSTALLATION_LIMIT_REACHED',
                };
              }

              await tx.licenseInstallation.update({
                where: { id: existingGlobalInstallation.id },
                data: {
                  licenseId: license.id,
                  status: 'ACTIVE',
                  revokedAt: null,
                  revokedBy: null,
                  lastSeenAt: now,
                  installationLabel: input.installationLabel || existingGlobalInstallation.installationLabel,
                },
              });
              finalActiveCount = activeInstallationsForLicense.length + 1;

              auditAction = {
                action: 'INSTALLATION_TRANSFERRED',
                entityType: 'INSTALLATION',
                entityId: existingGlobalInstallation.id,
                details: {
                  fromLicenseId: existingGlobalInstallation.licenseId,
                  toLicenseId: license.id,
                  installationId: input.installationId,
                  previousStatus: existingGlobalInstallation.status,
                },
              };
            } else if (existingGlobalInstallation.status === 'ACTIVE') {
              // Belongs to this license and is already active -> update lastSeenAt
              await tx.licenseInstallation.update({
                where: { id: existingGlobalInstallation.id },
                data: {
                  lastSeenAt: now,
                  installationLabel: input.installationLabel || existingGlobalInstallation.installationLabel,
                },
              });
              finalActiveCount = activeInstallationsForLicense.length;
            } else {
              // Belongs to this license and was previously REVOKED -> reactivating requires an available slot
              if (activeInstallationsForLicense.length >= license.maxInstallations) {
                throw {
                  status: 409,
                  message: `Maximum browser installation limit reached (${activeInstallationsForLicense.length}/${license.maxInstallations}). Please release another browser first.`,
                  code: 'INSTALLATION_LIMIT_REACHED',
                };
              }

              await tx.licenseInstallation.update({
                where: { id: existingGlobalInstallation.id },
                data: {
                  status: 'ACTIVE',
                  revokedAt: null,
                  revokedBy: null,
                  lastSeenAt: now,
                  installationLabel: input.installationLabel || existingGlobalInstallation.installationLabel,
                },
              });
              finalActiveCount = activeInstallationsForLicense.length + 1;
            }
          } else {
            // Brand new installation ID
            if (activeInstallationsForLicense.length >= license.maxInstallations) {
              throw {
                status: 409,
                message: `Maximum browser installation limit reached (${activeInstallationsForLicense.length}/${license.maxInstallations}). Please release another browser first.`,
                code: 'INSTALLATION_LIMIT_REACHED',
              };
            }

            try {
              await tx.licenseInstallation.create({
                data: {
                  licenseId: license.id,
                  installationId: input.installationId,
                  installationLabel: input.installationLabel || null,
                  firstActivatedAt: now,
                  lastSeenAt: now,
                  status: 'ACTIVE',
                },
              });
              finalActiveCount = activeInstallationsForLicense.length + 1;
            } catch (createErr: any) {
              // Concurrency safety fallback: Handle race condition where another concurrent request registered this installationId
              if (createErr.code === 'P2002' || createErr.message?.includes('Unique constraint failed')) {
                const conflictInst = await tx.licenseInstallation.findUnique({
                  where: { installationId: input.installationId },
                });
                if (conflictInst && conflictInst.licenseId === license.id) {
                  finalActiveCount = activeInstallationsForLicense.length + 1;
                } else if (conflictInst && conflictInst.licenseId !== license.id) {
                  const previousLic = await tx.license.findUnique({
                    where: { id: conflictInst.licenseId },
                    select: { status: true, expiresAt: true },
                  });
                  const isConflictActive =
                    conflictInst.status === 'ACTIVE' &&
                    previousLic &&
                    previousLic.status === 'ACTIVE' &&
                    (!previousLic.expiresAt || previousLic.expiresAt > now);

                  if (isConflictActive) {
                    throw {
                      status: 409,
                      message: 'This browser installation is currently active under another license. Please release it from the original license first before activating a new key.',
                      code: 'INSTALLATION_ALREADY_REGISTERED',
                    };
                  }

                  await tx.licenseInstallation.update({
                    where: { id: conflictInst.id },
                    data: {
                      licenseId: license.id,
                      status: 'ACTIVE',
                      revokedAt: null,
                      revokedBy: null,
                      lastSeenAt: now,
                      installationLabel: input.installationLabel || conflictInst.installationLabel,
                    },
                  });
                  finalActiveCount = activeInstallationsForLicense.length + 1;
                } else {
                  throw {
                    status: 409,
                    message: 'Installation conflict detected. Please retry.',
                    code: 'INSTALLATION_CONFLICT',
                  };
                }
              } else {
                throw createErr;
              }
            }
          }

          // Single license update at completion of registration
          let updatedLicense: any;
          if (!license.activatedAt) {
            const expiresAt = new Date(now.getTime() + license.validityDays * 24 * 3600 * 1000);
            updatedLicense = await tx.license.update({
              where: { id: license.id },
              data: {
                status: 'ACTIVE',
                activatedAt: now,
                expiresAt,
                lastValidatedAt: now,
              },
            });
          } else {
            updatedLicense = await tx.license.update({
              where: { id: license.id },
              data: { lastValidatedAt: now },
            });
          }

          return {
            updatedLicense,
            finalActiveCount,
            auditAction,
          };
        },
        {
          maxWait: 5000,
          timeout: 10000,
        }
      );
    } catch (txErr: any) {
      if (
        txErr.code === 'P2028' ||
        txErr.message?.includes('expired transaction') ||
        txErr.message?.includes('Transaction timed out')
      ) {
        throw {
          status: 503,
          message: 'Activation request timed out under high load. Please retry in a few moments.',
          code: 'TRANSACTION_TIMEOUT',
        };
      }
      throw txErr;
    }

    // Post-transaction: non-blocking audit logging outside transaction
    if (txResult.auditAction) {
      AuditService.log({
        ...txResult.auditAction,
        ipAddress,
      }).catch((err) => console.error('[AuditService] Non-blocking audit error:', err));
    }

    return this.formatEntitlement(
      txResult.updatedLicense,
      input.installationId,
      txResult.finalActiveCount
    );
  }

  /**
   * Validates an existing license and installation
   */
  public static async validateLicense(input: ValidateLicenseInput, ipAddress?: string) {
    const now = new Date();
    let license: any;

    if (input.licenseKey) {
      const keyHash = hashLicenseKey(normalizeLicenseKey(input.licenseKey));
      license = await prisma.license.findUnique({
        where: { keyHash },
        include: { installations: true },
      });
    } else if (input.licenseId) {
      license = await prisma.license.findUnique({
        where: { id: input.licenseId },
        include: { installations: true },
      });
    }

    if (!license) {
      throw { status: 404, message: 'License record not found.', code: 'INVALID_LICENSE' };
    }

    if (license.status === 'REVOKED') {
      throw { status: 403, message: 'This license has been revoked by administration.', code: 'LICENSE_REVOKED' };
    }
    if (license.status === 'SUSPENDED') {
      throw { status: 403, message: 'This license is temporarily suspended.', code: 'LICENSE_SUSPENDED' };
    }
    if (license.expiresAt && license.expiresAt < now) {
      throw {
        status: 403,
        message: `Subscription expired on ${license.expiresAt.toISOString()}.`,
        code: 'LICENSE_EXPIRED',
        expiresAt: license.expiresAt.toISOString(),
      };
    }

    // Verify installation status
    const installation = license.installations.find((i: any) => i.installationId === input.installationId);
    if (!installation || installation.status !== 'ACTIVE') {
      throw {
        status: 403,
        message: 'This browser installation has been revoked or is not registered with this license.',
        code: 'INSTALLATION_REVOKED',
      };
    }

    // Update last validated and last seen timestamps
    await Promise.all([
      prisma.license.update({
        where: { id: license.id },
        data: { lastValidatedAt: now },
      }),
      prisma.licenseInstallation.update({
        where: { id: installation.id },
        data: { lastSeenAt: now },
      }),
    ]);

    const activeInstallations = license.installations.filter((i: any) => i.status === 'ACTIVE');
    return this.formatEntitlement(license, input.installationId, activeInstallations.length);
  }

  /**
   * Lightweight periodic heartbeat
   */
  public static async heartbeat(input: HeartbeatInput) {
    const now = new Date();
    const installation = await prisma.licenseInstallation.findUnique({
      where: { installationId: input.installationId },
      include: { license: true },
    });

    if (!installation || installation.licenseId !== input.licenseId) {
      throw { status: 404, message: 'Installation record not found.', code: 'INSTALLATION_NOT_FOUND' };
    }

    if (installation.status !== 'ACTIVE') {
      throw { status: 403, message: 'Installation is no longer active.', code: 'INSTALLATION_REVOKED' };
    }

    if (installation.license.status !== 'ACTIVE') {
      throw { status: 403, message: `License is ${installation.license.status}.`, code: `LICENSE_${installation.license.status}` };
    }

    if (installation.license.expiresAt && installation.license.expiresAt < now) {
      throw { status: 403, message: 'License has expired.', code: 'LICENSE_EXPIRED' };
    }

    await prisma.licenseInstallation.update({
      where: { id: installation.id },
      data: { lastSeenAt: now },
    });

    return {
      status: 'OK',
      timestamp: now.toISOString(),
    };
  }

  /**
   * Releases an installation slot from the extension
   */
  public static async releaseInstallation(input: ReleaseInstallationInput, ipAddress?: string) {
    const keyHash = hashLicenseKey(normalizeLicenseKey(input.licenseKey));
    const now = new Date();

    let releaseAudit: any = null;
    let txResult: any;

    try {
      txResult = await prisma.$transaction(
        async (tx) => {
          const license = await tx.license.findUnique({
            where: { keyHash },
            select: {
              id: true,
              maxInstallations: true,
              installations: {
                select: { id: true, installationId: true, status: true },
              },
            },
          });

          if (!license) {
            throw { status: 404, message: 'Invalid license key provided.', code: 'INVALID_LICENSE_KEY' };
          }

          const installation = license.installations.find(
            (i: any) => i.installationId === input.installationId
          );

          if (!installation) {
            throw { status: 404, message: 'Installation not found under this license.', code: 'INSTALLATION_NOT_FOUND' };
          }

          if (installation.status === 'REVOKED') {
            return { message: 'Installation was already released.' };
          }

          // Mark installation as revoked
          await tx.licenseInstallation.update({
            where: { id: installation.id },
            data: {
              status: 'REVOKED',
              revokedAt: now,
              revokedBy: 'USER',
            },
          });

          releaseAudit = {
            action: 'INSTALLATION_RELEASED_BY_USER',
            entityType: 'INSTALLATION',
            entityId: installation.id,
            details: { licenseId: license.id, installationId: input.installationId },
          };

          const remainingActive = license.installations.filter(
            (i: any) => i.status === 'ACTIVE' && i.id !== installation.id
          ).length;

          return {
            success: true,
            message: 'Browser installation released successfully. A license slot is now freed.',
            activeInstallationsCount: remainingActive,
            availableSlots: Math.max(0, license.maxInstallations - remainingActive),
          };
        },
        {
          maxWait: 5000,
          timeout: 10000,
        }
      );
    } catch (txErr: any) {
      if (
        txErr.code === 'P2028' ||
        txErr.message?.includes('expired transaction') ||
        txErr.message?.includes('Transaction timed out')
      ) {
        throw {
          status: 503,
          message: 'Release request timed out under high load. Please retry in a few moments.',
          code: 'TRANSACTION_TIMEOUT',
        };
      }
      throw txErr;
    }

    if (releaseAudit) {
      AuditService.log({
        ...releaseAudit,
        ipAddress,
      }).catch((err) => console.error('[AuditService] Non-blocking audit error:', err));
    }

    return txResult;
  }

  /**
   * Admin revokes a specific installation
   */
  public static async revokeInstallationByAdmin(installationId: string, adminId: string, ipAddress?: string) {
    const installation = await prisma.licenseInstallation.findUnique({
      where: { id: installationId },
      include: { license: true },
    });

    if (!installation) {
      throw { status: 404, message: 'Installation not found', code: 'NOT_FOUND' };
    }

    const updated = await prisma.licenseInstallation.update({
      where: { id: installationId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedBy: 'ADMIN',
      },
    });

    await AuditService.log({
      adminId,
      action: 'INSTALLATION_REVOKED_BY_ADMIN',
      entityType: 'INSTALLATION',
      entityId: installationId,
      details: {
        licenseId: installation.licenseId,
        installationUid: installation.installationId,
      },
      ipAddress,
    });

    return updated;
  }

  /**
   * Extension gets details about its own license
   */
  public static async getLicenseByInstallation(installationId: string) {
    const installation = await prisma.licenseInstallation.findUnique({
      where: { installationId },
      include: {
        license: {
          include: {
            installations: {
              where: { status: 'ACTIVE' },
              select: {
                id: true,
                installationId: true,
                installationLabel: true,
                firstActivatedAt: true,
                lastSeenAt: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!installation) {
      throw { status: 404, message: 'No registered installation found.', code: 'NOT_FOUND' };
    }

    const lic = installation.license;
    return {
      licenseId: lic.id,
      status: lic.status,
      validityDays: lic.validityDays,
      activatedAt: lic.activatedAt,
      expiresAt: lic.expiresAt,
      maxInstallations: lic.maxInstallations,
      activeInstallationsCount: lic.installations.length,
      availableSlots: Math.max(0, lic.maxInstallations - lic.installations.length),
      installations: lic.installations,
    };
  }
}
