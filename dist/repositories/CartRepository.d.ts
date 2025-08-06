import { PrismaClient } from "@prisma/client";
import { BaseRepository } from "./BaseRepository";
import { Cart, CartItem, CartValidationResult } from "../types";
export interface CreateCartItemData {
    productId: string;
    userId: string;
    quantity: number;
    price: number;
}
export interface UpdateCartItemData {
    quantity?: number;
    price?: number;
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
export declare class CartRepository extends BaseRepository<CartItem, CreateCartItemData, UpdateCartItemData> {
    constructor(prisma?: PrismaClient);
    /**
     * Find cart items by user ID
     */
    findByUserId(userId: string): Promise<any[]>;
    /**
     * Find cart item by user and product
     */
    findByUserAndProduct(userId: string, productId: string): Promise<any | null>;
    /**
     * Find cart item by ID and user
     */
    findByIdAndUser(itemId: string, userId: string): Promise<any | null>;
    /**
     * Update cart item quantity
     */
    updateQuantity(itemId: string, quantity: number): Promise<any>;
    /**
     * Delete cart items by user ID
     */
    deleteByUserId(userId: string): Promise<void>;
    /**
     * Get cart for user (virtual cart from cart items)
     */
    getOrCreateUserCart(userId: string): Promise<CartWithDetails>;
    /**
     * Get guest cart (returns empty cart since guests need authentication)
     */
    getOrCreateGuestCart(sessionId: string): Promise<CartWithDetails>;
    /**
     * Add item to cart for user
     */
    addItemToCart(userId: string, productId: string, quantity: number): Promise<CartWithDetails>;
    /**
     * Update cart item quantity
     */
    updateCartItem(userId: string, productId: string, quantity: number): Promise<CartWithDetails>;
    /**
     * Remove item from cart
     */
    removeItemFromCart(userId: string, productId: string): Promise<CartWithDetails>;
    /**
     * Clear entire cart
     */
    clearCart(userId: string): Promise<CartWithDetails>;
    /**
     * Validate cart before checkout
     */
    validateCart(userId: string): Promise<CartValidationResult>;
    /**
     * Merge guest cart with user cart (since guest carts are session-based)
     */
    mergeGuestCartToUser(guestCartItems: Array<{
        productId: string;
        quantity: number;
    }>, userId: string, strategy?: "replace" | "merge" | "keep_authenticated"): Promise<CartWithDetails>;
    /**
     * Apply coupon to cart (virtual calculation since no cart table)
     */
    applyCoupon(userId: string, couponCode: string): Promise<{
        cart: CartWithDetails;
        discountAmount: number;
    }>;
    /**
     * Get abandoned carts for marketing (based on cart items)
     */
    getAbandonedCarts(abandonedAfterHours?: number, limit?: number): Promise<Array<CartWithDetails & {
        abandonedAt: Date;
        customerEmail?: string;
        customerPhone?: string;
    }>>;
    /**
     * Clean up old cart items (since no guest carts in database)
     */
    cleanupExpiredCarts(): Promise<{
        deletedCount: number;
    }>;
    private calculateCartTotals;
    private transformCartWithDetails;
}
//# sourceMappingURL=CartRepository.d.ts.map