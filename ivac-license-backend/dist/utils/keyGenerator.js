import crypto from 'crypto';
/**
 * Generates a cryptographically strong unpredictable license key
 * Format: IVAC-XXXX-XXXX-XXXX-XXXX (24 characters, uppercase alphanumeric)
 */
export function generateLicenseKey(prefix = 'IVAC') {
    // Generate 16 bytes of high-entropy randomness for 4 chunks of 4 chars
    const randomBytes = crypto.randomBytes(16);
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // base32 without easily confused characters
    let result = '';
    for (let i = 0; i < randomBytes.length; i++) {
        result += chars[randomBytes[i] % chars.length];
    }
    // Split into 4 chunks of 4 characters: XXXX-XXXX-XXXX-XXXX
    const chunks = [
        result.slice(0, 4),
        result.slice(4, 8),
        result.slice(8, 12),
        result.slice(12, 16),
    ];
    return `${prefix}-${chunks.join('-')}`;
}
/**
 * Computes SHA-256 hash of a license key
 */
export function hashLicenseKey(key) {
    const normalizedKey = key.trim().toUpperCase();
    return crypto.createHash('sha256').update(normalizedKey).digest('hex');
}
/**
 * Masks a license key for safe display in lists and admin logs
 * Example: "IVAC-A7B8-9K2M-PX3R-7T9W" -> "IVAC-A7B8-****-****-7T9W"
 */
export function maskLicenseKey(key) {
    const parts = key.trim().split('-');
    if (parts.length < 5) {
        return 'IVAC-****-****-****';
    }
    return `${parts[0]}-${parts[1]}-****-****-${parts[parts.length - 1]}`;
}
/**
 * Normalizes user input license key
 */
export function normalizeLicenseKey(key) {
    return key.trim().toUpperCase().replace(/\s+/g, '');
}
