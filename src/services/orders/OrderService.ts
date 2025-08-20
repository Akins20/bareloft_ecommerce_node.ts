import { BaseService } from "../BaseService";
import { OrderRepository } from "../../repositories/OrderRepository";
import { UserRepository } from "../../repositories/UserRepository";
import { CartService } from "../cart/CartService";
import {
  OrderEmailService,
  OrderData,
} from "../notifications/OrderEmailService";
import { NotificationService } from "../notifications/NotificationService";
import { PaystackService } from "../payments/PaystackService";
import { JobService } from "../jobs/JobService";
import { GlobalJobService } from "../../utils/globalJobService";
import {
  Order,
  OrderStatus,
  CreateOrderRequest,
  PaymentOrderResponse,
  OrderResponse,
  UpdateOrderStatusRequest,
  OrderListQuery,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
  PaginationMeta,
} from "../../types";
import { 
  NotificationType, 
  NotificationChannel,
  NotificationPriority 
} from "../../types/notification.types";
import { JobPriority } from "../../types/job.types";
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

export interface OrderListResponse {
  success: boolean;
  message: string;
  orders: Order[];
  pagination: PaginationMeta;
}

export class OrderService extends BaseService {
  private orderRepository: OrderRepository;
  private userRepository: UserRepository;
  private cartService: CartService;
  private orderEmailService: OrderEmailService;
  private notificationService: NotificationService;
  private paystackService: PaystackService;
  private jobService: JobService;
  private productRepository: any; // Will be injected for product validation

  constructor(
    orderRepository?: OrderRepository,
    userRepository?: UserRepository,
    cartService?: CartService,
    orderEmailService?: OrderEmailService,
    notificationService?: NotificationService,
    productRepository?: any
  ) {
    super();
    this.orderRepository = orderRepository || ({} as OrderRepository);
    this.userRepository = userRepository || ({} as UserRepository);
    this.cartService = cartService || ({} as CartService);
    this.orderEmailService = orderEmailService || new OrderEmailService();
    this.notificationService = notificationService || new NotificationService();
    this.paystackService = new PaystackService();
    this.jobService = new JobService(); // Will be replaced by global instance when needed
    this.productRepository = productRepository || ({} as any);
  }


