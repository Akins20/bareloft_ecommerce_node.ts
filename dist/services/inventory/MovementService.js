"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MovementService = void 0;
const BaseService_1 = require("../BaseService");
const models_1 = require("../../models");
const types_1 = require("../../types");
class MovementService extends BaseService_1.BaseService {
    cacheService;
    constructor(cacheService) {
        super();
        this.cacheService = cacheService;
    }
    /**
     * Record a new inventory movement
     */
    async recordMovement(request) {
        try {
            // Get inventory record
            const inventory = await models_1.InventoryModel.findUnique({
                where: { productId: request.productId },
            });
            if (!inventory) {
                throw new types_1.AppError("Inventory record not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            const previousQuantity = inventory.quantity;
            const newQuantity = this.calculateNewQuantity(previousQuantity, request.quantity, request.type);
            // Create movement record
            const movement = await models_1.InventoryMovementModel.create({
                data: {
                    inventoryId: inventory.id,
                    productId: request.productId,
                    type: request.type,
                    quantity: request.quantity,
                    previousQuantity,
                    newQuantity,
                    unitCost: request.unitCost,
                    totalCost: request.unitCost
                        ? request.unitCost * request.quantity
                        : undefined,
                    referenceType: request.referenceType,
                    referenceId: request.referenceId,
                    reason: request.reason,
                    notes: request.notes,
                    createdBy: request.userId,
                },
            });
            // Update inventory quantity
            await models_1.InventoryModel.update({
                where: { productId: request.productId },
                data: {
                    quantity: newQuantity,
                    lastCost: request.unitCost || inventory.lastCost,
                    lastRestockedAt: this.isInboundMovement(request.type)
                        ? new Date()
                        : inventory.lastRestockedAt,
                    lastSoldAt: this.isOutboundMovement(request.type)
                        ? new Date()
                        : inventory.lastSoldAt,
                    updatedAt: new Date(),
                },
            });
            // Clear cache
            await this.clearMovementCache(request.productId);
            return this.transformMovement(movement);
        }
        catch (error) {
            this.handleError("Error recording inventory movement", error);
            throw error;
        }
    }
    /**
     * Get movement history with filtering and pagination
     */
    async getMovements(filters = {}) {
        try {
            const { productId, type, startDate, endDate, createdBy, page = 1, limit = 50, } = filters;
            // Build where clause
            const where = {};
            if (productId)
                where.productId = productId;
            if (type)
                where.type = type;
            if (createdBy)
                where.createdBy = createdBy;
            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate)
                    where.createdAt.gte = startDate;
                if (endDate)
                    where.createdAt.lte = endDate;
            }
            // Execute queries
            const [movements, total] = await Promise.all([
                models_1.InventoryMovementModel.findMany({
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
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                models_1.InventoryMovementModel.count({ where }),
            ]);
            const pagination = this.createPagination(page, limit, total);
            return {
                movements: movements.map(this.transformMovement),
                pagination,
            };
        }
        catch (error) {
            this.handleError("Error fetching movements", error);
            throw error;
        }
    }
    /**
     * Get movement summary for a specific product
     */
    async getProductMovementSummary(productId, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const movements = await models_1.InventoryMovementModel.findMany({
                where: {
                    productId,
                    createdAt: { gte: startDate },
                },
                include: {
                    product: {
                        select: { name: true, sku: true },
                    },
                },
                orderBy: { createdAt: "desc" },
            });
            let totalInbound = 0;
            let totalOutbound = 0;
            movements.forEach((movement) => {
                if (this.isInboundMovement(movement.type)) {
                    totalInbound += movement.quantity;
                }
                else if (this.isOutboundMovement(movement.type)) {
                    totalOutbound += movement.quantity;
                }
            });
            return {
                totalMovements: movements.length,
                totalInbound,
                totalOutbound,
                netChange: totalInbound - totalOutbound,
                recentMovements: movements.slice(0, 10).map(this.transformMovement),
            };
        }
        catch (error) {
            this.handleError("Error fetching product movement summary", error);
            throw error;
        }
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
            return movements.map(this.transformMovement);
        }
        catch (error) {
            this.handleError("Error fetching stock movement history", error);
            throw error;
        }
    }
    // Private helper methods
    calculateNewQuantity(currentQuantity, movementQuantity, movementType) {
        if (this.isInboundMovement(movementType)) {
            return currentQuantity + movementQuantity;
        }
        else if (this.isOutboundMovement(movementType)) {
            return Math.max(0, currentQuantity - movementQuantity);
        }
        // For adjustments, the movement quantity is the new total
        return movementQuantity;
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
    async clearMovementCache(productId) {
        await Promise.all([
            this.cacheService.delete(`movements:${productId}`),
            this.cacheService.delete(`movement-summary:${productId}`),
            this.cacheService.deletePattern("movement-analytics:*"),
        ]);
    }
    transformMovement(movement) {
        return {
            id: movement.id,
            inventoryId: movement.inventoryId,
            productId: movement.productId,
            type: movement.type,
            quantity: movement.quantity,
            previousQuantity: movement.previousQuantity,
            newQuantity: movement.newQuantity,
            unitCost: movement.unitCost ? Number(movement.unitCost) : undefined,
            totalCost: movement.totalCost ? Number(movement.totalCost) : undefined,
            referenceType: movement.referenceType,
            referenceId: movement.referenceId,
            reason: movement.reason,
            notes: movement.notes,
            metadata: movement.metadata,
            createdBy: movement.createdBy,
            batchId: movement.batchId,
            createdAt: movement.createdAt,
        };
    }
}
exports.MovementService = MovementService;
//# sourceMappingURL=MovementService.js.map