/**
 * Product Routes
 *
 * Handles all product catalog endpoints including:
 * - Product listing with filtering and search
 * - Product details and related products
 * - Stock availability checking
 * - Product analytics and insights
 *
 * All routes are prefixed with /api/v1/products
 *
 * Features:
 * - Advanced filtering (price, category, brand, stock)
 * - Search functionality with relevance scoring
 * - Real-time stock checking
 * - Related product suggestions
 * - Product analytics for admin users
 *
 * Author: Bareloft Development Team
 */

import { Router } from "express";
import { ProductController } from "../../controllers/products/ProductController";

// Middleware imports
import { authenticate } from "../../middleware/auth/authenticate";
import { authorize } from "../../middleware/auth/authorize";
import { rateLimiter } from "../../middleware/security/rateLimiter";
import { validateRequest } from "../../middleware/validation/validateRequest";
import { cacheMiddleware } from "../../middleware/cache/cacheMiddleware";
// Note: Product schemas not yet created, using placeholder validation
const productSchemas = {
  createProduct: {},
  updateProduct: {},
  checkStock: {},
};

// Services (dependency injection) - using placeholder for now
const productService = {} as any;

const router = Router();

// Initialize controller
const productController = new ProductController(productService);

/**
 * @route   GET /api/v1/products
 * @desc    Get products with filtering, search, and pagination
 * @access  Public
 * @cache   5 minutes
 *
 * @query {
 *   page?: number,           // Page number (default: 1)
 *   limit?: number,          // Items per page (default: 20, max: 100)
 *   categoryId?: string,     // Filter by category ID
 *   search?: string,         // Search in name and description
 *   minPrice?: number,       // Minimum price filter
 *   maxPrice?: number,       // Maximum price filter
 *   brand?: string,          // Filter by brand
 *   isActive?: boolean,      // Filter by active status
 *   isFeatured?: boolean,    // Filter by featured status
 *   sortBy?: string,         // Sort field: 'name'|'price'|'createdAt'|'rating'
 *   sortOrder?: string,      // Sort order: 'asc'|'desc'
 *   inStock?: boolean        // Filter by stock availability
 * }
 *
 * @response {
 *   success: true,
 *   message: "Products retrieved successfully",
 *   data: {
 *     products: Product[],
 *     pagination: {
 *       page: number,
 *       limit: number,
 *       total: number,
 *       totalPages: number
 *     },
 *     filters: {
 *       categories: Category[],
 *       brands: string[],
 *       priceRange: { min: number, max: number }
 *     }
 *   }
 * }
 */
router.get(
  "/",
  // cacheMiddleware({ ttl: 300 }), // 5 minute cache - disabled for now // 5 minutes cache
  productController.getProducts
);

/**
 * @route   GET /api/v1/products/featured
 * @desc    Get featured products
 * @access  Public
 * @cache   10 minutes
 *
 * @query {
 *   limit?: number           // Max items to return (default: 12, max: 50)
 * }
 *
 * @response {
 *   success: true,
 *   message: "Featured products retrieved successfully",
 *   data: Product[]
 * }
 */
router.get(
  "/featured",
  // cacheMiddleware({ ttl: 600 }), // 10 minute cache - disabled for now // 10 minutes cache
  productController.getFeaturedProducts
);

/**
 * @route   GET /api/v1/products/low-stock
 * @desc    Get products with low stock (Admin only)
 * @access  Private (Admin)
 *
 * @headers {
 *   Authorization: "Bearer <adminToken>"
 * }
 *
 * @query {
 *   page?: number,
 *   limit?: number
 * }
 *
 * @response {
 *   success: true,
 *   message: "Low stock products retrieved successfully",
 *   data: {
 *     products: Product[],
 *     pagination: PaginationInfo
 *   }
 * }
 */
router.get(
  "/low-stock",
  authenticate,
  authorize(["ADMIN", "SUPER_ADMIN"]),
  productController.getLowStockProducts
);