  /**
   * Create a new order from cart
   */
  async createOrder(
    userId: string,
    request: CreateOrderRequest
  ): Promise<PaymentOrderResponse> {
    try {
      console.log("\n🎯 ===== AUTHENTICATED ORDER CREATION STARTED =====");
      console.log("📥 INCOMING ORDER DATA:", JSON.stringify(request, null, 2));

      // Get user data for notifications and order processing
      let userData: any = null;
      try {
        userData = await this.userRepository.findById?.(userId);
        console.log("👤 User data retrieved for order creation");
      } catch (userError) {
        console.warn("⚠️ Could not retrieve user data, using defaults:", userError.message);
      }

      const userEmailAddress = userData?.email || '';
      const userFirstName = userData?.firstName || 'Valued Customer';

      // Priority: Use cart data from request body if provided (frontend cart sync)
      // Fallback: Get cart items from backend cart service if no cartData provided
      let cartSummary;

      if (
        request.cartData &&
        request.cartData.items &&
        request.cartData.items.length > 0
      ) {
        console.log(
          "🛒 Using cart data from request body (frontend cart sync)"
        );
        cartSummary = {
          items: request.cartData.items,
          subtotal: request.cartData.subtotal || 0,
          total: request.cartData.subtotal || 0,
          itemCount: request.cartData.items.length,
        };
      } else {
        console.log(
          "🛒 Fallback: Fetching cart data from backend cart service"
        );
        cartSummary = (await this.cartService.getCart?.(userId)) || {
          items: [],
          subtotal: 0,
          total: 0,
          itemCount: 0,
        };
      }

      console.log("🛒 CART SUMMARY:", JSON.stringify(cartSummary, null, 2));

      if (!cartSummary.items || cartSummary.items.length === 0) {
        console.error("❌ Cart is empty!");
        throw new AppError(
          "Cart is empty. Please add items before checkout.",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Generate order number
      const orderNumber = await this.generateOrderNumber();
      console.log("📋 Generated order number:", orderNumber);

      // Calculate totals (tax is included in product prices)
      const subtotal = cartSummary.subtotal;
      const shippingAmount = this.calculateShippingAmount(
        subtotal,
        request.shippingAddress?.state
      );
      const discountAmount = request.couponCode
        ? await this.calculateDiscount(request.couponCode, subtotal)
        : 0;
      const totalAmount = subtotal + shippingAmount - discountAmount;

      console.log("💰 Subtotal (Kobo):", subtotal);
      console.log("🚚 Shipping (Kobo):", shippingAmount);
      console.log("💰 Final Total (Kobo):", totalAmount);

      // Amount is already in kobo, no conversion needed
      const amountInKobo = Math.round(totalAmount);
      console.log("💰 Amount in Kobo for Paystack:", amountInKobo);

      // Generate consistent payment reference (same format as PaymentService)
      const paymentReference = this.generatePaymentReference(orderNumber);

      // Create order data for immediate database save
      const orderData = {
        orderNumber,
        userId,
        status: "PENDING" as any,
        subtotal,
        shippingCost: shippingAmount,
        discount: discountAmount,
        total: totalAmount,
        currency: "NGN",
        paymentStatus: "PENDING" as any,
        paymentMethod: request.paymentMethod || "CARD",
        paymentReference: paymentReference, // Use the same reference sent to Paystack
        notes: request.customerNotes || `Order created by authenticated user. Shipping to ${request.shippingAddress.city}, ${request.shippingAddress.state}.`,
      };

      // Convert cart items to order items format for database
      const orderItems = cartSummary.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.unitPrice || item.product?.price || 0,
        total:
          item.totalPrice ||
          item.quantity * (item.unitPrice || item.product?.price || 0),
      }));

      console.log("💾 Step 4: Saving order to database with PENDING status...");
      console.log("📦 Order data:", JSON.stringify(orderData, null, 2));
      console.log("📦 Order items:", JSON.stringify(orderItems, null, 2));

      // Create order in database with items
      const order = await this.orderRepository.createOrderWithItems?.(
        orderData,
        orderItems
      );

      if (!order || !order.id) {
        throw new AppError(
          "Failed to create order in database",
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_CODES.INTERNAL_ERROR
        );
      }

      console.log("✅ Order saved to database with ID:", order.id);

      // Clear user's orders cache since a new order was created
      await this.clearUserOrdersCache(userId);

      // Create initial timeline event
      await this.createTimelineEvent(
        order.id,
        "ORDER_CREATED",
        "Order created and pending payment",
        userId
      );

      console.log("✅ Order timeline event created");

      // Clear cart after successful order creation (user committed to purchase)
      try {
        await this.cartService.clearCart?.(userId);
        console.log("✅ User cart cleared after order creation");
      } catch (cartError) {
        console.warn("⚠️ Failed to clear cart:", cartError);
        // Don't fail the order creation if cart clear fails
      }

      // Prepare order summary for frontend using actual database order
      const orderSummary = {
        id: order.id,
        orderNumber: order.orderNumber,
        items: cartSummary.items.map((item: any) => ({
          productId: item.productId,
          productName: item.product?.name || "Unknown Product",
          productSku: item.product?.sku || "UNKNOWN",
          quantity: item.quantity,
          unitPrice: item.unitPrice || item.product?.price || 0,
          totalPrice:
            item.totalPrice ||
            item.quantity * (item.unitPrice || item.product?.price || 0),
        })),
        pricing: {
          subtotal: order.subtotal,
          shipping: order.shippingCost,
          discount: order.discount || 0,
          total: order.total,
          currency: order.currency,
        },
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      };

      // Initialize Paystack payment for customer order (same as guest flow)
      console.log(
        "✅ Order created in database, initializing Paystack payment..."
      );

      // Get user email for payment
      let paymentEmail = "customer@bareloft.com";
      if ((request.shippingAddress as any)?.email) {
        paymentEmail = (request.shippingAddress as any).email;
      }

      // Initialize Paystack payment
      console.log(
        "🔄 BACKEND: Initializing Paystack transaction for customer..."
      );
      
      const paystackResponse = await this.paystackService.initializePayment({
        amount: amountInKobo * 100,
        email: paymentEmail,
        reference: paymentReference,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          userId: userId,
          customerEmail: paymentEmail,
          items: cartSummary.items.length,
          // Include basic order info for webhook fallback
          _orderRef: order.orderNumber,
        },
      });
      console.log(`✅ BACKEND: Paystack response:`, paystackResponse);
      console.log(
        `🔍 DEBUG: Paystack response structure:`,
        JSON.stringify(paystackResponse, null, 2)
      );
      console.log(
        `🔍 DEBUG: authorization_url:`,
        paystackResponse.data?.authorization_url
      );
      console.log(`🔍 DEBUG: access_code:`, paystackResponse.data?.access_code);

      const authorizationUrl = paystackResponse.data?.authorization_url;
      const accessCode = paystackResponse.data?.access_code;

      console.log(`🔍 DEBUG: Final authorization_url:`, authorizationUrl);
      console.log(`🔍 DEBUG: Final access_code:`, accessCode);

      // Schedule payment verification job (1 minute delay to allow payment processing)
      console.log("⏰ Scheduling payment verification job...");
      try {
        const jobService = await GlobalJobService.getInstance();
        await jobService.addPaymentVerificationJob({
          paymentReference: order.orderNumber,
          orderId: order.id,
          orderNumber: order.orderNumber,
          attemptNumber: 1,
          maxAttempts: 10,
          userId: userId,
          email: paymentEmail,
          amount: amountInKobo,
          currency: "NGN",
          priority: JobPriority.MEDIUM,
        }, JobPriority.MEDIUM, { 
          delay: 1 * 60 * 1000 // 1 minute delay
        });
        
        console.log(`✅ Payment verification job scheduled for order ${order.orderNumber}`);
      } catch (jobError) {
        console.warn("⚠️ Failed to schedule payment verification job:", jobError);
        // Don't fail the order creation if job scheduling fails
      }

      // Send order confirmation notification to user
      try {
        await this.sendOrderNotification(
          userId,
          userEmailAddress,
          userFirstName || 'Valued Customer',
          NotificationType.ORDER_CONFIRMATION,
          order.orderNumber,
          'PENDING',
          amountInKobo
        );
      } catch (notificationError) {
        console.warn("⚠️ Failed to send order confirmation notification:", notificationError);
        // Don't fail the order creation if notification fails
      }

