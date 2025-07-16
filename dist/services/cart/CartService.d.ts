import { BaseService } from "../BaseService";
import { CartItem } from "@/types";
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
export declare class CartService extends BaseService {
    private cartRepository;
    private productRepository;
    constructor();
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
    updateCartItem(userId: string, itemId: string, data: UpdateCartItemRequest): Promise<CartItem>;
    /**
     * Remove item from cart
     */
    removeFromCart(userId: string, itemId: string): Promise<void>;
    /**
     * Clear user's cart
     */
    clearCart(userId: string): Promise<void>;
    /**
     * Calculate cart summary
     */
    private calculateCartSummary;
    /**
     * Handle service errors
     */
    private handleError;
}
//# sourceMappingURL=CartService.d.ts.map