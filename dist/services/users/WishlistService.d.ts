import { BaseService } from "../BaseService";
import { WishlistItem } from "@/types";
export interface AddToWishlistRequest {
    productId: string;
}
export declare class WishlistService extends BaseService {
    private userRepository;
    private productRepository;
    constructor();
    /**
     * Get user's wishlist
     */
    getUserWishlist(userId: string): Promise<WishlistItem[]>;
    /**
     * Add product to wishlist
     */
    addToWishlist(userId: string, data: AddToWishlistRequest): Promise<WishlistItem>;
    /**
     * Remove product from wishlist
     */
    removeFromWishlist(userId: string, productId: string): Promise<void>;
    /**
     * Clear user's wishlist
     */
    clearWishlist(userId: string): Promise<void>;
    /**
     * Handle service errors
     */
    private handleError;
}
//# sourceMappingURL=WishlistService.d.ts.map