import { Router } from "express";
import { AdminInventoryController } from "../../controllers/admin/AdminInventoryController";
import { authenticate } from "../../middleware/auth/authenticate";
import { authorize } from "../../middleware/auth/authorize";
import { rateLimiter } from "../../middleware/security/rateLimiter";
import alertRoutes from "./inventoryAlerts";
import analyticsRoutes from "./inventoryAnalytics";
import reportsRoutes from "./inventoryReports";

const router = Router();
const inventoryController = new AdminInventoryController();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize(["ADMIN", "SUPER_ADMIN"]));

// Apply rate limiting for admin endpoints
router.use(rateLimiter.admin);

// ========================
// INVENTORY OVERVIEW & ANALYTICS
// ========================

/**
 * @route   GET /api/admin/inventory
 * @desc    Get comprehensive inventory overview with stock levels and Nigerian business context
 * @access  Admin, Super Admin
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20, max: 100)
 * @query   searchTerm - Search term for product name, SKU
 * @query   categoryId - Filter by category ID
 * @query   lowStock - Filter low stock items (true/false)
 * @query   outOfStock - Filter out of stock items (true/false)
 * @query   status - Filter by inventory status
 */
router.get("/", inventoryController.getInventoryOverview);

/**
 * @route   GET /api/admin/inventory/statistics
 * @desc    Get comprehensive inventory statistics with Nigerian business metrics
 * @access  Admin, Super Admin
 */
router.get("/statistics", inventoryController.getInventoryStatistics);

/**
 * @route   GET /api/admin/inventory/low-stock
 * @desc    Get low stock alerts with priority and business impact assessment
 * @access  Admin, Super Admin
 * @query   threshold - Low stock threshold (default: 10)
 * @query   categoryId - Filter by category ID
 * @query   includeOutOfStock - Include out of stock items (default: true)
 */
router.get("/low-stock", inventoryController.getLowStockItems);

/**
 * @route   GET /api/admin/inventory/out-of-stock
 * @desc    Get out of stock products with reorder urgency
 * @access  Admin, Super Admin
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20, max: 100)
 * @query   categoryId - Filter by category ID
 */
router.get("/out-of-stock", inventoryController.getOutOfStockItems);

// ========================
// INVENTORY MOVEMENTS
// ========================

/**
 * @route   GET /api/admin/inventory/movements
 * @desc    Get comprehensive inventory movement history with Nigerian time formatting
 * @access  Admin, Super Admin
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 50, max: 100)
 * @query   productId - Filter by specific product
 * @query   dateFrom - Filter movements from this date
 * @query   dateTo - Filter movements until this date
 * @query   type - Filter by movement type (IN, OUT, ADJUSTMENT, etc.)
 * @query   createdBy - Filter by user who created the movement
 */
router.get("/movements", inventoryController.getInventoryMovements);

// ========================
// INVENTORY MANAGEMENT
// ========================

/**
 * @route   GET /api/admin/inventory/:productId
 * @desc    Get detailed inventory information for specific product
 * @access  Admin, Super Admin
 * @param   productId - Product ID (UUID)
 */
router.get("/:productId", inventoryController.getProductInventory);

/**
 * @route   PUT /api/admin/inventory/:productId
 * @desc    Update inventory settings for a product with admin logging
 * @access  Admin, Super Admin
 * @param   productId - Product ID (UUID)
 * @body    quantity?, lowStockThreshold?, reorderPoint?, reorderQuantity?, allowBackorder?, reason?, notes?
 */
router.put("/:productId", inventoryController.updateInventory);

/**
 * @route   POST /api/admin/inventory/:productId/adjust
 * @desc    Perform inventory adjustment with comprehensive audit trail
 * @access  Admin, Super Admin
 * @param   productId - Product ID (UUID)
 * @body    adjustmentType (set, increase, decrease), quantity, reason, notes?, unitCost?
 */
router.post("/:productId/adjust", inventoryController.adjustInventory);

// ========================
// BULK OPERATIONS
// ========================

/**
 * @route   POST /api/admin/inventory/bulk-update
 * @desc    Perform bulk inventory updates with Nigerian compliance validation
 * @access  Admin, Super Admin
 * @body    updates[] (productId, quantity, reason?), batchReason?, notes?
 */
router.post("/bulk-update", inventoryController.bulkUpdateInventory);

// ========================
// STOCK RESERVATIONS
// ========================

/**
 * @route   POST /api/admin/inventory/reserve
 * @desc    Reserve stock for orders with expiration management
 * @access  Admin, Super Admin
 * @body    productId, quantity, orderId?, cartId?, reason, expirationMinutes?
 */
router.post("/reserve", inventoryController.reserveStock);

/**
 * @route   POST /api/admin/inventory/release
 * @desc    Release reserved stock manually
 * @access  Admin, Super Admin
 * @body    reservationId?, orderId?, cartId?, reason?
 */
router.post("/release", inventoryController.releaseReservedStock);

// ========================
// ALERTS AND REORDERING (Phase 2.2)
// ========================

/**
 * Mount alert and reordering routes
 * All routes are under /api/admin/inventory/
 * - /alerts/* - Alert management
 * - /reorder-suggestions - Reorder suggestions
 * - /reorder/* - Reorder management  
 * - /suppliers - Supplier management
 */
router.use("/", alertRoutes);

// ========================
// ANALYTICS AND REPORTING (Phase 2.3)
// ========================

/**
 * Mount inventory analytics routes
 * All routes are under /api/admin/inventory/analytics/
 * - /overview - Comprehensive inventory overview analytics
 * - /turnover - Inventory turnover analysis
 * - /valuation - Inventory valuation with Nigerian context
 * - /trends - Stock level trends and patterns  
 * - /category - Category-wise analytics
 * - /seasonal - Seasonal demand patterns
 * - /performance - Product performance metrics
 * - /charts - Chart-ready data for dashboards
 * - /kpis - Key performance indicators
 * - /geographical - Nigerian state-wise analysis
 * - /abc-analysis - ABC analysis for inventory optimization
 */
router.use("/analytics", analyticsRoutes);

/**
 * Mount inventory reporting routes
 * All routes are under /api/admin/inventory/reports/
 * - /templates - Available report templates
 * - /generate - Generate custom reports
 * - /schedule - Schedule recurring reports
 * - /history - Report generation history
 * - /compliance - Nigerian compliance reports
 * - /export-options - Export format options
 */
router.use("/reports", reportsRoutes);

export default router;