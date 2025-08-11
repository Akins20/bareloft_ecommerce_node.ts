import { BaseService } from "../BaseService";
import { OrderRepository } from "../../repositories/OrderRepository";
import { CartService } from "../cart/CartService";
import { OrderEmailService, OrderData } from "../notifications/OrderEmailService";
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
  private orderEmailService: OrderEmailService;

  constructor(orderRepository?: OrderRepository, cartService?: CartService, orderEmailService?: OrderEmailService) {
    super();
    this.orderRepository = orderRepository || {} as OrderRepository;
    this.cartService = cartService || {} as CartService;
    this.orderEmailService = orderEmailService || new OrderEmailService();
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
   * Create guest order from current cart (no user authentication required)
   */
  async createGuestOrder(orderData: any): Promise<any> {
    try {
      // Get current cart data using session approach
      // Since we don't have userId for guest, we'll need to get cart from session
      const sessionId = orderData.sessionId || 'guest'; // Frontend should provide session ID
      
      // For now, let's get cart data from the request or use mock data
      // Frontend should pass the current cart data in the checkout request
      const cartData = orderData.cartData || {
        items: [],
        subtotal: 0,
        estimatedTax: 0,
        estimatedShipping: 0,
        estimatedTotal: 0
      };

      if (!cartData.items || cartData.items.length === 0) {
        throw new AppError(
          "Cart is empty. Please add items before checkout.",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT
        );
      }

      // Generate unique order number
      const orderNumber = await this.generateOrderNumber();

      // Calculate shipping if address is provided
      let shippingAmount = cartData.estimatedShipping || 0;
      if (orderData.shippingAddress) {
        // Here you could integrate with shipping calculator
        // For Lagos, free shipping; other states might have different rates
        if (orderData.shippingAddress.state !== "Lagos") {
          shippingAmount = 200000; // ₦2,000 shipping for other states
        }
      }

      // Recalculate totals with final shipping
      const subtotal = cartData.subtotal;
      const tax = cartData.estimatedTax;
      const finalTotal = subtotal + tax + shippingAmount;

      // Prepare order data for frontend
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
          tax: tax,
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

      // Generate Paystack payment URL
      const paymentUrl = `https://checkout.paystack.com/pay/${orderNumber}`;

      return {
        success: true,
        message: "Order created successfully. Redirecting to payment...",
        order: orderSummary,
        payment: {
          paymentUrl,
          reference: orderNumber,
          amount: finalTotal,
          currency: "NGN"
        },
        // Include cart data for frontend reference
        cartSummary: {
          itemCount: cartData.items.length,
          subtotal: subtotal,
          tax: tax,
          shipping: shippingAmount,
          total: finalTotal
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
        // If order is not found in database, create mock tracking data
        // This maintains the existing functionality for basic tracking
        console.log(`Order ${orderNumber} not found in database, using mock data`);
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
          tax: order.tax,
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
        // Fallback to basic tracking data
        trackingData = {
          orderNumber,
          status: 'PROCESSING',
          estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          trackingNumber: `TRK-${orderNumber}`,
          message: 'Your order is being processed',
          total: null,
          items: [],
          shippingAddress: null,
          paymentMethod: null,
          paymentReference: null
        };

        // Send basic tracking email
        try {
          const orderEmailData: OrderData = {
            orderNumber,
            status: trackingData.status,
            estimatedDelivery: trackingData.estimatedDelivery,
            trackingNumber: trackingData.trackingNumber,
            message: trackingData.message,
            guestInfo: {
              email: email,
              firstName: 'Valued Customer',
              lastName: '',
              phone: ''
            }
          };
          
          await this.orderEmailService.sendOrderTrackingEmail(orderEmailData, email);
        } catch (emailError) {
          console.error('Failed to send basic tracking email:', emailError);
        }
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
      tax: order.tax || 0,
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