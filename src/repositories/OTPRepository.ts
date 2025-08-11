import { PrismaClient } from "@prisma/client";
import { BaseRepository } from "./BaseRepository";
import {
  NigerianPhoneNumber,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
  CONSTANTS,
} from "../types";
import { OTPCode, OTPPurpose } from "../types/auth.types";

interface CreateOTPData {
  phoneNumber?: NigerianPhoneNumber;
  email?: string;
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

export class OTPRepository extends BaseRepository<
  OTPCode,
  CreateOTPData,
  UpdateOTPData
> {
  constructor(prisma?: PrismaClient) {
    super(prisma || new PrismaClient(), "OTPCode");
  }

  /**
   * Create new OTP code
   */
  async create(data: CreateOTPData): Promise<OTPCode> {
    try {
      // Use direct Prisma query to avoid BaseRepository issues
      return await this.prisma.oTPCode.create({
        data: {
          phoneNumber: data.phoneNumber || null,
          email: data.email || null,
          code: data.code,
          purpose: data.purpose,
          expiresAt: data.expiresAt,
          isUsed: data.isUsed,
          attempts: data.attempts,
          maxAttempts: data.maxAttempts,
          userId: data.userId,
        }
      });
    } catch (error) {
      console.error('Database error in create OTP:', error);
      throw new AppError(
        "Error creating OTP code",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Find valid OTP for contact method and purpose
   */
  async findValidOTP(
    contactMethod: NigerianPhoneNumber | string,
    purpose: OTPPurpose
  ): Promise<OTPCode | null> {
    try {
      // Determine if it's phone or email
      const isEmail = contactMethod.includes('@');
      const whereClause = isEmail 
        ? { email: contactMethod }
        : { phoneNumber: contactMethod };
        
      // Use direct Prisma query instead of BaseRepository method to avoid issues
      return await this.prisma.oTPCode.findFirst({
        where: {
          ...whereClause,
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
    } catch (error) {
      console.error('Database error in findValidOTP:', error);
      throw new AppError(
        "Error finding valid OTP",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Find OTP by contact method and code
   */
  async findByContactAndCode(
    contactMethod: NigerianPhoneNumber | string,
    code: string,
    purpose: OTPPurpose
  ): Promise<OTPCode | null> {
    try {
      // Determine if it's phone or email
      const isEmail = contactMethod.includes('@');
      const whereClause = isEmail 
        ? { email: contactMethod }
        : { phoneNumber: contactMethod };
        
      return await this.findFirst({
        ...whereClause,
        code,
        purpose,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      });
    } catch (error) {
      throw new AppError(
        "Error finding OTP by contact method and code",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Find OTP by phone number and code (legacy compatibility)
   */
  async findByPhoneAndCode(
    phoneNumber: NigerianPhoneNumber,
    code: string,
    purpose: OTPPurpose
  ): Promise<OTPCode | null> {
    return this.findByContactAndCode(phoneNumber, code, purpose);
  }

  /**
   * Invalidate existing OTPs for contact method and purpose
   */
  async invalidateExistingOTP(
    contactMethod: NigerianPhoneNumber | string,
    purpose: OTPPurpose
  ): Promise<void> {
    try {
      console.log(`Attempting to invalidate OTPs for contact: ${contactMethod}, purpose: ${purpose}`);
      
      // Determine if it's phone or email
      const isEmail = contactMethod.includes('@');
      const whereClause = isEmail 
        ? { email: contactMethod }
        : { phoneNumber: contactMethod };
        
      // Use direct Prisma query
      const result = await this.prisma.oTPCode.updateMany({
        where: {
          ...whereClause,
          purpose,
          isUsed: false,
        },
        data: {
          isUsed: true,
        }
      });
      
      console.log(`Successfully invalidated ${result.count} OTPs for ${contactMethod}`);
    } catch (error) {
      console.error('Database error in invalidateExistingOTP:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        meta: error.meta
      });
      throw new AppError(
        "Error invalidating existing OTPs",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Mark OTP as used
   */
  async markAsUsed(otpId: string): Promise<OTPCode> {
    try {
      // Use direct Prisma query
      return await this.prisma.oTPCode.update({
        where: { id: otpId },
        data: { isUsed: true }
      });
    } catch (error) {
      console.error('Database error in markAsUsed:', error);
      throw new AppError(
        "Error marking OTP as used",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Increment OTP attempts
   */
  async incrementAttempts(otpId: string): Promise<OTPCode> {
    try {
      // Get current OTP to increment attempts
      const currentOTP = await this.findById(otpId);
      if (!currentOTP) {
        throw new AppError(
          "OTP not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      return await this.update(otpId, {
        attempts: currentOTP.attempts + 1,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        "Error incrementing OTP attempts",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Get OTP usage statistics for phone number
   */
  async getOTPStats(
    phoneNumber: NigerianPhoneNumber,
    timeRange: number = 24 // hours
  ): Promise<{
    totalRequests: number;
    successfulVerifications: number;
    failedAttempts: number;
    lastRequestAt?: Date;
  }> {
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
            gte: CONSTANTS.MAX_OTP_ATTEMPTS,
          },
          createdAt: {
            gte: startTime,
          },
        }),
        this.findFirst(
          {
            phoneNumber,
            createdAt: {
              gte: startTime,
            },
          },
          undefined // no include
        ),
      ]);

      return {
        totalRequests: totalOTPs,
        successfulVerifications: usedOTPs,
        failedAttempts: failedOTPs,
        lastRequestAt: lastOTP?.createdAt,
      };
    } catch (error) {
      throw new AppError(
        "Error getting OTP statistics",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Check if phone number is rate limited
   */
  async isRateLimited(
    phoneNumber: NigerianPhoneNumber,
    timeWindow: number = CONSTANTS.OTP_RATE_LIMIT_MINUTES, // minutes
    maxRequests: number = 3
  ): Promise<{
    isLimited: boolean;
    requestCount: number;
    resetTime: Date;
  }> {
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
    } catch (error) {
      throw new AppError(
        "Error checking rate limit",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Clean up expired OTPs (maintenance task)
   */
  async cleanupExpiredOTPs(): Promise<{ deletedCount: number }> {
    try {
      const result = await this.deleteMany({
        expiresAt: {
          lt: new Date(),
        },
      });

      return { deletedCount: result.count };
    } catch (error) {
      throw new AppError(
        "Error cleaning up expired OTPs",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Clean up old used OTPs (maintenance task)
   */
  async cleanupOldOTPs(daysOld: number = 7): Promise<{ deletedCount: number }> {
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
    } catch (error) {
      throw new AppError(
        "Error cleaning up old OTPs",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Get OTP analytics for admin dashboard
   */
  async getOTPAnalytics(
    dateFrom: Date,
    dateTo: Date
  ): Promise<{
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
  }> {
    try {
      const where = {
        createdAt: {
          gte: dateFrom,
          lte: dateTo,
        },
      };

      const [totalGenerated, totalVerified, totalExpired, byPurpose] =
        await Promise.all([
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
      const verifiedByPurpose = await this.groupBy(
        ["purpose"],
        { ...where, isUsed: true },
        undefined,
        {
          _count: { id: true },
        }
      );

      const verifiedMap = verifiedByPurpose.reduce((acc: any, item: any) => {
        acc[item.purpose] = item._count.id;
        return acc;
      }, {});

      const purposeAnalytics = byPurpose.map((item: any) => {
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
      const dailyAnalytics = await this.prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as generated,
          COUNT(CASE WHEN is_used = true THEN 1 END) as verified
        FROM otp_codes
        WHERE created_at >= ${dateFrom} AND created_at <= ${dateTo}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;

      const verificationRate =
        totalGenerated > 0 ? (totalVerified / totalGenerated) * 100 : 0;

      return {
        totalGenerated,
        totalVerified,
        totalExpired,
        verificationRate: Number(verificationRate.toFixed(2)),
        byPurpose: purposeAnalytics,
        byDay: (dailyAnalytics as any[]).map((item) => ({
          date: item.date.toISOString().split("T")[0],
          generated: Number(item.generated),
          verified: Number(item.verified),
        })),
      };
    } catch (error) {
      throw new AppError(
        "Error getting OTP analytics",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Find recent OTPs for debugging (admin only)
   */
  async findRecentOTPs(
    limit: number = 50,
    phoneNumber?: NigerianPhoneNumber
  ): Promise<OTPCode[]> {
    try {
      const where: any = {};
      if (phoneNumber) {
        where.phoneNumber = phoneNumber;
      }

      const result = await this.findMany(where, {
        orderBy: { createdAt: "desc" },
        pagination: { page: 1, limit },
      });

      return result.data;
    } catch (error) {
      throw new AppError(
        "Error fetching recent OTPs",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Validate OTP code format
   */
  validateOTPFormat(code: string): { isValid: boolean; error?: string } {
    if (!code || typeof code !== "string") {
      return { isValid: false, error: "OTP code is required" };
    }

    if (code.length !== CONSTANTS.OTP_LENGTH) {
      return {
        isValid: false,
        error: `OTP code must be ${CONSTANTS.OTP_LENGTH} digits`,
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
  async getNextAllowedRequestTime(
    phoneNumber: NigerianPhoneNumber
  ): Promise<Date | null> {
    try {
      const rateLimit = await this.isRateLimited(phoneNumber);

      if (!rateLimit.isLimited) {
        return null; // Can request immediately
      }

      return rateLimit.resetTime;
    } catch (error) {
      throw new AppError(
        "Error checking next allowed request time",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }
}
