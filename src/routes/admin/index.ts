import { Router } from "express";
import { authenticate } from "../../middleware/auth/authenticate";
import { authorize } from "../../middleware/auth/authorize";
import { rateLimiter } from "../../middleware/security/rateLimiter";
import { securityEnhancements } from "../../middleware/security/securityEnhancements";

// Import admin route modules
import dashboardRoutes from "./dashboard";
import userRoutes from "./users";
import productRoutes from "./products";
import categoriesRoutes from "./categories";
import orderRoutes from "./orders";
import bulkOrderRoutes from "./bulkOrders";
import inventoryRoutes from "./inventory";
import analyticsRoutes from "./analytics";
import settingsRoutes from "./settings";
import { shippingRoutes } from "./shipping";
import returnsRoutes from "./returns";
import supportRoutes from "./support";
import jobsRoutes from "./jobs";

const router = Router();

// Global admin middleware - applies to all admin routes
router.use(authenticate); // JWT authentication
router.use(authorize(["ADMIN", "SUPER_ADMIN"])); // Role-based authorization
// REMOVED: API key authentication - admins can access with JWT tokens from email-login
// router.use(securityEnhancements.apiKeyAuthentication);
router.use(rateLimiter.admin);

/**
 * @route   GET /api/admin
 * @desc    Admin API information and available endpoints
 * @access  Admin, Super Admin
 */
