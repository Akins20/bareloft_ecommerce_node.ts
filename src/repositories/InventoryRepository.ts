import { PrismaClient } from "@prisma/client";
import { BaseRepository } from "./BaseRepository";
import {
  Inventory,
  InventoryMovement,
  StockReservation,
  InventoryMovementType,
  InventoryStatus,
  UpdateInventoryRequest,
  BulkInventoryUpdateRequest,
  ReserveStockRequest,
  ReleaseReservationRequest,
  InventoryAdjustmentRequest,
  InventoryResponse,
  InventoryListResponse,
  InventoryListItem,
  InventoryAlert,
  StockAlert,
  PaginationParams,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
  CONSTANTS,
} from "../types";

export interface CreateInventoryData {
  productId: string;
  quantity?: number;
  reservedQuantity?: number;
  lowStockThreshold?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  status?: InventoryStatus;
  trackInventory?: boolean;
  allowBackorder?: boolean;
  averageCost?: number;
  lastCost?: number;
  lastRestockedAt?: Date;
}

export interface UpdateInventoryData {
  quantity?: number;
  reservedQuantity?: number;
  lowStockThreshold?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  status?: InventoryStatus;
  trackInventory?: boolean;
  allowBackorder?: boolean;
  averageCost?: number;
  lastCost?: number;
  lastRestockedAt?: Date;
  lastSoldAt?: Date;
}

export interface CreateMovementData {
  inventoryId: string;
  productId: string;
  type: InventoryMovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  unitCost?: number;
  totalCost?: number;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  notes?: string;
  metadata?: any;
  createdBy: string;
  batchId?: string;
}

export interface InventoryWithDetails extends Inventory {
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    isActive: boolean;
  };
  availableQuantity: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  lastMovement?: Date;
  totalValue: number;
}

export class InventoryRepository extends BaseRepository<
  Inventory,
  CreateInventoryData,
  UpdateInventoryData
