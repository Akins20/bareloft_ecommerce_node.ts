import { Router } from "express";
import { AdminBulkOrderController } from "../../controllers/admin/AdminBulkOrderController";
import { authenticate } from "../../middleware/auth/authenticate";
import { authorize } from "../../middleware/auth/authorize";
import { validateSchema } from "../../middleware/validation/validateSchema";
import rateLimit from "express-rate-limit";
import auditLogging from "../../middleware/logging/auditLogging";

// Validation schemas for bulk operations
const bulkStatusUpdateSchema = {
  type: "object",
  properties: {
    orderIds: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 1000
    },
    newStatus: {
      type: "string",
      enum: ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]
    },
    notes: { type: "string", maxLength: 1000 },
    notifyCustomers: { type: "boolean" },
    processInBatches: { type: "boolean" },
    batchSize: { type: "number", minimum: 1, maximum: 100 }
  },
  required: ["orderIds", "newStatus"],
  additionalProperties: false
};

const bulkAssignStaffSchema = {
  type: "object",
  properties: {
    orderIds: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 500
    },
    staffId: { type: "string", minLength: 1 },
    staffName: { type: "string" },
    notes: { type: "string", maxLength: 1000 },
    assignmentType: {
      type: "string",
      enum: ["fulfillment", "customer_service", "quality_check"]
    }
  },
  required: ["orderIds", "staffId"],
  additionalProperties: false
};

const bulkCancelSchema = {
  type: "object",
  properties: {
    orderIds: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 500
    },
    reason: { type: "string", minLength: 5, maxLength: 500 },
    processRefunds: { type: "boolean" },
    notifyCustomers: { type: "boolean" },
    refundPercentage: { type: "number", minimum: 0, maximum: 100 }
  },
  required: ["orderIds", "reason"],
  additionalProperties: false
};

const bulkRefundSchema = {
  type: "object",
  properties: {
    orderIds: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 100 // Smaller limit for refunds due to financial impact
    },
    reason: { type: "string", minLength: 5, maxLength: 500 },
    refundType: {
      type: "string",
      enum: ["full", "partial"]
    },
    customAmounts: {
      type: "object",
      additionalProperties: { type: "number", minimum: 0 }
    },
    refundMethod: {
      type: "string",
      enum: ["original", "wallet", "bank_transfer"]
    },
    notifyCustomers: { type: "boolean" }
  },
  required: ["orderIds", "reason"],
  additionalProperties: false
};

const bulkPrioritySchema = {
  type: "object",
  properties: {
    orderIds: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 1000
    },
    priority: {
      type: "string",
      enum: ["high", "normal", "low"]
    },
    reason: { type: "string", maxLength: 500 },
    autoReorder: { type: "boolean" }
  },
  required: ["orderIds", "priority"],
  additionalProperties: false
};

const bulkExportSchema = {
  type: "object",
  properties: {
    orderIds: {
      type: "array",
      items: { type: "string" },
      maxItems: 10000
    },
    filters: {
      type: "object",
      properties: {
        status: {
          type: "array",
          items: {
            type: "string",
            enum: ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]
          }
        },
        paymentStatus: {
          type: "array",
          items: {
            type: "string",
            enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED", "REFUNDED"]
          }
        },
        dateFrom: { type: "string", format: "date" },
        dateTo: { type: "string", format: "date" },
        state: {
          type: "array",
          items: { type: "string" }
        },
        minAmount: { type: "number", minimum: 0 },
        maxAmount: { type: "number", minimum: 0 }
      },
      additionalProperties: false
    },
    format: {
      type: "string",
      enum: ["csv", "xlsx", "pdf"]
    },
    includeCustomerData: { type: "boolean" },
    includePaymentData: { type: "boolean" },
    includeItemDetails: { type: "boolean" },
    groupBy: {
      type: "string",
      enum: ["status", "state", "date", "none"]
    }
  },
  required: ["format"],
  additionalProperties: false
};

const bulkNotificationSchema = {
  type: "object",
  properties: {
    orderIds: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 2000 // Higher limit for notifications
    },
    notificationType: {
      type: "string",
      enum: ["status_update", "shipping_delay", "ready_for_pickup", "custom"]
    },
    customMessage: { type: "string", maxLength: 500 },
    channels: {
      type: "array",
      items: {
        type: "string",
        enum: ["email", "sms", "push"]
      },
      minItems: 1
    },
    scheduleTime: { type: "string", format: "date-time" }
  },
  required: ["orderIds", "notificationType", "channels"],
  additionalProperties: false
};

const bulkImportSchema = {
  type: "object",
  properties: {
    data: {
      type: "array",
      items: {
        type: "object",
        properties: {
          orderNumber: { type: "string" },
          orderId: { type: "string" },
          newStatus: { type: "string" },
          trackingNumber: { type: "string" },
          notes: { type: "string", maxLength: 1000 },
          priority: {
            type: "string",
            enum: ["high", "normal", "low"]
          },
          assignedStaff: { type: "string" },
          estimatedDelivery: { type: "string", format: "date" },
          customData: { type: "object" }
        },
        additionalProperties: false
      },
      minItems: 1,
      maxItems: 5000
    },
    validateOnly: { type: "boolean" },
    skipInvalidRows: { type: "boolean" },
    notifyOnCompletion: { type: "boolean" }
  },
  required: ["data"],
  additionalProperties: false
};

