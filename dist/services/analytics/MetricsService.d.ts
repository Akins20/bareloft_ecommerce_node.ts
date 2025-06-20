import { BaseService } from "../BaseService";
import { CacheService } from "../cache/CacheService";
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
    duration: number;
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
export declare class MetricsService extends BaseService {
    private cache;
    private alerts;
    private activeAlerts;
    constructor(cacheService: CacheService);
    /**
     * Record a metric value
     */
    recordMetric(name: string, value: number, tags?: Record<string, string>, timestamp?: Date): Promise<void>;
    /**
     * Get current system metrics
     */
    getSystemMetrics(): Promise<SystemMetrics>;
    /**
     * Get business KPIs
     */
    getBusinessKPIs(startDate?: Date, endDate?: Date): Promise<BusinessKPIs>;
    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): Promise<PerformanceMetrics>;
    /**
     * Record API request metrics
     */
    recordAPIRequest(endpoint: string, method: string, statusCode: number, responseTime: number, userId?: string): Promise<void>;
    /**
     * Record business event metrics
     */
    recordBusinessEvent(event: string, value?: number, properties?: Record<string, any>): Promise<void>;
    /**
     * Create alert rule
     */
    createAlertRule(rule: Omit<AlertRule, "id">): Promise<AlertRule>;
    /**
     * Get active alerts
     */
    getActiveAlerts(): Promise<MetricAlert[]>;
    /**
     * Acknowledge alert
     */
    acknowledgeAlert(alertId: string): Promise<void>;
    /**
     * Get metric history
     */
    getMetricHistory(metricName: string, tags?: Record<string, string>, limit?: number): Promise<Array<{
        value: number;
        timestamp: Date;
        tags: Record<string, string>;
    }>>;
    /**
     * Get health check status
     */
    getHealthStatus(): Promise<{
        status: "healthy" | "degraded" | "unhealthy";
        checks: Record<string, {
            status: "pass" | "fail";
            message?: string;
            responseTime?: number;
        }>;
        uptime: number;
        timestamp: Date;
    }>;
    private buildMetricKey;
    private getMetricValue;
    private getSlowestEndpoints;
    private getBusinessMetrics;
    private getTechnicalMetrics;
    private checkAlerts;
    private triggerAlert;
    private initializeDefaultAlerts;
}
//# sourceMappingURL=MetricsService.d.ts.map