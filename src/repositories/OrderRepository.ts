import { PrismaClient, OrderStatus as PrismaOrderStatus, PaymentStatus as PrismaPaymentStatus } from "@prisma/client";
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
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  PaginationParams,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
} from "../types";

export interface CreateOrderData {
  orderNumber: string;
  userId: string;
  status?: PrismaOrderStatus;
  subtotal: number;
  shippingCost?: number;
  discount?: number;
  total: number;
  currency?: string;
  paymentStatus?: PrismaPaymentStatus;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
  shippingAddressId?: string;
  billingAddressId?: string;
}

export interface UpdateOrderData {
  status?: PrismaOrderStatus;
  paymentStatus?: PrismaPaymentStatus;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
}

export interface OrderWithDetails extends Order {
  items?: OrderItem[]; // Make optional since it comes from Prisma includes
  timeline?: OrderTimelineEvent[]; // Make optional since it comes from Prisma includes
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
    super(prisma, "order");
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
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  sku: true,
                  price: true,
                  images: {
                    orderBy: { position: "asc" },
                    take: 1,
                    select: { url: true },
                  },
                },
              },
            },
          },
          user: true,
          timelineEvents: {
            orderBy: { createdAt: "desc" },
          },
          paymentTransactions: true,
          shippingAddress: true,
          billingAddress: true,
        }
      );

      if (!order) return null;

      // Get customer statistics
      const customerStats = await this.getCustomerOrderStats(order.userId);

      return {
        ...order,
        timeline: order.timelineEvents || [],
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
      quantity: number;
      price: number;
      total: number;
    }>
  ): Promise<OrderWithDetails> {
    console.log("\n🔧 ===== REPOSITORY: createOrderWithItems STARTED =====");
    console.log("📦 ORDER DATA RECEIVED:", JSON.stringify(orderData, null, 2));
    console.log("📋 ITEMS DATA RECEIVED:", JSON.stringify(items, null, 2));

    try {
      console.log("🔄 REPO Step 1: Starting database transaction...");
      return await this.transaction(async (prisma) => {
        console.log("🔄 REPO Step 2: Inside transaction - creating order...");
        
        // Create the order (tax included in product prices, set to 0)
        console.log("📝 Creating order with data:", JSON.stringify({
          orderNumber: orderData.orderNumber,
          userId: orderData.userId,
          status: orderData.status || "PENDING",
          subtotal: orderData.subtotal,
          tax: 0,
          shippingCost: orderData.shippingCost || 0,
          discount: orderData.discount || 0,
          total: orderData.total,
          currency: orderData.currency || "NGN",
          paymentStatus: orderData.paymentStatus || "PENDING",
          paymentMethod: orderData.paymentMethod,
          paymentReference: orderData.paymentReference,
          notes: orderData.notes,
          shippingAddressId: orderData.shippingAddressId,
          billingAddressId: orderData.billingAddressId,
        }, null, 2));

        const order = await prisma.order.create({
          data: {
            orderNumber: orderData.orderNumber,
            userId: orderData.userId,
            status: orderData.status || PrismaOrderStatus.PENDING,
            subtotal: orderData.subtotal,
            tax: 0, // Tax is included in product prices
            shippingCost: orderData.shippingCost || 0,
            discount: orderData.discount || 0,
            total: orderData.total,
            currency: orderData.currency || "NGN",
            paymentStatus: orderData.paymentStatus || PrismaPaymentStatus.PENDING,
            paymentMethod: orderData.paymentMethod,
            paymentReference: orderData.paymentReference,
            notes: orderData.notes,
            shippingAddressId: orderData.shippingAddressId,
            billingAddressId: orderData.billingAddressId,
          },
          include: {
            user: true,
          },
        });

        console.log("✅ REPO Step 2 Complete: Order created with ID:", order.id);

        console.log("🔄 REPO Step 3: Creating order items...");
        const orderItemsData = items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          orderId: order.id,
        }));
        console.log("📋 Order items to create:", JSON.stringify(orderItemsData, null, 2));

        await prisma.orderItem.createMany({
          data: orderItemsData,
        });
        console.log("✅ REPO Step 3 Complete: Order items created");

        console.log("🔄 REPO Step 4: Creating timeline event...");
        await prisma.orderTimelineEvent.create({
          data: {
            orderId: order.id,
            type: "ORDER_CREATED",
            message: "Order created",
          },
        });
        console.log("✅ REPO Step 4 Complete: Timeline event created");

        console.log("🔄 REPO Step 5: Retrieving complete order...");
        // Get the complete order with all relations
        const completeOrder = await this.findByOrderNumber(order.orderNumber);

        if (!completeOrder) {
          console.error("❌ Failed to retrieve created order");
          throw new Error("Failed to retrieve created order");
        }

        console.log("✅ REPO Step 5 Complete: Complete order retrieved");
        console.log("🎉 ===== REPOSITORY: createOrderWithItems SUCCESS =====");
        return completeOrder;
      });
    } catch (error) {
      console.error("❌ ===== REPOSITORY: createOrderWithItems FAILED =====");
      console.error("❌ REPO Error:", error);
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
          notes: statusData.adminNotes,
        };

        // Update the order
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: updateData.status,
            paymentStatus: updateData.paymentStatus,
            paymentMethod: updateData.paymentMethod,
            paymentReference: updateData.paymentReference,
            notes: updateData.notes,
          },
        });

        // Create timeline event
        await prisma.orderTimelineEvent.create({
          data: {
            orderId,
            type: "STATUS_CHANGE",
            message: this.getStatusDescription(statusData.status!),
            data: {
              oldStatus: currentOrder.status,
              newStatus: statusData.status,
              notes: statusData.adminNotes,
              updatedBy: statusData.updatedBy,
            },
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
                    orderBy: { position: "asc" },
                    take: 1,
                    select: { url: true },
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
        totalAmount: Number(order.total),
        currency: order.currency,
        itemCount: order._count.items,
        customerName: `${order.user.firstName} ${order.user.lastName}`,
        createdAt: order.createdAt,
        estimatedDelivery: undefined, // Field not in schema
      }));

      return {
        orders,
        pagination: {
          page: result.pagination.currentPage,
          limit: result.pagination.itemsPerPage,
          total: result.pagination.totalItems,
          totalPages: result.pagination.totalPages,
        },
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
                    orderBy: { position: "asc" },
                    take: 1,
                    select: { url: true },
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
        totalAmount: Number(order.total),
        currency: order.currency,
        itemCount: order._count.items,
        customerName: "", // Not needed for user's own orders
        createdAt: order.createdAt,
        estimatedDelivery: undefined, // Field not in schema
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
        totalAmount: Number(order.total),
        currency: order.currency,
        itemCount: order._count.items,
        customerName: `${order.user.firstName} ${order.user.lastName}`,
        createdAt: order.createdAt,
        estimatedDelivery: undefined, // Field not in schema
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
            paymentStatus: PrismaPaymentStatus.PENDING,
            createdAt: { lt: oneDayAgo },
          }),
          // Orders in processing for more than 3 days
          this.getOrderSummaries({
            status: PrismaOrderStatus.PROCESSING,
            createdAt: { lt: threeDaysAgo },
          }),
          // Shipped orders without delivery confirmation after estimated delivery
          // Note: estimatedDelivery field doesn't exist in schema
          // this.getOrderSummaries({
          //   status: PrismaOrderStatus.SHIPPED, 
          //   estimatedDelivery: { lt: now },
          // }),
          [],
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

        const nonCancellableStatuses: PrismaOrderStatus[] = [
          PrismaOrderStatus.DELIVERED, 
          PrismaOrderStatus.CANCELLED, 
          PrismaOrderStatus.REFUNDED
        ];
        if (nonCancellableStatuses.includes(order.status)) {
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
            status: PrismaOrderStatus.CANCELLED,
            notes: reason,
          },
        });

        // Create timeline event
        await prisma.orderTimelineEvent.create({
          data: {
            orderId,
            type: "ORDER_CANCELLED",
            message: "Order cancelled",
            data: {
              reason,
              cancelledBy,
            },
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
   * Find verified purchase for review
   */
  async findVerifiedPurchase(
    userId: string,
    productId: string
  ): Promise<{ orderId: string } | null> {
    try {
      const order = await this.findFirst(
        {
          userId,
          status: PrismaOrderStatus.DELIVERED,
          paymentStatus: PrismaPaymentStatus.COMPLETED,
          items: {
            some: {
              productId,
            },
          },
        },
        {
          select: {
            id: true,
          },
        }
      );

      return order ? { orderId: order.id } : null;
    } catch (error) {
      this.handleError("Error finding verified purchase", error);
      return null;
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
          status: { not: PrismaOrderStatus.CANCELLED },
        },
        {
          _count: { id: true },
          _sum: { total: true },
        }
      );

      return {
        totalOrders: result._count.id,
        totalSpent: Number(result._sum.total) || 0,
      };
    } catch (error) {
      return { totalOrders: 0, totalSpent: 0 };
    }
  }

  private getStatusDescription(status: PrismaOrderStatus): string {
    const descriptions: Record<PrismaOrderStatus, string> = {
      [PrismaOrderStatus.PENDING]: "Order is pending confirmation",
      [PrismaOrderStatus.CONFIRMED]: "Order has been confirmed",
      [PrismaOrderStatus.PROCESSING]: "Order is being processed",
      [PrismaOrderStatus.SHIPPED]: "Order has been shipped",
      [PrismaOrderStatus.DELIVERED]: "Order has been delivered",
      [PrismaOrderStatus.CANCELLED]: "Order has been cancelled",
      [PrismaOrderStatus.REFUNDED]: "Order has been refunded",
    };

    return (
      descriptions[status] ||
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
        { ...where, status: { not: PrismaOrderStatus.CANCELLED } },
        {
          _count: { id: true },
          _sum: { total: true },
        }
      );

      const totalOrders = result._count.id;
      const totalRevenue = Number(result._sum.total) || 0;
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
        totalAmount: Number(order.total),
        currency: order.currency,
        itemCount: order._count.items,
        customerName: `${order.user.firstName} ${order.user.lastName}`,
        createdAt: order.createdAt,
        estimatedDelivery: undefined, // Field not in schema
      }));
    } catch (error) {
      return [];
    }
  }

  private async getRevenue(where: any): Promise<number> {
    try {
      const result = await this.aggregate(
        { ...where, status: { not: PrismaOrderStatus.CANCELLED } },
        { _sum: { total: true } }
      );
      return Number(result._sum.total) || 0;
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
