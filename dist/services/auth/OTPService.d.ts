export declare class OTPService {
    /**
     * Generate a secure 6-digit OTP
     */
    generateOTP(): string;
    /**
     * Generate OTP with checksum for extra security
     */
    generateSecureOTP(): {
        otp: string;
        checksum: string;
    };
    /**
     * Verify OTP with checksum
     */
    verifySecureOTP(otp: string, checksum: string, providedOTP: string): boolean;
    /**
     * Generate time-based OTP (TOTP-like, for future implementation)
     */
    generateTOTP(secret: string, timeWindow?: number): string;
    /**
     * Generate OTP expiration timestamp
     */
    generateExpirationTime(minutes?: number): Date;
    /**
     * Check if OTP is expired
     */
    isExpired(expirationTime: Date): boolean;
    /**
     * Get remaining time for OTP in seconds
     */
    getRemainingTime(expirationTime: Date): number;
    /**
     * Format remaining time as human-readable string
     */
    formatRemainingTime(expirationTime: Date): string;
    private constantTimeCompare;
    private generateChecksum;
    /**
     * Sanitize OTP input (remove spaces, convert to uppercase for alphanumeric)
     */
    sanitizeOTPInput(input: string): string;
    /**
     * Generate backup codes (for account recovery)
     */
    generateBackupCodes(count?: number): string[];
    /**
     * Hash backup code for storage
     */
    hashBackupCode(code: string): string;
    /**
     * Verify backup code
     */
    verifyBackupCode(hashedCode: string, providedCode: string): boolean;
}
//# sourceMappingURL=OTPService.d.ts.map