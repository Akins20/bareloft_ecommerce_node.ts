import { BaseService } from "../BaseService";
import { OrderRepository } from "../../repositories/OrderRepository";
import { UserRepository } from "../../repositories/UserRepository";
import { CartService } from "../cart/CartService";
import { OrderEmailService, OrderData } from "../notifications/OrderEmailService";
import { PaystackService } from "../payments/PaystackService";
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
  private userRepository: UserRepository;
  private cartService: CartService;
  private orderEmailService: OrderEmailService;
  private paystackService: PaystackService;
  private productRepository: any; // Will be injected for product validation

  constructor(orderRepository?: OrderRepository, userRepository?: UserRepository, cartService?: CartService, orderEmailService?: OrderEmailService, productRepository?: any) {
    super();
    this.orderRepository = orderRepository || {} as OrderRepository;
    this.userRepository = userRepository || {} as UserRepository;
    this.cartService = cartService || {} as CartService;
    this.orderEmailService = orderEmailService || new OrderEmailService();
    this.paystackService = new PaystackService();
    this.productRepository = productRepository || {} as any;
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

      // Calculate totals (tax is included in product prices)
      const subtotal = cartSummary.subtotal;
      const shippingAmount = this.calculateShippingAmount(subtotal, request.shippingAddress?.state);
      const discountAmount = request.couponCode ? await this.calculateDiscount(request.couponCode, subtotal) : 0;
      const totalAmount = subtotal + shippingAmount - discountAmount;

      // Create order data
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
      const previousStatus = order.status;

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

      // Send status update email notification
      try {
        const orderEmailData = this.mapOrderToEmailData(updatedOrder);
        await this.orderEmailService.sendOrderStatusUpdateEmail(
          orderEmailData, 
          previousStatus?.toString()
        );
      } catch (emailError) {
        // Log email error but don't fail the order update
        console.error('Failed to send status update email:', emailError);
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
    // Fixed ₦2,500 shipping fee - no free shipping threshold
    return 2500;
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
   * Create guest order from current cart (no user authentication required)
   */
  async createGuestOrder(orderData: any): Promise<any> {
    console.log("\n🎯 ===== GUEST ORDER CREATION STARTED =====");
    console.log("📥 INCOMING ORDER DATA:", JSON.stringify(orderData, null, 2));
    
    try {
      console.log("🔄 Step 1: Processing cart data...");
      // Get current cart data using session approach
      // Since we don't have userId for guest, we'll need to get cart from session
      const sessionId = orderData.sessionId || 'guest'; // Frontend should provide session ID
      console.log("🆔 Session ID:", sessionId);
      
      // For now, let's get cart data from the request or use mock data
      // Frontend should pass the current cart data in the checkout request
      const cartData = orderData.cartData || {
        items: [],
        subtotal: 0,
        estimatedTax: 0,
        estimatedShipping: 0,
        estimatedTotal: 0
      };
      console.log("🛒 CART DATA:", JSON.stringify(cartData, null, 2));

      if (!cartData.items || cartData.items.length === 0) {
        console.error("❌ Cart is empty!");
        throw new AppError(
          "Cart is empty. Please add items before checkout.",
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
      const shippingAmount = this.calculateShippingAmount(subtotal, orderData.shippingAddress?.state);
      const finalTotal = subtotal + shippingAmount;
      console.log("💰 Subtotal (Naira):", subtotal);
      console.log("🚚 Shipping (Naira):", shippingAmount);
      console.log("💰 Final Total (Naira):", finalTotal);

      // Convert to kobo for Paystack (multiply by 100)
      const amountInKobo = Math.round(finalTotal * 100);
      console.log("💰 Amount in Kobo for Paystack:", amountInKobo);

      console.log("🔄 Step 4: Setting up guest order user reference...");
      // For guest orders, we need a userId for the schema constraint
      // Let's use a special guest user or create one if it doesn't exist
      let guestUserId: string;
      try {
        // Try to find the special guest user
        const guestUser = await this.userRepository.findByEmail?.("guest@bareloft.com");
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
            role: "CUSTOMER" as const
          });
          guestUserId = specialGuestUser?.id || '';
          console.log("✅ Created special guest user ID:", guestUserId);
        }

        if (!guestUserId) {
          throw new Error("Failed to get guest user ID");
        }
        
        console.log("👤 Actual guest info (stored in order notes):", {
          email: orderData.guestInfo.email,
          firstName: orderData.guestInfo.firstName,
          lastName: orderData.guestInfo.lastName,
          phone: orderData.guestInfo.phone
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
          totalPrice: item.totalPrice
        });
        
        return {
          productId: item.productId,
          quantity: item.quantity,
          price: item.unitPrice || item.product?.price || 0,
          total: item.totalPrice || (item.quantity * (item.unitPrice || item.product?.price || 0)),
        };
      });
      console.log("✅ Step 5 Complete: Order items converted:", JSON.stringify(orderItems, null, 2));

      console.log("🔄 Step 6: Preparing database order data...");
      // Create actual order in database with items
      // Store guest info in notes as JSON for reference
      const guestInfoJson = JSON.stringify({
        isGuestOrder: true,
        guestEmail: orderData.guestInfo.email,
        guestFirstName: orderData.guestInfo.firstName,
        guestLastName: orderData.guestInfo.lastName,
        guestPhone: orderData.guestInfo.phone,
        shippingAddress: orderData.shippingAddress,
        billingAddress: orderData.billingAddress
      });

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
        notes: guestInfoJson, // Store actual guest info here
      };
      console.log("✅ Step 6 Complete: DB order data prepared:", JSON.stringify(dbOrderData, null, 2));

      console.log("🔄 Step 7: Preparing order data (NOT saving to database yet - will save after payment)");
      // We will NOT save the order to database here - only after payment is confirmed
      // This prevents orphaned orders from failed payments
      console.log(`📦 Order data prepared for post-payment creation:`);
      console.log(`   - DB ORDER DATA:`, JSON.stringify(dbOrderData, null, 2));
      console.log(`   - ORDER ITEMS:`, JSON.stringify(orderItems, null, 2));
      
      console.log("✅ Step 7 Complete: Order data prepared but NOT saved (will save after payment)");

      // Prepare order data for frontend response
      const orderSummary = {
        orderNumber,
        items: cartData.items.map((item: any) => ({
          productId: item.productId,
          productName: item.product?.name || "Unknown Product",
          productSku: item.product?.sku || "UNKNOWN",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        pricing: {
          subtotal: subtotal,
          shipping: shippingAmount,
          total: finalTotal,
          currency: "NGN"
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
        status: "PENDING"
      };

      // Store pending order data in Redis for webhook retrieval
      console.log("💾 Storing pending order data in Redis for webhook retrieval...");
      const pendingOrderKey = `pending_order:${orderNumber}`;
      const pendingOrderData = {
        orderData: dbOrderData,
        orderItems: orderItems
      };
      
      try {
        await redisClient.set(pendingOrderKey, pendingOrderData, 24 * 60 * 60); // Store for 24 hours
        console.log(`✅ Pending order data stored in Redis with key: ${pendingOrderKey}`);
      } catch (error) {
        console.error("❌ Failed to store pending order data in Redis:", error);
        // Continue without failing - webhook will need to handle missing data
      }

      // Initialize payment with Paystack
      console.log(`💳 BACKEND: Initializing Paystack payment for ${orderNumber}, amount: ${amountInKobo} kobo`);
      const paystackResponse = await this.paystackService.initializePayment({
        email: orderData.guestInfo.email,
        amount: amountInKobo,
        reference: orderNumber,
        currency: "NGN",
        callback_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/track?orderNumber=${orderNumber}&email=${orderData.guestInfo.email}`,
        metadata: {
          orderNumber,
          customerName: `${orderData.guestInfo.firstName} ${orderData.guestInfo.lastName}`,
          items: cartData.items.length,
          // Include basic order info for webhook fallback
          _orderRef: orderNumber
        }
      });
      console.log(`✅ BACKEND: Paystack response:`, paystackResponse);

      return {
        success: true,
        message: "Payment initialized successfully. Order will be created after payment confirmation.",
        order: orderSummary,
        payment: {
          paymentUrl: paystackResponse.data.authorization_url,
          reference: paystackResponse.data.reference,
          amount: amountInKobo, // Amount in kobo for Paystack
          currency: "NGN"
        },
        // Include cart data for frontend reference
        cartSummary: {
          itemCount: cartData.items.length,
          subtotal: subtotal,
          shipping: shippingAmount,
          total: finalTotal
        },
        // Store the order data for post-payment creation
        _pendingOrderData: {
          orderData: dbOrderData,
          orderItems: orderItems
        }
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
  async createOrderAfterPayment(orderData: any, orderItems: any[], paymentReference: string): Promise<any> {
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
            console.error(`❌ Insufficient stock for product: ${item.productId}. Available: ${product.stock}, Requested: ${item.quantity}`);
            throw new AppError(
              `Insufficient stock for ${product.name}. Only ${product.stock} available, but ${item.quantity} requested`,
              HTTP_STATUS.BAD_REQUEST,
              ERROR_CODES.INVALID_INPUT
            );
          }
          
          console.log(`   ✅ Product validated: ${product.name} (Stock: ${product.stock})`);
        } else {
          console.warn(`⚠️ ProductRepository not available - skipping product validation for ${item.productId}`);
        }
      }
      console.log("✅ Step 1 Complete: All products validated successfully");

      // Update payment reference in order data
      orderData.paymentReference = paymentReference;
      orderData.paymentStatus = "COMPLETED";
      orderData.status = "CONFIRMED";

      console.log("🔄 Step 2: Creating order in database...");
      const savedOrder = await this.orderRepository.createOrderWithItems(orderData, orderItems);
      console.log(`✅ Step 2 Complete: Order saved with ID: ${savedOrder?.id}`);

      console.log("🔄 Step 3: Sending confirmation email...");
      try {
        const orderEmailData = this.mapOrderToEmailData(savedOrder, paymentReference);
        await this.orderEmailService.sendOrderConfirmationEmail(orderEmailData);
        console.log("✅ Step 3 Complete: Confirmation email sent");
      } catch (emailError) {
        console.error('❌ Failed to send confirmation email:', emailError);
        // Don't fail the order creation if email fails
      }

      console.log("🎉 ===== ORDER CREATION AFTER PAYMENT SUCCESSFUL =====");
      return {
        success: true,
        message: "Order created successfully after payment confirmation",
        order: savedOrder
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
  async confirmPayment(orderNumber: string, paymentReference?: string): Promise<OrderResponse> {
    try {
      // Find order by order number
      const order = await this.orderRepository.findByOrderNumber?.(orderNumber) || 
                    await this.getOrderByNumber(orderNumber);

      if (!order) {
        throw new AppError(
          "Order not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Update payment status and order status
      const updatedOrder = await this.orderRepository.update?.(order.id, {
        paymentStatus: "COMPLETED",
        status: "CONFIRMED",
        paymentReference: paymentReference,
      }) || order;

      // Create timeline event
      await this.createTimelineEvent(
        order.id,
        "PAYMENT_CONFIRMED",
        "Payment confirmed successfully",
        "PAYMENT_SYSTEM"
      );

      // Send order confirmation email
      try {
        const orderEmailData = this.mapOrderToEmailData(updatedOrder, paymentReference);
        await this.orderEmailService.sendOrderConfirmationEmail(orderEmailData);
      } catch (emailError) {
        // Log email error but don't fail the payment confirmation
        console.error('Failed to send order confirmation email:', emailError);
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
        const orderEmail = order.user?.email || order.shippingAddress?.phoneNumber; // Fallback for guest orders
        if (orderEmail && orderEmail.toLowerCase() !== email.toLowerCase()) {
          // For security, don't reveal that order exists but email doesn't match
          throw new AppError("Order not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
        }
      } catch (error) {
        // If order is not found in database, it means payment hasn't been completed yet
        console.log(`Order ${orderNumber} not found in database - payment may not be completed yet`);
      }

      if (order) {
        // Use real order data
        trackingData = {
          orderNumber: order.orderNumber,
          status: order.status?.toString() || 'PROCESSING',
          estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          trackingNumber: `TRK-${order.orderNumber}`,
          message: this.getStatusDescription(order.status as any),
          total: order.total,
          subtotal: order.subtotal,
          shipping: order.shippingCost,
          currency: order.currency || 'NGN',
          items: order.items?.map((item: any) => ({
            name: item.product?.name || 'Product',
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.total,
            sku: item.product?.sku
          })) || [],
          shippingAddress: order.shippingAddress ? {
            firstName: order.shippingAddress.firstName,
            lastName: order.shippingAddress.lastName,
            addressLine1: order.shippingAddress.addressLine1,
            addressLine2: order.shippingAddress.addressLine2,
            city: order.shippingAddress.city,
            state: order.shippingAddress.state,
            postalCode: order.shippingAddress.postalCode,
            phoneNumber: order.shippingAddress.phoneNumber
          } : null,
          paymentMethod: order.paymentMethod,
          paymentReference: order.paymentReference,
          paymentStatus: order.paymentStatus?.toString(),
          orderDate: order.createdAt?.toLocaleDateString('en-NG')
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
              firstName: order.shippingAddress?.firstName || 'Valued Customer',
              lastName: order.shippingAddress?.lastName || '',
              phone: order.shippingAddress?.phoneNumber || ''
            };
          }
          
          await this.orderEmailService.sendOrderTrackingEmail(orderEmailData, email);
        } catch (emailError) {
          console.error('Failed to send comprehensive tracking email:', emailError);
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
        message: "Order tracking information retrieved and comprehensive details sent to your email",
        data: trackingData
      };
    } catch (error) {
      this.handleError("Error tracking guest order", error);
      throw error;
    }
  }

  /**
   * Map Order object to OrderData for email service
   */
  private mapOrderToEmailData(order: Order, paymentReference?: string): OrderData {
    const estimatedDeliveryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    
    return {
      orderNumber: order.orderNumber,
      status: order.status?.toString() || 'PENDING',
      estimatedDelivery: estimatedDeliveryDate.toLocaleDateString('en-NG', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      trackingNumber: `TRK-${order.orderNumber}`,
      message: this.getStatusDescription(order.status as OrderStatus),
      total: order.total || 0,
      subtotal: order.subtotal || 0,
      shipping: order.shippingCost || 0,
      currency: order.currency || 'NGN',
      orderDate: order.createdAt?.toLocaleDateString('en-NG') || new Date().toLocaleDateString('en-NG'),
      createdAt: order.createdAt?.toISOString(),
      items: order.items?.map((item: any) => ({
        name: item.product?.name || 'Product',
        quantity: item.quantity || 1,
        unitPrice: item.price || 0,
        totalPrice: item.total || 0,
        sku: item.product?.sku
      })) || [],
      shippingAddress: order.shippingAddress ? {
        firstName: order.shippingAddress.firstName || '',
        lastName: order.shippingAddress.lastName || '',
        email: order.user?.email || '', // Get email from user relation instead
        phoneNumber: order.shippingAddress.phoneNumber || '',
        addressLine1: order.shippingAddress.addressLine1 || '',
        addressLine2: order.shippingAddress.addressLine2,
        city: order.shippingAddress.city || '',
        state: order.shippingAddress.state || '',
        postalCode: order.shippingAddress.postalCode
      } : undefined,
      // For guest orders, we'll need to get email from user or pass it separately
      guestInfo: order.user ? undefined : {
        email: order.user?.email || '',
        firstName: order.user?.firstName || 'Valued Customer',
        lastName: order.user?.lastName || '',
        phone: order.user?.phoneNumber || ''
      },
      paymentMethod: order.paymentMethod?.toString(),
      paymentReference: paymentReference || order.paymentReference
    };
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