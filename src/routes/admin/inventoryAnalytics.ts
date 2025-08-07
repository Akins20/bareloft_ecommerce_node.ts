import { Router } from "express";
import { AdminInventoryAnalyticsController } from "../../controllers/admin/AdminInventoryAnalyticsController";
import { authenticate } from "../../middleware/auth/authenticate";
import { authorize } from "../../middleware/auth/authorize";
import { rateLimiter } from "../../middleware/security/rateLimiter";
import { cacheMiddleware } from "../../middleware/cache/cacheMiddleware";

const router = Router();
const inventoryAnalyticsController = new AdminInventoryAnalyticsController();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize(["ADMIN", "SUPER_ADMIN"]));

// Apply rate limiting for admin analytics endpoints
router.use(rateLimiter.admin);

// ========================
// INVENTORY ANALYTICS ENDPOINTS
// ========================

/**
 * @route   GET /api/admin/inventory/analytics/overview
 * @desc    Get comprehensive inventory overview analytics with Nigerian business context
 * @access  Admin, Super Admin
 * @query   startDate - Start date for analytics period (ISO string)
 * @query   endDate - End date for analytics period (ISO string)
 * 
 * Returns:
 * - Summary metrics (total products, stock value, turnover rate, etc.)
 * - Nigerian business metrics (import vs local ratio, VAT impact, regional distribution)
 * - Stock distribution (in stock, low stock, out of stock, overstock)
 * - Category breakdown with performance ratings
 * - Stock trends and patterns
 */
router.get("/overview", 
  cacheMiddleware({ ttl: 30 * 60 }), // 30 minutes cache
  inventoryAnalyticsController.getInventoryOverview
);

/**
 * @route   GET /api/admin/inventory/analytics/turnover
 * @desc    Get comprehensive inventory turnover analysis
 * @access  Admin, Super Admin
 * @query   startDate - Start date for analysis period
 * @query   endDate - End date for analysis period
 * 
 * Returns:
 * - Overall turnover metrics
 * - Category-wise turnover analysis
 * - Product-level turnover with Nigerian context (import lead times, business days impact)
 * - Seasonal turnover patterns
 */
router.get("/turnover",
  cacheMiddleware({ ttl: 60 * 60 }), // 1 hour cache
  inventoryAnalyticsController.getInventoryTurnover
);

/**
 * @route   GET /api/admin/inventory/analytics/valuation
 * @desc    Get inventory valuation analysis with Nigerian business context and VAT
 * @access  Admin, Super Admin
 * 
 * Returns:
 * - Total inventory valuation in Naira
 * - Valuation method comparisons (FIFO, LIFO, Average Cost, Market Value)
 * - Category-wise valuation with Nigerian factors (import duty, currency risk)
 * - Historical valuation trends
 */
router.get("/valuation",
  cacheMiddleware({ ttl: 60 * 60 }), // 1 hour cache
  inventoryAnalyticsController.getInventoryValuation
);

/**
 * @route   GET /api/admin/inventory/analytics/trends
 * @desc    Get inventory trends and patterns analysis
 * @access  Admin, Super Admin
 * @query   timeframe - Analysis timeframe: week, month, quarter, year (default: month)
 * 
 * Returns:
 * - Stock level trends over time
 * - Seasonal analysis with Nigerian patterns (festive seasons, business cycles, weather)
 * - Demand forecasting data
 */
router.get("/trends",
  cacheMiddleware({ ttl: 30 * 60 }), // 30 minutes cache
  inventoryAnalyticsController.getInventoryTrends
);

/**
 * @route   GET /api/admin/inventory/analytics/category
 * @desc    Get category-wise inventory analytics
 * @access  Admin, Super Admin
 * @query   categoryId - Specific category ID (optional, returns all if not provided)
 * @query   startDate - Start date for analytics period
 * @query   endDate - End date for analytics period
 * 
 * Returns:
 * - Category metrics (products, stock value, turnover, margin)
 * - Performance analytics (sales growth, popularity rank, profitability rank)
 * - Stock analysis (optimal levels, overstock, understock, dead stock)
 * - Nigerian context (local vs imported, VAT impact, seasonal demand)
 */
