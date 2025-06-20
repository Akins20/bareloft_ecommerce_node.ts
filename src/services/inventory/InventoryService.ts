import { BaseService } from "../BaseService";
import {
  InventoryModel,
  InventoryMovementModel,
  ProductModel,
} from "../../models";
import { ProductRepository } from "../../repositories/ProductRepository";
import {
  Inventory,
  InventoryStatus,
  UpdateInventoryRequest,
  BulkInventoryUpdateRequest,
  InventoryAdjustmentRequest,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
  PaginationMeta,
} from "../../types";
import { CacheService } from "../cache/CacheService";
import { NotificationService } from "../notifications/NotificationService";

interface InventoryListFilter {
  status?: InventoryStatus;
  lowStock?: boolean;
  outOfStock?: boolean;
  categoryId?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
}

interface InventorySummary {
  totalProducts: number;
  totalValue: number;
  lowStockProducts: number;
  outOfStockProducts: number;
}

export class InventoryService extends BaseService {
  private productRepository: ProductRepository;
  private cacheService: CacheService;
  private notificationService: NotificationService;

  constructor(
    productRepository: ProductRepository,
    cacheService: CacheService,
    notificationService: NotificationService
  ) {
    super();
    this.productRepository = productRepository;
    this.cacheService = cacheService;
    this.notificationService = notificationService;
  }

  /**
   * Get inventory details for a specific product
   */
  async getProductInventory(productId: string): Promise<Inventory> {
    try {
      const inventory = await InventoryModel.findUnique({
        where: { productId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
            },
          },
        },
      });

      if (!inventory) {
        throw new AppError(
          "Inventory record not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      return this.transformInventory(inventory);
    } catch (error) {
      this.handleError("Error fetching product inventory", error);
      throw error;
    }
  }

