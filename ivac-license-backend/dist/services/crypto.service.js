import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
export class CryptoService {
    static BCRYPT_SALT_ROUNDS = 12;
    /**
     * Hashes a password securely with bcrypt
     */
    static async hashPassword(password) {
        return bcrypt.hash(password, this.BCRYPT_SALT_ROUNDS);
    }
    /**
     * Verifies a plain password against a bcrypt hash
     */
    static async verifyPassword(password, hash) {
        return bcrypt.compare(password, hash);
    }
    /**
     * Generates a cryptographically secure random session token
     */
    static generateSessionToken() {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        return { rawToken, tokenHash };
    }
    /**
     * Hashes an incoming session token for database lookup
     */
    static hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
    /**
     * Generates a signed Admin JWT
     */
    static generateAdminToken(payload) {
        return jwt.sign(payload, ENV.ADMIN_JWT_SECRET, {
            expiresIn: `${ENV.ADMIN_SESSION_TTL_HOURS}h`,
        });
    }
    /**
     * Verifies an Admin JWT
     */
    static verifyAdminToken(token) {
        try {
            return jwt.verify(token, ENV.ADMIN_JWT_SECRET);
        }
        catch {
            return null;
        }
    }
    /**
     * Generates an entitlement signature for tamper-evident client responses
     */
    static generateEntitlementSignature(data) {
        const serialized = JSON.stringify(data);
        return crypto.createHmac('sha256', ENV.ADMIN_JWT_SECRET).update(serialized).digest('hex');
    }
}
