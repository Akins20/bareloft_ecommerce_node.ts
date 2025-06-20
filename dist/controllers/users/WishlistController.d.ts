import { Request, Response } from "express";
import { BaseController } from "../BaseController";
import { WishlistService } from "../../services/users/WishlistService";
import { AuthenticatedRequest } from "../../types/auth.types";
export declare class WishlistController extends BaseController {
    private wishlistService;
    constructor(wishlistService: WishlistService);
    /**
     * Get user's wishlist
     * GET /api/v1/wishlist
     */
    getWishlist: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Add product to wishlist
     * POST /api/v1/wishlist/add
     */
    addToWishlist: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Remove product from wishlist
     * DELETE /api/v1/wishlist/remove/:productId
     */
    removeFromWishlist: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Check if product is in user's wishlist
     * GET /api/v1/wishlist/check/:productId
     */
    checkWishlistItem: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Clear entire wishlist
     * DELETE /api/v1/wishlist/clear
     */
    clearWishlist: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Get wishlist item count
     * GET /api/v1/wishlist/count
     */
    getWishlistCount: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Move wishlist item to cart
     * POST /api/v1/wishlist/move-to-cart/:productId
     */
    moveToCart: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Move multiple wishlist items to cart
     * POST /api/v1/wishlist/move-multiple-to-cart
     */
    moveMultipleToCart: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Get wishlist summary/analytics
     * GET /api/v1/wishlist/summary
     */
    getWishlistSummary: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Share wishlist (generate shareable link)
     * POST /api/v1/wishlist/share
     */
    shareWishlist: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Get public shared wishlist
     * GET /api/v1/wishlist/shared/:shareToken
     */
    getSharedWishlist: (req: Request, res: Response) => Promise<void>;
    /**
     * Get products back in stock from wishlist
     * GET /api/v1/wishlist/back-in-stock
     */
    getBackInStockItems: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Validate move to cart items structure
     */
    private validateMoveToCartItems;
}
//# sourceMappingURL=WishlistController.d.ts.map