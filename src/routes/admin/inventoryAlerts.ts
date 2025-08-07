import { Router } from "express";
import { AdminInventoryAlertController } from "../../controllers/admin/AdminInventoryAlertController";
import { NotificationService } from "../../services/notifications/NotificationService";
import { CacheService } from "../../services/cache/CacheService";
import { authenticate } from "../../middleware/auth/authenticate";
import { authorize } from "../../middleware/auth/authorize";
import { validateRequest } from "../../middleware/validation/validateRequest";
import { body, param, query } from "express-validator";

const router = Router();

// Initialize services and controller
const notificationService = new NotificationService();
const cacheService = new CacheService();
const alertController = new AdminInventoryAlertController(notificationService, cacheService);

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize(["ADMIN", "SUPER_ADMIN"]));

/**
 * Alert Management Routes
 */

// GET /api/admin/inventory/alerts - View all active alerts
router.get(
  "/alerts",
  [
    query("severity").optional().isIn(["info", "low", "medium", "high", "critical", "urgent"]),
    query("type").optional().isIn([
      "LOW_STOCK", "OUT_OF_STOCK", "CRITICAL_STOCK", "REORDER_NEEDED", 
      "SLOW_MOVING", "FAST_MOVING", "OVERSTOCK", "NEGATIVE_STOCK", "RESERVATION_EXPIRED"
    ]),
    query("productId").optional().isString(),
    query("categoryId").optional().isString(),
    query("isRead").optional().isBoolean(),
    query("isAcknowledged").optional().isBoolean(),
    query("isDismissed").optional().isBoolean(),
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  alertController.getAlerts
);

// POST /api/admin/inventory/alerts/configure - Configure alert thresholds and preferences
router.post(
  "/alerts/configure",
  [
    body("name").isString().isLength({ min: 1, max: 100 }).withMessage("Name is required and must be between 1-100 characters"),
    body("description").optional().isString().isLength({ max: 500 }),
    body("lowStockEnabled").isBoolean(),
    body("lowStockThreshold").optional().isInt({ min: 0 }),
    body("criticalStockEnabled").isBoolean(),
    body("criticalStockThreshold").optional().isInt({ min: 0 }),
    body("outOfStockEnabled").isBoolean(),
    body("reorderNeededEnabled").isBoolean(),
    body("slowMovingEnabled").isBoolean(),
    body("slowMovingDays").optional().isInt({ min: 1 }),
    body("emailEnabled").isBoolean(),
    body("emailAddress").optional().isEmail(),
    body("smsEnabled").isBoolean(),
    body("phoneNumber").optional().isString(),
    body("pushEnabled").isBoolean(),
    body("respectBusinessHours").optional().isBoolean(),
    body("businessHoursStart").optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body("businessHoursEnd").optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body("businessDays").optional().isArray(),
    body("businessDays.*").optional().isIn(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
    body("timezone").optional().isString(),
    body("maxAlertsPerHour").optional().isInt({ min: 1 }),
    body("maxAlertsPerDay").optional().isInt({ min: 1 }),
    body("categoryIds").optional().isArray(),
    body("productIds").optional().isArray(),
    body("minStockValue").optional().isFloat({ min: 0 }),
  ],
  validateRequest,
  alertController.configureAlerts
);

// PUT /api/admin/inventory/alerts/:alertId - Update alert status (acknowledge, dismiss)
router.put(
  "/alerts/:alertId",
  [
    param("alertId").isString().withMessage("Alert ID is required"),
    body("action").isIn(["acknowledge", "dismiss", "read"]).withMessage("Action must be acknowledge, dismiss, or read"),
    body("notes").optional().isString().isLength({ max: 500 }),
  ],
  validateRequest,
  alertController.updateAlert
);

// GET /api/admin/inventory/alerts/history - Alert history and trends
router.get(
  "/alerts/history",
  [
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  alertController.getAlertHistory
);

// POST /api/admin/inventory/alerts/test - Test alert notifications
router.post(
  "/alerts/test",
  [
    body("configurationId").isString().withMessage("Configuration ID is required"),
    body("alertType").isIn([
      "LOW_STOCK", "OUT_OF_STOCK", "CRITICAL_STOCK", "REORDER_NEEDED", 
      "SLOW_MOVING", "FAST_MOVING", "OVERSTOCK", "NEGATIVE_STOCK", "RESERVATION_EXPIRED"
    ]).withMessage("Valid alert type is required"),
    body("productId").optional().isString(),
  ],
  validateRequest,
  alertController.testAlert
);

// POST /api/admin/inventory/alerts/monitor - Manually trigger monitoring
router.post("/alerts/monitor", alertController.monitorInventory);

/**
 * Reorder Management Routes
 */

// GET /api/admin/inventory/reorder-suggestions - AI-powered reorder recommendations
router.get(
  "/reorder-suggestions",
  [
    query("status").optional().isIn([
      "suggested", "pending_approval", "approved", "order_placed", "completed", "cancelled", "rejected"
    ]),
    query("productId").optional().isString(),
    query("supplierId").optional().isString(),
    query("priority").optional().isIn(["info", "low", "medium", "high", "critical", "urgent"]),
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  alertController.getReorderSuggestions
);

// POST /api/admin/inventory/reorder-suggestion - Create manual reorder suggestion
router.post(
  "/reorder-suggestion",
  [
    body("productId").isString().withMessage("Product ID is required"),
    body("quantity").optional().isInt({ min: 1 }),
    body("reason").optional().isString().isLength({ max: 500 }),
    body("preferredSupplierId").optional().isString(),
    body("notes").optional().isString().isLength({ max: 1000 }),
    body("priority").optional().isIn(["info", "low", "medium", "high", "critical", "urgent"]),
  ],
  validateRequest,
  alertController.createReorderSuggestion
);

// POST /api/admin/inventory/reorder/:productId - Create reorder request
router.post(
  "/reorder/:productId",
  [
    param("productId").isString().withMessage("Product ID is required"),
    body("suggestionId").optional().isString(),
    body("supplierId").optional().isString(),
    body("quantity").isInt({ min: 1 }).withMessage("Valid quantity is required"),
    body("unitCost").isFloat({ min: 0 }).withMessage("Valid unit cost is required"),
    body("expectedDeliveryDate").optional().isISO8601(),
    body("requiresImport").optional().isBoolean(),
    body("notes").optional().isString().isLength({ max: 1000 }),
  ],
  validateRequest,
  alertController.createReorderRequest
);

// GET /api/admin/inventory/pending-reorders - View pending reorder requests
router.get(
  "/pending-reorders",
  [
    query("status").optional().isIn([
      "suggested", "pending_approval", "approved", "order_placed", "completed", "cancelled", "rejected"
    ]),
    query("productId").optional().isString(),
    query("supplierId").optional().isString(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  alertController.getPendingReorders
);

// PUT /api/admin/inventory/reorder/:orderId - Approve/modify reorder requests
router.put(
  "/reorder/:orderId",
  [
    param("orderId").isString().withMessage("Order ID is required"),
    body("action").isIn(["approve", "reject", "complete", "cancel"]).withMessage("Action must be approve, reject, complete, or cancel"),
    body("notes").optional().isString().isLength({ max: 1000 }),
    body("actualDeliveryDate").optional().isISO8601(),
    body("orderReference").optional().isString().isLength({ max: 100 }),
    body("supplierReference").optional().isString().isLength({ max: 100 }),
    body("trackingNumber").optional().isString().isLength({ max: 100 }),
  ],
  validateRequest,
  alertController.updateReorderRequest
);

// GET /api/admin/inventory/reorder-history - Reorder history and analytics
router.get(
  "/reorder-history",
  [
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  alertController.getReorderHistory
);

/**
 * Supplier Management Routes
 */

// GET /api/admin/inventory/suppliers - Get supplier list
router.get(
  "/suppliers",
  [
    query("isLocal").optional().isBoolean(),
    query("isActive").optional().isBoolean(),
  ],
  validateRequest,
  alertController.getSuppliers
);

// POST /api/admin/inventory/suppliers - Create new supplier
router.post(
  "/suppliers",
  [
    body("name").isString().isLength({ min: 1, max: 100 }).withMessage("Supplier name is required and must be between 1-100 characters"),
    body("code").optional().isString().isLength({ max: 50 }),
    body("contactPerson").optional().isString().isLength({ max: 100 }),
    body("email").optional().isEmail(),
    body("phone").optional().isString(),
    body("whatsapp").optional().isString(),
    body("address").optional().isObject(),
    body("address.street").optional().isString(),
    body("address.city").optional().isString(),
    body("address.state").optional().isString(),
    body("address.country").optional().isString(),
    body("address.postalCode").optional().isString(),
    body("isLocal").optional().isBoolean(),
    body("businessType").optional().isIn(["manufacturer", "distributor", "importer", "wholesaler"]),
    body("taxId").optional().isString().isLength({ max: 50 }),
    body("cacNumber").optional().isString().isLength({ max: 50 }),
    body("paymentTerms").optional().isString().isLength({ max: 200 }),
    body("currency").optional().isString().isLength({ min: 3, max: 3 }),
    body("creditLimit").optional().isFloat({ min: 0 }),
    body("discountPercentage").optional().isFloat({ min: 0, max: 100 }),
    body("averageLeadTimeDays").optional().isInt({ min: 1 }),
  ],
  validateRequest,
  alertController.createSupplier
);

export default router;