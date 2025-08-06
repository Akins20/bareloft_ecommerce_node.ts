import { BaseService } from "../BaseService";
import {
  OrderModel,
  OrderItemModel,
  OrderTimelineEventModel,
} from "../../models";
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
import { CacheService } from "../cache/CacheService";

export class OrderService extends BaseService {
  private cacheService: CacheService;

  constructor(cacheService: CacheService) {
    super();
    this.cacheService = cacheService;
  }

  /**
   * Create a new order
   */
  async createOrder(
    userId: string,
    request: CreateOrderRequest,
    cartItems: Array<{
      productId: string;
      productName: string;
      productSku: string;
      productImage?: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>
  ): Promise<Order> {
    try {
      // Generate order number
      const orderNumber = await this.generateOrderNumber();

      // Calculate totals
      const subtotal = cartItems.reduce(
        (sum, item) => sum + item.totalPrice,
        0
      );
      const shippingAmount = this.calculateShippingAmount(subtotal);
      const taxAmount = this.calculateTaxAmount(subtotal);
      const totalAmount = subtotal + shippingAmount + taxAmount;

      // Create order
      const order = await OrderModel.create({
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
        await OrderItemModel.create({
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
      await this.createTimelineEvent(
        order.id,
        "ORDER_CREATED",
        "Order created and pending payment",
        userId
      );

      return this.getOrderById(order.id);
    } catch (error) {
      this.handleError("Error creating order", error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string): Promise<Order> {
    try {
      const order = await OrderModel.findUnique({
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
        throw new AppError(
          "Order not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      return this.transformOrder(order);
    } catch (error) {
      this.handleError("Error fetching order", error);
      throw error;
    }
  }

  /**
   * Get orders list with filtering
   */
  async getOrders(query: OrderListQuery = {}): Promise<{
    orders: Order[];
    pagination: PaginationMeta;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        paymentStatus,
        startDate,
        endDate,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = query;

      // Build where clause
      const where: any = {};

      if (status) where.status = status;
      if (paymentStatus) where.paymentStatus = paymentStatus;

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
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
      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      // Execute queries
      const [orders, total] = await Promise.all([
        OrderModel.findMany({
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
        OrderModel.count({ where }),
      ]);

      const pagination = this.createPagination(page, limit, total);

      return {
        orders: orders.map(this.transformOrderSummary),
        pagination,
      };
    } catch (error) {
      this.handleError("Error fetching orders", error);
      throw error;
    }
  }

  /**
   * Get user orders
   */
  async getUserOrders(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    orders: Order[];
    pagination: PaginationMeta;
  }> {
    try {
      const [orders, total] = await Promise.all([
        OrderModel.findMany({
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
        OrderModel.count({ where: { userId } }),
      ]);

      const pagination = this.createPagination(page, limit, total);

      return {
        orders: orders.map(this.transformOrder),
        pagination,
      };
    } catch (error) {
      this.handleError("Error fetching user orders", error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    request: UpdateOrderStatusRequest,
    updatedBy: string
  ): Promise<Order> {
    try {
      const order = await OrderModel.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new AppError(
          "Order not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Update order
      const updatedOrder = await OrderModel.update({
        where: { id: orderId },
        data: {
          status: request.status as any,
          notes: request.adminNotes,
        },
      });

      // Create timeline event
      await this.createTimelineEvent(
        orderId,
        "STATUS_UPDATED",
        this.getStatusDescription(request.status),
        updatedBy,
        request.adminNotes
      );

      // Clear cache
      await this.clearOrderCache(orderId);

      return this.getOrderById(orderId);
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
    cancelledBy: string
  ): Promise<Order> {
    try {
      const order = await OrderModel.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new AppError(
          "Order not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      if (order.status === "DELIVERED" || order.status === "CANCELLED") {
        throw new AppError(
          "Cannot cancel this order",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.ORDER_CANNOT_BE_CANCELLED
        );
      }

      // Update order status
      await OrderModel.update({
        where: { id: orderId },
        data: {
          status: "CANCELLED",
          notes: reason,
          updatedAt: new Date(),
        },
      });

      // Create timeline event
      await this.createTimelineEvent(
        orderId,
        "ORDER_CANCELLED",
        `Order cancelled: ${reason}`,
        cancelledBy
      );

      return this.getOrderById(orderId);
    } catch (error) {
      this.handleError("Error cancelling order", error);
      throw error;
    }
  }

  /**
   * Get order timeline
   */
  async getOrderTimeline(orderId: string): Promise<
    Array<{
      id: string;
      status: OrderStatus;
      description: string;
      notes?: string;
      createdBy?: string;
      createdAt: Date;
    }>
  > {
    try {
      const timeline = await OrderTimelineEventModel.findMany({
        where: { orderId },
        orderBy: { createdAt: "asc" },
      });

      return timeline.map((event) => ({
        id: event.id,
        status: event.type as any,
        description: event.message,
        notes: (event.data as any)?.notes,
        createdBy: (event.data as any)?.createdBy,
        createdAt: event.createdAt,
      }));
    } catch (error) {
      this.handleError("Error fetching order timeline", error);
      throw error;
    }
  }

  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber: string, userId?: string): Promise<Order> {
    try {
      const where: any = { orderNumber };
      if (userId) {
        where.userId = userId;
      }

      const order = await OrderModel.findUnique({
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
        throw new AppError(
          "Order not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      return this.transformOrder(order);
    } catch (error) {
      this.handleError("Error fetching order by number", error);
      throw error;
    }
  }

  /**
   * Get order tracking information
   */
  async getOrderTracking(orderId: string, userId?: string): Promise<{
    order: Order;
    tracking: {
      trackingNumber?: string;
      status: OrderStatus;
      estimatedDelivery?: Date;
      timeline: Array<{
        status: OrderStatus;
        description: string;
        timestamp: Date;
        notes?: string;
      }>;
    };
  }> {
    try {
      const where: any = { id: orderId };
      if (userId) {
        where.userId = userId;
      }

      const order = await OrderModel.findUnique({
        where,
        include: {
          items: true,
        },
      });

      if (!order) {
        throw new AppError(
          "Order not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      const timeline = await this.getOrderTimeline(orderId);

      return {
        order: this.transformOrder(order),
        tracking: {
          trackingNumber: undefined,
          status: order.status as any,
          estimatedDelivery: undefined,
          timeline: timeline.map((event) => ({
            status: event.status,
            description: event.description,
            timestamp: event.createdAt,
            notes: event.notes,
          })),
        },
      };
    } catch (error) {
      this.handleError("Error fetching order tracking", error);
      throw error;
    }
  }

  /**
   * Reorder items from a previous order
   */
  async reorder(orderId: string, userId: string): Promise<{ success: boolean; message: string; cartItems: any[] }> {
    try {
      const order = await OrderModel.findUnique({
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
        throw new AppError(
          "Order not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
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
    } catch (error) {
      this.handleError("Error processing reorder", error);
      throw error;
    }
  }

  /**
   * Request return for an order
   */
  async requestReturn(
    orderId: string,
    userId: string,
    data: { reason: string; items?: string[]; notes?: string }
  ): Promise<{ success: boolean; message: string; returnRequest: any }> {
    try {
      const order = await OrderModel.findUnique({
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
        throw new AppError(
          "Order not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      if (order.status !== "DELIVERED") {
        throw new AppError(
          "Returns can only be requested for delivered orders",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_ORDER_STATUS
        );
      }

      // Create timeline event for return request
      await this.createTimelineEvent(
        orderId,
        "RETURN_REQUESTED",
        `Return requested: ${data.reason}`,
        userId,
        data.notes
      );

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
    } catch (error) {
      this.handleError("Error requesting return", error);
      throw error;
    }
  }

  /**
   * Verify payment for an order
   */
  async verifyPayment(orderId: string, userId: string): Promise<{ success: boolean; message: string; order: Order }> {
    try {
      const order = await OrderModel.findUnique({
        where: { id: orderId, userId },
      });

      if (!order) {
        throw new AppError(
          "Order not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Update payment status
      const updatedOrder = await OrderModel.update({
        where: { id: orderId },
        data: {
          paymentStatus: "COMPLETED",
          status: "CONFIRMED",
          updatedAt: new Date(),
        },
      });

      // Create timeline event
      await this.createTimelineEvent(
        orderId,
        "PAYMENT_CONFIRMED",
        "Payment verified and order confirmed",
        "SYSTEM"
      );

      return {
        success: true,
        message: "Payment verified successfully",
        order: await this.getOrderById(orderId),
      };
    } catch (error) {
      this.handleError("Error verifying payment", error);
      throw error;
    }
  }

  /**
   * Generate invoice for an order
   */
  async generateInvoice(orderId: string, userId?: string): Promise<{ success: boolean; invoice: any }> {
    try {
      const where: any = { id: orderId };
      if (userId) {
        where.userId = userId;
      }

      const order = await OrderModel.findUnique({
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
        throw new AppError(
          "Order not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
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
    } catch (error) {
      this.handleError("Error generating invoice", error);
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
      const [orders, totalSpent] = await Promise.all([
        OrderModel.findMany({
          where: { userId },
          include: { items: { take: 1 } },
          orderBy: { createdAt: "desc" },
        }),
        OrderModel.aggregate({
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
      }, {} as Record<string, number>);

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

    // Get count of orders today
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCount = await OrderModel.count({
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

  private calculateShippingAmount(subtotal: number): number {
    // Free shipping for orders over ₦50,000
    if (subtotal >= 50000) {
      return 0;
    }
    return 2500; // Default shipping fee
  }

  private calculateTaxAmount(subtotal: number): number {
    // 7.5% VAT
    return Math.round(subtotal * 0.075);
  }

  private async createTimelineEvent(
    orderId: string,
    type: string,
    message: string,
    createdBy?: string,
    notes?: string
  ): Promise<void> {
    await OrderTimelineEventModel.create({
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

  private getStatusDescription(status: OrderStatus): string {
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

  private async clearOrderCache(orderId: string): Promise<void> {
    await Promise.all([
      this.cacheService.delete(`order:${orderId}`),
      this.cacheService.clearPattern("orders:*"),
      this.cacheService.clearPattern("user-orders:*"),
    ]);
  }

  private transformOrder(order: any): Order {
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
      items:
        order.items?.map((item: any) => ({
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

  private transformOrderSummary(order: any): any {
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
