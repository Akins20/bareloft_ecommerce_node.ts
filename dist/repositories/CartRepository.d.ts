import { PrismaClient } from "@prisma/client";
import { BaseRepository } from "./BaseRepository";
import { Cart, CartItem, CartValidationResult } from "../types";
export interface CreateCartData {
    userId?: string;
    sessionId?: string;
    subtotal?: number;
    estimatedTax?: number;
    estimatedShipping?: number;
    estimatedTotal?: number;
    currency?: string;
    appliedCoupon?: any;
    shippingAddress?: any;
    expiresAt?: Date;
}
export interface UpdateCartData {
    subtotal?: number;
    estimatedTax?: number;
    estimatedShipping?: number;
    estimatedTotal?: number;
    appliedCoupon?: any;
    shippingAddress?: any;
    expiresAt?: Date;
}
export interface CreateCartItemData {
    cartId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}
export interface CartWithDetails extends Cart {
    items: Array<CartItem & {
        product: {
            id: string;
            name: string;
            slug: string;
            sku: string;
            price: number;
            comparePrice?: number;
            primaryImage?: string;
            inStock: boolean;
            stockQuantity: number;
            weight?: number;
        };
        isAvailable: boolean;
        hasStockIssue: boolean;
        priceChanged: boolean;
    }>;
    itemCount: number;
    hasOutOfStockItems: boolean;
    hasPriceChanges: boolean;
    isValid: boolean;
}
export declare class CartRepository extends BaseRepository<Cart, CreateCartData, UpdateCartData> {
    constructor(prisma: PrismaClient);
    /**
     * Get or create cart for user
     */
    getOrCreateUserCart(userId: string): Promise<CartWithDetails>;
    /**
     * Get or create cart for guest session
     */
    getOrCreateGuestCart(sessionId: string): Promise<CartWithDetails>;
    /**
     * Add item to cart
     */
    addItemToCart(cartId: string, productId: string, quantity: number): Promise<CartWithDetails>;
    /**
     * Update cart item quantity
     */
    updateCartItem(cartId: string, productId: string, quantity: number): Promise<CartWithDetails>;
    /**
     * Remove item from cart
     */
    removeItemFromCart(cartId: string, productId: string): Promise<CartWithDetails>;
    /**
     * Clear entire cart
     */
    clearCart(cartId: string): Promise<CartWithDetails>;
    /**
     * Validate cart before checkout
     */
    validateCart(cartId: string): Promise<CartValidationResult>;
    /**
     * Merge guest cart with user cart
     */
    mergeGuestCartToUser(guestSessionId: string, userId: string, strategy?: "replace" | "merge" | "keep_authenticated"): Promise<CartWithDetails>;
    /**
     * Apply coupon to cart
     */
    applyCoupon(cartId: string, couponCode: string): Promise<CartWithDetails>;
    /**
     * Get abandoned carts for marketing
     */
    getAbandonedCarts(abandonedAfterHours?: number, limit?: number): Promise<Array<CartWithDetails & {
        abandonedAt: Date;
        customerEmail?: string;
        customerPhone?: string;
    }>>;
    /**
     * Clean up expired guest carts
     */
    cleanupExpiredCarts(): Promise<{
        deletedCount: number;
    }>;
    private recalculateCartTotals;
    private transformCartWithDetails;
}
//# sourceMappingURL=CartRepository.d.ts.map