      return {
        success: true,
        message:
          "Customer order created successfully. Redirecting to payment...",
        order: orderSummary,
        payment: {
          reference: order.orderNumber, // Use order number as payment reference
          amount: amountInKobo,
          currency: "NGN",
          email: paymentEmail,
          authorization_url: authorizationUrl,
          access_code: accessCode,
        },
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
      const { page = 1, limit = 5, status, startDate, endDate } = params;

      // Create cache key based on parameters
      const cacheKey = `user_orders:${userId}:p${page}:l${limit}:${status || 'all'}:${startDate || ''}:${endDate || ''}`;
      
      // Try to get from Redis cache first
      try {
        const cached = await redisClient.get<OrderListResponse>(cacheKey);
        if (cached) {
          console.log(`📋 [CACHE HIT] User orders loaded from Redis for user ${userId}`);
          return cached;
        }
      } catch (cacheError) {
        console.warn("❌ Redis cache read failed, proceeding with database query:", cacheError.message);
      }

      // Build query parameters
      const query = {
        userId,
        status: status as any,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      };

      // Get orders using repository with proper userId filtering
      const result = (await this.orderRepository.findMany?.(query, {
        pagination: { page, limit },
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  images: {
                    orderBy: { position: "asc" },
                    take: 1,
                    select: { url: true, altText: true },
                  },
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
        },
      })) || {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: limit,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      const response = {
        success: true,
        message: "Orders retrieved successfully",
        orders: result.data,
        pagination: result.pagination,
      };

      // Cache the result in Redis (cache for 10 minutes)
      try {
        await redisClient.set(cacheKey, response, 10 * 60); // 10 minutes
        console.log(`📋 [CACHE SET] User orders cached in Redis for user ${userId}`);
      } catch (cacheError) {
        console.warn("❌ Redis cache write failed:", cacheError.message);
      }

      return response;
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
      const previousStatus = order.status;

      // Update order status
      const updatedOrder =
        (await this.orderRepository.update?.(orderId, {
          status: status as any,
          notes: adminNotes,
        })) || order;

      // Create timeline event
      await this.createTimelineEvent(
        orderId,
        "STATUS_UPDATED",
        this.getStatusDescription(status),
        updatedBy || "ADMIN",
        adminNotes
      );

      // Send status update email notification
      try {
        const orderEmailData = this.mapOrderToEmailData(updatedOrder);
        await this.orderEmailService.sendOrderStatusUpdateEmail(
          orderEmailData,
          previousStatus?.toString()
        );
      } catch (emailError) {
        // Log email error but don't fail the order update
        console.error("Failed to send status update email:", emailError);
      }

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

      if (
        order.status === OrderStatus.DELIVERED ||
        order.status === OrderStatus.CANCELLED
      ) {
        throw new AppError(
          "Cannot cancel this order",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.ORDER_CANNOT_BE_CANCELLED
        );
      }

      // Update order status
      const updatedOrder =
        (await this.orderRepository.update?.(orderId, {
          status: "CANCELLED" as any,
          notes: reason,
        })) || order;

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
      const result = await this.orderRepository.findMany?.(
        {},
        {
          pagination: { page: 1, limit: 100 },
        }
      );

      const userOrders =
        result?.data.filter((order: any) => order.userId === userId) || [];

      const totalOrders = userOrders.length;
      const completedOrders = userOrders.filter(
        (o: any) => o.paymentStatus === "COMPLETED"
      );
      const totalSpent = completedOrders.reduce(
        (sum: number, order: any) => sum + (order.total || 0),
        0
      );
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

      // Count orders by status
      const ordersByStatus = userOrders.reduce(
        (acc: Record<string, number>, order: any) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        },
        {}
      );

