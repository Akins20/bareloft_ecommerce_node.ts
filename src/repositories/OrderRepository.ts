import { PrismaClient } from "@prisma/client";
import { BaseRepository } from "./BaseRepository";
import {
  Order,
  OrderItem,
  OrderTimelineEvent,
  CreateOrderRequest,
  UpdateOrderStatusRequest,
  OrderListQuery,
  OrderSummary,
  OrderListResponse,
  OrderDetailResponse,
  OrderAnalytics,
  PaginationParams,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
} from "../types";

export interface CreateOrderData {
  orderNumber: string;
  userId: string;
  status?:
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED"
    | "REFUNDED";
  subtotal: number;
  taxAmount?: number;
  shippingAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  currency?: string;
  paymentStatus?: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "PARTIAL_REFUND";
  paymentMethod?: "CARD" | "BANK_TRANSFER" | "USSD" | "WALLET";
  paymentReference?: string;
  shippingAddress: any;
  billingAddress: any;
  customerNotes?: string;
  adminNotes?: string;
  trackingNumber?: string;
  estimatedDelivery?: Date;
}

export interface UpdateOrderData {
  status?:
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED"
    | "REFUNDED";
  paymentStatus?: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "PARTIAL_REFUND";
  paymentMethod?: "CARD" | "BANK_TRANSFER" | "USSD" | "WALLET";
  paymentReference?: string;
  adminNotes?: string;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  paidAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
}

export interface OrderWithDetails extends Order {
  items: OrderItem[];
  timeline: OrderTimelineEvent[];
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phoneNumber: string;
    totalOrders: number;
    totalSpent: number;
  };
}

export class OrderRepository extends BaseRepository<
  Order,
  CreateOrderData,
  UpdateOrderData