/**
 * @route   POST /api/v1/products/check-stock
 * @desc    Check stock availability for multiple products
 * @access  Public
 * @rateLimit 60 requests per minute
 *
 * @body {
 *   productIds: string[]     // Array of product IDs to check
 * }
 *
 * @response {
 *   success: true,
 *   message: "Stock information retrieved successfully",
 *   data: Array<{
 *     productId: string,
 *     inStock: boolean,
 *     quantity: number,
 *     availableQuantity: number,
 *     lowStock: boolean
 *   }>
 * }
 */
router.post(
  "/check-stock",
  rateLimiter.general,
  // validateRequest(productSchemas.checkStock),
  productController.checkMultipleStock
);

/**
 * @route   GET /api/v1/products/category/:categoryId
 * @desc    Get products by category
 * @access  Public
 * @cache   5 minutes
 *
 * @params {
 *   categoryId: string       // Category ID
 * }
 *
 * @query {
 *   page?: number,
 *   limit?: number,
 *   sortBy?: string,
 *   sortOrder?: string
 * }
 *
 * @response {
 *   success: true,
 *   message: "Products retrieved successfully",
 *   data: {
 *     products: Product[],
 *     pagination: PaginationInfo,
 *     category: Category
 *   }
 * }
 */
router.get(
  "/category/:categoryId",
  // cacheMiddleware({ ttl: 300 }), // 5 minute cache - disabled for now // 5 minutes cache
  productController.getProductsByCategory
);

/**
 * @route   GET /api/v1/products/:id
 * @desc    Get product details by ID
 * @access  Public
 * @cache   10 minutes
 *
 * @params {
 *   id: string               // Product ID
 * }
 *
 * @response {
 *   success: true,
 *   message: "Product retrieved successfully",
 *   data: {
 *     product: Product,
 *     relatedProducts: Product[],
 *     reviews: {
 *       summary: ReviewSummary,
 *       recent: Review[]
 *     },
 *     stock: {
 *       inStock: boolean,
 *       quantity: number,
 *       availableQuantity: number
 *     }
 *   }
 * }
 */
router.get(
  "/:id",
  // cacheMiddleware({ ttl: 600 }), // 10 minute cache - disabled for now // 10 minutes cache
  productController.getProductById
);

/**
 * @route   GET /api/v1/products/slug/:slug
 * @desc    Get product details by SEO-friendly slug
 * @access  Public
 * @cache   10 minutes
 *
 * @params {
 *   slug: string             // Product slug (SEO-friendly URL)
 * }
 *
 * @response {
 *   success: true,
 *   message: "Product retrieved successfully",
 *   data: ProductDetailResponse
 * }
 */
router.get(
  "/slug/:slug",
  // cacheMiddleware({ ttl: 600 }), // 10 minute cache - disabled for now // 10 minutes cache
  productController.getProductBySlug
);

/**
 * @route   GET /api/v1/products/:id/related
 * @desc    Get related products based on category and price range
 * @access  Public
 * @cache   15 minutes
 *
 * @params {
 *   id: string               // Product ID
 * }
 *
 * @query {
 *   limit?: number           // Max items to return (default: 8, max: 20)
 * }
 *
 * @response {
 *   success: true,
 *   message: "Related products retrieved successfully",
 *   data: Product[]
 * }
 */
router.get(
  "/:id/related",
  // cacheMiddleware({ ttl: 900 }), // 15 minute cache - disabled for now // 15 minutes cache
  productController.getRelatedProducts
);

/**
 * @route   GET /api/v1/products/:id/stock
 * @desc    Get real-time stock information for a product
 * @access  Public
 * @rateLimit 120 requests per minute
 *
 * @params {
 *   id: string               // Product ID
 * }
 *
 * @response {
 *   success: true,
 *   message: "Stock information retrieved successfully",
 *   data: {
 *     productId: string,
 *     inStock: boolean,
 *     quantity: number,
 *     lowStock: boolean,
 *     availableQuantity: number,
 *     reservedQuantity: number,
 *     lastUpdated: string
 *   }
 * }
 */
router.get(
  "/:id/stock",
  rateLimiter.general,
  productController.getProductStock
);

