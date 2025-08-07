/**
 * Shopping Cart Routes
 *
 * Handles all shopping cart endpoints including:
 * - Cart management (add, update, remove items)
 * - Guest cart support with session management
 * - Cart merging for authenticated users
 * - Coupon application and shipping calculations
 * - Cart validation and stock checking
 *
 * All routes are prefixed with /api/v1/cart
 *
 * Features:
 * - Guest cart support with session IDs
 * - Real-time inventory checking
 * - Nigerian shipping calculations
 * - Coupon code support
 * - Cart validation and cleanup
 *
 * Author: Bareloft Development Team
 */

import { Router } from "express";
import { CartController } from "../../controllers/cart/CartController";

// Middleware imports
import { authenticate } from "../../middleware/auth/authenticate";
import { optionalAuth } from "../../middleware/auth/optionalAuth";
import { rateLimiter } from "../../middleware/security/rateLimiter";
import { validateRequest } from "../../middleware/validation/validateRequest";
// Note: Cart schemas not yet created, using placeholder validation
const cartSchemas = {
  addToCart: {},
  updateCartItem: {},
  applyCoupon: {},
  calculateShipping: {},
  mergeCart: {},
  updateShipping: {},
};

// Services (dependency injection)
import { CartService } from "../../services/cart/CartService";
import { CartRepository } from "../../repositories/CartRepository";
import { ProductRepository } from "../../repositories/ProductRepository";
import { CouponRepository } from "../../repositories/CouponRepository";
import { PrismaClient } from "@prisma/client";

const router = Router();

// Initialize dependencies for production
const prisma = new PrismaClient();
const cartRepository = new CartRepository(prisma);
const productRepository = new ProductRepository(prisma);
const couponRepository = new CouponRepository(prisma);
const cartService = new CartService(cartRepository, productRepository, couponRepository);

// Initialize controller
const cartController = new CartController(cartService);

/**
 * @route   GET /api/v1/cart
 * @desc    Get user's current shopping cart
 * @access  Public (with session support for guests)
 *
 * @headers {
 *   Authorization?: "Bearer <token>",     // Optional for authenticated users
 *   X-Session-ID?: "string"              // Required for guest users
 * }
 *
 * @response {
 *   success: true,
 *   message: "Cart retrieved successfully",
 *   data: {
 *     cart: {
 *       id: "string",
 *       items: Array<{
 *         id: "string",
 *         productId: "string",
 *         quantity: number,
 *         unitPrice: number,
 *         totalPrice: number,
 *         product: {
 *           id: "string",
 *           name: "string",
 *           slug: "string",
 *           sku: "string",
 *           primaryImage: "string",
 *           inStock: boolean,
 *           stockQuantity: number
 *         },
 *         isAvailable: boolean,
 *         hasStockIssue: boolean,
 *         priceChanged: boolean
 *       }>,
 *       itemCount: number,
 *       subtotal: number,
 *       estimatedTax: number,
 *       estimatedShipping: number,
 *       estimatedTotal: number,
 *       currency: "NGN",
 *       appliedCoupon?: {
 *         code: "string",
 *         discountAmount: number,
 *         discountType: "percentage" | "fixed"
 *       },
 *       hasOutOfStockItems: boolean,
 *       hasPriceChanges: boolean,
 *       isValid: boolean
 *     }
 *   }
 * }
 */
router.get("/", optionalAuth, cartController.getCart);

/**
 * @route   POST /api/v1/cart/add
 * @desc    Add item to shopping cart
 * @access  Public (with session support for guests)
 * @rateLimit 60 requests per minute
 *
 * @headers {
 *   Authorization?: "Bearer <token>",
 *   X-Session-ID?: "string"
 * }
 *
 * @body {
 *   productId: string,       // Product ID to add
 *   quantity: number         // Quantity to add (min: 1, max: 100)
 * }
 *
 * @response {
 *   success: true,
 *   message: "Item added to cart successfully",
 *   data: {
 *     success: true,
 *     message: "Product added to cart",
 *     cart: Cart,
 *     warnings?: string[]     // Stock warnings, price changes, etc.
 *   }
 * }
 */
router.post(
  "/add",
  optionalAuth,
  rateLimiter.authenticated,
  // validateRequest(cartSchemas.addToCart), // Skip validation for now due to empty schema
  cartController.addToCart
);