router.get("/category",
  cacheMiddleware({ ttl: 30 * 60 }), // 30 minutes cache
  inventoryAnalyticsController.getCategoryAnalytics
);

/**
 * @route   GET /api/admin/inventory/analytics/seasonal
 * @desc    Get seasonal demand analysis with Nigerian market patterns
 * @access  Admin, Super Admin
 * 
 * Returns:
 * - Nigerian seasonal patterns (festive seasons, school calendar, business cycles, weather)
 * - Historical seasonal data and predictions
 * - Accuracy tracking for previous predictions
 */
router.get("/seasonal",
  cacheMiddleware({ ttl: 2 * 60 * 60 }), // 2 hours cache
  inventoryAnalyticsController.getSeasonalDemandAnalysis
);

/**
 * @route   GET /api/admin/inventory/analytics/performance
 * @desc    Get comprehensive product performance metrics
 * @access  Admin, Super Admin
 * @query   productId - Specific product ID (optional)
 * @query   limit - Maximum number of products to return (default: 50, max: 500)
 * 
 * Returns:
 * - Product performance metrics (stock, sales, financial, operational)
 * - Performance ratings (overall, profitability, velocity, efficiency)
 * - Actionable recommendations for each product
 */
router.get("/performance",
  cacheMiddleware({ ttl: 30 * 60 }), // 30 minutes cache
  inventoryAnalyticsController.getProductPerformanceMetrics
);

// ========================
// SPECIALIZED ANALYTICS ENDPOINTS
// ========================

/**
 * @route   GET /api/admin/inventory/analytics/charts
 * @desc    Get chart-ready data for inventory analytics dashboards
 * @access  Admin, Super Admin
 * @query   chartType - Type of chart: stock-value-trend, turnover-comparison, category-distribution, seasonal-patterns, performance-matrix
 * @query   timeframe - Data timeframe: week, month, quarter, year (default: month)
 * 
 * Returns:
 * - Chart configuration with data series
 * - Formatted data ready for frontend visualization libraries
 */
router.get("/charts",
  cacheMiddleware({ ttl: 15 * 60 }), // 15 minutes cache
  inventoryAnalyticsController.getInventoryChartData
);

/**
 * @route   GET /api/admin/inventory/analytics/kpis
 * @desc    Get key performance indicators dashboard data
 * @access  Admin, Super Admin
 * @query   period - KPI period: week, month, quarter, year (default: month)
 * 
 * Returns:
 * - Key inventory KPIs with trends and targets
 * - Performance against benchmarks
 * - Nigerian business context metrics
 */
router.get("/kpis",
  cacheMiddleware({ ttl: 15 * 60 }), // 15 minutes cache
  inventoryAnalyticsController.getInventoryKPIs
);

/**
 * @route   GET /api/admin/inventory/analytics/geographical
 * @desc    Get geographical inventory distribution for Nigerian states
 * @access  Admin, Super Admin
 * 
 * Returns:
 * - State-wise inventory distribution and performance
 * - Regional demand patterns and opportunities
 * - Market penetration insights
 */
router.get("/geographical",
  cacheMiddleware({ ttl: 60 * 60 }), // 1 hour cache
  inventoryAnalyticsController.getGeographicalAnalytics
);

/**
 * @route   GET /api/admin/inventory/analytics/abc-analysis
 * @desc    Get ABC analysis (Pareto analysis) for inventory optimization
 * @access  Admin, Super Admin
 * 
 * Returns:
 * - Products categorized into A, B, C categories based on sales value
 * - Management recommendations for each category
 * - Optimization opportunities
 */
router.get("/abc-analysis",
  cacheMiddleware({ ttl: 2 * 60 * 60 }), // 2 hours cache
  inventoryAnalyticsController.getABCAnalysis
);

// ========================
// REAL-TIME ANALYTICS
// ========================

/**
 * @route   GET /api/admin/inventory/analytics/realtime
 * @desc    Get real-time inventory metrics and alerts
 * @access  Admin, Super Admin
 * 
 * Returns:
 * - Current stock levels and movements
 * - Active alerts and notifications
 * - Recent inventory activities
 * - Live performance indicators
 */
router.get("/realtime", inventoryAnalyticsController.getInventoryKPIs);

export default router;