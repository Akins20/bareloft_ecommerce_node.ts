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
import { NotificationType, NotificationChannel } from "../../types/notification.types";
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
      const product = await InventoryModel.findUnique({
        where: { id: productId },
        include: {
          category: {
            select: { name: true },
          },
          stockReservations: {
            where: {
              expiresAt: { gt: new Date() }
            }
          }
        },
      });

      if (!product) {
        throw new AppError(
          "Product not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      return this.transformProductToInventory(product);
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

      // Build where clause for Product table
      const where: any = { isActive: true };

      if (outOfStock) where.stock = 0;
      if (categoryId) where.categoryId = categoryId;
      if (searchTerm) {
        where.OR = [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { sku: { contains: searchTerm, mode: "insensitive" } },
        ];
      }

      // Execute queries
      const [inventories, total, summary] = await Promise.all([
        InventoryModel.findMany({
          where,
          include: {
            category: {
              select: { name: true },
            },
            stockReservations: {
              where: {
                expiresAt: { gt: new Date() }
              }
            }
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
        inventories: inventories.map((product) => this.transformProductToInventoryListItem(product)),
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
      // Get current product information
      const product = await InventoryModel.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new AppError(
          "Product not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      const previousQuantity = product.stock;

      const updatedProduct = await InventoryModel.update({
        where: { id: productId },
        data: {
          stock: request.quantity ?? product.stock,
          lowStockThreshold:
            request.lowStockThreshold ?? product.lowStockThreshold,
          trackQuantity: request.trackInventory ?? product.trackQuantity,
          updatedAt: new Date(),
        },
      });

      // Create inventory movement if quantity changed
      if (
        request.quantity !== undefined &&
        request.quantity !== previousQuantity
      ) {
        const movementType = "ADJUSTMENT";

        await InventoryMovementModel.create({
          data: {
            productId,
            type: movementType,
            quantity: Math.abs(request.quantity - previousQuantity),
            reason: request.reason || "Manual adjustment",
            reference: `manual-${Date.now()}`,
          },
        });
      }

      // Check for low stock alerts
      await this.checkLowStockAlert(updatedProduct);

      // Clear cache
      await this.clearInventoryCache(productId);

      return this.transformProductToInventory(updatedProduct);
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
              productId: update.productId,
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
      if (cached) return cached as any[];

      const lowStockProducts = await InventoryModel.findMany({
        where: {
          trackQuantity: true,
          isActive: true,
          stock: { gt: 0 },
        },
        include: {
          category: {
            select: { name: true },
          },
        },
      });

      // Filter for low stock (can't use direct comparison in Prisma easily)
      const alerts = lowStockProducts
        .filter((product) => product.stock <= product.lowStockThreshold)
        .map((product) => ({
          productId: product.id,
          productName: product.name,
          currentStock: product.stock,
          threshold: product.lowStockThreshold,
          categoryName: product.category.name,
        }));

      // Cache for 15 minutes
      await this.cacheService.set(cacheKey, alerts, { ttl: 900 });

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
      const product = await InventoryModel.findUnique({
        where: { id: request.productId },
      });

      if (!product) {
        throw new AppError(
          "Product not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      const previousQuantity = product.stock;
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

      // Update product stock
      const updatedProduct = await InventoryModel.update({
        where: { id: request.productId },
        data: {
          stock: newQuantity,
          costPrice: request.unitCost || product.costPrice,
          updatedAt: new Date(),
        },
      });

      // Create movement record
      const movementType = "ADJUSTMENT";

      await InventoryMovementModel.create({
        data: {
          productId: request.productId,
          type: movementType,
          quantity: Math.abs(newQuantity - previousQuantity),
          reason: request.reason,
          reference: `adjustment-${Date.now()}`,
        },
      });

      // Clear cache
      await this.clearInventoryCache(request.productId);

      return this.transformProductToInventory(updatedProduct);
    } catch (error) {
      this.handleError("Error performing inventory adjustment", error);
      throw error;
    }
  }

  // Private helper methods

  private async checkLowStockAlert(product: any): Promise<void> {
    if (
      product.trackQuantity &&
      product.stock <= product.lowStockThreshold &&
      product.stock > 0
    ) {
      await this.notificationService.sendNotification({
        type: NotificationType.LOW_STOCK_ALERT,
        channel: NotificationChannel.EMAIL,
        recipient: {
          email: "admin@bareloft.com",
        },
        variables: {
          productId: product.id,
          currentStock: product.stock,
          threshold: product.lowStockThreshold,
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
            stock: { gt: 0 },
            trackQuantity: true,
            isActive: true,
          },
        }),
        InventoryModel.count({ where: { stock: 0, isActive: true } }),
      ]);

    // Calculate total value (simplified)
    const products = await InventoryModel.findMany({
      where: { isActive: true },
      select: { stock: true, costPrice: true },
    });

    const totalValue = products.reduce(
      (sum, product) => sum + product.stock * Number(product.costPrice || 0),
      0
    );

    // Filter low stock from the count above
    const lowStockItems = await InventoryModel.findMany({
      where: { trackQuantity: true, stock: { gt: 0 }, isActive: true },
      select: { stock: true, lowStockThreshold: true },
    });
    
    const lowStockCount = lowStockItems.filter(
      (product) => product.stock <= product.lowStockThreshold
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
      // Using delete for pattern-like keys since deletePattern might not exist
      this.cacheService.delete("inventory-list"),
    ]);
  }

  private transformProductToInventory(product: any): Inventory {
    const reservedQuantity = product.stockReservations?.reduce(
      (sum: number, reservation: any) => sum + reservation.quantity,
      0
    ) || 0;

    return {
      id: product.id,
      productId: product.id,
      quantity: product.stock,
      reservedQuantity,
      availableQuantity: product.stock - reservedQuantity,
      lowStockThreshold: product.lowStockThreshold,
      reorderPoint: product.lowStockThreshold, // Using threshold as reorder point
      reorderQuantity: 50, // Default value
      status: product.isActive ? InventoryStatus.ACTIVE : InventoryStatus.INACTIVE,
      trackInventory: product.trackQuantity,
      allowBackorder: false, // Default value
      averageCost: Number(product.costPrice || 0),
      lastCost: Number(product.costPrice || 0),
      lastRestockedAt: null, // Would need separate tracking
      lastSoldAt: null, // Would need separate tracking
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private transformProductToInventoryListItem(product: any): any {
    const reservedQuantity = product.stockReservations?.reduce(
      (sum: number, reservation: any) => sum + reservation.quantity,
      0
    ) || 0;

    return {
      id: product.id,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      quantity: product.stock,
      reservedQuantity,
      availableQuantity: product.stock - reservedQuantity,
      lowStockThreshold: product.lowStockThreshold,
      status: product.isActive ? InventoryStatus.ACTIVE : InventoryStatus.INACTIVE,
      lastMovementAt: product.updatedAt,
      totalValue: Number(product.costPrice || 0) * product.stock,
      categoryName: product.category?.name,
    };
  }
}