/**
 * @route   PUT /api/v1/cart/update
 * @desc    Update cart item quantity
 * @access  Public (with session support for guests)
 * @rateLimit 60 requests per minute
 *
 * @headers {
 *   Authorization?: "Bearer <token>",
 *   X-Session-ID?: "string"
 * }
 *
 * @body {
 *   productId: string,       // Product ID to update
 *   quantity: number         // New quantity (0 to remove, max: 100)
 * }
 *
 * @response {
 *   success: true,
 *   message: "Cart item updated successfully",
 *   data: {
 *     success: true,
 *     message: "Cart updated",
 *     cart: Cart,
 *     warnings?: string[]
 *   }
 * }
 */
router.put(
  "/update",
  optionalAuth,
  rateLimiter.authenticated,
  // validateRequest(cartSchemas.updateCartItem), // Skip validation for now due to empty schema
  cartController.updateCartItem
);

/**
 * @route   DELETE /api/v1/cart/remove/:productId
 * @desc    Remove item from shopping cart
 * @access  Public (with session support for guests)
 * @rateLimit 60 requests per minute
 *
 * @headers {
 *   Authorization?: "Bearer <token>",
 *   X-Session-ID?: "string"
 * }
 *
 * @params {
 *   productId: string        // Product ID to remove
 * }
 *
 * @response {
 *   success: true,
 *   message: "Item removed from cart successfully",
 *   data: {
 *     success: true,
 *     message: "Item removed from cart",
 *     cart: Cart
 *   }
 * }
 */
router.delete(
  "/remove/:productId",
  optionalAuth,
  rateLimiter.authenticated,
  cartController.removeFromCart
);

/**
 * @route   DELETE /api/v1/cart/clear
 * @desc    Clear entire shopping cart
 * @access  Public (with session support for guests)
 *
 * @headers {
 *   Authorization?: "Bearer <token>",
 *   X-Session-ID?: "string"
 * }
 *
 * @response {
 *   success: true,
 *   message: "Cart cleared successfully",
 *   data: {
 *     success: true,
 *     message: "Cart cleared",
 *     cart: Cart
 *   }
 * }
 */
router.delete("/clear", optionalAuth, cartController.clearCart);

/**
 * @route   GET /api/v1/cart/count
 * @desc    Get cart item count (for header badge)
 * @access  Public (with session support for guests)
 * @rateLimit 120 requests per minute
 *
 * @headers {
 *   Authorization?: "Bearer <token>",
 *   X-Session-ID?: "string"
 * }
 *
 * @response {
 *   success: true,
 *   message: "Cart item count retrieved successfully",
 *   data: {
 *     count: number
 *   }
 * }
 */
router.get(
  "/count",
  optionalAuth,
  rateLimiter.general,
  cartController.getCartItemCount
);

/**
 * @route   POST /api/v1/cart/validate
 * @desc    Validate cart items and check availability
 * @access  Public (with session support for guests)
 *
 * @headers {
 *   Authorization?: "Bearer <token>",
 *   X-Session-ID?: "string"
 * }
 *
 * @response {
 *   success: true,
 *   message: "Cart validation completed",
 *   data: {
 *     isValid: boolean,
 *     issues: Array<{
 *       type: "out_of_stock" | "price_change" | "product_unavailable" | "quantity_limit",
 *       productId: string,
 *       productName: string,
 *       message: string,
 *       severity: "warning" | "error",
 *       action?: "remove" | "reduce_quantity" | "update_price"
 *     }>,
 *     cart: Cart
 *   }
 * }
 */
router.post("/validate", optionalAuth, cartController.validateCart);

/**
 * @route   POST /api/v1/cart/merge
 * @desc    Merge guest cart with user cart after login
 * @access  Private
 *
 * @headers {
 *   Authorization: "Bearer <token>"
 * }
 *
 * @body {
 *   guestSessionId: string,  // Guest session ID to merge
 *   strategy?: string        // Merge strategy: "replace" | "merge" | "keep_authenticated"
 * }
 *
 * @response {
 *   success: true,
 *   message: "Cart merged successfully",
 *   data: {
 *     success: true,
 *     message: "Carts merged successfully",
 *     cart: Cart,
 *     mergedItems: number,
 *     conflictItems?: Array<{
 *       productId: string,
 *       guestQuantity: number,
 *       userQuantity: number,
 *       finalQuantity: number
 *     }>
 *   }
 * }
 */
