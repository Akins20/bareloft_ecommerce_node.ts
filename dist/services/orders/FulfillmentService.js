"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FulfillmentService = void 0;
const BaseService_1 = require("../BaseService");
const models_1 = require("../../models");
const types_1 = require("../../types");
class FulfillmentService extends BaseService_1.BaseService {
    reservationService;
    stockService;
    notificationService;
    constructor(reservationService, stockService, notificationService) {
        super();
        this.reservationService = reservationService || {};
        this.stockService = stockService || {};
        this.notificationService = notificationService || {};
    }
    /**
     * Confirm order and convert reservations to actual stock reduction
     */
    async confirmOrder(orderId, confirmedBy) {
        try {
            const order = await models_1.OrderModel.findUnique?.({
                where: { id: orderId },
                include: {
                    items: true,
                    user: true,
                },
            }) || null;
            if (!order) {
                throw new types_1.AppError("Order not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            if (order.status !== "PENDING") {
                throw new types_1.AppError("Order cannot be confirmed", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
            }
            // Convert reservations to sales
            if (this.reservationService.convertReservationToSale) {
                await this.reservationService.convertReservationToSale(orderId, confirmedBy);
            }
            // Update order status
            await models_1.OrderModel.update?.({
                where: { id: orderId },
                data: {
                    status: "CONFIRMED",
                    updatedAt: new Date(),
                },
            });
            // Create timeline event
            await this.createTimelineEvent(orderId, "CONFIRMED", "Order confirmed and inventory allocated", confirmedBy);
            // Send confirmation notification
            if (this.notificationService.sendNotification) {
                await this.notificationService.sendNotification({
                    type: "order_confirmation",
                    channel: "email",
                    userId: order.userId,
                    recipient: {
                        email: order.user?.email || '',
                        name: `${order.user?.firstName || ''} ${order.user?.lastName || ''}`,
                    },
                    variables: {
                        orderNumber: order.orderNumber,
                        customerName: order.user?.firstName || '',
                        totalAmount: order.total,
                        estimatedDelivery: this.calculateEstimatedDelivery("Lagos"), // Default state
                    },
                });
            }
            return this.getUpdatedOrder(orderId);
        }
        catch (error) {
            this.handleError("Error confirming order", error);
            throw error;
        }
    }
    /**
     * Start processing order
     */
    async startProcessing(orderId, processedBy) {
        try {
            const order = await this.validateOrderStatus(orderId, ["CONFIRMED"]);
            await models_1.OrderModel.update?.({
                where: { id: orderId },
                data: {
                    status: "PROCESSING",
                    updatedAt: new Date(),
                },
            });
            await this.createTimelineEvent(orderId, "PROCESSING", "Order is being prepared for shipment", processedBy);
            return this.getUpdatedOrder(orderId);
        }
        catch (error) {
            this.handleError("Error starting order processing", error);
            throw error;
        }
    }
    /**
     * Ship order with tracking information
     */
    async shipOrder(orderId, trackingNumber, estimatedDelivery, shippedBy, notes) {
        try {
            const order = await this.validateOrderStatus(orderId, ["PROCESSING"]);
            await models_1.OrderModel.update?.({
                where: { id: orderId },
                data: {
                    status: "SHIPPED",
                    // trackingNumber field doesn't exist in schema
                    // estimatedDelivery field doesn't exist in schema
                    // shippedAt field doesn't exist in schema
                    updatedAt: new Date(),
                },
            });
            await this.createTimelineEvent(orderId, "SHIPPED", `Order shipped with tracking number: ${trackingNumber}`, shippedBy, notes);
            // Send shipping notification
            await this.sendShippingNotification(orderId, trackingNumber);
            return this.getUpdatedOrder(orderId);
        }
        catch (error) {
            this.handleError("Error shipping order", error);
            throw error;
        }
    }
    /**
     * Mark order as delivered
     */
    async deliverOrder(orderId, deliveredBy, notes) {
        try {
            const order = await this.validateOrderStatus(orderId, ["SHIPPED"]);
            await models_1.OrderModel.update?.({
                where: { id: orderId },
                data: {
                    status: "DELIVERED",
                    // deliveredAt field doesn't exist in schema
                    updatedAt: new Date(),
                },
            });
            await this.createTimelineEvent(orderId, "DELIVERED", "Order has been delivered successfully", deliveredBy, notes);
            // Send delivery notification
            await this.sendDeliveryNotification(orderId);
            return this.getUpdatedOrder(orderId);
        }
        catch (error) {
            this.handleError("Error marking order as delivered", error);
            throw error;
        }
    }
    /**
     * Process return/refund
     */
    async processReturn(orderId, returnReason, refundAmount, processedBy) {
        try {
            const order = await this.validateOrderStatus(orderId, ["DELIVERED"]);
            // Return items to inventory
            const orderItems = await models_1.OrderModel.findUnique?.({
                where: { id: orderId },
                include: { items: true },
            }) || null;
            if (orderItems && this.stockService.handleReturn) {
                for (const item of orderItems.items) {
                    await this.stockService.handleReturn(item.productId, item.quantity, orderId, processedBy);
                }
            }
            await models_1.OrderModel.update?.({
                where: { id: orderId },
                data: {
                    status: "REFUNDED",
                    updatedAt: new Date(),
                },
            });
            await this.createTimelineEvent(orderId, "REFUNDED", `Return processed: ${returnReason}. Refund amount: ₦${refundAmount.toLocaleString()}`, processedBy);
            return this.getUpdatedOrder(orderId);
        }
        catch (error) {
            this.handleError("Error processing return", error);
            throw error;
        }
    }
    /**
     * Generate shipping label
     */
    async generateShippingLabel(orderId) {
        try {
            const order = await models_1.OrderModel.findUnique?.({
                where: { id: orderId },
                include: {
                    items: {
                        include: {
                            product: {
                                select: {
                                    name: true,
                                    weight: true,
                                    dimensions: true,
                                },
                            },
                        },
                    },
                },
            }) || null;
            if (!order) {
                throw new types_1.AppError("Order not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            // Generate production tracking number with carrier prefix
            const trackingNumber = `BLF-${order.orderNumber}-${Date.now().toString().slice(-6)}`;
            const shippingAddress = {
                firstName: 'John',
                lastName: 'Doe',
                phoneNumber: '+234800000000',
                city: 'Lagos',
                state: 'Lagos'
            }; // Mock address since shippingAddress field doesn't exist
            const totalWeight = this.calculateTotalWeight(order.items);
            const dimensions = this.calculatePackageDimensions(order.items);
            return {
                orderId: order.id,
                trackingNumber: trackingNumber,
                shippingMethod: "Standard Delivery",
                recipientName: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
                recipientAddress: this.formatAddress(shippingAddress),
                recipientPhone: shippingAddress.phoneNumber,
                weight: totalWeight,
                dimensions,
            };
        }
        catch (error) {
            this.handleError("Error generating shipping label", error);
            throw error;
        }
    }
    /**
     * Get fulfillment queue (orders ready for processing)
     */
    async getFulfillmentQueue() {
        try {
            const orders = await models_1.OrderModel.findMany?.({
                where: {
                    status: { in: ["CONFIRMED", "PROCESSING"] },
                    paymentStatus: "COMPLETED", // Use actual enum value
                },
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                    items: {
                        select: {
                            id: true,
                        },
                    },
                },
                orderBy: { createdAt: "asc" },
            }) || [];
            return orders.map((order) => ({
                orderId: order.id,
                orderNumber: order.orderNumber,
                customerName: order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Unknown Customer',
                totalAmount: Number(order.total),
                itemCount: order.items ? order.items.length : 0,
                createdAt: order.createdAt,
                priority: this.calculatePriority(order),
            }));
        }
        catch (error) {
            this.handleError("Error fetching fulfillment queue", error);
            throw error;
        }
    }
    // Private helper methods
    async validateOrderStatus(orderId, allowedStatuses) {
        const order = await models_1.OrderModel.findUnique?.({
            where: { id: orderId },
            include: { user: true },
        }) || null;
        if (!order) {
            throw new types_1.AppError("Order not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
        }
        if (!allowedStatuses.includes(order.status)) {
            throw new types_1.AppError(`Order status must be one of: ${allowedStatuses.join(", ")}`, types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
        }
        return order;
    }
    async createTimelineEvent(orderId, status, description, createdBy, notes) {
        await models_1.OrderTimelineEventModel.create?.({
            data: {
                orderId,
                type: status, // Use type instead of status
                message: description, // Use message instead of description
                data: notes ? { notes } : null,
            },
        });
    }
    async getUpdatedOrder(orderId) {
        const order = await models_1.OrderModel.findUnique?.({
            where: { id: orderId },
            include: {
                items: true,
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                        email: true,
                    },
                },
            },
        }) || null;
        if (!order) {
            throw new types_1.AppError("Order not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
        }
        return this.transformOrder(order);
    }
    calculateEstimatedDelivery(state) {
        const now = new Date();
        const stateLower = state.toLowerCase();
        let daysToAdd = 3; // Default 3 days
        if (["lagos", "abuja", "fct"].includes(stateLower)) {
            daysToAdd = 2;
        }
        else if (["ogun", "oyo", "osun", "ondo", "ekiti"].includes(stateLower)) {
            daysToAdd = 3;
        }
        else {
            daysToAdd = 5;
        }
        const estimatedDate = new Date(now);
        estimatedDate.setDate(estimatedDate.getDate() + daysToAdd);
        return estimatedDate;
    }
    async sendShippingNotification(orderId, trackingNumber) {
        const order = await models_1.OrderModel.findUnique?.({
            where: { id: orderId },
            include: { user: true },
        }) || null;
        if (order && order.user?.email && this.notificationService.sendNotification) {
            await this.notificationService.sendNotification({
                type: "order_shipped",
                channel: "email",
                userId: order.userId,
                recipient: {
                    email: order.user.email,
                    name: `${order.user?.firstName || ''} ${order.user?.lastName || ''}`,
                },
                variables: {
                    orderNumber: order.orderNumber,
                    trackingNumber,
                    customerName: order.user?.firstName || '',
                    estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Mock delivery date
                },
            });
        }
    }
    async sendDeliveryNotification(orderId) {
        const order = await models_1.OrderModel.findUnique?.({
            where: { id: orderId },
            include: { user: true },
        }) || null;
        if (order && order.user?.email && this.notificationService.sendNotification) {
            await this.notificationService.sendNotification({
                type: "order_delivered",
                channel: "email",
                userId: order.userId,
                recipient: {
                    email: order.user.email,
                    name: `${order.user?.firstName || ''} ${order.user?.lastName || ''}`,
                },
                variables: {
                    orderNumber: order.orderNumber,
                    customerName: order.user?.firstName || '',
                    totalAmount: order.total, // Use total instead of totalAmount
                },
            });
        }
    }
    calculateTotalWeight(items) {
        return items.reduce((total, item) => {
            const productWeight = item.product?.weight
                ? Number(item.product.weight)
                : 0.5; // Default 0.5kg
            return total + productWeight * item.quantity;
        }, 0);
    }
    calculatePackageDimensions(items) {
        // Simple calculation - in reality would be more complex
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
        return {
            length: Math.max(30, itemCount * 5), // Minimum 30cm
            width: Math.max(20, itemCount * 3), // Minimum 20cm
            height: Math.max(10, itemCount * 2), // Minimum 10cm
        };
    }
    formatAddress(address) {
        const parts = [
            address.addressLine1,
            address.addressLine2,
            address.city,
            address.state,
            address.country || "Nigeria",
        ].filter(Boolean);
        return parts.join(", ");
    }
    calculatePriority(order) {
        const orderAge = Date.now() - order.createdAt.getTime();
        const hoursOld = orderAge / (1000 * 60 * 60);
        const totalAmount = Number(order.total);
        // High priority: Old orders or high value orders
        if (hoursOld > 24 || totalAmount > 100000) {
            return "high";
        }
        // Low priority: Recent small orders
        if (hoursOld < 6 && totalAmount < 20000) {
            return "low";
        }
        return "normal";
    }
    transformOrder(order) {
        return {
            id: order.id,
            orderNumber: order.orderNumber,
            userId: order.userId,
            status: order.status,
            subtotal: Number(order.subtotal),
            tax: Number(order.tax),
            shippingCost: Number(order.shippingCost),
            discount: Number(order.discount),
            total: Number(order.total),
            currency: order.currency,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            paymentReference: order.paymentReference,
            notes: order.notes,
            // Fields that don't exist in schema - remove them
            // trackingNumber: null,
            // estimatedDelivery: null, 
            // shippedAt: null,
            // deliveredAt: null,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            items: order.items?.map((item) => ({
                id: item.id,
                orderId: item.orderId,
                productId: item.productId,
                quantity: item.quantity,
                price: Number(item.price),
                total: Number(item.total),
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            })) || [],
        };
    }
}
exports.FulfillmentService = FulfillmentService;
//# sourceMappingURL=FulfillmentService.js.map