const bulkValidationSchema = {
  type: "object",
  properties: {
    data: {
      type: "array",
      items: { type: "object" },
      minItems: 1,
      maxItems: 10000
    }
  },
  required: ["data"],
  additionalProperties: false
};

const router = Router();
const controller = new AdminBulkOrderController();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize(['ADMIN', 'SUPER_ADMIN']));

// Apply audit logging to all bulk operations
router.use(auditLogging.adminAuditLogger);

// Rate limiting for bulk operations (more restrictive)
const bulkOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 bulk operations per 15 minutes
  message: 'Too many bulk operations, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const heavyOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 heavy operations per hour
  message: 'Too many heavy bulk operations, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// ========================================
// BULK OPERATION ENDPOINTS
// ========================================

/**
 * @swagger
 * /api/admin/orders/bulk/status-update:
 *   post:
 *     tags: [Admin - Bulk Operations]
 *     summary: Bulk update order status
 *     description: Update status for multiple orders with Nigerian business hours consideration
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderIds
 *               - newStatus
 *             properties:
 *               orderIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of order IDs (max 1000)
 *               newStatus:
 *                 type: string
 *                 enum: [PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED]
 *               notes:
 *                 type: string
 *                 description: Admin notes for the status update
 *               notifyCustomers:
 *                 type: boolean
 *                 description: Whether to notify customers of status change
 *               processInBatches:
 *                 type: boolean
 *                 description: Process orders in smaller batches for better performance
 *               batchSize:
 *                 type: number
 *                 description: Size of each processing batch (default 50)
 *     responses:
 *       201:
 *         description: Bulk status update job created successfully
 *       400:
 *         description: Invalid request data
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  '/status-update',
  bulkOperationLimiter,
  validateSchema(() => bulkStatusUpdateSchema as any),
  controller.bulkStatusUpdate
);

/**
 * @swagger
 * /api/admin/orders/bulk/assign-staff:
 *   post:
 *     tags: [Admin - Bulk Operations]
 *     summary: Bulk assign orders to staff
 *     description: Assign multiple orders to fulfillment staff members
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderIds
 *               - staffId
 *             properties:
 *               orderIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of order IDs (max 500)
 *               staffId:
 *                 type: string
 *                 description: Staff member ID or email
 *               staffName:
 *                 type: string
 *                 description: Staff member display name
 *               notes:
 *                 type: string
 *                 description: Assignment notes
 *               assignmentType:
 *                 type: string
 *                 enum: [fulfillment, customer_service, quality_check]
 *     responses:
 *       201:
 *         description: Bulk staff assignment job created successfully
 */
router.post(
  '/assign-staff',
  bulkOperationLimiter,
  validateSchema(() => bulkAssignStaffSchema as any),
  controller.bulkAssignStaff
);

/**
 * @swagger
 * /api/admin/orders/bulk/cancel:
 *   post:
 *     tags: [Admin - Bulk Operations]
 *     summary: Bulk cancel orders
 *     description: Cancel multiple orders with optional refund processing
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderIds
 *               - reason
 *             properties:
 *               orderIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of order IDs (max 500)
 *               reason:
 *                 type: string
 *                 description: Reason for cancellation
 *               processRefunds:
 *                 type: boolean
 *                 description: Whether to process refunds automatically
 *               notifyCustomers:
 *                 type: boolean
 *                 description: Whether to notify customers
 *               refundPercentage:
 *                 type: number
 *                 description: Percentage of order amount to refund (0-100)
 *     responses:
 *       201:
 *         description: Bulk cancellation job created successfully
 */
router.post(
  '/cancel',
  bulkOperationLimiter,
  validateSchema(() => bulkCancelSchema as any),
  controller.bulkCancelOrders
);

/**
 * @swagger
 * /api/admin/orders/bulk/refund:
 *   post:
 *     tags: [Admin - Bulk Operations]
 *     summary: Bulk process refunds
 *     description: Process refunds for multiple orders (Super Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderIds
 *               - reason
 *             properties:
 *               orderIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of order IDs (max 100 for financial safety)
 *               reason:
 *                 type: string
 *                 description: Reason for refund
 *               refundType:
 *                 type: string
 *                 enum: [full, partial]
 *               customAmounts:
 *                 type: object
 *                 description: Custom refund amounts by order ID (for partial refunds)
 *               refundMethod:
 *                 type: string
 *                 enum: [original, wallet, bank_transfer]
 *               notifyCustomers:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Bulk refund processing job created successfully
 *       403:
 *         description: Super Admin access required
 */