router.post(
  "/merge",
  authenticate,
  // validateRequest(cartSchemas.mergeCart), // Skip validation for now due to empty schema
  cartController.mergeCart
);

/**
 * Coupon Management Routes
 */

/**
 * @route   POST /api/v1/cart/coupon/apply
 * @desc    Apply coupon code to cart
 * @access  Public (with session support for guests)
 * @rateLimit 20 requests per minute
 *
 * @headers {
 *   Authorization?: "Bearer <token>",
 *   X-Session-ID?: "string"
 * }
 *
 * @body {
 *   couponCode: string       // Coupon code to apply
 * }
 *
 * @response {
 *   success: true,
 *   message: "Coupon applied successfully",
 *   data: {
 *     success: true,
 *     message: "Coupon SAVE10 applied",
 *     cart: Cart,
 *     discount: {
 *       code: "SAVE10",
 *       type: "percentage",
 *       value: 10,
 *       amount: 199.99
 *     }
 *   }
 * }
 */
router.post(
  "/coupon/apply",
  optionalAuth,
  rateLimiter.authenticated,
  // validateRequest(cartSchemas.applyCoupon), // Skip validation for now due to empty schema
  cartController.applyCoupon
);

/**
 * @route   DELETE /api/v1/cart/coupon/remove
 * @desc    Remove applied coupon from cart
 * @access  Public (with session support for guests)
 *
 * @headers {
 *   Authorization?: "Bearer <token>",
 *   X-Session-ID?: "string"
 * }
 *
 * @response {
 *   success: true,
 *   message: "Coupon removed successfully",
 *   data: {
 *     success: true,
 *     message: "Coupon removed",
 *     cart: Cart
 *   }
 * }
 */
router.delete("/coupon/remove", optionalAuth, cartController.removeCoupon);

/**
 * Shipping Management Routes
 */

/**
 * @route   PUT /api/v1/cart/shipping
 * @desc    Update shipping address for cart calculations
 * @access  Public (with session support for guests)
 *
 * @headers {
 *   Authorization?: "Bearer <token>",
 *   X-Session-ID?: "string"
 * }
 *
 * @body {
 *   state: string,           // Nigerian state
 *   city: string,            // City name
 *   postalCode?: string      // 6-digit postal code
 * }
 *
 * @response {
 *   success: true,
 *   message: "Shipping address updated successfully",
 *   data: {
 *     success: true,
 *     message: "Shipping updated",
 *     cart: Cart,
 *     shippingOptions: Array<{
 *       id: string,
 *       name: string,
 *       price: number,
 *       estimatedDays: number
 *     }>
 *   }
 * }
 */
router.put(
  "/shipping",
  optionalAuth,
  // validateRequest(cartSchemas.updateShipping), // Skip validation for now due to empty schema
  cartController.updateShipping
);

/**
 * @route   POST /api/v1/cart/shipping/calculate
 * @desc    Calculate shipping options for cart
 * @access  Public (with session support for guests)
 *
 * @headers {
 *   Authorization?: "Bearer <token>",
 *   X-Session-ID?: "string"
 * }
 *
 * @body {
 *   state: string,           // Nigerian state
 *   city: string,            // City name
 *   postalCode?: string      // 6-digit postal code
 * }
 *
 * @response {
 *   success: true,
 *   message: "Shipping options calculated successfully",
 *   data: {
 *     options: Array<{
 *       id: string,
 *       name: string,
 *       description: string,
 *       price: number,
 *       estimatedDays: number,
 *       isAvailable: boolean
 *     }>,
 *     freeShippingThreshold?: number,
 *     freeShippingRemaining?: number
 *   }
 * }
 */
router.post(
  "/shipping/calculate",
  optionalAuth,
  // validateRequest(cartSchemas.calculateShipping), // Skip validation for now due to empty schema
  cartController.calculateShipping
);

/**
 * Wishlist Integration Routes
 */

/**
 * @route   POST /api/v1/cart/save-for-later/:productId
 * @desc    Save cart item for later (move to wishlist)
 * @access  Private
 *
 * @headers {
 *   Authorization: "Bearer <token>"
 * }
 *
 * @params {
 *   productId: string        // Product ID to save for later
 * }
 *
 * @response {
 *   success: true,
 *   message: "Item saved for later",
 *   data: {
 *     success: true,
 *     message: "Item moved to wishlist",
 *     cart: Cart
 *   }
 * }
 */
