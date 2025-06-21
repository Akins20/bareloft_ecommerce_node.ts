/**
 * Password hashing utilities using bcrypt
 */
export declare class PasswordHasher {
    private static readonly SALT_ROUNDS;
    private static readonly MIN_PASSWORD_LENGTH;
    private static readonly MAX_PASSWORD_LENGTH;
    /**
     * Hash a password using bcrypt
     */
    static hashPassword(password: string): Promise<string>;
    /**
     * Verify a password against its hash
     */
    static verifyPassword(password: string, hash: string): Promise<boolean>;
    /**
     * Validate password strength
     */
    static validatePassword(password: string): void;
    /**
     * Generate a random password
     */
    static generateRandomPassword(length?: number): string;
    /**
     * Check if password has been compromised (basic implementation)
     */
    static isPasswordCompromised(password: string): Promise<boolean>;
    /**
     * Generate password reset token
     */
    static generateResetToken(): string;
    /**
     * Hash sensitive data (for storage)
     */
    static hashSensitiveData(data: string): string;
    /**
     * Compare sensitive data hash
     */
    static compareSensitiveData(data: string, hash: string): boolean;
}
/**
 * Data encryption utilities for sensitive information
 */
export declare class DataEncryption {
    private static readonly ALGORITHM;
    private static readonly KEY_LENGTH;
    private static readonly IV_LENGTH;
    private static readonly TAG_LENGTH;
    /**
     * Generate encryption key from password
     */
    private static deriveKey;
    /**
     * Encrypt sensitive data
     */
    static encrypt(text: string, password: string): string;
    /**
     * Decrypt sensitive data
     */
    static decrypt(encryptedData: string, password: string): string;
    /**
     * Generate secure random string
     */
    static generateSecureRandom(length?: number): string;
}
declare const _default: {
    PasswordHasher: typeof PasswordHasher;
    DataEncryption: typeof DataEncryption;
};
export default _default;
//# sourceMappingURL=hashing.d.ts.map