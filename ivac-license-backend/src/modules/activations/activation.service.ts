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

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch license
      const license = await tx.license.findUnique({
        where: { keyHash },
        include: {
          installations: true,
        },
      });

      if (!license) {
        throw { status: 404, message: 'Invalid license key. Please check and try again.', code: 'INVALID_LICENSE_KEY' };
      }

      // 2. Validate current status
      if (license.status === 'REVOKED') {
        throw { status: 403, message: 'This license has been revoked by administration.', code: 'LICENSE_REVOKED' };
      }
      if (license.status === 'SUSPENDED') {
        throw { status: 403, message: 'This license has been temporarily suspended.', code: 'LICENSE_SUSPENDED' };
      }

      // Check if previously expired
      if (license.expiresAt && license.expiresAt < now) {
        throw {
          status: 403,
          message: `This license expired on ${license.expiresAt.toISOString()}. Please renew your subscription.`,
          code: 'LICENSE_EXPIRED',
        };
      }

      // 3. Handle activation timestamp establishment
      let updatedLicense = license;
      if (!license.activatedAt) {
        // First activation: establish activation and expiry
        const expiresAt = new Date(now.getTime() + license.validityDays * 24 * 3600 * 1000);
        updatedLicense = await tx.license.update({
          where: { id: license.id },
          data: {
            status: 'ACTIVE',
            activatedAt: now,
            expiresAt,
            lastValidatedAt: now,
          },
          include: {
            installations: true,
          },
        });
      } else {
        // Subsequent activation - update lastValidatedAt only
        updatedLicense = await tx.license.update({
          where: { id: license.id },
          data: { lastValidatedAt: now },
          include: {
            installations: true,
          },
        });
      }

      // 4. Check installation limit and register installation atomically
      const allInstallations = (updatedLicense.installations && Array.isArray(updatedLicense.installations))
        ? updatedLicense.installations
        : await tx.licenseInstallation.findMany({ where: { licenseId: updatedLicense.id } });

      const activeInstallations = allInstallations.filter((i: any) => i.status === 'ACTIVE');
      const existingInstallation = allInstallations.find(
        (i: any) => i.installationId === input.installationId
      );

      if (existingInstallation) {
        if (existingInstallation.status === 'ACTIVE') {
          // Already active installation, update last seen
          await tx.licenseInstallation.update({
            where: { id: existingInstallation.id },
            data: {
              lastSeenAt: now,
              installationLabel: input.installationLabel || existingInstallation.installationLabel,
            },
          });
        } else {
          // Was previously revoked, reactivating requires slot
          if (activeInstallations.length >= updatedLicense.maxInstallations) {
            throw {
              status: 409,
              message: `Maximum browser installation limit reached (${activeInstallations.length}/${updatedLicense.maxInstallations}). Please release another browser first.`,
              code: 'INSTALLATION_LIMIT_REACHED',
            };
          }
          await tx.licenseInstallation.update({
            where: { id: existingInstallation.id },
            data: {
              status: 'ACTIVE',
              revokedAt: null,
              revokedBy: null,
              lastSeenAt: now,
              installationLabel: input.installationLabel || existingInstallation.installationLabel,
            },
          });
          activeInstallations.push(existingInstallation);
        }
      } else {
        // New installation
        if (activeInstallations.length >= updatedLicense.maxInstallations) {
          throw {
            status: 409,
            message: `Maximum browser installation limit reached (${activeInstallations.length}/${updatedLicense.maxInstallations}). Please release another browser first.`,
            code: 'INSTALLATION_LIMIT_REACHED',
          };
        }

        const newInstallation = await tx.licenseInstallation.create({
          data: {
            licenseId: updatedLicense.id,
            installationId: input.installationId,
            installationLabel: input.installationLabel || null,
            firstActivatedAt: now,
            lastSeenAt: now,
            status: 'ACTIVE',
          },
        });
        activeInstallations.push(newInstallation);
      }

      return this.formatEntitlement(updatedLicense, input.installationId, activeInstallations.length);
    });
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

    return await prisma.$transaction(async (tx) => {
      const license = await tx.license.findUnique({
        where: { keyHash },
        include: { installations: true },
      });

      if (!license) {
        throw { status: 404, message: 'Invalid license key provided.', code: 'INVALID_LICENSE_KEY' };
      }

      const installation = license.installations.find(
        (i) => i.installationId === input.installationId
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

      await AuditService.log({
        action: 'INSTALLATION_RELEASED_BY_USER',
        entityType: 'INSTALLATION',
        entityId: installation.id,
        details: { licenseId: license.id, installationId: input.installationId },
        ipAddress,
      });

      const remainingActive = license.installations.filter(
        (i) => i.status === 'ACTIVE' && i.id !== installation.id
      ).length;

      return {
        success: true,
        message: 'Browser installation released successfully. A license slot is now freed.',
        activeInstallationsCount: remainingActive,
        availableSlots: Math.max(0, license.maxInstallations - remainingActive),
      };
    });
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
