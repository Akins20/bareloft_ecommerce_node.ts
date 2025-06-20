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
        this.cacheService = cacheService;
    }
    /**
     * Reserve stock for a single product
     */
    async reserveStock(request) {
        try {
            // Get current inventory
            const inventory = await models_1.InventoryModel.findUnique({
                where: { productId: request.productId },
                include: {
                    product: {
                        select: {
                            name: true,
                            isActive: true,
                        },
                    },
                },
            });
            if (!inventory) {
                return {
                    success: false,
                    message: "Product inventory not found",
                    availableQuantity: 0,
                };
            }
            if (!inventory.product.isActive) {
                return {
                    success: false,
                    message: "Product is not available",
                    availableQuantity: 0,
                };
            }
            // Calculate available stock
            const availableStock = inventory.quantity - inventory.reservedQuantity;
            if (availableStock < request.quantity) {
                return {
                    success: false,
                    message: `Insufficient stock. Available: ${availableStock}, Requested: ${request.quantity}`,
                    availableQuantity: availableStock,
                };
            }
            // Check for existing reservations for the same cart/order
            if (request.cartId || request.orderId) {
                const existingReservation = await models_1.StockReservationModel.findFirst({
                    where: {
                        productId: request.productId,
                        ...(request.cartId && { cartId: request.cartId }),
                        ...(request.orderId && { orderId: request.orderId }),
                        isReleased: false,
                        expiresAt: { gt: new Date() },
                    },
                });
                if (existingReservation) {
                    // Update existing reservation
                    const updatedReservation = await models_1.StockReservationModel.update({
                        where: { id: existingReservation.id },
                        data: {
                            quantity: request.quantity,
                            expiresAt: this.calculateExpirationTime(request.expirationMinutes),
                            reason: request.reason,
                        },
                    });
                    // Update inventory reserved quantity
                    await this.updateReservedQuantity(request.productId);
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
            const reservation = await models_1.StockReservationModel.create({
                data: {
                    inventoryId: inventory.id,
                    productId: request.productId,
                    orderId: request.orderId,
                    cartId: request.cartId,
                    quantity: request.quantity,
                    reason: request.reason,
                    expiresAt,
                    isReleased: false,
                },
            });
            // Update inventory reserved quantity
            await this.updateReservedQuantity(request.productId);
            // Clear cache
            await this.clearReservationCache(request.productId);
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
            // Find reservation by ID, order ID, or cart ID
            if (request.reservationId) {
                reservation = await models_1.StockReservationModel.findUnique({
                    where: { id: request.reservationId },
                });
            }
            else if (request.orderId) {
                reservation = await models_1.StockReservationModel.findFirst({
                    where: {
                        orderId: request.orderId,
                        isReleased: false,
                    },
                });
            }
            else if (request.cartId) {
                reservation = await models_1.StockReservationModel.findFirst({
                    where: {
                        cartId: request.cartId,
                        isReleased: false,
                    },
                });
            }
            if (!reservation) {
                return {
                    success: false,
                    message: "Reservation not found or already released",
                };
            }
            if (reservation.isReleased) {
                return {
                    success: false,
                    message: "Reservation has already been released",
                };
            }
            // Release the reservation
            await models_1.StockReservationModel.update({
                where: { id: reservation.id },
                data: {
                    isReleased: true,
                    releasedAt: new Date(),
                },
            });
            // Update inventory reserved quantity
            await this.updateReservedQuantity(reservation.productId);
            // Clear cache
            await this.clearReservationCache(reservation.productId);
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
            const where = {
                isReleased: false,
            };
            if (orderId)
                where.orderId = orderId;
            if (cartId)
                where.cartId = cartId;
            // Get all reservations to release
            const reservations = await models_1.StockReservationModel.findMany({
                where,
            });
            if (reservations.length === 0) {
                return { releasedCount: 0, totalQuantity: 0 };
            }
            // Release all reservations
            await models_1.StockReservationModel.updateMany({
                where,
                data: {
                    isReleased: true,
                    releasedAt: new Date(),
                },
            });
            // Update inventory reserved quantities for affected products
            const productIds = [...new Set(reservations.map((r) => r.productId))];
            await Promise.all(productIds.map((productId) => this.updateReservedQuantity(productId)));
            // Clear caches
            await Promise.all(productIds.map((productId) => this.clearReservationCache(productId)));
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
            const reservations = await models_1.StockReservationModel.findMany({
                where: {
                    productId,
                    isReleased: false,
                    expiresAt: { gt: new Date() },
                },
                orderBy: { createdAt: "desc" },
            });
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
                isReleased: false,
                expiresAt: { gt: new Date() },
            };
            if (orderId)
                where.orderId = orderId;
            if (cartId)
                where.cartId = cartId;
            const reservations = await models_1.StockReservationModel.findMany({
                where,
                include: {
                    inventory: {
                        include: {
                            product: {
                                select: {
                                    name: true,
                                    sku: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            });
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
            const expiredReservations = await models_1.StockReservationModel.findMany({
                where: {
                    isReleased: false,
                    expiresAt: { lt: new Date() },
                },
            });
            if (expiredReservations.length === 0) {
                return { cleanedUp: 0, totalQuantity: 0 };
            }
            // Mark as released
            await models_1.StockReservationModel.updateMany({
                where: {
                    id: { in: expiredReservations.map((r) => r.id) },
                },
                data: {
                    isReleased: true,
                    releasedAt: new Date(),
                },
            });
            // Update inventory reserved quantities
            const productIds = [
                ...new Set(expiredReservations.map((r) => r.productId)),
            ];
            await Promise.all(productIds.map((productId) => this.updateReservedQuantity(productId)));
            // Clear caches
            await Promise.all(productIds.map((productId) => this.clearReservationCache(productId)));
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
            const reservation = await models_1.StockReservationModel.findUnique({
                where: { id: reservationId },
            });
            if (!reservation) {
                return {
                    success: false,
                    message: "Reservation not found",
                };
            }
            if (reservation.isReleased) {
                return {
                    success: false,
                    message: "Cannot extend released reservation",
                };
            }
            // Extend expiration time
            const newExpiresAt = new Date(Date.now() + additionalMinutes * 60 * 1000);
            await models_1.StockReservationModel.update({
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
            const reservations = await models_1.StockReservationModel.findMany({
                where: {
                    orderId,
                    isReleased: false,
                },
            });
            if (reservations.length === 0) {
                return { convertedCount: 0, totalQuantity: 0 };
            }
            // Create inventory movements for each reservation
            const { InventoryMovementModel } = require("../../models");
            for (const reservation of reservations) {
                // Get current inventory
                const inventory = await models_1.InventoryModel.findUnique({
                    where: { productId: reservation.productId },
                });
                if (inventory) {
                    const newQuantity = inventory.quantity - reservation.quantity;
                    // Update inventory quantity
                    await models_1.InventoryModel.update({
                        where: { productId: reservation.productId },
                        data: {
                            quantity: Math.max(0, newQuantity),
                            lastSoldAt: new Date(),
                        },
                    });
                    // Create inventory movement
                    await InventoryMovementModel.create({
                        data: {
                            inventoryId: inventory.id,
                            productId: reservation.productId,
                            type: "SALE",
                            quantity: reservation.quantity,
                            previousQuantity: inventory.quantity,
                            newQuantity: Math.max(0, newQuantity),
                            referenceType: "order",
                            referenceId: orderId,
                            reason: "Order confirmed - stock sold",
                            createdBy: userId,
                        },
                    });
                }
            }
            // Release all reservations
            await models_1.StockReservationModel.updateMany({
                where: { orderId },
                data: {
                    isReleased: true,
                    releasedAt: new Date(),
                },
            });
            // Update reserved quantities
            const productIds = [...new Set(reservations.map((r) => r.productId))];
            await Promise.all(productIds.map((productId) => this.updateReservedQuantity(productId)));
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
                models_1.StockReservationModel.findMany({
                    where: {
                        isReleased: false,
                        expiresAt: { gt: now },
                    },
                    include: {
                        inventory: {
                            include: {
                                product: {
                                    select: { name: true },
                                },
                            },
                        },
                    },
                }),
                models_1.StockReservationModel.count({
                    where: {
                        isReleased: false,
                        expiresAt: {
                            gt: now,
                            lte: soon,
                        },
                    },
                }),
            ]);
            const totalReservedQuantity = activeReservations.reduce((sum, r) => sum + r.quantity, 0);
            // Group by product
            const productMap = new Map();
            activeReservations.forEach((reservation) => {
                const productId = reservation.productId;
                const productName = reservation.inventory.product.name;
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
        const totalReserved = await models_1.StockReservationModel.aggregate({
            where: {
                productId,
                isReleased: false,
                expiresAt: { gt: new Date() },
            },
            _sum: { quantity: true },
        });
        const reservedQuantity = totalReserved._sum.quantity || 0;
        // Update inventory
        await models_1.InventoryModel.update({
            where: { productId },
            data: { reservedQuantity },
        });
    }
    async clearReservationCache(productId) {
        await Promise.all([
            this.cacheService.delete(`reservations:${productId}`),
            this.cacheService.delete(`stock:${productId}`),
            this.cacheService.deletePattern("reservation-stats:*"),
        ]);
    }
    transformReservation(reservation) {
        return {
            id: reservation.id,
            inventoryId: reservation.inventoryId,
            productId: reservation.productId,
            orderId: reservation.orderId,
            cartId: reservation.cartId,
            quantity: reservation.quantity,
            reason: reservation.reason,
            expiresAt: reservation.expiresAt,
            isExpired: reservation.expiresAt < new Date(),
            isReleased: reservation.isReleased,
            createdAt: reservation.createdAt,
            releasedAt: reservation.releasedAt,
        };
    }
}
exports.ReservationService = ReservationService;
//# sourceMappingURL=ReservationService.js.map