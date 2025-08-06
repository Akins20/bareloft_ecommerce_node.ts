import { BaseService } from "../BaseService";
import {
  ProductModel,
  InventoryMovementModel,
} from "../../models";
import { InventoryRepository } from "../../repositories/InventoryRepository";
import {
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
} from "../../types";
import { MovementType } from "@prisma/client";
import { CacheService } from "../cache/CacheService";
import { NotificationService } from "../notifications/NotificationService";

interface StockCheckResult {
  productId: string;
  available: boolean;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

interface StockUpdateData {
  productId: string;
  quantity: number;
  type: MovementType;
  reason?: string;
  reference?: string;
  referenceId?: string;
  unitCost?: number;
  userId: string;
}

interface BulkStockCheck {
  productId: string;
  requestedQuantity: number;
}

interface BulkStockResult {
  productId: string;
  available: boolean;
  availableQuantity: number;
  requestedQuantity: number;
  shortfall?: number;
}

export class StockService extends BaseService {
  private inventoryRepository: InventoryRepository;
  private cacheService: CacheService;
  private notificationService: NotificationService;

  constructor(
    inventoryRepository: InventoryRepository,
    cacheService: CacheService,
    notificationService: NotificationService
  ) {
    super();
    this.inventoryRepository = inventoryRepository;
    this.cacheService = cacheService;
    this.notificationService = notificationService;
  }

