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
declare const router: import("express-serve-static-core").Router;
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
//# sourceMappingURL=products.d.ts.map