router.post(
  '/refund',
  authorize(['SUPER_ADMIN']), // Super admin only for refunds
  heavyOperationLimiter,
  validateSchema(() => bulkRefundSchema as any),
  controller.bulkProcessRefunds
);

/**
 * @swagger
 * /api/admin/orders/bulk/priority:
 *   post:
 *     tags: [Admin - Bulk Operations]
 *     summary: Bulk set order priority
 *     description: Set priority level for multiple orders
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/priority',
  bulkOperationLimiter,
  validateSchema(() => bulkPrioritySchema as any),
  controller.bulkSetPriority
);

/**
 * @swagger
 * /api/admin/orders/bulk/export:
 *   post:
 *     tags: [Admin - Bulk Operations]
 *     summary: Bulk export order data
 *     description: Export order data in various formats with Nigerian formatting
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/export',
  validateSchema(() => bulkExportSchema as any),
  controller.bulkExportData
);

/**
 * @swagger
 * /api/admin/orders/bulk/print-labels:
 *   post:
 *     tags: [Admin - Bulk Operations]
 *     summary: Bulk generate shipping labels
 *     description: Generate shipping labels for multiple orders
 *     security:
 *       - bearerAuth: []
 */
router.post('/print-labels', bulkOperationLimiter, controller.bulkGenerateLabels);

/**
 * @swagger
 * /api/admin/orders/bulk/send-notifications:
 *   post:
 *     tags: [Admin - Bulk Operations]
 *     summary: Bulk send notifications
 *     description: Send notifications to multiple customers with Nigerian network optimization
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/send-notifications',
  bulkOperationLimiter,
  validateSchema(() => bulkNotificationSchema as any),
  controller.bulkSendNotifications
);

/**
 * @swagger
 * /api/admin/orders/bulk/import:
 *   post:
 *     tags: [Admin - Bulk Operations]
 *     summary: Bulk import order data
 *     description: Import order updates from CSV/Excel data with Nigerian validation
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/import',
  bulkOperationLimiter,
  validateSchema(() => bulkImportSchema as any),
  controller.bulkImportData
);

// ========================================
// TEMPLATE AND VALIDATION ENDPOINTS
// ========================================

/**
 * @swagger
 * /api/admin/orders/bulk/template:
 *   get:
 *     tags: [Admin - Bulk Operations]
 *     summary: Get bulk import template
 *     description: Download template for bulk import operations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *           default: csv
 *     responses:
 *       200:
 *         description: Import template
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/template', controller.getImportTemplate);

/**
 * @swagger
 * /api/admin/orders/bulk/validation:
 *   post:
 *     tags: [Admin - Bulk Operations]
 *     summary: Validate bulk import data
 *     description: Validate import data before processing with Nigerian business rules
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/validation',
  validateSchema(() => bulkValidationSchema as any),
  controller.validateBulkData
);

// ========================================
// JOB MANAGEMENT ENDPOINTS
// ========================================

/**
 * @swagger
 * /api/admin/orders/bulk/jobs:
 *   get:
 *     tags: [Admin - Bulk Operations]
 *     summary: Get bulk processing jobs
 *     description: List all bulk processing jobs with filtering and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed, cancelled, partially_completed]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [status_update, assign_staff, cancel_orders, process_refunds, set_priority, export_data, generate_labels, send_notifications, import_data]
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of bulk processing jobs
 */
router.get('/jobs', controller.getBulkJobs);

/**
 * @swagger
 * /api/admin/orders/bulk/jobs/{jobId}:
 *   get:
 *     tags: [Admin - Bulk Operations]
 *     summary: Get specific bulk job
 *     description: Get detailed information about a specific bulk processing job
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bulk job details
 *       404:
 *         description: Job not found
 */
router.get('/jobs/:jobId', controller.getBulkJob);

/**
 * @swagger
 * /api/admin/orders/bulk/jobs/{jobId}:
 *   delete:
 *     tags: [Admin - Bulk Operations]
 *     summary: Cancel bulk job
 *     description: Cancel a running or pending bulk processing job
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job cancelled successfully
 *       404:
 *         description: Job not found
 *       400:
 *         description: Job cannot be cancelled
 */
router.delete('/jobs/:jobId', controller.cancelBulkJob);

/**
 * @swagger
 * /api/admin/orders/bulk/history:
 *   get:
 *     tags: [Admin - Bulk Operations]
 *     summary: Get bulk processing history
 *     description: Get historical data about completed bulk operations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Bulk processing history with analytics
 */
router.get('/history', controller.getBulkJobHistory);

// ========================================
// ANALYTICS ENDPOINT
// ========================================

/**
 * @swagger
 * /api/admin/orders/bulk/analytics:
 *   get:
 *     tags: [Admin - Bulk Operations]
 *     summary: Get bulk processing analytics
 *     description: Get comprehensive analytics about bulk processing performance
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bulk processing analytics and metrics
 */
router.get('/analytics', controller.getBulkProcessingAnalytics);

export default router;