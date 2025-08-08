"use strict";
/**
 * Version 1 API Routes
 *
 * This file aggregates all version 1 API routes for the Bareloft platform.
 * All routes under /api/v1/* are handled here.
 *
 * Features:
 * - User authentication and management
 * - Product catalog and search
 * - Shopping cart and orders
 * - Reviews and ratings
 * - File uploads
 * - Nigerian market optimization
 *
 * Author: Bareloft Development Team
 * Version: 1.0.0
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// Import individual route modules
const auth_1 = __importDefault(require("./auth"));
const products_1 = __importDefault(require("./products"));
const categories_1 = __importDefault(require("./categories"));
const cart_1 = __importDefault(require("./cart"));
const orders_1 = __importDefault(require("./orders"));
const users_1 = __importDefault(require("./users"));
const addresses_1 = __importDefault(require("./addresses"));
const reviews_1 = __importDefault(require("./reviews"));
const wishlist_1 = __importDefault(require("./wishlist"));
const search_1 = __importDefault(require("./search"));
const upload_1 = __importDefault(require("./upload"));
const returns_1 = __importDefault(require("./returns"));
const payments_1 = __importDefault(require("./payments"));
const router = (0, express_1.Router)();
/**
 * V1 API Information
 * GET /api/v1/
 */
router.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Bareloft API Version 1",
        data: {
            version: "1.0.0",
            description: "E-commerce API optimized for Nigeria",
            endpoints: {
                authentication: "/api/v1/auth",
                products: "/api/v1/products",
                categories: "/api/v1/categories",
                cart: "/api/v1/cart",
                orders: "/api/v1/orders",
                users: "/api/v1/users",
                addresses: "/api/v1/addresses",
                reviews: "/api/v1/reviews",
                wishlist: "/api/v1/wishlist",
                search: "/api/v1/search",
                upload: "/api/v1/upload",
                returns: "/api/v1/returns",
                payments: "/api/v1/payments",
            },
            features: [
                "OTP-based authentication",
                "Nigerian phone number support",
                "Naira currency handling",
                "Real-time inventory tracking",
                "Advanced product search",
                "File upload with image processing",
                "Review and rating system",
                "Shopping cart with guest support",
                "Order tracking and management",
            ],
        },
    });
});
/**
 * Mount route modules
 */
