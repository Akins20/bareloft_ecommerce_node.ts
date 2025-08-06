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
                    tax: taxAmount,
                    shippingCost: shippingAmount,
                    discount: 0,
                    total: totalAmount,
                    currency: "NGN",
                    paymentStatus: "PENDING",
                    paymentMethod: request.paymentMethod?.toString(),
                    notes: request.customerNotes,
                },
            });
            // Create order items
            for (const item of cartItems) {
                await models_1.OrderItemModel.create({
                    data: {
                        orderId: order.id,
                        productId: item.productId,
                        quantity: item.quantity,
                        price: item.unitPrice,
                        total: item.totalPrice,
                    },
                });
            }
            // Create timeline event
            await this.createTimelineEvent(order.id, "ORDER_CREATED", "Order created and pending payment", userId);
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
                    notes: request.adminNotes,
                },
            });
            // Create timeline event
            await this.createTimelineEvent(orderId, "STATUS_UPDATED", this.getStatusDescription(request.status), updatedBy, request.adminNotes);
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
                    notes: reason,
                    updatedAt: new Date(),
                },
            });
            // Create timeline event
            await this.createTimelineEvent(orderId, "ORDER_CANCELLED", `Order cancelled: ${reason}`, cancelledBy);
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
                status: event.type,
                description: event.message,
                notes: event.data?.notes,
                createdBy: event.data?.createdBy,
                createdAt: event.createdAt,
            }));
        }
        catch (error) {
            this.handleError("Error fetching order timeline", error);
            throw error;
        }
    }
    /**
     * Get order by order number
     */
    async getOrderByNumber(orderNumber, userId) {
        try {
            const where = { orderNumber };
            if (userId) {
                where.userId = userId;
            }
            const order = await models_1.OrderModel.findUnique({
                where,
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
            this.handleError("Error fetching order by number", error);
            throw error;
        }
    }
    /**
     * Get order tracking information
     */
    async getOrderTracking(orderId, userId) {
        try {
            const where = { id: orderId };
            if (userId) {
                where.userId = userId;
            }
            const order = await models_1.OrderModel.findUnique({
                where,
                include: {
                    items: true,
                },
            });
            if (!order) {
                throw new types_1.AppError("Order not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            const timeline = await this.getOrderTimeline(orderId);
            return {
                order: this.transformOrder(order),
                tracking: {
                    trackingNumber: undefined,
                    status: order.status,
                    estimatedDelivery: undefined,
                    timeline: timeline.map((event) => ({
                        status: event.status,
                        description: event.description,
                        timestamp: event.createdAt,
                        notes: event.notes,
                    })),
                },
            };
        }
        catch (error) {
            this.handleError("Error fetching order tracking", error);
            throw error;
        }
    }
    /**
     * Reorder items from a previous order
     */
    async reorder(orderId, userId) {
        try {
            const order = await models_1.OrderModel.findUnique({
                where: { id: orderId, userId },
                include: {
                    items: {
                        include: {
                            product: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                },
            });
            if (!order) {
                throw new types_1.AppError("Order not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            // Transform order items to cart items format
            const cartItems = order.items.map((item) => ({
                productId: item.productId,
                productName: item.product?.name || '',
                quantity: item.quantity,
                unitPrice: Number(item.price),
                totalPrice: Number(item.total),
            }));
            return {
                success: true,
                message: "Items added to cart for reorder",
                cartItems,
            };
        }
        catch (error) {
            this.handleError("Error processing reorder", error);
            throw error;
        }
    }
    /**
     * Request return for an order
     */
    async requestReturn(orderId, userId, data) {
        try {
            const order = await models_1.OrderModel.findUnique({
                where: { id: orderId, userId },
                include: {
                    items: {
                        include: {
                            product: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                },
            });
            if (!order) {
                throw new types_1.AppError("Order not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            if (order.status !== "DELIVERED") {
                throw new types_1.AppError("Returns can only be requested for delivered orders", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.INVALID_ORDER_STATUS);
            }
            // Create timeline event for return request
            await this.createTimelineEvent(orderId, "RETURN_REQUESTED", `Return requested: ${data.reason}`, userId, data.notes);
            const returnRequest = {
                id: `return_${orderId}`,
                orderId,
                reason: data.reason,
                items: data.items || order.items.map((item) => item.id),
                notes: data.notes,
                status: "PENDING",
                requestedAt: new Date(),
            };
            return {
                success: true,
                message: "Return request submitted successfully",
                returnRequest,
            };
        }
        catch (error) {
            this.handleError("Error requesting return", error);
            throw error;
        }
    }
    /**
     * Verify payment for an order
     */
    async verifyPayment(orderId, userId) {
        try {
            const order = await models_1.OrderModel.findUnique({
                where: { id: orderId, userId },
            });
            if (!order) {
                throw new types_1.AppError("Order not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            // Update payment status
            const updatedOrder = await models_1.OrderModel.update({
                where: { id: orderId },
                data: {
                    paymentStatus: "COMPLETED",
                    status: "CONFIRMED",
                    updatedAt: new Date(),
                },
            });
            // Create timeline event
            await this.createTimelineEvent(orderId, "PAYMENT_CONFIRMED", "Payment verified and order confirmed", "SYSTEM");
            return {
                success: true,
                message: "Payment verified successfully",
                order: await this.getOrderById(orderId),
            };
        }
        catch (error) {
            this.handleError("Error verifying payment", error);
            throw error;
        }
    }
    /**
     * Generate invoice for an order
     */
    async generateInvoice(orderId, userId) {
        try {
            const where = { id: orderId };
            if (userId) {
                where.userId = userId;
            }
            const order = await models_1.OrderModel.findUnique({
                where,
                include: {
                    items: {
                        include: {
                            product: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                            phoneNumber: true,
                        },
                    },
                    shippingAddress: true,
                    billingAddress: true,
                },
            });
            if (!order) {
                throw new types_1.AppError("Order not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            const invoice = {
                invoiceNumber: `INV-${order.orderNumber}`,
                orderNumber: order.orderNumber,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                customer: {
                    name: `${order.user?.firstName} ${order.user?.lastName}`,
                    email: order.user?.email,
                    phone: order.user?.phoneNumber,
                },
                billing: order.billingAddress || null,
                shipping: order.shippingAddress || null,
                items: order.items.map((item) => ({
                    description: item.product?.name || '',
                    quantity: item.quantity,
                    unitPrice: Number(item.price),
                    totalPrice: Number(item.total),
                })),
                subtotal: Number(order.subtotal),
                taxAmount: Number(order.tax),
                shippingAmount: Number(order.shippingCost),
                discountAmount: Number(order.discount),
                totalAmount: Number(order.total),
                currency: order.currency,
                paymentStatus: order.paymentStatus,
                paymentMethod: order.paymentMethod,
            };
            return {
                success: true,
                invoice,
            };
        }
        catch (error) {
            this.handleError("Error generating invoice", error);
            throw error;
        }
    }
    /**
     * Get user order statistics
     */
    async getUserOrderStats(userId) {
        try {
            const [orders, totalSpent] = await Promise.all([
                models_1.OrderModel.findMany({
                    where: { userId },
                    include: { items: { take: 1 } },
                    orderBy: { createdAt: "desc" },
                }),
                models_1.OrderModel.aggregate({
                    where: { userId, paymentStatus: "COMPLETED" },
                    _sum: { total: true },
                }),
            ]);
            const totalOrders = orders.length;
            const totalAmount = Number(totalSpent._sum.total) || 0;
            const averageOrderValue = totalOrders > 0 ? totalAmount / totalOrders : 0;
            // Count orders by status
            const ordersByStatus = orders.reduce((acc, order) => {
                acc[order.status] = (acc[order.status] || 0) + 1;
                return acc;
            }, {});
            // Get recent orders (last 5)
            const recentOrders = orders
                .slice(0, 5)
                .map((order) => this.transformOrder(order));
            return {
                totalOrders,
                totalSpent: totalAmount,
                averageOrderValue,
                ordersByStatus,
                recentOrders,
            };
        }
        catch (error) {
            this.handleError("Error fetching user order stats", error);
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
    async createTimelineEvent(orderId, type, message, createdBy, notes) {
        await models_1.OrderTimelineEventModel.create({
            data: {
                orderId,
                type,
                message,
                data: {
                    createdBy,
                    notes,
                },
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
            this.cacheService.clearPattern("orders:*"),
            this.cacheService.clearPattern("user-orders:*"),
        ]);
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
            shippingAddressId: order.shippingAddressId,
            billingAddressId: order.billingAddressId,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            user: order.user,
            items: order.items?.map((item) => ({
                id: item.id,
                quantity: item.quantity,
                price: Number(item.price),
                total: Number(item.total),
                orderId: item.orderId,
                productId: item.productId,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                product: item.product,
            })) || [],
            shippingAddress: order.shippingAddress,
            billingAddress: order.billingAddress,
            timelineEvents: order.timelineEvents,
            paymentTransactions: order.paymentTransactions,
        };
    }
    transformOrderSummary(order) {
        return {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            totalAmount: Number(order.total),
            currency: order.currency,
            itemCount: order.items?.length || 0,
            customerName: `${order.user?.firstName} ${order.user?.lastName}`,
            customerPhone: order.user?.phoneNumber,
            createdAt: order.createdAt,
        };
    }
}
exports.OrderService = OrderService;
//# sourceMappingURL=OrderService.js.map