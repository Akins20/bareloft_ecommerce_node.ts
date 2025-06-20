import { BaseService } from "../BaseService";
import { CacheService } from "../cache/CacheService";
import {
  UserModel,
  ProductModel,
  OrderModel,
  CartModel,
  ProductReviewModel,
  InventoryModel,
} from "../../models";
import { CONSTANTS } from "../../types";

export interface AnalyticsEvent {
  userId?: string;
  sessionId?: string;
  event: string;
  properties: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface DashboardMetrics {
  sales: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    revenueGrowth: number;
    ordersGrowth: number;
    conversionRate: number;
  };
  customers: {
    totalCustomers: number;
    newCustomers: number;
    activeCustomers: number;
    customerGrowth: number;
    customerLifetimeValue: number;
    repeatCustomerRate: number;
  };
  products: {
    totalProducts: number;
    activeProducts: number;
    outOfStockProducts: number;
    lowStockProducts: number;
    topSellingProducts: Array<{
      id: string;
      name: string;
      quantitySold: number;
      revenue: number;
    }>;
  };
  inventory: {
    totalValue: number;
    turnoverRate: number;
    daysOfInventory: number;
    stockouts: number;
  };
}

export interface SalesAnalytics {
  revenue: {
    daily: Array<{ date: string; amount: number; orders: number }>;
    weekly: Array<{ week: string; amount: number; orders: number }>;
    monthly: Array<{ month: string; amount: number; orders: number }>;
    yearly: Array<{ year: string; amount: number; orders: number }>;
  };
  trends: {
    revenueGrowthRate: number;
    orderGrowthRate: number;
    averageOrderValueTrend: number;
    seasonalPatterns: Array<{
      period: string;
      multiplier: number;
    }>;
  };
  performance: {
    bestSellingProducts: Array<{
      productId: string;
      productName: string;
      quantitySold: number;
      revenue: number;
      margin: number;
    }>;
    topCategories: Array<{
      categoryId: string;
      categoryName: string;
      revenue: number;
      orderCount: number;
    }>;
    topCustomers: Array<{
      customerId: string;
      customerName: string;
      totalSpent: number;
      orderCount: number;
    }>;
  };
}

export interface CustomerAnalytics {
  demographics: {
    ageGroups: Record<string, number>;
    genderDistribution: Record<string, number>;
    locationDistribution: Record<string, number>;
  };
  behavior: {
    averageSessionDuration: number;
    pagesPerSession: number;
    bounceRate: number;
    cartAbandonmentRate: number;
    repeatPurchaseRate: number;
  };
  segments: Array<{
    name: string;
    description: string;
    customerCount: number;
    averageOrderValue: number;
    lifetimeValue: number;
  }>;
  retention: {
    churnRate: number;
    retentionByPeriod: Array<{
      period: string;
      retentionRate: number;
    }>;
  };
}

export class AnalyticsService extends BaseService {
  private cache: CacheService;

  constructor(cacheService: CacheService) {
    super();
    this.cache = cacheService;
  }

