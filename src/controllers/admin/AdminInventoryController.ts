import { Request, Response } from "express";
import { BaseAdminController } from "../BaseAdminController";
import { InventoryService } from "@/services/inventory/InventoryService";
import { MovementService } from "@/services/inventory/MovementService";
import { ReservationService } from "@/services/inventory/ReservationService";
import { StockService } from "@/services/inventory/StockService";
import { CacheService } from "@/services/cache/CacheService";
import { ProductRepository } from "@/repositories/ProductRepository";
import { NotificationService } from "@/services/notifications/NotificationService";
import { inventorySchemas } from "@/utils/validation/schemas/adminSchemas";
import { 
  InventoryListResponse,
  InventoryMovementType,
  BulkInventoryUpdateRequest,
  InventoryAdjustmentRequest,
  ReserveStockRequest,
  ReleaseReservationRequest
} from "@/types";
import { NigerianUtils } from "@/utils/helpers/nigerian";

/**
 * Admin Inventory Management Controller with Nigerian E-commerce Features
 * 
 * Provides comprehensive inventory management for Nigerian e-commerce:
 * - Multi-currency support (Naira/Kobo)
 * - Nigerian business hours integration
 * - Bulk operations for efficiency
 * - Stock reservations and movements
 * - Admin activity logging
 * - Nigerian compliance features
 */
export class AdminInventoryController extends BaseAdminController {
  private inventoryService: InventoryService;
  private movementService: MovementService;
  private reservationService: ReservationService;
  private stockService: StockService;

  constructor(
    productRepository?: ProductRepository,
    cacheService?: CacheService,
    notificationService?: NotificationService
  ) {
    super();
    
    // Initialize services with proper dependencies or empty placeholders
    const productRepo = productRepository || {} as ProductRepository;
    const cache = cacheService || {} as CacheService;
    const notifications = notificationService || {} as NotificationService;
    
    this.inventoryService = new InventoryService(
      productRepo,
      cache,
      notifications
    );
    this.movementService = new MovementService(cache);
    this.reservationService = new ReservationService(cache);
    this.stockService = {} as StockService; // Use placeholder for now
  }

