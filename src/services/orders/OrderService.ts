import { BaseService } from "../BaseService";
import { OrderRepository } from "../../repositories/OrderRepository";
import { CartService } from "../cart/CartService";
import {
  Order,
  OrderStatus,
  CreateOrderRequest,
  UpdateOrderStatusRequest,
  OrderListQuery,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
  PaginationMeta,
} from "../../types";
import { redisClient } from "../../config/redis";

export interface CartItem {
  productId: string;
  productName: string;
  productSku: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderResponse {
  success: boolean;
  message: string;
  order: Order;
}

export interface OrderListResponse {
  success: boolean;
  message: string;
  orders: Order[];
  pagination: PaginationMeta;
}

export class OrderService extends BaseService {
  private orderRepository: OrderRepository;
  private cartService: CartService;

  constructor(orderRepository?: OrderRepository, cartService?: CartService) {
    super();
    this.orderRepository = orderRepository || {} as OrderRepository;
    this.cartService = cartService || {} as CartService;
  }

  /**
   * Create a new order from cart
   */
  async createOrder(
    userId: string,
    request: CreateOrderRequest
  ): Promise<OrderResponse> {
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
        throw new AppError(
          "Cart is empty",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
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
        status: "PENDING" as any,
        subtotal,
        tax: taxAmount,
        shippingCost: shippingAmount,
        discount: discountAmount,
        total: totalAmount,
        currency: "NGN",
        paymentStatus: "PENDING" as any,
        paymentMethod: request.paymentMethod || "CARD",
        notes: request.customerNotes,
        // shippingAddressId: request.shippingAddress?.id,
        // billingAddressId: request.billingAddress?.id,
      };

      // Convert cart items to order items format
      const orderItems = cartSummary.items.map((item: any) => ({
        productId: item.productId,
        productName: item.product?.name || 'Product',
        productSku: item.product?.sku || '',
        productImage: item.product?.images?.[0] || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice || item.price || 0,
        totalPrice: item.totalPrice || (item.quantity * (item.price || 0)),
      }));

      // Create order using repository
      const order = await this.orderRepository.create?.(orderData) || {} as Order;

      // Clear cart after successful order creation
      if (order.id) {
        await this.cartService.clearCart?.(userId);
      }

      // Create initial timeline event
      await this.createTimelineEvent(
        order.id || '',
        "ORDER_CREATED",
        "Order created and pending payment",
        userId
      );

      return {
        success: true,
        message: "Order created successfully",
        order,
      };
    } catch (error) {
      this.handleError("Error creating order", error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string, userId?: string): Promise<Order> {
    try {
      const order = await this.orderRepository.findById?.(orderId);

      if (!order) {
        throw new AppError(
          "Order not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Check ownership for user requests
      if (userId && order.userId !== userId) {
        throw new AppError(
          "Access denied",
          HTTP_STATUS.FORBIDDEN,
          ERROR_CODES.FORBIDDEN
        );
      }

      return order;
    } catch (error) {
      this.handleError("Error fetching order", error);
      throw error;
    }
  }

  /**
   * Get user orders with pagination
   */
  async getUserOrders(
    userId: string,
    params: {
      page?: number;
      limit?: number;
      status?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<OrderListResponse> {
    try {
      const { page = 1, limit = 10, status, startDate, endDate } = params;

      // Build query parameters
      const query = {
        userId,
        status: status as any,
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
    } catch (error) {
      this.handleError("Error fetching user orders", error);
      throw error;
    }
  }

  /**
   * Update order status (Admin only)
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    adminNotes?: string,
    updatedBy?: string
  ): Promise<OrderResponse> {
    try {
      const order = await this.getOrderById(orderId);

      // Update order status
      const updatedOrder = await this.orderRepository.update?.(orderId, {
        status: status as any,
        notes: adminNotes,
      }) || order;

      // Create timeline event
      await this.createTimelineEvent(
        orderId,
        "STATUS_UPDATED",
        this.getStatusDescription(status),
        updatedBy || "ADMIN",
        adminNotes
      );

      return {
        success: true,
        message: "Order status updated successfully",
        order: updatedOrder,
      };
    } catch (error) {
      this.handleError("Error updating order status", error);
      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(
    orderId: string,
    reason: string,
    userId?: string
  ): Promise<OrderResponse> {
    try {
      const order = await this.getOrderById(orderId, userId);

      if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
        throw new AppError(
          "Cannot cancel this order",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.ORDER_CANNOT_BE_CANCELLED
        );
      }

      // Update order status
      const updatedOrder = await this.orderRepository.update?.(orderId, {
        status: "CANCELLED" as any,
        notes: reason,
      }) || order;

      // Create timeline event
      await this.createTimelineEvent(
        orderId,
        "ORDER_CANCELLED",
        `Order cancelled: ${reason}`,
        userId || "CUSTOMER"
      );

      return {
        success: true,
        message: "Order cancelled successfully",
        order: updatedOrder,
      };
    } catch (error) {
      this.handleError("Error cancelling order", error);
      throw error;
    }
  }

  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber: string, userId?: string): Promise<Order> {
    try {
      // For now, use a simple implementation - in production, you'd have a proper query
      const orders = await this.orderRepository.findMany?.({}, {
        pagination: { page: 1, limit: 100 }
      });
      
      const order = orders?.data.find((o: any) => o.orderNumber === orderNumber);

      if (!order) {
        throw new AppError(
          "Order not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Check ownership for user requests
      if (userId && order.userId !== userId) {
        throw new AppError(
          "Access denied",
          HTTP_STATUS.FORBIDDEN,
          ERROR_CODES.FORBIDDEN
        );
      }

      return order;
    } catch (error) {
      this.handleError("Error fetching order by number", error);
      throw error;
    }
  }

  /**
   * Get user order statistics
   */
  async getUserOrderStats(userId: string): Promise<{
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    ordersByStatus: Record<string, number>;
    recentOrders: Order[];
  }> {
    try {
      const result = await this.orderRepository.findMany?.({}, {
        pagination: { page: 1, limit: 100 }
      });
      
      const userOrders = result?.data.filter((order: any) => order.userId === userId) || [];

      const totalOrders = userOrders.length;
      const completedOrders = userOrders.filter((o: any) => o.paymentStatus === "COMPLETED");
      const totalSpent = completedOrders.reduce((sum: number, order: any) => sum + (order.total || 0), 0);
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

      // Count orders by status
      const ordersByStatus = userOrders.reduce((acc: Record<string, number>, order: any) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      // Get recent orders (last 5)
      const recentOrders = userOrders
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      return {
        totalOrders,
        totalSpent,
        averageOrderValue,
        ordersByStatus,
        recentOrders,
      };
    } catch (error) {
      this.handleError("Error fetching user order stats", error);
      throw error;
    }
  }

  // Private helper methods

  private async generateOrderNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");

    // Simple sequence counter using Redis for production
    const dateKey = `${year}${month}${day}`;
    const sequenceKey = `order_sequence:${dateKey}`;
    
    let sequence = 1;
    try {
      sequence = await redisClient.increment(sequenceKey, 1);
      await redisClient.expire(sequenceKey, 24 * 60 * 60); // Expire after 24 hours
    } catch (error) {
      // Fallback to random number if Redis fails
      sequence = Math.floor(Math.random() * 999) + 1;
    }

    return `BL${year}${month}${day}${sequence.toString().padStart(3, "0")}`;
  }

  private calculateShippingAmount(subtotal: number, state?: string): number {
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

  private calculateTaxAmount(subtotal: number): number {
    // 7.5% VAT in Nigeria
    return Math.round(subtotal * 0.075);
  }

  private async calculateDiscount(couponCode: string, subtotal: number): Promise<number> {
    // Simple discount calculation - in production, use CouponService
    const discountMap: Record<string, number> = {
      "SAVE10": 0.1,
      "SAVE20": 0.2,
      "NEWUSER": 0.15,
      "WELCOME": 0.05,
    };

    const discountPercentage = discountMap[couponCode.toUpperCase()] || 0;
    return Math.round(subtotal * discountPercentage);
  }

  private async createTimelineEvent(
    orderId: string,
    type: string,
    message: string,
    createdBy?: string,
    notes?: string
  ): Promise<void> {
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
      const existing = await redisClient.get<any[]>(key) || [];
      existing.push(eventData);
      await redisClient.set(key, existing, 30 * 24 * 60 * 60); // 30 days
    } catch (error) {
      console.error("Failed to store timeline event:", error);
    }
  }

  private getStatusDescription(status: OrderStatus): string {
    const descriptions: Record<string, string> = {
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
  protected handleError(message: string, error: any): never {
    console.error(message, error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }
}