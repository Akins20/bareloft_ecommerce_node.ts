import { PrismaClient } from "@prisma/client";
import { BaseRepository } from "./BaseRepository";
import { randomUUID } from "crypto";
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
  stock?: number;
  quantity?: number;
  reservedQuantity?: number;
  lowStockThreshold?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  status?: InventoryStatus;
  trackInventory?: boolean;
  trackQuantity?: boolean;
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

export interface InventoryWithDetails {
  id: string;
  productId: string;
  quantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  reorderPoint: number;
  reorderQuantity: number;
  status: InventoryStatus;
  trackInventory: boolean;
  allowBackorder: boolean;
  averageCost: number;
  lastCost: number;
  lastRestockedAt?: Date;
  lastSoldAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  product: {
    id: string;
    name: string;
    sku?: string;
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
  any,
  CreateInventoryData,
  UpdateInventoryData
> {
  constructor(prisma: PrismaClient) {
    super(prisma, "product");
  }

  /**
   * Find inventory by product ID
   */
  async findByProductId(
    productId: string
  ): Promise<InventoryWithDetails | null> {
    try {
      const product = await this.findFirst(
        { id: productId },
        {
          inventoryMovements: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          stockReservations: {
            where: { expiresAt: { gt: new Date() } },
          },
        }
      );

      if (!product) return null;

      return this.transformProductToInventoryWithDetails(product);
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
        // Product should already exist, just need to ensure stock fields are set
        const updatedProduct = await this.update(
          productId,
          {
            stock: 0,
            lowStockThreshold: CONSTANTS?.LOW_STOCK_DEFAULT_THRESHOLD || 10,
            trackQuantity: true,
          },
          {
            inventoryMovements: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
            stockReservations: {
              where: { expiresAt: { gt: new Date() } },
            },
          }
        );

        inventory = this.transformProductToInventoryWithDetails(updatedProduct);
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

          // Prevent negative inventory (no backorders in this schema)
          if (newQuantity < 0) {
            throw new AppError(
              "Insufficient inventory for this operation",
              HTTP_STATUS.BAD_REQUEST,
              ERROR_CODES.INSUFFICIENT_STOCK
            );
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
            type: this.mapToSchemaMovementType(adjustment.type) as any,
            quantity: adjustment.quantity,
            reference: adjustment.referenceId || null,
            reason: adjustment.reason || null,
          },
        });

        return this.transformProductToInventoryWithDetails(updatedProduct);
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
          request.expirationMinutes || CONSTANTS?.INVENTORY_RESERVATION_MINUTES || 15;
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

        return reservation as StockReservation;
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
          });
        } else if (request.orderId) {
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

      const findManyOptions: any = {
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

      const inventories: InventoryListItem[] = result.data.map((product) => {
        const reservedQuantity = product.stockReservations?.reduce(
          (sum: number, reservation: any) => sum + reservation.quantity,
          0
        ) || 0;
        const availableQuantity = product.stock - reservedQuantity;
        const totalValue = product.stock * Number(product.costPrice || 0);
        
        const status = product.stock <= 0 ? InventoryStatus.OUT_OF_STOCK :
                      product.stock <= product.lowStockThreshold ? InventoryStatus.LOW_STOCK :
                      InventoryStatus.ACTIVE;

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
      const lowStockProducts = await this.findMany(
        {
          isActive: true,
          OR: [
            { stock: { lte: 0 } },
            { stock: { lte: { path: ["lowStockThreshold"] } } },
          ],
        },
        {
          orderBy: [{ stock: "asc" }, { updatedAt: "desc" }],
        }
      );

      return lowStockProducts.data.map((product) => ({
        id: randomUUID(),
        type: product.stock <= 0 ? StockAlert.OUT_OF_STOCK : StockAlert.LOW_STOCK,
        severity: product.stock <= 0 ? ("critical" as const) : ("medium" as const),
        productId: product.id,
        productName: product.name,
        currentStock: product.stock,
        threshold: product.lowStockThreshold,
        message:
          product.stock <= 0
            ? `${product.name} is out of stock`
            : `${product.name} is running low (${product.stock} remaining)`,
        isRead: false,
        isAcknowledged: false,
        isDismissed: false,
        createdAt: product.updatedAt,
        updatedAt: product.updatedAt,
      })) as InventoryAlert[];
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
        })) as any,
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

      const batchId = randomUUID();

      for (const update of request.updates) {
        try {
          await this.updateInventoryQuantity(update.productId, {
            type: update.quantity > 0 ? InventoryMovementType.ADJUSTMENT_IN : InventoryMovementType.ADJUSTMENT_OUT,
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
    if (quantity <= 0) return InventoryStatus.OUT_OF_STOCK;
    if (quantity <= lowStockThreshold) return InventoryStatus.LOW_STOCK;
    return InventoryStatus.ACTIVE;
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

  private transformProductToInventoryWithDetails(product: any): InventoryWithDetails {
    const reservedQuantity = product.stockReservations?.reduce(
      (sum: number, reservation: any) => sum + reservation.quantity,
      0
    ) || 0;
    const availableQuantity = product.stock - reservedQuantity;
    const isLowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;
    const isOutOfStock = product.stock <= 0;
    const totalValue = product.stock * Number(product.costPrice || 0);
    const lastMovement = product.inventoryMovements?.[0]?.createdAt;
    
    const status = isOutOfStock ? InventoryStatus.OUT_OF_STOCK :
                   isLowStock ? InventoryStatus.LOW_STOCK :
                   InventoryStatus.ACTIVE;

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
    } as InventoryWithDetails;
  }

  private mapToSchemaMovementType(type: InventoryMovementType): string {
    switch (type) {
      case InventoryMovementType.IN:
      case InventoryMovementType.INITIAL_STOCK:
      case InventoryMovementType.RESTOCK:
      case InventoryMovementType.PURCHASE:
      case InventoryMovementType.RETURN:
      case InventoryMovementType.TRANSFER_IN:
      case InventoryMovementType.RELEASE_RESERVE:
        return "IN";
      case InventoryMovementType.OUT:
      case InventoryMovementType.SALE:
      case InventoryMovementType.TRANSFER_OUT:
      case InventoryMovementType.DAMAGE:
      case InventoryMovementType.THEFT:
      case InventoryMovementType.EXPIRED:
      case InventoryMovementType.RESERVE:
        return "OUT";
      case InventoryMovementType.ADJUSTMENT:
      case InventoryMovementType.ADJUSTMENT_IN:
      case InventoryMovementType.ADJUSTMENT_OUT:
      default:
        return "ADJUSTMENT";
    }
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
