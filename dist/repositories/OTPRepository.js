"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTPRepository = void 0;
const client_1 = require("@prisma/client");
const BaseRepository_1 = require("./BaseRepository");
const types_1 = require("../types");
class OTPRepository extends BaseRepository_1.BaseRepository {
    constructor(prisma) {
        super(prisma || new client_1.PrismaClient(), "OTPCode");
    }
    /**
     * Create new OTP code
     */
    async create(data) {
        try {
            // Use direct Prisma query to avoid BaseRepository issues
            return await this.prisma.oTPCode.create({
                data: {
                    phoneNumber: data.phoneNumber,
                    code: data.code,
                    purpose: data.purpose,
                    expiresAt: data.expiresAt,
                    isUsed: data.isUsed,
                    attempts: data.attempts,
                    maxAttempts: data.maxAttempts,
                    userId: data.userId,
                }
            });
        }
        catch (error) {
            console.error('Database error in create OTP:', error);
            throw new types_1.AppError("Error creating OTP code", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Find valid OTP for phone number and purpose
     */
    async findValidOTP(phoneNumber, purpose) {
        try {
            // Use direct Prisma query instead of BaseRepository method to avoid issues
            return await this.prisma.oTPCode.findFirst({
                where: {
                    phoneNumber,
                    purpose,
                    isUsed: false,
                    expiresAt: {
                        gt: new Date(),
                    },
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
        }
        catch (error) {
            console.error('Database error in findValidOTP:', error);
            throw new types_1.AppError("Error finding valid OTP", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Find OTP by phone number and code
     */
    async findByPhoneAndCode(phoneNumber, code, purpose) {
        try {
            return await this.findFirst({
                phoneNumber,
                code,
                purpose,
                isUsed: false,
                expiresAt: {
                    gt: new Date(),
                },
            });
        }
        catch (error) {
            throw new types_1.AppError("Error finding OTP by phone and code", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Invalidate existing OTPs for phone number and purpose
     */
    async invalidateExistingOTP(phoneNumber, purpose) {
        try {
            // Use direct Prisma query
            await this.prisma.oTPCode.updateMany({
                where: {
                    phoneNumber,
                    purpose,
                    isUsed: false,
                },
                data: {
                    isUsed: true,
                }
            });
        }
        catch (error) {
            console.error('Database error in invalidateExistingOTP:', error);
            throw new types_1.AppError("Error invalidating existing OTPs", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Mark OTP as used
     */
    async markAsUsed(otpId) {
        try {
            // Use direct Prisma query
            return await this.prisma.oTPCode.update({
                where: { id: otpId },
                data: { isUsed: true }
            });
        }
        catch (error) {
            console.error('Database error in markAsUsed:', error);
            throw new types_1.AppError("Error marking OTP as used", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Increment OTP attempts
     */
    async incrementAttempts(otpId) {
        try {
            // Get current OTP to increment attempts
            const currentOTP = await this.findById(otpId);
            if (!currentOTP) {
                throw new types_1.AppError("OTP not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            return await this.update(otpId, {
                attempts: currentOTP.attempts + 1,
            });
        }
        catch (error) {
            if (error instanceof types_1.AppError) {
                throw error;
            }
            throw new types_1.AppError("Error incrementing OTP attempts", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Get OTP usage statistics for phone number
     */
    async getOTPStats(phoneNumber, timeRange = 24 // hours
    ) {
        try {
            const startTime = new Date();
            startTime.setHours(startTime.getHours() - timeRange);
            const [totalOTPs, usedOTPs, failedOTPs, lastOTP] = await Promise.all([
                this.count({
                    phoneNumber,
                    createdAt: {
                        gte: startTime,
                    },
                }),
                this.count({
                    phoneNumber,
                    isUsed: true,
                    createdAt: {
                        gte: startTime,
                    },
                }),
                this.count({
                    phoneNumber,
                    attempts: {
                        gte: types_1.CONSTANTS.MAX_OTP_ATTEMPTS,
                    },
                    createdAt: {
                        gte: startTime,
                    },
                }),
                this.findFirst({
                    phoneNumber,
                    createdAt: {
                        gte: startTime,
                    },
                }, undefined // no include
                ),
            ]);
            return {
                totalRequests: totalOTPs,
                successfulVerifications: usedOTPs,
                failedAttempts: failedOTPs,
                lastRequestAt: lastOTP?.createdAt,
            };
        }
        catch (error) {
            throw new types_1.AppError("Error getting OTP statistics", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Check if phone number is rate limited
     */
    async isRateLimited(phoneNumber, timeWindow = types_1.CONSTANTS.OTP_RATE_LIMIT_MINUTES, // minutes
    maxRequests = 3) {
        try {
            const startTime = new Date();
            startTime.setMinutes(startTime.getMinutes() - timeWindow);
            const requestCount = await this.count({
                phoneNumber,
                createdAt: {
                    gte: startTime,
                },
            });
            const resetTime = new Date();
            resetTime.setMinutes(resetTime.getMinutes() + timeWindow);
            return {
                isLimited: requestCount >= maxRequests,
                requestCount,
                resetTime,
            };
        }
        catch (error) {
            throw new types_1.AppError("Error checking rate limit", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Clean up expired OTPs (maintenance task)
     */
    async cleanupExpiredOTPs() {
        try {
            const result = await this.deleteMany({
                expiresAt: {
                    lt: new Date(),
                },
            });
            return { deletedCount: result.count };
        }
        catch (error) {
            throw new types_1.AppError("Error cleaning up expired OTPs", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Clean up old used OTPs (maintenance task)
     */
    async cleanupOldOTPs(daysOld = 7) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            const result = await this.deleteMany({
                isUsed: true,
                createdAt: {
                    lt: cutoffDate,
                },
            });
            return { deletedCount: result.count };
        }
        catch (error) {
            throw new types_1.AppError("Error cleaning up old OTPs", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Get OTP analytics for admin dashboard
     */
    async getOTPAnalytics(dateFrom, dateTo) {
        try {
            const where = {
                createdAt: {
                    gte: dateFrom,
                    lte: dateTo,
                },
            };
            const [totalGenerated, totalVerified, totalExpired, byPurpose] = await Promise.all([
                this.count(where),
                this.count({ ...where, isUsed: true }),
                this.count({
                    ...where,
                    isUsed: false,
                    expiresAt: { lt: new Date() },
                }),
                this.groupBy(["purpose"], where, undefined, {
                    _count: { id: true },
                }),
            ]);
            // Get verification counts by purpose
            const verifiedByPurpose = await this.groupBy(["purpose"], { ...where, isUsed: true }, undefined, {
                _count: { id: true },
            });
            const verifiedMap = verifiedByPurpose.reduce((acc, item) => {
                acc[item.purpose] = item._count.id;
                return acc;
            }, {});
            const purposeAnalytics = byPurpose.map((item) => {
                const verified = verifiedMap[item.purpose] || 0;
                const generated = item._count.id;
                return {
                    purpose: item.purpose,
                    generated,
                    verified,
                    rate: generated > 0 ? (verified / generated) * 100 : 0,
                };
            });
            // Calculate daily analytics
            const dailyAnalytics = await this.prisma.$queryRaw `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as generated,
          COUNT(CASE WHEN is_used = true THEN 1 END) as verified
        FROM otp_codes
        WHERE created_at >= ${dateFrom} AND created_at <= ${dateTo}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;
            const verificationRate = totalGenerated > 0 ? (totalVerified / totalGenerated) * 100 : 0;
            return {
                totalGenerated,
                totalVerified,
                totalExpired,
                verificationRate: Number(verificationRate.toFixed(2)),
                byPurpose: purposeAnalytics,
                byDay: dailyAnalytics.map((item) => ({
                    date: item.date.toISOString().split("T")[0],
                    generated: Number(item.generated),
                    verified: Number(item.verified),
                })),
            };
        }
        catch (error) {
            throw new types_1.AppError("Error getting OTP analytics", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Find recent OTPs for debugging (admin only)
     */
    async findRecentOTPs(limit = 50, phoneNumber) {
        try {
            const where = {};
            if (phoneNumber) {
                where.phoneNumber = phoneNumber;
            }
            const result = await this.findMany(where, {
                orderBy: { createdAt: "desc" },
                pagination: { page: 1, limit },
            });
            return result.data;
        }
        catch (error) {
            throw new types_1.AppError("Error fetching recent OTPs", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Validate OTP code format
     */
    validateOTPFormat(code) {
        if (!code || typeof code !== "string") {
            return { isValid: false, error: "OTP code is required" };
        }
        if (code.length !== types_1.CONSTANTS.OTP_LENGTH) {
            return {
                isValid: false,
                error: `OTP code must be ${types_1.CONSTANTS.OTP_LENGTH} digits`,
            };
        }
        if (!/^\d+$/.test(code)) {
            return { isValid: false, error: "OTP code must contain only digits" };
        }
        return { isValid: true };
    }
    /**
     * Get next allowed OTP request time for phone number
     */
    async getNextAllowedRequestTime(phoneNumber) {
        try {
            const rateLimit = await this.isRateLimited(phoneNumber);
            if (!rateLimit.isLimited) {
                return null; // Can request immediately
            }
            return rateLimit.resetTime;
        }
        catch (error) {
            throw new types_1.AppError("Error checking next allowed request time", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
}
exports.OTPRepository = OTPRepository;
//# sourceMappingURL=OTPRepository.js.map