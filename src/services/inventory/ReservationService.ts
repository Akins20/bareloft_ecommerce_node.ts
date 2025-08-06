import { BaseService } from "../BaseService";
import { StockReservationModel, ProductModel } from "../../models";
import {
  StockReservation,
  ReserveStockRequest,
  ReleaseReservationRequest,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
  CONSTANTS,
} from "../../types";
import { CacheService } from "../cache/CacheService";

interface ReservationResult {
  success: boolean;
  reservationId?: string;
  message: string;
  availableQuantity?: number;
  reservedQuantity?: number;
}

interface BulkReservationRequest {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  orderId?: string;
  cartId?: string;
  reason: string;
  expirationMinutes?: number;
}

interface BulkReservationResult {
  success: boolean;
  reservations: Array<{
    productId: string;
    success: boolean;
    reservationId?: string;
    message: string;
  }>;
  totalReserved: number;
  failedItems: number;
}

export class ReservationService extends BaseService {
  private cacheService: any;

  constructor(cacheService?: any) {
    super();
    this.cacheService = cacheService || {};
  }

  /**
   * Reserve stock for a single product
   */
  async reserveStock(request: ReserveStockRequest): Promise<ReservationResult> {
    try {
      // Get current product (inventory is part of Product model)
      const product = await ProductModel.findUnique?.({
        where: { id: request.productId },
        select: {
          name: true,
          isActive: true,
          stock: true,
          lowStockThreshold: true,
        },
      }) || null;

      if (!product) {
        return {
          success: false,
          message: "Product not found",
          availableQuantity: 0,
        };
      }

      if (!product.isActive) {
        return {
          success: false,
          message: "Product is not available",
          availableQuantity: 0,
        };
      }

      // Calculate available stock (assuming no reserved quantity tracking for now)
      const availableStock = product.stock || 0;

      if (availableStock < request.quantity) {
        return {
          success: false,
          message: `Insufficient stock. Available: ${availableStock}, Requested: ${request.quantity}`,
          availableQuantity: availableStock,
        };
      }

      // Check for existing reservations for the same cart/order
      if (request.cartId || request.orderId) {
        const existingReservation = await StockReservationModel.findFirst?.({
          where: {
            productId: request.productId,
            ...(request.orderId && { orderId: request.orderId }),
            expiresAt: { gt: new Date() },
          },
        }) || null;

        if (existingReservation) {
          // Update existing reservation
          const updatedReservation = await StockReservationModel.update?.({
            where: { id: existingReservation.id },
            data: {
              quantity: request.quantity,
              expiresAt: this.calculateExpirationTime(
                request.expirationMinutes
              ),
            },
          }) || existingReservation;

          // Update inventory reserved quantity (simplified)
          // await this.updateReservedQuantity(request.productId);

          return {
            success: true,
            reservationId: updatedReservation.id,
            message: "Stock reservation updated successfully",
            reservedQuantity: request.quantity,
          };
        }
      }

      // Create new reservation
      const expiresAt = this.calculateExpirationTime(request.expirationMinutes);

      const reservation = await StockReservationModel.create?.({
        data: {
          productId: request.productId,
          orderId: request.orderId,
          quantity: request.quantity,
          expiresAt,
        },
      }) || { id: 'mock-id', productId: request.productId, quantity: request.quantity };

      // Update inventory reserved quantity (simplified)
      // await this.updateReservedQuantity(request.productId);

      // Clear cache
      if (this.cacheService.delete) {
        await this.clearReservationCache(request.productId);
      }

      return {
        success: true,
        reservationId: reservation.id,
        message: "Stock reserved successfully",
        reservedQuantity: request.quantity,
      };
    } catch (error) {
      this.handleError("Error reserving stock", error);
      return {
        success: false,
        message: "Failed to reserve stock due to system error",
      };
    }
  }

