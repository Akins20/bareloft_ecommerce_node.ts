import { BaseService } from "../BaseService";
import { CacheService } from "../cache/CacheService";
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
        daily: Array<{
            date: string;
            amount: number;
            orders: number;
        }>;
        weekly: Array<{
            week: string;
            amount: number;
            orders: number;
        }>;
        monthly: Array<{
            month: string;
            amount: number;
            orders: number;
        }>;
        yearly: Array<{
            year: string;
            amount: number;
            orders: number;
        }>;
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
export declare class AnalyticsService extends BaseService {
    private cache;
    constructor(cacheService: CacheService);
    /**
     * Track analytics event
     */
    trackEvent(event: AnalyticsEvent): Promise<void>;
    /**
     * Get dashboard metrics
     */
    getDashboardMetrics(startDate?: Date, endDate?: Date): Promise<DashboardMetrics>;
    /**
     * Get sales analytics
     */
    getSalesAnalytics(startDate?: Date, endDate?: Date): Promise<SalesAnalytics>;
    /**
     * Get customer analytics
     */
    getCustomerAnalytics(startDate?: Date, endDate?: Date): Promise<CustomerAnalytics>;
    /**
     * Track page view
     */
    trackPageView(userId: string | undefined, page: string, referrer?: string, sessionId?: string): Promise<void>;
    /**
     * Track product view
     */
    trackProductView(userId: string | undefined, productId: string, productName: string, categoryId: string, sessionId?: string): Promise<void>;
    /**
     * Track add to cart
     */
    trackAddToCart(userId: string | undefined, productId: string, productName: string, quantity: number, price: number, sessionId?: string): Promise<void>;
    /**
     * Track purchase
     */
    trackPurchase(userId: string, orderId: string, orderTotal: number, items: Array<{
        productId: string;
        productName: string;
        quantity: number;
        price: number;
    }>): Promise<void>;
    /**
     * Track search
     */
    trackSearch(userId: string | undefined, query: string, resultsCount: number, sessionId?: string): Promise<void>;
    private storeEvent;
    private updateRealTimeMetrics;
    private getSalesMetrics;
    private getCustomerMetrics;
    private getProductMetrics;
    private getInventoryMetrics;
    private getRevenueData;
    private getSalesTrends;
    private getSalesPerformance;
    private getCustomerDemographics;
    private getCustomerBehavior;
    private getCustomerSegments;
    private getCustomerRetention;
}
//# sourceMappingURL=AnalyticsService.d.ts.map