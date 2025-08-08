import crypto from "crypto";
import { CONSTANTS } from "../../types/common.types";

export class OTPService {
  /**
   * Generate a secure 6-digit OTP
   */
  generateOTP(): string {
    // Generate a secure random number
    const randomBytes = crypto.randomBytes(4);
    const randomNumber = randomBytes.readUInt32BE(0);

    // Convert to 6-digit string
    const otp = (randomNumber % 1000000).toString().padStart(6, "0");

    return otp;
  }

  /**
   * Generate OTP with checksum for extra security
   */
  generateSecureOTP(): { otp: string; checksum: string } {
    const otp = this.generateOTP();
    const checksum = this.generateChecksum(otp);

    return { otp, checksum };
  }

  /**
   * Verify OTP with checksum
   */
  verifySecureOTP(otp: string, checksum: string, providedOTP: string): boolean {
    // First verify the OTP itself
    if (!this.constantTimeCompare(otp, providedOTP)) {
      return false;
    }

    // Then verify the checksum
    const expectedChecksum = this.generateChecksum(otp);
    return this.constantTimeCompare(checksum, expectedChecksum);
  }

  /**
   * Generate time-based OTP (TOTP-like, for future implementation)
   */
  generateTOTP(secret: string, timeWindow: number = 30): string {
    const time = Math.floor(Date.now() / 1000 / timeWindow);
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeUInt32BE(0, 0);
    timeBuffer.writeUInt32BE(time, 4);

    const hmac = crypto.createHmac("sha1", secret);
    hmac.update(timeBuffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0xf;
    const code =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    return (code % 1000000).toString().padStart(6, "0");
  }

  /**
   * Generate OTP expiration timestamp
   */
  generateExpirationTime(minutes: number = CONSTANTS.OTP_EXPIRY_MINUTES): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  /**
   * Check if OTP is expired
   */
  isExpired(expirationTime: Date): boolean {
    return new Date() > expirationTime;
  }

  /**
   * Get remaining time for OTP in seconds
   */
  getRemainingTime(expirationTime: Date): number {
    const remainingMs = expirationTime.getTime() - Date.now();
    return Math.max(0, Math.floor(remainingMs / 1000));
  }

  /**
   * Format remaining time as human-readable string
   */
  formatRemainingTime(expirationTime: Date): string {
    const remainingSeconds = this.getRemainingTime(expirationTime);

    if (remainingSeconds <= 0) {
      return "Expired";
    }

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Private helper methods
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  private generateChecksum(otp: string): string {
    return crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex")
      .substring(0, 8);
  }

  /**
   * Sanitize OTP input (remove spaces, convert to uppercase for alphanumeric)
   */
  sanitizeOTPInput(input: string): string {
    return input.replace(/\s/g, "").toUpperCase();
  }

  /**
   * Generate backup codes (for account recovery)
   */
  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = this.generateAlphanumericOTP(8);
      codes.push(code);
    }

    return codes;
  }

  /**
   * Hash backup code for storage
   */
  hashBackupCode(code: string): string {
    return crypto.createHash("sha256").update(code).digest("hex");
  }

  /**
   * Verify backup code
   */
  verifyBackupCode(hashedCode: string, providedCode: string): boolean {
    const providedHash = this.hashBackupCode(providedCode);
    return this.constantTimeCompare(hashedCode, providedHash);
  }

  /**
   * Verify OTP - simple string comparison
   */
  async verifyOTPCode(storedOTP: string, providedOTP: string): Promise<boolean> {
    return this.constantTimeCompare(storedOTP, providedOTP);
  }

  /**
   * Check rate limiting for OTP requests
   */
  async checkRateLimit(identifier: string): Promise<boolean> {
    // This is a placeholder - implement rate limiting logic
    // For now, return true to allow requests
    return true;
  }

  /**
   * Generate OTP and send it
   */
  async generateAndSendOTP(phoneNumber: string, purpose: string): Promise<{ success: boolean; message: string; expiresIn: number; canResendIn: number }> {
    const otp = this.generateOTP();
    // This is a placeholder - implement SMS sending logic
    console.log(`Generated OTP for ${phoneNumber}: ${otp}`);
    
    return {
      success: true,
      message: `OTP sent to ${phoneNumber}`,
      expiresIn: 600, // 10 minutes
      canResendIn: 60 // 1 minute
    };
  }

  /**
   * Verify OTP with three parameters (for controller compatibility)
   */
  async verifyOTP(phoneNumber: string, code: string, purpose: string): Promise<{ success: boolean; message?: string; userId?: string; token?: string }> {
    // This is a placeholder - implement proper OTP verification
    // In a real implementation, this would check the OTP against the database
    console.log(`Verifying OTP for ${phoneNumber}: ${code} (purpose: ${purpose})`);
    
    return {
      success: true,
      message: "OTP verified successfully",
      token: "temp-token-" + Date.now()
    };
  }

  /**
   * Generate alphanumeric OTP
   */
  private generateAlphanumericOTP(length: number): string {
    const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  /**
   * Check if user can resend OTP
   */
  async canResendOTP(phoneNumber: string): Promise<{ allowed: boolean; message?: string }> {
    // Placeholder implementation
    return { allowed: true };
  }

  /**
   * Resend OTP
   */
  async resendOTP(phoneNumber: string, purpose: string): Promise<{ success: boolean; message: string; expiresIn: number; canResendIn: number }> {
    return await this.generateAndSendOTP(phoneNumber, purpose);
  }

  /**
   * Get OTP status
   */
  async getOTPStatus(phoneNumber: string, purpose: string): Promise<{ exists: boolean; expiresIn?: number; attemptsLeft?: number }> {
    // Placeholder implementation
    return {
      exists: true,
      expiresIn: 600,
      attemptsLeft: 3
    };
  }

  /**
   * Get remaining attempts
   */
  getRemainingAttempts(phoneNumber: string, purpose: string): Promise<number> {
    // Placeholder implementation
    return Promise.resolve(3);
  }
}