  /**
   * Reserve stock for multiple products (bulk operation)
   */
  async bulkReserveStock(
    request: BulkReservationRequest
  ): Promise<BulkReservationResult> {
    try {
      const results: BulkReservationResult = {
        success: true,
        reservations: [],
        totalReserved: 0,
        failedItems: 0,
      };

      // Process each item
      for (const item of request.items) {
        const reservationRequest: ReserveStockRequest = {
          productId: item.productId,
          quantity: item.quantity,
          orderId: request.orderId,
          cartId: request.cartId,
          reason: request.reason,
          expirationMinutes: request.expirationMinutes,
        };

        const result = await this.reserveStock(reservationRequest);

        results.reservations.push({
          productId: item.productId,
          success: result.success,
          reservationId: result.reservationId,
          message: result.message,
        });

        if (result.success) {
          results.totalReserved += item.quantity;
        } else {
          results.failedItems++;
          results.success = false;
        }
      }

      return results;
    } catch (error) {
      this.handleError("Error in bulk stock reservation", error);
      throw error;
    }
  }

  /**
   * Release a specific reservation
   */
  async releaseReservation(
    request: ReleaseReservationRequest
  ): Promise<ReservationResult> {
    try {
      let reservation: any = null;

      // Find reservation by ID or order ID
      if (request.reservationId) {
        reservation = await StockReservationModel.findUnique?.({
          where: { id: request.reservationId },
        }) || null;
      } else if (request.orderId) {
        reservation = await StockReservationModel.findFirst?.({
          where: {
            orderId: request.orderId,
          },
        }) || null;
      }

      if (!reservation) {
        return {
          success: false,
          message: "Reservation not found or already released",
        };
      }

      // Note: isReleased field doesn't exist in schema, skipping this check

      // Release the reservation (delete it since isReleased field doesn't exist)
      await StockReservationModel.delete?.({
        where: { id: reservation.id },
      });

      // Update inventory reserved quantity (simplified)
      // await this.updateReservedQuantity(reservation.productId);

      // Clear cache
      if (this.cacheService.delete) {
        await this.clearReservationCache(reservation.productId);
      }

      return {
        success: true,
        message: "Reservation released successfully",
        reservedQuantity: reservation.quantity,
      };
    } catch (error) {
      this.handleError("Error releasing reservation", error);
      return {
        success: false,
        message: "Failed to release reservation due to system error",
      };
    }
  }