  /**
   * Track analytics event
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Store event for processing
      await this.storeEvent(event);

      // Update real-time metrics if needed
      await this.updateRealTimeMetrics(event);
    } catch (error) {
      this.handleError("Error tracking analytics event", error);
      // Don't throw - analytics failures shouldn't break the app
    }
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<DashboardMetrics> {
    try {
      const cacheKey = `dashboard:metrics:${startDate?.toISOString()}:${endDate?.toISOString()}`;

      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          const [sales, customers, products, inventory] = await Promise.all([
            this.getSalesMetrics(startDate, endDate),
            this.getCustomerMetrics(startDate, endDate),
            this.getProductMetrics(),
            this.getInventoryMetrics(),
          ]);

          return {
            sales,
            customers,
            products,
            inventory,
          };
        },
        { ttl: CONSTANTS.CACHE_TTL.SHORT } // 5 minutes
      );
    } catch (error) {
      this.handleError("Error getting dashboard metrics", error);
      throw error;
    }
  }

  /**
   * Get sales analytics
   */
  async getSalesAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<SalesAnalytics> {
    try {
      const cacheKey = `sales:analytics:${startDate?.toISOString()}:${endDate?.toISOString()}`;

      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          const [revenue, trends, performance] = await Promise.all([
            this.getRevenueData(startDate, endDate),
            this.getSalesTrends(startDate, endDate),
            this.getSalesPerformance(startDate, endDate),
          ]);

          return {
            revenue,
            trends,
            performance,
          };
        },
        { ttl: CONSTANTS.CACHE_TTL.MEDIUM } // 30 minutes
      );
    } catch (error) {
      this.handleError("Error getting sales analytics", error);
      throw error;
    }
  }

  /**
   * Get customer analytics
   */
  async getCustomerAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<CustomerAnalytics> {
    try {
      const cacheKey = `customer:analytics:${startDate?.toISOString()}:${endDate?.toISOString()}`;

      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          const [demographics, behavior, segments, retention] =
            await Promise.all([
              this.getCustomerDemographics(),
              this.getCustomerBehavior(startDate, endDate),
              this.getCustomerSegments(),
              this.getCustomerRetention(),
            ]);

          return {
            demographics,
            behavior,
            segments,
            retention,
          };
        },
        { ttl: CONSTANTS.CACHE_TTL.LONG } // 1 hour
      );
    } catch (error) {
      this.handleError("Error getting customer analytics", error);
      throw error;
    }
  }

  /**
   * Track page view
   */
  async trackPageView(
    userId: string | undefined,
    page: string,
    referrer?: string,
    sessionId?: string
  ): Promise<void> {
    await this.trackEvent({
      userId,
      sessionId,
      event: "page_view",
      properties: {
        page,
        referrer,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Track product view
   */
  async trackProductView(
    userId: string | undefined,
    productId: string,
    productName: string,
    categoryId: string,
    sessionId?: string
  ): Promise<void> {
    await this.trackEvent({
      userId,
      sessionId,
      event: "product_view",
      properties: {
        productId,
        productName,
        categoryId,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Track add to cart
   */
  async trackAddToCart(
    userId: string | undefined,
    productId: string,
    productName: string,
    quantity: number,
    price: number,
    sessionId?: string
  ): Promise<void> {
    await this.trackEvent({
      userId,
      sessionId,
      event: "add_to_cart",
      properties: {
        productId,
        productName,
        quantity,
        price,
        value: quantity * price,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Track purchase
   */
  async trackPurchase(
    userId: string,
    orderId: string,
    orderTotal: number,
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      price: number;
    }>
  ): Promise<void> {
    await this.trackEvent({
      userId,
      event: "purchase",
      properties: {
        orderId,
        revenue: orderTotal,
        items,
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      },
      timestamp: new Date(),
    });
  }

  /**
   * Track search
   */
  async trackSearch(
    userId: string | undefined,
    query: string,
    resultsCount: number,
    sessionId?: string
  ): Promise<void> {
    await this.trackEvent({
      userId,
      sessionId,
      event: "search",
      properties: {
        query,
        resultsCount,
      },
      timestamp: new Date(),
    });
  }

  // Private helper methods

  private async storeEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // In a real implementation, you would store this in a time-series database
      // like InfluxDB, TimescaleDB, or a dedicated analytics service

      // For now, we'll store in a list in Redis for demonstration
      const eventData = JSON.stringify({
        ...event,
        id: crypto.randomUUID(),
      });

      await this.cache.lpush("analytics:events", eventData);

      // Keep only recent events (last 10000)
      await this.cache.ltrim("analytics:events", 0, 9999);
    } catch (error) {
      this.handleError("Error storing analytics event", error);
    }
  }

  private async updateRealTimeMetrics(event: AnalyticsEvent): Promise<void> {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Update daily counters
      switch (event.event) {
        case "page_view":
          await this.cache.increment(`metrics:pageviews:${today}`, 1, 86400);
          break;
        case "add_to_cart":
          await this.cache.increment(`metrics:add_to_cart:${today}`, 1, 86400);
          break;
        case "purchase":
          await this.cache.increment(`metrics:purchases:${today}`, 1, 86400);
          if (event.properties.revenue) {
            await this.cache.increment(
              `metrics:revenue:${today}`,
              Math.round(event.properties.revenue * 100), // Store in kobo
              86400
            );
          }
          break;
      }
    } catch (error) {
      this.handleError("Error updating real-time metrics", error);
    }
  }

  private async getSalesMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<DashboardMetrics["sales"]> {
    const whereClause: any = {};
    if (startDate) whereClause.createdAt = { gte: startDate };
    if (endDate)
      whereClause.createdAt = { ...whereClause.createdAt, lte: endDate };

    const [orders, previousPeriodOrders] = await Promise.all([
      OrderModel.findMany({
        where: {
          ...whereClause,
          status: { not: "CANCELLED" },
        },
      }),
      OrderModel.findMany({
        where: {
          status: { not: "CANCELLED" },
          // Previous period logic would go here
        },
      }),
    ]);

    const totalRevenue = orders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0
    );
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const previousRevenue = previousPeriodOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0
    );
    const revenueGrowth =
      previousRevenue > 0
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
        : 0;
    const ordersGrowth =
      previousPeriodOrders.length > 0
        ? ((totalOrders - previousPeriodOrders.length) /
            previousPeriodOrders.length) *
          100
        : 0;

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      revenueGrowth,
      ordersGrowth,
      conversionRate: 0, // Would calculate from session data
    };
  }

  private async getCustomerMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<DashboardMetrics["customers"]> {
    const whereClause: any = {};
    if (startDate) whereClause.createdAt = { gte: startDate };
    if (endDate)
      whereClause.createdAt = { ...whereClause.createdAt, lte: endDate };

    const [totalCustomers, newCustomers, customersWithOrders] =
      await Promise.all([
        UserModel.count(),
        UserModel.count({ where: whereClause }),
        UserModel.count({
          where: {
            orders: {
              some: {
                status: { not: "CANCELLED" },
              },
            },
          },
        }),
      ]);

    return {
      totalCustomers,
      newCustomers,
      activeCustomers: customersWithOrders,
      customerGrowth: 0, // Would calculate from previous period
      customerLifetimeValue: 0, // Would calculate from order data
      repeatCustomerRate: 0, // Would calculate from order data
    };
  }

  private async getProductMetrics(): Promise<DashboardMetrics["products"]> {
    const [products, inventory, topSelling] = await Promise.all([
      ProductModel.findMany({
        include: { inventory: true },
      }),
      InventoryModel.findMany(),
      // This would be a more complex query in practice
      ProductModel.findMany({
        take: 5,
        include: {
          orderItems: {
            include: { order: true },
          },
        },
      }),
    ]);

    const totalProducts = products.length;
    const activeProducts = products.filter((p) => p.isActive).length;
    const outOfStockProducts = inventory.filter((i) => i.quantity <= 0).length;
    const lowStockProducts = inventory.filter(
      (i) => i.quantity <= i.lowStockThreshold
    ).length;

    const topSellingProducts = topSelling.map((product) => ({
      id: product.id,
      name: product.name,
      quantitySold:
        product.orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0,
      revenue:
        product.orderItems?.reduce(
          (sum, item) => sum + Number(item.totalPrice),
          0
        ) || 0,
    }));

    return {
      totalProducts,
      activeProducts,
      outOfStockProducts,
      lowStockProducts,
      topSellingProducts,
    };
  }

  private async getInventoryMetrics(): Promise<DashboardMetrics["inventory"]> {
    const inventory = await InventoryModel.findMany({
      include: { product: true },
    });

    const totalValue = inventory.reduce((sum, item) => {
      return sum + item.quantity * Number(item.averageCost);
    }, 0);

    return {
      totalValue,
      turnoverRate: 0, // Would calculate from sales and inventory data
      daysOfInventory: 0, // Would calculate from turnover rate
      stockouts: inventory.filter((i) => i.quantity <= 0).length,
    };
  }

  private async getRevenueData(
    startDate?: Date,
    endDate?: Date
  ): Promise<SalesAnalytics["revenue"]> {
    // This would involve complex date grouping queries
    // For now, return placeholder structure
    return {
      daily: [],
      weekly: [],
      monthly: [],
      yearly: [],
    };
  }

  private async getSalesTrends(
    startDate?: Date,
    endDate?: Date
  ): Promise<SalesAnalytics["trends"]> {
    return {
      revenueGrowthRate: 0,
      orderGrowthRate: 0,
      averageOrderValueTrend: 0,
      seasonalPatterns: [],
    };
  }

  private async getSalesPerformance(
    startDate?: Date,
    endDate?: Date
  ): Promise<SalesAnalytics["performance"]> {
    return {
      bestSellingProducts: [],
      topCategories: [],
      topCustomers: [],
    };
  }

  private async getCustomerDemographics(): Promise<
    CustomerAnalytics["demographics"]
  > {
    return {
      ageGroups: {},
      genderDistribution: {},
      locationDistribution: {},
    };
  }

  private async getCustomerBehavior(
    startDate?: Date,
    endDate?: Date
  ): Promise<CustomerAnalytics["behavior"]> {
    return {
      averageSessionDuration: 0,
      pagesPerSession: 0,
      bounceRate: 0,
      cartAbandonmentRate: 0,
      repeatPurchaseRate: 0,
    };
  }

  private async getCustomerSegments(): Promise<CustomerAnalytics["segments"]> {
    return [];
  }

  private async getCustomerRetention(): Promise<
    CustomerAnalytics["retention"]
  > {
    return {
      churnRate: 0,
      retentionByPeriod: [],
    };
  }
}