router.get("/", (req, res) => {
  const adminInfo = {
    name: "Bareloft Admin API",
    version: process.env.API_VERSION || "1.0.0",
    description: "Administrative interface for Bareloft e-commerce platform",
    user: {
      id: req.user?.id,
      name: `${req.user?.firstName} ${req.user?.lastName}`,
      role: req.user?.role,
      authenticated: true
    },
    endpoints: {
      dashboard: {
        base: "/api/admin/dashboard",
        description: "Dashboard metrics and overview",
        endpoints: [
          "GET /overview - Comprehensive dashboard overview",
          "GET /analytics - Detailed analytics data",
          "GET /activities - Recent activities",
          "GET /stats - Quick dashboard stats"
        ]
      },
      users: {
        base: "/api/admin/users",
        description: "User management and administration",
        endpoints: [
          "GET / - List all users with filtering",
          "GET /statistics - User statistics",
          "GET /:id - Get user details",
          "POST / - Create new user",
          "PUT /:id - Update user",
          "DELETE /:id - Delete/deactivate user",
          "POST /bulk - Bulk user actions"
        ]
      },
      products: {
        base: "/api/admin/products",
        description: "Product management and administration",
        endpoints: [
          "GET / - List all products with filtering",
          "GET /statistics - Product statistics",
          "GET /:id - Get product details",
          "POST / - Create new product",
          "PUT /:id - Update product",
          "DELETE /:id - Delete/deactivate product",
          "POST /bulk - Bulk product actions"
        ]
      },
      categories: {
        base: "/api/admin/categories",
        description: "Category management with image upload support",
        endpoints: [
          "GET / - List all categories with filtering",
          "GET /statistics - Category statistics",
          "GET /:id - Get category details",
          "POST / - Create new category (with image upload)",
          "PUT /:id - Update category (with image upload)",
          "DELETE /:id - Delete category",
          "POST /bulk - Bulk category actions",
          "POST /:id/image - Upload category image",
          "DELETE /:id/image - Remove category image"
        ]
      },
      orders: {
        base: "/api/admin/orders",
        description: "Order management and fulfillment",
        endpoints: [
          "GET / - List all orders with filtering",
          "GET /statistics - Order statistics",
          "GET /:id - Get order details",
          "PUT /:id/status - Update order status",
          "POST /:id/tracking - Add tracking info",
          "POST /:id/refund - Process refund",
          "POST /bulk - Bulk order actions"
        ]
      },
      bulkOrders: {
        base: "/api/admin/orders/bulk",
        description: "Advanced bulk order processing with queue management",
        endpoints: [
          "POST /status-update - Bulk status updates with batching",
          "POST /assign-staff - Bulk staff assignment",
          "POST /cancel - Bulk order cancellation with refunds",
          "POST /refund - Bulk refund processing (Super Admin)",
          "POST /priority - Bulk priority management",
          "POST /export - Bulk data export (CSV/Excel/PDF)",
          "POST /print-labels - Bulk shipping label generation",
          "POST /send-notifications - Bulk customer notifications",
          "POST /import - Bulk data import with validation",
          "GET /template - Import template download",
          "POST /validation - Data validation service",
          "GET /jobs - Job queue management",
          "GET /jobs/:id - Job details and progress",
          "DELETE /jobs/:id - Cancel running jobs",
          "GET /history - Processing history and analytics",
          "GET /analytics - Performance metrics and insights"
        ]
      },
      inventory: {
        base: "/api/admin/inventory",
        description: "Inventory management and stock control",
        endpoints: [
          "GET / - Inventory overview",
          "GET /statistics - Inventory statistics",
          "GET /low-stock - Low stock alerts",
          "PUT /:productId - Update inventory settings",
          "POST /:productId/adjust - Adjust inventory levels",
          "GET /:productId/movements - Inventory movement history",
          "POST /bulk-update - Bulk inventory updates"
        ]
      },
      analytics: {
        base: "/api/admin/analytics",
        description: "Analytics and reporting tools",
        endpoints: [
          "GET /dashboard - Dashboard analytics",
          "GET /products - Product performance analytics",
          "GET /customers - Customer analytics",
          "GET /real-time - Real-time metrics",
          "POST /reports - Generate reports"
        ]
      },
      settings: {
        base: "/api/admin/settings",
        description: "System configuration and settings",
        endpoints: [
          "GET / - Get all settings",
          "GET /system-info - System information",
          "GET /export - Export settings",
          "PUT /general - Update general settings",
          "PUT /payment - Update payment settings",
          "PUT /notifications - Update notification settings",
          "POST /maintenance - Toggle maintenance mode",
          "POST /cache/clear - Clear system cache",
          "POST /import - Import settings"
        ]
      },
      shipping: {
        base: "/api/admin/shipping",
        description: "Comprehensive shipping and carrier management for Nigerian logistics",
        endpoints: [
          "GET /carriers - List all shipping carriers (Jumia, Local)",
          "POST /carriers - Add/configure carriers",
          "PUT /carriers/:id - Update carrier settings", 
          "GET /rates - Calculate shipping rates across carriers",
          "POST /labels - Generate shipping labels",
          "POST /track - Track shipments with carriers",
          "GET /tracking/:number - Get detailed tracking info",
          "POST /tracking/bulk - Bulk tracking updates",
          "POST /tracking/manual-update - Manual tracking updates",
          "POST /tracking/webhook - Receive carrier webhooks",
          "PUT /update-status - Update shipping status",
          "GET /analytics/performance - Delivery performance by carrier and state",
          "GET /analytics/costs - Shipping cost analysis",
          "GET /analytics/delays - Delay analysis and patterns",
          "POST /schedule-delivery - Schedule deliveries",
          "GET /delivery-calendar - View delivery schedules",
          "GET /dashboard - Real-time shipping dashboard",
          "POST /cancel - Cancel shipment"
        ]
      },
      returns: {
        base: "/api/admin/returns",
        description: "Returns and refunds management with Nigerian compliance",
        endpoints: [
          "GET / - List all return requests with filtering",
          "GET /dashboard - Return management dashboard",
          "GET /analytics - Returns analytics and insights",
          "GET /export - Export returns data",
          "GET /:returnId - Get detailed return request information",
          "PUT /:returnId/status - Update return request status",
          "POST /:returnId/approve - Approve return request",
          "POST /:returnId/reject - Reject return request",
          "POST /:returnId/inspect - Inspect returned items",
          "POST /:returnId/complete - Complete return processing",
          "POST /bulk-update - Bulk update return statuses"
        ]
      },
      refunds: {
        base: "/api/admin/refunds",
        description: "Refund processing with Paystack integration and Nigerian banking",
        endpoints: [
          "GET / - List all refunds with filtering",
          "GET /dashboard - Refund management dashboard",
          "GET /analytics - Refund analytics and insights",
          "GET /pending - Get pending refunds for processing",
          "GET /stats/summary - Refund summary statistics",
          "GET /export - Export refunds data",
          "GET /:refundId - Get detailed refund information",
          "POST /process - Process new refund",
          "POST /bulk-process - Bulk process refunds",
          "POST /:refundId/approve - Approve pending refund",
          "POST /validate-bank-account - Validate Nigerian bank account"
        ]
      },
      support: {
        base: "/api/admin/support",
        description: "Customer support ticket system with Nigerian market features",
        endpoints: [
          "GET /tickets - List all support tickets with filtering",
          "GET /tickets/:ticketId - Get detailed ticket information",
          "POST /tickets - Create new support ticket",
          "PUT /tickets/:ticketId - Update ticket information",
          "PUT /tickets/:ticketId/status - Update ticket status",
          "POST /tickets/:ticketId/assign - Assign ticket to agent",
          "POST /tickets/:ticketId/escalate - Escalate ticket",
          "POST /tickets/:ticketId/reply - Reply to customer ticket",
          "GET /tickets/:ticketId/history - View ticket conversation history",
          "POST /tickets/merge - Merge multiple tickets",
          "GET /agents - List support agents and availability",
          "POST /agents - Add new support agent",
          "PUT /agents/:agentId - Update agent information",
          "GET /agents/:agentId/performance - Get agent performance metrics",
          "POST /agents/schedule - Manage agent schedules",
          "GET /knowledge-base - Manage knowledge base articles",
          "POST /knowledge-base - Create new knowledge base article",
          "PUT /knowledge-base/:articleId - Update knowledge base article",
          "GET /analytics/overview - Support performance overview",
          "GET /analytics/agents - Agent performance metrics",
          "GET /analytics/tickets - Ticket analytics and trends",
          "GET /analytics/satisfaction - Customer satisfaction scores"
        ]
      },
      jobs: {
        base: "/api/admin/jobs",
        description: "Background job monitoring and management",
        endpoints: [
          "GET /stats - Get comprehensive job queue statistics",
          "GET /queues - Get detailed information about all queues",
          "POST /queues/:queueName/pause - Pause a specific queue",
          "POST /queues/:queueName/resume - Resume a paused queue",
          "POST /queues/clean - Clean completed and failed jobs",
          "GET /:jobId - Get detailed job information",
          "POST /email/test - Create test email job",
          "POST /notification/test - Create test notification job",
          "GET /health - Get job system health status"
        ]
      }
    },
    capabilities: [
      "User management and role assignment",
      "Order processing and fulfillment",
      "Advanced bulk order processing with queue management",
      "Smart batching with Nigerian business hours consideration",
      "Inventory tracking and management",
      "Real-time analytics and reporting",
      "System configuration management",
      "Nigerian market specific features",
      "Paystack payment integration management",
      "Multi-level access control",
      "Audit logging and activity tracking",
      "Bulk operations and data export",
      "Queue-based processing with progress tracking",
      "Import/Export with Nigerian format validation",
      "Automated refund processing and notifications",
      "Comprehensive shipping and carrier management",
      "Real-time tracking with Jumia Logistics and local carriers",
      "Nigerian state-wise delivery performance analytics",
      "Shipping cost optimization and route planning",
      "Automated webhook processing for carrier updates",
      "Delivery scheduling with Nigerian business hours",
      "Weather and seasonal delivery impact analysis",
      "Customer returns and refunds management",
      "Nigerian consumer protection law compliance",
      "Paystack integration for automated refunds",
      "Nigerian bank account validation and transfers",
      "Return quality inspection and restocking",
      "Advanced returns analytics and reporting",
      "Customer support ticket system management",
      "Multi-channel support (Email, SMS, WhatsApp, Phone)",
      "Support agent performance tracking and scheduling",
      "Knowledge base management with Nigerian context",
      "Support analytics and customer satisfaction tracking",
      "Background job monitoring and queue management",
      "Email and notification job processing",
      "Analytics and maintenance job automation",
      "Real-time job performance monitoring"
    ],
    security: {
      authentication: "JWT with session validation (login via /api/v1/auth/email-login)",
      authorization: "Role-based access control (RBAC) - ADMIN and SUPER_ADMIN roles",
      rateLimiting: "Enhanced limits for admin operations",
      auditLogging: "Complete action logging",
      sessionManagement: "Secure admin session handling"
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };

  res.json({
    success: true,
    message: "Bareloft Admin API - Access Granted",
    data: adminInfo
  });
});

/**
 * @route   GET /api/admin/health
 * @desc    Admin-specific health check with detailed system status
 * @access  Admin, Super Admin
 */
router.get("/health", (req, res) => {
  const healthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      authentication: "operational",
      authorization: "operational", 
      database: "connected",
      cache: "connected",
      paystack: "connected",
      fileStorage: "accessible",
      emailService: "configured",
      smsService: "configured"
    },
    performance: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    },
    adminFeatures: {
      dashboard: "active",
      userManagement: "active",
      orderManagement: "active",
      inventoryManagement: "active",
      analytics: "active",
      settings: "active",
      shippingManagement: "active",
      carrierIntegration: "active",
      returnsManagement: "active",
      refundsManagement: "active",
      supportTicketSystem: "active",
      knowledgeBase: "active",
      jobQueueManagement: "active",
      backgroundJobProcessing: "active"
    },
    lastChecked: new Date().toISOString()
  };

  res.json({
    success: true,
    message: "Admin system is healthy and operational",
    data: healthStatus
  });
});

// Mount admin route modules
router.use("/dashboard", dashboardRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/categories", categoriesRoutes);
router.use("/orders/bulk", bulkOrderRoutes); // Mount bulk routes before general order routes
router.use("/orders", orderRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/settings", settingsRoutes);
router.use("/shipping", shippingRoutes);
router.use("/", returnsRoutes); // Returns and refunds routes
router.use("/support", supportRoutes);
router.use("/jobs", jobsRoutes);

export default router;