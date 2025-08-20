import { Router } from "express";
import { AdminOrderController } from "../../controllers/admin/AdminOrderController";
import { authenticate } from "../../middleware/auth/authenticate";
import { authorize } from "../../middleware/auth/authorize";
import { rateLimiter } from "../../middleware/security/rateLimiter";

const router = Router();
const orderController = new AdminOrderController();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize(["ADMIN", "SUPER_ADMIN"]));

// Apply rate limiting for admin endpoints
router.use(rateLimiter.admin);

// ========================================
// ORDER LISTING AND MANAGEMENT
// ========================================

/**
 * @route   GET /api/admin/orders
 * @desc    Get all orders with advanced filtering, pagination, and sorting
 * @access  Admin, Super Admin
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20, max: 100)
 * @query   search - Search term for order number, customer name, phone, email
 * @query   status - Filter by order status (PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED)
 * @query   paymentStatus - Filter by payment status (PENDING, COMPLETED, FAILED, REFUNDED)
 * @query   paymentMethod - Filter by payment method (card, bank_transfer, ussd)
 * @query   dateFrom - Filter orders from this date (ISO string)
 * @query   dateTo - Filter orders until this date (ISO string)
 * @query   minAmount - Filter orders with minimum amount (in Naira)
 * @query   maxAmount - Filter orders with maximum amount (in Naira)
 * @query   state - Filter by Nigerian state (Lagos, Abuja, Rivers, etc.)
 * @query   sortBy - Sort field (createdAt, totalAmount, status, customerName)
 * @query   sortOrder - Sort order (asc, desc)
 */
router.get("/", orderController.getOrders);

/**
 * @route   GET /api/admin/orders/statistics
 * @desc    Get order statistics and analytics (legacy endpoint)
 * @access  Admin, Super Admin
 * @query   period - Time period for statistics
 */
router.get("/statistics", orderController.getOrderStatistics);

/**
 * @route   GET /api/admin/orders/:id
 * @desc    Get detailed order information by ID
 * @access  Admin, Super Admin
 * @param   id - Order ID (UUID)
 */
router.get("/:id", orderController.getOrderById);

/**
 * @route   PUT /api/admin/orders/:id/status
 * @desc    Update order status with workflow validation
 * @access  Admin, Super Admin
 * @param   id - Order ID (UUID)
 * @body    status (PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED), notes?
 */
router.put("/:id/status", orderController.updateOrderStatus);

/**
 * @route   POST /api/admin/orders/:id/notes
 * @desc    Add admin notes to order
 * @access  Admin, Super Admin
 * @param   id - Order ID (UUID)
 * @body    notes (string), isPrivate? (boolean, default: false)
 */
router.post("/:id/notes", orderController.addOrderNotes);

/**
 * @route   POST /api/admin/orders/:id/cancel
 * @desc    Cancel order with reason and optional refund
 * @access  Admin, Super Admin
 * @param   id - Order ID (UUID)
 * @body    reason (string), notifyCustomer? (boolean), refundAmount? (number in kobo)
 */
router.post("/:id/cancel", orderController.cancelOrderWithReason);

/**
 * @route   GET /api/admin/orders/:id/timeline
 * @desc    Get order status timeline and history
 * @access  Admin, Super Admin
 * @param   id - Order ID (UUID)
 */
router.get("/:id/timeline", orderController.getOrderTimeline);

/**
 * @route   POST /api/admin/orders/:id/fulfill
 * @desc    Mark order as fulfilled with shipping details
 * @access  Admin, Super Admin
 * @param   id - Order ID (UUID)
 * @body    trackingNumber?, carrier?, estimatedDelivery?, notes?, generateShippingLabel? (boolean)
 */
router.post("/:id/fulfill", orderController.fulfillOrder);

// ========================================
// ORDER QUEUE MANAGEMENT
// ========================================

