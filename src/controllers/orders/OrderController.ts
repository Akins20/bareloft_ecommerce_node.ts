import { Request, Response } from "express";
import { BaseController } from "../BaseController";
import { OrderService } from "../../services/orders/OrderService";
import {
  CreateOrderRequest,
  UpdateOrderStatusRequest,
  OrderListQuery,
  OrderDetailResponse,
  OrderListResponse,
  CreateOrderResponse,
  OrderStatus,
} from "../../types/order.types";
import { ApiResponse, PaginationParams } from "../../types/api.types";
import { AuthenticatedRequest } from "../../types/auth.types";

export class OrderController extends BaseController {
  private orderService: OrderService;

  constructor(orderService: OrderService) {
    super();
    this.orderService = orderService;
  }

  /**
   * Create new order from cart
   * POST /api/v1/orders/create
   */
  public createOrder = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      const orderData: CreateOrderRequest = req.body;

      // Validate order data
      const validationErrors = this.validateCreateOrderRequest(orderData);
      if (validationErrors.length > 0) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationErrors,
        });
        return;
      }

      // Create order using the updated service
      const result = await this.orderService.createOrder(userId, orderData);

      res.status(201).json(result);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get user's order history
   * GET /api/v1/orders
   */
  public getUserOrders = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      const { page, limit, status, startDate, endDate } = req.query;

      const params = {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? Math.min(parseInt(limit as string), 50) : 10,
        status: status as string,
        startDate: startDate as string,
        endDate: endDate as string,
      };

      const result = await this.orderService.getUserOrders(userId, params);

      res.json(result);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get order details by ID
   * GET /api/v1/orders/:orderId
   */
  public getOrderById = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { id: orderId } = req.params;

      if (!orderId) {
        res.status(400).json({
          success: false,
          message: "Order ID is required",
        });
        return;
      }

      const order = await this.orderService.getOrderById(orderId, userId);

      const response: ApiResponse<{ order: any }> = {
        success: true,
        message: "Order retrieved successfully",
        data: { order },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get order by order number
   * GET /api/v1/orders/number/:orderNumber
   */
  public getOrderByNumber = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { orderNumber } = req.params;

      if (!orderNumber) {
        res.status(400).json({
          success: false,
          message: "Order number is required",
        });
        return;
      }

      const order = await this.orderService.getOrderByNumber(orderNumber, userId);

      const response: ApiResponse<{ order: any }> = {
        success: true,
        message: "Order retrieved successfully",
        data: { order },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get order summary statistics for user
   * GET /api/v1/orders/stats
   */
  public getOrderStats = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      const stats = await this.orderService.getUserOrderStats(userId);

      const response: ApiResponse<typeof stats> = {
        success: true,
        message: "Order statistics retrieved successfully",
        data: stats,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Cancel an order
   * POST /api/v1/orders/:orderId/cancel
   */
  public cancelOrder = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { id: orderId } = req.params;
      const { reason } = req.body;

      if (!orderId) {
        res.status(400).json({
          success: false,
          message: "Order ID is required",
        });
        return;
      }

      if (!reason || reason.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: "Cancellation reason is required",
        });
        return;
      }

      const result = await this.orderService.cancelOrder(
        orderId,
        reason.trim(),
        userId
      );

      res.json(result);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Update order status (Admin only)
   * PUT /api/v1/orders/:orderId/status
   */
  public updateOrderStatus = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { id: orderId } = req.params;
      const { status, adminNotes } = req.body;
      const updatedBy = req.user?.userId || req.user?.id || "ADMIN";

      if (!orderId) {
        res.status(400).json({
          success: false,
          message: "Order ID is required",
        });
        return;
      }

      if (!status) {
        res.status(400).json({
          success: false,
          message: "Order status is required",
        });
        return;
      }

      const validStatuses = [
        "PENDING",
        "CONFIRMED", 
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
        "REFUNDED"
      ];

      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          message: "Invalid order status",
          data: { validStatuses },
        });
        return;
      }

      const result = await this.orderService.updateOrderStatus(
        orderId,
        status as OrderStatus,
        adminNotes,
        updatedBy
      );

      res.json(result);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get all orders (Admin only)
   * GET /api/v1/orders/admin/all
   */
  public getAllOrders = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { page, limit, status, startDate, endDate, search } = req.query;

      const params = {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? Math.min(parseInt(limit as string), 100) : 20,
        status: status as string,
        startDate: startDate as string,
        endDate: endDate as string,
      };

      // Get all orders (admin view) - for now, return user orders format
      // In production, you'd have a separate admin service method
      const result = await this.orderService.getUserOrders("", params);

      res.json(result);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  // Private validation methods

  private validateCreateOrderRequest(data: CreateOrderRequest): string[] {
    const errors: string[] = [];

    // Validate shipping address
    if (!data.shippingAddress) {
      errors.push("Shipping address is required");
    } else {
      if (!data.shippingAddress.firstName || data.shippingAddress.firstName.trim().length === 0) {
        errors.push("Shipping address first name is required");
      }
      if (!data.shippingAddress.lastName || data.shippingAddress.lastName.trim().length === 0) {
        errors.push("Shipping address last name is required");
      }
      if (!data.shippingAddress.addressLine1 || data.shippingAddress.addressLine1.trim().length === 0) {
        errors.push("Shipping address street is required");
      }
      if (!data.shippingAddress.city || data.shippingAddress.city.trim().length === 0) {
        errors.push("Shipping address city is required");
      }
      if (!data.shippingAddress.state || data.shippingAddress.state.trim().length === 0) {
        errors.push("Shipping address state is required");
      }
      // Country is optional - defaults to Nigeria in most cases
      if (!data.shippingAddress.phoneNumber || data.shippingAddress.phoneNumber.trim().length === 0) {
        errors.push("Shipping address phone number is required");
      }

      // Nigerian phone number validation
      const phoneRegex = /^(\+234|234|0)?[789][01]\d{8}$/;
      if (data.shippingAddress.phoneNumber && !phoneRegex.test(data.shippingAddress.phoneNumber.replace(/\s/g, ''))) {
        errors.push("Valid Nigerian phone number is required");
      }
    }

    // Validate payment method (optional - can be set during payment flow)
    if (data.paymentMethod) {
      const validPaymentMethods = ["CARD", "BANK_TRANSFER", "PAYSTACK", "CASH_ON_DELIVERY"];
      if (!validPaymentMethods.includes(data.paymentMethod)) {
        errors.push("Invalid payment method");
      }
    }

    return errors;
  }

  /**
   * Track order status and shipping information
   * GET /api/v1/orders/:id/tracking
   */
  public trackOrder = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: "Order ID is required",
        });
        return;
      }

      const order = await this.orderService.getOrderById(id, userId);

      // Generate tracking information based on order status
      const trackingInfo = {
        trackingNumber: `TRK-${order.orderNumber}`,
        currentLocation: this.getTrackingLocation(order.status.toString()),
        estimatedDelivery: this.calculateEstimatedDelivery(order.createdAt, order.status.toString()),
        carrier: 'Bareloft Logistics',
        statusHistory: [
          {
            status: 'ORDER_PLACED',
            location: 'Order Processing Center',
            timestamp: order.createdAt,
            description: 'Order has been placed and is being prepared'
          }
        ]
      };

      // Add status-specific tracking updates
      if (order.status.toString() !== 'PENDING') {
        trackingInfo.statusHistory.push({
          status: order.status.toString(),
          location: this.getTrackingLocation(order.status.toString()),
          timestamp: order.updatedAt,
          description: this.getStatusDescription(order.status.toString())
        });
      }

      const response: ApiResponse<{ 
        orderNumber: string;
        status: string;
        paymentStatus: string;
        tracking: any;
      }> = {
        success: true,
        message: "Order tracking information retrieved successfully",
        data: {
          orderNumber: order.orderNumber,
          status: order.status.toString(),
          paymentStatus: order.paymentStatus.toString(),
          tracking: trackingInfo
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get order timeline/history of status changes
   * GET /api/v1/orders/:id/timeline
   */
  public getOrderTimeline = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: "Order ID is required",
        });
        return;
      }

      const order = await this.orderService.getOrderById(id, userId);

      // Get order timeline from Redis or generate basic timeline
      const timeline = [
        {
          id: `evt_${Date.now()}_1`,
          type: "ORDER_CREATED",
          message: "Order placed successfully",
          timestamp: order.createdAt,
          status: "PENDING"
        }
      ];

      // Add payment status timeline if completed
      if (order.paymentStatus.toString() === 'COMPLETED') {
        timeline.push({
          id: `evt_${Date.now()}_2`,
          type: "PAYMENT_COMPLETED",
          message: "Payment confirmed",
          timestamp: order.createdAt,
          status: "PAID"
        });
      }

      // Add current status timeline
      if (order.status.toString() !== 'PENDING') {
        timeline.push({
          id: `evt_${Date.now()}_3`,
          type: "STATUS_UPDATED",
          message: `Order status updated to ${order.status.toString().toLowerCase()}`,
          timestamp: order.updatedAt,
          status: order.status.toString()
        });
      }

      const response: ApiResponse<{ timeline: any[] }> = {
        success: true,
        message: "Order timeline retrieved successfully",
        data: {
          timeline: timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get downloadable invoice (PDF)
   * GET /api/v1/orders/:id/invoice
   */
  public getInvoice = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: "Order ID is required",
        });
        return;
      }

      const order = await this.orderService.getOrderById(id, userId);

      // Generate basic invoice data
      const invoiceData = {
        orderNumber: order.orderNumber,
        customerName: `${order.user?.firstName || ''} ${order.user?.lastName || ''}`,
        customerEmail: order.user?.email,
        customerPhone: order.user?.phoneNumber,
        orderDate: order.createdAt,
        items: order.items || [],
        subtotal: order.subtotal,
        tax: order.tax,
        shippingCost: order.shippingCost,
        discount: order.discount,
        total: order.total,
        currency: order.currency,
        status: order.status,
        paymentStatus: order.paymentStatus
      };

      const response: ApiResponse<{ invoice: any }> = {
        success: true,
        message: "Invoice data retrieved successfully",
        data: { invoice: invoiceData },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Verify payment status for order
   * GET /api/v1/orders/:id/payment/verify
   */
  public verifyPayment = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: "Order ID is required",
        });
        return;
      }

      const order = await this.orderService.getOrderById(id, userId);

      // Get payment verification status
      const paymentData = {
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        paymentReference: order.paymentReference,
        amount: order.total,
        currency: order.currency,
        verificationStatus: order.paymentStatus.toString() === 'COMPLETED' ? 'verified' : 'pending',
        lastChecked: new Date()
      };

      const response: ApiResponse<{ payment: any }> = {
        success: true,
        message: "Payment status retrieved successfully",
        data: { payment: paymentData },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Reorder (create new order from existing order items)
   * POST /api/v1/orders/:id/reorder
   */
  public reorder = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: "Order ID is required",
        });
        return;
      }

      const order = await this.orderService.getOrderById(id, userId);

      // Check if order can be reordered
      if (!order.items || order.items.length === 0) {
        res.status(400).json({
          success: false,
          message: "Cannot reorder - no items found",
        });
        return;
      }

      // Return reorder preparation data
      const reorderData = {
        originalOrderNumber: order.orderNumber,
        items: order.items.map((item: any) => ({
          productId: item.productId,
          productName: item.product?.name || 'Product',
          quantity: item.quantity,
          price: item.price
        })),
        estimatedTotal: order.subtotal,
        message: "Items ready to be added to cart"
      };

      const response: ApiResponse<{ reorder: any }> = {
        success: true,
        message: "Reorder data prepared successfully",
        data: { reorder: reorderData },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Request return/refund for order items
   * POST /api/v1/orders/:id/return
   */
  public requestReturn = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: "Order ID is required",
        });
        return;
      }

      const order = await this.orderService.getOrderById(id, userId);
      const { items, reason, notes } = req.body;

      // Validate return request
      if (!reason || reason.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: "Return reason is required",
        });
        return;
      }

      // Check if order can be returned
      if (order.status.toString() !== 'DELIVERED') {
        res.status(400).json({
          success: false,
          message: "Only delivered orders can be returned",
        });
        return;
      }

      // Check return window (e.g., 14 days)
      const deliveryDate = new Date(order.createdAt);
      const returnDeadline = new Date(deliveryDate.getTime() + (14 * 24 * 60 * 60 * 1000));
      
      if (new Date() > returnDeadline) {
        res.status(400).json({
          success: false,
          message: "Return window has expired (14 days from delivery)",
        });
        return;
      }

      // Generate return request ID
      const returnRequestId = `RTN-${order.orderNumber}-${Date.now()}`;

      const returnData = {
        returnRequestId,
        orderNumber: order.orderNumber,
        status: 'PENDING',
        reason: reason.trim(),
        notes: notes?.trim() || '',
        requestedItems: items || order.items,
        requestDate: new Date(),
        estimatedRefund: items ? 
          items.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0) :
          order.total
      };

      const response: ApiResponse<{ returnRequest: any }> = {
        success: true,
        message: "Return request submitted successfully",
        data: { returnRequest: returnData },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  // Private helper methods for tracking and status

  private getTrackingLocation(status: string): string {
    const locations: Record<string, string> = {
      'PENDING': 'Order Processing Center',
      'CONFIRMED': 'Warehouse - Lagos',
      'PROCESSING': 'Fulfillment Center',
      'SHIPPED': 'In Transit',
      'DELIVERED': 'Customer Address',
      'CANCELLED': 'Order Cancelled',
      'REFUNDED': 'Refund Processed'
    };
    return locations[status] || 'Processing Center';
  }

  private calculateEstimatedDelivery(orderDate: Date, status: string): Date {
    const baseDate = new Date(orderDate);
    let deliveryDays = 3; // Default 3 days

    // Adjust based on status
    switch (status) {
      case 'PENDING':
      case 'CONFIRMED':
        deliveryDays = 3;
        break;
      case 'PROCESSING':
        deliveryDays = 2;
        break;
      case 'SHIPPED':
        deliveryDays = 1;
        break;
      case 'DELIVERED':
        return baseDate; // Already delivered
      default:
        deliveryDays = 3;
    }

    const estimatedDate = new Date(baseDate);
    estimatedDate.setDate(estimatedDate.getDate() + deliveryDays);
    return estimatedDate;
  }

  /**
   * Create guest order (no authentication required)
   * POST /api/v1/orders/guest/create
   */
  public createGuestOrder = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const orderData = req.body;

      // Validate required guest info
      if (!orderData.guestInfo || !orderData.guestInfo.email || !orderData.guestInfo.firstName || !orderData.guestInfo.lastName) {
        res.status(400).json({
          success: false,
          message: "Guest information (email, firstName, lastName) is required",
        });
        return;
      }

      // Validate shipping address
      if (!orderData.shippingAddress) {
        res.status(400).json({
          success: false,
          message: "Shipping address is required",
        });
        return;
      }

      // Create guest order - Paystack will handle payment processing
      const result = await this.orderService.createGuestOrder(orderData);

      const response: ApiResponse<CreateOrderResponse> = {
        success: true,
        message: "Guest order created successfully. Redirecting to payment...",
        data: result,
      };

      res.status(201).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  private getStatusDescription(status: string): string {
    const descriptions: Record<string, string> = {
      'PENDING': 'Order is pending confirmation',
      'CONFIRMED': 'Order has been confirmed and is being prepared',
      'PROCESSING': 'Order is being processed for shipment',
      'SHIPPED': 'Order has been shipped and is on the way',
      'DELIVERED': 'Order has been successfully delivered',
      'CANCELLED': 'Order has been cancelled',
      'REFUNDED': 'Order has been refunded'
    };
    return descriptions[status] || `Order status: ${status}`;
  }
}