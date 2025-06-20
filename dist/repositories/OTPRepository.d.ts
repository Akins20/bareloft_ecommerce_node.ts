import { BaseRepository } from "./BaseRepository";
import { OTPCode, OTPPurpose, NigerianPhoneNumber } from "@/types";
import { PrismaClient } from "@prisma/client";
export declare class OTPRepository extends BaseRepository<OTPCode> {
    protected modelName: string;
    constructor(database?: PrismaClient);
    /**
     * Find valid OTP for phone number and purpose
     */
    findValidOTP(phoneNumber: NigerianPhoneNumber, purpose: OTPPurpose): Promise<OTPCode | null>;
    /**
     * Find latest OTP for phone number and purpose (including expired/used)
     */
    findLatestOTP(phoneNumber: NigerianPhoneNumber, purpose: OTPPurpose): Promise<OTPCode | null>;
    /**
     * Create new OTP record
     */
    createOTP(otpData: {
        phoneNumber: NigerianPhoneNumber;
        code: string;
        purpose: OTPPurpose;
        expiresAt: Date;
        maxAttempts?: number;
    }): Promise<OTPCode>;
    /**
     * Mark OTP as used
     */
    markAsUsed(id: string): Promise<OTPCode>;
    /**
     * Increment OTP attempts
     */
    incrementAttempts(id: string): Promise<OTPCode>;
    /**
     * Invalidate existing OTPs for phone number and purpose
     */
    invalidateExistingOTP(phoneNumber: NigerianPhoneNumber, purpose: OTPPurpose): Promise<number>;
    /**
     * Clean up expired OTPs (for maintenance)
     */
    cleanupExpiredOTPs(): Promise<number>;
    /**
     * Get OTP statistics for phone number
     */
    getOTPStats(phoneNumber: NigerianPhoneNumber, hoursBack?: number): Promise<{
        totalRequested: number;
        totalUsed: number;
        totalExpired: number;
        recentRequests: OTPCode[];
    }>;
    /**
     * Check if phone number is rate limited
     */
    isRateLimited(phoneNumber: NigerianPhoneNumber, maxRequests?: number, windowMinutes?: number): Promise<{
        isLimited: boolean;
        requestCount: number;
        resetTime: Date;
    }>;
    /**
     * Get OTPs by purpose within time range
     */
    getOTPsByPurpose(purpose: OTPPurpose, dateFrom: Date, dateTo: Date): Promise<OTPCode[]>;
    /**
     * Get failed OTP attempts (for security monitoring)
     */
    getFailedAttempts(phoneNumber?: NigerianPhoneNumber, hoursBack?: number): Promise<OTPCode[]>;
    /**
     * Bulk cleanup old OTPs (for maintenance jobs)
     */
    bulkCleanup(daysOld?: number): Promise<{
        deletedCount: number;
        oldestDeleted: Date | null;
    }>;
    /**
     * Get OTP analytics for admin dashboard
     */
    getOTPAnalytics(dateFrom: Date, dateTo: Date): Promise<{
        totalOTPs: number;
        successfulVerifications: number;
        failedVerifications: number;
        expiredOTPs: number;
        averageAttemptsPerOTP: number;
        otpsByPurpose: Record<OTPPurpose, number>;
        hourlyDistribution: {
            hour: number;
            count: number;
        }[];
    }>;
    /**
     * Get suspicious activity (potential abuse)
     */
    getSuspiciousActivity(hoursBack?: number): Promise<{
        phoneNumber: string;
        requestCount: number;
        failedAttempts: number;
        lastRequest: Date;
    }[]>;
}
//# sourceMappingURL=OTPRepository.d.ts.map