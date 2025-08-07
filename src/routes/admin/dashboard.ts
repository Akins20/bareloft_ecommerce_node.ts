import { Router } from "express";
import { AdminDashboardController } from "../../controllers/admin/AdminDashboardController";
import { authenticate } from "../../middleware/auth/authenticate";
import { authorize } from "../../middleware/auth/authorize";
import { rateLimiter } from "../../middleware/security/rateLimiter";

const router = Router();
const dashboardController = new AdminDashboardController();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize(["ADMIN", "SUPER_ADMIN"]));

// Apply rate limiting for admin endpoints
router.use(rateLimiter.admin);

/**
 * @route   GET /api/admin/dashboard/overview
 * @desc    Get comprehensive dashboard overview with key metrics
 * @access  Admin, Super Admin
 * @query   period - Time period for metrics (last_7_days, last_30_days, etc.)
 */
router.get("/overview", dashboardController.getDashboardOverview);

/**
 * @route   GET /api/admin/dashboard/sales
 * @desc    Get detailed sales analytics with Nigerian market insights
 * @access  Admin, Super Admin
 * @query   period - Time period for analytics (last_7_days, last_30_days, etc.)
 * @query   breakdown - Data breakdown (daily, weekly, monthly)
 */
router.get("/sales", dashboardController.getSalesAnalytics);

/**
 * @route   GET /api/admin/dashboard/inventory
 * @desc    Get inventory analytics with stock alerts and Nigerian compliance
 * @access  Admin, Super Admin
 * @query   includeAlerts - Include inventory alerts (true/false)
 */
router.get("/inventory", dashboardController.getInventoryAnalytics);

/**
 * @route   GET /api/admin/dashboard/customers
 * @desc    Get customer analytics with demographics and Nigerian market data
 * @access  Admin, Super Admin
 * @query   period - Time period for analytics
 */
router.get("/customers", dashboardController.getCustomerAnalytics);

/**
 * @route   GET /api/admin/dashboard/operations
 * @desc    Get operational metrics including order fulfillment and system health
 * @access  Admin, Super Admin
 * @query   period - Time period for metrics
 */
router.get("/operations", dashboardController.getOperationalMetrics);

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get quick stats for dashboard widgets with real-time data
 * @access  Admin, Super Admin
 * @query   period - Time period for stats (today, last_7_days, last_30_days)
 */
router.get("/stats", dashboardController.getQuickStats);

/**
 * @route   GET /api/admin/dashboard/alerts
 * @desc    Get real-time system alerts and notifications
 * @access  Admin, Super Admin
 * @query   severity - Alert severity filter (all, critical, warning, info)
 * @query   limit - Number of alerts to return (default: 20)
 */
router.get("/alerts", dashboardController.getRealTimeAlerts);

/**
 * @route   POST /api/admin/dashboard/export
 * @desc    Export dashboard data in various formats with Nigerian compliance
 * @access  Admin, Super Admin
 * @body    type - Export type (overview, sales, customers, inventory, operations)
 * @body    format - Export format (csv, excel, pdf)
 * @body    period - Time period for export
 * @body    includeCharts - Include chart data in export
 */
router.post("/export", dashboardController.exportDashboardData);

// ========================
// INVENTORY DASHBOARD ROUTES (Phase 2.3)
// ========================

/**
 * @route   GET /api/admin/dashboard/inventory/widgets
 * @desc    Get inventory dashboard widgets for comprehensive analytics
 * @access  Admin, Super Admin
 * 
 * Returns:
 * - KPI widgets (stock value, turnover rate, alerts, dead stock)
 * - Chart widgets (trends, distribution, performance matrix)
 * - Table widgets (low stock alerts, top products, category performance)
 * - Alert widgets (inventory notifications and action items)
 */
router.get("/inventory/widgets", dashboardController.getInventoryDashboardWidgets);

/**
 * @route   GET /api/admin/dashboard/inventory/layout
 * @desc    Get inventory dashboard layout configuration
 * @access  Admin, Super Admin
 * @query   layoutId - Specific layout ID (optional, returns default if not provided)
 * 
 * Returns:
 * - Dashboard layout with widget positions and configurations
 * - Responsive grid layout for different screen sizes
 */
router.get("/inventory/layout", dashboardController.getInventoryDashboardLayout);

/**
 * @route   GET /api/admin/dashboard/inventory/realtime
 * @desc    Get real-time inventory dashboard data with live updates
 * @access  Admin, Super Admin
 * 
 * Returns:
 * - Real-time widget data with current values
 * - Auto-refresh configuration and intervals
 * - Nigerian business context data
 */
router.get("/inventory/realtime", dashboardController.getInventoryRealTimeDashboard);

/**
 * @route   GET /api/admin/dashboard/inventory/widgets/:widgetId
 * @desc    Get specific inventory widget data
 * @access  Admin, Super Admin
 * @param   widgetId - Widget ID to retrieve
 * 
 * Returns:
 * - Detailed widget data and configuration
 * - Chart-ready data structures
 * - Nigerian currency formatting
 */
router.get("/inventory/widgets/:widgetId", dashboardController.getInventoryWidgetData);

/**
 * @route   PUT /api/admin/dashboard/inventory/widgets/:widgetId/config
 * @desc    Update inventory widget configuration
 * @access  Admin, Super Admin
 * @param   widgetId - Widget ID to update
 * @body    configuration - Widget configuration object
 * 
 * Returns:
 * - Updated widget configuration
 * - Real-time refresh of widget data
 */
router.put("/inventory/widgets/:widgetId/config", dashboardController.updateInventoryWidgetConfig);

/**
 * @route   GET /api/admin/dashboard/inventory/nigerian-widgets
 * @desc    Get Nigerian-specific inventory dashboard widgets
 * @access  Admin, Super Admin
 * 
 * Returns:
 * - VAT summary and compliance widgets
 * - Import vs Local product analysis
 * - Regional sales distribution by Nigerian states
 * - Nigerian business hours and peak season indicators
 */
router.get("/inventory/nigerian-widgets", dashboardController.getNigerianInventoryWidgets);

/**
 * @route   GET /api/admin/dashboard/inventory/summary
 * @desc    Get inventory dashboard summary for main dashboard integration
 * @access  Admin, Super Admin
 * 
 * Returns:
 * - Key inventory metrics summary
 * - Critical alerts and action items
 * - Nigerian business context
 * - Quick action recommendations
 */
router.get("/inventory/summary", dashboardController.getInventoryDashboardSummary);

export default router;