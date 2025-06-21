import { PrismaClient } from "@prisma/client";
import { BaseRepository } from "./BaseRepository";
import { OTPCode, OTPPurpose, NigerianPhoneNumber } from "../types";
interface CreateOTPData {
    phoneNumber: NigerianPhoneNumber;
    code: string;
    purpose: OTPPurpose;
    expiresAt: Date;
    isUsed: boolean;
    attempts: number;
    maxAttempts: number;
    userId?: string;
}
interface UpdateOTPData {
    isUsed?: boolean;
    attempts?: number;
    userId?: string;
}
export declare class OTPRepository extends BaseRepository<OTPCode, CreateOTPData, UpdateOTPData> {
    constructor(prisma?: PrismaClient);
    /**
     * Create new OTP code
     */
    create(data: CreateOTPData): Promise<OTPCode>;
    /**
     * Find valid OTP for phone number and purpose
     */
    findValidOTP(phoneNumber: NigerianPhoneNumber, purpose: OTPPurpose): Promise<OTPCode | null>;
    /**
     * Find OTP by phone number and code
     */
    findByPhoneAndCode(phoneNumber: NigerianPhoneNumber, code: string, purpose: OTPPurpose): Promise<OTPCode | null>;
    /**
     * Invalidate existing OTPs for phone number and purpose
     */
    invalidateExistingOTP(phoneNumber: NigerianPhoneNumber, purpose: OTPPurpose): Promise<void>;
    /**
     * Mark OTP as used
     */
    markAsUsed(otpId: string): Promise<OTPCode>;
    /**
     * Increment OTP attempts
     */
    incrementAttempts(otpId: string): Promise<OTPCode>;
    /**
     * Get OTP usage statistics for phone number
     */
    getOTPStats(phoneNumber: NigerianPhoneNumber, timeRange?: number): Promise<{
        totalRequests: number;
        successfulVerifications: number;
        failedAttempts: number;
        lastRequestAt?: Date;
    }>;
    /**
     * Check if phone number is rate limited
     */
    isRateLimited(phoneNumber: NigerianPhoneNumber, timeWindow?: number, // minutes
    maxRequests?: number): Promise<{
        isLimited: boolean;
        requestCount: number;
        resetTime: Date;
    }>;
    /**
     * Clean up expired OTPs (maintenance task)
     */
    cleanupExpiredOTPs(): Promise<{
        deletedCount: number;
    }>;
    /**
     * Clean up old used OTPs (maintenance task)
     */
    cleanupOldOTPs(daysOld?: number): Promise<{
        deletedCount: number;
    }>;
    /**
     * Get OTP analytics for admin dashboard
     */
    getOTPAnalytics(dateFrom: Date, dateTo: Date): Promise<{
        totalGenerated: number;
        totalVerified: number;
        totalExpired: number;
        verificationRate: number;
        byPurpose: {
            purpose: OTPPurpose;
            generated: number;
            verified: number;
            rate: number;
        }[];
        byDay: {
            date: string;
            generated: number;
            verified: number;
        }[];
    }>;
    /**
     * Find recent OTPs for debugging (admin only)
     */
    findRecentOTPs(limit?: number, phoneNumber?: NigerianPhoneNumber): Promise<OTPCode[]>;
    /**
     * Validate OTP code format
     */
    validateOTPFormat(code: string): {
        isValid: boolean;
        error?: string;
    };
    /**
     * Get next allowed OTP request time for phone number
     */
    getNextAllowedRequestTime(phoneNumber: NigerianPhoneNumber): Promise<Date | null>;
}
export {};
//# sourceMappingURL=OTPRepository.d.ts.map