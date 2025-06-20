"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const BaseService_1 = require("../BaseService");
const models_1 = require("../../models");
const types_1 = require("../../types");
class OrderService extends BaseService_1.BaseService {
    cacheService;
    constructor(cacheService) {
        super();
        this.cacheService = cacheService;
    }
    /**
     * Create a new order
     */
    async createOrder(userId, request, cartItems) {
        try {
            // Generate order number
            const orderNumber = await this.generateOrderNumber();
            // Calculate totals
            const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
            const shippingAmount = this.calculateShippingAmount(subtotal);
            const taxAmount = this.calculateTaxAmount(subtotal);
            const totalAmount = subtotal + shippingAmount + taxAmount;
            // Create order
            const order = await models_1.OrderModel.create({
                data: {
                    orderNumber,
                    userId,
                    status: "PENDING",
                    subtotal,
                    taxAmount,
                    shippingAmount,
                    discountAmount: 0,
                    totalAmount,
                    currency: "NGN",
                    paymentStatus: "PENDING",
                    paymentMethod: request.paymentMethod,
                    shippingAddress: request.shippingAddress,
                    billingAddress: request.billingAddress || request.shippingAddress,
                    customerNotes: request.customerNotes,
                },
            });
            // Create order items
            for (const item of cartItems) {
                await models_1.OrderItemModel.create({
                    data: {
                        orderId: order.id,
                        productId: item.productId,
                        productName: item.productName,
                        productSku: item.productSku,
                        productImage: item.productImage,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice,
                    },
                });
            }
            // Create timeline event
            await this.createTimelineEvent(order.id, "PENDING", "Order created and pending payment", userId);
            return this.getOrderById(order.id);
        }
        catch (error) {
            this.handleError("Error creating order", error);
            throw error;
        }
    }
    /**
     * Get order by ID
     */
    async getOrderById(orderId) {
        try {
            const order = await models_1.OrderModel.findUnique({
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
            });
            if (!order) {
                throw new types_1.AppError("Order not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            return this.transformOrder(order);
        }
        catch (error) {
            this.handleError("Error fetching order", error);
            throw error;
        }
    }
    /**
     * Get orders list with filtering
     */
    async getOrders(query = {}) {
        try {
            const { page = 1, limit = 20, status, paymentStatus, startDate, endDate, search, sortBy = "createdAt", sortOrder = "desc", } = query;
            // Build where clause
            const where = {};
            if (status)
                where.status = status;
            if (paymentStatus)
                where.paymentStatus = paymentStatus;
            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate)
                    where.createdAt.gte = new Date(startDate);
                if (endDate)
                    where.createdAt.lte = new Date(endDate);
            }
            if (search) {
                where.OR = [
                    { orderNumber: { contains: search, mode: "insensitive" } },
                    {
                        user: {
                            OR: [
                                { firstName: { contains: search, mode: "insensitive" } },
                                { lastName: { contains: search, mode: "insensitive" } },
                                { phoneNumber: { contains: search, mode: "insensitive" } },
                            ],
                        },
                    },
                ];
            }
            // Build order clause
            const orderBy = {};
            orderBy[sortBy] = sortOrder;
            // Execute queries
            const [orders, total] = await Promise.all([
                models_1.OrderModel.findMany({
                    where,
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                phoneNumber: true,
                            },
                        },
                        items: {
                            take: 1, // Just count
                        },
                    },
                    orderBy,
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                models_1.OrderModel.count({ where }),
            ]);
            const pagination = this.createPagination(page, limit, total);
            return {
                orders: orders.map(this.transformOrderSummary),
                pagination,
            };
        }
        catch (error) {
            this.handleError("Error fetching orders", error);
            throw error;
        }
    }
    /**
     * Get user orders
     */
    async getUserOrders(userId, page = 1, limit = 10) {
        try {
            const [orders, total] = await Promise.all([
                models_1.OrderModel.findMany({
                    where: { userId },
                    include: {
                        items: {
                            take: 3, // Show few items for summary
                        },
                    },
                    orderBy: { createdAt: "desc" },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                models_1.OrderModel.count({ where: { userId } }),
            ]);
            const pagination = this.createPagination(page, limit, total);
            return {
                orders: orders.map(this.transformOrder),
                pagination,
            };
        }
        catch (error) {
            this.handleError("Error fetching user orders", error);
            throw error;
        }
    }
    /**
     * Update order status
     */
    async updateOrderStatus(orderId, request, updatedBy) {
        try {
            const order = await models_1.OrderModel.findUnique({
                where: { id: orderId },
            });
            if (!order) {
                throw new types_1.AppError("Order not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            // Update order
            const updatedOrder = await models_1.OrderModel.update({
                where: { id: orderId },
                data: {
                    status: request.status,
                    adminNotes: request.adminNotes,
                    trackingNumber: request.trackingNumber,
                    estimatedDelivery: request.estimatedDelivery
                        ? new Date(request.estimatedDelivery)
                        : undefined,
                    shippedAt: request.status === "SHIPPED" ? new Date() : order.shippedAt,
                    deliveredAt: request.status === "DELIVERED" ? new Date() : order.deliveredAt,
                    updatedAt: new Date(),
                },
            });
            // Create timeline event
            await this.createTimelineEvent(orderId, request.status, this.getStatusDescription(request.status), updatedBy, request.adminNotes);
            // Clear cache
            await this.clearOrderCache(orderId);
            return this.getOrderById(orderId);
        }
        catch (error) {
            this.handleError("Error updating order status", error);
            throw error;
        }
    }
    /**
     * Cancel order
     */
    async cancelOrder(orderId, reason, cancelledBy) {
        try {
            const order = await models_1.OrderModel.findUnique({
                where: { id: orderId },
            });
            if (!order) {
                throw new types_1.AppError("Order not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            if (order.status === "DELIVERED" || order.status === "CANCELLED") {
                throw new types_1.AppError("Cannot cancel this order", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.ORDER_CANNOT_BE_CANCELLED);
            }
            // Update order status
            await models_1.OrderModel.update({
                where: { id: orderId },
                data: {
                    status: "CANCELLED",
                    adminNotes: reason,
                    updatedAt: new Date(),
                },
            });
            // Create timeline event
            await this.createTimelineEvent(orderId, "CANCELLED", `Order cancelled: ${reason}`, cancelledBy);
            return this.getOrderById(orderId);
        }
        catch (error) {
            this.handleError("Error cancelling order", error);
            throw error;
        }
    }
    /**
     * Get order timeline
     */
    async getOrderTimeline(orderId) {
        try {
            const timeline = await models_1.OrderTimelineEventModel.findMany({
                where: { orderId },
                orderBy: { createdAt: "asc" },
            });
            return timeline.map((event) => ({
                id: event.id,
                status: event.status,
                description: event.description,
                notes: event.notes,
                createdBy: event.createdBy,
                createdAt: event.createdAt,
            }));
        }
        catch (error) {
            this.handleError("Error fetching order timeline", error);
            throw error;
        }
    }
    // Private helper methods
    async generateOrderNumber() {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const day = now.getDate().toString().padStart(2, "0");
        // Get count of orders today
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const todayCount = await models_1.OrderModel.count({
            where: {
                createdAt: {
                    gte: today,
                    lt: tomorrow,
                },
            },
        });
        const sequence = (todayCount + 1).toString().padStart(3, "0");
        return `BL${year}${month}${day}${sequence}`;
    }
    calculateShippingAmount(subtotal) {
        // Free shipping for orders over ₦50,000
        if (subtotal >= 50000) {
            return 0;
        }
        return 2500; // Default shipping fee
    }
    calculateTaxAmount(subtotal) {
        // 7.5% VAT
        return Math.round(subtotal * 0.075);
    }
    async createTimelineEvent(orderId, status, description, createdBy, notes) {
        await models_1.OrderTimelineEventModel.create({
            data: {
                orderId,
                status,
                description,
                notes,
                createdBy,
            },
        });
    }
    getStatusDescription(status) {
        const descriptions = {
            PENDING: "Order placed and awaiting confirmation",
            CONFIRMED: "Order confirmed and being prepared",
            PROCESSING: "Order is being processed",
            SHIPPED: "Order has been shipped",
            DELIVERED: "Order has been delivered",
            CANCELLED: "Order has been cancelled",
            REFUNDED: "Order has been refunded",
        };
        return descriptions[status] || `Order status updated to ${status}`;
    }
    async clearOrderCache(orderId) {
        await Promise.all([
            this.cacheService.delete(`order:${orderId}`),
            this.cacheService.deletePattern("orders:*"),
            this.cacheService.deletePattern("user-orders:*"),
        ]);
    }
    transformOrder(order) {
        return {
            id: order.id,
            orderNumber: order.orderNumber,
            userId: order.userId,
            status: order.status,
            subtotal: Number(order.subtotal),
            taxAmount: Number(order.taxAmount),
            shippingAmount: Number(order.shippingAmount),
            discountAmount: Number(order.discountAmount),
            totalAmount: Number(order.totalAmount),
            currency: order.currency,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            paymentReference: order.paymentReference,
            shippingAddress: order.shippingAddress,
            billingAddress: order.billingAddress,
            customerNotes: order.customerNotes,
            adminNotes: order.adminNotes,
            trackingNumber: order.trackingNumber,
            estimatedDelivery: order.estimatedDelivery,
            paidAt: order.paidAt,
            shippedAt: order.shippedAt,
            deliveredAt: order.deliveredAt,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            items: order.items?.map((item) => ({
                id: item.id,
                orderId: item.orderId,
                productId: item.productId,
                productName: item.productName,
                productSku: item.productSku,
                productImage: item.productImage,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
                totalPrice: Number(item.totalPrice),
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            })) || [],
        };
    }
    transformOrderSummary(order) {
        return {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            totalAmount: Number(order.totalAmount),
            currency: order.currency,
            itemCount: order.items?.length || 0,
            customerName: `${order.user?.firstName} ${order.user?.lastName}`,
            customerPhone: order.user?.phoneNumber,
            createdAt: order.createdAt,
            estimatedDelivery: order.estimatedDelivery,
        };
    }
}
exports.OrderService = OrderService;
//# sourceMappingURL=OrderService.js.map