"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
const crypto_1 = require("crypto");
const types_1 = require("../types");
class InventoryRepository extends BaseRepository_1.BaseRepository {
    constructor(prisma) {
        super(prisma, "product");
    }
    /**
     * Find inventory by product ID
     */
    async findByProductId(productId) {
        try {
            const product = await this.findFirst({ id: productId }, {
                inventoryMovements: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
                stockReservations: {
                    where: { expiresAt: { gt: new Date() } },
                },
            });
            if (!product)
                return null;
            return this.transformProductToInventoryWithDetails(product);
        }
        catch (error) {
            this.handleError("Error finding inventory by product ID", error);
            throw error;
        }
    }
    /**
     * Get or create inventory for product
     */
    async getOrCreateInventory(productId) {
        try {
            let inventory = await this.findByProductId(productId);
            if (!inventory) {
                // Product should already exist, just need to ensure stock fields are set
                const updatedProduct = await this.update(productId, {
                    stock: 0,
                    lowStockThreshold: types_1.CONSTANTS?.LOW_STOCK_DEFAULT_THRESHOLD || 10,
                    trackQuantity: true,
                }, {
                    inventoryMovements: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                    },
                    stockReservations: {
                        where: { expiresAt: { gt: new Date() } },
                    },
                });
                inventory = this.transformProductToInventoryWithDetails(updatedProduct);
            }
            return inventory;
        }
        catch (error) {
            this.handleError("Error getting or creating inventory", error);
            throw error;
        }
    }
    /**
     * Update inventory quantity with movement tracking
     */
    async updateInventoryQuantity(productId, adjustment) {
        try {
            return await this.transaction(async (prisma) => {
                // Get current inventory
                let inventory = await this.findByProductId(productId);
                if (!inventory) {
                    inventory = await this.getOrCreateInventory(productId);
                }
                const previousQuantity = inventory.quantity;
                let newQuantity;
                // Calculate new quantity based on movement type
                if (this.isInboundMovement(adjustment.type)) {
                    newQuantity = previousQuantity + adjustment.quantity;
                }
                else {
                    newQuantity = previousQuantity - adjustment.quantity;
                    // Prevent negative inventory (no backorders in this schema)
                    if (newQuantity < 0) {
                        throw new types_1.AppError("Insufficient inventory for this operation", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.INSUFFICIENT_STOCK);
                    }
                }
                // Update product stock
                const updatedProduct = await prisma.product.update({
                    where: { id: inventory.productId },
                    data: {
                        stock: newQuantity,
                        updatedAt: new Date(),
                    },
                    include: {
                        inventoryMovements: {
                            orderBy: { createdAt: "desc" },
                            take: 1,
                        },
                        stockReservations: {
                            where: { expiresAt: { gt: new Date() } },
                        },
                    },
                });
                // Create movement record
                await prisma.inventoryMovement.create({
                    data: {
                        productId,
                        type: this.mapToSchemaMovementType(adjustment.type),
                        quantity: adjustment.quantity,
                        reference: adjustment.referenceId || null,
                        reason: adjustment.reason || null,
                    },
                });
                return this.transformProductToInventoryWithDetails(updatedProduct);
            });
        }
        catch (error) {
            this.handleError("Error updating inventory quantity", error);
            throw error;
        }
    }
    /**
     * Reserve stock for order
     */
    async reserveStock(request) {
        try {
            return await this.transaction(async (prisma) => {
                const inventory = await this.findByProductId(request.productId);
                if (!inventory) {
                    throw new types_1.AppError("Product inventory not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
                }
                // Check available stock
                const availableStock = inventory.quantity - inventory.reservedQuantity;
                if (availableStock < request.quantity) {
                    throw new types_1.AppError("Insufficient stock available for reservation", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.INSUFFICIENT_STOCK);
                }
                // Create reservation
                const expirationMinutes = request.expirationMinutes || types_1.CONSTANTS?.INVENTORY_RESERVATION_MINUTES || 15;
                const expiresAt = new Date();
                expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);
                const reservation = await prisma.stockReservation.create({
                    data: {
                        productId: request.productId,
                        orderId: request.orderId || null,
                        quantity: request.quantity,
                        expiresAt,
                    },
                });
                return reservation;
            });
        }
        catch (error) {
            this.handleError("Error reserving stock", error);
            throw error;
        }
    }
    /**
     * Release stock reservation
     */
    async releaseReservation(request) {
        try {
            return await this.transaction(async (prisma) => {
                let reservation;
                if (request.reservationId) {
                    reservation = await prisma.stockReservation.findUnique({
                        where: { id: request.reservationId },
                    });
                }
                else if (request.orderId) {
                    reservation = await prisma.stockReservation.findFirst({
                        where: { orderId: request.orderId },
                    });
                }
                if (!reservation || reservation.expiresAt < new Date()) {
                    return false; // Reservation not found or already expired
                }
                // Delete the reservation (schema doesn't have isReleased field)
                await prisma.stockReservation.delete({
                    where: { id: reservation.id },
                });
                return true;
            });
        }
        catch (error) {
            this.handleError("Error releasing reservation", error);
            throw error;
        }
    }
    /**
     * Get inventory list with filtering
     */
    async getInventoryList(filters = {}, pagination) {
        try {
            const where = {};
            // Stock level filters
            if (filters.lowStock) {
                where.AND = [
                    { stock: { gt: 0 } },
                    { stock: { lte: { path: ["lowStockThreshold"] } } },
                ];
            }
            if (filters.outOfStock) {
                where.stock = { lte: 0 };
            }
            // Category filter
            if (filters.categoryId) {
                where.categoryId = filters.categoryId;
            }
            // Search filter
            if (filters.search) {
                where.OR = [
                    { name: { contains: filters.search, mode: "insensitive" } },
                    { sku: { contains: filters.search, mode: "insensitive" } },
                ];
            }
            // Active products only
            where.isActive = true;
            const findManyOptions = {
                include: {
                    inventoryMovements: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                    },
                    stockReservations: {
                        where: { expiresAt: { gt: new Date() } },
                    },
                },
                orderBy: { updatedAt: "desc" },
            };
            if (pagination) {
                findManyOptions.pagination = pagination;
            }
            const result = await this.findMany(where, findManyOptions);
            // Calculate summary
            const summary = await this.getInventorySummary(where);
            const inventories = result.data.map((product) => {
                const reservedQuantity = product.stockReservations?.reduce((sum, reservation) => sum + reservation.quantity, 0) || 0;
                const availableQuantity = product.stock - reservedQuantity;
                const totalValue = product.stock * Number(product.costPrice || 0);
                const status = product.stock <= 0 ? types_1.InventoryStatus.OUT_OF_STOCK :
                    product.stock <= product.lowStockThreshold ? types_1.InventoryStatus.LOW_STOCK :
                        types_1.InventoryStatus.ACTIVE;
                return {
                    id: product.id,
                    productId: product.id,
                    productName: product.name,
                    productSku: product.sku || '',
                    quantity: product.stock,
                    reservedQuantity,
                    availableQuantity,
                    lowStockThreshold: product.lowStockThreshold,
                    status,
                    lastMovementAt: product.inventoryMovements[0]?.createdAt,
                    totalValue,
                };
            });
            return {
                inventories,
                pagination: {
                    page: result.pagination?.currentPage || 1,
                    limit: result.pagination?.itemsPerPage || 50,
                    total: result.pagination?.totalItems || 0,
                    totalPages: result.pagination?.totalPages || 1,
                },
                summary,
            };
        }
        catch (error) {
            this.handleError("Error getting inventory list", error);
            throw error;
        }
    }
    /**
     * Get low stock alerts
     */
    async getLowStockAlerts() {
        try {
            const lowStockProducts = await this.findMany({
                isActive: true,
                OR: [
                    { stock: { lte: 0 } },
                    { stock: { lte: { path: ["lowStockThreshold"] } } },
                ],
            }, {
                orderBy: [{ stock: "asc" }, { updatedAt: "desc" }],
            });
            return lowStockProducts.data.map((product) => ({
                id: (0, crypto_1.randomUUID)(),
                type: product.stock <= 0 ? types_1.StockAlert.OUT_OF_STOCK : types_1.StockAlert.LOW_STOCK,
                severity: product.stock <= 0 ? "critical" : "medium",
                productId: product.id,
                productName: product.name,
                currentStock: product.stock,
                threshold: product.lowStockThreshold,
                message: product.stock <= 0
                    ? `${product.name} is out of stock`
                    : `${product.name} is running low (${product.stock} remaining)`,
                isRead: false,
                createdAt: product.updatedAt,
            }));
        }
        catch (error) {
            this.handleError("Error getting low stock alerts", error);
            throw error;
        }
    }
    /**
     * Get inventory movements with filtering
     */
    async getInventoryMovements(filters = {}, pagination) {
        try {
            const where = {};
            if (filters.productId) {
                where.productId = filters.productId;
            }
            if (filters.type) {
                where.type = filters.type;
            }
            if (filters.createdBy) {
                where.createdBy = filters.createdBy;
            }
            if (filters.startDate || filters.endDate) {
                where.createdAt = {};
                if (filters.startDate)
                    where.createdAt.gte = filters.startDate;
                if (filters.endDate)
                    where.createdAt.lte = filters.endDate;
            }
            const movements = await this.prisma.inventoryMovement.findMany({
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
                skip: pagination && pagination.page && pagination.limit ? (pagination.page - 1) * pagination.limit : 0,
                take: pagination?.limit || 50,
            });
            const total = await this.prisma.inventoryMovement.count({ where });
            const pagination_meta = pagination && pagination.page && pagination.limit
                ? this.buildPagination(pagination.page, pagination.limit, total)
                : undefined;
            return {
                data: movements.map((movement) => ({
                    ...movement,
                    productName: movement.product.name,
                    productSku: movement.product.sku || '',
                })),
                pagination: pagination_meta,
            };
        }
        catch (error) {
            this.handleError("Error getting inventory movements", error);
            throw error;
        }
    }
    /**
     * Bulk inventory adjustment
     */
    async bulkInventoryAdjustment(request, createdBy) {
        try {
            const results = {
                processed: 0,
                errors: [],
            };
            const batchId = (0, crypto_1.randomUUID)();
            for (const update of request.updates) {
                try {
                    await this.updateInventoryQuantity(update.productId, {
                        type: update.quantity > 0 ? types_1.InventoryMovementType.ADJUSTMENT_IN : types_1.InventoryMovementType.ADJUSTMENT_OUT,
                        quantity: Math.abs(update.quantity),
                        reason: update.reason || request.batchReason || "Bulk adjustment",
                        notes: request.notes,
                        createdBy,
                        referenceType: "bulk_adjustment",
                        referenceId: batchId,
                    });
                    results.processed++;
                }
                catch (error) {
                    results.errors.push({
                        productId: update.productId,
                        error: error instanceof Error ? error.message : "Unknown error",
                    });
                }
            }
            return results;
        }
        catch (error) {
            this.handleError("Error performing bulk inventory adjustment", error);
            throw error;
        }
    }
    /**
     * Clean up expired reservations
     */
    async cleanupExpiredReservations() {
        try {
            return await this.transaction(async (prisma) => {
                // Find and delete expired reservations
                const expiredReservations = await prisma.stockReservation.findMany({
                    where: {
                        expiresAt: { lt: new Date() },
                    },
                });
                let releasedCount = 0;
                for (const reservation of expiredReservations) {
                    // Delete expired reservation
                    await prisma.stockReservation.delete({
                        where: { id: reservation.id },
                    });
                    releasedCount++;
                }
                return { releasedCount };
            });
        }
        catch (error) {
            this.handleError("Error cleaning up expired reservations", error);
            return { releasedCount: 0 };
        }
    }
    // Private helper methods
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
    calculateAverageCost(inventory, quantity, unitCost) {
        const currentValue = inventory.quantity * inventory.averageCost;
        const newValue = quantity * unitCost;
        const totalQuantity = inventory.quantity + quantity;
        return totalQuantity > 0
            ? (currentValue + newValue) / totalQuantity
            : unitCost;
    }
    calculateInventoryStatus(quantity, lowStockThreshold) {
        if (quantity <= 0)
            return types_1.InventoryStatus.OUT_OF_STOCK;
        if (quantity <= lowStockThreshold)
            return types_1.InventoryStatus.LOW_STOCK;
        return types_1.InventoryStatus.ACTIVE;
    }
    transformInventoryWithDetails(inventory) {
        const availableQuantity = inventory.quantity - inventory.reservedQuantity;
        const isLowStock = inventory.quantity > 0 &&
            inventory.quantity <= inventory.lowStockThreshold;
        const isOutOfStock = inventory.quantity <= 0;
        const totalValue = inventory.quantity * Number(inventory.averageCost);
        const lastMovement = inventory.movements?.[0]?.createdAt;
        return {
            ...inventory,
            availableQuantity,
            isLowStock,
            isOutOfStock,
            lastMovement,
            totalValue,
        };
    }
    transformProductToInventoryWithDetails(product) {
        const reservedQuantity = product.stockReservations?.reduce((sum, reservation) => sum + reservation.quantity, 0) || 0;
        const availableQuantity = product.stock - reservedQuantity;
        const isLowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;
        const isOutOfStock = product.stock <= 0;
        const totalValue = product.stock * Number(product.costPrice || 0);
        const lastMovement = product.inventoryMovements?.[0]?.createdAt;
        const status = isOutOfStock ? types_1.InventoryStatus.OUT_OF_STOCK :
            isLowStock ? types_1.InventoryStatus.LOW_STOCK :
                types_1.InventoryStatus.ACTIVE;
        return {
            id: product.id,
            productId: product.id,
            quantity: product.stock,
            reservedQuantity,
            lowStockThreshold: product.lowStockThreshold,
            reorderPoint: product.lowStockThreshold, // fallback
            reorderQuantity: 50, // default
            status,
            trackInventory: product.trackQuantity,
            allowBackorder: false, // default
            averageCost: Number(product.costPrice || 0),
            lastCost: Number(product.costPrice || 0),
            lastRestockedAt: undefined,
            lastSoldAt: undefined,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
            product: {
                id: product.id,
                name: product.name,
                sku: product.sku || undefined,
                price: Number(product.price),
                isActive: product.isActive,
            },
            availableQuantity,
            isLowStock,
            isOutOfStock,
            lastMovement,
            totalValue,
        };
    }
    mapToSchemaMovementType(type) {
        switch (type) {
            case types_1.InventoryMovementType.IN:
            case types_1.InventoryMovementType.INITIAL_STOCK:
            case types_1.InventoryMovementType.RESTOCK:
            case types_1.InventoryMovementType.PURCHASE:
            case types_1.InventoryMovementType.RETURN:
            case types_1.InventoryMovementType.TRANSFER_IN:
            case types_1.InventoryMovementType.RELEASE_RESERVE:
                return "IN";
            case types_1.InventoryMovementType.OUT:
            case types_1.InventoryMovementType.SALE:
            case types_1.InventoryMovementType.TRANSFER_OUT:
            case types_1.InventoryMovementType.DAMAGE:
            case types_1.InventoryMovementType.THEFT:
            case types_1.InventoryMovementType.EXPIRED:
            case types_1.InventoryMovementType.RESERVE:
                return "OUT";
            case types_1.InventoryMovementType.ADJUSTMENT:
            case types_1.InventoryMovementType.ADJUSTMENT_IN:
            case types_1.InventoryMovementType.ADJUSTMENT_OUT:
            default:
                return "ADJUSTMENT";
        }
    }
    async getInventorySummary(where) {
        try {
            const [totalProducts, lowStockProducts, outOfStockProducts, valueResult] = await Promise.all([
                this.count(where),
                this.count({
                    ...where,
                    AND: [
                        { stock: { gt: 0 } },
                        // Note: Comparing stock to lowStockThreshold would require a more complex query
                        // For now, using a fixed threshold
                        { stock: { lte: 10 } }
                    ]
                }),
                this.count({ ...where, stock: { lte: 0 } }),
                this.aggregate(where, {
                    _sum: {
                        stock: true,
                    },
                }),
            ]);
            // Calculate total value (simplified - using stock quantity)
            const totalValue = Number(valueResult._sum.stock) || 0;
            return {
                totalProducts,
                lowStockProducts,
                outOfStockProducts,
                totalValue,
            };
        }
        catch (error) {
            return {
                totalProducts: 0,
                lowStockProducts: 0,
                outOfStockProducts: 0,
                totalValue: 0,
            };
        }
    }
}
exports.InventoryRepository = InventoryRepository;
//# sourceMappingURL=InventoryRepository.js.map