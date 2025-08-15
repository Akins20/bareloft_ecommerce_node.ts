import { Request, Response } from "express";
import { BaseAdminController } from "../BaseAdminController";
import { AnalyticsService } from "../../services/analytics/AnalyticsService";
import { MetricsService } from "../../services/analytics/MetricsService";
import { InventoryAnalyticsService } from "../../services/analytics/InventoryAnalyticsService";
import { InventoryDashboardService } from "../../services/analytics/InventoryDashboardService";
import { OrderService } from "../../services/orders/OrderService";
import { UserService } from "../../services/users/UserService";
import { ProductService } from "../../services/products/ProductService";
import { InventoryService } from "../../services/inventory/InventoryService";
import { CacheService } from "../../services/cache/CacheService";
import { RedisService } from "../../services/cache/RedisService";
import { ProductRepository } from "../../repositories/ProductRepository";
import { NotificationService } from "../../services/notifications/NotificationService";
import { PaymentService } from "../../services/payments/PaymentService";
import { RefundService } from "../../services/payments/RefundService";
import { NigerianUtils } from "../../utils/helpers/nigerian";
import { OrderModel, UserModel, ProductModel, InventoryModel } from "../../models";
import { CONSTANTS } from "../../types";

/**
 * Admin Dashboard Controller
 * Provides key metrics and analytics for the Nigerian e-commerce admin dashboard
 */
export class AdminDashboardController extends BaseAdminController {
  private analyticsService: AnalyticsService;
  private metricsService: MetricsService;
  private inventoryAnalyticsService: InventoryAnalyticsService;
  private inventoryDashboardService: InventoryDashboardService;
  private orderService: OrderService;
  private userService: UserService;
  private productService: ProductService;
  private inventoryService: InventoryService;

  private paymentService: PaymentService;
  private refundService: RefundService;
  private cacheService: CacheService;

  constructor() {
    super();
    // Initialize services with proper dependencies
    const redisService = new RedisService();
    this.cacheService = new CacheService(redisService);
    this.analyticsService = new AnalyticsService(this.cacheService);
    this.metricsService = new MetricsService(this.cacheService);
    this.inventoryAnalyticsService = new InventoryAnalyticsService(this.cacheService);
    this.inventoryDashboardService = new InventoryDashboardService(this.inventoryAnalyticsService, this.cacheService);
    this.orderService = new OrderService();
    this.userService = new UserService();
    this.productService = {} as ProductService;
    this.inventoryService = {} as InventoryService;
    this.paymentService = {} as PaymentService;
    this.refundService = {} as RefundService;
  }

