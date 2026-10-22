import { prisma } from '../../config/database.js';
import { CryptoService } from '../../services/crypto.service.js';
import { AuditService } from '../../services/audit.service.js';
import { ENV } from '../../config/env.js';
import { AdminLoginInput, AdminChangePasswordInput } from './adminAuth.schema.js';

export class AdminAuthService {
  public static async login(input: AdminLoginInput, ipAddress?: string) {
    const identifier = input.identifier.trim().toLowerCase();

    const admin = await prisma.admin.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { username: { equals: identifier, mode: 'insensitive' } },
        ],
      },
    });

    if (!admin) {
      throw { status: 401, message: 'Invalid username/email or password', code: 'INVALID_CREDENTIALS' };
    }

    if (!admin.isActive) {
      throw { status: 403, message: 'Admin account has been suspended', code: 'ACCOUNT_SUSPENDED' };
    }

    const isMatch = await CryptoService.verifyPassword(input.password, admin.passwordHash);
    if (!isMatch) {
      throw { status: 401, message: 'Invalid username/email or password', code: 'INVALID_CREDENTIALS' };
    }

    // Generate JWT token
    const token = CryptoService.generateAdminToken({
      adminId: admin.id,
      email: admin.email,
      username: admin.username,
      role: admin.role,
    });

    // Create session record
    const { tokenHash } = CryptoService.generateSessionToken();
    const expiresAt = new Date(Date.now() + ENV.ADMIN_SESSION_TTL_HOURS * 3600 * 1000);

    await prisma.adminSession.create({
      data: {
        adminId: admin.id,
        tokenHash,
        expiresAt,
        ipAddress: ipAddress || null,
      },
    });

    // Audit log
    await AuditService.log({
      adminId: admin.id,
      action: 'ADMIN_LOGIN',
      entityType: 'ADMIN',
      entityId: admin.id,
      details: { username: admin.username, email: admin.email },
      ipAddress,
    });

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      admin: {
        id: admin.id,
        email: admin.email,
        username: admin.username,
        role: admin.role,
      },
    };
  }

  public static async logout(adminId: string, ipAddress?: string) {
    await prisma.adminSession.deleteMany({
      where: { adminId },
    });

    await AuditService.log({
      adminId,
      action: 'ADMIN_LOGOUT',
      entityType: 'ADMIN',
      entityId: adminId,
      ipAddress,
    });

    return { message: 'Logged out successfully' };
  }

  public static async getProfile(adminId: string) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!admin) {
      throw { status: 404, message: 'Admin not found', code: 'NOT_FOUND' };
    }

    return admin;
  }

  public static async changePassword(adminId: string, input: AdminChangePasswordInput, ipAddress?: string) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw { status: 404, message: 'Admin not found', code: 'NOT_FOUND' };
    }

    const isMatch = await CryptoService.verifyPassword(input.currentPassword, admin.passwordHash);
    if (!isMatch) {
      throw { status: 400, message: 'Current password is incorrect', code: 'INVALID_CURRENT_PASSWORD' };
    }

    const newHash = await CryptoService.hashPassword(input.newPassword);
    await prisma.admin.update({
      where: { id: adminId },
      data: { passwordHash: newHash },
    });

    // Invalidate existing sessions
    await prisma.adminSession.deleteMany({
      where: { adminId },
    });

    await AuditService.log({
      adminId,
      action: 'ADMIN_PASSWORD_CHANGED',
      entityType: 'ADMIN',
      entityId: adminId,
      ipAddress,
    });

    return { message: 'Password updated successfully' };
  }
}