> {
  constructor(prisma: PrismaClient) {
    super(prisma, "Inventory");
  }

  /**
   * Find inventory by product ID
   */
  async findByProductId(
    productId: string
  ): Promise<InventoryWithDetails | null> {
    try {
      const inventory = await this.findFirst(
        { productId },
        {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
              isActive: true,
            },
          },
          movements: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        }
      );

      if (!inventory) return null;

      return this.transformInventoryWithDetails(inventory);
    } catch (error) {
      this.handleError("Error finding inventory by product ID", error);
      throw error;
    }
  }

  /**
   * Get or create inventory for product
   */
  async getOrCreateInventory(productId: string): Promise<InventoryWithDetails> {
    try {
      let inventory = await this.findByProductId(productId);

      if (!inventory) {
        // Create new inventory record
        const newInventory = await this.create(
          {
            productId,
            quantity: 0,
            reservedQuantity: 0,
            lowStockThreshold: CONSTANTS.LOW_STOCK_DEFAULT_THRESHOLD,
            reorderPoint: 5,
            reorderQuantity: 50,
            status: "ACTIVE",
            trackInventory: true,
            allowBackorder: false,
            averageCost: 0,
            lastCost: 0,
          },
          {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                isActive: true,
              },
            },
          }
        );

        inventory = this.transformInventoryWithDetails(newInventory);
      }

      return inventory;
    } catch (error) {
      this.handleError("Error getting or creating inventory", error);
      throw error;
    }
  }

  /**
   * Update inventory quantity with movement tracking
   */
  async updateInventoryQuantity(
    productId: string,
    adjustment: {
      type: InventoryMovementType;
      quantity: number;
      unitCost?: number;
      reason?: string;
      notes?: string;
      referenceType?: string;
      referenceId?: string;
      createdBy: string;
    }
  ): Promise<InventoryWithDetails> {
    try {
      return await this.transaction(async (prisma) => {
        // Get current inventory
        let inventory = await this.findByProductId(productId);
        if (!inventory) {
          inventory = await this.getOrCreateInventory(productId);
        }

        const previousQuantity = inventory.quantity;
        let newQuantity: number;

        // Calculate new quantity based on movement type
        if (this.isInboundMovement(adjustment.type)) {
          newQuantity = previousQuantity + adjustment.quantity;
        } else {
          newQuantity = previousQuantity - adjustment.quantity;

          // Prevent negative inventory unless backorders are allowed
          if (newQuantity < 0 && !inventory.allowBackorder) {
            throw new AppError(
              "Insufficient inventory for this operation",
              HTTP_STATUS.BAD_REQUEST,
              ERROR_CODES.INSUFFICIENT_STOCK
            );
          }
        }

        // Update inventory
        const updatedInventory = await prisma.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: newQuantity,
            averageCost: adjustment.unitCost
              ? this.calculateAverageCost(
                  inventory,
                  adjustment.quantity,
                  adjustment.unitCost
                )
              : inventory.averageCost,
            lastCost: adjustment.unitCost || inventory.lastCost,
            lastRestockedAt: this.isInboundMovement(adjustment.type)
              ? new Date()
              : inventory.lastRestockedAt,
            lastSoldAt:
              adjustment.type === "SALE" ? new Date() : inventory.lastSoldAt,
            status: this.calculateInventoryStatus(
              newQuantity,
              inventory.lowStockThreshold
            ),
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                isActive: true,
              },
            },
          },
        });

        // Create movement record
        await prisma.inventoryMovement.create({
          data: {
            inventoryId: inventory.id,
            productId,
            type: adjustment.type,
            quantity: adjustment.quantity,
            previousQuantity,
            newQuantity,
            unitCost: adjustment.unitCost,
            totalCost: adjustment.unitCost
              ? adjustment.quantity * adjustment.unitCost
              : undefined,
            referenceType: adjustment.referenceType,
            referenceId: adjustment.referenceId,
            reason: adjustment.reason,
            notes: adjustment.notes,
            createdBy: adjustment.createdBy,
          },
        });

        return this.transformInventoryWithDetails(updatedInventory);
      });
    } catch (error) {
      this.handleError("Error updating inventory quantity", error);
      throw error;
    }
  }

  /**
   * Reserve stock for order
   */
  async reserveStock(request: ReserveStockRequest): Promise<StockReservation> {
    try {
      return await this.transaction(async (prisma) => {
        const inventory = await this.findByProductId(request.productId);
        if (!inventory) {
          throw new AppError(
            "Product inventory not found",
            HTTP_STATUS.NOT_FOUND,
            ERROR_CODES.RESOURCE_NOT_FOUND
          );
        }

        // Check available stock
        const availableStock = inventory.quantity - inventory.reservedQuantity;
        if (availableStock < request.quantity) {
          throw new AppError(
            "Insufficient stock available for reservation",
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.INSUFFICIENT_STOCK
          );
        }

        // Create reservation
        const expirationMinutes =
          request.expirationMinutes || CONSTANTS.INVENTORY_RESERVATION_MINUTES;
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);

        const reservation = await prisma.stockReservation.create({
          data: {
            inventoryId: inventory.id,
            productId: request.productId,
            orderId: request.orderId,
            cartId: request.cartId,
            quantity: request.quantity,
            reason: request.reason,
            expiresAt,
          },
        });

        // Update reserved quantity
        await prisma.inventory.update({
          where: { id: inventory.id },
          data: {
            reservedQuantity: inventory.reservedQuantity + request.quantity,
          },
        });

        return reservation;
      });
    } catch (error) {
      this.handleError("Error reserving stock", error);
      throw error;
    }
  }

  /**
   * Release stock reservation
   */
  async releaseReservation(
    request: ReleaseReservationRequest
  ): Promise<boolean> {
    try {
      return await this.transaction(async (prisma) => {
        let reservation: any;

        if (request.reservationId) {
          reservation = await prisma.stockReservation.findUnique({
            where: { id: request.reservationId },
            include: { inventory: true },
          });
        } else if (request.orderId) {
          reservation = await prisma.stockReservation.findFirst({
            where: { orderId: request.orderId, isReleased: false },
            include: { inventory: true },
          });
        } else if (request.cartId) {
          reservation = await prisma.stockReservation.findFirst({
            where: { cartId: request.cartId, isReleased: false },
            include: { inventory: true },
          });
        }

        if (!reservation) {
          return false; // Reservation not found or already released
        }

        // Mark reservation as released
        await prisma.stockReservation.update({
          where: { id: reservation.id },
          data: {
            isReleased: true,
            releasedAt: new Date(),
          },
        });

        // Update reserved quantity
        await prisma.inventory.update({
          where: { id: reservation.inventoryId },
          data: {
            reservedQuantity: Math.max(
              0,
              reservation.inventory.reservedQuantity - reservation.quantity
            ),
          },
        });

        return true;
      });
    } catch (error) {
      this.handleError("Error releasing reservation", error);
      throw error;
    }
  }

  /**
   * Get inventory list with filtering
   */
  async getInventoryList(
    filters: {
      status?: InventoryStatus;
      lowStock?: boolean;
      outOfStock?: boolean;
      categoryId?: string;
      search?: string;
    } = {},
    pagination?: PaginationParams
  ): Promise<InventoryListResponse> {
    try {
      const where: any = {};

      // Status filter
      if (filters.status) {
        where.status = filters.status;
      }

      // Stock level filters
      if (filters.lowStock) {
        where.AND = [
          { quantity: { gt: 0 } },
          { quantity: { lte: { path: ["lowStockThreshold"] } } },
        ];
      }

      if (filters.outOfStock) {
        where.quantity = { lte: 0 };
      }

      // Category filter
      if (filters.categoryId) {
        where.product = { categoryId: filters.categoryId };
      }

      // Search filter
      if (filters.search) {
        where.product = {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { sku: { contains: filters.search, mode: "insensitive" } },
          ],
        };
      }

      const result = await this.findMany(where, {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
              isActive: true,
            },
          },
          movements: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
        pagination,
      });

      // Calculate summary
      const summary = await this.getInventorySummary(where);

      const inventories: InventoryListItem[] = result.data.map((inventory) => {
        const availableQuantity =
          inventory.quantity - inventory.reservedQuantity;
        const totalValue = inventory.quantity * Number(inventory.averageCost);

        return {
          id: inventory.id,
          productId: inventory.productId,
          productName: inventory.product.name,
          productSku: inventory.product.sku,
          quantity: inventory.quantity,
          reservedQuantity: inventory.reservedQuantity,
          availableQuantity,
          lowStockThreshold: inventory.lowStockThreshold,
          status: inventory.status,
          lastMovementAt: inventory.movements[0]?.createdAt,
          totalValue,
        };
      });

      return {
        inventories,
        pagination: result.pagination,
        summary,
      };
    } catch (error) {
      this.handleError("Error getting inventory list", error);
      throw error;
    }
  }

  /**
   * Get low stock alerts
   */
  async getLowStockAlerts(): Promise<InventoryAlert[]> {
    try {
      const lowStockInventories = await this.findMany(
        {
          status: "LOW_STOCK",
          product: { isActive: true },
        },
        {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
          orderBy: [{ quantity: "asc" }, { updatedAt: "desc" }],
        }
      );

      return lowStockInventories.data.map((inventory) => ({
        id: crypto.randomUUID(),
        type: "LOW_STOCK" as StockAlert,
        severity: inventory.quantity <= 0 ? "critical" : "medium",
        productId: inventory.productId,
        productName: inventory.product.name,
        currentStock: inventory.quantity,
        threshold: inventory.lowStockThreshold,
        message:
          inventory.quantity <= 0
            ? `${inventory.product.name} is out of stock`
            : `${inventory.product.name} is running low (${inventory.quantity} remaining)`,
        isRead: false,
        createdAt: inventory.updatedAt,
      }));
    } catch (error) {
      this.handleError("Error getting low stock alerts", error);
      throw error;
    }
  }

  /**
   * Get inventory movements with filtering
   */
  async getInventoryMovements(
    filters: {
      productId?: string;
      type?: InventoryMovementType;
      startDate?: Date;
      endDate?: Date;
      createdBy?: string;
    } = {},
    pagination?: PaginationParams
  ): Promise<{
    data: Array<
      InventoryMovement & {
        productName: string;
        productSku: string;
      }
    >;
    pagination: any;
  }> {
    try {
      const where: any = {};

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
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
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
        skip: pagination ? (pagination.page - 1) * pagination.limit : 0,
        take: pagination?.limit || 50,
      });

      const total = await this.prisma.inventoryMovement.count({ where });
      const pagination_meta = pagination
        ? this.buildPagination(pagination.page, pagination.limit, total)
        : undefined;

      return {
        data: movements.map((movement) => ({
          ...movement,
          productName: movement.product.name,
          productSku: movement.product.sku,
        })),
        pagination: pagination_meta,
      };
    } catch (error) {
      this.handleError("Error getting inventory movements", error);
      throw error;
    }
  }

  /**
   * Bulk inventory adjustment
   */
  async bulkInventoryAdjustment(
    request: BulkInventoryUpdateRequest,
    createdBy: string
  ): Promise<{
    processed: number;
    errors: Array<{ productId: string; error: string }>;
  }> {
    try {
      const results = {
        processed: 0,
        errors: [] as Array<{ productId: string; error: string }>,
      };

      const batchId = crypto.randomUUID();

      for (const update of request.updates) {
        try {
          await this.updateInventoryQuantity(update.productId, {
            type: update.quantity > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
            quantity: Math.abs(update.quantity),
            reason: update.reason || request.batchReason || "Bulk adjustment",
            notes: request.notes,
            createdBy,
            referenceType: "bulk_adjustment",
            referenceId: batchId,
          });
          results.processed++;
        } catch (error) {
          results.errors.push({
            productId: update.productId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return results;
    } catch (error) {
      this.handleError("Error performing bulk inventory adjustment", error);
      throw error;
    }
  }

  /**
   * Clean up expired reservations
   */
  async cleanupExpiredReservations(): Promise<{ releasedCount: number }> {
    try {
      return await this.transaction(async (prisma) => {
        // Find expired reservations
        const expiredReservations = await prisma.stockReservation.findMany({
          where: {
            expiresAt: { lt: new Date() },
            isReleased: false,
          },
          include: { inventory: true },
        });

        let releasedCount = 0;

        for (const reservation of expiredReservations) {
          // Release reservation
          await prisma.stockReservation.update({
            where: { id: reservation.id },
            data: {
              isReleased: true,
              releasedAt: new Date(),
            },
          });

          // Update inventory reserved quantity
          await prisma.inventory.update({
            where: { id: reservation.inventoryId },
            data: {
              reservedQuantity: Math.max(
                0,
                reservation.inventory.reservedQuantity - reservation.quantity
              ),
            },
          });

          releasedCount++;
        }

        return { releasedCount };
      });
    } catch (error) {
      this.handleError("Error cleaning up expired reservations", error);
      return { releasedCount: 0 };
    }
  }

  // Private helper methods

  private isInboundMovement(type: InventoryMovementType): boolean {
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

  private calculateAverageCost(
    inventory: InventoryWithDetails,
    quantity: number,
    unitCost: number
  ): number {
    const currentValue = inventory.quantity * inventory.averageCost;
    const newValue = quantity * unitCost;
    const totalQuantity = inventory.quantity + quantity;

    return totalQuantity > 0
      ? (currentValue + newValue) / totalQuantity
      : unitCost;
  }

  private calculateInventoryStatus(
    quantity: number,
    lowStockThreshold: number
  ): InventoryStatus {
    if (quantity <= 0) return "OUT_OF_STOCK";
    if (quantity <= lowStockThreshold) return "LOW_STOCK";
    return "ACTIVE";
  }

  private transformInventoryWithDetails(inventory: any): InventoryWithDetails {
    const availableQuantity = inventory.quantity - inventory.reservedQuantity;
    const isLowStock =
      inventory.quantity > 0 &&
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

  private async getInventorySummary(where: any): Promise<{
    totalProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    totalValue: number;
  }> {
    try {
      const [totalProducts, lowStockProducts, outOfStockProducts, valueResult] =
        await Promise.all([
          this.count(where),
          this.count({ ...where, status: "LOW_STOCK" }),
          this.count({ ...where, status: "OUT_OF_STOCK" }),
          this.aggregate(where, {
            _sum: {
              quantity: true,
            },
          }),
        ]);

      // Calculate total value (simplified - would need to multiply by average cost)
      const totalValue = Number(valueResult._sum.quantity) || 0;

      return {
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        totalValue,
      };
    } catch (error) {
      return {
        totalProducts: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        totalValue: 0,
      };
    }
  }
}
