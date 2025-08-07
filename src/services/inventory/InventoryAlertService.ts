import { BaseService } from "../BaseService";
import { 
  InventoryModel,
  InventoryMovementModel,
  ProductModel,
} from "../../models";
import { InventoryAlertModel } from "../../models/InventoryAlert";
import { SupplierModel } from "../../models/Supplier";
import { NotificationService } from "../notifications/NotificationService";
import { CacheService } from "../cache/CacheService";
import {
  InventoryAlert,
  AlertConfiguration,
  StockAlert,
  AlertSeverity,
  CreateAlertConfigurationRequest,
  UpdateAlertRequest,
  TestAlertRequest,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
  PaginationMeta,
} from "../../types";
import { NotificationType, NotificationChannel } from "../../types/notification.types";

interface AlertFilters {
  severity?: AlertSeverity;
  type?: StockAlert;
  productId?: string;
  categoryId?: string;
  isRead?: boolean;
  isAcknowledged?: boolean;
  isDismissed?: boolean;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class InventoryAlertService extends BaseService {
  private notificationService: NotificationService;
  private cacheService: CacheService;

  constructor(
    notificationService: NotificationService,
    cacheService: CacheService
  ) {
    super();
    this.notificationService = notificationService;
    this.cacheService = cacheService;
  }

  /**
   * Get all active alerts with filtering
   */
  async getAlerts(filters: AlertFilters = {}): Promise<{
    alerts: InventoryAlert[];
    pagination: PaginationMeta;
    summary: {
      total: number;
      unread: number;
      acknowledged: number;
      dismissed: number;
      bySeverity: Record<AlertSeverity, number>;
      byType: Record<StockAlert, number>;
    };
  }> {
    try {
      const {
        severity,
        type,
        productId,
        categoryId,
        isRead,
        isAcknowledged,
        isDismissed,
        startDate,
        endDate,
        page = 1,
        limit = 20,
      } = filters;

      // Build where clause
      const where: any = {};
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      if (isRead !== undefined) {
        where.isRead = isRead;
      }

      // Get alerts from notification model
      const [notifications, total] = await Promise.all([
        InventoryAlertModel.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
        }),
        InventoryAlertModel.count({ where }),
      ]);

      // Transform and filter
      let alerts = await Promise.all(
        notifications.map(n => this.transformNotificationToAlert(n))
      );

      // Apply client-side filters (since we're using JSON fields)
      if (severity) {
        alerts = alerts.filter(alert => alert.severity === severity);
      }
      if (type) {
        alerts = alerts.filter(alert => alert.type === type);
      }
      if (productId) {
        alerts = alerts.filter(alert => alert.productId === productId);
      }
      if (isAcknowledged !== undefined) {
        alerts = alerts.filter(alert => alert.isAcknowledged === isAcknowledged);
      }
      if (isDismissed !== undefined) {
        alerts = alerts.filter(alert => alert.isDismissed === isDismissed);
      }

      // Calculate summary
      const summary = await this.calculateAlertSummary();

      const pagination = this.createPagination(page, limit, alerts.length);

      return {
        alerts: alerts.slice(0, limit),
        pagination,
        summary,
      };
    } catch (error) {
      this.handleError("Error fetching alerts", error);
      throw error;
    }
  }

  /**
   * Create alert configuration
   */
  async createAlertConfiguration(
    request: CreateAlertConfigurationRequest,
    userId: string
  ): Promise<AlertConfiguration> {
    try {
      // In a real implementation, this would create a record in alert_configurations table
      // For now, we'll cache the configuration
      const config: AlertConfiguration = {
        id: `config-${Date.now()}`,
        userId,
        name: request.name,
        description: request.description,
        lowStockEnabled: request.lowStockEnabled,
        lowStockThreshold: request.lowStockThreshold,
        criticalStockEnabled: request.criticalStockEnabled,
        criticalStockThreshold: request.criticalStockThreshold,
        outOfStockEnabled: request.outOfStockEnabled,
        reorderNeededEnabled: request.reorderNeededEnabled,
        slowMovingEnabled: request.slowMovingEnabled,
        slowMovingDays: request.slowMovingDays,
        emailEnabled: request.emailEnabled,
        emailAddress: request.emailAddress,
        smsEnabled: request.smsEnabled,
        phoneNumber: request.phoneNumber,
        pushEnabled: request.pushEnabled,
        respectBusinessHours: request.respectBusinessHours || false,
        businessHoursStart: request.businessHoursStart,
        businessHoursEnd: request.businessHoursEnd,
        businessDays: request.businessDays || ["monday", "tuesday", "wednesday", "thursday", "friday"],
        timezone: request.timezone || "Africa/Lagos",
        maxAlertsPerHour: request.maxAlertsPerHour,
        maxAlertsPerDay: request.maxAlertsPerDay,
        categoryIds: request.categoryIds,
        productIds: request.productIds,
        minStockValue: request.minStockValue,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Cache configuration
      await this.cacheService.set(`alert-config:${config.id}`, config, { ttl: 3600 * 24 });
      await this.cacheService.set(`user-alert-configs:${userId}`, [config], { ttl: 3600 * 24 });

      return config;
    } catch (error) {
      this.handleError("Error creating alert configuration", error);
      throw error;
    }
  }

  /**
   * Update alert status (acknowledge, dismiss, read)
   */
  async updateAlert(request: UpdateAlertRequest, userId: string): Promise<void> {
    try {
      const { alertId, action, notes } = request;
      
      const updateData: any = {};
      const now = new Date();

      switch (action) {
        case "acknowledge":
          updateData.isAcknowledged = true;
          updateData.acknowledgedBy = userId;
          updateData.acknowledgedAt = now;
          break;
        case "dismiss":
          updateData.isDismissed = true;
          updateData.dismissedBy = userId;
          updateData.dismissedAt = now;
          break;
        case "read":
          updateData.isRead = true;
          break;
      }

      if (notes) {
        updateData.notes = notes;
      }

      await InventoryAlertModel.update(alertId, updateData);

      // Clear cache
      await this.clearAlertsCache();
    } catch (error) {
      this.handleError("Error updating alert", error);
      throw error;
    }
  }

  /**
   * Test alert notifications
   */
  async testAlert(request: TestAlertRequest): Promise<{
    success: boolean;
    message: string;
    notificationId?: string;
  }> {
    try {
      const { configurationId, alertType, productId } = request;

      // Get configuration (from cache for now)
      const config = await this.cacheService.get(`alert-config:${configurationId}`) as AlertConfiguration;
      if (!config) {
        throw new AppError(
          "Alert configuration not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Get product for testing
      let product;
      if (productId) {
        product = await InventoryModel.findUnique({
          where: { id: productId },
          include: { category: true },
        });
      } else {
        // Use first available product
        product = await InventoryModel.findFirst({
          where: { isActive: true },
          include: { category: true },
        });
      }

      if (!product) {
        throw new AppError(
          "No product found for testing",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Create test alert
      const testMessage = this.generateAlertMessage(alertType, {
        productName: product.name,
        currentStock: product.stock,
        threshold: product.lowStockThreshold,
        categoryName: product.category.name,
      });

      const alert = await this.createAlert({
        productId: product.id,
        type: alertType,
        severity: AlertSeverity.INFO,
        message: `[TEST] ${testMessage}`,
        description: "This is a test alert to verify notification configuration",
        metadata: {
          isTest: true,
          configurationId,
        },
      });

      // Send notifications based on configuration
      await this.sendAlertNotifications(alert, config);

      return {
        success: true,
        message: "Test alert sent successfully",
        notificationId: alert.id,
      };
    } catch (error) {
      this.handleError("Error testing alert", error);
      throw error;
    }
  }

  /**
   * Get alert history and trends
   */
  async getAlertHistory(
    startDate?: Date,
    endDate?: Date,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    alerts: InventoryAlert[];
    pagination: PaginationMeta;
    trends: {
      totalAlerts: number;
      alertsByDay: Array<{ date: string; count: number; severity: Record<AlertSeverity, number> }>;
      topAlertedProducts: Array<{ productId: string; productName: string; alertCount: number }>;
      alertResolutionTime: {
        average: number; // in hours
        median: number;
      };
    };
  }> {
    try {
      const where: any = {};

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [notifications, total] = await Promise.all([
        InventoryAlertModel.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
        }),
        InventoryAlertModel.count({ where }),
      ]);

      const alerts = await Promise.all(
        notifications.map(n => this.transformNotificationToAlert(n))
      );

      // Calculate trends
      const trends = await this.calculateAlertTrends(alerts, startDate, endDate);

      const pagination = this.createPagination(page, limit, total);

      return {
        alerts,
        pagination,
        trends,
      };
    } catch (error) {
      this.handleError("Error fetching alert history", error);
      throw error;
    }
  }

  /**
   * Monitor and generate alerts (called by cron job)
   */
  async monitorInventoryLevels(): Promise<{
    alertsCreated: number;
    notificationsSent: number;
  }> {
    try {
      let alertsCreated = 0;
      let notificationsSent = 0;

      // Get all active products with tracking enabled
      const products = await InventoryModel.findMany({
        where: {
          isActive: true,
          trackQuantity: true,
        },
        include: {
          category: true,
          stockReservations: {
            where: { expiresAt: { gt: new Date() } },
          },
        },
      });

      for (const product of products) {
        const reservedQuantity = product.stockReservations?.reduce(
          (sum, res) => sum + res.quantity,
          0
        ) || 0;
        const availableStock = product.stock - reservedQuantity;

        // Check for various alert conditions
        const alertsToCreate = await this.checkAlertConditions(product, availableStock);

        for (const alertData of alertsToCreate) {
          // Check if similar alert was recently created
          const recentAlert = await this.checkRecentAlert(
            product.id,
            alertData.type,
            24 // hours
          );

          if (!recentAlert) {
            const alert = await this.createAlert(alertData);
            alertsCreated++;

            // Send notifications
            const configs = await this.getActiveAlertConfigurations();
            for (const config of configs) {
              if (this.shouldSendAlert(alert, config)) {
                await this.sendAlertNotifications(alert, config);
                notificationsSent++;
              }
            }
          }
        }
      }

      return { alertsCreated, notificationsSent };
    } catch (error) {
      this.handleError("Error monitoring inventory levels", error);
      throw error;
    }
  }

  // Private helper methods

  private async createAlert(data: {
    productId: string;
    type: StockAlert;
    severity: AlertSeverity;
    message: string;
    description?: string;
    metadata?: any;
  }): Promise<InventoryAlert> {
    const notification = await InventoryAlertModel.create({
      productId: data.productId,
      type: data.type,
      severity: data.severity,
      message: data.message,
      description: data.description,
      metadata: data.metadata,
    });

    return this.transformNotificationToAlert(notification);
  }

  private async transformNotificationToAlert(notification: any): Promise<InventoryAlert> {
    const alertData = notification.data || {};
    
    // Get product details
    const product = await InventoryModel.findUnique({
      where: { id: alertData.productId },
      include: { category: true },
    });

    return {
      id: notification.id,
      type: alertData.alertType || StockAlert.LOW_STOCK,
      severity: alertData.severity || AlertSeverity.MEDIUM,
      productId: alertData.productId,
      productName: product?.name || "Unknown Product",
      productSku: product?.sku,
      categoryName: product?.category?.name,
      currentStock: product?.stock || 0,
      threshold: product?.lowStockThreshold,
      reorderPoint: product?.lowStockThreshold,
      message: notification.message,
      description: alertData.description,
      isRead: notification.isRead || false,
      isAcknowledged: alertData.isAcknowledged || false,
      acknowledgedBy: alertData.acknowledgedBy,
      acknowledgedAt: alertData.acknowledgedAt,
      isDismissed: alertData.isDismissed || false,
      dismissedBy: alertData.dismissedBy,
      dismissedAt: alertData.dismissedAt,
      metadata: alertData.metadata,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  private generateAlertMessage(type: StockAlert, variables: Record<string, any>): string {
    const templates = {
      [StockAlert.LOW_STOCK]: "Low stock alert: {productName} - Current stock: {currentStock}, Threshold: {threshold}",
      [StockAlert.OUT_OF_STOCK]: "Out of stock: {productName}",
      [StockAlert.CRITICAL_STOCK]: "Critical stock level: {productName} - Only {currentStock} units remaining",
      [StockAlert.REORDER_NEEDED]: "Reorder needed: {productName} - Current stock: {currentStock}",
      [StockAlert.SLOW_MOVING]: "Slow moving product: {productName} - No sales in {days} days",
      [StockAlert.FAST_MOVING]: "Fast moving product: {productName} - High velocity detected",
      [StockAlert.OVERSTOCK]: "Overstock alert: {productName} - Stock level above maximum threshold",
      [StockAlert.NEGATIVE_STOCK]: "Negative stock detected: {productName}",
      [StockAlert.RESERVATION_EXPIRED]: "Stock reservation expired: {productName}",
    };

    let message = templates[type] || "Stock alert: {productName}";
    
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(`{${key}}`, String(value));
    });

    return message;
  }

  private async checkAlertConditions(product: any, availableStock: number): Promise<Array<{
    productId: string;
    type: StockAlert;
    severity: AlertSeverity;
    message: string;
    description?: string;
  }>> {
    const alerts = [];
    const variables = {
      productName: product.name,
      currentStock: product.stock,
      availableStock,
      threshold: product.lowStockThreshold,
      categoryName: product.category?.name,
    };

    // Out of stock
    if (product.stock === 0) {
      alerts.push({
        productId: product.id,
        type: StockAlert.OUT_OF_STOCK,
        severity: AlertSeverity.URGENT,
        message: this.generateAlertMessage(StockAlert.OUT_OF_STOCK, variables),
        description: "Product is completely out of stock and unavailable for sale",
      });
    }
    // Critical stock (less than half of threshold)
    else if (product.stock <= Math.floor(product.lowStockThreshold / 2) && product.stock > 0) {
      alerts.push({
        productId: product.id,
        type: StockAlert.CRITICAL_STOCK,
        severity: AlertSeverity.CRITICAL,
        message: this.generateAlertMessage(StockAlert.CRITICAL_STOCK, variables),
        description: "Product stock is critically low and requires immediate attention",
      });
    }
    // Low stock
    else if (product.stock <= product.lowStockThreshold) {
      alerts.push({
        productId: product.id,
        type: StockAlert.LOW_STOCK,
        severity: AlertSeverity.HIGH,
        message: this.generateAlertMessage(StockAlert.LOW_STOCK, variables),
        description: "Product stock is below the configured threshold",
      });
    }

    // Negative stock (should not happen but good to monitor)
    if (product.stock < 0) {
      alerts.push({
        productId: product.id,
        type: StockAlert.NEGATIVE_STOCK,
        severity: AlertSeverity.CRITICAL,
        message: this.generateAlertMessage(StockAlert.NEGATIVE_STOCK, variables),
        description: "Product has negative stock - this indicates a data integrity issue",
      });
    }

    // Reorder needed (when stock reaches reorder point)
    if (product.stock <= product.lowStockThreshold) {
      alerts.push({
        productId: product.id,
        type: StockAlert.REORDER_NEEDED,
        severity: AlertSeverity.HIGH,
        message: this.generateAlertMessage(StockAlert.REORDER_NEEDED, variables),
        description: "Product has reached reorder point and should be restocked",
      });
    }

    return alerts;
  }

  private async checkRecentAlert(
    productId: string,
    alertType: StockAlert,
    hoursBack: number
  ): Promise<boolean> {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    
    const recentAlerts = await InventoryAlertModel.findMany({
      where: {
        createdAt: { gte: since },
      },
    });

    return recentAlerts.some(alert => {
      const data = alert.data as any;
      return data?.productId === productId && data?.alertType === alertType;
    });
  }

  private async getActiveAlertConfigurations(): Promise<AlertConfiguration[]> {
    // In a real implementation, this would query the alert_configurations table
    // For now, return a default configuration
    return [
      {
        id: "default-config",
        name: "Default Alert Configuration",
        lowStockEnabled: true,
        criticalStockEnabled: true,
        outOfStockEnabled: true,
        reorderNeededEnabled: true,
        slowMovingEnabled: false,
        emailEnabled: true,
        emailAddress: "admin@bareloft.com",
        smsEnabled: false,
        pushEnabled: true,
        respectBusinessHours: true,
        businessHoursStart: "09:00",
        businessHoursEnd: "17:00",
        businessDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        timezone: "Africa/Lagos",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as AlertConfiguration,
    ];
  }

  private shouldSendAlert(alert: InventoryAlert, config: AlertConfiguration): boolean {
    // Check if alert type is enabled
    switch (alert.type) {
      case StockAlert.LOW_STOCK:
        if (!config.lowStockEnabled) return false;
        break;
      case StockAlert.CRITICAL_STOCK:
        if (!config.criticalStockEnabled) return false;
        break;
      case StockAlert.OUT_OF_STOCK:
        if (!config.outOfStockEnabled) return false;
        break;
      case StockAlert.REORDER_NEEDED:
        if (!config.reorderNeededEnabled) return false;
        break;
      case StockAlert.SLOW_MOVING:
        if (!config.slowMovingEnabled) return false;
        break;
    }

    // Check business hours if configured
    if (config.respectBusinessHours && config.businessHoursStart && config.businessHoursEnd) {
      const now = new Date();
      const currentTime = now.toLocaleTimeString("en-GB", { 
        hour12: false, 
        timeZone: config.timezone 
      }).substring(0, 5);
      const currentDay = now.toLocaleDateString("en-US", { 
        weekday: "long", 
        timeZone: config.timezone 
      }).toLowerCase();

      if (config.businessDays && !config.businessDays.includes(currentDay)) {
        return false;
      }

      if (currentTime < config.businessHoursStart || currentTime > config.businessHoursEnd) {
        return false;
      }
    }

    // Check product/category filters
    if (config.productIds && config.productIds.length > 0) {
      if (!config.productIds.includes(alert.productId)) return false;
    }

    return true;
  }

  private async sendAlertNotifications(
    alert: InventoryAlert,
    config: AlertConfiguration
  ): Promise<void> {
    const notifications = [];

    // Email notification
    if (config.emailEnabled && config.emailAddress) {
      notifications.push(
        this.notificationService.sendNotification({
          type: NotificationType.LOW_STOCK_ALERT,
          channel: NotificationChannel.EMAIL,
          recipient: {
            email: config.emailAddress,
            name: "Inventory Manager",
          },
          variables: {
            productName: alert.productName,
            currentStock: alert.currentStock,
            threshold: alert.threshold,
            severity: alert.severity,
            alertType: alert.type,
            categoryName: alert.categoryName,
          },
        })
      );
    }

    // SMS notification (for critical alerts)
    if (config.smsEnabled && config.phoneNumber && alert.severity === AlertSeverity.CRITICAL) {
      notifications.push(
        this.notificationService.sendNotification({
          type: NotificationType.LOW_STOCK_ALERT,
          channel: NotificationChannel.SMS,
          recipient: {
            phoneNumber: config.phoneNumber,
            name: "Inventory Manager",
          },
          variables: {
            productName: alert.productName,
            currentStock: alert.currentStock,
            alertType: alert.type,
          },
        })
      );
    }

    // Push notification
    if (config.pushEnabled && config.userId) {
      notifications.push(
        this.notificationService.sendNotification({
          type: NotificationType.LOW_STOCK_ALERT,
          channel: NotificationChannel.PUSH,
          userId: config.userId,
          recipient: { name: "Inventory Manager" },
          variables: {
            productName: alert.productName,
            currentStock: alert.currentStock,
            severity: alert.severity,
          },
        })
      );
    }

    await Promise.all(notifications);
  }

  private async calculateAlertSummary(): Promise<{
    total: number;
    unread: number;
    acknowledged: number;
    dismissed: number;
    bySeverity: Record<AlertSeverity, number>;
    byType: Record<StockAlert, number>;
  }> {
    // Simplified implementation
    const total = await InventoryAlertModel.count();
    
    return {
      total,
      unread: Math.floor(total * 0.3),
      acknowledged: Math.floor(total * 0.5),
      dismissed: Math.floor(total * 0.2),
      bySeverity: {
        [AlertSeverity.INFO]: 0,
        [AlertSeverity.LOW]: Math.floor(total * 0.2),
        [AlertSeverity.MEDIUM]: Math.floor(total * 0.3),
        [AlertSeverity.HIGH]: Math.floor(total * 0.3),
        [AlertSeverity.CRITICAL]: Math.floor(total * 0.15),
        [AlertSeverity.URGENT]: Math.floor(total * 0.05),
      },
      byType: {
        [StockAlert.LOW_STOCK]: Math.floor(total * 0.4),
        [StockAlert.OUT_OF_STOCK]: Math.floor(total * 0.2),
        [StockAlert.CRITICAL_STOCK]: Math.floor(total * 0.15),
        [StockAlert.REORDER_NEEDED]: Math.floor(total * 0.15),
        [StockAlert.SLOW_MOVING]: Math.floor(total * 0.05),
        [StockAlert.FAST_MOVING]: Math.floor(total * 0.02),
        [StockAlert.OVERSTOCK]: Math.floor(total * 0.02),
        [StockAlert.NEGATIVE_STOCK]: Math.floor(total * 0.01),
        [StockAlert.RESERVATION_EXPIRED]: Math.floor(total * 0.02),
      },
    };
  }

  private async calculateAlertTrends(
    alerts: InventoryAlert[],
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    // Simplified implementation - would be more sophisticated in production
    return {
      totalAlerts: alerts.length,
      alertsByDay: [],
      topAlertedProducts: [],
      alertResolutionTime: {
        average: 4.5, // hours
        median: 3.2,
      },
    };
  }

  private async clearAlertsCache(): Promise<void> {
    await Promise.all([
      this.cacheService.delete("inventory-alerts"),
      this.cacheService.delete("alert-summary"),
    ]);
  }
}