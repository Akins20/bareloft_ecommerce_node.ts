"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingService = void 0;
const BaseService_1 = require("../BaseService");
const models_1 = require("../../models");
const types_1 = require("../../types");
class TrackingService extends BaseService_1.BaseService {
    cacheService;
    constructor(cacheService) {
        super();
        this.cacheService = cacheService;
    }
    /**
     * Track order by order number or tracking number
     */
    async trackOrder(identifier) {
        try {
            const cacheKey = `tracking:${identifier}`;
            const cached = await this.cacheService.get(cacheKey);
            if (cached)
                return cached;
            // Find order by order number or tracking number
            const order = await models_1.OrderModel.findFirst({
                where: {
                    OR: [{ orderNumber: identifier }, { trackingNumber: identifier }],
                },
                include: {
                    items: {
                        take: 1, // Just to get item count
                        select: { id: true },
                    },
                },
            });
            if (!order) {
                throw new types_1.AppError("Order not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            // Get timeline events
            const timeline = await this.getOrderTimeline(order.id);
            // Calculate delivery progress
            const deliveryProgress = this.calculateDeliveryProgress(order.status);
            const trackingInfo = {
                orderId: order.id,
                orderNumber: order.orderNumber,
                status: order.status,
                trackingNumber: order.trackingNumber,
                estimatedDelivery: order.estimatedDelivery,
                currentLocation: this.getCurrentLocation(order.status, order.shippingAddress),
                timeline,
                deliveryProgress,
            };
            // Cache for 10 minutes
            await this.cacheService.set(cacheKey, trackingInfo, 600);
            return trackingInfo;
        }
        catch (error) {
            this.handleError("Error tracking order", error);
            throw error;
        }
    }
    /**
     * Track multiple orders for a user
     */
    async trackUserOrders(userId) {
        try {
            const orders = await models_1.OrderModel.findMany({
                where: {
                    userId,
                    status: {
                        in: ["CONFIRMED", "PROCESSING", "SHIPPED"],
                    },
                },
                orderBy: { createdAt: "desc" },
            });
            const trackingInfos = [];
            for (const order of orders) {
                try {
                    const tracking = await this.trackOrder(order.orderNumber);
                    trackingInfos.push(tracking);
                }
                catch (error) {
                    // Skip orders that can't be tracked
                    continue;
                }
            }
            return trackingInfos;
        }
        catch (error) {
            this.handleError("Error tracking user orders", error);
            throw error;
        }
    }
    /**
     * Update delivery status (for logistics partners)
     */
    async updateDeliveryStatus(update) {
        try {
            // Find order by tracking number
            const order = await models_1.OrderModel.findFirst({
                where: { trackingNumber: update.trackingNumber },
            });
            if (!order) {
                throw new types_1.AppError("Order not found with tracking number", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            // Update order status if it's progressing forward
            const shouldUpdateOrder = this.shouldUpdateOrderStatus(order.status, update.status);
            if (shouldUpdateOrder) {
                await models_1.OrderModel.update({
                    where: { id: order.id },
                    data: {
                        status: update.status,
                        deliveredAt: update.status === "DELIVERED"
                            ? update.timestamp
                            : order.deliveredAt,
                        updatedAt: new Date(),
                    },
                });
            }
            // Create timeline event
            await models_1.OrderTimelineEventModel.create({
                data: {
                    orderId: order.id,
                    status: update.status,
                    description: `${update.description} - Location: ${update.location}`,
                    createdBy: update.updatedBy,
                    createdAt: update.timestamp,
                },
            });
            // Clear cache
            await this.clearTrackingCache(order.orderNumber, order.trackingNumber);
        }
        catch (error) {
            this.handleError("Error updating delivery status", error);
            throw error;
        }
    }
    /**
     * Get estimated delivery time
     */
    async getEstimatedDelivery(orderId, shippingState) {
        try {
            const order = await models_1.OrderModel.findUnique({
                where: { id: orderId },
                select: {
                    createdAt: true,
                    shippedAt: true,
                    status: true,
                },
            });
            if (!order) {
                throw new types_1.AppError("Order not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            const estimatedDays = this.getDeliveryDays(shippingState, order.status);
            const baseDate = order.shippedAt || order.createdAt;
            const estimatedDate = new Date(baseDate);
            estimatedDate.setDate(estimatedDate.getDate() + estimatedDays);
            // Skip weekends for delivery
            while (estimatedDate.getDay() === 0 || estimatedDate.getDay() === 6) {
                estimatedDate.setDate(estimatedDate.getDate() + 1);
            }
            const deliveryWindow = this.getDeliveryWindow(shippingState);
            return {
                estimatedDate,
                estimatedDays,
                deliveryWindow,
            };
        }
        catch (error) {
            this.handleError("Error calculating estimated delivery", error);
            throw error;
        }
    }
    /**
     * Check for delayed orders
     */
    async getDelayedOrders() {
        try {
            const now = new Date();
            const delayedOrders = await models_1.OrderModel.findMany({
                where: {
                    status: { in: ["PROCESSING", "SHIPPED"] },
                    estimatedDelivery: { lt: now },
                },
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
            });
            return delayedOrders.map((order) => {
                const daysOverdue = Math.floor((now.getTime() - order.estimatedDelivery.getTime()) /
                    (1000 * 60 * 60 * 24));
                return {
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                    customerName: `${order.user.firstName} ${order.user.lastName}`,
                    trackingNumber: order.trackingNumber,
                    estimatedDelivery: order.estimatedDelivery,
                    daysOverdue,
                    status: order.status,
                };
            });
        }
        catch (error) {
            this.handleError("Error fetching delayed orders", error);
            throw error;
        }
    }
    /**
     * Generate tracking URL for external tracking
     */
    generateTrackingUrl(trackingNumber) {
        // In production, this would generate URLs for actual logistics partners
        return `https://track.bareloft.com/${trackingNumber}`;
    }
    // Private helper methods
    async getOrderTimeline(orderId) {
        const events = await models_1.OrderTimelineEventModel.findMany({
            where: { orderId },
            orderBy: { createdAt: "asc" },
        });
        return events.map((event) => ({
            status: event.status,
            description: event.description,
            timestamp: event.createdAt,
            location: this.extractLocationFromDescription(event.description),
        }));
    }
    calculateDeliveryProgress(status) {
        const steps = {
            PENDING: {
                percentage: 10,
                current: "Order Placed",
                next: "Order Confirmation",
            },
            CONFIRMED: {
                percentage: 25,
                current: "Order Confirmed",
                next: "Preparing for Shipment",
            },
            PROCESSING: {
                percentage: 50,
                current: "Preparing for Shipment",
                next: "Shipped",
            },
            SHIPPED: {
                percentage: 75,
                current: "In Transit",
                next: "Out for Delivery",
            },
            DELIVERED: { percentage: 100, current: "Delivered", next: undefined },
            CANCELLED: { percentage: 0, current: "Cancelled", next: undefined },
            REFUNDED: { percentage: 0, current: "Refunded", next: undefined },
        };
        const step = steps[status] || steps["PENDING"];
        return {
            percentage: step.percentage,
            currentStep: step.current,
            nextStep: step.next,
        };
    }
    getCurrentLocation(status, shippingAddress) {
        const address = shippingAddress;
        switch (status) {
            case "PENDING":
            case "CONFIRMED":
                return "Bareloft Warehouse, Lagos";
            case "PROCESSING":
                return "Bareloft Fulfillment Center";
            case "SHIPPED":
                return `In transit to ${address.city}, ${address.state}`;
            case "DELIVERED":
                return `Delivered to ${address.city}, ${address.state}`;
            default:
                return "Unknown";
        }
    }
    getDeliveryDays(state, currentStatus) {
        const stateLower = state.toLowerCase();
        // Base delivery days by state
        let baseDays = 3;
        if (["lagos", "abuja", "fct"].includes(stateLower)) {
            baseDays = 2;
        }
        else if (["ogun", "oyo", "osun", "ondo", "ekiti"].includes(stateLower)) {
            baseDays = 3;
        }
        else {
            baseDays = 5;
        }
        // Adjust based on current status
        switch (currentStatus) {
            case "SHIPPED":
                return Math.max(1, baseDays - 1); // Reduce by 1 day if already shipped
            case "PROCESSING":
                return baseDays;
            default:
                return baseDays + 1; // Add 1 day for processing
        }
    }
    getDeliveryWindow(state) {
        const stateLower = state.toLowerCase();
        if (["lagos", "abuja", "fct"].includes(stateLower)) {
            return "9:00 AM - 6:00 PM";
        }
        else {
            return "10:00 AM - 5:00 PM";
        }
    }
    shouldUpdateOrderStatus(currentStatus, newStatus) {
        const statusOrder = [
            "PENDING",
            "CONFIRMED",
            "PROCESSING",
            "SHIPPED",
            "DELIVERED",
        ];
        const currentIndex = statusOrder.indexOf(currentStatus);
        const newIndex = statusOrder.indexOf(newStatus);
        // Only update if new status is further along in the process
        return newIndex > currentIndex;
    }
    extractLocationFromDescription(description) {
        // Simple regex to extract location from description
        const locationMatch = description.match(/Location:\s*([^-]+)/);
        return locationMatch ? locationMatch[1].trim() : undefined;
    }
    async clearTrackingCache(orderNumber, trackingNumber) {
        const cacheKeys = [`tracking:${orderNumber}`];
        if (trackingNumber) {
            cacheKeys.push(`tracking:${trackingNumber}`);
        }
        await Promise.all(cacheKeys.map((key) => this.cacheService.delete(key)));
    }
}
exports.TrackingService = TrackingService;
//# sourceMappingURL=TrackingService.js.map