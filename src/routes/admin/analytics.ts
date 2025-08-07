import { Router } from "express";
import { AdminAnalyticsController } from "../../controllers/admin/AdminAnalyticsController";
import { authenticate } from "../../middleware/auth/authenticate";
import { authorize } from "../../middleware/auth/authorize";
import { rateLimiter } from "../../middleware/security/rateLimiter";

const router = Router();
const analyticsController = new AdminAnalyticsController();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize(["ADMIN", "SUPER_ADMIN"]));

// Apply rate limiting for admin endpoints
router.use(rateLimiter.admin);

/**
 * @route   GET /api/admin/analytics/dashboard
 * @desc    Get comprehensive analytics dashboard data
 * @access  Admin, Super Admin
 * @query   period - Time period (today, yesterday, last_7_days, last_30_days, this_month, last_month, this_year, custom)
 * @query   startDate - Custom period start date (required if period=custom)
 * @query   endDate - Custom period end date (required if period=custom)
 * @query   metrics - Array of specific metrics to include
 */
router.get("/dashboard", analyticsController.getDashboardAnalytics);

/**
 * @route   GET /api/admin/analytics/products
 * @desc    Get product performance analytics
 * @access  Admin, Super Admin
 * @query   period - Time period (last_7_days, last_30_days, last_90_days, this_year, custom)
 * @query   startDate - Custom period start date (required if period=custom)
 * @query   endDate - Custom period end date (required if period=custom)
 * @query   categoryId - Filter by category ID
 * @query   limit - Number of top products to return (default: 10, max: 100)
 */
router.get("/products", analyticsController.getProductAnalytics);

/**
 * @route   GET /api/admin/analytics/customers
 * @desc    Get customer analytics and segmentation
 * @access  Admin, Super Admin
 * @query   period - Time period (last_30_days, last_90_days, last_6_months, this_year, custom)
 * @query   startDate - Custom period start date (required if period=custom)
 * @query   endDate - Custom period end date (required if period=custom)
 * @query   segmentBy - Segmentation method (new_vs_returning, order_frequency, total_spent, location)
 */
router.get("/customers", analyticsController.getCustomerAnalytics);

/**
 * @route   GET /api/admin/analytics/real-time
 * @desc    Get real-time analytics metrics
 * @access  Admin, Super Admin
 */
router.get("/real-time", analyticsController.getRealTimeMetrics);

/**
 * @route   POST /api/admin/analytics/reports
 * @desc    Generate and export analytics report
 * @access  Admin, Super Admin
 * @body    reportType (sales, customers, products, inventory, comprehensive), period, startDate?, endDate?, format?, includeCharts?
 */
router.post("/reports", analyticsController.generateReport);

export default router;