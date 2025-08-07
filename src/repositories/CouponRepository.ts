import { PrismaClient, Coupon, CouponType } from "@prisma/client";
import { BaseRepository } from "./BaseRepository";
import {
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
} from "../types";

export interface CreateCouponData {
  code: string;
  type: CouponType;
  value: number;
  minAmount?: number;
  maxAmount?: number;
  usageLimit?: number;
  startsAt?: Date;
  expiresAt?: Date;
  isActive?: boolean;
}

export interface UpdateCouponData {
  code?: string;
  type?: CouponType;
  value?: number;
  minAmount?: number;
  maxAmount?: number;
  usageLimit?: number;
  startsAt?: Date;
  expiresAt?: Date;
  isActive?: boolean;
}

export class CouponRepository extends BaseRepository<
  Coupon,
  CreateCouponData,
  UpdateCouponData
> {
  constructor(prisma: PrismaClient) {
    super(prisma, "coupon");
  }

  /**
   * Find coupon by code
   */
  async findByCode(code: string): Promise<Coupon | null> {
    try {
      return await this.prisma.coupon.findUnique({
        where: {
          code: code.toUpperCase(),
        },
      });
    } catch (error) {
      this.handleError("Error finding coupon by code", error);
      throw error;
    }
  }

  /**
   * Find active coupon by code
   */
  async findActiveByCode(code: string): Promise<Coupon | null> {
    try {
      const now = new Date();
      
      return await this.prisma.coupon.findFirst({
        where: {
          code: code.toUpperCase(),
          isActive: true,
          AND: [
            {
              OR: [
                { startsAt: null },
                { startsAt: { lte: now } },
              ],
            },
            {
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: now } },
              ],
            },
          ],
        },
      });
    } catch (error) {
      this.handleError("Error finding active coupon by code", error);
      throw error;
    }
  }

  /**
   * Increment coupon usage count
   */
  async incrementUsage(couponId: string): Promise<Coupon> {
    try {
      return await this.prisma.coupon.update({
        where: { id: couponId },
        data: {
          usageCount: {
            increment: 1,
          },
        },
      });
    } catch (error) {
      this.handleError("Error incrementing coupon usage", error);
      throw error;
    }
  }

  /**
   * Get all active coupons
   */
  async findActiveCoupons(): Promise<Coupon[]> {
    try {
      const now = new Date();
      
      return await this.prisma.coupon.findMany({
        where: {
          isActive: true,
          AND: [
            {
              OR: [
                { startsAt: null },
                { startsAt: { lte: now } },
              ],
            },
            {
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: now } },
              ],
            },
          ],
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      this.handleError("Error finding active coupons", error);
      throw error;
    }
  }

  /**
   * Get coupon usage statistics
   */
  async getCouponStats(couponId: string): Promise<{
    coupon: Coupon;
    usagePercentage: number;
    remainingUses: number | null;
    isExpired: boolean;
    isUsageLimitReached: boolean;
  }> {
    try {
      const coupon = await this.findById(couponId);
      
      if (!coupon) {
        throw new AppError(
          "Coupon not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      const usagePercentage = coupon.usageLimit 
        ? (coupon.usageCount / coupon.usageLimit) * 100
        : 0;
      
      const remainingUses = coupon.usageLimit 
        ? Math.max(0, coupon.usageLimit - coupon.usageCount)
        : null;
      
      const isExpired = coupon.expiresAt 
        ? new Date() > coupon.expiresAt
        : false;
      
      const isUsageLimitReached = coupon.usageLimit 
        ? coupon.usageCount >= coupon.usageLimit
        : false;

      return {
        coupon,
        usagePercentage,
        remainingUses,
        isExpired,
        isUsageLimitReached,
      };
    } catch (error) {
      this.handleError("Error getting coupon stats", error);
      throw error;
    }
  }

  /**
   * Create coupon with validation
   */
  async createCoupon(couponData: CreateCouponData): Promise<Coupon> {
    try {
      // Check if code already exists
      const existingCoupon = await this.findByCode(couponData.code);
      if (existingCoupon) {
        throw new AppError(
          "Coupon code already exists",
          HTTP_STATUS.CONFLICT,
          ERROR_CODES.RESOURCE_ALREADY_EXISTS
        );
      }

      // Validate dates
      if (couponData.startsAt && couponData.expiresAt) {
        if (couponData.startsAt >= couponData.expiresAt) {
          throw new AppError(
            "Start date must be before expiry date",
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR
          );
        }
      }

      // Validate amounts for different coupon types
      if (couponData.type === "PERCENTAGE" && couponData.value > 100) {
        throw new AppError(
          "Percentage discount cannot exceed 100%",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      if (couponData.type === "FIXED_AMOUNT" && couponData.value <= 0) {
        throw new AppError(
          "Fixed amount discount must be greater than 0",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      return await this.create({
        ...couponData,
        code: couponData.code.toUpperCase(),
      });
    } catch (error) {
      this.handleError("Error creating coupon", error);
      throw error;
    }
  }

  /**
   * Get expired coupons for cleanup
   */
  async findExpiredCoupons(limit?: number): Promise<Coupon[]> {
    try {
      const now = new Date();
      
      return await this.prisma.coupon.findMany({
        where: {
          expiresAt: {
            lt: now,
          },
          isActive: true,
        },
        take: limit,
        orderBy: { expiresAt: "asc" },
      });
    } catch (error) {
      this.handleError("Error finding expired coupons", error);
      throw error;
    }
  }

  /**
   * Deactivate expired coupons
   */
  async deactivateExpiredCoupons(): Promise<{ count: number }> {
    try {
      const now = new Date();
      
      const result = await this.prisma.coupon.updateMany({
        where: {
          expiresAt: {
            lt: now,
          },
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      return { count: result.count };
    } catch (error) {
      this.handleError("Error deactivating expired coupons", error);
      return { count: 0 };
    }
  }
}