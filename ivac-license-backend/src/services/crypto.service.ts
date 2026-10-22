import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

export interface AdminJwtPayload {
  adminId: string;
  email: string;
  username: string;
  role: string;
}

export class CryptoService {
  private static readonly BCRYPT_SALT_ROUNDS = 12;

  /**
   * Hashes a password securely with bcrypt
   */
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.BCRYPT_SALT_ROUNDS);
  }

  /**
   * Verifies a plain password against a bcrypt hash
   */
  public static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generates a cryptographically secure random session token
   */
  public static generateSessionToken(): { rawToken: string; tokenHash: string } {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    return { rawToken, tokenHash };
  }

  /**
   * Hashes an incoming session token for database lookup
   */
  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a signed Admin JWT
   */
  public static generateAdminToken(payload: AdminJwtPayload): string {
    return jwt.sign(payload, ENV.ADMIN_JWT_SECRET, {
      expiresIn: `${ENV.ADMIN_SESSION_TTL_HOURS}h`,
    });
  }

  /**
   * Verifies an Admin JWT
   */
  public static verifyAdminToken(token: string): AdminJwtPayload | null {
    try {
      return jwt.verify(token, ENV.ADMIN_JWT_SECRET) as AdminJwtPayload;
    } catch {
      return null;
    }
  }

  /**
   * Generates an entitlement signature for tamper-evident client responses
   */
  public static generateEntitlementSignature(data: Record<string, any>): string {
    const serialized = JSON.stringify(data);
    return crypto.createHmac('sha256', ENV.ADMIN_JWT_SECRET).update(serialized).digest('hex');
  }
}