router.post(
  "/save-for-later/:productId",
  authenticate,
  cartController.saveForLater
);

/**
 * @route   POST /api/v1/cart/move-to-cart/:productId
 * @desc    Move item from wishlist to cart
 * @access  Private
 *
 * @headers {
 *   Authorization: "Bearer <token>"
 * }
 *
 * @params {
 *   productId: string        // Product ID to move to cart
 * }
 *
 * @body {
 *   quantity?: number        // Quantity to add (default: 1)
 * }
 *
 * @response {
 *   success: true,
 *   message: "Item moved to cart",
 *   data: {
 *     success: true,
 *     message: "Item added to cart",
 *     cart: Cart
 *   }
 * }
 */
router.post(
  "/move-to-cart/:productId",
  authenticate,
  cartController.moveToCart
);

export default router;

/**
 * Shopping Cart API Documentation
 *
 * ## Cart Features:
 *
 * ### Guest Cart Support:
 * - Anonymous users can create carts using session IDs
 * - Session IDs should be generated client-side (UUID v4)
 * - Include `X-Session-ID` header for guest operations
 * - Guest carts expire after 24 hours of inactivity
 *
 * ### Cart Merging:
 * - When guest user logs in, use `/merge` endpoint
 * - Merge strategies:
 *   - `merge`: Combine quantities for same products
 *   - `replace`: Replace user cart with guest cart
 *   - `keep_authenticated`: Keep user cart, discard guest cart
 *
 * ### Real-time Validation:
 * - Cart automatically validates stock availability
 * - Price changes are detected and flagged
 * - Unavailable products are marked
 * - Use `/validate` endpoint for explicit validation
 *
 * ## Nigerian Shipping:
 *
 * ### Supported States:
 * All 36 Nigerian states plus FCT are supported for shipping calculations.
 *
 * ### Shipping Zones:
 * - **Zone 1**: Lagos, Ogun, Oyo (1-2 days, ₦1,500)
 * - **Zone 2**: Southwest states (2-3 days, ₦2,500)
 * - **Zone 3**: Other states (3-5 days, ₦3,500)
 * - **Remote**: Hard-to-reach areas (5-7 days, ₦5,000)
 *
 * ### Free Shipping:
 * - Orders above ₦50,000 qualify for free shipping
 * - Free shipping applies to Zone 1 and Zone 2 only
 * - Response includes remaining amount for free shipping
 *
 * ## Coupon System:
 *
 * ### Coupon Types:
 * - **Percentage**: Discount as percentage of subtotal
 * - **Fixed**: Fixed amount discount in Naira
 * - **Free Shipping**: Waives shipping charges
 *
 * ### Validation Rules:
 * - Minimum order amount requirements
 * - Usage limits per coupon and per user
 * - Expiration date validation
 * - Product/category restrictions
 *
 * ## Error Handling:
 *
 * ### Common Cart Errors:
 * - `PRODUCT_OUT_OF_STOCK`: Product not available
 * - `INSUFFICIENT_STOCK`: Requested quantity not available
 * - `INVALID_QUANTITY`: Quantity is invalid (< 1 or > 100)
 * - `PRODUCT_NOT_FOUND`: Product doesn't exist
 * - `CART_NOT_FOUND`: Cart doesn't exist
 * - `COUPON_INVALID`: Coupon code is invalid or expired
 * - `COUPON_NOT_APPLICABLE`: Coupon doesn't apply to cart
 *
 * ## Best Practices:
 *
 * ### Client Implementation:
 * 1. **Generate Session ID**: Create UUID for guest users
 * 2. **Real-time Updates**: Call `/validate` before checkout
 * 3. **Handle Conflicts**: Show clear messages for stock issues
 * 4. **Cache Cart Count**: Update header badge on cart changes
 * 5. **Merge on Login**: Always merge guest cart after authentication
 *
 * ### Performance Tips:
 * 1. **Batch Operations**: Update multiple items in single request when possible
 * 2. **Cache Count**: Use `/count` endpoint for quick badge updates
 * 3. **Validate Before Checkout**: Prevent checkout failures
 * 4. **Handle Async**: All cart operations should handle loading states
 *
 * ## Currency Format:
 * - All prices in Nigerian Naira (₦)
 * - Decimal precision to 2 places
 * - No currency conversion - NGN only
 * - Format: ₦1,999.99
 */
