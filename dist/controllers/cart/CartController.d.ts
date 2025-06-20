import { Response } from "express";
import { BaseController } from "../BaseController";
import { CartService } from "../../services/cart/CartService";
import { AuthenticatedRequest } from "../../types/auth.types";
export declare class CartController extends BaseController {
    private cartService;
    constructor(cartService: CartService);
    /**
     * Get user's current cart
     * GET /api/v1/cart
     */
    getCart: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Add item to cart
     * POST /api/v1/cart/add
     */
    addToCart: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Update cart item quantity
     * PUT /api/v1/cart/update
     */
    updateCartItem: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Remove item from cart
     * DELETE /api/v1/cart/remove/:productId
     */
    removeFromCart: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Clear entire cart
     * DELETE /api/v1/cart/clear
     */
    clearCart: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Apply coupon to cart
     * POST /api/v1/cart/coupon/apply
     */
    applyCoupon: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Remove coupon from cart
     * DELETE /api/v1/cart/coupon/remove
     */
    removeCoupon: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Update shipping address for cart calculations
     * PUT /api/v1/cart/shipping
     */
    updateShipping: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Validate cart items and availability
     * POST /api/v1/cart/validate
     */
    validateCart: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Get cart item count (for header badge)
     * GET /api/v1/cart/count
     */
    getCartItemCount: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Merge guest cart with user cart after login
     * POST /api/v1/cart/merge
     */
    mergeCart: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Calculate shipping options for cart
     * POST /api/v1/cart/shipping/calculate
     */
    calculateShipping: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Save cart for later (move to wishlist)
     * POST /api/v1/cart/save-for-later/:productId
     */
    saveForLater: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Move item from wishlist to cart
     * POST /api/v1/cart/move-to-cart/:productId
     */
    moveToCart: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Validate add to cart request
     */
    private validateAddToCartRequest;
    /**
     * Validate update cart request
     */
    private validateUpdateCartRequest;
    /**
     * Validate Nigerian shipping address
     */
    private validateShippingAddress;
}
//# sourceMappingURL=CartController.d.ts.map