  /**
   * Check stock availability for a single product
   */
  async checkStockAvailability(
    productId: string,
    requestedQuantity: number = 1
  ): Promise<StockCheckResult> {
    try {
      const product = await ProductModel.findUnique({
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
    } catch (error) {
      this.handleError("Error checking stock availability", error);
      throw error;
    }
  }

  /**
   * Check stock availability for multiple products
   */
  async bulkCheckStockAvailability(
    requests: BulkStockCheck[]
  ): Promise<BulkStockResult[]> {
    try {
      const productIds = requests.map((req) => req.productId);

      const products = await ProductModel.findMany({
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

      const productMap = new Map(
        products.map((product) => [product.id, product])
      );

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
        const available =
          availableQuantity >= request.requestedQuantity &&
          product.isActive &&
          product.trackQuantity;

        const result: BulkStockResult = {
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
    } catch (error) {
      this.handleError("Error in bulk stock availability check", error);
      throw error;
    }
  }

  /**
   * Update stock levels with movement tracking
   */
  async updateStock(data: StockUpdateData): Promise<void> {
    try {
      const product = await ProductModel.findUnique({
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
        throw new AppError(
          "Product not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      const previousQuantity = product.stock;
      let newQuantity: number;

      // Calculate new quantity based on movement type
      if (this.isInboundMovement(data.type)) {
        newQuantity = previousQuantity + data.quantity;
      } else if (this.isOutboundMovement(data.type)) {
        newQuantity = Math.max(0, previousQuantity - data.quantity);

        // Check if we have enough stock
        const reservedStock = await this.getReservedStock(data.productId);
        const availableStock = product.stock - reservedStock;
        if (availableStock < data.quantity) {
          throw new AppError(
            "Insufficient stock available",
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.INSUFFICIENT_STOCK
          );
        }
      } else {
        // For adjustments, set directly
        newQuantity = data.quantity;
      }

      // Update product stock
      const updatedProduct = await ProductModel.update({
        where: { id: data.productId },
        data: {
          stock: newQuantity,
          costPrice: data.unitCost || product.costPrice,
          updatedAt: new Date(),
        },
      });

      // Create movement record
      await InventoryMovementModel.create({
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
    } catch (error) {
      this.handleError("Error updating stock", error);
      throw error;
    }
  }

  /**
   * Get current stock levels for multiple products
   */
  async getCurrentStockLevels(
    productIds: string[]
  ): Promise<Map<string, number>> {
    try {
      const products = await ProductModel.findMany({
        where: {
          id: { in: productIds },
        },
        select: {
          id: true,
          stock: true,
        },
      });

      const stockLevels = new Map<string, number>();

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
    } catch (error) {
      this.handleError("Error getting current stock levels", error);
      throw error;
    }
  }

  /**
   * Decrease stock (for sales/orders)
   */
  async decreaseStock(
    productId: string,
    quantity: number,
    orderId: string,
    userId: string
  ): Promise<void> {
    await this.updateStock({
      productId,
      quantity,
      type: MovementType.OUT,
      reason: "Product sold",
      reference: "order",
      referenceId: orderId,
      userId,
    });
  }

  /**
   * Increase stock (for restocking)
   */
  async increaseStock(
    productId: string,
    quantity: number,
    unitCost: number,
    reason: string,
    userId: string
  ): Promise<void> {
    await this.updateStock({
      productId,
      quantity,
      type: MovementType.IN,
      reason,
      unitCost,
      userId,
    });
  }

  /**
   * Handle returns (increase stock)
   */
  async handleReturn(
    productId: string,
    quantity: number,
    orderId: string,
    userId: string
  ): Promise<void> {
    await this.updateStock({
      productId,
      quantity,
      type: MovementType.IN,
      reason: "Customer return",
      reference: "order",
      referenceId: orderId,
      userId,
    });
  }

  /**
   * Mark stock as damaged (decrease without sale)
   */
  async markAsDamaged(
    productId: string,
    quantity: number,
    reason: string,
    userId: string
  ): Promise<void> {
    await this.updateStock({
      productId,
      quantity,
      type: MovementType.OUT,
      reason,
      userId,
    });
  }

  /**
   * Transfer stock between locations (future feature)
   */
  async transferStock(
    productId: string,
    quantity: number,
    fromLocation: string,
    toLocation: string,
    userId: string
  ): Promise<void> {
    // For now, just create movement records
    // In the future, this would handle multi-warehouse scenarios

    await this.updateStock({
      productId,
      quantity,
      type: MovementType.OUT,
      reason: `Transfer from ${fromLocation} to ${toLocation}`,
      userId,
    });
  }

  /**
   * Get stock movement history for a product
   */
  async getStockMovementHistory(
    productId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const movements = await InventoryMovementModel.findMany({
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
    } catch (error) {
      this.handleError("Error fetching stock movement history", error);
      throw error;
    }
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(): Promise<any[]> {
    try {
      const cacheKey = "low-stock-products";
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached as any[];

      const lowStockProducts = await ProductModel.findMany({
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
        stockPercentage: Math.round(
          (product.stock / product.lowStockThreshold) * 100
        ),
        urgency: this.calculateUrgency(
          product.stock,
          product.lowStockThreshold
        ),
      }));

      // Cache for 15 minutes
      await this.cacheService.set(cacheKey, result, { ttl: 900 });

      return result;
    } catch (error) {
      this.handleError("Error fetching low stock products", error);
      throw error;
    }
  }

  /**
   * Get out of stock products
   */
  async getOutOfStockProducts(): Promise<any[]> {
    try {
      const outOfStockProducts = await ProductModel.findMany({
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
    } catch (error) {
      this.handleError("Error fetching out of stock products", error);
      throw error;
    }
  }

  // Private helper methods

  private async getReservedStock(productId: string): Promise<number> {
    // Import StockReservationModel locally to avoid circular imports
    const { StockReservationModel } = await import("../../models");
    
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

  private isInboundMovement(type: MovementType): boolean {
    return type === MovementType.IN;
  }

  private isOutboundMovement(type: MovementType): boolean {
    return type === MovementType.OUT;
  }


  private async checkStockAlerts(product: { productId: string; stock: number; lowStockThreshold: number }): Promise<void> {
    // Low stock alert
    if (
      product.stock <= product.lowStockThreshold &&
      product.stock > 0
    ) {
      await this.sendLowStockAlert(product);
    }

    // Out of stock alert
    if (product.stock === 0) {
      await this.sendOutOfStockAlert(product);
    }
  }

  private async sendLowStockAlert(product: { productId: string; stock: number; lowStockThreshold: number }): Promise<void> {
    await this.notificationService.sendNotification({
      type: "PRODUCT_ALERT" as any,
      channel: "EMAIL" as any,
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

  private async sendOutOfStockAlert(product: { productId: string }): Promise<void> {
    await this.notificationService.sendNotification({
      type: "PRODUCT_ALERT" as any,
      channel: "EMAIL" as any,
      recipient: {
        email: "inventory@bareloft.com",
      },
      variables: {
        productId: product.productId,
      },
    });
  }


  private calculateUrgency(
    currentStock: number,
    threshold: number
  ): "low" | "medium" | "high" | "critical" {
    if (currentStock === 0) return "critical";

    const ratio = currentStock / threshold;
    if (ratio <= 0.25) return "high";
    if (ratio <= 0.5) return "medium";
    return "low";
  }

  private async clearStockCache(productId: string): Promise<void> {
    await Promise.all([
      this.cacheService.delete(`stock:${productId}`),
      this.cacheService.delete("low-stock-products"),
    ]);
  }
}
