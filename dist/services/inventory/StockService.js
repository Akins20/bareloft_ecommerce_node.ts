"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockService = void 0;
const BaseService_1 = require("../BaseService");
const models_1 = require("../../models");
const types_1 = require("../../types");
const client_1 = require("@prisma/client");
class StockService extends BaseService_1.BaseService {
    inventoryRepository;
    cacheService;
    notificationService;
    constructor(inventoryRepository, cacheService, notificationService) {
        super();
        this.inventoryRepository = inventoryRepository;
        this.cacheService = cacheService;
        this.notificationService = notificationService;
    }
    /**
     * Check stock availability for a single product
     */
    async checkStockAvailability(productId, requestedQuantity = 1) {
        try {
            const product = await models_1.ProductModel.findUnique({
                where: { id: productId },
                select: {
                    id: true,
                    name: true,
                    isActive: true,
                    stock: true,
                    lowStockThreshold: true,
                    trackQuantity: true,
                },
            });
            if (!product) {
                return {
                    productId,
                    available: false,
                    currentStock: 0,
                    reservedStock: 0,
                    availableStock: 0,
                    isLowStock: true,
                    isOutOfStock: true,
                };
            }
            // Calculate reserved stock from active reservations
            const reservedStock = await this.getReservedStock(productId);
            const availableStock = product.stock - reservedStock;
            const isLowStock = product.stock <= product.lowStockThreshold;
            const isOutOfStock = product.stock === 0;
            return {
                productId,
                available: availableStock >= requestedQuantity && product.isActive && product.trackQuantity,
                currentStock: product.stock,
                reservedStock,
                availableStock,
                isLowStock,
                isOutOfStock,
            };
        }
        catch (error) {
            this.handleError("Error checking stock availability", error);
            throw error;
        }
    }
    /**
     * Check stock availability for multiple products
     */
    async bulkCheckStockAvailability(requests) {
        try {
            const productIds = requests.map((req) => req.productId);
            const products = await models_1.ProductModel.findMany({
                where: {
                    id: { in: productIds },
                },
                select: {
                    id: true,
                    isActive: true,
                    stock: true,
                    trackQuantity: true,
                },
            });
            const productMap = new Map(products.map((product) => [product.id, product]));
            return await Promise.all(requests.map(async (request) => {
                const product = productMap.get(request.productId);
                if (!product) {
                    return {
                        productId: request.productId,
                        available: false,
                        availableQuantity: 0,
                        requestedQuantity: request.requestedQuantity,
                        shortfall: request.requestedQuantity,
                    };
                }
                const reservedStock = await this.getReservedStock(request.productId);
                const availableQuantity = product.stock - reservedStock;
                const available = availableQuantity >= request.requestedQuantity &&
                    product.isActive &&
                    product.trackQuantity;
                const result = {
                    productId: request.productId,
                    available,
                    availableQuantity,
                    requestedQuantity: request.requestedQuantity,
                };
                if (!available && availableQuantity < request.requestedQuantity) {
                    result.shortfall = request.requestedQuantity - availableQuantity;
                }
                return result;
            }));
        }
        catch (error) {
            this.handleError("Error in bulk stock availability check", error);
            throw error;
        }
    }
    /**
     * Update stock levels with movement tracking
     */
    async updateStock(data) {
        try {
            const product = await models_1.ProductModel.findUnique({
                where: { id: data.productId },
                select: {
                    id: true,
                    stock: true,
                    costPrice: true,
                    trackQuantity: true,
                    lowStockThreshold: true,
                },
            });
            if (!product) {
                throw new types_1.AppError("Product not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            const previousQuantity = product.stock;
            let newQuantity;
            // Calculate new quantity based on movement type
            if (this.isInboundMovement(data.type)) {
                newQuantity = previousQuantity + data.quantity;
            }
            else if (this.isOutboundMovement(data.type)) {
                newQuantity = Math.max(0, previousQuantity - data.quantity);
                // Check if we have enough stock
                const reservedStock = await this.getReservedStock(data.productId);
                const availableStock = product.stock - reservedStock;
                if (availableStock < data.quantity) {
                    throw new types_1.AppError("Insufficient stock available", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.INSUFFICIENT_STOCK);
                }
            }
            else {
                // For adjustments, set directly
                newQuantity = data.quantity;
            }
            // Update product stock
            const updatedProduct = await models_1.ProductModel.update({
                where: { id: data.productId },
                data: {
                    stock: newQuantity,
                    costPrice: data.unitCost || product.costPrice,
                    updatedAt: new Date(),
                },
            });
            // Create movement record
            await models_1.InventoryMovementModel.create({
                data: {
                    productId: data.productId,
                    type: data.type,
                    quantity: data.quantity,
                    reference: data.reference,
                    reason: data.reason,
                },
            });
            // Check for alerts
            await this.checkStockAlerts({
                productId: data.productId,
                stock: newQuantity,
                lowStockThreshold: product.lowStockThreshold,
            });
            // Clear cache
            await this.clearStockCache(data.productId);
        }
        catch (error) {
            this.handleError("Error updating stock", error);
            throw error;
        }
    }
    /**
     * Get current stock levels for multiple products
     */
    async getCurrentStockLevels(productIds) {
        try {
            const products = await models_1.ProductModel.findMany({
                where: {
                    id: { in: productIds },
                },
                select: {
                    id: true,
                    stock: true,
                },
            });
            const stockLevels = new Map();
            for (const product of products) {
                const reservedStock = await this.getReservedStock(product.id);
                const availableStock = product.stock - reservedStock;
                stockLevels.set(product.id, availableStock);
            }
            // For products not found, set stock to 0
            productIds.forEach((productId) => {
                if (!stockLevels.has(productId)) {
                    stockLevels.set(productId, 0);
                }
            });
            return stockLevels;
        }
        catch (error) {
            this.handleError("Error getting current stock levels", error);
            throw error;
        }
    }
    /**
     * Decrease stock (for sales/orders)
     */
    async decreaseStock(productId, quantity, orderId, userId) {
        await this.updateStock({
            productId,
            quantity,
            type: client_1.MovementType.OUT,
            reason: "Product sold",
            reference: "order",
            referenceId: orderId,
            userId,
        });
    }
    /**
     * Increase stock (for restocking)
     */
    async increaseStock(productId, quantity, unitCost, reason, userId) {
        await this.updateStock({
            productId,
            quantity,
            type: client_1.MovementType.IN,
            reason,
            unitCost,
            userId,
        });
    }
    /**
     * Handle returns (increase stock)
     */
    async handleReturn(productId, quantity, orderId, userId) {
        await this.updateStock({
            productId,
            quantity,
            type: client_1.MovementType.IN,
            reason: "Customer return",
            reference: "order",
            referenceId: orderId,
            userId,
        });
    }
    /**
     * Mark stock as damaged (decrease without sale)
     */
    async markAsDamaged(productId, quantity, reason, userId) {
        await this.updateStock({
            productId,
            quantity,
            type: client_1.MovementType.OUT,
            reason,
            userId,
        });
    }
    /**
     * Transfer stock between locations (future feature)
     */
    async transferStock(productId, quantity, fromLocation, toLocation, userId) {
        // For now, just create movement records
        // In the future, this would handle multi-warehouse scenarios
        await this.updateStock({
            productId,
            quantity,
            type: client_1.MovementType.OUT,
            reason: `Transfer from ${fromLocation} to ${toLocation}`,
            userId,
        });
    }
    /**
     * Get stock movement history for a product
     */
    async getStockMovementHistory(productId, limit = 50) {
        try {
            const movements = await models_1.InventoryMovementModel.findMany({
                where: { productId },
                orderBy: { createdAt: "desc" },
                take: limit,
            });
            return movements.map((movement) => ({
                id: movement.id,
                type: movement.type,
                quantity: movement.quantity,
                reason: movement.reason,
                reference: movement.reference,
                createdAt: movement.createdAt,
            }));
        }
        catch (error) {
            this.handleError("Error fetching stock movement history", error);
            throw error;
        }
    }
    /**
     * Get low stock products
     */
    async getLowStockProducts() {
        try {
            const cacheKey = "low-stock-products";
            const cached = await this.cacheService.get(cacheKey);
            if (cached)
                return cached;
            const lowStockProducts = await models_1.ProductModel.findMany({
                where: {
                    AND: [
                        { trackQuantity: true },
                        { isActive: true },
                        { stock: { gt: 0 } },
                    ],
                },
                include: {
                    category: {
                        select: { name: true },
                    },
                },
                orderBy: {
                    stock: "asc",
                },
            });
            // Filter products where stock <= lowStockThreshold
            const lowStockFiltered = lowStockProducts.filter(product => product.stock <= product.lowStockThreshold);
            const result = lowStockFiltered.map((product) => ({
                productId: product.id,
                productName: product.name,
                sku: product.sku,
                currentStock: product.stock,
                threshold: product.lowStockThreshold,
                category: product.category.name,
                stockPercentage: Math.round((product.stock / product.lowStockThreshold) * 100),
                urgency: this.calculateUrgency(product.stock, product.lowStockThreshold),
            }));
            // Cache for 15 minutes
            await this.cacheService.set(cacheKey, result, { ttl: 900 });
            return result;
        }
        catch (error) {
            this.handleError("Error fetching low stock products", error);
            throw error;
        }
    }
    /**
     * Get out of stock products
     */
    async getOutOfStockProducts() {
        try {
            const outOfStockProducts = await models_1.ProductModel.findMany({
                where: {
                    stock: 0,
                    trackQuantity: true,
                    isActive: true,
                },
                include: {
                    category: {
                        select: { name: true },
                    },
                },
            });
            return outOfStockProducts.map((product) => ({
                productId: product.id,
                productName: product.name,
                sku: product.sku,
                category: product.category.name,
                // Note: These fields don't exist in Product model
                lastRestockedAt: null,
                lastSoldAt: null,
            }));
        }
        catch (error) {
            this.handleError("Error fetching out of stock products", error);
            throw error;
        }
    }
    // Private helper methods
    async getReservedStock(productId) {
        // Import StockReservationModel locally to avoid circular imports
        const { StockReservationModel } = await Promise.resolve().then(() => __importStar(require("../../models")));
        const reservations = await StockReservationModel.findMany({
            where: {
                productId,
                expiresAt: { gt: new Date() },
            },
            select: {
                quantity: true,
            },
        });
        return reservations.reduce((total, reservation) => total + reservation.quantity, 0);
    }
    isInboundMovement(type) {
        return type === client_1.MovementType.IN;
    }
    isOutboundMovement(type) {
        return type === client_1.MovementType.OUT;
    }
    async checkStockAlerts(product) {
        // Low stock alert
        if (product.stock <= product.lowStockThreshold &&
            product.stock > 0) {
            await this.sendLowStockAlert(product);
        }
        // Out of stock alert
        if (product.stock === 0) {
            await this.sendOutOfStockAlert(product);
        }
    }
    async sendLowStockAlert(product) {
        await this.notificationService.sendNotification({
            type: "PRODUCT_ALERT",
            channel: "EMAIL",
            recipient: {
                email: "inventory@bareloft.com",
            },
            variables: {
                productId: product.productId,
                currentStock: product.stock,
                threshold: product.lowStockThreshold,
            },
        });
    }
    async sendOutOfStockAlert(product) {
        await this.notificationService.sendNotification({
            type: "PRODUCT_ALERT",
            channel: "EMAIL",
            recipient: {
                email: "inventory@bareloft.com",
            },
            variables: {
                productId: product.productId,
            },
        });
    }
    calculateUrgency(currentStock, threshold) {
        if (currentStock === 0)
            return "critical";
        const ratio = currentStock / threshold;
        if (ratio <= 0.25)
            return "high";
        if (ratio <= 0.5)
            return "medium";
        return "low";
    }
    async clearStockCache(productId) {
        await Promise.all([
            this.cacheService.delete(`stock:${productId}`),
            this.cacheService.delete("low-stock-products"),
        ]);
    }
}
exports.StockService = StockService;
//# sourceMappingURL=StockService.js.map