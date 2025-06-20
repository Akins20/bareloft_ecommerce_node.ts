"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTPService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const common_types_1 = require("@/types/common.types");
class OTPService {
    /**
     * Generate a secure 6-digit OTP
     */
    generateOTP() {
        // Generate a secure random number
        const randomBytes = crypto_1.default.randomBytes(4);
        const randomNumber = randomBytes.readUInt32BE(0);
        // Convert to 6-digit string
        const otp = (randomNumber % 1000000).toString().padStart(6, "0");
        return otp;
    }
    /**
     * Generate OTP with checksum for extra security
     */
    generateSecureOTP() {
        const otp = this.generateOTP();
        const checksum = this.generateChecksum(otp);
        return { otp, checksum };
    }
    /**
     * Verify OTP with checksum
     */
    verifySecureOTP(otp, checksum, providedOTP) {
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
    generateTOTP(secret, timeWindow = 30) {
        const time = Math.floor(Date.now() / 1000 / timeWindow);
        const timeBuffer = Buffer.alloc(8);
        timeBuffer.writeUInt32BE(0, 0);
        timeBuffer.writeUInt32BE(time, 4);
        const hmac = crypto_1.default.createHmac("sha1", secret);
        hmac.update(timeBuffer);
        const hash = hmac.digest();
        const offset = hash[hash.length - 1] & 0xf;
        const code = ((hash[offset] & 0x7f) << 24) |
            ((hash[offset + 1] & 0xff) << 16) |
            ((hash[offset + 2] & 0xff) << 8) |
            (hash[offset + 3] & 0xff);
        return (code % 1000000).toString().padStart(6, "0");
    }
    /**
     * Generate OTP expiration timestamp
     */
    generateExpirationTime(minutes = common_types_1.CONSTANTS.OTP_EXPIRY_MINUTES) {
        return new Date(Date.now() + minutes * 60 * 1000);
    }
    /**
     * Check if OTP is expired
     */
    isExpired(expirationTime) {
        return new Date() > expirationTime;
    }
    /**
     * Get remaining time for OTP in seconds
     */
    getRemainingTime(expirationTime) {
        const remainingMs = expirationTime.getTime() - Date.now();
        return Math.max(0, Math.floor(remainingMs / 1000));
    }
    /**
     * Format remaining time as human-readable string
     */
    formatRemainingTime(expirationTime) {
        const remainingSeconds = this.getRemainingTime(expirationTime);
        if (remainingSeconds <= 0) {
            return "Expired";
        }
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        else {
            return `${seconds}s`;
        }
    }
    // Private helper methods
    constantTimeCompare(a, b) {
        if (a.length !== b.length) {
            return false;
        }
        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return result === 0;
    }
    generateChecksum(otp) {
        return crypto_1.default
            .createHash("sha256")
            .update(otp)
            .digest("hex")
            .substring(0, 8);
    }
    /**
     * Sanitize OTP input (remove spaces, convert to uppercase for alphanumeric)
     */
    sanitizeOTPInput(input) {
        return input.replace(/\s/g, "").toUpperCase();
    }
    /**
     * Generate backup codes (for account recovery)
     */
    generateBackupCodes(count = 10) {
        const codes = [];
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
    hashBackupCode(code) {
        return crypto_1.default.createHash("sha256").update(code).digest("hex");
    }
    /**
     * Verify backup code
     */
    verifyBackupCode(hashedCode, providedCode) {
        const providedHash = this.hashBackupCode(providedCode);
        return this.constantTimeCompare(hashedCode, providedHash);
    }
}
exports.OTPService = OTPService;
//# sourceMappingURL=OTPService.js.map