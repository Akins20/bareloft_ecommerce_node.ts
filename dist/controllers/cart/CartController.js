"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartController = void 0;
const BaseController_1 = require("../BaseController");
class CartController extends BaseController_1.BaseController {
    cartService;
    constructor(cartService) {
        super();
        this.cartService = cartService;
    }
    /**
     * Get user's current cart
     * GET /api/v1/cart
     */
    getCart = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const sessionId = req.sessionId || req.headers["x-session-id"];
            if (!userId && !sessionId) {
                res.status(400).json({
                    success: false,
                    message: "User ID or session ID is required",
                });
                return;
            }
            const cartSummary = await this.cartService.getCart(userId);
            // Convert CartSummary to Cart type for compatibility
            const cart = {
                id: `cart_${userId}`,
                userId,
                items: cartSummary.items,
                subtotal: cartSummary.subtotal,
                estimatedTax: cartSummary.tax,
                estimatedShipping: 0,
                estimatedTotal: cartSummary.total,
                currency: "NGN",
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const response = {
                success: true,
                message: "Cart retrieved successfully",
                data: { cart },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Add item to cart
     * POST /api/v1/cart/add
     */
    addToCart = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const sessionId = req.sessionId || req.headers["x-session-id"];
            const { productId, quantity } = req.body;
            // Validate input
            const validationErrors = this.validateAddToCartRequest({
                productId,
                quantity,
            });
            if (validationErrors.length > 0) {
                res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: validationErrors,
                });
                return;
            }
            const cartItem = await this.cartService.addToCart(userId, {
                productId,
                quantity,
            });
            // Create mock cart object for response
            const cart = {
                id: `cart_${userId}`,
                userId,
                items: [cartItem],
                subtotal: cartItem.price * cartItem.quantity,
                estimatedTax: 0,
                estimatedShipping: 0,
                estimatedTotal: cartItem.price * cartItem.quantity,
                currency: "NGN",
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const response = {
                success: true,
                message: "Item added to cart successfully",
                data: {
                    success: true,
                    message: "Item added to cart successfully",
                    cart,
                },
            };
            res.status(200).json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Update cart item quantity
     * PUT /api/v1/cart/update
     */
    updateCartItem = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const sessionId = req.sessionId || req.headers["x-session-id"];
            const { quantity } = req.body;
            const { itemId } = req.params;
            // Validate input
            const validationErrors = this.validateUpdateCartRequest({
                quantity,
            });
            if (validationErrors.length > 0) {
                res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: validationErrors,
                });
                return;
            }
            const result = await this.cartService.updateCartItem(userId, sessionId, {
                productId,
                quantity,
            });
            const response = {
                success: true,
                message: result.success
                    ? "Cart item updated successfully"
                    : "Failed to update cart item",
                data: result,
            };
            res.status(result.success ? 200 : 400).json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Remove item from cart
     * DELETE /api/v1/cart/remove/:productId
     */
    removeFromCart = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const sessionId = req.sessionId || req.headers["x-session-id"];
            const { productId } = req.params;
            if (!productId) {
                res.status(400).json({
                    success: false,
                    message: "Product ID is required",
                });
                return;
            }
            const result = await this.cartService.removeFromCart(userId, sessionId, {
                productId,
            });
            const response = {
                success: true,
                message: result.success
                    ? "Item removed from cart successfully"
                    : "Failed to remove item from cart",
                data: result,
            };
            res.status(result.success ? 200 : 400).json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Clear entire cart
     * DELETE /api/v1/cart/clear
     */
    clearCart = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const sessionId = req.sessionId || req.headers["x-session-id"];
            const result = await this.cartService.clearCart(userId, sessionId);
            const response = {
                success: true,
                message: "Cart cleared successfully",
                data: result,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Apply coupon to cart
     * POST /api/v1/cart/coupon/apply
     */
    applyCoupon = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const sessionId = req.sessionId || req.headers["x-session-id"];
            const { couponCode } = req.body;
            if (!couponCode || couponCode.trim().length === 0) {
                res.status(400).json({
                    success: false,
                    message: "Coupon code is required",
                });
                return;
            }
            const result = await this.cartService.applyCoupon(userId, sessionId, {
                couponCode: couponCode.trim().toUpperCase(),
            });
            const response = {
                success: true,
                message: result.success
                    ? "Coupon applied successfully"
                    : "Failed to apply coupon",
                data: result,
            };
            res.status(result.success ? 200 : 400).json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Remove coupon from cart
     * DELETE /api/v1/cart/coupon/remove
     */
    removeCoupon = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const sessionId = req.sessionId || req.headers["x-session-id"];
            const result = await this.cartService.removeCoupon(userId, sessionId);
            const response = {
                success: true,
                message: "Coupon removed successfully",
                data: result,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Update shipping address for cart calculations
     * PUT /api/v1/cart/shipping
     */
    updateShipping = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const sessionId = req.sessionId || req.headers["x-session-id"];
            const { state, city, postalCode } = req.body;
            // Validate Nigerian states
            const validationErrors = this.validateShippingAddress({
                state,
                city,
                postalCode,
            });
            if (validationErrors.length > 0) {
                res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: validationErrors,
                });
                return;
            }
            const result = await this.cartService.updateShipping(userId, sessionId, {
                state,
                city,
                postalCode,
            });
            const response = {
                success: true,
                message: "Shipping address updated successfully",
                data: result,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Validate cart items and availability
     * POST /api/v1/cart/validate
     */
    validateCart = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const sessionId = req.sessionId || req.headers["x-session-id"];
            const validation = await this.cartService.validateCart(userId, sessionId);
            const response = {
                success: true,
                message: "Cart validation completed",
                data: validation,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get cart item count (for header badge)
     * GET /api/v1/cart/count
     */
    getCartItemCount = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const sessionId = req.sessionId || req.headers["x-session-id"];
            const count = await this.cartService.getCartItemCount(userId, sessionId);
            const response = {
                success: true,
                message: "Cart item count retrieved successfully",
                data: { count },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Merge guest cart with user cart after login
     * POST /api/v1/cart/merge
     */
    mergeCart = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const { guestSessionId, strategy } = req.body;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            if (!guestSessionId) {
                res.status(400).json({
                    success: false,
                    message: "Guest session ID is required",
                });
                return;
            }
            const result = await this.cartService.mergeCart(userId, guestSessionId, strategy || "merge");
            const response = {
                success: true,
                message: "Cart merged successfully",
                data: result,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Calculate shipping options for cart
     * POST /api/v1/cart/shipping/calculate
     */
    calculateShipping = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const sessionId = req.sessionId || req.headers["x-session-id"];
            const { state, city, postalCode } = req.body;
            if (!state || !city) {
                res.status(400).json({
                    success: false,
                    message: "State and city are required for shipping calculation",
                });
                return;
            }
            const shippingOptions = await this.cartService.calculateShipping(userId, sessionId, { state, city, postalCode });
            const response = {
                success: true,
                message: "Shipping options calculated successfully",
                data: shippingOptions,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Save cart for later (move to wishlist)
     * POST /api/v1/cart/save-for-later/:productId
     */
    saveForLater = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const { productId } = req.params;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            const result = await this.cartService.saveForLater(userId, productId);
            const response = {
                success: true,
                message: result.success
                    ? "Item saved for later"
                    : "Failed to save item for later",
                data: result,
            };
            res.status(result.success ? 200 : 400).json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Move item from wishlist to cart
     * POST /api/v1/cart/move-to-cart/:productId
     */
    moveToCart = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const { productId } = req.params;
            const { quantity } = req.body;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            const result = await this.cartService.moveToCart(userId, productId, quantity || 1);
            const response = {
                success: true,
                message: result.success
                    ? "Item moved to cart"
                    : "Failed to move item to cart",
                data: result,
            };
            res.status(result.success ? 200 : 400).json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Validate add to cart request
     */
    validateAddToCartRequest(data) {
        const errors = [];
        if (!data.productId || data.productId.trim().length === 0) {
            errors.push("Product ID is required");
        }
        if (!data.quantity || data.quantity < 1) {
            errors.push("Quantity must be at least 1");
        }
        if (data.quantity > 100) {
            errors.push("Quantity cannot exceed 100 items");
        }
        return errors;
    }
    /**
     * Validate update cart request
     */
    validateUpdateCartRequest(data) {
        const errors = [];
        if (!data.productId || data.productId.trim().length === 0) {
            errors.push("Product ID is required");
        }
        if (data.quantity < 0) {
            errors.push("Quantity cannot be negative");
        }
        if (data.quantity > 100) {
            errors.push("Quantity cannot exceed 100 items");
        }
        return errors;
    }
    /**
     * Validate Nigerian shipping address
     */
    validateShippingAddress(data) {
        const errors = [];
        // Nigerian states validation
        const nigerianStates = [
            "Abia",
            "Adamawa",
            "Akwa Ibom",
            "Anambra",
            "Bauchi",
            "Bayelsa",
            "Benue",
            "Borno",
            "Cross River",
            "Delta",
            "Ebonyi",
            "Edo",
            "Ekiti",
            "Enugu",
            "FCT",
            "Gombe",
            "Imo",
            "Jigawa",
            "Kaduna",
            "Kano",
            "Katsina",
            "Kebbi",
            "Kogi",
            "Kwara",
            "Lagos",
            "Nasarawa",
            "Niger",
            "Ogun",
            "Ondo",
            "Osun",
            "Oyo",
            "Plateau",
            "Rivers",
            "Sokoto",
            "Taraba",
            "Yobe",
            "Zamfara",
        ];
        if (!data.state || data.state.trim().length === 0) {
            errors.push("State is required");
        }
        else if (!nigerianStates.includes(data.state)) {
            errors.push("Invalid Nigerian state");
        }
        if (!data.city || data.city.trim().length === 0) {
            errors.push("City is required");
        }
        if (data.postalCode && !/^\d{6}$/.test(data.postalCode)) {
            errors.push("Nigerian postal code must be 6 digits");
        }
        return errors;
    }
}
exports.CartController = CartController;
//# sourceMappingURL=CartController.js.map