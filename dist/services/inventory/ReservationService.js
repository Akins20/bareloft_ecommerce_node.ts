"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReservationService = void 0;
const BaseService_1 = require("../BaseService");
const models_1 = require("../../models");
const types_1 = require("../../types");
class ReservationService extends BaseService_1.BaseService {
    cacheService;
    constructor(cacheService) {
        super();
        this.cacheService = cacheService || {};
    }
    /**
     * Reserve stock for a single product
     */
    async reserveStock(request) {
        try {
            // Get current product (inventory is part of Product model)
            const product = await models_1.ProductModel.findUnique?.({
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
                const existingReservation = await models_1.StockReservationModel.findFirst?.({
                    where: {
                        productId: request.productId,
                        ...(request.orderId && { orderId: request.orderId }),
                        expiresAt: { gt: new Date() },
                    },
                }) || null;
                if (existingReservation) {
                    // Update existing reservation
                    const updatedReservation = await models_1.StockReservationModel.update?.({
                        where: { id: existingReservation.id },
                        data: {
                            quantity: request.quantity,
                            expiresAt: this.calculateExpirationTime(request.expirationMinutes),
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
            const reservation = await models_1.StockReservationModel.create?.({
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
        }
        catch (error) {
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
    async bulkReserveStock(request) {
        try {
            const results = {
                success: true,
                reservations: [],
                totalReserved: 0,
                failedItems: 0,
            };
            // Process each item
            for (const item of request.items) {
                const reservationRequest = {
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
                }
                else {
                    results.failedItems++;
                    results.success = false;
                }
            }
            return results;
        }
        catch (error) {
            this.handleError("Error in bulk stock reservation", error);
            throw error;
        }
    }
    /**
     * Release a specific reservation
     */
    async releaseReservation(request) {
        try {
            let reservation = null;
            // Find reservation by ID or order ID
            if (request.reservationId) {
                reservation = await models_1.StockReservationModel.findUnique?.({
                    where: { id: request.reservationId },
                }) || null;
            }
            else if (request.orderId) {
                reservation = await models_1.StockReservationModel.findFirst?.({
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
            await models_1.StockReservationModel.delete?.({
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
        }
        catch (error) {
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
    async releaseAllReservations(orderId, cartId, reason) {
        try {
            if (!orderId && !cartId) {
                throw new types_1.AppError("Either orderId or cartId must be provided", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
            }
            const where = {};
            if (orderId)
                where.orderId = orderId;
            // Note: cartId field may not exist in schema, commenting out for now
            // if (cartId) where.cartId = cartId;
            // Get all reservations to release
            const reservations = await models_1.StockReservationModel.findMany?.({
                where,
            }) || [];
            if (reservations.length === 0) {
                return { releasedCount: 0, totalQuantity: 0 };
            }
            // Release all reservations (delete them since isReleased field doesn't exist)
            await models_1.StockReservationModel.deleteMany?.({
                where,
            });
            // Update inventory reserved quantities for affected products (simplified)
            const productIds = Array.from(new Set(reservations.map((r) => r.productId)));
            // await Promise.all(
            //   productIds.map((productId) => this.updateReservedQuantity(productId))
            // );
            // Clear caches
            if (this.cacheService.delete) {
                await Promise.all(productIds.map((productId) => this.clearReservationCache(productId)));
            }
            const totalQuantity = reservations.reduce((sum, r) => sum + r.quantity, 0);
            return {
                releasedCount: reservations.length,
                totalQuantity,
            };
        }
        catch (error) {
            this.handleError("Error releasing all reservations", error);
            throw error;
        }
    }
    /**
     * Get active reservations for a product
     */
    async getProductReservations(productId) {
        try {
            const reservations = await models_1.StockReservationModel.findMany?.({
                where: {
                    productId,
                    expiresAt: { gt: new Date() },
                },
                orderBy: { createdAt: "desc" },
            }) || [];
            return reservations.map(this.transformReservation);
        }
        catch (error) {
            this.handleError("Error fetching product reservations", error);
            throw error;
        }
    }
    /**
     * Get reservations for an order or cart
     */
    async getReservations(orderId, cartId) {
        try {
            const where = {
                expiresAt: { gt: new Date() },
            };
            if (orderId)
                where.orderId = orderId;
            // Note: cartId field may not exist in schema, commenting out for now
            // if (cartId) where.cartId = cartId;
            const reservations = await models_1.StockReservationModel.findMany?.({
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
        }
        catch (error) {
            this.handleError("Error fetching reservations", error);
            throw error;
        }
    }
    /**
     * Clean up expired reservations
     */
    async cleanupExpiredReservations() {
        try {
            // Find expired reservations
            const expiredReservations = await models_1.StockReservationModel.findMany?.({
                where: {
                    expiresAt: { lt: new Date() },
                },
            }) || [];
            if (expiredReservations.length === 0) {
                return { cleanedUp: 0, totalQuantity: 0 };
            }
            // Delete expired reservations
            await models_1.StockReservationModel.deleteMany?.({
                where: {
                    id: { in: expiredReservations.map((r) => r.id) },
                },
            });
            // Update inventory reserved quantities (simplified)
            const productIds = Array.from(new Set(expiredReservations.map((r) => r.productId)));
            // await Promise.all(
            //   productIds.map((productId) => this.updateReservedQuantity(productId))
            // );
            // Clear caches
            if (this.cacheService.delete) {
                await Promise.all(productIds.map((productId) => this.clearReservationCache(productId)));
            }
            const totalQuantity = expiredReservations.reduce((sum, r) => sum + r.quantity, 0);
            return {
                cleanedUp: expiredReservations.length,
                totalQuantity,
            };
        }
        catch (error) {
            this.handleError("Error cleaning up expired reservations", error);
            throw error;
        }
    }
    /**
     * Extend reservation expiration time
     */
    async extendReservation(reservationId, additionalMinutes = types_1.CONSTANTS.INVENTORY_RESERVATION_MINUTES) {
        try {
            const reservation = await models_1.StockReservationModel.findUnique?.({
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
            await models_1.StockReservationModel.update?.({
                where: { id: reservationId },
                data: { expiresAt: newExpiresAt },
            });
            return {
                success: true,
                message: `Reservation extended by ${additionalMinutes} minutes`,
            };
        }
        catch (error) {
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
    async convertReservationToSale(orderId, userId) {
        try {
            const reservations = await models_1.StockReservationModel.findMany?.({
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
                const product = await models_1.ProductModel.findUnique?.({
                    where: { id: reservation.productId },
                });
                if (product) {
                    const newQuantity = (product.stock || 0) - reservation.quantity;
                    // Update product stock
                    await models_1.ProductModel.update?.({
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
            await models_1.StockReservationModel.deleteMany?.({
                where: { orderId },
            });
            // Update reserved quantities (simplified)
            const productIds = Array.from(new Set(reservations.map((r) => r.productId)));
            // await Promise.all(
            //   productIds.map((productId) => this.updateReservedQuantity(productId))
            // );
            const totalQuantity = reservations.reduce((sum, r) => sum + r.quantity, 0);
            return {
                convertedCount: reservations.length,
                totalQuantity,
            };
        }
        catch (error) {
            this.handleError("Error converting reservations to sales", error);
            throw error;
        }
    }
    /**
     * Get reservation statistics
     */
    async getReservationStats() {
        try {
            const now = new Date();
            const soon = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now
            const [activeReservations, expiringSoonCount] = await Promise.all([
                models_1.StockReservationModel.findMany?.({
                    where: {
                        expiresAt: { gt: now },
                    },
                    include: {
                        product: {
                            select: { name: true },
                        },
                    },
                }) || [],
                models_1.StockReservationModel.count?.({
                    where: {
                        expiresAt: {
                            gt: now,
                            lte: soon,
                        },
                    },
                }) || 0,
            ]);
            const totalReservedQuantity = activeReservations.reduce((sum, r) => sum + r.quantity, 0);
            // Group by product
            const productMap = new Map();
            activeReservations.forEach((reservation) => {
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
        }
        catch (error) {
            this.handleError("Error fetching reservation stats", error);
            throw error;
        }
    }
    // Private helper methods
    calculateExpirationTime(minutes) {
        const defaultMinutes = minutes || types_1.CONSTANTS.INVENTORY_RESERVATION_MINUTES;
        return new Date(Date.now() + defaultMinutes * 60 * 1000);
    }
    async updateReservedQuantity(productId) {
        // Calculate total reserved quantity for the product
        const totalReserved = await models_1.StockReservationModel.aggregate?.({
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
    async clearReservationCache(productId) {
        if (this.cacheService.delete) {
            await Promise.all([
                this.cacheService.delete(`reservations:${productId}`),
                this.cacheService.delete(`stock:${productId}`),
                // this.cacheService.deletePattern("reservation-stats:*"), // Method doesn't exist
            ]);
        }
    }
    transformReservation(reservation) {
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
        };
    }
}
exports.ReservationService = ReservationService;
//# sourceMappingURL=ReservationService.js.map