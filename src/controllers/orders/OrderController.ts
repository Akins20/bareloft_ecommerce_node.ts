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
      const userId = req.user?.id;
      const sessionId =
        req.sessionID || (req.headers["x-session-id"] as string);

      if (!userId && !sessionId) {
        res.status(400).json({
          success: false,
          message: "User authentication or session ID required",
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

      const result = await this.orderService.createOrder(
        userId,
        sessionId,
        orderData
      );

      const response: ApiResponse<CreateOrderResponse> = {
        success: true,
        message: "Order created successfully",
        data: result,
      };

      res.status(201).json(response);
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
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      const query: OrderListQuery = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
        status: req.query.status as OrderStatus,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        sortBy: (req.query.sortBy as any) || "createdAt",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
      };

      const result = await this.orderService.getUserOrders(userId, query);

      const response: ApiResponse<OrderListResponse> = {
        success: true,
        message: "Orders retrieved successfully",
        data: result,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get order by ID
   * GET /api/v1/orders/:id
   */
  public getOrderById = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const order = await this.orderService.getOrderById(id, userId);

      if (!order) {
        res.status(404).json({
          success: false,
          message: "Order not found",
        });
        return;
      }

      const response: ApiResponse<OrderDetailResponse> = {
        success: true,
        message: "Order retrieved successfully",
        data: order,
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
      const { orderNumber } = req.params;
      const userId = req.user?.id;

      const order = await this.orderService.getOrderByNumber(
        orderNumber,
        userId
      );

      if (!order) {
        res.status(404).json({
          success: false,
          message: "Order not found",
        });
        return;
      }

      const response: ApiResponse<OrderDetailResponse> = {
        success: true,
        message: "Order retrieved successfully",
        data: order,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Cancel order (if allowed)
   * PUT /api/v1/orders/:id/cancel
   */
  public cancelOrder = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { reason } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      const result = await this.orderService.cancelOrder(id, userId, reason);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message,
        });
        return;
      }

      const response: ApiResponse<any> = {
        success: true,
        message: "Order cancelled successfully",
        data: result.order,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Track order status
   * GET /api/v1/orders/:id/tracking
   */
  public trackOrder = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const tracking = await this.orderService.getOrderTracking(id, userId);

      if (!tracking) {
        res.status(404).json({
          success: false,
          message: "Order not found",
        });
        return;
      }

      const response: ApiResponse<any> = {
        success: true,
        message: "Order tracking retrieved successfully",
        data: tracking,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get order timeline/history
   * GET /api/v1/orders/:id/timeline
   */
  public getOrderTimeline = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const timeline = await this.orderService.getOrderTimeline(id, userId);

      if (!timeline) {
        res.status(404).json({
          success: false,
          message: "Order not found",
        });
        return;
      }

      const response: ApiResponse<any[]> = {
        success: true,
        message: "Order timeline retrieved successfully",
        data: timeline,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Reorder (create new order from existing order)
   * POST /api/v1/orders/:id/reorder
   */
  public reorder = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      const result = await this.orderService.reorder(id, userId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message,
          data: result.unavailableItems,
        });
        return;
      }

      const response: ApiResponse<any> = {
        success: true,
        message: "Items added to cart for reorder",
        data: result,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Request return/refund
   * POST /api/v1/orders/:id/return
   */
  public requestReturn = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { items, reason, notes } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      // Validate return request
      if (!reason || reason.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: "Return reason is required",
        });
        return;
      }

      const result = await this.orderService.requestReturn(id, userId, {
        items,
        reason,
        notes,
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message,
        });
        return;
      }

      const response: ApiResponse<any> = {
        success: true,
        message: "Return request submitted successfully",
        data: result,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Verify payment status
   * GET /api/v1/orders/:id/payment/verify
   */
  public verifyPayment = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const result = await this.orderService.verifyPayment(id, userId);

      const response: ApiResponse<any> = {
        success: true,
        message: "Payment verification completed",
        data: result,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get downloadable invoice
   * GET /api/v1/orders/:id/invoice
   */
  public getInvoice = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const format = (req.query.format as string) || "pdf";

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      const invoice = await this.orderService.generateInvoice(
        id,
        userId,
        format
      );

      if (!invoice) {
        res.status(404).json({
          success: false,
          message: "Order not found or invoice not available",
        });
        return;
      }

      // Set appropriate headers for file download
      res.setHeader("Content-Type", invoice.mimeType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${invoice.filename}"`
      );
      res.send(invoice.data);
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
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      const stats = await this.orderService.getUserOrderStats(userId);

      const response: ApiResponse<any> = {
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
   * Validate create order request
   */
  private validateCreateOrderRequest(data: CreateOrderRequest): string[] {
    const errors: string[] = [];

    // Validate shipping address
    if (!data.shippingAddress) {
      errors.push("Shipping address is required");
    } else {
      if (
        !data.shippingAddress.firstName ||
        data.shippingAddress.firstName.trim().length === 0
      ) {
        errors.push("Shipping first name is required");
      }
      if (
        !data.shippingAddress.lastName ||
        data.shippingAddress.lastName.trim().length === 0
      ) {
        errors.push("Shipping last name is required");
      }
      if (
        !data.shippingAddress.addressLine1 ||
        data.shippingAddress.addressLine1.trim().length === 0
      ) {
        errors.push("Shipping address line 1 is required");
      }
      if (
        !data.shippingAddress.city ||
        data.shippingAddress.city.trim().length === 0
      ) {
        errors.push("Shipping city is required");
      }
      if (
        !data.shippingAddress.state ||
        data.shippingAddress.state.trim().length === 0
      ) {
        errors.push("Shipping state is required");
      }
      if (
        !data.shippingAddress.phoneNumber ||
        data.shippingAddress.phoneNumber.trim().length === 0
      ) {
        errors.push("Shipping phone number is required");
      }
    }

    // Validate payment method
    if (!data.paymentMethod) {
      errors.push("Payment method is required");
    }

    // Validate coupon code format if provided
    if (data.couponCode && !/^[A-Z0-9]{3,20}$/.test(data.couponCode)) {
      errors.push("Invalid coupon code format");
    }

    return errors;
  }
}