/**
 * @route   GET /api/v1/products/:id/reviews/summary
 * @desc    Get product review summary and statistics
 * @access  Public
 * @cache   30 minutes
 *
 * @params {
 *   id: string               // Product ID
 * }
 *
 * @response {
 *   success: true,
 *   message: "Product reviews summary retrieved successfully",
 *   data: {
 *     averageRating: number,
 *     totalReviews: number,
 *     ratingDistribution: {
 *       5: number,
 *       4: number,
 *       3: number,
 *       2: number,
 *       1: number
 *     },
 *     verifiedPurchases: number,
 *     recommendationPercentage: number
 *   }
 * }
 */
router.get(
  "/:id/reviews/summary",
  // cacheMiddleware({ ttl: 1800 }), // 30 minute cache - disabled for now // 30 minutes cache
  productController.getProductReviewsSummary
);

/**
 * @route   GET /api/v1/products/:id/price-history
 * @desc    Get product price history for trend analysis
 * @access  Public
 * @cache   1 hour
 *
 * @params {
 *   id: string               // Product ID
 * }
 *
 * @query {
 *   days?: number            // Number of days to look back (default: 30)
 * }
 *
 * @response {
 *   success: true,
 *   message: "Price history retrieved successfully",
 *   data: Array<{
 *     date: string,
 *     price: number,
 *     comparePrice?: number,
 *     change: number,
 *     changePercentage: number
 *   }>
 * }
 */
router.get(
  "/:id/price-history",
  // cacheMiddleware({ ttl: 3600 }), // 60 minute cache - disabled for now // 1 hour cache
  productController.getProductPriceHistory
);

/**
 * @route   GET /api/v1/products/:id/analytics
 * @desc    Get detailed product analytics (Admin only)
 * @access  Private (Admin)
 *
 * @headers {
 *   Authorization: "Bearer <adminToken>"
 * }
 *
 * @params {
 *   id: string               // Product ID
 * }
 *
 * @query {
 *   days?: number            // Analysis period (default: 30)
 * }
 *
 * @response {
 *   success: true,
 *   message: "Product analytics retrieved successfully",
 *   data: {
 *     views: {
 *       total: number,
 *       unique: number,
 *       daily: Array<{ date: string, views: number }>
 *     },
 *     sales: {
 *       total: number,
 *       revenue: number,
 *       conversion: number,
 *       daily: Array<{ date: string, sales: number, revenue: number }>
 *     },
 *     inventory: {
 *       currentStock: number,
 *       movements: Array<{ date: string, type: string, quantity: number }>
 *     },
 *     performance: {
 *       ranking: number,
 *       categoryRanking: number,
 *       popularityScore: number
 *     }
 *   }
 * }
 */
router.get(
  "/:id/analytics",
  authenticate,
  authorize(["ADMIN", "SUPER_ADMIN"]),
  productController.getProductAnalytics
);

export default router;

