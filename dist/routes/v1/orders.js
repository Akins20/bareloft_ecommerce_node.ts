"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const OrderController_1 = require("../../controllers/orders/OrderController");
const authenticate_1 = require("../../middleware/auth/authenticate");
const rateLimiter_1 = require("../../middleware/security/rateLimiter");
const serviceContainer_1 = require("../../config/serviceContainer");
const router = (0, express_1.Router)();
// Initialize controller with dependency injection
const serviceContainer = (0, serviceContainer_1.getServiceContainer)();
const orderService = serviceContainer.getOrderService();
const orderController = new OrderController_1.OrderController(orderService);
// Rate limiting for order operations
const orderCreationLimit = rateLimiter_1.rateLimiter.authenticated;
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
router.post("/create", authenticate_1.authenticate, orderCreationLimit, 
// validateRequest(createOrderSchema), // Skip validation for now due to empty schema
async (req, res, next) => {
    try {
        await orderController.createOrder(req, res);
    }
    catch (error) {
        next(error);
    }
});
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
router.get("/", authenticate_1.authenticate, async (req, res, next) => {
    try {
        await orderController.getUserOrders(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/orders/stats
 * @desc    Get order summary statistics for user
 * @access  Private (Customer)
 */
router.get("/stats", authenticate_1.authenticate, async (req, res, next) => {
    try {
        await orderController.getOrderStats(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/orders/number/:orderNumber
 * @desc    Get order by order number
 * @access  Private (Customer)
 * @param   orderNumber - Order number (e.g., BL001234)
 */
router.get("/number/:orderNumber", authenticate_1.authenticate, async (req, res, next) => {
    try {
        await orderController.getOrderByNumber(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/orders/:id
 * @desc    Get order by ID with full details
 * @access  Private (Customer - own orders only)
 * @param   id - Order ID
 */
router.get("/:id", authenticate_1.authenticate, async (req, res, next) => {
    try {
        await orderController.getOrderById(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/orders/:id/tracking
 * @desc    Track order status and shipping information
 * @access  Private (Customer)
 * @param   id - Order ID
 */
router.get("/:id/tracking", authenticate_1.authenticate, async (req, res, next) => {
    try {
        await orderController.trackOrder(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/orders/:id/timeline
 * @desc    Get order timeline/history of status changes
 * @access  Private (Customer)
 * @param   id - Order ID
 */
router.get("/:id/timeline", authenticate_1.authenticate, async (req, res, next) => {
    try {
        await orderController.getOrderTimeline(req, res);
    }
    catch (error) {
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
router.get("/:id/invoice", authenticate_1.authenticate, async (req, res, next) => {
    try {
        await orderController.getInvoice(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/orders/:id/payment/verify
 * @desc    Verify payment status for order
 * @access  Private (Customer)
 * @param   id - Order ID
 */
router.get("/:id/payment/verify", authenticate_1.authenticate, async (req, res, next) => {
    try {
        await orderController.verifyPayment(req, res);
    }
    catch (error) {
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
router.put("/:id/cancel", authenticate_1.authenticate, async (req, res, next) => {
    try {
        await orderController.cancelOrder(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   POST /api/v1/orders/:id/reorder
 * @desc    Reorder (create new order from existing order items)
 * @access  Private (Customer)
 * @param   id - Original order ID
 */
router.post("/:id/reorder", authenticate_1.authenticate, orderCreationLimit, async (req, res, next) => {
    try {
        await orderController.reorder(req, res);
    }
    catch (error) {
        next(error);
    }
});
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
router.post("/:id/return", authenticate_1.authenticate, 
// validateRequest(requestReturnSchema), // Skip validation for now due to empty schema
async (req, res, next) => {
    try {
        await orderController.requestReturn(req, res);
    }
    catch (error) {
        next(error);
    }
});
// ==================== GUEST ORDER ENDPOINTS ====================
/**
 * @route   GET /api/v1/orders/guest/track/:orderNumber
 * @desc    Track order for guest users (with email verification)
 * @access  Public
 * @param   orderNumber - Order number
 * @query   { email: string }
 */
router.get("/guest/track/:orderNumber", rateLimiter_1.rateLimiter.general, async (req, res, next) => {
    try {
        const { orderNumber } = req.params;
        const { email } = req.query;
        if (!email) {
            res.status(400).json({
                success: false,
                message: "Email is required for guest order tracking",
            });
            return;
        }
        // Basic guest order tracking (in production, would validate email against order)
        const trackingData = {
            orderNumber,
            status: 'PROCESSING',
            estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            trackingNumber: `TRK-${orderNumber}`,
            message: 'Your order is being processed'
        };
        res.json({
            success: true,
            message: "Order tracking information retrieved",
            data: trackingData
        });
    }
    catch (error) {
        next(error);
    }
});
// ==================== WEBHOOK ENDPOINTS ====================
/**
 * @route   POST /api/v1/orders/webhook/payment-update
 * @desc    Handle payment status updates from payment provider
 * @access  Internal (Payment provider webhooks)
 */
router.post("/webhook/payment-update", async (req, res, next) => {
    try {
        const { event, data } = req.body;
        // Log webhook receipt (in production, verify signature)
        console.log('Payment webhook received:', { event, orderId: data?.metadata?.orderId });
        if (event === 'charge.success' && data?.metadata?.orderId) {
            // Update order payment status
            // In production, would use OrderService to update payment status
            console.log(`Payment confirmed for order: ${data.metadata.orderId}`);
        }
        res.status(200).json({
            success: true,
            message: "Webhook processed successfully",
        });
    }
    catch (error) {
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
        const { trackingNumber, status, location } = req.body;
        // Log shipping update (in production, authenticate webhook source)
        console.log('Shipping webhook received:', { trackingNumber, status, location });
        if (trackingNumber && status) {
            // Update order shipping status
            // In production, would find order by tracking number and update status
            console.log(`Shipping update: ${trackingNumber} - ${status} at ${location}`);
        }
        res.status(200).json({
            success: true,
            message: "Shipping update processed successfully",
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=orders.js.map