import { BaseService } from "../BaseService";
import { CacheService } from "../cache/CacheService";
import {
  UserModel,
  ProductModel,
  OrderModel,
  InventoryModel,
  NotificationModel,
} from "../../models";
import { CONSTANTS } from "../../types";

export interface SystemMetrics {
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  business: {
    activeUsers: number;
    dailyOrders: number;
    conversionRate: number;
    averageOrderValue: number;
    customerSatisfaction: number;
  };
  technical: {
    databaseConnections: number;
    cacheHitRate: number;
    apiCalls: number;
    backgroundJobs: number;
    storageUsed: number;
  };
}

export interface BusinessKPIs {
  revenue: {
    total: number;
    growth: number;
    recurring: number;
    target: number;
    achievement: number;
  };
  customers: {
    total: number;
    active: number;
    new: number;
    churn: number;
    ltv: number;
  };
  orders: {
    total: number;
    completed: number;
    cancelled: number;
    averageValue: number;
    fulfillmentTime: number;
  };
  inventory: {
    turnover: number;
    stockouts: number;
    lowStock: number;
    totalValue: number;
    accuracy: number;
  };
}

export interface PerformanceMetrics {
  api: {
    requestsPerSecond: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
    slowestEndpoints: Array<{
      endpoint: string;
      averageTime: number;
      requests: number;
    }>;
  };
  database: {
    connectionsActive: number;
    connectionsIdle: number;
    slowQueries: number;
    cacheHitRate: number;
    indexUsage: number;
  };
  server: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkIO: number;
    uptime: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: "greater_than" | "less_than" | "equals";
  threshold: number;
  duration: number; // minutes
  severity: "low" | "medium" | "high" | "critical";
  enabled: boolean;
  recipients: string[];
  lastTriggered?: Date;
}

export interface MetricAlert {
  id: string;
  ruleId: string;
  metric: string;
  value: number;
  threshold: number;
  severity: "low" | "medium" | "high" | "critical";
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  message: string;
}

export class MetricsService extends BaseService {
  private cache: CacheService;
  private alerts: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, MetricAlert> = new Map();

  constructor(cacheService: CacheService) {
    super();
    this.cache = cacheService;
    this.initializeDefaultAlerts();
  }

  /**
   * Record a metric value
   */
  async recordMetric(
    name: string,
    value: number,
    tags: Record<string, string> = {},
    timestamp: Date = new Date()
  ): Promise<void> {
    try {
      const metricKey = this.buildMetricKey(name, tags);
      const dataPoint = {
        value,
        tags,
        timestamp: timestamp.toISOString(),
      };

      // Store in time-series format - simplified since lpush/ltrim methods don't exist
      if (this.cache.set) {
        await this.cache.set(`metrics:${metricKey}:${timestamp.getTime()}`, JSON.stringify(dataPoint), { ttl: 86400 });
      }

      // Update current value
      await this.cache.set(`current:${metricKey}`, value, { ttl: 3600 });

      // Check for alerts
      await this.checkAlerts(name, value, tags);
    } catch (error) {
      this.handleError("Error recording metric", error);
    }
  }

