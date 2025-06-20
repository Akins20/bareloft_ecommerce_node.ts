"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const BaseService_1 = require("../BaseService");
const models_1 = require("../../models");
const types_1 = require("../../types");
class AnalyticsService extends BaseService_1.BaseService {
    cache;
    constructor(cacheService) {
        super();
        this.cache = cacheService;
    }
    /**
     * Track analytics event
     */
    async trackEvent(event) {
        try {
            // Store event for processing
            await this.storeEvent(event);
            // Update real-time metrics if needed
            await this.updateRealTimeMetrics(event);
        }
        catch (error) {
            this.handleError("Error tracking analytics event", error);
            // Don't throw - analytics failures shouldn't break the app
        }
    }
    /**
     * Get dashboard metrics
     */
    async getDashboardMetrics(startDate, endDate) {
        try {
            const cacheKey = `dashboard:metrics:${startDate?.toISOString()}:${endDate?.toISOString()}`;
            return await this.cache.getOrSet(cacheKey, async () => {
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
            }, { ttl: types_1.CONSTANTS.CACHE_TTL.SHORT } // 5 minutes
            );
        }
        catch (error) {
            this.handleError("Error getting dashboard metrics", error);
            throw error;
        }
    }
    /**
     * Get sales analytics
     */
    async getSalesAnalytics(startDate, endDate) {
        try {
            const cacheKey = `sales:analytics:${startDate?.toISOString()}:${endDate?.toISOString()}`;
            return await this.cache.getOrSet(cacheKey, async () => {
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
            }, { ttl: types_1.CONSTANTS.CACHE_TTL.MEDIUM } // 30 minutes
            );
        }
        catch (error) {
            this.handleError("Error getting sales analytics", error);
            throw error;
        }
    }
    /**
     * Get customer analytics
     */
    async getCustomerAnalytics(startDate, endDate) {
        try {
            const cacheKey = `customer:analytics:${startDate?.toISOString()}:${endDate?.toISOString()}`;
            return await this.cache.getOrSet(cacheKey, async () => {
                const [demographics, behavior, segments, retention] = await Promise.all([
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
            }, { ttl: types_1.CONSTANTS.CACHE_TTL.LONG } // 1 hour
            );
        }
        catch (error) {
            this.handleError("Error getting customer analytics", error);
            throw error;
        }
    }
    /**
     * Track page view
     */
    async trackPageView(userId, page, referrer, sessionId) {
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
    async trackProductView(userId, productId, productName, categoryId, sessionId) {
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
    async trackAddToCart(userId, productId, productName, quantity, price, sessionId) {
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
    async trackPurchase(userId, orderId, orderTotal, items) {
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
    async trackSearch(userId, query, resultsCount, sessionId) {
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
    async storeEvent(event) {
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
        }
        catch (error) {
            this.handleError("Error storing analytics event", error);
        }
    }
    async updateRealTimeMetrics(event) {
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
                        await this.cache.increment(`metrics:revenue:${today}`, Math.round(event.properties.revenue * 100), // Store in kobo
                        86400);
                    }
                    break;
            }
        }
        catch (error) {
            this.handleError("Error updating real-time metrics", error);
        }
    }
    async getSalesMetrics(startDate, endDate) {
        const whereClause = {};
        if (startDate)
            whereClause.createdAt = { gte: startDate };
        if (endDate)
            whereClause.createdAt = { ...whereClause.createdAt, lte: endDate };
        const [orders, previousPeriodOrders] = await Promise.all([
            models_1.OrderModel.findMany({
                where: {
                    ...whereClause,
                    status: { not: "CANCELLED" },
                },
            }),
            models_1.OrderModel.findMany({
                where: {
                    status: { not: "CANCELLED" },
                    // Previous period logic would go here
                },
            }),
        ]);
        const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
        const totalOrders = orders.length;
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const previousRevenue = previousPeriodOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
        const revenueGrowth = previousRevenue > 0
            ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
            : 0;
        const ordersGrowth = previousPeriodOrders.length > 0
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
    async getCustomerMetrics(startDate, endDate) {
        const whereClause = {};
        if (startDate)
            whereClause.createdAt = { gte: startDate };
        if (endDate)
            whereClause.createdAt = { ...whereClause.createdAt, lte: endDate };
        const [totalCustomers, newCustomers, customersWithOrders] = await Promise.all([
            models_1.UserModel.count(),
            models_1.UserModel.count({ where: whereClause }),
            models_1.UserModel.count({
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
    async getProductMetrics() {
        const [products, inventory, topSelling] = await Promise.all([
            models_1.ProductModel.findMany({
                include: { inventory: true },
            }),
            models_1.InventoryModel.findMany(),
            // This would be a more complex query in practice
            models_1.ProductModel.findMany({
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
        const lowStockProducts = inventory.filter((i) => i.quantity <= i.lowStockThreshold).length;
        const topSellingProducts = topSelling.map((product) => ({
            id: product.id,
            name: product.name,
            quantitySold: product.orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0,
            revenue: product.orderItems?.reduce((sum, item) => sum + Number(item.totalPrice), 0) || 0,
        }));
        return {
            totalProducts,
            activeProducts,
            outOfStockProducts,
            lowStockProducts,
            topSellingProducts,
        };
    }
    async getInventoryMetrics() {
        const inventory = await models_1.InventoryModel.findMany({
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
    async getRevenueData(startDate, endDate) {
        // This would involve complex date grouping queries
        // For now, return placeholder structure
        return {
            daily: [],
            weekly: [],
            monthly: [],
            yearly: [],
        };
    }
    async getSalesTrends(startDate, endDate) {
        return {
            revenueGrowthRate: 0,
            orderGrowthRate: 0,
            averageOrderValueTrend: 0,
            seasonalPatterns: [],
        };
    }
    async getSalesPerformance(startDate, endDate) {
        return {
            bestSellingProducts: [],
            topCategories: [],
            topCustomers: [],
        };
    }
    async getCustomerDemographics() {
        return {
            ageGroups: {},
            genderDistribution: {},
            locationDistribution: {},
        };
    }
    async getCustomerBehavior(startDate, endDate) {
        return {
            averageSessionDuration: 0,
            pagesPerSession: 0,
            bounceRate: 0,
            cartAbandonmentRate: 0,
            repeatPurchaseRate: 0,
        };
    }
    async getCustomerSegments() {
        return [];
    }
    async getCustomerRetention() {
        return {
            churnRate: 0,
            retentionByPeriod: [],
        };
    }
}
exports.AnalyticsService = AnalyticsService;
//# sourceMappingURL=AnalyticsService.js.map