      // Get recent orders (last 5)
      const recentOrders = userOrders
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
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
    // Fixed ₦2,500 shipping fee - no free shipping threshold
    return 2500;
  }

  private async calculateDiscount(
    couponCode: string,
    subtotal: number
  ): Promise<number> {
    // Simple discount calculation - in production, use CouponService
    const discountMap: Record<string, number> = {
      SAVE10: 0.1,
      SAVE20: 0.2,
      NEWUSER: 0.15,
      WELCOME: 0.05,
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
      const existing = (await redisClient.get<any[]>(key)) || [];
      existing.push(eventData);
      await redisClient.set(key, existing, 30 * 24 * 60 * 60); // 30 days
    } catch (error) {
      console.error("Failed to store timeline event:", error);
    }
  }

  /**
   * Clear user orders cache when orders are created or updated
   */
  private async clearUserOrdersCache(userId: string): Promise<void> {
    try {
      // Clear common cache combinations for this user
      const commonKeys = [
        `user_orders:${userId}:p1:l5:all::`,
        `user_orders:${userId}:p1:l10:all::`,
        `user_orders:${userId}:p1:l20:all::`,
        `user_orders:${userId}:p1:l5:PENDING::`,
        `user_orders:${userId}:p1:l5:CONFIRMED::`,
        `user_orders:${userId}:p1:l5:PROCESSING::`,
        `user_orders:${userId}:p1:l5:SHIPPED::`,
        `user_orders:${userId}:p1:l5:DELIVERED::`,
        `user_orders:${userId}:p1:l5:CANCELLED::`,
      ];

      await Promise.all(
        commonKeys.map(async (key) => {
          try {
            await redisClient.delete(key);
          } catch (error) {
            // Ignore individual deletion errors
          }
        })
      );

      console.log(`📋 [CACHE CLEAR] User orders cache cleared for user ${userId}`);
    } catch (error) {
      console.warn("❌ Failed to clear user orders cache:", error.message);
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
   * Send order-related notifications to user
   */
  private async sendOrderNotification(
    userId: string,
    userEmail: string,
    userFirstName: string,
    notificationType: NotificationType,
    orderNumber: string,
    orderStatus: string,
    amount?: number,
    additionalData?: any
  ): Promise<void> {
    try {
      const notificationMessage = this.getNotificationMessage(notificationType, orderNumber, orderStatus, amount);
      
      await this.notificationService.sendNotification({
        userId,
        type: notificationType,
        channel: NotificationChannel.EMAIL,
        recipient: {
          email: userEmail,
          name: userFirstName || 'Valued Customer',
        },
        variables: {
          orderNumber,
          orderStatus,
          amount: amount ? `₦${(amount / 100).toLocaleString()}` : undefined,
          customerName: userFirstName || 'Valued Customer',
          ...additionalData
        },
        priority: NotificationPriority.HIGH
      });

      console.log(`📧 Order notification sent: ${notificationType} for order ${orderNumber} to ${userEmail}`);
    } catch (error) {
      console.error(`❌ Failed to send order notification: ${notificationType} for order ${orderNumber}:`, error);
    }
  }

  private getNotificationMessage(
    type: NotificationType, 
    orderNumber: string, 
    status: string, 
    amount?: number
  ): string {
    switch (type) {
      case NotificationType.ORDER_CONFIRMATION:
        return `Your order #${orderNumber} has been confirmed${amount ? ` for ₦${(amount / 100).toLocaleString()}` : ''}. We're preparing your items for shipment.`;
      case NotificationType.ORDER_SHIPPED:
        return `Great news! Your order #${orderNumber} has been shipped and is on its way to you.`;
      case NotificationType.ORDER_DELIVERED:
        return `Your order #${orderNumber} has been successfully delivered. We hope you love your purchase!`;
      case NotificationType.ORDER_CANCELLED:
        return `Your order #${orderNumber} has been cancelled. If you didn't request this, please contact our support team.`;
      case NotificationType.PAYMENT_SUCCESSFUL:
        return `Payment confirmed for order #${orderNumber}${amount ? ` (₦${(amount / 100).toLocaleString()})` : ''}. Your order is being processed.`;
      case NotificationType.PAYMENT_FAILED:
        return `Payment failed for order #${orderNumber}. Please try again or use a different payment method.`;
      default:
        return `Order #${orderNumber} status update: ${status}`;
    }
  }

  /**
   * Create guest order from current cart (no user authentication required)
   */
  async createGuestOrder(orderData: any): Promise<any> {
    console.log("\n🎯 ===== GUEST ORDER CREATION STARTED =====");
    console.log("📥 INCOMING ORDER DATA:", JSON.stringify(orderData, null, 2));

    try {
      console.log("🔄 Step 1: Processing cart data...");
      // Get session ID from request - multiple possible sources
      const sessionId = orderData.sessionId || 
                       orderData.guestSessionId ||
                       orderData.headers?.['x-session-id'] ||
                       "guest-" + Date.now(); // Fallback session ID
      console.log("🆔 Session ID:", sessionId);

      // Get guest cart data from cart service if available, otherwise use provided cart data
      let cartData;
      try {
        console.log("🔄 Attempting to retrieve guest cart from session...");
        // Use the existing cart service if available
        if (this.cartService && typeof this.cartService.getGuestCart === 'function') {
          const guestCart = await this.cartService.getGuestCart(sessionId);
          console.log("✅ Retrieved guest cart from service:", JSON.stringify(guestCart, null, 2));
          
          cartData = {
            items: guestCart.items || [],
            subtotal: guestCart.subtotal || 0,
            estimatedTax: guestCart.estimatedTax || 0,
            estimatedShipping: guestCart.estimatedShipping || 0,
            estimatedTotal: guestCart.estimatedTotal || guestCart.subtotal || 0,
          };
        } else {
          console.log("⚠️ Cart service not available, using provided cart data");
          cartData = orderData.cartData || {
            items: [],
            subtotal: 0,
            estimatedTax: 0,
            estimatedShipping: 0,
            estimatedTotal: 0,
          };
        }
      } catch (cartError) {
        console.warn("⚠️ Error retrieving guest cart, falling back to provided cart data:", cartError);
        cartData = orderData.cartData || {
          items: [],
          subtotal: 0,
          estimatedTax: 0,
          estimatedShipping: 0,
          estimatedTotal: 0,
        };
      }

      console.log("🛒 FINAL CART DATA:", JSON.stringify(cartData, null, 2));

      if (!cartData.items || cartData.items.length === 0) {
        console.error("❌ Cart is empty!");
        throw new AppError(
          "Cart is empty. Please add items to your cart before checkout.",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT
        );
      }

      console.log("🔄 Step 2: Generating order number...");
      // Generate unique order number
      const orderNumber = await this.generateOrderNumber();
      console.log("📋 Generated order number:", orderNumber);

      console.log("🔄 Step 3: Calculating totals...");
      // Recalculate totals based on cart data and shipping address
      // All calculations should be in naira, then convert to kobo for Paystack
      // Tax is included in product prices, so no separate tax calculation
      const subtotal = Number(cartData.subtotal) || 0;
      const shippingAmount = this.calculateShippingAmount(
        subtotal,
        orderData.shippingAddress?.state
      );
      const finalTotal = subtotal + shippingAmount;
      console.log("💰 Subtotal (Kobo):", subtotal);
      console.log("🚚 Shipping (Kobo):", shippingAmount);
      console.log("💰 Final Total (Kobo):", finalTotal);

      // Amount is already in kobo, no conversion needed
      const amountInKobo = Math.round(finalTotal);
      console.log("💰 Amount in Kobo for Paystack:", amountInKobo);

      console.log("🔄 Step 4: Setting up guest order user reference...");
      // For guest orders, we need a userId for the schema constraint
      // Let's use a special guest user or create one if it doesn't exist
      let guestUserId: string;
      try {
        // Try to find the special guest user
        const guestUser =
          await this.userRepository.findByEmail?.("guest@bareloft.com");
        if (guestUser) {
          guestUserId = guestUser.id;
          console.log("✅ Using existing guest user ID:", guestUserId);
        } else {
          // Create a special guest user for all guest orders
          console.log("🆕 Creating special guest user for orders...");
          const specialGuestUser = await this.userRepository.createUser?.({
            email: "guest@bareloft.com",
            firstName: "Guest",
            lastName: "User",
            phoneNumber: undefined,
            role: "CUSTOMER" as const,
          });
          guestUserId = specialGuestUser?.id || "";
          console.log("✅ Created special guest user ID:", guestUserId);
        }

        if (!guestUserId) {
          throw new Error("Failed to get guest user ID");
        }

        console.log("👤 Actual guest info (stored in order notes):", {
          email: orderData.guestInfo.email,
          firstName: orderData.guestInfo.firstName,
          lastName: orderData.guestInfo.lastName,
          phone: orderData.guestInfo.phone,
        });
      } catch (error) {
        console.error("❌ Failed to set up guest user reference:", error);
        throw new AppError(
          "Failed to process guest order",
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_CODES.INTERNAL_ERROR
        );
      }
      console.log("✅ Step 4 Complete: Guest user reference set up");

      console.log("🔄 Step 5: Converting cart items to order items...");
      // Convert cart items to order items format for createOrderWithItems
      const orderItems = cartData.items.map((item: any, index: number) => {
        console.log(`📦 Item ${index + 1}:`, {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          productPrice: item.product?.price,
          totalPrice: item.totalPrice,
        });

        return {
          productId: item.productId,
          quantity: item.quantity,
          price: item.unitPrice || item.product?.price || 0,
          total:
            item.totalPrice ||
            item.quantity * (item.unitPrice || item.product?.price || 0),
        };
      });
      console.log(
        "✅ Step 5 Complete: Order items converted:",
        JSON.stringify(orderItems, null, 2)
      );

      console.log("🔄 Step 6: Preparing database order data...");
      // Create actual order in database with items
      
      // Generate consistent payment reference (same format as PaymentService)
      const guestPaymentReference = this.generatePaymentReference(orderNumber);
      
      // Create user-friendly notes for guest order
      const guestNotes = `Guest order placed by ${orderData.guestInfo.firstName} ${orderData.guestInfo.lastName} (${orderData.guestInfo.email}). Shipping to ${orderData.shippingAddress.city}, ${orderData.shippingAddress.state}.`;

      const dbOrderData = {
        orderNumber,
        userId: guestUserId, // Special guest user ID for schema constraint
        status: "PENDING" as any,
        subtotal,
        shippingCost: shippingAmount,
        discount: 0,
        total: finalTotal,
        currency: "NGN",
        paymentStatus: "PENDING" as any,
        paymentMethod: "CARD",
        paymentReference: guestPaymentReference, // Use the same reference sent to Paystack
        notes: guestNotes, // Store user-friendly guest order info
      };
      console.log(
        "✅ Step 6 Complete: DB order data prepared:",
        JSON.stringify(dbOrderData, null, 2)
      );

      console.log(
        "💾 Step 7: Saving guest order to database with PENDING status..."
      );
      console.log(`📦 DB ORDER DATA:`, JSON.stringify(dbOrderData, null, 2));
      console.log(`📦 ORDER ITEMS:`, JSON.stringify(orderItems, null, 2));

      // Create guest order in database with items
      const order = await this.orderRepository.createOrderWithItems?.(
        dbOrderData,
        orderItems
      );

      if (!order || !order.id) {
        throw new AppError(
          "Failed to create guest order in database",
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_CODES.INTERNAL_ERROR
        );
      }

      console.log("✅ Guest order saved to database with ID:", order.id);

      // Create initial timeline event
      await this.createTimelineEvent(
        order.id,
        "ORDER_CREATED",
        "Guest order created and pending payment",
        guestUserId // Use guest user ID for timeline event
      );

      console.log("✅ Guest order timeline event created");
      console.log("✅ Step 7 Complete: Guest order saved to database");

      // Prepare order data for frontend response using actual database order
      const orderSummary = {
        id: order.id,
        orderNumber: order.orderNumber,
        items: cartData.items.map((item: any) => ({
          productId: item.productId,
          productName: item.product?.name || "Unknown Product",
          productSku: item.product?.sku || "UNKNOWN",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        pricing: {
          subtotal: order.subtotal,
          shipping: order.shippingCost,
          discount: order.discount || 0,
          total: order.total,
          currency: order.currency,
        },
        customer: {
          email: orderData.guestInfo.email,
          firstName: orderData.guestInfo.firstName,
          lastName: orderData.guestInfo.lastName,
          phone: orderData.guestInfo.phone,
        },
        addresses: {
          shipping: orderData.shippingAddress,
          billing: orderData.billingAddress || orderData.shippingAddress,
        },
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      };

      // Store pending order data in Redis for webhook retrieval
      console.log(
        "💾 Storing pending order data in Redis for webhook retrieval..."
      );
      const pendingOrderKey = `pending_order:${orderNumber}`;
      const pendingOrderData = {
        orderData: dbOrderData,
        orderItems: orderItems,
      };

      try {
        await redisClient.set(pendingOrderKey, pendingOrderData, 24 * 60 * 60); // Store for 24 hours
        console.log(
          `✅ Pending order data stored in Redis with key: ${pendingOrderKey}`
        );
      } catch (error) {
        console.error("❌ Failed to store pending order data in Redis:", error);
        // Continue without failing - webhook will need to handle missing data
      }

      // Initialize payment with Paystack
      console.log(
        `💳 BACKEND: Initializing Paystack payment for ${orderNumber}, amount: ${amountInKobo} kobo`
      );
      const paystackResponse = await this.paystackService.initializePayment({
        email: orderData.guestInfo.email,
        amount: amountInKobo,
        reference: guestPaymentReference,
        currency: "NGN",
        metadata: {
          orderNumber,
          customerName: `${orderData.guestInfo.firstName} ${orderData.guestInfo.lastName}`,
          items: cartData.items.length,
          // Include basic order info for webhook fallback
          _orderRef: orderNumber,
        },
      });
      console.log(`✅ BACKEND: Paystack response:`, paystackResponse);
      console.log(
        `🔍 DEBUG: Paystack response structure:`,
        JSON.stringify(paystackResponse, null, 2)
      );
      console.log(
        `🔍 DEBUG: authorization_url:`,
        paystackResponse.data?.authorization_url
      );
      console.log(`🔍 DEBUG: access_code:`, paystackResponse.data?.access_code);

      const authorizationUrl = paystackResponse.data?.authorization_url;
      const accessCode = paystackResponse.data?.access_code;

      console.log(`🔍 DEBUG: Final authorization_url:`, authorizationUrl);
      console.log(`🔍 DEBUG: Final access_code:`, accessCode);

      // Schedule payment verification job for guest order (1 minute delay)
      console.log("⏰ Scheduling payment verification job for guest order...");
      try {
        const jobService = await GlobalJobService.getInstance();
        await jobService.addPaymentVerificationJob({
          paymentReference: order.orderNumber,
          orderId: order.id,
          orderNumber: order.orderNumber,
          attemptNumber: 1,
          maxAttempts: 10,
          userId: undefined, // Guest order has no userId
          email: orderData.guestInfo.email,
          amount: amountInKobo,
          currency: "NGN",
          priority: JobPriority.MEDIUM,
        }, JobPriority.MEDIUM, { 
          delay: 1 * 60 * 1000 // 1 minute delay
        });
        
        console.log(`✅ Payment verification job scheduled for guest order ${order.orderNumber}`);
      } catch (jobError) {
        console.warn("⚠️ Failed to schedule payment verification job for guest order:", jobError);
        // Don't fail the order creation if job scheduling fails
      }

      // Clear guest cart after successful order creation
      try {
        console.log("🔄 Step 8: Clearing guest cart after successful order creation...");
        if (this.cartService && typeof this.cartService.clearGuestCart === 'function') {
          await this.cartService.clearGuestCart(sessionId);
          console.log("✅ Guest cart cleared successfully");
        } else {
          console.log("⚠️ Cart service not available for clearing guest cart");
        }
      } catch (cartClearError) {
        console.warn("⚠️ Failed to clear guest cart (non-critical):", cartClearError);
        // Don't fail the order creation if cart clearing fails
      }

      return {
        success: true,
        message: "Guest order created successfully. Redirecting to payment...",
        order: orderSummary,
        payment: {
          reference: order.orderNumber, // Use order number as payment reference
          amount: amountInKobo,
          currency: "NGN",
          email: orderData.guestInfo.email,
          authorization_url: authorizationUrl,
          access_code: accessCode,
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        "Failed to create guest order",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Create order in database after payment confirmation
   */
  async createOrderAfterPayment(
    orderData: any,
    orderItems: any[],
    paymentReference: string
  ): Promise<any> {
    console.log("🎉 ===== CREATING ORDER AFTER SUCCESSFUL PAYMENT =====");
    console.log("📦 Order data:", JSON.stringify(orderData, null, 2));
    console.log("📋 Order items:", JSON.stringify(orderItems, null, 2));
    console.log("💳 Payment reference:", paymentReference);

    try {
      // Validate that all products exist before creating order
      console.log("🔍 Step 1: Validating products exist...");
      for (const item of orderItems) {
        console.log(`   - Checking product: ${item.productId}`);

        if (this.productRepository && this.productRepository.findById) {
          const product = await this.productRepository.findById(item.productId);
          if (!product) {
            console.error(`❌ Product not found: ${item.productId}`);
            throw new AppError(
              `Product with ID ${item.productId} not found`,
              HTTP_STATUS.BAD_REQUEST,
              ERROR_CODES.RESOURCE_NOT_FOUND
            );
          }

          // Also check if product is active and in stock
          if (!product.isActive) {
            console.error(`❌ Product is inactive: ${item.productId}`);
            throw new AppError(
              `Product ${product.name} is no longer available`,
              HTTP_STATUS.BAD_REQUEST,
              ERROR_CODES.INVALID_INPUT
            );
          }

          // Check stock availability
          if (product.stock < item.quantity) {
            console.error(
              `❌ Insufficient stock for product: ${item.productId}. Available: ${product.stock}, Requested: ${item.quantity}`
            );
            throw new AppError(
              `Insufficient stock for ${product.name}. Only ${product.stock} available, but ${item.quantity} requested`,
              HTTP_STATUS.BAD_REQUEST,
              ERROR_CODES.INVALID_INPUT
            );
          }

          console.log(
            `   ✅ Product validated: ${product.name} (Stock: ${product.stock})`
          );
        } else {
          console.warn(
            `⚠️ ProductRepository not available - skipping product validation for ${item.productId}`
          );
        }
      }
      console.log("✅ Step 1 Complete: All products validated successfully");

      // Update payment reference in order data
      orderData.paymentReference = paymentReference;
      orderData.paymentStatus = "COMPLETED";
      orderData.status = "CONFIRMED";

      console.log("🔄 Step 2: Creating order in database...");
      const savedOrder = await this.orderRepository.createOrderWithItems(
        orderData,
        orderItems
      );
      console.log(`✅ Step 2 Complete: Order saved with ID: ${savedOrder?.id}`);

      // Clear user's orders cache since a new order was created
      if (orderData.userId) {
        await this.clearUserOrdersCache(orderData.userId);
      }

      console.log("✅ Step 2.1 Complete: Order confirmed after payment");

      console.log("🔄 Step 3: Sending confirmation email...");
      try {
        const orderEmailData = this.mapOrderToEmailData(
          savedOrder,
          paymentReference
        );
        await this.orderEmailService.sendOrderConfirmationEmail(orderEmailData);
        console.log("✅ Step 3 Complete: Confirmation email sent");
      } catch (emailError) {
        console.error("❌ Failed to send confirmation email:", emailError);
        // Don't fail the order creation if email fails
      }

      console.log("🎉 ===== ORDER CREATION AFTER PAYMENT SUCCESSFUL =====");
      return {
        success: true,
        message: "Order created successfully after payment confirmation",
        order: savedOrder,
      };
    } catch (error) {
      console.error("❌ ===== ORDER CREATION AFTER PAYMENT FAILED =====");
      console.error("❌ Error:", error);
      throw new AppError(
        "Failed to create order after payment confirmation",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Confirm payment and send confirmation email
   */
  async confirmPayment(
    orderNumber: string,
    paymentReference?: string
  ): Promise<OrderResponse> {
    try {
      // Find order by order number
      const order =
        (await this.orderRepository.findByOrderNumber?.(orderNumber)) ||
        (await this.getOrderByNumber(orderNumber));

      if (!order) {
        throw new AppError(
          "Order not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Update payment status and order status
      const updatedOrder =
        (await this.orderRepository.update?.(order.id, {
          paymentStatus: "COMPLETED",
          status: "CONFIRMED",
          paymentReference: paymentReference,
        })) || order;

      // Create timeline event
      await this.createTimelineEvent(
        order.id,
        "PAYMENT_CONFIRMED",
        "Payment confirmed successfully",
        "PAYMENT_SYSTEM"
      );

      // Send order confirmation email
      try {
        const orderEmailData = this.mapOrderToEmailData(
          updatedOrder,
          paymentReference
        );
        await this.orderEmailService.sendOrderConfirmationEmail(orderEmailData);
      } catch (emailError) {
        // Log email error but don't fail the payment confirmation
        console.error("Failed to send order confirmation email:", emailError);
      }

      return {
        success: true,
        message: "Payment confirmed and order updated successfully",
        order: updatedOrder,
      };
    } catch (error) {
      this.handleError("Error confirming payment", error);
      throw error;
    }
  }

  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber: string, userId?: string): Promise<Order> {
    try {
      const order = await this.orderRepository.findByOrderNumber?.(orderNumber);

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
   * Track guest order and send comprehensive tracking email with full order details
   */
  async trackGuestOrder(orderNumber: string, email: string): Promise<any> {
    try {
      // Try to find the actual order by order number
      let order = null;
      let trackingData = null;

      try {
        // Attempt to fetch actual order from database
        order = await this.getOrderByNumber(orderNumber);

        // Validate that the email matches the order (basic security check)
        const orderEmail =
          order.user?.email || order.shippingAddress?.phoneNumber; // Fallback for guest orders
        if (orderEmail && orderEmail.toLowerCase() !== email.toLowerCase()) {
          // For security, don't reveal that order exists but email doesn't match
          throw new AppError(
            "Order not found",
            HTTP_STATUS.NOT_FOUND,
            ERROR_CODES.RESOURCE_NOT_FOUND
          );
        }
      } catch (error) {
        // If order is not found in database, it means payment hasn't been completed yet
        console.log(
          `Order ${orderNumber} not found in database - payment may not be completed yet`
        );
      }

      if (order) {
        // Use real order data
        trackingData = {
          orderNumber: order.orderNumber,
          status: order.status?.toString() || "PROCESSING",
          estimatedDelivery: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000
          ).toISOString(),
          trackingNumber: `TRK-${order.orderNumber}`,
          message: this.getStatusDescription(order.status as any),
          total: order.total,
          subtotal: order.subtotal,
          shipping: order.shippingCost,
          currency: order.currency || "NGN",
          items:
            order.items?.map((item: any) => ({
              name: item.product?.name || "Product",
              quantity: item.quantity,
              unitPrice: item.price,
              totalPrice: item.total,
              sku: item.product?.sku,
            })) || [],
          shippingAddress: order.shippingAddress
            ? {
                firstName: order.shippingAddress.firstName,
                lastName: order.shippingAddress.lastName,
                addressLine1: order.shippingAddress.addressLine1,
                addressLine2: order.shippingAddress.addressLine2,
                city: order.shippingAddress.city,
                state: order.shippingAddress.state,
                postalCode: order.shippingAddress.postalCode,
                phoneNumber: order.shippingAddress.phoneNumber,
              }
            : null,
          paymentMethod: order.paymentMethod,
          paymentReference: order.paymentReference,
          paymentStatus: order.paymentStatus?.toString(),
          orderDate: order.createdAt?.toLocaleDateString("en-NG"),
        };

        // Send comprehensive tracking email with full order details
        try {
          const orderEmailData = this.mapOrderToEmailData(order);
          // Override email for guest tracking
          if (orderEmailData.shippingAddress) {
            orderEmailData.shippingAddress.email = email;
          }
          if (!orderEmailData.guestInfo && !order.user) {
            orderEmailData.guestInfo = {
              email: email,
              firstName: order.shippingAddress?.firstName || "Valued Customer",
              lastName: order.shippingAddress?.lastName || "",
              phone: order.shippingAddress?.phoneNumber || "",
            };
          }

          await this.orderEmailService.sendOrderTrackingEmail(
            orderEmailData,
            email
          );
        } catch (emailError) {
          console.error(
            "Failed to send comprehensive tracking email:",
            emailError
          );
        }
      } else {
        // Order not found - payment may not be completed yet
        throw new AppError(
          `Order ${orderNumber} is not yet available. This typically means payment is still being processed or has not been completed. Please wait a few minutes and try again, or contact customer support if payment was completed.`,
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      return {
        success: true,
        message:
          "Order tracking information retrieved and comprehensive details sent to your email",
        data: trackingData,
      };
    } catch (error) {
      this.handleError("Error tracking guest order", error);
      throw error;
    }
  }

  /**
   * Map Order object to OrderData for email service
   */
  private mapOrderToEmailData(
    order: Order,
    paymentReference?: string
  ): OrderData {
    const estimatedDeliveryDate = new Date(
      Date.now() + 3 * 24 * 60 * 60 * 1000
    );

    // Extract guest information from order notes if it's a guest order
    let guestInfo = null;
    let customerEmail = order.user?.email || "";
    let customerFirstName = order.user?.firstName || "Valued Customer";
    let customerLastName = order.user?.lastName || "";

    if (order.notes) {
      // Only try to parse as JSON if it looks like JSON (starts with { or [)
      if (order.notes.trim().startsWith('{') || order.notes.trim().startsWith('[')) {
        try {
          const notesData = JSON.parse(order.notes);
          if (notesData.isGuestOrder) {
            guestInfo = {
              email: notesData.guestEmail || "",
              firstName: notesData.guestFirstName || "Valued Customer",
              lastName: notesData.guestLastName || "",
              phone: notesData.guestPhone || "",
            };
            customerEmail = notesData.guestEmail || customerEmail;
            customerFirstName = notesData.guestFirstName || customerFirstName;
            customerLastName = notesData.guestLastName || customerLastName;
          }
        } catch (error) {
          console.warn("Failed to parse order notes as JSON:", error);
        }
      }
      // If notes don't look like JSON, treat as plain text (no action needed)
    }

    return {
      orderNumber: order.orderNumber,
      status: order.status?.toString() || "PENDING",
      estimatedDelivery: estimatedDeliveryDate.toLocaleDateString("en-NG", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      trackingNumber: `TRK-${order.orderNumber}`,
      message: this.getStatusDescription(order.status as OrderStatus),
      total: order.total || 0,
      subtotal: order.subtotal || 0,
      shipping: order.shippingCost || 0,
      currency: order.currency || "NGN",
      orderDate:
        order.createdAt?.toLocaleDateString("en-NG") ||
        new Date().toLocaleDateString("en-NG"),
      createdAt: order.createdAt?.toISOString(),
      items:
        order.items?.map((item: any) => ({
          name: item.product?.name || "Product",
          quantity: item.quantity || 1,
          unitPrice: item.price || 0,
          totalPrice: item.total || 0,
          sku: item.product?.sku || "UNKNOWN",
          image: item.product?.images?.[0]?.url || null,
        })) || [],
      shippingAddress: order.shippingAddress
        ? {
            firstName: order.shippingAddress.firstName || customerFirstName,
            lastName: order.shippingAddress.lastName || customerLastName,
            email: customerEmail,
            phoneNumber:
              order.shippingAddress.phoneNumber || guestInfo?.phone || "",
            addressLine1: order.shippingAddress.addressLine1 || "",
            addressLine2: order.shippingAddress.addressLine2,
            city: order.shippingAddress.city || "",
            state: order.shippingAddress.state || "",
            postalCode: order.shippingAddress.postalCode,
          }
        : undefined,
      guestInfo: guestInfo,
      paymentMethod: order.paymentMethod?.toString(),
      paymentReference: paymentReference || order.paymentReference,
    };
  }

  /**
   * Generate payment reference (same format as PaymentService)
   */
  private generatePaymentReference(orderNumber: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${orderNumber}_${timestamp}_${random}`.toUpperCase();
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
