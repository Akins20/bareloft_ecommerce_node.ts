import { Router } from "express";
import { OrderController } from "../../controllers/orders/OrderController";
import { authenticate } from "../../middleware/auth/authenticate";
import { authorize } from "../../middleware/auth/authorize";
import { validateRequest } from "../../middleware/validation/validateRequest";
import { rateLimiter } from "../../middleware/security/rateLimiter";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  requestReturnSchema,
} from "../../utils/validation/schemas/orderSchemas";

const router = Router();

// Initialize controller
let orderController: OrderController;

export const initializeOrderRoutes = (controller: OrderController) => {
  orderController = controller;
  return router;
};

// Rate limiting for order operations
const orderCreationLimit = rateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 5, // 5 orders per 10 minutes
  message: "Too many order attempts. Please wait before placing another order.",
});

// ==================== CUSTOMER ORDER ENDPOINTS ====================

/**
 * @route   POST /api/v1/orders/create
 * @desc    Create new order from cart
 * @access  Private (Customer)
 * @body    CreateOrderRequest {
 *   shippingAddress: OrderAddress,
 *   billingAddress?: OrderAddress,
 *   paymentMethod: PaymentMethod,
 *   customerNotes?: string,
 *   couponCode?: string
 * }
 */
router.post(
  "/create",
  authenticate,
  orderCreationLimit,
  validateRequest(createOrderSchema),
  async (req, res, next) => {
    try {
      await orderController.createOrder(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/orders
 * @desc    Get user's order history
 * @access  Private (Customer)
 * @query   {
 *   page?: number,
 *   limit?: number,
 *   status?: OrderStatus,
 *   startDate?: string,
 *   endDate?: string,
 *   sortBy?: 'createdAt' | 'totalAmount' | 'status',
 *   sortOrder?: 'asc' | 'desc'
 * }
 */
router.get("/", authenticate, async (req, res, next) => {
  try {
    await orderController.getUserOrders(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/orders/stats
 * @desc    Get order summary statistics for user
 * @access  Private (Customer)
 */
router.get("/stats", authenticate, async (req, res, next) => {
  try {
    await orderController.getOrderStats(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/orders/number/:orderNumber
 * @desc    Get order by order number
 * @access  Private (Customer)
 * @param   orderNumber - Order number (e.g., BL001234)
 */
router.get("/number/:orderNumber", authenticate, async (req, res, next) => {
  try {
    await orderController.getOrderByNumber(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/orders/:id
 * @desc    Get order by ID with full details
 * @access  Private (Customer - own orders only)
 * @param   id - Order ID
 */
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    await orderController.getOrderById(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/orders/:id/tracking
 * @desc    Track order status and shipping information
 * @access  Private (Customer)
 * @param   id - Order ID
 */
router.get("/:id/tracking", authenticate, async (req, res, next) => {
  try {
    await orderController.trackOrder(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/orders/:id/timeline
 * @desc    Get order timeline/history of status changes
 * @access  Private (Customer)
 * @param   id - Order ID
 */
router.get("/:id/timeline", authenticate, async (req, res, next) => {
  try {
    await orderController.getOrderTimeline(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/orders/:id/invoice
 * @desc    Get downloadable invoice (PDF)
 * @access  Private (Customer)
 * @param   id - Order ID
 * @query   { format?: 'pdf' | 'html' }
 */
router.get("/:id/invoice", authenticate, async (req, res, next) => {
  try {
    await orderController.getInvoice(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/orders/:id/payment/verify
 * @desc    Verify payment status for order
 * @access  Private (Customer)
 * @param   id - Order ID
 */
router.get("/:id/payment/verify", authenticate, async (req, res, next) => {
  try {
    await orderController.verifyPayment(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/orders/:id/cancel
 * @desc    Cancel order (if allowed within time window)
 * @access  Private (Customer)
 * @param   id - Order ID
 * @body    { reason?: string }
 */
router.put("/:id/cancel", authenticate, async (req, res, next) => {
  try {
    await orderController.cancelOrder(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/orders/:id/reorder
 * @desc    Reorder (create new order from existing order items)
 * @access  Private (Customer)
 * @param   id - Original order ID
 */
router.post(
  "/:id/reorder",
  authenticate,
  orderCreationLimit,
  async (req, res, next) => {
    try {
      await orderController.reorder(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/orders/:id/return
 * @desc    Request return/refund for order items
 * @access  Private (Customer)
 * @param   id - Order ID
 * @body    {
 *   items?: { productId: string, quantity: number, reason: string }[],
 *   reason: string,
 *   notes?: string
 * }
 */
router.post(
  "/:id/return",
  authenticate,
  validateRequest(requestReturnSchema),
  async (req, res, next) => {
    try {
      await orderController.requestReturn(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// ==================== GUEST ORDER ENDPOINTS ====================

/**
 * @route   GET /api/v1/orders/guest/track/:orderNumber
 * @desc    Track order for guest users (with email verification)
 * @access  Public
 * @param   orderNumber - Order number
 * @query   { email: string }
 */
router.get(
  "/guest/track/:orderNumber",
  rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 tracking attempts per 15 minutes
    message: "Too many tracking attempts. Please try again later.",
  }),
  async (req, res, next) => {
    try {
      // This would be a special guest tracking method
      res.status(501).json({
        success: false,
        message: "Guest order tracking not yet implemented",
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== WEBHOOK ENDPOINTS ====================

/**
 * @route   POST /api/v1/orders/webhook/payment-update
 * @desc    Handle payment status updates from payment provider
 * @access  Internal (Payment provider webhooks)
 */
router.post("/webhook/payment-update", async (req, res, next) => {
  try {
    // This would be handled by a webhook controller
    res.status(501).json({
      success: false,
      message: "Payment webhook handler not yet implemented",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/orders/webhook/shipping-update
 * @desc    Handle shipping status updates from logistics partners
 * @access  Internal (Logistics partner webhooks)
 */
router.post("/webhook/shipping-update", async (req, res, next) => {
  try {
    // This would be handled by a webhook controller
    res.status(501).json({
      success: false,
      message: "Shipping webhook handler not yet implemented",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