> {
  constructor(prisma: PrismaClient) {
    super(prisma, "Order");
  }

  /**
   * Find order by order number
   */
  async findByOrderNumber(
    orderNumber: string
  ): Promise<OrderWithDetails | null> {
    try {
      const order = await this.findFirst(
        { orderNumber },
        {
          items: {
            include: {
              product: {
                include: {
                  images: {
                    where: { isPrimary: true },
                    take: 1,
                  },
                },
              },
            },
          },
          user: true,
          timeline: {
            orderBy: { createdAt: "desc" },
          },
          transactions: true,
        }
      );

      if (!order) return null;

      // Get customer statistics
      const customerStats = await this.getCustomerOrderStats(order.userId);

      return {
        ...order,
        customer: {
          id: order.user.id,
          firstName: order.user.firstName,
          lastName: order.user.lastName,
          email: order.user.email,
          phoneNumber: order.user.phoneNumber,
          totalOrders: customerStats.totalOrders,
          totalSpent: customerStats.totalSpent,
        },
      };
    } catch (error) {
      this.handleError("Error finding order by order number", error);
      throw error;
    }
  }

  /**
   * Create order with items
   */
  async createOrderWithItems(
    orderData: CreateOrderData,
    items: Array<{
      productId: string;
      productName: string;
      productSku: string;
      productImage?: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>
  ): Promise<OrderWithDetails> {
    try {
      return await this.transaction(async (prisma) => {
        // Create the order
        const order = await prisma.order.create({
          data: orderData,
          include: {
            user: true,
          },
        });

        // Create order items
        await prisma.orderItem.createMany({
          data: items.map((item) => ({
            ...item,
            orderId: order.id,
          })),
        });

        // Create initial timeline event
        await prisma.orderTimelineEvent.create({
          data: {
            orderId: order.id,
            status: orderData.status || "PENDING",
            description: "Order created",
            createdBy: order.userId,
          },
        });

        // Get the complete order with all relations
        const completeOrder = await this.findByOrderNumber(order.orderNumber);

        if (!completeOrder) {
          throw new Error("Failed to retrieve created order");
        }

        return completeOrder;
      });
    } catch (error) {
      this.handleError("Error creating order with items", error);
      throw error;
    }
  }

  /**
   * Update order status with timeline
   */
  async updateOrderStatus(
    orderId: string,
    statusData: {
      status: UpdateOrderData["status"];
      adminNotes?: string;
      trackingNumber?: string;
      estimatedDelivery?: Date;
      updatedBy?: string;
    }
  ): Promise<OrderWithDetails> {
    try {
      return await this.transaction(async (prisma) => {
        // Get current order
        const currentOrder = await prisma.order.findUnique({
          where: { id: orderId },
        });

        if (!currentOrder) {
          throw new AppError(
            "Order not found",
            HTTP_STATUS.NOT_FOUND,
            ERROR_CODES.RESOURCE_NOT_FOUND
          );
        }

        // Prepare update data
        const updateData: UpdateOrderData = {
          status: statusData.status,
          adminNotes: statusData.adminNotes,
          trackingNumber: statusData.trackingNumber,
          estimatedDelivery: statusData.estimatedDelivery,
        };

        // Set timestamp based on status
        const now = new Date();
        switch (statusData.status) {
          case "SHIPPED":
            updateData.shippedAt = now;
            break;
          case "DELIVERED":
            updateData.deliveredAt = now;
            break;
        }

        // Update the order
        await prisma.order.update({
          where: { id: orderId },
          data: updateData,
        });

        // Create timeline event
        await prisma.orderTimelineEvent.create({
          data: {
            orderId,
            status: statusData.status!,
            description: this.getStatusDescription(statusData.status!),
            notes: statusData.adminNotes,
            createdBy: statusData.updatedBy,
          },
        });

        // Return updated order
        const updatedOrder = await this.findById(orderId);
        return await this.findByOrderNumber(updatedOrder!.orderNumber);
      });
    } catch (error) {
      this.handleError("Error updating order status", error);
      throw error;
    }
  }

  /**
   * Get orders with advanced filtering
   */
  async getOrdersWithFilters(
    queryParams: OrderListQuery
  ): Promise<OrderListResponse> {
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
      } = queryParams;

      // Build where clause
      const where: any = {};

      // Status filter
      if (status) {
        where.status = status;
      }

      // Payment status filter
      if (paymentStatus) {
        where.paymentStatus = paymentStatus;
      }

      // Date range filter
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      // Search filter
      if (search) {
        where.OR = [
          { orderNumber: { contains: search, mode: "insensitive" } },
          {
            user: {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phoneNumber: { contains: search } },
              ],
            },
          },
        ];
      }

      const result = await this.findMany(where, {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
          items: {
            select: {
              quantity: true,
              product: {
                select: {
                  name: true,
                  images: {
                    where: { isPrimary: true },
                    take: 1,
                    select: { imageUrl: true },
                  },
                },
              },
            },
            take: 3, // First 3 items for preview
          },
          _count: {
            select: { items: true },
          },
        },
        orderBy: this.buildOrderBy(sortBy, sortOrder as "asc" | "desc"),
        pagination: { page, limit },
      });

      // Calculate summary
      const summary = await this.getOrdersSummary(where);

      // Transform orders to summary format
      const orders: OrderSummary[] = result.data.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: Number(order.totalAmount),
        currency: order.currency,
        itemCount: order._count.items,
        customerName: `${order.user.firstName} ${order.user.lastName}`,
        createdAt: order.createdAt,
        estimatedDelivery: order.estimatedDelivery,
      }));

      return {
        orders,
        pagination: result.pagination,
        summary,
      };
    } catch (error) {
      this.handleError("Error getting orders with filters", error);
      throw error;
    }
  }

  /**
   * Get user's order history
   */
  async getUserOrderHistory(
    userId: string,
    pagination?: PaginationParams
  ): Promise<{
    data: OrderSummary[];
    pagination: any;
  }> {
    try {
      const result = await this.findMany(
        { userId },
        {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    images: {
                      where: { isPrimary: true },
                      take: 1,
                    },
                  },
                },
              },
              take: 3,
            },
            _count: {
              select: { items: true },
            },
          },
          orderBy: { createdAt: "desc" },
          pagination,
        }
      );

      const orders: OrderSummary[] = result.data.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: Number(order.totalAmount),
        currency: order.currency,
        itemCount: order._count.items,
        customerName: "", // Not needed for user's own orders
        createdAt: order.createdAt,
        estimatedDelivery: order.estimatedDelivery,
      }));

      return {
        data: orders,
        pagination: result.pagination,
      };
    } catch (error) {
      this.handleError("Error getting user order history", error);
      throw error;
    }
  }

  /**
   * Get recent orders
   */
  async getRecentOrders(
    limit: number = 10,
    status?: string
  ): Promise<OrderSummary[]> {
    try {
      const where: any = {};
      if (status) {
        where.status = status;
      }

      const result = await this.findMany(where, {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: { items: true },
          },
        },
        orderBy: { createdAt: "desc" },
        pagination: { page: 1, limit },
      });

      return result.data.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: Number(order.totalAmount),
        currency: order.currency,
        itemCount: order._count.items,
        customerName: `${order.user.firstName} ${order.user.lastName}`,
        createdAt: order.createdAt,
        estimatedDelivery: order.estimatedDelivery,
      }));
    } catch (error) {
      this.handleError("Error getting recent orders", error);
      throw error;
    }
  }

  /**
   * Get orders requiring attention
   */
  async getOrdersRequiringAttention(): Promise<{
    pendingPayment: OrderSummary[];
    processingDelayed: OrderSummary[];
    shippingDelayed: OrderSummary[];
    lowStockOrders: OrderSummary[];
  }> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      const [pendingPayment, processingDelayed, shippingDelayed] =
        await Promise.all([
          // Orders with pending payment for more than 1 day
          this.getOrderSummaries({
            paymentStatus: "PENDING",
            createdAt: { lt: oneDayAgo },
          }),
          // Orders in processing for more than 3 days
          this.getOrderSummaries({
            status: "PROCESSING",
            createdAt: { lt: threeDaysAgo },
          }),
          // Shipped orders without delivery confirmation after estimated delivery
          this.getOrderSummaries({
            status: "SHIPPED",
            estimatedDelivery: { lt: now },
          }),
        ]);

      return {
        pendingPayment,
        processingDelayed,
        shippingDelayed,
        lowStockOrders: [], // Would implement with inventory check
      };
    } catch (error) {
      this.handleError("Error getting orders requiring attention", error);
      throw error;
    }
  }

  /**
   * Get order analytics
   */
  async getOrderAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<OrderAnalytics> {
    try {
      const where: any = {};
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [
        totalOrders,
        totalRevenue,
        ordersByStatus,
        topProducts,
        topCategories,
        topCustomers,
        revenueByMonth,
      ] = await Promise.all([
        this.count(where),
        this.getRevenue(where),
        this.getOrdersByStatus(where),
        this.getTopProducts(where),
        this.getTopCategories(where),
        this.getTopCustomers(where),
        this.getRevenueByMonth(where),
      ]);

      const averageOrderValue =
        totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const conversionRate = 2.5; // Would calculate from session data

      return {
        totalOrders,
        totalRevenue,
        averageOrderValue,
        conversionRate,
        topProducts,
        revenueByMonth,
        ordersByStatus,
      };
    } catch (error) {
      this.handleError("Error getting order analytics", error);
      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(
    orderId: string,
    reason: string,
    cancelledBy?: string
  ): Promise<OrderWithDetails> {
    try {
      return await this.transaction(async (prisma) => {
        // Check if order can be cancelled
        const order = await prisma.order.findUnique({
          where: { id: orderId },
        });

        if (!order) {
          throw new AppError(
            "Order not found",
            HTTP_STATUS.NOT_FOUND,
            ERROR_CODES.RESOURCE_NOT_FOUND
          );
        }

        if (["DELIVERED", "CANCELLED", "REFUNDED"].includes(order.status)) {
          throw new AppError(
            "Order cannot be cancelled",
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR
          );
        }

        // Update order status
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "CANCELLED",
            adminNotes: reason,
          },
        });

        // Create timeline event
        await prisma.orderTimelineEvent.create({
          data: {
            orderId,
            status: "CANCELLED",
            description: "Order cancelled",
            notes: reason,
            createdBy: cancelledBy,
          },
        });

        // Return updated order
        const updatedOrder = await this.findById(orderId);
        return await this.findByOrderNumber(updatedOrder!.orderNumber);
      });
    } catch (error) {
      this.handleError("Error cancelling order", error);
      throw error;
    }
  }

  /**
   * Generate unique order number
   */
  async generateOrderNumber(): Promise<string> {
    try {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const day = now.getDate().toString().padStart(2, "0");

      // Get count of orders today
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      const todayOrderCount = await this.count({
        createdAt: {
          gte: todayStart,
          lt: todayEnd,
        },
      });

      const sequence = (todayOrderCount + 1).toString().padStart(4, "0");

      return `BL${year}${month}${day}${sequence}`;
    } catch (error) {
      this.handleError("Error generating order number", error);
      throw error;
    }
  }

  // Private helper methods

  private async getCustomerOrderStats(userId: string): Promise<{
    totalOrders: number;
    totalSpent: number;
  }> {
    try {
      const result = await this.aggregate(
        {
          userId,
          status: { not: "CANCELLED" },
        },
        {
          _count: { id: true },
          _sum: { totalAmount: true },
        }
      );

      return {
        totalOrders: result._count.id,
        totalSpent: Number(result._sum.totalAmount) || 0,
      };
    } catch (error) {
      return { totalOrders: 0, totalSpent: 0 };
    }
  }

  private getStatusDescription(status: string): string {
    const descriptions = {
      PENDING: "Order is pending confirmation",
      CONFIRMED: "Order has been confirmed",
      PROCESSING: "Order is being processed",
      SHIPPED: "Order has been shipped",
      DELIVERED: "Order has been delivered",
      CANCELLED: "Order has been cancelled",
      REFUNDED: "Order has been refunded",
    };

    return (
      descriptions[status as keyof typeof descriptions] ||
      `Order status changed to ${status}`
    );
  }

  private async getOrdersSummary(where: any): Promise<{
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
  }> {
    try {
      const result = await this.aggregate(
        { ...where, status: { not: "CANCELLED" } },
        {
          _count: { id: true },
          _sum: { totalAmount: true },
        }
      );

      const totalOrders = result._count.id;
      const totalRevenue = Number(result._sum.totalAmount) || 0;
      const averageOrderValue =
        totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return {
        totalRevenue,
        totalOrders,
        averageOrderValue,
      };
    } catch (error) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
      };
    }
  }

  private async getOrderSummaries(where: any): Promise<OrderSummary[]> {
    try {
      const result = await this.findMany(where, {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: { items: true },
          },
        },
        orderBy: { createdAt: "desc" },
        pagination: { page: 1, limit: 10 },
      });

      return result.data.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: Number(order.totalAmount),
        currency: order.currency,
        itemCount: order._count.items,
        customerName: `${order.user.firstName} ${order.user.lastName}`,
        createdAt: order.createdAt,
        estimatedDelivery: order.estimatedDelivery,
      }));
    } catch (error) {
      return [];
    }
  }

  private async getRevenue(where: any): Promise<number> {
    try {
      const result = await this.aggregate(
        { ...where, status: { not: "CANCELLED" } },
        { _sum: { totalAmount: true } }
      );
      return Number(result._sum.totalAmount) || 0;
    } catch (error) {
      return 0;
    }
  }

  private async getOrdersByStatus(where: any): Promise<any[]> {
    try {
      return await this.groupBy(["status"], where, undefined, {
        _count: { id: true },
      });
    } catch (error) {
      return [];
    }
  }

  private async getTopProducts(where: any): Promise<any[]> {
    // Would implement complex query for top products
    return [];
  }

  private async getTopCategories(where: any): Promise<any[]> {
    // Would implement complex query for top categories
    return [];
  }

  private async getTopCustomers(where: any): Promise<any[]> {
    // Would implement complex query for top customers
    return [];
  }

  private async getRevenueByMonth(where: any): Promise<any[]> {
    // Would implement monthly revenue aggregation
    return [];
  }
}
