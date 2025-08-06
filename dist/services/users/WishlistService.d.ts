import { BaseService } from "../BaseService";
import { UserRepository } from "@/repositories/UserRepository";
import { ProductRepository } from "@/repositories/ProductRepository";
import { WishlistItem, WishlistResponse, WishlistOperationResult, WishlistClearResult, MoveToCartItem, MoveToCartResult, WishlistSummary, ShareableWishlistResult } from "@/types/user.types";
export declare class WishlistService extends BaseService {
    private userRepository;
    private productRepository;
    constructor(userRepository?: UserRepository, productRepository?: ProductRepository);
    /**
     * Get user's wishlist with pagination and filters
     */
    getUserWishlist(userId: string, options?: {
        page?: number;
        limit?: number;
        includeOutOfStock?: boolean;
    }): Promise<WishlistResponse>;
    /**
     * Add product to wishlist
     */
    addToWishlist(userId: string, productId: string): Promise<WishlistOperationResult>;
    /**
     * Remove product from wishlist
     */
    removeFromWishlist(userId: string, productId: string): Promise<WishlistOperationResult>;
    /**
     * Clear user's wishlist
     */
    clearWishlist(userId: string): Promise<WishlistClearResult>;
    /**
     * Check if product is in user's wishlist
     */
    isProductInWishlist(userId: string, productId: string): Promise<boolean>;
    /**
     * Get wishlist item count
     */
    getWishlistCount(userId: string): Promise<number>;
    /**
     * Move wishlist item to cart
     */
    moveToCart(userId: string, productId: string, quantity?: number, removeFromWishlist?: boolean): Promise<MoveToCartResult>;
    /**
     * Move multiple wishlist items to cart
     */
    moveMultipleToCart(userId: string, items: MoveToCartItem[], removeFromWishlist?: boolean): Promise<MoveToCartResult>;
    /**
     * Get wishlist summary/analytics
     */
    getWishlistSummary(userId: string): Promise<WishlistSummary>;
    /**
     * Generate shareable wishlist link
     */
    generateShareableLink(userId: string, isPublic?: boolean, expiresInDays?: number): Promise<ShareableWishlistResult>;
    /**
     * Get shared wishlist by token
     */
    getSharedWishlist(shareToken: string, options?: {
        page?: number;
        limit?: number;
    }): Promise<WishlistResponse | null>;
    /**
     * Get products back in stock from wishlist
     */
    getBackInStockItems(userId: string): Promise<WishlistItem[]>;
}
//# sourceMappingURL=WishlistService.d.ts.map