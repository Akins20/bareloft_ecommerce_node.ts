"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const BaseService_1 = require("../BaseService");
const types_1 = require("../../types");
const redis_1 = require("../../config/redis");
class OrderService extends BaseService_1.BaseService {
    orderRepository;
    cartService;
    constructor(orderRepository, cartService) {
        super();
        this.orderRepository = orderRepository || {};
        this.cartService = cartService || {};
    }
    /**
     * Create a new order from cart
     */
    async createOrder(userId, request) {
        try {
            // Get cart items from cart service
            const cartSummary = await this.cartService.getCart?.(userId) || {
                items: [],
                subtotal: 0,
                tax: 0,
                total: 0,
                itemCount: 0
            };
            if (cartSummary.items.length === 0) {
                throw new types_1.AppError("Cart is empty", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
            }
            // Generate order number
            const orderNumber = await this.generateOrderNumber();
            // Calculate totals
            const subtotal = cartSummary.subtotal;
            const shippingAmount = this.calculateShippingAmount(subtotal, request.shippingAddress?.state);
            const taxAmount = cartSummary.tax || this.calculateTaxAmount(subtotal);
            const discountAmount = request.couponCode ? await this.calculateDiscount(request.couponCode, subtotal) : 0;
            const totalAmount = subtotal + shippingAmount + taxAmount - discountAmount;
            // Create order data
            const orderData = {
                orderNumber,
                userId,
                status: "PENDING",
                subtotal,
                tax: taxAmount,
                shippingCost: shippingAmount,
                discount: discountAmount,
                total: totalAmount,
                currency: "NGN",
                paymentStatus: "PENDING",
                paymentMethod: request.paymentMethod || "CARD",
                notes: request.customerNotes,
                // shippingAddressId: request.shippingAddress?.id,
                // billingAddressId: request.billingAddress?.id,
            };
            // Convert cart items to order items format
            const orderItems = cartSummary.items.map((item) => ({
                productId: item.productId,
                productName: item.product?.name || 'Product',
                productSku: item.product?.sku || '',
                productImage: item.product?.images?.[0] || '',
                quantity: item.quantity,
                unitPrice: item.unitPrice || item.price || 0,
                totalPrice: item.totalPrice || (item.quantity * (item.price || 0)),
            }));
            // Create order using repository
            const order = await this.orderRepository.create?.(orderData) || {};
            // Clear cart after successful order creation
            if (order.id) {
                await this.cartService.clearCart?.(userId);
            }
            // Create initial timeline event
            await this.createTimelineEvent(order.id || '', "ORDER_CREATED", "Order created and pending payment", userId);
            return {
                success: true,
                message: "Order created successfully",
                order,
            };
        }
        catch (error) {
            this.handleError("Error creating order", error);
            throw error;
        }
    }
    /**
     * Get order by ID
     */
    async getOrderById(orderId, userId) {
        try {
            const order = await this.orderRepository.findById?.(orderId);
            if (!order) {
                throw new types_1.AppError("Order not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            // Check ownership for user requests
            if (userId && order.userId !== userId) {
                throw new types_1.AppError("Access denied", types_1.HTTP_STATUS.FORBIDDEN, types_1.ERROR_CODES.FORBIDDEN);
            }
            return order;
        }
        catch (error) {
            this.handleError("Error fetching order", error);
            throw error;
        }
    }
    /**
     * Get user orders with pagination
     */
    async getUserOrders(userId, params = {}) {
        try {
            const { page = 1, limit = 10, status, startDate, endDate } = params;
            // Build query parameters
            const query = {
                userId,
                status: status,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
            };
            // Get orders using repository
            const result = await this.orderRepository.findMany?.({}, {
                pagination: { page, limit }
            }) || {
                data: [],
                pagination: {
                    currentPage: 1,
                    totalPages: 0,
                    totalItems: 0,
                    itemsPerPage: limit,
                    hasNextPage: false,
                    hasPreviousPage: false,
                }
            };
            return {
                success: true,
                message: "Orders retrieved successfully",
                orders: result.data,
                pagination: result.pagination,
            };
        }
        catch (error) {
            this.handleError("Error fetching user orders", error);
            throw error;
        }
    }
    /**
     * Update order status (Admin only)
     */
    async updateOrderStatus(orderId, status, adminNotes, updatedBy) {
        try {
            const order = await this.getOrderById(orderId);
            // Update order status
            const updatedOrder = await this.orderRepository.update?.(orderId, {
                status: status,
                notes: adminNotes,
            }) || order;
            // Create timeline event
            await this.createTimelineEvent(orderId, "STATUS_UPDATED", this.getStatusDescription(status), updatedBy || "ADMIN", adminNotes);
            return {
                success: true,
                message: "Order status updated successfully",
                order: updatedOrder,
            };
        }
        catch (error) {
            this.handleError("Error updating order status", error);
            throw error;
        }
    }
    /**
     * Cancel order
     */
    async cancelOrder(orderId, reason, userId) {
        try {
            const order = await this.getOrderById(orderId, userId);
            if (order.status === types_1.OrderStatus.DELIVERED || order.status === types_1.OrderStatus.CANCELLED) {
                throw new types_1.AppError("Cannot cancel this order", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.ORDER_CANNOT_BE_CANCELLED);
            }
            // Update order status
            const updatedOrder = await this.orderRepository.update?.(orderId, {
                status: "CANCELLED",
                notes: reason,
            }) || order;
            // Create timeline event
            await this.createTimelineEvent(orderId, "ORDER_CANCELLED", `Order cancelled: ${reason}`, userId || "CUSTOMER");
            return {
                success: true,
                message: "Order cancelled successfully",
                order: updatedOrder,
            };
        }
        catch (error) {
            this.handleError("Error cancelling order", error);
            throw error;
        }
    }
    /**
     * Get order by order number
     */
    async getOrderByNumber(orderNumber, userId) {
        try {
            // For now, use a simple implementation - in production, you'd have a proper query
            const orders = await this.orderRepository.findMany?.({}, {
                pagination: { page: 1, limit: 100 }
            });
            const order = orders?.data.find((o) => o.orderNumber === orderNumber);
            if (!order) {
                throw new types_1.AppError("Order not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            // Check ownership for user requests
            if (userId && order.userId !== userId) {
                throw new types_1.AppError("Access denied", types_1.HTTP_STATUS.FORBIDDEN, types_1.ERROR_CODES.FORBIDDEN);
            }
            return order;
        }
        catch (error) {
            this.handleError("Error fetching order by number", error);
            throw error;
        }
    }
    /**
     * Get user order statistics
     */
    async getUserOrderStats(userId) {
        try {
            const result = await this.orderRepository.findMany?.({}, {
                pagination: { page: 1, limit: 100 }
            });
            const userOrders = result?.data.filter((order) => order.userId === userId) || [];
            const totalOrders = userOrders.length;
            const completedOrders = userOrders.filter((o) => o.paymentStatus === "COMPLETED");
            const totalSpent = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0);
            const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
            // Count orders by status
            const ordersByStatus = userOrders.reduce((acc, order) => {
                acc[order.status] = (acc[order.status] || 0) + 1;
                return acc;
            }, {});
            // Get recent orders (last 5)
            const recentOrders = userOrders
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5);
            return {
                totalOrders,
                totalSpent,
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
        // Simple sequence counter using Redis for production
        const dateKey = `${year}${month}${day}`;
        const sequenceKey = `order_sequence:${dateKey}`;
        let sequence = 1;
        try {
            sequence = await redis_1.redisClient.increment(sequenceKey, 1);
            await redis_1.redisClient.expire(sequenceKey, 24 * 60 * 60); // Expire after 24 hours
        }
        catch (error) {
            // Fallback to random number if Redis fails
            sequence = Math.floor(Math.random() * 999) + 1;
        }
        return `BL${year}${month}${day}${sequence.toString().padStart(3, "0")}`;
    }
    calculateShippingAmount(subtotal, state) {
        // Free shipping for orders over ₦50,000
        if (subtotal >= 50000) {
            return 0;
        }
        // Nigerian shipping rates
        if (state?.toLowerCase() === "lagos") {
            return 1500; // Lagos shipping
        }
        // Major cities
        const majorCities = ["abuja", "kano", "ibadan", "port harcourt"];
        if (state && majorCities.includes(state.toLowerCase())) {
            return 2000;
        }
        return 2500; // Default shipping fee
    }
    calculateTaxAmount(subtotal) {
        // 7.5% VAT in Nigeria
        return Math.round(subtotal * 0.075);
    }
    async calculateDiscount(couponCode, subtotal) {
        // Simple discount calculation - in production, use CouponService
        const discountMap = {
            "SAVE10": 0.1,
            "SAVE20": 0.2,
            "NEWUSER": 0.15,
            "WELCOME": 0.05,
        };
        const discountPercentage = discountMap[couponCode.toUpperCase()] || 0;
        return Math.round(subtotal * discountPercentage);
    }
    async createTimelineEvent(orderId, type, message, createdBy, notes) {
        // In production, save to timeline events table
        const eventData = {
            orderId,
            type,
            message,
            createdBy: createdBy || "SYSTEM",
            notes,
            createdAt: new Date(),
        };
        // Store in Redis as backup
        const key = `order_timeline:${orderId}`;
        try {
            const existing = await redis_1.redisClient.get(key) || [];
            existing.push(eventData);
            await redis_1.redisClient.set(key, existing, 30 * 24 * 60 * 60); // 30 days
        }
        catch (error) {
            console.error("Failed to store timeline event:", error);
        }
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
    /**
     * Handle service errors
     */
    handleError(message, error) {
        console.error(message, error);
        if (error instanceof types_1.AppError) {
            throw error;
        }
        throw new types_1.AppError(message, types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.INTERNAL_ERROR);
    }
}
exports.OrderService = OrderService;
//# sourceMappingURL=OrderService.js.map