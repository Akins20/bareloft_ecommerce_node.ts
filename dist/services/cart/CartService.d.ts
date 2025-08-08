import { BaseService } from "../BaseService";
import { CartItem, UpdateShippingRequest, CartValidationResult, ShippingCalculationResponse, MergeCartRequest } from "../../types";
import { CouponRepository } from "../../repositories/CouponRepository";
export interface AddToCartRequest {
    productId: string;
    quantity: number;
}
export interface UpdateCartItemRequest {
    quantity: number;
}
export interface CartSummary {
    items: CartItem[];
    subtotal: number;
    tax: number;
    total: number;
    itemCount: number;
}
export interface GuestCartItem {
    productId: string;
    quantity: number;
    addedAt: Date;
}
export interface GuestCart {
    sessionId: string;
    items: GuestCartItem[];
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date;
}
export declare class CartService extends BaseService {
    private cartRepository;
    private productRepository;
    private couponService;
    constructor(cartRepository?: any, productRepository?: any, couponRepository?: CouponRepository);
    /**
     * Get user's cart
     */
    getCart(userId: string): Promise<CartSummary>;
    /**
     * Add item to cart
     */
    addToCart(userId: string, data: AddToCartRequest): Promise<CartItem>;
    /**
     * Update cart item quantity
     */
    updateCartItem(userId: string, sessionId: string | null, data: {
        productId: string;
        quantity: number;
    }): Promise<{
        success: boolean;
        message: string;
        cart: any;
    }>;
    /**
     * Remove item from cart
     */
    removeFromCart(userId: string, sessionId: string | null, data: {
        productId: string;
    }): Promise<{
        success: boolean;
        message: string;
        cart: any;
    }>;
    /**
     * Clear user's cart
     */
    clearCart(userId: string, sessionId?: string | null): Promise<{
        success: boolean;
        message: string;
        cart: any;
    }>;
    /**
     * Apply coupon to cart
     */
    applyCoupon(userId: string, sessionId: string | null, data: {
        couponCode: string;
    }): Promise<{
        success: boolean;
        message: string;
        cart: any;
    }>;
    /**
     * Remove coupon from cart
     */
    removeCoupon(userId: string, sessionId: string | null): Promise<{
        success: boolean;
        message: string;
        cart: any;
    }>;
    /**
     * Update shipping information
     */
    updateShipping(userId: string, sessionId: string | null, data: UpdateShippingRequest): Promise<{
        success: boolean;
        message: string;
        cart: any;
    }>;
    /**
     * Validate cart items
     */
    validateCart(userId: string, sessionId: string | null): Promise<CartValidationResult>;
    /**
     * Get cart item count
     */
    getCartItemCount(userId: string, sessionId: string | null): Promise<{
        count: number;
    }>;
    /**
     * Get guest cart item count
     */
    getGuestCartItemCount(sessionId: string): Promise<{
        count: number;
    }>;
    /**
     * Merge guest cart with user cart
     */
    mergeCart(userId: string, sessionId: string, data: MergeCartRequest): Promise<{
        success: boolean;
        message: string;
        cart: any;
    }>;
    /**
     * Calculate shipping options
     */
    calculateShipping(userId: string, destination: {
        state: string;
        city: string;
        postalCode?: string;
    }): Promise<ShippingCalculationResponse>;
    /**
     * Save item for later
     */
    saveForLater(userId: string, productId: string): Promise<{
        success: boolean;
        message: string;
        cart: any;
    }>;
    /**
     * Move saved item back to cart
     */
    moveToCart(userId: string, productId: string): Promise<{
        success: boolean;
        message: string;
        cart: any;
    }>;
    /**
     * Calculate cart summary
     */
    private calculateCartSummary;
    /**
     * Calculate shipping cost based on destination
     */
    private calculateShippingCost;
    /**
     * Get guest cart from Redis
     */
    getGuestCart(sessionId: string): Promise<any>;
    /**
     * Add item to guest cart
     */
    addToGuestCart(sessionId: string, data: AddToCartRequest): Promise<any>;
    /**
     * Update guest cart item
     */
    updateGuestCartItem(sessionId: string, productId: string, quantity: number): Promise<any>;
    /**
     * Remove item from guest cart
     */
    removeFromGuestCart(sessionId: string, productId: string): Promise<any>;
    /**
     * Clear guest cart
     */
    clearGuestCart(sessionId: string): Promise<any>;
    /**
     * Handle service errors
     */
    protected handleError(message: string, error: any): never;
}
//# sourceMappingURL=CartService.d.ts.map