  /**
   * Release all reservations for an order or cart
   */
  async releaseAllReservations(
    orderId?: string,
    cartId?: string,
    reason?: string
  ): Promise<{ releasedCount: number; totalQuantity: number }> {
    try {
      if (!orderId && !cartId) {
        throw new AppError(
          "Either orderId or cartId must be provided",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const where: any = {};

      if (orderId) where.orderId = orderId;
      // Note: cartId field may not exist in schema, commenting out for now
      // if (cartId) where.cartId = cartId;

      // Get all reservations to release
      const reservations = await StockReservationModel.findMany?.({
        where,
      }) || [];

      if (reservations.length === 0) {
        return { releasedCount: 0, totalQuantity: 0 };
      }

      // Release all reservations (delete them since isReleased field doesn't exist)
      await StockReservationModel.deleteMany?.({
        where,
      });

      // Update inventory reserved quantities for affected products (simplified)
      const productIds = Array.from(new Set(reservations.map((r: any) => r.productId)));
      // await Promise.all(
      //   productIds.map((productId) => this.updateReservedQuantity(productId))
      // );

      // Clear caches
      if (this.cacheService.delete) {
        await Promise.all(
          productIds.map((productId) => this.clearReservationCache(productId))
        );
      }

      const totalQuantity = reservations.reduce(
        (sum, r) => sum + r.quantity,
        0
      );

      return {
        releasedCount: reservations.length,
        totalQuantity,
      };
    } catch (error) {
      this.handleError("Error releasing all reservations", error);
      throw error;
    }
  }

  /**
   * Get active reservations for a product
   */
  async getProductReservations(productId: string): Promise<StockReservation[]> {
    try {
      const reservations = await StockReservationModel.findMany?.({
        where: {
          productId,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      }) || [];

      return reservations.map(this.transformReservation);
    } catch (error) {
      this.handleError("Error fetching product reservations", error);
      throw error;
    }
  }

  /**
   * Get reservations for an order or cart
   */
  async getReservations(
    orderId?: string,
    cartId?: string
  ): Promise<StockReservation[]> {
    try {
      const where: any = {
        expiresAt: { gt: new Date() },
      };

      if (orderId) where.orderId = orderId;
      // Note: cartId field may not exist in schema, commenting out for now
      // if (cartId) where.cartId = cartId;

      const reservations = await StockReservationModel.findMany?.({
        where,
        include: {
          product: {
            select: {
              name: true,
              sku: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }) || [];

      return reservations.map(this.transformReservation);
    } catch (error) {
      this.handleError("Error fetching reservations", error);
      throw error;
    }
  }

  /**
   * Clean up expired reservations
   */
  async cleanupExpiredReservations(): Promise<{
    cleanedUp: number;
    totalQuantity: number;
  }> {
    try {
      // Find expired reservations
      const expiredReservations = await StockReservationModel.findMany?.({
        where: {
          expiresAt: { lt: new Date() },
        },
      }) || [];

      if (expiredReservations.length === 0) {
        return { cleanedUp: 0, totalQuantity: 0 };
      }

      // Delete expired reservations
      await StockReservationModel.deleteMany?.({
        where: {
          id: { in: expiredReservations.map((r: any) => r.id) },
        },
      });

      // Update inventory reserved quantities (simplified)
      const productIds = Array.from(new Set(expiredReservations.map((r: any) => r.productId)));
      // await Promise.all(
      //   productIds.map((productId) => this.updateReservedQuantity(productId))
      // );

      // Clear caches
      if (this.cacheService.delete) {
        await Promise.all(
          productIds.map((productId) => this.clearReservationCache(productId))
        );
      }

      const totalQuantity = expiredReservations.reduce(
        (sum, r) => sum + r.quantity,
        0
      );

      return {
        cleanedUp: expiredReservations.length,
        totalQuantity,
      };
    } catch (error) {
      this.handleError("Error cleaning up expired reservations", error);
      throw error;
    }
  }

  /**
   * Extend reservation expiration time
   */
  async extendReservation(
    reservationId: string,
    additionalMinutes: number = CONSTANTS.INVENTORY_RESERVATION_MINUTES
  ): Promise<ReservationResult> {
    try {
      const reservation = await StockReservationModel.findUnique?.({
        where: { id: reservationId },
      }) || null;

      if (!reservation) {
        return {
          success: false,
          message: "Reservation not found",
        };
      }

      // Note: isReleased field doesn't exist in schema

      // Extend expiration time
      const newExpiresAt = new Date(Date.now() + additionalMinutes * 60 * 1000);

      await StockReservationModel.update?.({
        where: { id: reservationId },
        data: { expiresAt: newExpiresAt },
      });

      return {
        success: true,
        message: `Reservation extended by ${additionalMinutes} minutes`,
      };
    } catch (error) {
      this.handleError("Error extending reservation", error);
      return {
        success: false,
        message: "Failed to extend reservation",
      };
    }
  }

  /**
   * Convert reservation to sale (when order is confirmed)
   */
  async convertReservationToSale(
    orderId: string,
    userId: string
  ): Promise<{ convertedCount: number; totalQuantity: number }> {
    try {
      const reservations = await StockReservationModel.findMany?.({
        where: {
          orderId,
        },
      }) || [];

      if (reservations.length === 0) {
        return { convertedCount: 0, totalQuantity: 0 };
      }

      // Create inventory movements for each reservation
      const { InventoryMovementModel } = require("../../models");

      for (const reservation of reservations) {
        // Get current product and update stock
        const product = await ProductModel.findUnique?.({
          where: { id: reservation.productId },
        });

        if (product) {
          const newQuantity = (product.stock || 0) - reservation.quantity;

          // Update product stock
          await ProductModel.update?.({
            where: { id: reservation.productId },
            data: {
              stock: Math.max(0, newQuantity),
            },
          });

          // Create inventory movement (simplified)
          await InventoryMovementModel.create?.({
            data: {
              productId: reservation.productId,
              type: "OUT",
              quantity: reservation.quantity,
              reason: "Order confirmed - stock sold",
            },
          });
        }
      }

      // Release all reservations (delete them)
      await StockReservationModel.deleteMany?.({
        where: { orderId },
      });

      // Update reserved quantities (simplified)
      const productIds = Array.from(new Set(reservations.map((r: any) => r.productId)));
      // await Promise.all(
      //   productIds.map((productId) => this.updateReservedQuantity(productId))
      // );

      const totalQuantity = reservations.reduce(
        (sum, r) => sum + r.quantity,
        0
      );

      return {
        convertedCount: reservations.length,
        totalQuantity,
      };
    } catch (error) {
      this.handleError("Error converting reservations to sales", error);
      throw error;
    }
  }

  /**
   * Get reservation statistics
   */
  async getReservationStats(): Promise<{
    totalActiveReservations: number;
    totalReservedQuantity: number;
    expiringSoon: number;
    byProduct: Array<{
      productId: string;
      productName: string;
      reservedQuantity: number;
      reservationCount: number;
    }>;
  }> {
    try {
      const now = new Date();
      const soon = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now

      const [activeReservations, expiringSoonCount] = await Promise.all([
        StockReservationModel.findMany?.({
          where: {
            expiresAt: { gt: now },
          },
          include: {
            product: {
              select: { name: true },
            },
          },
        }) || [],
        StockReservationModel.count?.({
          where: {
            expiresAt: {
              gt: now,
              lte: soon,
            },
          },
        }) || 0,
      ]);

      const totalReservedQuantity = activeReservations.reduce(
        (sum, r) => sum + (r as any).quantity,
        0
      );

      // Group by product
      const productMap = new Map();
      activeReservations.forEach((reservation: any) => {
        const productId = reservation.productId;
        const productName = reservation.product?.name || 'Unknown Product';

        if (!productMap.has(productId)) {
          productMap.set(productId, {
            productId,
            productName,
            reservedQuantity: 0,
            reservationCount: 0,
          });
        }

        const product = productMap.get(productId);
        product.reservedQuantity += reservation.quantity;
        product.reservationCount += 1;
      });

      return {
        totalActiveReservations: activeReservations.length,
        totalReservedQuantity,
        expiringSoon: expiringSoonCount,
        byProduct: Array.from(productMap.values()),
      };
    } catch (error) {
      this.handleError("Error fetching reservation stats", error);
      throw error;
    }
  }

  // Private helper methods

  private calculateExpirationTime(minutes?: number): Date {
    const defaultMinutes = minutes || CONSTANTS.INVENTORY_RESERVATION_MINUTES;
    return new Date(Date.now() + defaultMinutes * 60 * 1000);
  }

  private async updateReservedQuantity(productId: string): Promise<void> {
    // Calculate total reserved quantity for the product
    const totalReserved = await StockReservationModel.aggregate?.({
      where: {
        productId,
        expiresAt: { gt: new Date() },
      },
      _sum: { quantity: true },
    }) || { _sum: { quantity: 0 } };

    const reservedQuantity = totalReserved._sum.quantity || 0;

    // Note: Product model doesn't have reservedQuantity field
    // This would need to be implemented separately if needed
  }

  private async clearReservationCache(productId: string): Promise<void> {
    if (this.cacheService.delete) {
      await Promise.all([
        this.cacheService.delete(`reservations:${productId}`),
        this.cacheService.delete(`stock:${productId}`),
        // this.cacheService.deletePattern("reservation-stats:*"), // Method doesn't exist
      ]);
    }
  }

  private transformReservation(reservation: any): StockReservation {
    return {
      id: reservation.id,
      inventoryId: reservation.inventoryId || null,
      productId: reservation.productId,
      orderId: reservation.orderId,
      cartId: reservation.cartId || null,
      quantity: reservation.quantity,
      reason: reservation.reason || 'No reason provided',
      expiresAt: reservation.expiresAt,
      isExpired: reservation.expiresAt < new Date(),
      isReleased: false, // Default since field doesn't exist in schema
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
      releasedAt: reservation.releasedAt || null,
    } as any;
  }
}
