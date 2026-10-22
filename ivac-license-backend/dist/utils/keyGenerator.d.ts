/**
 * Generates a cryptographically strong unpredictable license key
 * Format: IVAC-XXXX-XXXX-XXXX-XXXX (24 characters, uppercase alphanumeric)
 */
export declare function generateLicenseKey(prefix?: string): string;
/**
 * Computes SHA-256 hash of a license key
 */
export declare function hashLicenseKey(key: string): string;
/**
 * Masks a license key for safe display in lists and admin logs
 * Example: "IVAC-A7B8-9K2M-PX3R-7T9W" -> "IVAC-A7B8-****-****-7T9W"
 */
export declare function maskLicenseKey(key: string): string;
/**
 * Normalizes user input license key
 */
export declare function normalizeLicenseKey(key: string): string;
