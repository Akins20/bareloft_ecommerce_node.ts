import { Router } from "express";
import cors from "cors";
import helmetMiddleware from "../middleware/security/helmet";
import rateLimiter from "../middleware/security/rateLimiter";
import requestLogger from "../middleware/logging/requestLogger";
import errorHandler from "../middleware/error/errorHandler";
// NotFound handler doesn't exist, create inline
const notFoundHandler = (req: any, res: any) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};

// Import v1 routes
import authRoutes from "./v1/auth";
import productRoutes from "./v1/products";
import categoryRoutes from "./v1/categories";
import cartRoutes from "./v1/cart";
import orderRoutes from "./v1/orders";
import reviewRoutes from "./v1/reviews";
import searchRoutes from "./v1/search";
import uploadRoutes from "./v1/upload";
import userRoutes from "./v1/users";
import addressRoutes from "./v1/addresses";
import wishlistRoutes from "./v1/wishlist";

// Admin and webhook routes don't exist yet, comment out
// import adminRoutes from "./admin";
// import webhookRoutes from "./webhooks";

const router = Router();

// ==================== GLOBAL MIDDLEWARE ====================

// Security middleware
router.use(cors());
router.use(helmetMiddleware);

// Logging middleware
router.use(requestLogger);

// Global rate limiting (rateLimiter is an object/middleware, not a function)
if (typeof rateLimiter === 'function') {
  router.use(
    rateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000, // 1000 requests per 15 minutes globally
      message: "Too many requests from this IP. Please try again later.",
      standardHeaders: true,
      legacyHeaders: false,
    })
  );
} else {
  // Use rateLimiter directly if it's already middleware
  router.use(rateLimiter);
}

// ==================== API HEALTH CHECK ====================

/**
 * @route   GET /api/health
 * @desc    API health check endpoint
 * @access  Public
 */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Bareloft API is running",
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    },
  });
});

/**
 * @route   GET /api/status
 * @desc    API status with service health checks
 * @access  Public
 */
