"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockService = void 0;
const BaseService_1 = require("../BaseService");
const models_1 = require("../../models");
const types_1 = require("../../types");
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
            const inventory = await models_1.InventoryModel.findUnique({
                where: { productId },
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
                // Create default inventory record if not exists
                await this.createDefaultInventory(productId);
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
            const availableStock = inventory.quantity - inventory.reservedQuantity;
            const isLowStock = inventory.quantity <= inventory.lowStockThreshold;
            const isOutOfStock = inventory.quantity === 0;
            return {
                productId,
                available: availableStock >= requestedQuantity && inventory.product.isActive,
                currentStock: inventory.quantity,
                reservedStock: inventory.reservedQuantity,
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
            const inventories = await models_1.InventoryModel.findMany({
                where: {
                    productId: { in: productIds },
                },
                include: {
                    product: {
                        select: {
                            isActive: true,
                        },
                    },
                },
            });
            const inventoryMap = new Map(inventories.map((inv) => [inv.productId, inv]));
            return requests.map((request) => {
                const inventory = inventoryMap.get(request.productId);
                if (!inventory) {
                    return {
                        productId: request.productId,
                        available: false,
                        availableQuantity: 0,
                        requestedQuantity: request.requestedQuantity,
                        shortfall: request.requestedQuantity,
                    };
                }
                const availableQuantity = inventory.quantity - inventory.reservedQuantity;
                const available = availableQuantity >= request.requestedQuantity &&
                    inventory.product.isActive;
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
            });
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
            const inventory = await models_1.InventoryModel.findUnique({
                where: { productId: data.productId },
            });
            if (!inventory) {
                throw new types_1.AppError("Inventory record not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            const previousQuantity = inventory.quantity;
            let newQuantity;
            // Calculate new quantity based on movement type
            if (this.isInboundMovement(data.type)) {
                newQuantity = previousQuantity + data.quantity;
            }
            else if (this.isOutboundMovement(data.type)) {
                newQuantity = Math.max(0, previousQuantity - data.quantity);
                // Check if we have enough stock
                const availableStock = inventory.quantity - inventory.reservedQuantity;
                if (availableStock < data.quantity) {
                    throw new types_1.AppError("Insufficient stock available", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.INSUFFICIENT_STOCK);
                }
            }
            else {
                // For adjustments, set directly
                newQuantity = data.quantity;
            }
            // Update inventory
            const updatedInventory = await models_1.InventoryModel.update({
                where: { productId: data.productId },
                data: {
                    quantity: newQuantity,
                    lastCost: data.unitCost || inventory.lastCost,
                    lastSoldAt: this.isOutboundMovement(data.type)
                        ? new Date()
                        : inventory.lastSoldAt,
                    lastRestockedAt: this.isInboundMovement(data.type)
                        ? new Date()
                        : inventory.lastRestockedAt,
                    updatedAt: new Date(),
                },
            });
            // Create movement record
            await models_1.InventoryMovementModel.create({
                data: {
                    inventoryId: inventory.id,
                    productId: data.productId,
                    type: data.type,
                    quantity: data.quantity,
                    previousQuantity,
                    newQuantity,
                    unitCost: data.unitCost,
                    totalCost: data.unitCost ? data.unitCost * data.quantity : undefined,
                    referenceType: data.reference,
                    referenceId: data.referenceId,
                    reason: data.reason,
                    createdBy: data.userId,
                },
            });
            // Update inventory status based on new quantity
            await this.updateInventoryStatus(data.productId, newQuantity, updatedInventory.lowStockThreshold);
            // Check for alerts
            await this.checkStockAlerts(updatedInventory);
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
            const inventories = await models_1.InventoryModel.findMany({
                where: {
                    productId: { in: productIds },
                },
                select: {
                    productId: true,
                    quantity: true,
                    reservedQuantity: true,
                },
            });
            const stockLevels = new Map();
            inventories.forEach((inventory) => {
                const availableStock = inventory.quantity - inventory.reservedQuantity;
                stockLevels.set(inventory.productId, availableStock);
            });
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
            type: "SALE",
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
            type: "RESTOCK",
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
            type: "RETURN",
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
            type: "DAMAGE",
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
            type: "TRANSFER_OUT",
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
                previousQuantity: movement.previousQuantity,
                newQuantity: movement.newQuantity,
                unitCost: movement.unitCost ? Number(movement.unitCost) : null,
                totalCost: movement.totalCost ? Number(movement.totalCost) : null,
                reason: movement.reason,
                referenceType: movement.referenceType,
                referenceId: movement.referenceId,
                createdAt: movement.createdAt,
                createdBy: movement.createdBy,
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
            const lowStockInventories = await models_1.InventoryModel.findMany({
                where: {
                    AND: [
                        { trackInventory: true },
                        { status: "ACTIVE" },
                        // Use a raw query for complex comparison
                        { quantity: { lte: { ref: "lowStockThreshold" } } },
                        { quantity: { gt: 0 } },
                    ],
                },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                            price: true,
                            category: {
                                select: { name: true },
                            },
                        },
                    },
                },
                orderBy: {
                    quantity: "asc",
                },
            });
            const result = lowStockInventories.map((inventory) => ({
                productId: inventory.productId,
                productName: inventory.product.name,
                sku: inventory.product.sku,
                currentStock: inventory.quantity,
                threshold: inventory.lowStockThreshold,
                category: inventory.product.category.name,
                stockPercentage: Math.round((inventory.quantity / inventory.lowStockThreshold) * 100),
                urgency: this.calculateUrgency(inventory.quantity, inventory.lowStockThreshold),
            }));
            // Cache for 15 minutes
            await this.cacheService.set(cacheKey, result, 900);
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
            const outOfStockInventories = await models_1.InventoryModel.findMany({
                where: {
                    quantity: 0,
                    trackInventory: true,
                    status: "ACTIVE",
                },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                            price: true,
                            category: {
                                select: { name: true },
                            },
                        },
                    },
                },
            });
            return outOfStockInventories.map((inventory) => ({
                productId: inventory.productId,
                productName: inventory.product.name,
                sku: inventory.product.sku,
                category: inventory.product.category.name,
                lastRestockedAt: inventory.lastRestockedAt,
                lastSoldAt: inventory.lastSoldAt,
            }));
        }
        catch (error) {
            this.handleError("Error fetching out of stock products", error);
            throw error;
        }
    }
    // Private helper methods
    async createDefaultInventory(productId) {
        await models_1.InventoryModel.create({
            data: {
                productId,
                quantity: 0,
                reservedQuantity: 0,
                lowStockThreshold: 10,
                reorderPoint: 5,
                reorderQuantity: 50,
                status: "ACTIVE",
                trackInventory: true,
                allowBackorder: false,
                averageCost: 0,
                lastCost: 0,
            },
        });
    }
    isInboundMovement(type) {
        return [
            "INITIAL_STOCK",
            "RESTOCK",
            "PURCHASE",
            "RETURN",
            "TRANSFER_IN",
            "ADJUSTMENT_IN",
            "RELEASE_RESERVE",
        ].includes(type);
    }
    isOutboundMovement(type) {
        return [
            "SALE",
            "TRANSFER_OUT",
            "DAMAGE",
            "THEFT",
            "EXPIRED",
            "ADJUSTMENT_OUT",
            "RESERVE",
        ].includes(type);
    }
    async updateInventoryStatus(productId, quantity, lowStockThreshold) {
        let status = "ACTIVE";
        if (quantity === 0) {
            status = "OUT_OF_STOCK";
        }
        else if (quantity <= lowStockThreshold) {
            status = "LOW_STOCK";
        }
        await models_1.InventoryModel.update({
            where: { productId },
            data: { status },
        });
    }
    async checkStockAlerts(inventory) {
        // Low stock alert
        if (inventory.quantity <= inventory.lowStockThreshold &&
            inventory.quantity > 0) {
            await this.sendLowStockAlert(inventory);
        }
        // Out of stock alert
        if (inventory.quantity === 0) {
            await this.sendOutOfStockAlert(inventory);
        }
        // Reorder point alert
        if (inventory.quantity <= inventory.reorderPoint) {
            await this.sendReorderAlert(inventory);
        }
    }
    async sendLowStockAlert(inventory) {
        await this.notificationService.sendNotification({
            type: "LOW_STOCK_ALERT",
            channel: "EMAIL",
            recipient: {
                email: "inventory@bareloft.com",
            },
            variables: {
                productId: inventory.productId,
                currentStock: inventory.quantity,
                threshold: inventory.lowStockThreshold,
            },
        });
    }
    async sendOutOfStockAlert(inventory) {
        await this.notificationService.sendNotification({
            type: "OUT_OF_STOCK_ALERT",
            channel: "EMAIL",
            recipient: {
                email: "inventory@bareloft.com",
            },
            variables: {
                productId: inventory.productId,
            },
        });
    }
    async sendReorderAlert(inventory) {
        await this.notificationService.sendNotification({
            type: "RESTOCK_NEEDED",
            channel: "EMAIL",
            recipient: {
                email: "purchasing@bareloft.com",
            },
            variables: {
                productId: inventory.productId,
                reorderQuantity: inventory.reorderQuantity,
                currentStock: inventory.quantity,
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
            this.cacheService.deletePattern("stock-check:*"),
            this.cacheService.deletePattern("inventory:*"),
        ]);
    }
}
exports.StockService = StockService;
//# sourceMappingURL=StockService.js.map