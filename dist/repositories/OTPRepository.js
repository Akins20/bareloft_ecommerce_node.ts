"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTPRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
class OTPRepository extends BaseRepository_1.BaseRepository {
    modelName = "otpCode";
    constructor(database) {
        super(database);
    }
    /**
     * Find valid OTP for phone number and purpose
     */
    async findValidOTP(phoneNumber, purpose) {
        try {
            return await this.model.findFirst({
                where: {
                    phoneNumber,
                    purpose,
                    isUsed: false,
                    expiresAt: {
                        gt: new Date(),
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            });
        }
        catch (error) {
            console.error(`Error finding valid OTP for ${phoneNumber}:`, error);
            throw error;
        }
    }
    /**
     * Find latest OTP for phone number and purpose (including expired/used)
     */
    async findLatestOTP(phoneNumber, purpose) {
        try {
            return await this.model.findFirst({
                where: {
                    phoneNumber,
                    purpose,
                },
                orderBy: {
                    createdAt: "desc",
                },
            });
        }
        catch (error) {
            console.error(`Error finding latest OTP for ${phoneNumber}:`, error);
            throw error;
        }
    }
    /**
     * Create new OTP record
     */
    async createOTP(otpData) {
        try {
            return await this.model.create({
                data: {
                    phoneNumber: otpData.phoneNumber,
                    code: otpData.code,
                    purpose: otpData.purpose,
                    expiresAt: otpData.expiresAt,
                    isUsed: false,
                    attempts: 0,
                    maxAttempts: otpData.maxAttempts || 3,
                },
            });
        }
        catch (error) {
            console.error("Error creating OTP:", error);
            throw error;
        }
    }
    /**
     * Mark OTP as used
     */
    async markAsUsed(id) {
        try {
            return await this.model.update({
                where: { id },
                data: {
                    isUsed: true,
                    updatedAt: new Date(),
                },
            });
        }
        catch (error) {
            console.error(`Error marking OTP as used ${id}:`, error);
            throw error;
        }
    }
    /**
     * Increment OTP attempts
     */
    async incrementAttempts(id) {
        try {
            return await this.model.update({
                where: { id },
                data: {
                    attempts: {
                        increment: 1,
                    },
                    updatedAt: new Date(),
                },
            });
        }
        catch (error) {
            console.error(`Error incrementing OTP attempts ${id}:`, error);
            throw error;
        }
    }
    /**
     * Invalidate existing OTPs for phone number and purpose
     */
    async invalidateExistingOTP(phoneNumber, purpose) {
        try {
            const result = await this.model.updateMany({
                where: {
                    phoneNumber,
                    purpose,
                    isUsed: false,
                },
                data: {
                    isUsed: true,
                    updatedAt: new Date(),
                },
            });
            return result.count;
        }
        catch (error) {
            console.error(`Error invalidating existing OTPs for ${phoneNumber}:`, error);
            throw error;
        }
    }
    /**
     * Clean up expired OTPs (for maintenance)
     */
    async cleanupExpiredOTPs() {
        try {
            const result = await this.model.deleteMany({
                where: {
                    expiresAt: {
                        lt: new Date(),
                    },
                },
            });
            console.log(`🧹 Cleaned up ${result.count} expired OTP records`);
            return result.count;
        }
        catch (error) {
            console.error("Error cleaning up expired OTPs:", error);
            throw error;
        }
    }
    /**
     * Get OTP statistics for phone number
     */
    async getOTPStats(phoneNumber, hoursBack = 24) {
        try {
            const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
            const [totalRequested, totalUsed, totalExpired, recentRequests] = await Promise.all([
                this.model.count({
                    where: {
                        phoneNumber,
                        createdAt: {
                            gte: cutoffTime,
                        },
                    },
                }),
                this.model.count({
                    where: {
                        phoneNumber,
                        isUsed: true,
                        createdAt: {
                            gte: cutoffTime,
                        },
                    },
                }),
                this.model.count({
                    where: {
                        phoneNumber,
                        isUsed: false,
                        expiresAt: {
                            lt: new Date(),
                        },
                        createdAt: {
                            gte: cutoffTime,
                        },
                    },
                }),
                this.model.findMany({
                    where: {
                        phoneNumber,
                        createdAt: {
                            gte: cutoffTime,
                        },
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 10,
                }),
            ]);
            return {
                totalRequested,
                totalUsed,
                totalExpired,
                recentRequests,
            };
        }
        catch (error) {
            console.error(`Error getting OTP stats for ${phoneNumber}:`, error);
            throw error;
        }
    }
    /**
     * Check if phone number is rate limited
     */
    async isRateLimited(phoneNumber, maxRequests = 3, windowMinutes = 15) {
        try {
            const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
            const requestCount = await this.model.count({
                where: {
                    phoneNumber,
                    createdAt: {
                        gte: windowStart,
                    },
                },
            });
            const resetTime = new Date(Date.now() + windowMinutes * 60 * 1000);
            return {
                isLimited: requestCount >= maxRequests,
                requestCount,
                resetTime,
            };
        }
        catch (error) {
            console.error(`Error checking rate limit for ${phoneNumber}:`, error);
            return {
                isLimited: false,
                requestCount: 0,
                resetTime: new Date(),
            };
        }
    }
    /**
     * Get OTPs by purpose within time range
     */
    async getOTPsByPurpose(purpose, dateFrom, dateTo) {
        try {
            return await this.model.findMany({
                where: {
                    purpose,
                    createdAt: {
                        gte: dateFrom,
                        lte: dateTo,
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            });
        }
        catch (error) {
            console.error(`Error getting OTPs by purpose ${purpose}:`, error);
            throw error;
        }
    }
    /**
     * Get failed OTP attempts (for security monitoring)
     */
    async getFailedAttempts(phoneNumber, hoursBack = 24) {
        try {
            const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
            const whereClause = {
                attempts: {
                    gte: 1,
                },
                isUsed: false,
                createdAt: {
                    gte: cutoffTime,
                },
            };
            if (phoneNumber) {
                whereClause.phoneNumber = phoneNumber;
            }
            return await this.model.findMany({
                where: whereClause,
                orderBy: {
                    attempts: "desc",
                },
            });
        }
        catch (error) {
            console.error("Error getting failed OTP attempts:", error);
            throw error;
        }
    }
    /**
     * Bulk cleanup old OTPs (for maintenance jobs)
     */
    async bulkCleanup(daysOld = 7) {
        try {
            const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
            // Get oldest record before deletion for reporting
            const oldestRecord = await this.model.findFirst({
                where: {
                    createdAt: {
                        lt: cutoffDate,
                    },
                },
                orderBy: {
                    createdAt: "asc",
                },
                select: {
                    createdAt: true,
                },
            });
            const result = await this.model.deleteMany({
                where: {
                    createdAt: {
                        lt: cutoffDate,
                    },
                },
            });
            return {
                deletedCount: result.count,
                oldestDeleted: oldestRecord?.createdAt || null,
            };
        }
        catch (error) {
            console.error("Error in bulk cleanup:", error);
            throw error;
        }
    }
    /**
     * Get OTP analytics for admin dashboard
     */
    async getOTPAnalytics(dateFrom, dateTo) {
        try {
            const [totalOTPs, successfulVerifications, expiredOTPs, otpsByPurpose, allOTPs,] = await Promise.all([
                // Total OTPs created
                this.model.count({
                    where: {
                        createdAt: { gte: dateFrom, lte: dateTo },
                    },
                }),
                // Successful verifications
                this.model.count({
                    where: {
                        createdAt: { gte: dateFrom, lte: dateTo },
                        isUsed: true,
                    },
                }),
                // Expired OTPs
                this.model.count({
                    where: {
                        createdAt: { gte: dateFrom, lte: dateTo },
                        isUsed: false,
                        expiresAt: { lt: new Date() },
                    },
                }),
                // OTPs by purpose
                this.model.groupBy({
                    by: ["purpose"],
                    where: {
                        createdAt: { gte: dateFrom, lte: dateTo },
                    },
                    _count: {
                        purpose: true,
                    },
                }),
                // All OTPs for detailed analysis
                this.model.findMany({
                    where: {
                        createdAt: { gte: dateFrom, lte: dateTo },
                    },
                    select: {
                        attempts: true,
                        createdAt: true,
                        isUsed: true,
                    },
                }),
            ]);
            // Calculate failed verifications and average attempts
            const failedVerifications = allOTPs.filter((otp) => !otp.isUsed && otp.attempts > 0).length;
            const totalAttempts = allOTPs.reduce((sum, otp) => sum + otp.attempts, 0);
            const averageAttemptsPerOTP = totalOTPs > 0 ? totalAttempts / totalOTPs : 0;
            // Process OTPs by purpose
            const purposeMap = {
                login: 0,
                signup: 0,
                password_reset: 0,
                phone_verification: 0,
            };
            otpsByPurpose.forEach((group) => {
                purposeMap[group.purpose] = group._count.purpose;
            });
            // Generate hourly distribution
            const hourlyMap = new Map();
            allOTPs.forEach((otp) => {
                const hour = otp.createdAt.getHours();
                hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
            });
            const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
                hour,
                count: hourlyMap.get(hour) || 0,
            }));
            return {
                totalOTPs,
                successfulVerifications,
                failedVerifications,
                expiredOTPs,
                averageAttemptsPerOTP: Math.round(averageAttemptsPerOTP * 100) / 100,
                otpsByPurpose: purposeMap,
                hourlyDistribution,
            };
        }
        catch (error) {
            console.error("Error getting OTP analytics:", error);
            throw error;
        }
    }
    /**
     * Get suspicious activity (potential abuse)
     */
    async getSuspiciousActivity(hoursBack = 24) {
        try {
            const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
            const suspiciousPhones = await this.model.groupBy({
                by: ["phoneNumber"],
                where: {
                    createdAt: { gte: cutoffTime },
                },
                _count: {
                    phoneNumber: true,
                },
                _max: {
                    createdAt: true,
                },
                having: {
                    phoneNumber: {
                        _count: {
                            gt: 10, // More than 10 requests in the time window
                        },
                    },
                },
            });
            const results = await Promise.all(suspiciousPhones.map(async (phone) => {
                const failedAttempts = await this.model.count({
                    where: {
                        phoneNumber: phone.phoneNumber,
                        createdAt: { gte: cutoffTime },
                        attempts: { gt: 0 },
                        isUsed: false,
                    },
                });
                return {
                    phoneNumber: phone.phoneNumber,
                    requestCount: phone._count.phoneNumber,
                    failedAttempts,
                    lastRequest: phone._max.createdAt || new Date(),
                };
            }));
            return results.sort((a, b) => b.requestCount - a.requestCount);
        }
        catch (error) {
            console.error("Error getting suspicious activity:", error);
            throw error;
        }
    }
}
exports.OTPRepository = OTPRepository;
//# sourceMappingURL=OTPRepository.js.map