// Authentication routes
router.use("/auth", auth_1.default);
// Product-related routes
router.use("/products", products_1.default);
router.use("/categories", categories_1.default);
router.use("/reviews", reviews_1.default);
router.use("/search", search_1.default);
// Shopping routes
router.use("/cart", cart_1.default);
router.use("/orders", orders_1.default);
// User-related routes
router.use("/users", users_1.default);
router.use("/addresses", addresses_1.default);
router.use("/wishlist", wishlist_1.default);
// Utility routes
router.use("/upload", upload_1.default);
// Return management routes
router.use("/returns", returns_1.default);
// Payment routes
router.use("/payments", payments_1.default);
exports.default = router;
/**
 * Route Documentation - Version 1 API
 *
 * Base URL: /api/v1
 *
 * Available Endpoints:
 *
 * 🔐 Authentication (/api/v1/auth):
 *    POST   /signup              - Create new user account
 *    POST   /login               - User login with OTP
 *    POST   /request-otp         - Request OTP code
 *    POST   /verify-otp          - Verify OTP code
 *    POST   /refresh             - Refresh access token
 *    POST   /logout              - User logout
 *    GET    /me                  - Get current user info
 *    GET    /check-phone/:phone  - Check phone availability
 *
 * 🛍️ Products (/api/v1/products):
 *    GET    /                    - List products with filters
 *    GET    /:id                 - Get product by ID
 *    GET    /slug/:slug          - Get product by slug
 *    GET    /featured            - Get featured products
 *    GET    /category/:categoryId - Get products by category
 *    GET    /:id/related         - Get related products
 *    GET    /:id/stock           - Get product stock info
 *    POST   /check-stock         - Check multiple products stock
 *    GET    /:id/reviews/summary - Get product review summary
 *    GET    /:id/price-history   - Get product price history
 *    GET    /low-stock           - Get low stock products (admin)
 *    GET    /:id/analytics       - Get product analytics (admin)
 *
 * 📂 Categories (/api/v1/categories):
 *    GET    /                    - List categories
 *    GET    /:id                 - Get category by ID
 *    GET    /slug/:slug          - Get category by slug
 *    GET    /tree                - Get category tree
 *    GET    /root                - Get root categories
 *    GET    /:id/children        - Get child categories
 *    GET    /:id/breadcrumb      - Get category breadcrumb
 *    GET    /featured            - Get featured categories
 *    GET    /search              - Search categories
 *    GET    /popular             - Get popular categories
 *    GET    /:id/stats           - Get category statistics
 *    GET    /flat                - Get flat category list
 *    GET    /:id/has-products    - Check if category has products
 *
 * 🛒 Cart (/api/v1/cart):
 *    GET    /                    - Get user's cart
 *    POST   /add                 - Add item to cart
 *    PUT    /update              - Update cart item quantity
 *    DELETE /remove/:productId   - Remove item from cart
 *    DELETE /clear               - Clear entire cart
 *    POST   /coupon/apply        - Apply coupon to cart
 *    DELETE /coupon/remove       - Remove coupon from cart
 *    PUT    /shipping            - Update shipping address
 *    POST   /validate            - Validate cart items
 *    GET    /count               - Get cart item count
 *    POST   /merge               - Merge guest cart with user cart
 *    POST   /shipping/calculate  - Calculate shipping options
 *    POST   /save-for-later/:productId - Save item for later
 *    POST   /move-to-cart/:productId   - Move item to cart
 *
 * 📦 Orders (/api/v1/orders):
 *    POST   /create              - Create new order
 *    GET    /                    - Get user's orders
 *    GET    /:id                 - Get order by ID
 *    GET    /number/:orderNumber - Get order by number
 *    PUT    /:id/cancel          - Cancel order
 *    GET    /:id/tracking        - Track order status
 *    GET    /:id/timeline        - Get order timeline
 *    POST   /:id/reorder         - Reorder items
 *    POST   /:id/return          - Request return/refund
 *    GET    /:id/payment/verify  - Verify payment status
 *    GET    /:id/invoice         - Get order invoice
 *    GET    /stats               - Get order statistics
 *
 * 👤 Users (/api/v1/users):
 *    GET    /profile             - Get user profile
 *    PUT    /profile             - Update user profile
 *    POST   /profile/avatar      - Upload profile avatar
 *    DELETE /profile/avatar      - Delete profile avatar
 *    PUT    /password/change     - Change password
 *    GET    /account/summary     - Get account summary
 *    PUT    /account/deactivate  - Deactivate account
 *    POST   /account/export      - Request data export
 *    GET    /preferences         - Get user preferences
 *    PUT    /preferences         - Update user preferences
 *    POST   /phone/verify        - Verify phone number
 *    POST   /phone/confirm       - Confirm phone verification
 *    GET    /activity            - Get activity log
 *    PUT    /email/preferences   - Update email preferences
 *
 * 🏠 Addresses (/api/v1/addresses):
 *    GET    /                    - Get user addresses
 *    GET    /:id                 - Get address by ID
 *    POST   /                    - Create new address
 *    PUT    /:id                 - Update address
 *    DELETE /:id                 - Delete address
 *    PUT    /:id/default         - Set default address
 *    GET    /default             - Get default addresses
 *    POST   /validate            - Validate address
 *    GET    /locations           - Get Nigerian locations
 *    POST   /:id/shipping-cost   - Calculate shipping cost
 *
 * ⭐ Reviews (/api/v1/reviews):
 *    GET    /products/:productId/reviews        - Get product reviews
 *    GET    /products/:productId/reviews/summary - Get review summary
 *    POST   /products/:productId/reviews        - Create review
 *    PUT    /:reviewId                          - Update review
 *    DELETE /:reviewId                          - Delete review
 *    GET    /users/reviews                      - Get user reviews
 *    POST   /:reviewId/helpful                  - Mark review helpful
 *    DELETE /:reviewId/helpful                  - Remove helpful mark
 *    POST   /:reviewId/report                   - Report review
 *    GET    /:reviewId                          - Get review by ID
 *    GET    /products/:productId/reviews/rating/:rating - Get reviews by rating
 *    GET    /products/:productId/reviews/verified       - Get verified reviews
 *    GET    /products/:productId/can-review             - Check if can review
 *
 * ❤️ Wishlist (/api/v1/wishlist):
 *    GET    /                    - Get user's wishlist
 *    POST   /add                 - Add product to wishlist
 *    DELETE /remove/:productId   - Remove from wishlist
 *    GET    /check/:productId    - Check if product in wishlist
 *    DELETE /clear               - Clear entire wishlist
 *    GET    /count               - Get wishlist count
 *    POST   /move-to-cart/:productId      - Move to cart
 *    POST   /move-multiple-to-cart        - Move multiple to cart
 *    GET    /summary             - Get wishlist summary
 *    POST   /share               - Share wishlist
 *    GET    /shared/:shareToken  - Get shared wishlist
 *    GET    /back-in-stock       - Get back in stock items
 *
 * 🔍 Search (/api/v1/search):
 *    GET    /                    - Search products
 *    GET    /autocomplete        - Get autocomplete suggestions
 *    GET    /popular             - Get popular search terms
 *    GET    /suggestions         - Get personalized suggestions
 *    GET    /category/:categoryId - Search in category
 *    GET    /brand/:brand        - Search by brand
 *    GET    /filters             - Get search filters
 *    GET    /history             - Get search history
 *    DELETE /history             - Clear search history
 *    GET    /trending            - Get trending searches
 *    POST   /save                - Save search to history
 *    GET    /analytics           - Get search analytics (admin)
 *
 * 📁 Upload (/api/v1/upload):
 *    POST   /single              - Upload single file
 *    POST   /multiple            - Upload multiple files
 *    POST   /product-images      - Upload product images (admin)
 *    POST   /avatar              - Upload user avatar
 *    GET    /file/:fileId        - Get file by ID
 *    DELETE /file/:fileId        - Delete file
 *    GET    /user-files          - Get user's files
 *    GET    /stats               - Get upload statistics
 *
 * Common Query Parameters:
 * - page: Page number for pagination (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sortBy: Field to sort by
 * - sortOrder: 'asc' or 'desc' (default: 'desc')
 * - search: Search query string
 * - categoryId: Filter by category
 * - minPrice/maxPrice: Price range filter
 * - brand: Filter by brand
 * - inStock: Filter by stock availability
 * - rating: Filter by minimum rating
 *
 * Authentication:
 * - Include "Authorization: Bearer <token>" header
 * - Some endpoints work without authentication (public data)
 * - Admin endpoints require admin role
 *
 * Error Handling:
 * - All endpoints return consistent error format
 * - HTTP status codes follow REST conventions
 * - Detailed error messages for development
 *
 * Rate Limiting:
 * - 100 requests per minute for general endpoints
 * - 5 requests per minute for authentication
 * - 3 requests per minute for OTP requests
 */
//# sourceMappingURL=index.js.map