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
    /**
     * Verify OTP - simple string comparison
     */
    verifyOTPCode(storedOTP: string, providedOTP: string): Promise<boolean>;
    /**
     * Check rate limiting for OTP requests
     */
    checkRateLimit(identifier: string): Promise<boolean>;
    /**
     * Generate OTP and send it
     */
    generateAndSendOTP(phoneNumber: string, purpose: string): Promise<{
        success: boolean;
        message: string;
        expiresIn: number;
        canResendIn: number;
    }>;
    /**
     * Verify OTP with three parameters (for controller compatibility)
     */
    verifyOTP(phoneNumber: string, code: string, purpose: string): Promise<{
        success: boolean;
        message?: string;
        userId?: string;
        token?: string;
    }>;
    /**
     * Generate alphanumeric OTP
     */
    private generateAlphanumericOTP;
    /**
     * Check if user can resend OTP
     */
    canResendOTP(phoneNumber: string): Promise<{
        allowed: boolean;
        message?: string;
    }>;
    /**
     * Resend OTP
     */
    resendOTP(phoneNumber: string, purpose: string): Promise<{
        success: boolean;
        message: string;
        expiresIn: number;
        canResendIn: number;
    }>;
    /**
     * Get OTP status
     */
    getOTPStatus(phoneNumber: string, purpose: string): Promise<{
        exists: boolean;
        expiresIn?: number;
        attemptsLeft?: number;
    }>;
    /**
     * Get remaining attempts
     */
    getRemainingAttempts(phoneNumber: string, purpose: string): Promise<number>;
}
//# sourceMappingURL=OTPService.d.ts.map