  /**
   * Get comprehensive inventory overview with stock levels
   * GET /api/admin/inventory
   */
  public getInventoryOverview = async (req: Request, res: Response): Promise<void> => {
    try {
      // Admin authentication check
      if (!this.requireAdminAuth(req, res)) return;

      const adminId = this.getUserId(req);
      const { page = 1, limit = 20 } = this.parsePaginationParams(req.query);
      
      const {
        searchTerm,
        categoryId,
        lowStock,
        outOfStock,
        status
      } = req.query;

      // Log admin activity
      this.logAdminActivity(req, 'inventory_management', 'get_inventory_overview', {
        description: 'Retrieved inventory overview with filters',
        severity: 'low',
        resourceType: 'inventory',
        metadata: { filters: req.query, page, limit }
      });

      // Build filter options for InventoryService
      const filters = {
        searchTerm: searchTerm as string,
        categoryId: categoryId as string,
        lowStock: lowStock === 'true',
        outOfStock: outOfStock === 'true',
        status: status as any,
        page,
        limit
      };

      // Get inventory list from service
      const inventoryData = await this.inventoryService.getInventoryList(filters);

      // Transform data with Nigerian business context
      const transformedInventories = inventoryData.inventories.map(item => ({
        ...item,
        // Format currency values for admin display
        totalValue: this.formatAdminCurrency(item.totalValue || 0, {
          format: 'display',
          showKobo: true,
          precision: 2
        }),
        costPrice: item.costPrice ? this.formatAdminCurrency(item.costPrice, {
          format: 'display'
        }) : null,
        // Add Nigerian business context
        lastMovementNigerianTime: item.lastMovementAt ? 
          NigerianUtils.Business.formatNigerianDate(new Date(item.lastMovementAt), 'long') : null,
        businessHoursStatus: this.isPeakShoppingTime() ? 'peak' : 'normal'
      }));

      // Enhanced summary with Nigerian context
      const enhancedSummary = {
        ...inventoryData.summary,
        totalValue: this.formatAdminCurrency(inventoryData.summary.totalValue, {
          format: 'display',
          showKobo: true
        }),
        nigerianContext: {
          vatOnInventory: this.formatAdminCurrency(
            NigerianUtils.Ecommerce.calculateVAT(inventoryData.summary.totalValue)
          ),
          businessHours: NigerianUtils.Business.isBusinessHours(),
          timezone: 'Africa/Lagos',
          lastUpdated: NigerianUtils.Business.formatNigerianDate(new Date(), 'long')
        }
      };

      const response = {
        inventories: transformedInventories,
        pagination: inventoryData.pagination,
        summary: enhancedSummary
      };

      this.sendAdminSuccess(res, response, 'Inventory overview retrieved successfully', 200, {
        activity: 'inventory_management',
        includeMetrics: true,
        includeCurrencyInfo: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get low stock alerts with Nigerian business context
   * GET /api/admin/inventory/low-stock
   */
  public getLowStockItems = async (req: Request, res: Response): Promise<void> => {
    try {
      // Admin authentication check
      if (!this.requireAdminAuth(req, res)) return;

      // Validate query parameters
      const { error, value: queryParams } = inventorySchemas.lowStockQuery.validate(req.query);
      if (error) {
        this.sendError(res, "Invalid query parameters", 400, "VALIDATION_ERROR", error.details.map(d => d.message));
        return;
      }

      const { threshold, categoryId, includeOutOfStock } = queryParams;

      // Log admin activity
      this.logAdminActivity(req, 'inventory_management', 'get_low_stock_alerts', {
        description: 'Retrieved low stock alerts for inventory monitoring',
        severity: 'medium',
        resourceType: 'inventory_alerts',
        metadata: { threshold, categoryId, includeOutOfStock }
      });

      // Get low stock alerts from service
      const lowStockAlerts = await this.inventoryService.getLowStockAlerts();

      // Transform with Nigerian business context and currency formatting
      const transformedAlerts = lowStockAlerts.map(alert => ({
        ...alert,
        // Add priority based on Nigerian business context
        priority: this.calculateStockPriority(alert.currentStock, alert.threshold),
        // Format with Nigerian timezone
        lastCheckedNigerianTime: NigerianUtils.Business.formatNigerianDate(new Date(), 'short'),
        // Business impact assessment
        businessImpact: this.assessBusinessImpact(alert.currentStock, alert.threshold),
        // Add reorder recommendations
        reorderRecommendation: this.generateReorderRecommendation(alert)
      }));

      // Group by priority for better admin visibility
      const alertSummary = {
        critical: transformedAlerts.filter(alert => alert.priority === 'critical'),
        high: transformedAlerts.filter(alert => alert.priority === 'high'),
        medium: transformedAlerts.filter(alert => alert.priority === 'medium'),
        total: transformedAlerts.length
      };

      const response = {
        alerts: transformedAlerts,
        summary: alertSummary,
        nigerianContext: {
          businessHours: NigerianUtils.Business.isBusinessHours(),
          isPeakShopping: this.isPeakShoppingTime(),
          timezone: 'Africa/Lagos',
          lastUpdated: NigerianUtils.Business.formatNigerianDate(new Date(), 'long')
        }
      };

      // Use higher severity if critical alerts exist
      const severity = alertSummary.critical.length > 0 ? 'high' : 'medium';

      this.sendAdminSuccess(res, response, 'Low stock alerts retrieved successfully', 200, {
        activity: 'inventory_management',
        includeMetrics: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Update inventory for a product with Nigerian compliance
   * PUT /api/admin/inventory/:productId
   */
  public updateInventory = async (req: Request, res: Response): Promise<void> => {
    try {
      // Admin authentication check
      if (!this.requireAdminAuth(req, res)) return;

      const { productId } = req.params;
      const adminId = this.getUserId(req);

      if (!this.isValidUUID(productId)) {
        this.sendError(res, "Invalid product ID format", 400, "INVALID_ID");
        return;
      }

      // Validate request body
      const { error, value: updateData } = inventorySchemas.updateInventory.validate(req.body);
      if (error) {
        this.sendError(res, "Invalid inventory data", 400, "VALIDATION_ERROR", error.details.map(d => d.message));
        return;
      }

      // Log admin activity with detailed context
      this.logAdminActivity(req, 'inventory_management', 'update_inventory', {
        description: `Updated inventory for product ${productId}`,
        severity: 'medium',
        resourceType: 'product_inventory',
        resourceId: productId,
        metadata: { updateData, adminId }
      });

      // Use InventoryService to update inventory
      const updatedInventory = await this.inventoryService.updateInventory(
        productId,
        updateData,
        adminId
      );

      // Format the response with Nigerian context
      const formattedResponse = {
        ...updatedInventory,
        // Format currency fields
        averageCost: this.formatAdminCurrency(updatedInventory.averageCost, {
          format: 'display',
          showKobo: true
        }),
        lastCost: this.formatAdminCurrency(updatedInventory.lastCost, {
          format: 'display',
          showKobo: true
        }),
        // Add Nigerian business context
        updatedAtNigerianTime: NigerianUtils.Business.formatNigerianDate(
          new Date(updatedInventory.updatedAt), 'long'
        ),
        businessHoursUpdate: NigerianUtils.Business.isBusinessHours(),
        adminInfo: {
          updatedBy: adminId,
          timezone: 'Africa/Lagos'
        }
      };

      this.sendAdminSuccess(res, formattedResponse, 'Inventory updated successfully', 200, {
        activity: 'inventory_management',
        includeCurrencyInfo: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get detailed inventory for specific product
   * GET /api/admin/inventory/:productId
   */
  public getProductInventory = async (req: Request, res: Response): Promise<void> => {
    try {
      // Admin authentication check
      if (!this.requireAdminAuth(req, res)) return;

      const { productId } = req.params;

      if (!this.isValidUUID(productId)) {
        this.sendError(res, "Invalid product ID format", 400, "INVALID_ID");
        return;
      }

      // Log admin activity
      this.logAdminActivity(req, 'inventory_management', 'get_product_inventory', {
        description: `Retrieved detailed inventory for product ${productId}`,
        severity: 'low',
        resourceType: 'product_inventory',
        resourceId: productId
      });

      // Get product inventory from service
      const inventory = await this.inventoryService.getProductInventory(productId);

      // Get recent movements for this product
      const movements = await this.movementService.getStockMovementHistory(productId, 10);

      // Get active reservations for this product
      const reservations = await this.reservationService.getProductReservations(productId);

      // Format the response with Nigerian context
      const formattedResponse = {
        inventory: {
          ...inventory,
          averageCost: this.formatAdminCurrency(inventory.averageCost, {
            format: 'display',
            showKobo: true
          }),
          lastCost: this.formatAdminCurrency(inventory.lastCost, {
            format: 'display',
            showKobo: true
          }),
          totalValue: this.formatAdminCurrency(
            inventory.quantity * inventory.averageCost, {
              format: 'display',
              showKobo: true
            }
          )
        },
        movements: movements.map(movement => ({
          ...movement,
          createdAtNigerianTime: NigerianUtils.Business.formatNigerianDate(
            new Date(movement.createdAt), 'long'
          ),
          unitCost: movement.unitCost ? this.formatAdminCurrency(movement.unitCost) : null,
          totalCost: movement.totalCost ? this.formatAdminCurrency(movement.totalCost) : null
        })),
        reservations: reservations.map(reservation => ({
          ...reservation,
          expiresAtNigerianTime: NigerianUtils.Business.formatNigerianDate(
            new Date(reservation.expiresAt), 'long'
          )
        })),
        nigerianContext: {
          businessHours: NigerianUtils.Business.isBusinessHours(),
          timezone: 'Africa/Lagos',
          lastUpdated: NigerianUtils.Business.formatNigerianDate(new Date(), 'long')
        }
      };

      this.sendAdminSuccess(res, formattedResponse, 'Product inventory details retrieved successfully', 200, {
        activity: 'inventory_management',
        includeCurrencyInfo: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Adjust inventory levels with comprehensive logging
   * POST /api/admin/inventory/:productId/adjust
   */
  public adjustInventory = async (req: Request, res: Response): Promise<void> => {
    try {
      // Admin authentication check
      if (!this.requireAdminAuth(req, res)) return;

      const { productId } = req.params;
      const adminId = this.getUserId(req);

      if (!this.isValidUUID(productId)) {
        this.sendError(res, "Invalid product ID format", 400, "INVALID_ID");
        return;
      }

      // Validate request body
      const { error, value: adjustmentData } = inventorySchemas.inventoryAdjustment.validate(req.body);
      if (error) {
        this.sendError(res, "Invalid adjustment data", 400, "VALIDATION_ERROR", error.details.map(d => d.message));
        return;
      }

      // Log admin activity with high severity for adjustments
      this.logAdminActivity(req, 'inventory_management', 'adjust_inventory', {
        description: `Performed ${adjustmentData.adjustmentType} adjustment of ${adjustmentData.quantity} units`,
        severity: 'high',
        resourceType: 'product_inventory',
        resourceId: productId,
        metadata: { adjustmentData, adminId }
      });

      // Use InventoryService to perform adjustment
      const adjustmentRequest: InventoryAdjustmentRequest = {
        productId,
        adjustmentType: adjustmentData.adjustmentType,
        quantity: adjustmentData.quantity,
        reason: adjustmentData.reason,
        notes: adjustmentData.notes,
        unitCost: adjustmentData.unitCost
      };

      const updatedInventory = await this.inventoryService.performInventoryAdjustment(
        adjustmentRequest,
        adminId
      );

      // Format the response with Nigerian context
      const formattedResponse = {
        ...updatedInventory,
        // Format currency fields
        averageCost: this.formatAdminCurrency(updatedInventory.averageCost, {
          format: 'display',
          showKobo: true
        }),
        lastCost: this.formatAdminCurrency(updatedInventory.lastCost, {
          format: 'display',
          showKobo: true
        }),
        // Add Nigerian business context
        adjustedAtNigerianTime: NigerianUtils.Business.formatNigerianDate(
          new Date(updatedInventory.updatedAt), 'long'
        ),
        businessHoursAdjustment: NigerianUtils.Business.isBusinessHours(),
        adjustmentInfo: {
          performedBy: adminId,
          type: adjustmentData.adjustmentType,
          reason: adjustmentData.reason,
          timezone: 'Africa/Lagos'
        }
      };

      this.sendAdminSuccess(res, formattedResponse, 'Inventory adjusted successfully', 200, {
        activity: 'inventory_management',
        includeCurrencyInfo: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Bulk inventory update with Nigerian compliance and enhanced processing
   * POST /api/admin/inventory/bulk-update
   */
  public bulkUpdateInventory = async (req: Request, res: Response): Promise<void> => {
    try {
      // Admin authentication check - require higher privileges for bulk operations
      if (!this.requireAdminAuth(req, res, 'admin')) return;

      const adminId = this.getUserId(req);

      // Validate request body
      const { error, value: bulkData } = inventorySchemas.bulkInventoryUpdate.validate(req.body);
      if (error) {
        this.sendError(res, "Invalid bulk update data", 400, "VALIDATION_ERROR", error.details.map(d => d.message));
        return;
      }

      const { updates, batchReason, notes } = bulkData;

      // Log admin activity with high severity for bulk operations
      this.logAdminActivity(req, 'bulk_operations', 'bulk_inventory_update', {
        description: `Bulk inventory update for ${updates.length} products`,
        severity: 'high',
        resourceType: 'inventory_bulk',
        metadata: { updateCount: updates.length, batchReason, adminId }
      });

      // Use the BaseAdminController's bulk operation processor
      const bulkRequest: BulkInventoryUpdateRequest = {
        updates,
        batchReason,
        notes
      };

      // Process bulk update using InventoryService
      const bulkResult = await this.inventoryService.bulkUpdateInventory(bulkRequest, adminId);

      // Enhanced response with Nigerian business context
      const response = {
        summary: {
          totalItems: updates.length,
          successful: bulkResult.successful,
          failed: bulkResult.failed,
          successRate: Math.round((bulkResult.successful / updates.length) * 100),
          batchReason,
          notes
        },
        errors: bulkResult.errors,
        nigerianContext: {
          processedAt: NigerianUtils.Business.formatNigerianDate(new Date(), 'long'),
          businessHours: NigerianUtils.Business.isBusinessHours(),
          timezone: 'Africa/Lagos',
          performedBy: adminId
        }
      };

      const message = `Bulk inventory update completed: ${bulkResult.successful} successful, ${bulkResult.failed} failed`;

      this.sendAdminSuccess(res, response, message, 200, {
        activity: 'bulk_operations',
        includeMetrics: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get comprehensive inventory movements/history
   * GET /api/admin/inventory/movements
   */
  public getInventoryMovements = async (req: Request, res: Response): Promise<void> => {
    try {
      // Admin authentication check
      if (!this.requireAdminAuth(req, res)) return;

      const { page = 1, limit = 50 } = this.parsePaginationParams(req.query);
      
      const { 
        productId,
        dateFrom,
        dateTo,
        type,
        createdBy
      } = req.query;

      // Log admin activity
      this.logAdminActivity(req, 'inventory_management', 'get_inventory_movements', {
        description: 'Retrieved inventory movement history',
        severity: 'low',
        resourceType: 'inventory_movements',
        metadata: { filters: req.query }
      });

      // Build filter options for MovementService
      const filters = {
        productId: productId as string,
        type: type as InventoryMovementType,
        startDate: dateFrom ? new Date(dateFrom as string) : undefined,
        endDate: dateTo ? new Date(dateTo as string) : undefined,
        createdBy: createdBy as string,
        page,
        limit
      };

      // Get movements from service
      const movementsData = await this.movementService.getMovements(filters);

      // Transform movements with Nigerian business context
      const transformedMovements = movementsData.movements.map(movement => ({
        ...movement,
        // Format currency values
        unitCost: movement.unitCost ? this.formatAdminCurrency(movement.unitCost, {
          format: 'display',
          showKobo: true
        }) : null,
        totalCost: movement.totalCost ? this.formatAdminCurrency(movement.totalCost, {
          format: 'display',
          showKobo: true
        }) : null,
        // Add Nigerian time formatting
        createdAtNigerianTime: NigerianUtils.Business.formatNigerianDate(
          new Date(movement.createdAt), 'long'
        ),
        // Add movement direction for better visualization
        direction: this.getMovementDirection(movement.type),
        impactDescription: this.getMovementImpactDescription(movement.type, movement.quantity)
      }));

      const response = {
        movements: transformedMovements,
        pagination: movementsData.pagination,
        summary: {
          totalMovements: movementsData.pagination.totalItems,
          dateRange: {
            from: dateFrom ? NigerianUtils.Business.formatNigerianDate(new Date(dateFrom as string), 'short') : null,
            to: dateTo ? NigerianUtils.Business.formatNigerianDate(new Date(dateTo as string), 'short') : null
          }
        },
        nigerianContext: {
          businessHours: NigerianUtils.Business.isBusinessHours(),
          timezone: 'Africa/Lagos',
          lastUpdated: NigerianUtils.Business.formatNigerianDate(new Date(), 'long')
        }
      };

      this.sendAdminSuccess(res, response, 'Inventory movements retrieved successfully', 200, {
        activity: 'inventory_management',
        includeCurrencyInfo: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get out of stock products
   * GET /api/admin/inventory/out-of-stock
   */
  public getOutOfStockItems = async (req: Request, res: Response): Promise<void> => {
    try {
      // Admin authentication check
      if (!this.requireAdminAuth(req, res)) return;

      const { page = 1, limit = 20 } = this.parsePaginationParams(req.query);
      const { categoryId } = req.query;

      // Log admin activity
      this.logAdminActivity(req, 'inventory_management', 'get_out_of_stock_items', {
        description: 'Retrieved out of stock products',
        severity: 'medium',
        resourceType: 'inventory_alerts'
      });

      // Get out of stock items using inventory service
      const filters = {
        outOfStock: true,
        categoryId: categoryId as string,
        page,
        limit
      };

      const inventoryData = await this.inventoryService.getInventoryList(filters);

      // Transform with Nigerian context
      const transformedItems = inventoryData.inventories
        .filter(item => item.quantity === 0)
        .map(item => ({
          ...item,
          lastMovementNigerianTime: item.lastMovementAt ? 
            NigerianUtils.Business.formatNigerianDate(new Date(item.lastMovementAt), 'long') : null,
          businessImpact: 'Critical - Unable to fulfill orders',
          reorderUrgency: 'immediate'
        }));

      const response = {
        outOfStockItems: transformedItems,
        pagination: inventoryData.pagination,
        summary: {
          totalOutOfStock: transformedItems.length,
          criticalImpact: transformedItems.length,
          businessHours: NigerianUtils.Business.isBusinessHours()
        }
      };

      this.sendAdminSuccess(res, response, 'Out of stock items retrieved successfully', 200, {
        activity: 'inventory_management'
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Reserve stock for orders
   * POST /api/admin/inventory/reserve
   */
  public reserveStock = async (req: Request, res: Response): Promise<void> => {
    try {
      // Admin authentication check
      if (!this.requireAdminAuth(req, res)) return;

      const adminId = this.getUserId(req);
      const { productId, quantity, orderId, cartId, reason, expirationMinutes } = req.body;

      if (!productId || !quantity || !reason) {
        this.sendError(res, "Product ID, quantity, and reason are required", 400, "VALIDATION_ERROR");
        return;
      }

      // Log admin activity
      this.logAdminActivity(req, 'inventory_management', 'reserve_stock', {
        description: `Reserved ${quantity} units for product ${productId}`,
        severity: 'medium',
        resourceType: 'stock_reservation',
        resourceId: productId,
        metadata: { quantity, orderId, cartId, reason }
      });

      // Create reservation request
      const reservationRequest: ReserveStockRequest = {
        productId,
        quantity: parseInt(quantity),
        orderId,
        cartId,
        reason,
        expirationMinutes: expirationMinutes || 15 // Default 15 minutes
      };

      // Reserve stock using reservation service
      const result = await this.reservationService.reserveStock(reservationRequest);

      if (result.success) {
        const response = {
          reservation: {
            id: result.reservationId,
            productId,
            quantity,
            reservedQuantity: result.reservedQuantity,
            availableQuantity: result.availableQuantity,
            expiresAt: new Date(Date.now() + (expirationMinutes || 15) * 60 * 1000),
            createdBy: adminId
          },
          nigerianContext: {
            reservedAt: NigerianUtils.Business.formatNigerianDate(new Date(), 'long'),
            businessHours: NigerianUtils.Business.isBusinessHours(),
            timezone: 'Africa/Lagos'
          }
        };

        this.sendAdminSuccess(res, response, 'Stock reserved successfully', 201, {
          activity: 'inventory_management'
        });
      } else {
        this.sendError(res, result.message, 400, "RESERVATION_FAILED");
      }
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Release reserved stock
   * POST /api/admin/inventory/release
   */
  public releaseReservedStock = async (req: Request, res: Response): Promise<void> => {
    try {
      // Admin authentication check
      if (!this.requireAdminAuth(req, res)) return;

      const { reservationId, orderId, cartId, reason } = req.body;

      if (!reservationId && !orderId && !cartId) {
        this.sendError(res, "Reservation ID, Order ID, or Cart ID is required", 400, "VALIDATION_ERROR");
        return;
      }

      // Log admin activity
      this.logAdminActivity(req, 'inventory_management', 'release_reserved_stock', {
        description: 'Released reserved stock',
        severity: 'medium',
        resourceType: 'stock_reservation',
        resourceId: reservationId || orderId || cartId,
        metadata: { reservationId, orderId, cartId, reason }
      });

      // Create release request
      const releaseRequest: ReleaseReservationRequest = {
        reservationId,
        orderId,
        cartId,
        reason: reason || 'Admin manual release'
      };

      // Release reservation using service
      const result = await this.reservationService.releaseReservation(releaseRequest);

      if (result.success) {
        const response = {
          released: true,
          reservedQuantity: result.reservedQuantity,
          message: result.message,
          nigerianContext: {
            releasedAt: NigerianUtils.Business.formatNigerianDate(new Date(), 'long'),
            businessHours: NigerianUtils.Business.isBusinessHours(),
            timezone: 'Africa/Lagos'
          }
        };

        this.sendAdminSuccess(res, response, 'Reserved stock released successfully', 200, {
          activity: 'inventory_management'
        });
      } else {
        this.sendError(res, result.message, 400, "RELEASE_FAILED");
      }
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get comprehensive inventory statistics with Nigerian business context
   * GET /api/admin/inventory/statistics
   */
  public getInventoryStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      // Admin authentication check
      if (!this.requireAdminAuth(req, res)) return;

      // Log admin activity
      this.logAdminActivity(req, 'analytics_access', 'get_inventory_statistics', {
        description: 'Retrieved comprehensive inventory statistics',
        severity: 'low',
        resourceType: 'inventory_analytics'
      });

      // Get various statistics from services
      const [
        inventoryOverview,
        lowStockAlerts,
        reservationStats
      ] = await Promise.all([
        this.inventoryService.getInventoryList({ page: 1, limit: 1 }), // Just for summary
        this.inventoryService.getLowStockAlerts(),
        this.reservationService.getReservationStats()
      ]);

      // Calculate Nigerian business metrics
      const totalValue = inventoryOverview.summary.totalValue;
      const vatAmount = NigerianUtils.Ecommerce.calculateVAT(totalValue);

      const statistics = {
        overview: {
          totalProducts: inventoryOverview.summary.totalProducts,
          inStock: inventoryOverview.summary.totalProducts - inventoryOverview.summary.outOfStockProducts,
          lowStock: inventoryOverview.summary.lowStockProducts,
          outOfStock: inventoryOverview.summary.outOfStockProducts,
          totalValue: this.formatAdminCurrency(totalValue, { format: 'display', showKobo: true }),
          vatAmount: this.formatAdminCurrency(vatAmount, { format: 'display', showKobo: true }),
          currency: 'NGN'
        },
        alerts: {
          lowStock: lowStockAlerts.length,
          outOfStock: inventoryOverview.summary.outOfStockProducts,
          critical: lowStockAlerts.filter(alert => alert.currentStock === 0).length,
          reservationsExpiringSoon: reservationStats.expiringSoon
        },
        reservations: {
          activeReservations: reservationStats.totalActiveReservations,
          totalReservedQuantity: reservationStats.totalReservedQuantity,
          expiringSoon: reservationStats.expiringSoon,
          byProduct: reservationStats.byProduct.slice(0, 5) // Top 5
        },
        nigerianContext: {
          businessHours: NigerianUtils.Business.isBusinessHours(),
          isPeakShopping: this.isPeakShoppingTime(),
          timezone: 'Africa/Lagos',
          lastUpdated: NigerianUtils.Business.formatNigerianDate(new Date(), 'long'),
          vatRate: '7.5%',
          currency: {
            primary: 'NGN',
            symbol: '₦',
            subunit: 'kobo'
          }
        }
      };

      this.sendAdminSuccess(res, statistics, 'Inventory statistics retrieved successfully', 200, {
        activity: 'analytics_access',
        includeMetrics: true,
        includeCurrencyInfo: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  // Helper methods for Nigerian business context

  private calculateStockPriority(currentStock: number, threshold: number): 'critical' | 'high' | 'medium' | 'low' {
    if (currentStock === 0) return 'critical';
    if (currentStock <= threshold * 0.5) return 'high';
    if (currentStock <= threshold) return 'medium';
    return 'low';
  }

  private assessBusinessImpact(currentStock: number, threshold: number): string {
    if (currentStock === 0) return 'Critical - Cannot fulfill orders';
    if (currentStock <= threshold * 0.5) return 'High - Risk of stockout within 1-2 days';
    if (currentStock <= threshold) return 'Medium - Should reorder soon';
    return 'Low - Stock levels adequate';
  }

  private generateReorderRecommendation(alert: any): string {
    if (alert.currentStock === 0) {
      return 'Immediate reorder required - Emergency procurement needed';
    }
    if (alert.currentStock <= alert.threshold * 0.5) {
      return 'Urgent reorder - Place order within 24 hours';
    }
    return 'Standard reorder - Monitor and reorder when convenient';
  }

  private getMovementDirection(type: InventoryMovementType): 'in' | 'out' | 'adjustment' {
    const inboundTypes = ['IN', 'RESTOCK', 'RETURN', 'TRANSFER_IN', 'RELEASE_RESERVE'];
    const outboundTypes = ['OUT', 'SALE', 'TRANSFER_OUT', 'DAMAGE', 'THEFT', 'EXPIRED', 'RESERVE'];
    
    if (inboundTypes.includes(type)) return 'in';
    if (outboundTypes.includes(type)) return 'out';
    return 'adjustment';
  }

  private getMovementImpactDescription(type: InventoryMovementType, quantity: number): string {
    const direction = this.getMovementDirection(type);
    const sign = direction === 'in' ? '+' : direction === 'out' ? '-' : '±';
    return `${sign}${quantity} units - ${this.getMovementTypeDescription(type)}`;
  }

  private getMovementTypeDescription(type: InventoryMovementType): string {
    const descriptions = {
      'IN': 'Stock received',
      'OUT': 'Stock removed',
      'ADJUSTMENT': 'Manual adjustment',
      'SALE': 'Sold to customer',
      'RESTOCK': 'Inventory replenishment',
      'RETURN': 'Customer return',
      'TRANSFER_IN': 'Transfer received',
      'TRANSFER_OUT': 'Transfer sent',
      'DAMAGE': 'Damaged goods',
      'THEFT': 'Loss/theft',
      'EXPIRED': 'Expired products',
      'RESERVE': 'Stock reserved',
      'RELEASE_RESERVE': 'Reservation released'
    };
    
    return descriptions[type] || 'Unknown movement type';
  }
}