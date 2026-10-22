export interface AdminJwtPayload {
    adminId: string;
    email: string;
    username: string;
    role: string;
}
export declare class CryptoService {
    private static readonly BCRYPT_SALT_ROUNDS;
    /**
     * Hashes a password securely with bcrypt
     */
    static hashPassword(password: string): Promise<string>;
    /**
     * Verifies a plain password against a bcrypt hash
     */
    static verifyPassword(password: string, hash: string): Promise<boolean>;
    /**
     * Generates a cryptographically secure random session token
     */
    static generateSessionToken(): {
        rawToken: string;
        tokenHash: string;
    };
    /**
     * Hashes an incoming session token for database lookup
     */
    static hashToken(token: string): string;
    /**
     * Generates a signed Admin JWT
     */
    static generateAdminToken(payload: AdminJwtPayload): string;
    /**
     * Verifies an Admin JWT
     */
    static verifyAdminToken(token: string): AdminJwtPayload | null;
    /**
     * Generates an entitlement signature for tamper-evident client responses
     */
    static generateEntitlementSignature(data: Record<string, any>): string;
}
