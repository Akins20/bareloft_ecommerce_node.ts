/**
 * Production Coupon Service using Database
 * Handles all coupon validation and discount calculations for cart system
 */

import { BaseService } from "../BaseService";
import { CouponRepository } from "../../repositories/CouponRepository";
import { Coupon, CouponType } from "@prisma/client";
import { AppError, HTTP_STATUS, ERROR_CODES } from "../../types";
import { logger } from "../../utils/logger/winston";

export class CouponService extends BaseService {
  private couponRepository: CouponRepository;

  constructor(couponRepository: CouponRepository) {
    super();
    this.couponRepository = couponRepository;
  }

  /**
   * Validate and get coupon from database
   */
  async getCoupon(code: string): Promise<Coupon | null> {
    try {
      const coupon = await this.couponRepository.findActiveByCode(code);
      
      if (!coupon) {
        logger.info("Coupon not found or inactive", { code });
        return null;
      }

      // Additional validation for usage limits
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        logger.info("Coupon usage limit reached", { 
          code, 
          usageCount: coupon.usageCount, 
          usageLimit: coupon.usageLimit 
        });
        return null;
      }

      return coupon;
    } catch (error) {
      logger.error("Error getting coupon", { error, code });
      return null;
    }
  }

  /**
   * Calculate discount for cart using database coupon
   */
  async calculateDiscount(code: string, cartSubtotal: number): Promise<{
    isValid: boolean;
    discount: number;
    shippingDiscount: number;
    message: string;
    coupon?: Coupon;
  }> {
    try {
      const coupon = await this.getCoupon(code);
      
      if (!coupon) {
        return {
          isValid: false,
          discount: 0,
          shippingDiscount: 0,
          message: "Invalid or expired coupon code"
        };
      }

      // Check minimum order amount
      const minAmount = Number(coupon.minAmount || 0);
      if (minAmount > 0 && cartSubtotal < minAmount) {
        return {
          isValid: false,
          discount: 0,
          shippingDiscount: 0,
          message: `Minimum order amount of ₦${minAmount.toLocaleString()} required`
        };
      }

      let discount = 0;
      let shippingDiscount = 0;
      const couponValue = Number(coupon.value);
      const maxAmount = Number(coupon.maxAmount || 0);

      switch (coupon.type) {
        case "PERCENTAGE":
          discount = cartSubtotal * (couponValue / 100);
          if (maxAmount > 0 && discount > maxAmount) {
            discount = maxAmount;
          }
          break;

        case "FIXED_AMOUNT":
          discount = Math.min(couponValue, cartSubtotal);
          break;

        case "FREE_SHIPPING":
          // Free shipping - max Nigerian shipping cost is ₦3,000
          shippingDiscount = 3000;
          break;
      }

      logger.info("Coupon discount calculated", {
        code: coupon.code,
        type: coupon.type,
        cartSubtotal,
        discount,
        shippingDiscount
      });

      return {
        isValid: true,
        discount: Math.round(discount),
        shippingDiscount,
        message: `Coupon ${coupon.code} applied successfully`,
        coupon
      };
    } catch (error) {
      logger.error("Error calculating coupon discount", { error, code, cartSubtotal });
      return {
        isValid: false,
        discount: 0,
        shippingDiscount: 0,
        message: "Error processing coupon"
      };
    }
  }

  /**
   * Apply coupon usage (increment usage count in database)
   */
  async applyCouponUsage(couponId: string): Promise<void> {
    try {
      await this.couponRepository.incrementUsage(couponId);
      logger.info("Coupon usage incremented", { couponId });
    } catch (error) {
      logger.error("Error incrementing coupon usage", { error, couponId });
      throw new AppError(
        "Error applying coupon usage",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Get all active coupons from database
   */
  async getActiveCoupons(): Promise<Coupon[]> {
    try {
      return await this.couponRepository.findActiveCoupons();
    } catch (error) {
      logger.error("Error getting active coupons", { error });
      throw new AppError(
        "Error retrieving coupons",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Validate coupon before checkout (final validation)
   */
  async validateCouponForCheckout(code: string, cartSubtotal: number): Promise<{
    isValid: boolean;
    coupon?: Coupon;
    discount: number;
    shippingDiscount: number;
    error?: string;
  }> {
    try {
      const result = await this.calculateDiscount(code, cartSubtotal);
      
      if (!result.isValid) {
        return {
          isValid: false,
          discount: 0,
          shippingDiscount: 0,
          error: result.message
        };
      }

      return {
        isValid: true,
        coupon: result.coupon,
        discount: result.discount,
        shippingDiscount: result.shippingDiscount
      };
    } catch (error) {
      logger.error("Error validating coupon for checkout", { error, code });
      return {
        isValid: false,
        discount: 0,
        shippingDiscount: 0,
        error: "Error validating coupon"
      };
    }
  }

  /**
   * Get coupon statistics for admin
   */
  async getCouponStats(couponId: string): Promise<any> {
    try {
      return await this.couponRepository.getCouponStats(couponId);
    } catch (error) {
      logger.error("Error getting coupon stats", { error, couponId });
      throw new AppError(
        "Error retrieving coupon statistics",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Clean up expired coupons (for scheduled job)
   */
  async cleanupExpiredCoupons(): Promise<{ deactivatedCount: number }> {
    try {
      const result = await this.couponRepository.deactivateExpiredCoupons();
      logger.info("Expired coupons cleaned up", { count: result.count });
      return { deactivatedCount: result.count };
    } catch (error) {
      logger.error("Error cleaning up expired coupons", { error });
      return { deactivatedCount: 0 };
    }
  }
}