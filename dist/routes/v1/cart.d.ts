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
declare const router: import("express-serve-static-core").Router;
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
//# sourceMappingURL=cart.d.ts.map