  /**
   * Get comprehensive dashboard overview
   * GET /api/admin/dashboard/overview
   */
  public getDashboardOverview = async (req: Request, res: Response): Promise<void> => {
    try {
      // Admin authentication required
      if (!this.requireAdminAuth(req, res, 'admin')) return;

      const period = req.query.period as string || 'last_30_days';
      const userId = this.getUserId(req);

      // Enhanced admin activity logging
      this.logAdminActivity(req, 'analytics_access', 'get_dashboard_overview', {
        description: `Accessed dashboard overview for period: ${period}`,
        severity: 'low',
        resourceType: 'dashboard',
        metadata: { period }
      });

      // Get basic metrics in parallel
      const [
        revenueMetrics,
        orderMetrics,
        userMetrics,
        productMetrics
      ] = await Promise.all([
        this.getRevenueMetrics(period),
        this.getOrderMetrics(period),
        this.getUserMetrics(period),
        this.getProductMetrics(period)
      ]);

      // Calculate Nigerian business metrics
      const nigerianMetrics = this.calculateNigerianBusinessMetrics({
        revenue: [revenueMetrics.total],
        orders: [orderMetrics.total],
        customers: [userMetrics.total],
        period: 'daily'
      });

      const overview = {
        period,
        timestamp: new Date().toISOString(),
        revenue: {
          ...revenueMetrics,
          formatted: this.formatAdminCurrency(revenueMetrics.total / 100), // Convert from kobo
          currency: 'NGN'
        },
        orders: orderMetrics,
        users: userMetrics,
        products: productMetrics,
        nigerian: nigerianMetrics
      };

      this.sendAdminSuccess(res, overview, 'Dashboard overview retrieved successfully', 200, {
        activity: 'analytics_access',
        includeMetrics: true,
        includeCurrencyInfo: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get detailed sales analytics
   * GET /api/admin/dashboard/sales
   */
  public getSalesAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!this.requireAdminAuth(req, res, 'admin')) return;

      const period = req.query.period as string || 'last_30_days';
      const breakdown = req.query.breakdown as string || 'daily';
      const userId = this.getUserId(req);

      this.logAdminActivity(req, 'analytics_access', 'get_sales_analytics', {
        description: `Accessed sales analytics for period: ${period}`,
        severity: 'low',
        resourceType: 'sales_analytics',
        metadata: { period, breakdown }
      });

      // Get comprehensive sales data
      const [salesData, paymentData, refundData] = await Promise.all([
        this.getSalesDataInternal(period, breakdown),
        this.getPaymentMetricsInternal(period),
        this.getRefundMetricsInternal(period)
      ]);

      // Calculate Nigerian-specific metrics
      const nigerianSalesMetrics = {
        totalRevenue: salesData.totalRevenue,
        totalRevenueFormatted: this.formatAdminCurrency(salesData.totalRevenue),
        vatCollected: 0, // VAT not applicable
        vatCollectedFormatted: this.formatAdminCurrency(0),
        averageOrderValue: salesData.averageOrderValue,
        averageOrderValueFormatted: this.formatAdminCurrency(salesData.averageOrderValue),
        conversionRate: salesData.conversionRate,
        ordersByPaymentMethod: paymentData.ordersByMethod,
        topSellingStates: await this.getTopSellingStatesInternal(period),
        peakSalesHours: await this.getPeakSalesHoursInternal(period),
        businessHoursAnalysis: await this.getBusinessHoursAnalysisInternal(period)
      };

      const analytics = {
        period,
        breakdown,
        timestamp: new Date().toISOString(),
        nigerianTime: NigerianUtils.Business.formatNigerianDate(new Date(), 'long'),
        sales: nigerianSalesMetrics,
        charts: {
          revenueChart: await this.getRevenueChart(period),
          ordersChart: await this.getOrdersChart(period),
          paymentMethodChart: paymentData.chartData,
          statesChart: await this.getStatesRevenueChartInternal(period)
        },
        trends: salesData.trends,
        payments: {
          totalTransactions: paymentData.totalTransactions,
          successRate: paymentData.successRate,
          averageProcessingTime: paymentData.averageProcessingTime,
          topPaymentMethods: paymentData.topMethods
        },
        refunds: {
          totalRefunds: refundData.totalRefunds,
          refundRate: refundData.refundRate,
          averageRefundAmount: this.formatAdminCurrency(refundData.averageAmount),
          totalRefundAmount: this.formatAdminCurrency(refundData.totalAmount)
        }
      };

      this.sendAdminSuccess(res, analytics, 'Sales analytics retrieved successfully', 200, {
        activity: 'analytics_access',
        includeMetrics: true,
        includeCurrencyInfo: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get inventory analytics
   * GET /api/admin/dashboard/inventory
   */
  public getInventoryAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!this.requireAdminAuth(req, res, 'admin')) return;

      const userId = this.getUserId(req);
      const includeAlerts = req.query.includeAlerts === 'true';

      this.logAdminActivity(req, 'analytics_access', 'get_inventory_analytics', {
        description: 'Accessed inventory analytics dashboard',
        severity: 'low',
        resourceType: 'inventory_analytics',
        metadata: { includeAlerts }
      });

      // Get comprehensive inventory data
      const [inventoryData, alerts, topProducts, categoryAnalysis] = await Promise.all([
        this.getInventoryMetricsInternal(),
        includeAlerts ? this.getInventoryAlertsInternal() : [],
        this.getTopSellingProductsInternal(),
        this.getCategoryAnalysisInternal()
      ]);

      const analytics = {
        timestamp: new Date().toISOString(),
        nigerianTime: NigerianUtils.Business.formatNigerianDate(new Date(), 'long'),
        inventory: {
          totalProducts: inventoryData.totalProducts,
          activeProducts: inventoryData.activeProducts,
          outOfStockProducts: inventoryData.outOfStockProducts,
          lowStockProducts: inventoryData.lowStockProducts,
          totalInventoryValue: this.formatAdminCurrency(inventoryData.totalValue),
          averageProductValue: this.formatAdminCurrency(inventoryData.averageValue),
          stockTurnoverRate: inventoryData.turnoverRate,
          daysOfInventory: inventoryData.daysOfInventory
        },
        alerts: {
          total: alerts.length,
          critical: alerts.filter(a => a.severity === 'critical').length,
          warning: alerts.filter(a => a.severity === 'warning').length,
          items: alerts.slice(0, 20) // Top 20 alerts
        },
        topProducts: topProducts.map(product => ({
          ...product,
          revenueFormatted: this.formatAdminCurrency(product.revenue),
          averagePriceFormatted: this.formatAdminCurrency(product.averagePrice)
        })),
        categories: categoryAnalysis.map(category => ({
          ...category,
          totalValueFormatted: this.formatAdminCurrency(category.totalValue),
          averageValueFormatted: this.formatAdminCurrency(category.averageValue)
        })),
        charts: {
          stockLevelsChart: await this.getStockLevelsChartInternal(),
          categoryDistributionChart: await this.getCategoryDistributionChartInternal(),
          turnoverChart: await this.getInventoryTurnoverChartInternal()
        }
      };

      this.sendAdminSuccess(res, analytics, 'Inventory analytics retrieved successfully', 200, {
        activity: 'analytics_access',
        includeMetrics: true,
        includeCurrencyInfo: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get customer analytics
   * GET /api/admin/dashboard/customers
   */
  public getCustomerAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!this.requireAdminAuth(req, res, 'admin')) return;

      const period = req.query.period as string || 'last_30_days';
      const userId = this.getUserId(req);

      this.logAdminActivity(req, 'analytics_access', 'get_customer_analytics', {
        description: `Accessed customer analytics for period: ${period}`,
        severity: 'low',
        resourceType: 'customer_analytics',
        metadata: { period }
      });

      // Get comprehensive customer data
      const [customerData, demographics, behavior, retention] = await Promise.all([
        this.getCustomerMetricsInternal(period),
        this.getCustomerDemographicsInternal(),
        this.getCustomerBehaviorInternal(period),
        this.getCustomerRetentionInternal(period)
      ]);

      const analytics = {
        period,
        timestamp: new Date().toISOString(),
        nigerianTime: NigerianUtils.Business.formatNigerianDate(new Date(), 'long'),
        customers: {
          totalCustomers: customerData.totalCustomers,
          newCustomers: customerData.newCustomers,
          activeCustomers: customerData.activeCustomers,
          verifiedCustomers: customerData.verifiedCustomers,
          customerGrowthRate: customerData.growthRate,
          averageLifetimeValue: this.formatAdminCurrency(customerData.averageLifetimeValue),
          totalLifetimeValue: this.formatAdminCurrency(customerData.totalLifetimeValue),
          repeatCustomerRate: customerData.repeatCustomerRate
        },
        demographics: {
          byState: demographics.byState,
          byAge: demographics.byAge,
          byGender: demographics.byGender,
          topCities: demographics.topCities
        },
        behavior: {
          averageOrdersPerCustomer: behavior.averageOrdersPerCustomer,
          averageSessionDuration: behavior.averageSessionDuration,
          cartAbandonmentRate: behavior.cartAbandonmentRate,
          conversionRate: behavior.conversionRate,
          preferredShoppingHours: behavior.preferredShoppingHours,
          preferredPaymentMethods: behavior.preferredPaymentMethods
        },
        retention: {
          monthlyRetentionRate: retention.monthlyRate,
          quarterlyRetentionRate: retention.quarterlyRate,
          churnRate: retention.churnRate,
          retentionBySegment: retention.bySegment
        },
        charts: {
          acquisitionChart: await this.getCustomerAcquisitionChart(period),
          demographicsChart: await this.getCustomerDemographicsChart(),
          retentionChart: await this.getCustomerRetentionChart(period),
          behaviorChart: await this.getCustomerBehaviorChart(period)
        }
      };

      this.sendAdminSuccess(res, analytics, 'Customer analytics retrieved successfully', 200, {
        activity: 'analytics_access',
        includeMetrics: true,
        includeCurrencyInfo: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get operational metrics
   * GET /api/admin/dashboard/operations
   */
  public getOperationalMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!this.requireAdminAuth(req, res, 'admin')) return;

      const period = req.query.period as string || 'last_7_days';
      const userId = this.getUserId(req);

      this.logAdminActivity(req, 'analytics_access', 'get_operational_metrics', {
        description: `Accessed operational metrics for period: ${period}`,
        severity: 'low',
        resourceType: 'operational_metrics',
        metadata: { period }
      });

      // Get comprehensive operational data
      const [orderOperations, fulfillmentData, systemHealth, notifications] = await Promise.all([
        this.getOrderOperationalMetrics(period),
        this.getFulfillmentMetrics(period),
        this.getSystemHealthMetrics(),
        this.getNotificationMetrics(period)
      ]);

      const analytics = {
        period,
        timestamp: new Date().toISOString(),
        nigerianTime: NigerianUtils.Business.formatNigerianDate(new Date(), 'long'),
        orders: {
          pending: orderOperations.pending,
          processing: orderOperations.processing,
          shipped: orderOperations.shipped,
          delivered: orderOperations.delivered,
          cancelled: orderOperations.cancelled,
          averageProcessingTime: orderOperations.averageProcessingTime,
          onTimeDeliveryRate: orderOperations.onTimeDeliveryRate
        },
        fulfillment: {
          totalShipments: fulfillmentData.totalShipments,
          deliverySuccessRate: fulfillmentData.deliverySuccessRate,
          averageDeliveryTime: fulfillmentData.averageDeliveryTime,
          topDeliveryStates: fulfillmentData.topDeliveryStates,
          shippingCostAnalysis: {
            total: this.formatAdminCurrency(fulfillmentData.totalShippingCosts),
            average: this.formatAdminCurrency(fulfillmentData.averageShippingCost),
            byState: fulfillmentData.shippingCostsByState.map(state => ({
              ...state,
              averageCostFormatted: this.formatAdminCurrency(state.averageCost)
            }))
          }
        },
        system: {
          uptime: systemHealth.uptime,
          responseTime: systemHealth.responseTime,
          errorRate: systemHealth.errorRate,
          databasePerformance: systemHealth.databasePerformance,
          cachePerformance: systemHealth.cachePerformance
        },
        notifications: {
          totalSent: notifications.totalSent,
          smsDeliveryRate: notifications.smsDeliveryRate,
          emailDeliveryRate: notifications.emailDeliveryRate,
          pushNotificationRate: notifications.pushNotificationRate
        },
        charts: {
          orderFlowChart: await this.getOrderFlowChart(period),
          deliveryPerformanceChart: await this.getDeliveryPerformanceChart(period),
          systemHealthChart: await this.getSystemHealthChart(period)
        }
      };

      this.sendAdminSuccess(res, analytics, 'Operational metrics retrieved successfully', 200, {
        activity: 'analytics_access',
        includeMetrics: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Export dashboard data
   * POST /api/admin/dashboard/export
   */
  public exportDashboardData = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!this.requireAdminAuth(req, res, 'admin')) return;

      const {
        type = 'overview',
        format = 'csv',
        period = 'last_30_days',
        includeCharts = false
      } = req.body;
      const userId = this.getUserId(req);

      this.logAdminActivity(req, 'data_export', 'dashboard_export', {
        description: `Exported dashboard data: ${type}`,
        severity: 'medium',
        resourceType: 'dashboard_export',
        metadata: { type, format, period, includeCharts }
      });

      let data: any[] = [];
      let filename = 'dashboard_export';

      // Get data based on export type
      switch (type) {
        case 'sales':
          data = await this.getSalesExportData(period);
          filename = 'sales_report';
          break;
        case 'customers':
          data = await this.getCustomersExportData(period);
          filename = 'customers_report';
          break;
        case 'inventory':
          data = await this.getInventoryExportData();
          filename = 'inventory_report';
          break;
        case 'operations':
          data = await this.getOperationsExportData(period);
          filename = 'operations_report';
          break;
        default:
          data = await this.getOverviewExportData(period);
          filename = 'overview_report';
      }

      // Export with Nigerian compliance
      const exportConfig = {
        format: format as 'csv' | 'excel' | 'pdf',
        includeVAT: false, // VAT not applicable
        currency: {
          format: 'naira' as const,
          includeSymbol: true,
          decimalPlaces: 2
        },
        timezone: 'Africa/Lagos' as const,
        includeNigerianFields: true,
        complianceLevel: 'full' as const
      };

      const exportResult = await this.exportData(data, exportConfig, filename);

      // Set response headers for file download
      res.setHeader('Content-Type', exportResult.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      res.setHeader('X-Export-Metadata', JSON.stringify(exportResult.metadata));

      this.sendAdminSuccess(res, {
        downloadUrl: `/downloads/${exportResult.filename}`,
        metadata: exportResult.metadata,
        buffer: exportResult.buffer.toString('base64')
      }, 'Dashboard data exported successfully', 200, {
        activity: 'data_export'
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get real-time alerts and notifications
   * GET /api/admin/dashboard/alerts
   */
  public getRealTimeAlerts = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!this.requireAdminAuth(req, res, 'admin')) return;

      const severity = req.query.severity as string || 'all';
      const limit = parseInt(req.query.limit as string || '20');
      const userId = this.getUserId(req);

      this.logAdminActivity(req, 'analytics_access', 'get_realtime_alerts', {
        description: 'Accessed real-time alerts dashboard',
        severity: 'low',
        resourceType: 'alerts',
        metadata: { severity, limit }
      });

      const alerts = await this.getSystemAlerts(severity, limit);
      const notifications = await this.getPendingNotifications(limit);

      const alertsData = {
        timestamp: new Date().toISOString(),
        nigerianTime: NigerianUtils.Business.formatNigerianDate(new Date(), 'long'),
        alerts: {
          total: alerts.length,
          critical: alerts.filter(a => a.severity === 'critical').length,
          warning: alerts.filter(a => a.severity === 'warning').length,
          info: alerts.filter(a => a.severity === 'info').length,
          items: alerts
        },
        notifications: {
          pending: notifications.filter(n => n.status === 'pending').length,
          failed: notifications.filter(n => n.status === 'failed').length,
          items: notifications
        },
        systemStatus: {
          overallHealth: 'healthy', // Would calculate from various metrics
          businessHours: NigerianUtils.Business.isBusinessHours(),
          peakTime: this.isPeakShoppingTime(),
          uptime: process.uptime(),
          memoryUsage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
        }
      };

      this.sendAdminSuccess(res, alertsData, 'Real-time alerts retrieved successfully', 200, {
        activity: 'analytics_access'
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get comprehensive dashboard analytics
   * GET /api/admin/dashboard/analytics
   */
  public getDashboardAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!this.requireAdminAuth(req, res, 'admin')) return;

      const period = req.query.period as string || 'last_30_days';
      const metrics = req.query.metrics as string || 'all';
      const userId = this.getUserId(req);

      this.logAdminActivity(req, 'analytics_access', 'get_dashboard_analytics', {
        description: `Accessed comprehensive dashboard analytics for period: ${period}`,
        severity: 'low',
        resourceType: 'dashboard_analytics',
        metadata: { period, metrics }
      });

      // Get comprehensive analytics data
      const [salesAnalytics, customerAnalytics, inventoryAnalytics, operationalAnalytics] = await Promise.all([
        this.getSalesDataInternal(period, 'daily'),
        this.getCustomerMetricsInternal(period),
        this.getInventoryMetricsInternal(),
        this.getOrderOperationalMetrics(period)
      ]);

      const analytics = {
        period,
        timestamp: new Date().toISOString(),
        nigerianTime: NigerianUtils.Business.formatNigerianDate(new Date(), 'long'),
        overview: {
          totalRevenue: {
            value: salesAnalytics.totalRevenue,
            formatted: this.formatAdminCurrency(salesAnalytics.totalRevenue),
            growth: salesAnalytics.trends.revenue.change,
            trend: salesAnalytics.trends.revenue.trend
          },
          totalOrders: {
            value: salesAnalytics.totalOrders,
            growth: salesAnalytics.trends.orders.change,
            trend: salesAnalytics.trends.orders.trend
          },
          totalCustomers: {
            value: customerAnalytics.totalCustomers,
            growth: customerAnalytics.growthRate,
            trend: customerAnalytics.growthRate > 0 ? 'up' : 'down'
          },
          conversionRate: {
            value: salesAnalytics.conversionRate,
            unit: '%',
            trend: 'stable'
          }
        },
        detailed: {
          sales: {
            revenue: salesAnalytics.totalRevenue,
            revenueFormatted: this.formatAdminCurrency(salesAnalytics.totalRevenue),
            averageOrderValue: salesAnalytics.averageOrderValue,
            averageOrderValueFormatted: this.formatAdminCurrency(salesAnalytics.averageOrderValue),
            conversionRate: salesAnalytics.conversionRate,
            trends: salesAnalytics.trends
          },
          customers: {
            total: customerAnalytics.totalCustomers,
            new: customerAnalytics.newCustomers,
            active: customerAnalytics.activeCustomers,
            verified: customerAnalytics.verifiedCustomers,
            retention: {
              rate: customerAnalytics.repeatCustomerRate,
              lifetimeValue: customerAnalytics.averageLifetimeValue,
              lifetimeValueFormatted: this.formatAdminCurrency(customerAnalytics.averageLifetimeValue)
            }
          },
          inventory: {
            totalProducts: inventoryAnalytics.totalProducts,
            activeProducts: inventoryAnalytics.activeProducts,
            lowStockProducts: inventoryAnalytics.lowStockProducts,
            outOfStockProducts: inventoryAnalytics.outOfStockProducts,
            totalValue: inventoryAnalytics.totalValue,
            totalValueFormatted: this.formatAdminCurrency(inventoryAnalytics.totalValue),
            turnoverRate: inventoryAnalytics.turnoverRate
          },
          operations: {
            ordersFulfillment: {
              pending: operationalAnalytics.pending,
              processing: operationalAnalytics.processing,
              shipped: operationalAnalytics.shipped,
              delivered: operationalAnalytics.delivered,
              cancelled: operationalAnalytics.cancelled
            },
            performance: {
              averageProcessingTime: operationalAnalytics.averageProcessingTime,
              onTimeDeliveryRate: operationalAnalytics.onTimeDeliveryRate
            }
          }
        },
        charts: {
          revenueChart: await this.getRevenueChart(period),
          ordersChart: await this.getOrdersChart(period),
          customersChart: await this.getCustomersChart(period),
          performanceChart: await this.getOrderFlowChart(period)
        },
        nigerianMetrics: {
          vatCollected: {
            value: 0, // VAT not applicable
            formatted: this.formatAdminCurrency(0)
          },
          businessHours: NigerianUtils.Business.isBusinessHours(),
          peakTime: this.isPeakShoppingTime(),
          topStates: await this.getTopSellingStatesInternal(period)
        },
        insights: {
          topPerformers: await this.getTopSellingProductsInternal(),
          growthAreas: [
            { area: 'Customer Acquisition', value: customerAnalytics.growthRate, trend: 'up' },
            { area: 'Revenue Growth', value: salesAnalytics.trends.revenue.change, trend: salesAnalytics.trends.revenue.trend },
            { area: 'Order Volume', value: salesAnalytics.trends.orders.change, trend: salesAnalytics.trends.orders.trend }
          ],
          recommendations: [
            {
              type: 'inventory',
              priority: inventoryAnalytics.lowStockProducts > 50 ? 'high' : 'medium',
              message: `${inventoryAnalytics.lowStockProducts} products are running low on stock`,
              action: 'Review and restock low inventory items'
            },
            {
              type: 'sales',
              priority: 'medium',
              message: `Revenue growth of ${salesAnalytics.trends.revenue.change.toFixed(1)}% this period`,
              action: 'Continue current sales strategies'
            }
          ]
        }
      };

      this.sendAdminSuccess(res, analytics, 'Dashboard analytics retrieved successfully', 200, {
        activity: 'analytics_access',
        includeMetrics: true,
        includeCurrencyInfo: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get recent admin activities and system events
   * GET /api/admin/dashboard/activities
   */
  public getRecentActivities = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!this.requireAdminAuth(req, res, 'admin')) return;

      const limit = parseInt(req.query.limit as string || '20');
      const type = req.query.type as string || 'all';
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const userId = this.getUserId(req);

      this.logAdminActivity(req, 'analytics_access', 'get_recent_activities', {
        description: `Accessed recent activities dashboard with limit: ${limit}`,
        severity: 'low',
        resourceType: 'activity_logs',
        metadata: { limit, type, dateFrom }
      });

      // Get recent activities (placeholder implementation)
      const activities = await this.getRecentActivitiesInternal(limit, type, dateFrom);
      const systemEvents = await this.getSystemEventsInternal(limit, dateFrom);

      const activitiesData = {
        timestamp: new Date().toISOString(),
        nigerianTime: NigerianUtils.Business.formatNigerianDate(new Date(), 'long'),
        filters: {
          limit,
          type,
          dateFrom: dateFrom?.toISOString()
        },
        summary: {
          totalActivities: activities.length,
          systemEvents: systemEvents.length,
          lastActivity: activities.length > 0 ? activities[0].timestamp : null,
          activityTypes: {
            user: activities.filter(a => a.type === 'user').length,
            order: activities.filter(a => a.type === 'order').length,
            system: activities.filter(a => a.type === 'system').length,
            security: activities.filter(a => a.type === 'security').length
          }
        },
        activities: activities.map(activity => ({
          id: activity.id,
          type: activity.type,
          action: activity.action,
          description: activity.description,
          user: {
            id: activity.userId,
            name: activity.userName,
            role: activity.userRole
          },
          resource: {
            type: activity.resourceType,
            id: activity.resourceId,
            name: activity.resourceName
          },
          timestamp: activity.timestamp,
          timeAgo: this.getTimeAgoInternal(activity.timestamp),
          severity: activity.severity,
          metadata: activity.metadata,
          ipAddress: activity.ipAddress,
          userAgent: activity.userAgent
        })),
        systemEvents: systemEvents.map(event => ({
          id: event.id,
          type: event.type,
          event: event.event,
          description: event.description,
          severity: event.severity,
          timestamp: event.timestamp,
          timeAgo: this.getTimeAgoInternal(event.timestamp),
          resolved: event.resolved,
          metadata: event.metadata
        })),
        recentTrends: {
          mostActiveHours: await this.getMostActiveHoursInternal(),
          topAdminActions: await this.getTopAdminActionsInternal(),
          securityEvents: await this.getSecurityEventsCountInternal(),
          systemHealth: {
            uptime: process.uptime(),
            lastRestart: new Date(Date.now() - process.uptime() * 1000),
            errorRate: await this.getSystemErrorRateInternal()
          }
        },
        nigerianContext: {
          businessHours: NigerianUtils.Business.isBusinessHours(),
          businessDayActivities: activities.filter(a => 
            this.isBusinessHourActivityInternal(a.timestamp)
          ).length,
          afterHoursActivities: activities.filter(a => 
            !this.isBusinessHourActivityInternal(a.timestamp)
          ).length
        }
      };

      this.sendAdminSuccess(res, activitiesData, 'Recent activities retrieved successfully', 200, {
        activity: 'analytics_access',
        includeMetrics: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get quick stats for dashboard widgets
   * GET /api/admin/dashboard/stats
   */
  public getQuickStats = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!this.requireAdminAuth(req, res, 'admin')) return;

      const userId = this.getUserId(req);
      const period = req.query.period as string || 'today';

      this.logAdminActivity(req, 'analytics_access', 'get_quick_stats', {
        description: `Accessed quick stats for period: ${period}`,
        severity: 'low',
        resourceType: 'dashboard_stats',
        metadata: { period }
      });

      // Get real-time stats from database
      const [revenueStats, orderStats, customerStats, inventoryStats] = await Promise.all([
        this.getRealTimeRevenueStatsInternal(period),
        this.getRealTimeOrderStatsInternal(period),
        this.getRealTimeCustomerStatsInternal(period),
        this.getRealTimeInventoryStatsInternal()
      ]);

      const stats = {
        totalRevenue: {
          value: revenueStats.total,
          formatted: this.formatAdminCurrency(revenueStats.total),
          currency: 'NGN',
          change: revenueStats.growthRate,
          period: `vs ${this.getPreviousPeriodLabelInternal(period)}`,
          trend: revenueStats.growthRate > 0 ? 'up' : revenueStats.growthRate < 0 ? 'down' : 'stable'
        },
        totalOrders: {
          value: orderStats.total,
          change: orderStats.growthRate,
          period: `vs ${this.getPreviousPeriodLabelInternal(period)}`,
          trend: orderStats.growthRate > 0 ? 'up' : orderStats.growthRate < 0 ? 'down' : 'stable'
        },
        totalCustomers: {
          value: customerStats.total,
          change: customerStats.growthRate,
          period: `vs ${this.getPreviousPeriodLabelInternal(period)}`,
          trend: customerStats.growthRate > 0 ? 'up' : customerStats.growthRate < 0 ? 'down' : 'stable'
        },
        conversionRate: {
          value: revenueStats.conversionRate,
          unit: '%',
          change: revenueStats.conversionChange,
          period: `vs ${this.getPreviousPeriodLabelInternal(period)}`,
          trend: revenueStats.conversionChange > 0 ? 'up' : revenueStats.conversionChange < 0 ? 'down' : 'stable'
        },
        averageOrderValue: {
          value: revenueStats.averageOrderValue,
          formatted: this.formatAdminCurrency(revenueStats.averageOrderValue),
          currency: 'NGN',
          change: revenueStats.aovChange,
          period: `vs ${this.getPreviousPeriodLabelInternal(period)}`,
          trend: revenueStats.aovChange > 0 ? 'up' : revenueStats.aovChange < 0 ? 'down' : 'stable'
        },
        pendingOrders: {
          value: orderStats.pending,
          change: orderStats.pendingChange,
          period: 'vs yesterday',
          trend: orderStats.pendingChange > 0 ? 'up' : orderStats.pendingChange < 0 ? 'down' : 'stable'
        },
        lowStockAlerts: {
          value: inventoryStats.lowStockCount,
          change: inventoryStats.alertsChange,
          period: 'new today',
          trend: inventoryStats.alertsChange > 0 ? 'up' : inventoryStats.alertsChange < 0 ? 'down' : 'stable'
        },
        activeUsers: {
          value: customerStats.active,
          period: 'online now',
          lastUpdated: new Date().toISOString()
        },
        nigerianSpecific: {
          vatCollected: {
            value: 0, // VAT not applicable
            formatted: this.formatAdminCurrency(0)
          },
          businessHours: NigerianUtils.Business.isBusinessHours(),
          peakTime: this.isPeakShoppingTime(),
          nigerianTime: NigerianUtils.Business.formatNigerianDate(new Date(), 'short')
        }
      };

      this.sendAdminSuccess(res, stats, 'Quick stats retrieved successfully', 200, {
        activity: 'analytics_access',
        includeMetrics: true,
        includeCurrencyInfo: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  // Private helper methods for generating metrics

  // Nigerian Market-Specific Helper Methods

  private getPreviousPeriodLabelInternal(period: string): string {
    const labels: Record<string, string> = {
      'today': 'yesterday',
      'last_7_days': 'previous 7 days',
      'last_30_days': 'previous 30 days',
      'last_90_days': 'previous 90 days',
      'this_month': 'last month',
      'this_year': 'last year'
    };
    return labels[period] || 'previous period';
  }

  private async getRealTimeRevenueStatsInternal(period: string) {
    const { startDate, endDate } = this.getPeriodDatesInternal(period);
    const previousPeriod = this.getPreviousPeriodDatesInternal(startDate, endDate);

    const [currentOrders, previousOrders] = await Promise.all([
      OrderModel.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: { not: 'CANCELLED' }
        }
      }),
      OrderModel.findMany({
        where: {
          createdAt: { gte: previousPeriod.startDate, lte: previousPeriod.endDate },
          status: { not: 'CANCELLED' }
        }
      })
    ]);

    const currentTotal = currentOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const previousTotal = previousOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const growthRate = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;
    
    const averageOrderValue = currentOrders.length > 0 ? currentTotal / currentOrders.length : 0;
    const previousAOV = previousOrders.length > 0 ? previousTotal / previousOrders.length : 0;
    const aovChange = previousAOV > 0 ? ((averageOrderValue - previousAOV) / previousAOV) * 100 : 0;

    // Simplified conversion rate calculation
    const conversionRate = 2.5; // Would calculate from actual session data
    const conversionChange = 0.3; // Would calculate from previous period

    return {
      total: currentTotal,
      growthRate: Math.round(growthRate * 100) / 100,
      averageOrderValue,
      aovChange: Math.round(aovChange * 100) / 100,
      conversionRate,
      conversionChange
    };
  }

  private async getRealTimeOrderStatsInternal(period: string) {
    const { startDate, endDate } = this.getPeriodDatesInternal(period);
    const previousPeriod = this.getPreviousPeriodDatesInternal(startDate, endDate);

    const [currentOrders, previousOrders, pendingOrders, yesterdayPendingOrders] = await Promise.all([
      OrderModel.count({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        }
      }),
      OrderModel.count({
        where: {
          createdAt: { gte: previousPeriod.startDate, lte: previousPeriod.endDate }
        }
      }),
      OrderModel.count({
        where: {
          status: 'PENDING'
        }
      }),
      OrderModel.count({
        where: {
          status: 'PENDING',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            lte: new Date(Date.now() - 23 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    const growthRate = previousOrders > 0 ? ((currentOrders - previousOrders) / previousOrders) * 100 : 0;
    const pendingChange = yesterdayPendingOrders > 0 ? ((pendingOrders - yesterdayPendingOrders) / yesterdayPendingOrders) * 100 : 0;

    return {
      total: currentOrders,
      growthRate: Math.round(growthRate * 100) / 100,
      pending: pendingOrders,
      pendingChange: Math.round(pendingChange * 100) / 100
    };
  }

  private async getRealTimeCustomerStatsInternal(period: string) {
    const { startDate, endDate } = this.getPeriodDatesInternal(period);
    const previousPeriod = this.getPreviousPeriodDatesInternal(startDate, endDate);

    const [currentCustomers, previousCustomers, activeCustomers] = await Promise.all([
      UserModel.count({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        }
      }),
      UserModel.count({
        where: {
          createdAt: { gte: previousPeriod.startDate, lte: previousPeriod.endDate }
        }
      }),
      UserModel.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      })
    ]);

    const growthRate = previousCustomers > 0 ? ((currentCustomers - previousCustomers) / previousCustomers) * 100 : 0;

    return {
      total: currentCustomers,
      growthRate: Math.round(growthRate * 100) / 100,
      active: activeCustomers
    };
  }

  private async getRealTimeInventoryStatsInternal() {
    const [inventory, yesterdayLowStock] = await Promise.all([
      InventoryModel.findMany({}),
      this.cacheService.get<number>('inventory:low_stock:yesterday') || 0
    ]);

    const lowStockCount = inventory.filter(
      item => (item as any).quantity <= ((item as any).lowStockThreshold || 10)
    ).length;

    const alertsChange = yesterdayLowStock > 0 ? ((lowStockCount - yesterdayLowStock) / yesterdayLowStock) * 100 : 0;

    return {
      lowStockCount,
      alertsChange: Math.round(alertsChange * 100) / 100
    };
  }

  private getPeriodDatesInternal(period: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now);
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'last_7_days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last_30_days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last_90_days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }

  private getPreviousPeriodDatesInternal(startDate: Date, endDate: Date): { startDate: Date; endDate: Date } {
    const periodLength = endDate.getTime() - startDate.getTime();
    return {
      startDate: new Date(startDate.getTime() - periodLength),
      endDate: new Date(startDate.getTime())
    };
  }

  // Sales Analytics Helper Methods

  private async getSalesDataInternal(period: string, breakdown: string) {
    const { startDate, endDate } = this.getPeriodDatesInternal(period);
    const previousPeriod = this.getPreviousPeriodDatesInternal(startDate, endDate);

    const [currentOrders, previousOrders] = await Promise.all([
      OrderModel.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: { not: 'CANCELLED' }
        },
        include: {
          user: true
        }
      }),
      OrderModel.findMany({
        where: {
          createdAt: { gte: previousPeriod.startDate, lte: previousPeriod.endDate },
          status: { not: 'CANCELLED' }
        }
      })
    ]);

    const totalRevenue = currentOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const previousRevenue = previousOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const averageOrderValue = currentOrders.length > 0 ? totalRevenue / currentOrders.length : 0;
    
    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    const orderGrowth = previousOrders.length > 0 ? ((currentOrders.length - previousOrders.length) / previousOrders.length) * 100 : 0;

    return {
      totalRevenue,
      totalOrders: currentOrders.length,
      averageOrderValue,
      conversionRate: 2.5, // Would calculate from session data
      trends: {
        revenue: {
          current: totalRevenue,
          previous: previousRevenue,
          change: revenueGrowth,
          trend: revenueGrowth > 0 ? 'up' : revenueGrowth < 0 ? 'down' : 'stable'
        },
        orders: {
          current: currentOrders.length,
          previous: previousOrders.length,
          change: orderGrowth,
          trend: orderGrowth > 0 ? 'up' : orderGrowth < 0 ? 'down' : 'stable'
        }
      }
    };
  }

  private async getPaymentMetricsInternal(period: string) {
    // Placeholder implementation - would integrate with PaymentService
    return {
      totalTransactions: 1247,
      successRate: 98.5,
      averageProcessingTime: 3.2,
      ordersByMethod: {
        card: 65,
        bank_transfer: 25,
        ussd: 8,
        wallet: 2
      },
      topMethods: [
        { method: 'Card', percentage: 65 },
        { method: 'Bank Transfer', percentage: 25 },
        { method: 'USSD', percentage: 8 },
        { method: 'Wallet', percentage: 2 }
      ],
      chartData: {
        labels: ['Card', 'Bank Transfer', 'USSD', 'Wallet'],
        data: [65, 25, 8, 2]
      }
    };
  }

  private async getRefundMetricsInternal(period: string) {
    // Placeholder implementation - would integrate with RefundService
    return {
      totalRefunds: 23,
      totalAmount: 45000, // in kobo
      refundRate: 1.8,
      averageAmount: 1956 // in kobo
    };
  }

  private async getTopSellingStatesInternal(period: string) {
    // Would implement actual state-based sales analysis
    return [
      { state: 'Lagos', orders: 456, revenue: 2340000, percentage: 35 },
      { state: 'Abuja', orders: 234, revenue: 1560000, percentage: 23 },
      { state: 'Kano', orders: 123, revenue: 890000, percentage: 13 },
      { state: 'Rivers', orders: 89, revenue: 670000, percentage: 10 },
      { state: 'Oyo', orders: 67, revenue: 450000, percentage: 7 }
    ];
  }

  private async getPeakSalesHoursInternal(period: string) {
    // Would analyze orders by hour to find peak times
    return {
      hours: [
        { hour: '12:00-13:00', orders: 45, revenue: 234000 },
        { hour: '19:00-20:00', orders: 56, revenue: 289000 },
        { hour: '20:00-21:00', orders: 52, revenue: 267000 },
        { hour: '13:00-14:00', orders: 41, revenue: 198000 }
      ],
      peakDay: 'Saturday',
      peakTime: '19:00-20:00'
    };
  }

  private async getBusinessHoursAnalysisInternal(period: string) {
    return {
      businessHours: {
        orders: 856,
        revenue: 4560000,
        percentage: 68
      },
      afterHours: {
        orders: 391,
        revenue: 2010000,
        percentage: 32
      },
      peakBusinessDay: 'Wednesday',
      slowestDay: 'Sunday'
    };
  }

  private async getStatesRevenueChartInternal(period: string) {
    const statesData = await this.getTopSellingStatesInternal(period);
    return {
      labels: statesData.map(s => s.state),
      data: statesData.map(s => s.revenue),
      percentages: statesData.map(s => s.percentage)
    };
  }

  // Inventory Analytics Helper Methods

  private async getInventoryMetricsInternal() {
    const [products, inventory] = await Promise.all([
      ProductModel.findMany({}),
      InventoryModel.findMany({})
    ]);

    const totalValue = inventory.reduce((sum, item) => {
      return sum + ((item as any).quantity || 0) * Number((item as any).averageCost || 0);
    }, 0);

    const averageValue = products.length > 0 ? totalValue / products.length : 0;

    const outOfStock = inventory.filter(item => ((item as any).quantity || 0) <= 0).length;
    const lowStock = inventory.filter(
      item => ((item as any).quantity || 0) <= ((item as any).lowStockThreshold || 10)
    ).length;

    return {
      totalProducts: products.length,
      activeProducts: products.filter(p => p.isActive).length,
      outOfStockProducts: outOfStock,
      lowStockProducts: lowStock,
      totalValue,
      averageValue,
      turnoverRate: 4.2, // Would calculate from sales/inventory data
      daysOfInventory: 87 // Would calculate based on turnover
    };
  }

  private async getInventoryAlertsInternal() {
    const inventory = await InventoryModel.findMany({});

    return inventory
      .filter(item => {
        const quantity = (item as any).quantity || 0;
        const threshold = (item as any).lowStockThreshold || 10;
        return quantity <= threshold;
      })
      .map(item => ({
        id: item.id,
        productName: (item as any).product?.name || 'Unknown Product',
        currentStock: (item as any).quantity || 0,
        threshold: (item as any).lowStockThreshold || 10,
        severity: ((item as any).quantity || 0) === 0 ? 'critical' : 'warning',
        lastRestocked: (item as any).lastRestockedAt || null,
        estimatedDaysUntilStockout: this.calculateDaysUntilStockoutInternal(item)
      }));
  }

  private calculateDaysUntilStockoutInternal(inventoryItem: any): number {
    // Simplified calculation - would use historical sales data
    const currentStock = inventoryItem.quantity || 0;
    const dailySalesRate = 2; // Average daily sales - would calculate from real data
    return currentStock > 0 ? Math.ceil(currentStock / dailySalesRate) : 0;
  }

  private async getTopSellingProductsInternal() {
    // Would implement actual top-selling products analysis
    return [
      {
        id: '1',
        name: 'iPhone 14 Pro Max',
        quantitySold: 45,
        revenue: 2250000,
        averagePrice: 50000,
        stockLevel: 23,
        category: 'Electronics'
      },
      {
        id: '2', 
        name: 'Samsung Galaxy S23',
        quantitySold: 38,
        revenue: 1520000,
        averagePrice: 40000,
        stockLevel: 18,
        category: 'Electronics'
      },
      {
        id: '3',
        name: 'MacBook Pro M2',
        quantitySold: 12,
        revenue: 1800000,
        averagePrice: 150000,
        stockLevel: 5,
        category: 'Computers'
      }
    ];
  }

  private async getCategoryAnalysisInternal() {
    // Would implement actual category analysis
    return [
      {
        id: '1',
        name: 'Electronics',
        productCount: 156,
        totalValue: 4500000,
        averageValue: 28846,
        lowStockCount: 12,
        outOfStockCount: 3
      },
      {
        id: '2',
        name: 'Fashion',
        productCount: 234,
        totalValue: 1200000,
        averageValue: 5128,
        lowStockCount: 8,
        outOfStockCount: 5
      },
      {
        id: '3',
        name: 'Home & Garden',
        productCount: 89,
        totalValue: 670000,
        averageValue: 7528,
        lowStockCount: 4,
        outOfStockCount: 1
      }
    ];
  }

  private async getStockLevelsChartInternal() {
    const categories = await this.getCategoryAnalysisInternal();
    return {
      labels: categories.map(c => c.name),
      datasets: [
        {
          label: 'In Stock',
          data: categories.map(c => c.productCount - c.lowStockCount - c.outOfStockCount)
        },
        {
          label: 'Low Stock',
          data: categories.map(c => c.lowStockCount)
        },
        {
          label: 'Out of Stock',
          data: categories.map(c => c.outOfStockCount)
        }
      ]
    };
  }

  private async getCategoryDistributionChartInternal() {
    const categories = await this.getCategoryAnalysisInternal();
    return {
      labels: categories.map(c => c.name),
      data: categories.map(c => c.totalValue),
      percentages: categories.map(c => 
        Math.round((c.totalValue / categories.reduce((sum, cat) => sum + cat.totalValue, 0)) * 100)
      )
    };
  }

  private async getInventoryTurnoverChartInternal() {
    // Would implement actual turnover calculation
    return {
      labels: ['Electronics', 'Fashion', 'Home & Garden', 'Books', 'Sports'],
      data: [4.2, 6.8, 3.1, 2.9, 5.4], // Turnover rates
      targets: [5.0, 8.0, 4.0, 3.5, 6.0] // Target turnover rates
    };
  }

  // Customer Analytics Helper Methods

  private async getCustomerMetricsInternal(period: string) {
    const { startDate, endDate } = this.getPeriodDatesInternal(period);

    const [totalCustomers, newCustomers, verifiedCustomers, activeCustomers] = await Promise.all([
      UserModel.count(),
      UserModel.count({
        where: { createdAt: { gte: startDate, lte: endDate } }
      }),
      UserModel.count({
        where: { isVerified: true }
      }),
      UserModel.count({
        where: {
          lastLoginAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      })
    ]);

    // Simplified calculations - would implement proper analytics
    const growthRate = 15.2;
    const averageLifetimeValue = 125000;
    const totalLifetimeValue = totalCustomers * averageLifetimeValue;
    const repeatCustomerRate = 35.8;

    return {
      totalCustomers,
      newCustomers,
      activeCustomers,
      verifiedCustomers,
      growthRate,
      averageLifetimeValue,
      totalLifetimeValue,
      repeatCustomerRate
    };
  }

  private async getCustomerDemographicsInternal() {
    // Would implement actual demographics analysis
    return {
      byState: [
        { state: 'Lagos', customers: 2456, percentage: 35 },
        { state: 'Abuja', customers: 1623, percentage: 23 },
        { state: 'Kano', customers: 912, percentage: 13 },
        { state: 'Rivers', customers: 698, percentage: 10 },
        { state: 'Oyo', customers: 445, percentage: 6 }
      ],
      byAge: {
        '18-25': 23,
        '26-35': 42,
        '36-45': 25,
        '46-55': 8,
        '55+': 2
      },
      byGender: {
        'male': 52,
        'female': 46,
        'other': 2
      },
      topCities: [
        { city: 'Lagos', customers: 1856 },
        { city: 'Abuja', customers: 1234 },
        { city: 'Kano', customers: 678 },
        { city: 'Port Harcourt', customers: 456 }
      ]
    };
  }

  private async getCustomerBehaviorInternal(period: string) {
    return {
      averageOrdersPerCustomer: 2.3,
      averageSessionDuration: 8.5, // minutes
      cartAbandonmentRate: 67.8,
      conversionRate: 2.4,
      preferredShoppingHours: [
        { hour: '19:00-20:00', percentage: 15 },
        { hour: '20:00-21:00', percentage: 13 },
        { hour: '12:00-13:00', percentage: 11 },
        { hour: '13:00-14:00', percentage: 9 }
      ],
      preferredPaymentMethods: [
        { method: 'Card', percentage: 65 },
        { method: 'Bank Transfer', percentage: 25 },
        { method: 'USSD', percentage: 8 },
        { method: 'Wallet', percentage: 2 }
      ]
    };
  }

  private async getCustomerRetentionInternal(period: string) {
    return {
      monthlyRate: 78.5,
      quarterlyRate: 65.2,
      churnRate: 21.5,
      bySegment: [
        { segment: 'High Value', retentionRate: 89.2 },
        { segment: 'Regular', retentionRate: 76.3 },
        { segment: 'Occasional', retentionRate: 45.8 },
        { segment: 'New', retentionRate: 23.1 }
      ]
    };
  }

  private async getRevenueMetrics(period: string) {
    // Placeholder implementation
    return {
      total: 5420000, // in kobo
      currency: 'NGN',
      growth: 12.5,
      transactions: 1247
    };
  }

  private async getOrderMetrics(period: string) {
    // Placeholder implementation
    return {
      total: 1247,
      pending: 23,
      processing: 67,
      shipped: 89,
      delivered: 1068,
      cancelled: 15,
      growth: 8.3
    };
  }

  private async getUserMetrics(period: string) {
    // Placeholder implementation
    return {
      total: 856,
      new: 47,
      active: 342,
      verified: 623,
      growth: 15.2
    };
  }

  private async getProductMetrics(period: string) {
    // Placeholder implementation
    return {
      total: 234,
      lowStock: 8,
      outOfStock: 3,
      published: 231,
      views: 45234
    };
  }

  private async getRevenueChart(period: string) {
    // Placeholder chart data
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      data: [320000, 450000, 380000, 520000, 490000, 580000]
    };
  }

  private async getOrdersChart(period: string) {
    // Placeholder chart data
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      data: [45, 67, 52, 78, 65, 89]
    };
  }

  private async getCustomersChart(period: string) {
    // Placeholder chart data
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      data: [12, 23, 18, 34, 28, 47]
    };
  }

  // Customer Analytics Helper Methods

  private async getCustomerDemographics() {
    // Would implement actual demographics analysis
    return {
      byState: [
        { state: 'Lagos', customers: 2456, percentage: 35 },
        { state: 'Abuja', customers: 1623, percentage: 23 },
        { state: 'Kano', customers: 912, percentage: 13 },
        { state: 'Rivers', customers: 698, percentage: 10 },
        { state: 'Oyo', customers: 445, percentage: 6 }
      ],
      byAge: {
        '18-25': 23,
        '26-35': 42,
        '36-45': 25,
        '46-55': 8,
        '55+': 2
      },
      byGender: {
        'male': 52,
        'female': 46,
        'other': 2
      },
      topCities: [
        { city: 'Lagos', customers: 1856 },
        { city: 'Abuja', customers: 1234 },
        { city: 'Kano', customers: 678 },
        { city: 'Port Harcourt', customers: 456 }
      ]
    };
  }

  private async getCustomerBehavior(period: string) {
    return {
      averageOrdersPerCustomer: 2.3,
      averageSessionDuration: 8.5, // minutes
      cartAbandonmentRate: 67.8,
      conversionRate: 2.4,
      preferredShoppingHours: [
        { hour: '19:00-20:00', percentage: 15 },
        { hour: '20:00-21:00', percentage: 13 },
        { hour: '12:00-13:00', percentage: 11 },
        { hour: '13:00-14:00', percentage: 9 }
      ],
      preferredPaymentMethods: [
        { method: 'Card', percentage: 65 },
        { method: 'Bank Transfer', percentage: 25 },
        { method: 'USSD', percentage: 8 },
        { method: 'Wallet', percentage: 2 }
      ]
    };
  }

  private async getCustomerRetention(period: string) {
    return {
      monthlyRate: 78.5,
      quarterlyRate: 65.2,
      churnRate: 21.5,
      bySegment: [
        { segment: 'High Value', retentionRate: 89.2 },
        { segment: 'Regular', retentionRate: 76.3 },
        { segment: 'Occasional', retentionRate: 45.8 },
        { segment: 'New', retentionRate: 23.1 }
      ]
    };
  }

  private async getCustomerAcquisitionChart(period: string) {
    const { startDate, endDate } = this.getPeriodDatesInternal(period);
    
    // Generate sample data - would be replaced with real acquisition data
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const labels: string[] = [];
    const data: number[] = [];

    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      labels.push(date.toLocaleDateString('en-NG', { 
        month: 'short', 
        day: 'numeric',
        timeZone: 'Africa/Lagos' 
      }));
      data.push(Math.floor(Math.random() * 50) + 10);
    }

    return { labels, data };
  }

  private async getCustomerDemographicsChart() {
    const demographics = await this.getCustomerDemographics();
    return {
      stateChart: {
        labels: demographics.byState.map(s => s.state),
        data: demographics.byState.map(s => s.customers)
      },
      ageChart: {
        labels: Object.keys(demographics.byAge),
        data: Object.values(demographics.byAge)
      },
      genderChart: {
        labels: Object.keys(demographics.byGender),
        data: Object.values(demographics.byGender)
      }
    };
  }

  private async getCustomerRetentionChart(period: string) {
    return {
      labels: ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'],
      data: [100, 78.5, 65.2, 58.1, 52.3, 47.8]
    };
  }

  private async getCustomerBehaviorChart(period: string) {
    const behavior = await this.getCustomerBehavior(period);
    return {
      shoppingHoursChart: {
        labels: behavior.preferredShoppingHours.map(h => h.hour),
        data: behavior.preferredShoppingHours.map(h => h.percentage)
      },
      paymentMethodsChart: {
        labels: behavior.preferredPaymentMethods.map(p => p.method),
        data: behavior.preferredPaymentMethods.map(p => p.percentage)
      }
    };
  }

  // Operational Metrics Helper Methods

  private async getOrderOperationalMetrics(period: string) {
    const { startDate, endDate } = this.getPeriodDatesInternal(period);

    const orders = await OrderModel.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      }
    });

    const pending = orders.filter(o => o.status === 'PENDING').length;
    const processing = orders.filter(o => o.status === 'PROCESSING').length;
    const shipped = orders.filter(o => o.status === 'SHIPPED').length;
    const delivered = orders.filter(o => o.status === 'DELIVERED').length;
    const cancelled = orders.filter(o => o.status === 'CANCELLED').length;

    return {
      pending,
      processing,
      shipped,
      delivered,
      cancelled,
      averageProcessingTime: 2.5, // days - would calculate from actual data
      onTimeDeliveryRate: 87.3 // percentage - would calculate from delivery data
    };
  }

  private async getFulfillmentMetrics(period: string) {
    // Would integrate with fulfillment/shipping service
    return {
      totalShipments: 456,
      deliverySuccessRate: 94.2,
      averageDeliveryTime: 4.2, // days
      topDeliveryStates: [
        { state: 'Lagos', deliveries: 156, averageTime: 2.1 },
        { state: 'Abuja', deliveries: 89, averageTime: 3.5 },
        { state: 'Kano', deliveries: 67, averageTime: 5.2 },
        { state: 'Rivers', deliveries: 45, averageTime: 4.8 }
      ],
      totalShippingCosts: 234000, // in kobo
      averageShippingCost: 513, // in kobo per shipment
      shippingCostsByState: [
        { state: 'Lagos', averageCost: 200, totalCost: 31200 },
        { state: 'Abuja', averageCost: 800, totalCost: 71200 },
        { state: 'Kano', averageCost: 1200, totalCost: 80400 },
        { state: 'Rivers', averageCost: 1000, totalCost: 45000 }
      ]
    };
  }

  private async getSystemHealthMetrics() {
    return {
      uptime: process.uptime(),
      responseTime: 150, // ms
      errorRate: 0.5, // percentage
      databasePerformance: {
        connectionPool: 85,
        queryTime: 45,
        slowQueries: 2
      },
      cachePerformance: {
        hitRate: 89.5,
        memoryUsage: 67.2,
        evictionRate: 2.1
      }
    };
  }

  private async getNotificationMetrics(period: string) {
    return {
      totalSent: 2456,
      smsDeliveryRate: 94.2,
      emailDeliveryRate: 96.8,
      pushNotificationRate: 78.3
    };
  }

  private async getOrderFlowChart(period: string) {
    return {
      labels: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      data: [23, 67, 89, 1068, 15],
      colors: ['#fbbf24', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444']
    };
  }

  private async getDeliveryPerformanceChart(period: string) {
    return {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          label: 'On-time Deliveries',
          data: [85, 89, 92, 88, 90, 78, 65]
        },
        {
          label: 'Late Deliveries', 
          data: [15, 11, 8, 12, 10, 22, 35]
        }
      ]
    };
  }

  private async getSystemHealthChart(period: string) {
    return {
      labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
      datasets: [
        {
          label: 'Response Time (ms)',
          data: [120, 98, 145, 180, 165, 142]
        },
        {
          label: 'Error Rate (%)',
          data: [0.2, 0.1, 0.3, 0.8, 0.6, 0.4]
        }
      ]
    };
  }

  // Export Helper Methods

  private async getSalesExportData(period: string) {
    const { startDate, endDate } = this.getPeriodDatesInternal(period);
    const orders = await OrderModel.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: { not: 'CANCELLED' }
      },
      include: {
        user: true
      }
    });

    // Simplified export to avoid complex type issues
    return orders.map(order => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: 'Customer Name', // Would fetch from user relationship
      customerEmail: 'customer@example.com', // Would fetch from user relationship
      customerPhone: '+234xxxxxxxxx', // Would fetch from user relationship
      orderDate: order.createdAt,
      status: order.status,
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost || 0),
      tax: Number(order.tax || 0),
      total: Number(order.total),
      paymentMethod: order.paymentMethod || 'card',
      shippingAddress: 'Shipping Address', // Would fetch from address relationship
      items: [] // Would fetch from order items relationship
    }));
  }

  private async getCustomersExportData(period: string) {
    const { startDate, endDate } = this.getPeriodDatesInternal(period);
    const users = await UserModel.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      },
      include: {
        orders: true,
        addresses: true
      }
    });

    return users.map(user => ({
      customerId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      registrationDate: user.createdAt,
      isVerified: user.isVerified,
      lastLogin: user.lastLoginAt,
      totalOrders: user.orders?.length || 0,
      totalSpent: user.orders?.reduce((sum, order) => sum + Number(order.total), 0) || 0,
      averageOrderValue: user.orders?.length ? 
        (user.orders.reduce((sum, order) => sum + Number(order.total), 0) / user.orders.length) : 0,
      status: user.status,
      addresses: user.addresses?.map(addr => ({
        street: (addr as any).street,
        city: (addr as any).city,
        state: (addr as any).state,
        country: (addr as any).country
      })) || []
    }));
  }

  private async getInventoryExportData() {
    const inventory = await InventoryModel.findMany({});

    // Simplified export to avoid complex type issues
    return inventory.map(item => ({
      productId: 'PROD-001',
      productName: 'Sample Product', // Would fetch from product relationship
      sku: 'SKU-001',
      category: 'Electronics',
      currentStock: 50,
      reservedStock: 5,
      availableStock: 45,
      lowStockThreshold: 10,
      unitCost: 25000,
      totalValue: 1250000,
      lastRestocked: new Date(),
      stockStatus: 'In Stock'
    }));
  }

  private async getOperationsExportData(period: string) {
    const { startDate, endDate } = this.getPeriodDatesInternal(period);
    const orders = await OrderModel.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      },
      include: {
        user: true
      }
    });

    // Simplified export to avoid complex type issues
    return orders.map(order => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      customerName: 'Customer Name', // Would fetch from user relationship
      total: Number(order.total),
      processingTime: this.calculateProcessingTimeInternal(order),
      shippingMethod: 'Standard',
      shippingAddress: 'Shipping Address',
      notes: 'Order notes'
    }));
  }

  private async getOverviewExportData(period: string) {
    const [sales, customers, inventory] = await Promise.all([
      this.getSalesExportData(period),
      this.getCustomersExportData(period),
      this.getInventoryExportData()
    ]);

    return [
      { section: 'Sales Summary', data: sales.length, totalRevenue: sales.reduce((sum, s) => sum + s.total, 0) },
      { section: 'Customer Summary', data: customers.length, totalValue: customers.reduce((sum, c) => sum + c.totalSpent, 0) },
      { section: 'Inventory Summary', data: inventory.length, totalValue: inventory.reduce((sum, i) => sum + i.totalValue, 0) }
    ];
  }

  private calculateProcessingTimeInternal(order: any): number {
    if (!order.updatedAt || !order.createdAt) return 0;
    const diff = new Date(order.updatedAt).getTime() - new Date(order.createdAt).getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24)); // Days
  }

  // Alert System Helper Methods

  private async getSystemAlerts(severity: string, limit: number) {
    // Would integrate with actual alert system
    const alerts = [
      {
        id: '1',
        type: 'inventory',
        severity: 'critical',
        title: 'Product Out of Stock',
        message: 'iPhone 14 Pro Max is completely out of stock',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        actionRequired: true,
        resourceId: 'product_123'
      },
      {
        id: '2',
        type: 'payment',
        severity: 'warning',
        title: 'High Payment Failure Rate',
        message: 'Payment failure rate increased to 8% in the last hour',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        actionRequired: true,
        resourceId: 'payment_system'
      },
      {
        id: '3',
        type: 'system',
        severity: 'info',
        title: 'Scheduled Maintenance',
        message: 'System maintenance scheduled for tonight at 2:00 AM',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        actionRequired: false,
        resourceId: 'system'
      }
    ];

    return alerts
      .filter(alert => severity === 'all' || alert.severity === severity)
      .slice(0, limit);
  }

  private async getPendingNotifications(limit: number) {
    // Would integrate with notification system
    return [
      {
        id: '1',
        type: 'sms',
        recipient: '+234803*******',
        message: 'Your order #ORD-12345 has been shipped',
        status: 'pending',
        attempts: 1,
        createdAt: new Date(Date.now() - 10 * 60 * 1000)
      },
      {
        id: '2',
        type: 'email',
        recipient: 'customer@example.com',
        subject: 'Order Confirmation',
        status: 'failed',
        attempts: 3,
        createdAt: new Date(Date.now() - 25 * 60 * 1000),
        error: 'Invalid email address'
      }
    ].slice(0, limit);
  }

  // ========================
  // INVENTORY DASHBOARD ENDPOINTS (Phase 2.3)
  // ========================

  /**
   * Get inventory dashboard widgets
   * GET /api/admin/dashboard/inventory/widgets
   */
  public getInventoryDashboardWidgets = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);

      this.logAdminActivity(req, 'analytics_access', 'get_inventory_dashboard_widgets', {
        description: 'Retrieved inventory dashboard widgets',
        severity: 'low',
        resourceType: 'dashboard_widgets'
      });

      const widgets = await this.inventoryDashboardService.getAvailableWidgets();

      this.sendAdminSuccess(res, { widgets }, 'Inventory dashboard widgets retrieved successfully', 200, {
        activity: 'analytics_access',
        includeMetrics: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get inventory dashboard layout
   * GET /api/admin/dashboard/inventory/layout
   */
  public getInventoryDashboardLayout = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { layoutId } = req.query;

      this.logAdminActivity(req, 'analytics_access', 'get_inventory_dashboard_layout', {
        description: 'Retrieved inventory dashboard layout',
        severity: 'low',
        resourceType: 'dashboard_layout',
        metadata: { layoutId }
      });

      const layout = await this.inventoryDashboardService.getDashboardLayout(layoutId as string);

      this.sendAdminSuccess(res, { layout }, 'Inventory dashboard layout retrieved successfully', 200, {
        activity: 'analytics_access',
        includeMetrics: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get real-time inventory dashboard data
   * GET /api/admin/dashboard/inventory/realtime
   */
  public getInventoryRealTimeDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);

      this.logAdminActivity(req, 'analytics_access', 'get_inventory_realtime_dashboard', {
        description: 'Retrieved real-time inventory dashboard data',
        severity: 'low',
        resourceType: 'realtime_dashboard'
      });

      const dashboardData = await this.inventoryDashboardService.getRealTimeDashboardData();

      this.sendAdminSuccess(res, dashboardData, 'Real-time inventory dashboard data retrieved successfully', 200, {
        activity: 'analytics_access',
        includeMetrics: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get specific inventory widget data
   * GET /api/admin/dashboard/inventory/widgets/:widgetId
   */
  public getInventoryWidgetData = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { widgetId } = req.params;

      if (!widgetId) {
        this.sendError(res, "Widget ID is required", 400, "MISSING_WIDGET_ID");
        return;
      }

      this.logAdminActivity(req, 'analytics_access', 'get_inventory_widget_data', {
        description: `Retrieved inventory widget data for widget ${widgetId}`,
        severity: 'low',
        resourceType: 'dashboard_widget',
        resourceId: widgetId
      });

      const widget = await this.inventoryDashboardService.getWidget(widgetId);
      if (!widget) {
        this.sendError(res, "Widget not found", 404, "WIDGET_NOT_FOUND");
        return;
      }

      this.sendAdminSuccess(res, { widget }, 'Inventory widget data retrieved successfully', 200, {
        activity: 'analytics_access',
        includeMetrics: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Update inventory widget configuration
   * PUT /api/admin/dashboard/inventory/widgets/:widgetId/config
   */
  public updateInventoryWidgetConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { widgetId } = req.params;
      const { configuration } = req.body;

      if (!widgetId) {
        this.sendError(res, "Widget ID is required", 400, "MISSING_WIDGET_ID");
        return;
      }

      if (!configuration || typeof configuration !== 'object') {
        this.sendError(res, "Valid configuration object is required", 400, "INVALID_CONFIGURATION");
        return;
      }

      this.logAdminActivity(req, 'system_configuration', 'update_inventory_widget_config', {
        description: `Updated inventory widget configuration for widget ${widgetId}`,
        severity: 'medium',
        resourceType: 'dashboard_widget',
        resourceId: widgetId,
        metadata: { configuration }
      });

      const updatedWidget = await this.inventoryDashboardService.updateWidgetConfiguration(widgetId, configuration);

      this.sendAdminSuccess(res, { widget: updatedWidget }, 'Widget configuration updated successfully', 200, {
        activity: 'system_configuration',
        includeMetrics: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get Nigerian-specific inventory dashboard widgets
   * GET /api/admin/dashboard/inventory/nigerian-widgets
   */
  public getNigerianInventoryWidgets = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);

      this.logAdminActivity(req, 'analytics_access', 'get_nigerian_inventory_widgets', {
        description: 'Retrieved Nigerian business inventory widgets',
        severity: 'low',
        resourceType: 'nigerian_widgets'
      });

      const nigerianWidgets = await this.inventoryDashboardService.getNigerianBusinessWidgets();

      this.sendAdminSuccess(res, { widgets: nigerianWidgets }, 'Nigerian business inventory widgets retrieved successfully', 200, {
        activity: 'analytics_access',
        includeMetrics: true,
        includeCurrencyInfo: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get inventory dashboard summary for main dashboard
   * GET /api/admin/dashboard/inventory/summary
   */
  public getInventoryDashboardSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);

      this.logAdminActivity(req, 'analytics_access', 'get_inventory_dashboard_summary', {
        description: 'Retrieved inventory dashboard summary',
        severity: 'low',
        resourceType: 'dashboard_summary'
      });

      // Get key inventory metrics for the main dashboard
      const [overview, widgets] = await Promise.all([
        this.inventoryAnalyticsService.getInventoryOverview(),
        this.inventoryDashboardService.getAvailableWidgets()
      ]);

      // Extract KPI widgets for summary
      const kpiWidgets = widgets.filter(w => w.type === 'kpi').slice(0, 6);
      
      // Get alert widget for urgent notifications
      const alertWidget = widgets.find(w => w.type === 'alert');
      const criticalAlerts = alertWidget ? (alertWidget.data as any).criticalCount : 0;

      const summary = {
        keyMetrics: {
          totalStockValue: {
            value: overview.summary.totalStockValue,
            formatted: this.formatAdminCurrency(overview.summary.totalStockValue),
            trend: overview.summary.totalStockValue > 0 ? 'up' : 'stable',
            change: 8.5
          },
          stockTurnoverRate: {
            value: overview.summary.stockTurnoverRate,
            formatted: `${overview.summary.stockTurnoverRate.toFixed(1)}x`,
            trend: overview.summary.stockTurnoverRate > 6 ? 'up' : 'down',
            change: 12.3,
            target: 8.0,
            status: overview.summary.stockTurnoverRate > 6 ? 'good' : 'warning'
          },
          lowStockAlerts: {
            value: overview.stockDistribution.lowStock.count,
            severity: overview.stockDistribution.lowStock.count > 50 ? 'critical' : 
                     overview.stockDistribution.lowStock.count > 20 ? 'warning' : 'good',
            actionRequired: overview.stockDistribution.lowStock.count > 0
          },
          deadStockValue: {
            value: overview.summary.deadStockValue,
            formatted: this.formatAdminCurrency(overview.summary.deadStockValue),
            percentage: ((overview.summary.deadStockValue / overview.summary.totalStockValue) * 100).toFixed(1),
            status: overview.summary.deadStockValue > 100000000 ? 'warning' : 'good' // 1M NGN threshold
          }
        },
        alerts: {
          critical: criticalAlerts,
          total: alertWidget ? (alertWidget.data as any).totalCount : 0,
          hasActionRequired: criticalAlerts > 0
        },
        nigerianContext: {
          vatCollected: overview.businessMetrics.vatImpact.totalVatCollected,
          vatCollectedFormatted: this.formatAdminCurrency(overview.businessMetrics.vatImpact.totalVatCollected),
          importVsLocal: {
            imported: overview.businessMetrics.importVsLocalRatio.imported.percentage,
            local: overview.businessMetrics.importVsLocalRatio.local.percentage
          },
          businessHours: NigerianUtils.Business.isBusinessHours(),
          peakSeason: this.isNigerianPeakSeason()
        },
        quickActions: [
          {
            id: 'view_low_stock',
            title: 'View Low Stock',
            description: `${overview.stockDistribution.lowStock.count} products need attention`,
            priority: overview.stockDistribution.lowStock.count > 50 ? 'high' : 'medium',
            url: '/admin/inventory?filter=low-stock'
          },
          {
            id: 'generate_report',
            title: 'Generate Inventory Report',
            description: 'Create comprehensive inventory analysis',
            priority: 'low',
            url: '/admin/inventory/reports'
          },
          {
            id: 'view_analytics',
            title: 'View Full Analytics',
            description: 'Access detailed inventory analytics',
            priority: 'medium',
            url: '/admin/inventory/analytics'
          }
        ],
        lastUpdated: new Date(),
        refreshInterval: 300 // 5 minutes
      };

      this.sendAdminSuccess(res, summary, 'Inventory dashboard summary retrieved successfully', 200, {
        activity: 'analytics_access',
        includeMetrics: true,
        includeCurrencyInfo: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  // Private helper methods for inventory dashboard

  private isNigerianPeakSeason(): boolean {
    const now = new Date();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed
    
    // Nigerian peak shopping seasons
    const peakMonths = [11, 12, 1]; // November, December, January (Christmas/New Year)
    const backToSchoolMonths = [1, 9]; // January, September
    
    return peakMonths.includes(month) || backToSchoolMonths.includes(month);
  }

  // Helper methods for activities dashboard

  private async getRecentActivitiesInternal(limit: number, type: string, dateFrom?: Date) {
    // Production safety check
    if (process.env.NODE_ENV === 'production') {
      // In production, return empty array until proper implementation
      console.warn('getRecentActivitiesInternal called in production - returning empty results');
      return [];
    }
    
    // Development placeholder implementation - would integrate with actual activity logging
    const sampleActivities = [
      {
        id: '1',
        type: 'user',
        action: 'create_user',
        description: 'Created new customer account',
        userId: 'admin_123',
        userName: 'Admin User',
        userRole: 'ADMIN',
        resourceType: 'user',
        resourceId: 'customer_456',
        resourceName: 'John Doe',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        severity: 'low',
        metadata: { customerEmail: 'john@example.com' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...'
      },
      {
        id: '2',
        type: 'order',
        action: 'update_order_status',
        description: 'Changed order status to SHIPPED',
        userId: 'admin_123',
        userName: 'Admin User',
        userRole: 'ADMIN',
        resourceType: 'order',
        resourceId: 'order_789',
        resourceName: 'Order #ORD-12345',
        timestamp: new Date(Date.now() - 25 * 60 * 1000),
        severity: 'low',
        metadata: { oldStatus: 'PROCESSING', newStatus: 'SHIPPED' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...'
      },
      {
        id: '3',
        type: 'security',
        action: 'failed_login',
        description: 'Failed login attempt detected',
        userId: 'unknown',
        userName: 'Unknown User',
        userRole: 'NONE',
        resourceType: 'security',
        resourceId: 'login_attempt_456',
        resourceName: 'Failed Login',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        severity: 'warning',
        metadata: { attemptedEmail: 'hacker@example.com', reason: 'Invalid credentials' },
        ipAddress: '192.168.1.200',
        userAgent: 'Python/3.x'
      }
    ];

    return sampleActivities
      .filter(activity => type === 'all' || activity.type === type)
      .filter(activity => !dateFrom || activity.timestamp >= dateFrom)
      .slice(0, limit);
  }

  private async getSystemEventsInternal(limit: number, dateFrom?: Date) {
    // Production safety check
    if (process.env.NODE_ENV === 'production') {
      // In production, return empty array until proper implementation
      console.warn('getSystemEventsInternal called in production - returning empty results');
      return [];
    }
    
    // Development placeholder implementation - would integrate with system event monitoring
    const sampleEvents = [
      {
        id: '1',
        type: 'system',
        event: 'high_memory_usage',
        description: 'Memory usage exceeded 80% threshold',
        severity: 'warning',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        resolved: false,
        metadata: { memoryUsage: '85%', threshold: '80%' }
      },
      {
        id: '2',
        type: 'database',
        event: 'slow_query_detected',
        description: 'Slow database query detected',
        severity: 'warning',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        resolved: true,
        metadata: { queryTime: '5.2s', query: 'SELECT * FROM orders...' }
      }
    ];

    return sampleEvents
      .filter(event => !dateFrom || event.timestamp >= dateFrom)
      .slice(0, limit);
  }

  private getTimeAgoInternal(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return timestamp.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Africa/Lagos'
    });
  }

  private async getMostActiveHoursInternal() {
    // Would analyze actual activity logs
    return [
      { hour: '09:00-10:00', activities: 45 },
      { hour: '14:00-15:00', activities: 38 },
      { hour: '10:00-11:00', activities: 32 },
      { hour: '15:00-16:00', activities: 28 }
    ];
  }

  private async getTopAdminActionsInternal() {
    // Would analyze actual activity logs
    return [
      { action: 'update_order_status', count: 156 },
      { action: 'create_user', count: 89 },
      { action: 'inventory_update', count: 67 },
      { action: 'view_analytics', count: 45 }
    ];
  }

  private async getSecurityEventsCountInternal() {
    // Would integrate with security monitoring
    return {
      total: 23,
      critical: 2,
      warning: 8,
      info: 13,
      lastEvent: new Date(Date.now() - 15 * 60 * 1000)
    };
  }

  private async getSystemErrorRateInternal() {
    // Would calculate from actual system logs
    return 0.8; // 0.8% error rate
  }

  private isBusinessHourActivityInternal(timestamp: Date): boolean {
    const hour = timestamp.getHours();
    return hour >= 8 && hour <= 18; // 8 AM to 6 PM Nigerian business hours
  }

}