router.get("/status", async (req, res) => {
  try {
    // TODO: Add actual service health checks
    const services = {
      database: "healthy",
      redis: "healthy",
      paystack: "healthy",
      email: "healthy",
      sms: "healthy",
      storage: "healthy",
    };

    const allHealthy = Object.values(services).every(
      (status) => status === "healthy"
    );

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      message: allHealthy ? "All services healthy" : "Some services unhealthy",
      data: {
        overall: allHealthy ? "healthy" : "degraded",
        services,
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || "1.0.0",
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: "Health check failed",
      data: {
        overall: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// ==================== API INFORMATION ENDPOINTS ====================

/**
 * @route   GET /api/info
 * @desc    Get API information and available endpoints
 * @access  Public
 */
router.get("/info", (req, res) => {
  res.json({
    success: true,
    message: "Bareloft E-commerce API",
    data: {
      name: "Bareloft API",
      version: process.env.API_VERSION || "1.0.0",
      description: "Nigerian e-commerce platform API with Paystack integration",
      documentation: process.env.API_DOCS_URL || "/api/docs",
      environment: process.env.NODE_ENV || "development",
      endpoints: {
        auth: "/api/v1/auth",
        products: "/api/v1/products",
        categories: "/api/v1/categories",
        cart: "/api/v1/cart",
        orders: "/api/v1/orders",
        reviews: "/api/v1/reviews",
        search: "/api/v1/search",
        users: "/api/v1/users",
        addresses: "/api/v1/addresses",
        wishlist: "/api/v1/wishlist",
        upload: "/api/v1/upload",
        admin: "/api/admin",
        webhooks: "/api/webhooks",
      },
      features: [
        "OTP-based authentication",
        "Nigerian phone number support",
        "Paystack payment integration",
        "Real-time inventory tracking",
        "Advanced product search",
        "Wishlist management",
        "Order tracking",
        "Product reviews",
        "Address validation",
        "Admin dashboard",
        "File uploads",
        "Nigerian shipping zones",
      ],
      supportedCurrency: "NGN",
      supportedCountry: "Nigeria",
      paymentProvider: "Paystack",
      rateLimit: "1000 requests per 15 minutes",
    },
  });
});

// ==================== V1 API ROUTES ====================

// Authentication routes
router.use("/v1/auth", authRoutes);

// Product management routes
router.use("/v1/products", productRoutes);
router.use("/v1/categories", categoryRoutes);
router.use("/v1/reviews", reviewRoutes);
router.use("/v1/search", searchRoutes);

// Shopping routes
router.use("/v1/cart", cartRoutes);
router.use("/v1/orders", orderRoutes);

// User management routes
router.use("/v1/users", userRoutes);
router.use("/v1/addresses", addressRoutes);
router.use("/v1/wishlist", wishlistRoutes);

// Utility routes
router.use("/v1/upload", uploadRoutes);

// ==================== ADMIN ROUTES ====================

// Comment out until admin routes are implemented
// router.use("/admin", adminRoutes);

// ==================== WEBHOOK ROUTES ====================

// Comment out until webhook routes are implemented
// router.use("/webhooks", webhookRoutes);

// ==================== API VERSIONING REDIRECTS ====================

/**
 * Default routes without version prefix redirect to v1
 */
router.use("/auth", (req, res) => {
  res.redirect(301, `/api/v1/auth${req.path}`);
});

router.use("/products", (req, res) => {
  res.redirect(301, `/api/v1/products${req.path}`);
});

router.use("/cart", (req, res) => {
  res.redirect(301, `/api/v1/cart${req.path}`);
});

router.use("/orders", (req, res) => {
  res.redirect(301, `/api/v1/orders${req.path}`);
});

// ==================== ERROR HANDLING ====================

// 404 handler for unknown routes
router.use(notFoundHandler);

// Global error handler
router.use(errorHandler);

// ==================== ROUTE DOCUMENTATION ====================

/**
 * @route   GET /api/routes
 * @desc    Get all available routes (development only)
 * @access  Public (Development)
 */
if (process.env.NODE_ENV === "development") {
  router.get("/routes", (req, res) => {
    const routes = {
      authentication: {
        base: "/api/v1/auth",
        endpoints: [
          "POST /request-otp - Request OTP for login/signup",
          "POST /verify-otp - Verify OTP code",
          "POST /signup - Create new account",
          "POST /login - Login with OTP",
          "POST /refresh - Refresh access token",
          "POST /logout - Logout user",
          "GET /me - Get current user info",
          "GET /check-phone/:phoneNumber - Check phone availability",
        ],
      },
      products: {
        base: "/api/v1/products",
        endpoints: [
          "GET / - Get all products with filtering",
          "GET /:id - Get product by ID",
          "GET /slug/:slug - Get product by slug",
          "GET /featured - Get featured products",
          "GET /category/:categoryId - Get products by category",
          "GET /:id/related - Get related products",
          "GET /search - Search products",
          "GET /:id/stock - Get product stock info",
          "POST /check-stock - Check multiple products stock",
          "GET /:id/reviews/summary - Get product reviews summary",
          "GET /:id/price-history - Get product price history",
          "GET /low-stock - Get low stock products (admin)",
          "GET /:id/analytics - Get product analytics (admin)",
          "POST / - Create product (admin)",
          "PUT /:id - Update product (admin)",
          "DELETE /:id - Delete product (admin)",
        ],
      },
      categories: {
        base: "/api/v1/categories",
        endpoints: [
          "GET / - Get all categories",
          "GET /tree - Get category tree structure",
          "GET /root - Get root categories",
          "GET /featured - Get featured categories",
          "GET /popular - Get popular categories",
          "GET /flat - Get flat category list",
          "GET /search - Search categories",
          "GET /slug/:slug - Get category by slug",
          "GET /:id - Get category by ID",
          "GET /:id/children - Get child categories",
          "GET /:id/breadcrumb - Get category breadcrumb",
          "GET /:id/stats - Get category statistics",
          "GET /:id/has-products - Check if category has products",
        ],
      },
      cart: {
        base: "/api/v1/cart",
        endpoints: [
          "GET / - Get user cart",
          "POST /add - Add item to cart",
          "PUT /update - Update cart item",
          "DELETE /remove/:productId - Remove item from cart",
          "DELETE /clear - Clear entire cart",
          "POST /coupon/apply - Apply coupon",
          "DELETE /coupon/remove - Remove coupon",
          "PUT /shipping - Update shipping address",
          "POST /validate - Validate cart items",
          "GET /count - Get cart item count",
          "POST /merge - Merge guest cart with user cart",
          "POST /shipping/calculate - Calculate shipping options",
          "POST /save-for-later/:productId - Save item for later",
          "POST /move-to-cart/:productId - Move item to cart",
        ],
      },
      orders: {
        base: "/api/v1/orders",
        endpoints: [
          "POST /create - Create new order",
          "GET / - Get user order history",
          "GET /stats - Get order statistics",
          "GET /number/:orderNumber - Get order by number",
          "GET /:id - Get order by ID",
          "GET /:id/tracking - Track order status",
          "GET /:id/timeline - Get order timeline",
          "GET /:id/invoice - Get order invoice",
          "GET /:id/payment/verify - Verify payment status",
          "PUT /:id/cancel - Cancel order",
          "POST /:id/reorder - Reorder items",
          "POST /:id/return - Request return/refund",
          "GET /guest/track/:orderNumber - Track guest order",
        ],
      },
      reviews: {
        base: "/api/v1/reviews",
        endpoints: [
          "GET /products/:productId/reviews - Get product reviews",
          "GET /products/:productId/reviews/summary - Get review summary",
          "GET /products/:productId/reviews/rating/:rating - Get reviews by rating",
          "GET /products/:productId/reviews/verified - Get verified reviews",
          "GET /products/:productId/can-review - Check if user can review",
          "POST /products/:productId/reviews - Create review",
          "GET /:reviewId - Get review by ID",
          "PUT /:reviewId - Update review",
          "DELETE /:reviewId - Delete review",
          "POST /:reviewId/helpful - Mark review helpful",
          "DELETE /:reviewId/helpful - Remove helpful mark",
          "POST /:reviewId/report - Report review",
          "GET /users/reviews - Get user reviews",
        ],
      },
      search: {
        base: "/api/v1/search",
        endpoints: [
          "GET / - Search products",
          "GET /autocomplete - Get search suggestions",
          "GET /suggestions - Get personalized suggestions",
          "GET /popular - Get popular search terms",
          "GET /trending - Get trending searches",
          "GET /filters - Get available filters",
          "GET /category/:categoryId - Search in category",
          "GET /brand/:brand - Search by brand",
          "GET /history - Get search history",
          "POST /save - Save search",
          "DELETE /history - Clear search history",
          "GET /analytics - Get search analytics (admin)",
        ],
      },
      users: {
        base: "/api/v1/users",
        endpoints: [
          "GET /profile - Get user profile",
          "PUT /profile - Update profile",
          "POST /profile/avatar - Upload avatar",
          "DELETE /profile/avatar - Delete avatar",
          "PUT /password/change - Change password",
          "POST /phone/verify - Verify phone number",
          "POST /phone/confirm - Confirm phone verification",
          "GET /account/summary - Get account summary",
          "GET /activity - Get activity log",
          "GET /preferences - Get user preferences",
          "PUT /preferences - Update preferences",
          "PUT /email/preferences - Update email preferences",
          "PUT /account/deactivate - Deactivate account",
          "POST /account/export - Request data export",
        ],
      },
      addresses: {
        base: "/api/v1/addresses",
        endpoints: [
          "GET / - Get user addresses",
          "GET /default - Get default addresses",
          "POST / - Create address",
          "GET /:id - Get address by ID",
          "PUT /:id - Update address",
          "DELETE /:id - Delete address",
          "PUT /:id/default - Set default address",
          "POST /:id/shipping-cost - Calculate shipping cost",
          "POST /validate - Validate address",
          "GET /locations - Get Nigerian locations",
          "GET /locations/states - Get Nigerian states",
          "GET /locations/cities/:state - Get cities by state",
          "GET /shipping-zones - Get shipping zones",
          "POST /shipping-quote - Get shipping quote",
        ],
      },
      wishlist: {
        base: "/api/v1/wishlist",
        endpoints: [
          "GET / - Get user wishlist",
          "POST /add - Add to wishlist",
          "DELETE /remove/:productId - Remove from wishlist",
          "DELETE /clear - Clear wishlist",
          "GET /count - Get wishlist count",
          "GET /check/:productId - Check if in wishlist",
          "GET /summary - Get wishlist summary",
          "POST /move-to-cart/:productId - Move to cart",
          "POST /move-multiple-to-cart - Move multiple to cart",
          "GET /back-in-stock - Get back in stock items",
          "POST /share - Share wishlist",
          "GET /shared/:shareToken - Get shared wishlist",
        ],
      },
      upload: {
        base: "/api/v1/upload",
        endpoints: [
          "POST /single - Upload single file",
          "POST /multiple - Upload multiple files",
          "POST /avatar - Upload avatar",
          "POST /product-images - Upload product images (admin)",
          "GET /file/:fileId - Get file by ID",
          "DELETE /file/:fileId - Delete file",
          "GET /user-files - Get user files",
          "GET /stats - Get upload statistics",
          "POST /validate - Validate file before upload",
          "GET /limits - Get upload limits",
        ],
      },
      admin: {
        base: "/api/admin",
        endpoints: [
          "Dashboard and analytics endpoints",
          "User management",
          "Product management",
          "Order management",
          "Inventory management",
          "Reports and analytics",
        ],
      },
      webhooks: {
        base: "/api/webhooks",
        endpoints: [
          "POST /paystack - Paystack payment webhooks",
          "POST /shipping - Shipping status updates",
        ],
      },
    };

    res.json({
      success: true,
      message: "Bareloft API Routes Documentation",
      data: routes,
    });
  });
}

export default router;