/**
 * Product API Documentation
 *
 * ## Product Object Structure:
 * ```json
 * {
 *   "id": "string",
 *   "name": "string",
 *   "slug": "string",
 *   "description": "string",
 *   "shortDescription": "string",
 *   "sku": "string",
 *   "price": number,
 *   "comparePrice": number,
 *   "costPrice": number,
 *   "categoryId": "string",
 *   "brand": "string",
 *   "weight": number,
 *   "dimensions": {
 *     "length": number,
 *     "width": number,
 *     "height": number,
 *     "unit": "cm"
 *   },
 *   "isActive": boolean,
 *   "isFeatured": boolean,
 *   "images": [
 *     {
 *       "id": "string",
 *       "url": "string",
 *       "altText": "string",
 *       "isPrimary": boolean,
 *       "sortOrder": number
 *     }
 *   ],
 *   "category": {
 *     "id": "string",
 *     "name": "string",
 *     "slug": "string"
 *   },
 *   "inventory": {
 *     "inStock": boolean,
 *     "quantity": number,
 *     "lowStock": boolean
 *   },
 *   "rating": {
 *     "average": number,
 *     "count": number
 *   },
 *   "seo": {
 *     "title": "string",
 *     "description": "string"
 *   },
 *   "createdAt": "string",
 *   "updatedAt": "string"
 * }
 * ```
 *
 * ## Filtering Options:
 *
 * ### Price Filtering:
 * - `minPrice`: Minimum price in Naira
 * - `maxPrice`: Maximum price in Naira
 * - Supports decimal values (e.g., 1999.99)
 *
 * ### Category Filtering:
 * - `categoryId`: Filter by specific category
 * - Includes products from subcategories
 * - Use `/api/v1/categories` to get available categories
 *
 * ### Brand Filtering:
 * - `brand`: Filter by brand name (case-insensitive)
 * - Use `/api/v1/products?getBrands=true` to get available brands
 *
 * ### Stock Filtering:
 * - `inStock=true`: Only products with available stock
 * - `inStock=false`: Include out-of-stock products
 *
 * ### Status Filtering:
 * - `isActive=true`: Only active products (default)
 * - `isFeatured=true`: Only featured products
 *
 * ## Sorting Options:
 *
 * ### Available Sort Fields:
 * - `name`: Alphabetical sorting
 * - `price`: Price sorting (low to high / high to low)
 * - `createdAt`: Date created (newest / oldest)
 * - `updatedAt`: Date modified
 * - `rating`: Average rating (highest / lowest)
 * - `popularity`: Based on views and sales
 * - `relevance`: Search relevance (when using search query)
 *
 * ### Sort Orders:
 * - `asc`: Ascending order
 * - `desc`: Descending order (default)
 *
 * ## Search Functionality:
 *
 * ### Search Fields:
 * - Product name (weighted highest)
 * - Product description
 * - Brand name
 * - Category name
 * - SKU (exact match gets highest priority)
 *
 * ### Search Features:
 * - Fuzzy matching for typos
 * - Partial word matching
 * - Synonym support
 * - Auto-complete suggestions
 *
 * ## Pagination:
 *
 * ### Parameters:
 * - `page`: Page number (starts at 1)
 * - `limit`: Items per page (max 100)
 *
 * ### Response:
 * ```json
 * {
 *   "pagination": {
 *     "page": 1,
 *     "limit": 20,
 *     "total": 150,
 *     "totalPages": 8,
 *     "hasNext": true,
 *     "hasPrev": false
 *   }
 * }
 * ```
 *
 * ## Caching:
 *
 * ### Cache Duration:
 * - Product lists: 5 minutes
 * - Product details: 10 minutes
 * - Featured products: 10 minutes
 * - Related products: 15 minutes
 * - Review summaries: 30 minutes
 * - Price history: 1 hour
 *
 * ### Cache Headers:
 * - Responses include `Cache-Control` headers
 * - ETags for conditional requests
 * - Use `If-None-Match` header for efficient caching
 *
 * ## Error Codes:
 *
 * ### Common Errors:
 * - `PRODUCT_NOT_FOUND`: Product doesn't exist
 * - `INVALID_CATEGORY`: Category ID is invalid
 * - `INVALID_PRICE_RANGE`: Price range is invalid
 * - `RATE_LIMIT_EXCEEDED`: Too many requests
 * - `VALIDATION_ERROR`: Request parameters are invalid
 *
 * ## Performance Tips:
 *
 * 1. **Use caching**: Include cache headers in requests
 * 2. **Limit fields**: Use sparse fieldsets when available
 * 3. **Pagination**: Always use pagination for large datasets
 * 4. **Specific queries**: Use specific filters to reduce response size
 * 5. **Batch requests**: Use `/check-stock` for multiple products
 *
 * ## Nigerian Market Features:
 *
 * ### Currency:
 * - All prices in Nigerian Naira (₦)
 * - Decimal precision to 2 places
 * - Proper currency formatting
 *
 * ### Local Optimization:
 * - Support for local brands
 * - Category structure for Nigerian market
 * - Shipping weight calculations
 * - Local tax considerations
 */