  /**
   * Get inventory list with filtering and pagination
   */
  async getInventoryList(filters: InventoryListFilter = {}): Promise<{
    inventories: any[];
    pagination: PaginationMeta;
    summary: InventorySummary;
  }> {
    try {
      const {
        status,
        lowStock,
        outOfStock,
        categoryId,
        searchTerm,
        page = 1,
        limit = 20,
      } = filters;

      // Build where clause
      const where: any = {};

      if (status) where.status = status;
      if (outOfStock) where.quantity = 0;

      if (categoryId || searchTerm) {
        where.product = {};
        if (categoryId) where.product.categoryId = categoryId;
        if (searchTerm) {
          where.product.OR = [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { sku: { contains: searchTerm, mode: "insensitive" } },
          ];
        }
      }

      // Execute queries
      const [inventories, total, summary] = await Promise.all([
        InventoryModel.findMany({
          where,
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
          orderBy: { updatedAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        InventoryModel.count({ where }),
        this.getInventorySummary(),
      ]);

      const pagination = this.createPagination(page, limit, total);

      return {
        inventories: inventories.map(this.transformInventoryListItem),
        pagination,
        summary,
      };
    } catch (error) {
      this.handleError("Error fetching inventory list", error);
      throw error;
    }
  }

  /**
   * Update inventory for a single product
   */
  async updateInventory(
    productId: string,
    request: UpdateInventoryRequest,
    userId: string
  ): Promise<Inventory> {
    try {
      // Validate product exists
      const product = await this.productRepository.findById(productId);
      if (!product) {
        throw new AppError(
          "Product not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Get or create inventory
      let inventory = await InventoryModel.findUnique({
        where: { productId },
      });

      const previousQuantity = inventory?.quantity || 0;

      if (!inventory) {
        inventory = await InventoryModel.create({
          data: {
            productId,
            quantity: request.quantity || 0,
            lowStockThreshold: request.lowStockThreshold || 10,
            reorderPoint: request.reorderPoint || 5,
            reorderQuantity: request.reorderQuantity || 50,
            trackInventory: request.trackInventory ?? true,
            status: "ACTIVE",
            averageCost: 0,
            lastCost: 0,
          },
        });
      } else {
        inventory = await InventoryModel.update({
          where: { productId },
          data: {
            quantity: request.quantity ?? inventory.quantity,
            lowStockThreshold:
              request.lowStockThreshold ?? inventory.lowStockThreshold,
            reorderPoint: request.reorderPoint ?? inventory.reorderPoint,
            reorderQuantity:
              request.reorderQuantity ?? inventory.reorderQuantity,
            trackInventory: request.trackInventory ?? inventory.trackInventory,
            updatedAt: new Date(),
          },
        });
      }

      // Create inventory movement if quantity changed
      if (
        request.quantity !== undefined &&
        request.quantity !== previousQuantity
      ) {
        const movementType =
          request.quantity > previousQuantity
            ? "ADJUSTMENT_IN"
            : "ADJUSTMENT_OUT";

        await InventoryMovementModel.create({
          data: {
            inventoryId: inventory.id,
            productId,
            type: movementType,
            quantity: Math.abs(request.quantity - previousQuantity),
            previousQuantity,
            newQuantity: request.quantity,
            reason: request.reason || "Manual adjustment",
            notes: request.notes,
            createdBy: userId,
          },
        });
      }

      // Check for low stock alerts
      await this.checkLowStockAlert(inventory);

      // Clear cache
      await this.clearInventoryCache(productId);

      return this.transformInventory(inventory);
    } catch (error) {
      this.handleError("Error updating inventory", error);
      throw error;
    }
  }

  /**
   * Bulk update inventory for multiple products
   */
  async bulkUpdateInventory(
    request: BulkInventoryUpdateRequest,
    userId: string
  ): Promise<{ successful: number; failed: number; errors: string[] }> {
    try {
      const results = {
        successful: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const update of request.updates) {
        try {
          await this.updateInventory(
            update.productId,
            {
              quantity: update.quantity,
              reason: update.reason || request.batchReason,
            },
            userId
          );
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push(
            `Product ${update.productId}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      return results;
    } catch (error) {
      this.handleError("Error in bulk inventory update", error);
      throw error;
    }
  }

  /**
   * Get low stock alerts
   */
  async getLowStockAlerts(): Promise<
    Array<{
      productId: string;
      productName: string;
      currentStock: number;
      threshold: number;
      categoryName: string;
    }>
  > {
    try {
      const cacheKey = "low-stock-alerts";
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached;

      const lowStockInventories = await InventoryModel.findMany({
        where: {
          trackInventory: true,
          status: "ACTIVE",
          quantity: { gt: 0 },
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: {
                select: { name: true },
              },
            },
          },
        },
      });

      // Filter for low stock (can't use direct comparison in Prisma easily)
      const alerts = lowStockInventories
        .filter((inv) => inv.quantity <= inv.lowStockThreshold)
        .map((inventory) => ({
          productId: inventory.productId,
          productName: inventory.product.name,
          currentStock: inventory.quantity,
          threshold: inventory.lowStockThreshold,
          categoryName: inventory.product.category.name,
        }));

      // Cache for 15 minutes
      await this.cacheService.set(cacheKey, alerts, 900);

      return alerts;
    } catch (error) {
      this.handleError("Error fetching low stock alerts", error);
      throw error;
    }
  }

  /**
   * Perform inventory adjustment
   */
  async performInventoryAdjustment(
    request: InventoryAdjustmentRequest,
    userId: string
  ): Promise<Inventory> {
    try {
      const inventory = await InventoryModel.findUnique({
        where: { productId: request.productId },
      });

      if (!inventory) {
        throw new AppError(
          "Inventory record not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      const previousQuantity = inventory.quantity;
      let newQuantity: number;

      switch (request.adjustmentType) {
        case "set":
          newQuantity = request.quantity;
          break;
        case "increase":
          newQuantity = previousQuantity + request.quantity;
          break;
        case "decrease":
          newQuantity = Math.max(0, previousQuantity - request.quantity);
          break;
        default:
          throw new AppError(
            "Invalid adjustment type",
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR
          );
      }

      // Update inventory
      const updatedInventory = await InventoryModel.update({
        where: { productId: request.productId },
        data: {
          quantity: newQuantity,
          lastCost: request.unitCost || inventory.lastCost,
          updatedAt: new Date(),
        },
      });

      // Create movement record
      const movementType =
        newQuantity > previousQuantity ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";

      await InventoryMovementModel.create({
        data: {
          inventoryId: inventory.id,
          productId: request.productId,
          type: movementType,
          quantity: Math.abs(newQuantity - previousQuantity),
          previousQuantity,
          newQuantity,
          unitCost: request.unitCost,
          reason: request.reason,
          notes: request.notes,
          createdBy: userId,
        },
      });

      // Clear cache
      await this.clearInventoryCache(request.productId);

      return this.transformInventory(updatedInventory);
    } catch (error) {
      this.handleError("Error performing inventory adjustment", error);
      throw error;
    }
  }

  // Private helper methods

  private async checkLowStockAlert(inventory: any): Promise<void> {
    if (
      inventory.trackInventory &&
      inventory.quantity <= inventory.lowStockThreshold &&
      inventory.quantity > 0
    ) {
      await this.notificationService.sendNotification({
        type: "LOW_STOCK_ALERT",
        channel: "EMAIL",
        recipient: {
          email: "admin@bareloft.com",
        },
        variables: {
          productId: inventory.productId,
          currentStock: inventory.quantity,
          threshold: inventory.lowStockThreshold,
        },
      });
    }
  }

  private async getInventorySummary(): Promise<InventorySummary> {
    const [totalProducts, lowStockProducts, outOfStockProducts] =
      await Promise.all([
        InventoryModel.count(),
        InventoryModel.count({
          where: {
            quantity: { gt: 0 },
            trackInventory: true,
          },
        }),
        InventoryModel.count({ where: { quantity: 0 } }),
      ]);

    // Calculate total value (simplified)
    const inventoryItems = await InventoryModel.findMany({
      select: { quantity: true, averageCost: true },
    });

    const totalValue = inventoryItems.reduce(
      (sum, item) => sum + item.quantity * Number(item.averageCost),
      0
    );

    // Filter low stock from the count above
    const lowStockCount = await Promise.all(
      (
        await InventoryModel.findMany({
          where: { trackInventory: true, quantity: { gt: 0 } },
          select: { quantity: true, lowStockThreshold: true },
        })
      ).filter((inv) => inv.quantity <= inv.lowStockThreshold)
    );

    return {
      totalProducts,
      totalValue,
      lowStockProducts: lowStockCount.length,
      outOfStockProducts,
    };
  }

  private async clearInventoryCache(productId: string): Promise<void> {
    await Promise.all([
      this.cacheService.delete(`inventory:${productId}`),
      this.cacheService.delete("low-stock-alerts"),
      this.cacheService.deletePattern("inventory-list:*"),
    ]);
  }

  private transformInventory(inventory: any): Inventory {
    return {
      id: inventory.id,
      productId: inventory.productId,
      quantity: inventory.quantity,
      reservedQuantity: inventory.reservedQuantity,
      availableQuantity: inventory.quantity - inventory.reservedQuantity,
      lowStockThreshold: inventory.lowStockThreshold,
      reorderPoint: inventory.reorderPoint,
      reorderQuantity: inventory.reorderQuantity,
      status: inventory.status,
      trackInventory: inventory.trackInventory,
      allowBackorder: inventory.allowBackorder,
      averageCost: Number(inventory.averageCost),
      lastCost: Number(inventory.lastCost),
      lastRestockedAt: inventory.lastRestockedAt,
      lastSoldAt: inventory.lastSoldAt,
      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
    };
  }

  private transformInventoryListItem(inventory: any): any {
    return {
      id: inventory.id,
      productId: inventory.productId,
      productName: inventory.product.name,
      productSku: inventory.product.sku,
      quantity: inventory.quantity,
      reservedQuantity: inventory.reservedQuantity,
      availableQuantity: inventory.quantity - inventory.reservedQuantity,
      lowStockThreshold: inventory.lowStockThreshold,
      status: inventory.status,
      lastMovementAt: inventory.updatedAt,
      totalValue: Number(inventory.averageCost) * inventory.quantity,
      categoryName: inventory.product.category?.name,
    };
  }
}