/**
 * @route   GET /api/admin/orders/queue/pending
 * @desc    Get pending orders queue with Nigerian market insights
 * @access  Admin, Super Admin
 * @query   priority - Filter by priority (high, normal, low)
 */
router.get("/queue/pending", orderController.getPendingOrdersQueue);

/**
 * @route   GET /api/admin/orders/queue/processing
 * @desc    Get orders currently being processed
 * @access  Admin, Super Admin
 */
router.get("/queue/processing", orderController.getProcessingOrdersQueue);

/**
 * @route   GET /api/admin/orders/queue/ready-to-ship
 * @desc    Get orders ready for shipping
 * @access  Admin, Super Admin
 */
router.get("/queue/ready-to-ship", orderController.getReadyToShipQueue);

/**
 * @route   PUT /api/admin/orders/queue/priority
 * @desc    Set priority for multiple orders
 * @access  Admin, Super Admin
 * @body    orderIds (string[]), priority (high|normal|low), reason? (string)
 */
router.put("/queue/priority", orderController.setOrderPriority);

/**
 * @route   POST /api/admin/orders/queue/assign
 * @desc    Assign orders to fulfillment staff
 * @access  Admin, Super Admin
 * @body    orderIds (string[]), staffId (string), staffName? (string), notes? (string)
 */
router.post("/queue/assign", orderController.assignOrdersToStaff);

// ========================================
// ANALYTICS AND REPORTING
// ========================================

/**
 * @route   GET /api/admin/orders/analytics/overview
 * @desc    Get comprehensive order analytics with Nigerian market insights
 * @access  Admin, Super Admin
 * @query   period - Time period (last_7_days, last_30_days, last_90_days, last_year)
 * @query   state - Filter by Nigerian state
 * @query   paymentMethod - Filter by payment method
 */
router.get("/analytics/overview", orderController.getOrderAnalyticsOverview);

/**
 * @route   GET /api/admin/orders/analytics/performance
 * @desc    Get fulfillment performance metrics
 * @access  Admin, Super Admin
 * @query   period - Time period for analysis
 * @query   staffId - Filter by specific staff member
 */
router.get("/analytics/performance", orderController.getFulfillmentPerformance);

/**
 * @route   GET /api/admin/orders/analytics/revenue
 * @desc    Get revenue analytics with Naira formatting and VAT calculations
 * @access  Admin, Super Admin
 * @query   period - Time period for analysis
 * @query   breakdown - Data breakdown (daily, weekly, monthly)
 */
router.get("/analytics/revenue", orderController.getRevenueAnalytics);

/**
 * @route   GET /api/admin/orders/reports/export
 * @desc    Export order data in various formats
 * @access  Admin, Super Admin
 * @query   format - Export format (csv, pdf, xlsx)
 * @query   period - Time period for export
 * @query   status - Filter by order status
 * @query   includeCustomerData - Include customer PII (boolean, default: false)
 */
router.get("/reports/export", orderController.exportOrderData);

// ========================================
// LEGACY ENDPOINTS (maintained for compatibility)
// ========================================

/**
 * @route   POST /api/admin/orders/bulk
 * @desc    Perform bulk actions on orders
 * @access  Admin, Super Admin
 * @body    action (update_status, export, mark_shipped, cancel), orderIds[], data?
 */
router.post("/bulk", orderController.bulkOrderAction);

/**
 * @route   POST /api/admin/orders/:id/tracking
 * @desc    Add tracking information to order (legacy endpoint)
 * @access  Admin, Super Admin
 * @param   id - Order ID (UUID)
 * @body    carrier, trackingNumber, trackingUrl?, notes?
 */
router.post("/:id/tracking", orderController.addTracking);

/**
 * @route   POST /api/admin/orders/:id/refund
 * @desc    Process refund for order (legacy endpoint)
 * @access  Admin, Super Admin
 * @param   id - Order ID (UUID)
 * @body    amount? (partial refund amount in Naira), reason, refundMethod?
 */
router.post("/:id/refund", orderController.processRefund);

export default router;