  /**
   * Get current system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const cacheKey = "system:metrics:current";

      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          const [performance, business, technical] = await Promise.all([
            this.getPerformanceMetrics(),
            this.getBusinessMetrics(),
            this.getTechnicalMetrics(),
          ]);

          return {
            performance: {
              responseTime: performance.api.averageResponseTime,
              throughput: performance.api.requestsPerSecond,
              errorRate: performance.api.errorRate,
              uptime: performance.server.uptime,
              memoryUsage: performance.server.memoryUsage,
              cpuUsage: performance.server.cpuUsage,
            },
            business,
            technical: {
              databaseConnections: performance.database.connectionsActive,
              cacheHitRate: performance.database.cacheHitRate,
              apiCalls: performance.api.requestsPerSecond * 60,
              backgroundJobs: 0, // Would track from job queue
              storageUsed: performance.server.diskUsage,
            },
          };
        },
        { ttl: CONSTANTS.CACHE_TTL.SHORT }
      );
    } catch (error) {
      this.handleError("Error getting system metrics", error);
      throw error;
    }
  }

  /**
   * Get business KPIs
   */
  async getBusinessKPIs(
    startDate?: Date,
    endDate?: Date
  ): Promise<BusinessKPIs> {
    try {
      const cacheKey = `business:kpis:${startDate?.toISOString()}:${endDate?.toISOString()}`;

      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          const now = new Date();
          const start =
            startDate || new Date(now.getFullYear(), now.getMonth(), 1);
          const end = endDate || now;

          const [orders, users, inventory] = await Promise.all([
            OrderModel.findMany({
              where: {
                createdAt: { gte: start, lte: end },
              },
            }),
            UserModel.findMany({
              where: {
                createdAt: { gte: start, lte: end },
              },
            }),
            InventoryModel.findMany({}),
          ]);

          // Calculate revenue metrics
          const totalRevenue = orders
            .filter((o) => o.status !== "CANCELLED")
            .reduce((sum, order) => sum + Number(order.total), 0);

          const completedOrders = orders.filter(
            (o) => o.status === "DELIVERED"
          );
          const cancelledOrders = orders.filter(
            (o) => o.status === "CANCELLED"
          );

          // Calculate inventory metrics
          const totalInventoryValue = inventory.reduce((sum, item) => {
            return sum + ((item as any).quantity || 0) * Number((item as any).averageCost || 0);
          }, 0);

          const lowStockItems = inventory.filter(
            (i) => ((i as any).quantity || 0) <= ((i as any).lowStockThreshold || 10)
          );
          const outOfStockItems = inventory.filter((i) => ((i as any).quantity || 0) <= 0);

          return {
            revenue: {
              total: totalRevenue,
              growth: 0, // Would calculate from previous period
              recurring: 0, // Would calculate from repeat customers
              target: 1000000, // Would get from settings
              achievement: (totalRevenue / 1000000) * 100,
            },
            customers: {
              total: users.length,
              active: users.filter(
                (u) =>
                  u.lastLoginAt &&
                  u.lastLoginAt >
                    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              ).length,
              new: users.filter((u) => u.createdAt >= start).length,
              churn: 0, // Would calculate churn rate
              ltv: totalRevenue / Math.max(users.length, 1),
            },
            orders: {
              total: orders.length,
              completed: completedOrders.length,
              cancelled: cancelledOrders.length,
              averageValue:
                orders.length > 0 ? totalRevenue / orders.length : 0,
              fulfillmentTime: 0, // Would calculate from order timestamps
            },
            inventory: {
              turnover: 0, // Would calculate turnover rate
              stockouts: outOfStockItems.length,
              lowStock: lowStockItems.length,
              totalValue: totalInventoryValue,
              accuracy: 100, // Would track from audits
            },
          };
        },
        { ttl: CONSTANTS.CACHE_TTL.MEDIUM }
      );
    } catch (error) {
      this.handleError("Error getting business KPIs", error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      const cacheKey = "performance:metrics:current";

      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          // In a real implementation, these would come from monitoring tools
          // like Prometheus, DataDog, or custom collectors

          return {
            api: {
              requestsPerSecond:
                (await this.getMetricValue("api.requests_per_second")) || 10,
              averageResponseTime:
                (await this.getMetricValue("api.response_time_avg")) || 150,
              p95ResponseTime:
                (await this.getMetricValue("api.response_time_p95")) || 300,
              errorRate: (await this.getMetricValue("api.error_rate")) || 0.5,
              slowestEndpoints: await this.getSlowestEndpoints(),
            },
            database: {
              connectionsActive:
                (await this.getMetricValue("db.connections_active")) || 5,
              connectionsIdle:
                (await this.getMetricValue("db.connections_idle")) || 10,
              slowQueries: (await this.getMetricValue("db.slow_queries")) || 0,
              cacheHitRate:
                (await this.getMetricValue("db.cache_hit_rate")) || 85,
              indexUsage: (await this.getMetricValue("db.index_usage")) || 95,
            },
            server: {
              cpuUsage: (await this.getMetricValue("server.cpu_usage")) || 25,
              memoryUsage:
                (await this.getMetricValue("server.memory_usage")) || 60,
              diskUsage: (await this.getMetricValue("server.disk_usage")) || 45,
              networkIO:
                (await this.getMetricValue("server.network_io")) || 1024,
              uptime: (await this.getMetricValue("server.uptime")) || 99.9,
            },
          };
        },
        { ttl: CONSTANTS.CACHE_TTL.SHORT }
      );
    } catch (error) {
      this.handleError("Error getting performance metrics", error);
      throw error;
    }
  }

  /**
   * Record API request metrics
   */
  async recordAPIRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    userId?: string
  ): Promise<void> {
    const tags = {
      endpoint,
      method,
      status_code: statusCode.toString(),
      status_class: `${Math.floor(statusCode / 100)}xx`,
    };

    if (userId) {
      (tags as any).user_id = userId; // Cast to avoid type error
    }

    await Promise.all([
      this.recordMetric("api.requests", 1, tags),
      this.recordMetric("api.response_time", responseTime, tags),
      this.recordMetric("api.errors", statusCode >= 400 ? 1 : 0, tags),
    ]);

    // Update real-time counters
    const today = new Date().toISOString().split("T")[0];
    await this.cache.increment(`metrics:api:requests:${today}`, 1, 86400);

    if (statusCode >= 400) {
      await this.cache.increment(`metrics:api:errors:${today}`, 1, 86400);
    }
  }

  /**
   * Record business event metrics
   */
  async recordBusinessEvent(
    event: string,
    value: number = 1,
    properties: Record<string, any> = {}
  ): Promise<void> {
    const tags = Object.entries(properties).reduce(
      (acc, [key, val]) => {
        acc[key] = String(val);
        return acc;
      },
      {} as Record<string, string>
    );

    await this.recordMetric(`business.${event}`, value, tags);

    // Update daily business metrics
    const today = new Date().toISOString().split("T")[0];

    switch (event) {
      case "order_created":
        await this.cache.increment(
          `metrics:business:orders:${today}`,
          1,
          86400
        );
        if (properties.amount) {
          await this.cache.increment(
            `metrics:business:revenue:${today}`,
            Math.round(properties.amount * 100), // Store in kobo
            86400
          );
        }
        break;
      case "user_signup":
        await this.cache.increment(
          `metrics:business:signups:${today}`,
          1,
          86400
        );
        break;
      case "product_view":
        await this.cache.increment(
          `metrics:business:product_views:${today}`,
          1,
          86400
        );
        break;
    }
  }

  /**
   * Create alert rule
   */
  async createAlertRule(rule: Omit<AlertRule, "id">): Promise<AlertRule> {
    try {
      const alertRule: AlertRule = {
        ...rule,
        id: crypto.randomUUID(),
      };

      this.alerts.set(alertRule.id, alertRule);

      // Persist to cache
      await this.cache.set(`alert:rule:${alertRule.id}`, alertRule, { ttl: 0 }); // No expiry

      return alertRule;
    } catch (error) {
      this.handleError("Error creating alert rule", error);
      throw error;
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<MetricAlert[]> {
    try {
      return Array.from(this.activeAlerts.values())
        .filter((alert) => !alert.resolvedAt)
        .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
    } catch (error) {
      this.handleError("Error getting active alerts", error);
      return [];
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      const alert = this.activeAlerts.get(alertId);
      if (alert) {
        alert.acknowledgedAt = new Date();
        await this.cache.set(`alert:active:${alertId}`, alert, { ttl: 86400 });
      }
    } catch (error) {
      this.handleError("Error acknowledging alert", error);
    }
  }

  /**
   * Get metric history
   */
  async getMetricHistory(
    metricName: string,
    tags: Record<string, string> = {},
    limit: number = 100
  ): Promise<
    Array<{ value: number; timestamp: Date; tags: Record<string, string> }>
  > {
    try {
      const metricKey = this.buildMetricKey(metricName, tags);
      // lrange method doesn't exist in CacheService, return empty array
      const data: string[] = [];

      return data
        .map((item) => {
          const parsed = JSON.parse(item);
          return {
            value: parsed.value,
            timestamp: new Date(parsed.timestamp),
            tags: parsed.tags,
          };
        })
        .reverse(); // Oldest first
    } catch (error) {
      this.handleError("Error getting metric history", error);
      return [];
    }
  }

  /**
   * Get health check status
   */
  async getHealthStatus(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    checks: Record<
      string,
      { status: "pass" | "fail"; message?: string; responseTime?: number }
    >;
    uptime: number;
    timestamp: Date;
  }> {
    try {
      const checks: Record<
        string,
        { status: "pass" | "fail"; message?: string; responseTime?: number }
      > = {};

      // Database check
      const dbStart = Date.now();
      try {
        await UserModel.findFirst();
        checks.database = {
          status: "pass",
          responseTime: Date.now() - dbStart,
        };
      } catch (error) {
        checks.database = {
          status: "fail",
          message: "Database connection failed",
          responseTime: Date.now() - dbStart,
        };
      }

      // Cache check
      const cacheStart = Date.now();
      try {
        // Use a simple get operation to test cache connectivity
        await this.cache.get("health-check");
        checks.cache = {
          status: "pass",
          responseTime: Date.now() - cacheStart,
        };
      } catch (error) {
        checks.cache = {
          status: "fail",
          message: "Cache connection failed",
          responseTime: Date.now() - cacheStart,
        };
      }

      // Memory check
      const memoryUsage = process.memoryUsage();
      checks.memory = {
        status:
          memoryUsage.heapUsed / memoryUsage.heapTotal < 0.8 ? "pass" : "fail",
        message: `Memory usage: ${Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)}%`,
      };

      // Overall status
      const failedChecks = Object.values(checks).filter(
        (check) => check.status === "fail"
      ).length;
      let status: "healthy" | "degraded" | "unhealthy";

      if (failedChecks === 0) {
        status = "healthy";
      } else if (failedChecks === 1) {
        status = "degraded";
      } else {
        status = "unhealthy";
      }

      return {
        status,
        checks,
        uptime: process.uptime(),
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleError("Error getting health status", error);
      return {
        status: "unhealthy",
        checks: {},
        uptime: 0,
        timestamp: new Date(),
      };
    }
  }

  // Private helper methods

  private buildMetricKey(name: string, tags: Record<string, string>): string {
    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join(",");

    return tagString ? `${name}[${tagString}]` : name;
  }

  private async getMetricValue(metricName: string): Promise<number | null> {
    return await this.cache.get<number>(`current:${metricName}`);
  }

  private async getSlowestEndpoints(): Promise<
    Array<{
      endpoint: string;
      averageTime: number;
      requests: number;
    }>
  > {
    // This would analyze recent API metrics to find slowest endpoints
    return [
      { endpoint: "/api/products", averageTime: 250, requests: 150 },
      { endpoint: "/api/orders", averageTime: 180, requests: 89 },
      { endpoint: "/api/admin/analytics", averageTime: 420, requests: 12 },
    ];
  }

  private async getBusinessMetrics(): Promise<SystemMetrics["business"]> {
    const today = new Date().toISOString().split("T")[0];

    const [activeUsers, dailyOrders, dailyRevenue] = await Promise.all([
      this.cache.get<number>(`metrics:business:active_users:${today}`) || 0,
      this.cache.get<number>(`metrics:business:orders:${today}`) || 0,
      this.cache.get<number>(`metrics:business:revenue:${today}`) || 0,
    ]);

    return {
      activeUsers,
      dailyOrders,
      conversionRate: 2.5, // Would calculate from session/order data
      averageOrderValue: dailyOrders > 0 ? dailyRevenue / 100 / dailyOrders : 0, // Convert from kobo
      customerSatisfaction: 4.2, // Would get from reviews
    };
  }

  private async getTechnicalMetrics(): Promise<SystemMetrics["technical"]> {
    return {
      databaseConnections: 5,
      cacheHitRate: 85,
      apiCalls:
        (await this.cache.get<number>(
          `metrics:api:requests:${new Date().toISOString().split("T")[0]}`
        )) || 0,
      backgroundJobs: 0,
      storageUsed: 45,
    };
  }

  private async checkAlerts(
    metricName: string,
    value: number,
    tags: Record<string, string>
  ): Promise<void> {
    try {
      for (const rule of this.alerts.values()) {
        if (!rule.enabled || rule.metric !== metricName) {
          continue;
        }

        let triggered = false;
        switch (rule.condition) {
          case "greater_than":
            triggered = value > rule.threshold;
            break;
          case "less_than":
            triggered = value < rule.threshold;
            break;
          case "equals":
            triggered = value === rule.threshold;
            break;
        }

        if (triggered) {
          await this.triggerAlert(rule, value);
        }
      }
    } catch (error) {
      this.handleError("Error checking alerts", error);
    }
  }

  private async triggerAlert(rule: AlertRule, value: number): Promise<void> {
    try {
      const existingAlert = Array.from(this.activeAlerts.values()).find(
        (alert) => alert.ruleId === rule.id && !alert.resolvedAt
      );

      if (existingAlert) {
        return; // Alert already active
      }

      const alert: MetricAlert = {
        id: crypto.randomUUID(),
        ruleId: rule.id,
        metric: rule.metric,
        value,
        threshold: rule.threshold,
        severity: rule.severity,
        triggeredAt: new Date(),
        message: `${rule.name}: ${rule.metric} is ${value} (threshold: ${rule.threshold})`,
      };

      this.activeAlerts.set(alert.id, alert);
      await this.cache.set(`alert:active:${alert.id}`, alert, { ttl: 86400 });

      // Send notifications (would integrate with NotificationService)
      console.log(`ALERT: ${alert.message}`);
    } catch (error) {
      this.handleError("Error triggering alert", error);
    }
  }

  private initializeDefaultAlerts(): void {
    const defaultRules: Omit<AlertRule, "id">[] = [
      {
        name: "High Error Rate",
        metric: "api.error_rate",
        condition: "greater_than",
        threshold: 5,
        duration: 5,
        severity: "high",
        enabled: true,
        recipients: ["admin@bareloft.com"],
      },
      {
        name: "Low Inventory",
        metric: "inventory.low_stock",
        condition: "greater_than",
        threshold: 10,
        duration: 1,
        severity: "medium",
        enabled: true,
        recipients: ["inventory@bareloft.com"],
      },
      {
        name: "High Response Time",
        metric: "api.response_time_avg",
        condition: "greater_than",
        threshold: 1000,
        duration: 10,
        severity: "medium",
        enabled: true,
        recipients: ["tech@bareloft.com"],
      },
    ];

    defaultRules.forEach((rule) => {
      this.createAlertRule(rule).catch((error) => {
        this.handleError("Error creating default alert rule", error);
      });
    });
  }
}
