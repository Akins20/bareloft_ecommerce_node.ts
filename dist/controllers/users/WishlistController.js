"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WishlistController = void 0;
const BaseController_1 = require("../BaseController");
class WishlistController extends BaseController_1.BaseController {
    wishlistService;
    constructor(wishlistService) {
        super();
        this.wishlistService = wishlistService;
    }
    /**
     * Get user's wishlist
     * GET /api/v1/wishlist
     */
    getWishlist = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            const { page, limit } = this.parsePaginationParams(req.query);
            const includeOutOfStock = this.parseBoolean(req.query.includeOutOfStock) ?? true;
            const result = await this.wishlistService.getUserWishlist(userId, {
                page,
                limit,
                includeOutOfStock,
            });
            this.sendPaginatedResponse(res, result.items, {
                page: result.pagination.currentPage,
                limit: result.pagination.itemsPerPage,
                total: result.pagination.totalItems,
                totalPages: result.pagination.totalPages,
                hasNext: result.pagination.hasNextPage,
                hasPrev: result.pagination.hasPreviousPage,
            }, "Wishlist retrieved successfully");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Add product to wishlist
     * POST /api/v1/wishlist/add
     */
    addToWishlist = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            const { productId } = req.body;
            if (!productId || productId.trim().length === 0) {
                this.sendError(res, "Product ID is required", 400, "VALIDATION_ERROR");
                return;
            }
            const result = await this.wishlistService.addToWishlist(userId, productId);
            if (!result.success) {
                this.sendError(res, result.message, 400, "ADD_TO_WISHLIST_FAILED");
                return;
            }
            this.logAction("WISHLIST_ITEM_ADDED", userId, "WISHLIST", undefined, {
                productId,
            });
            this.sendSuccess(res, result.item, "Product added to wishlist successfully", 201);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Remove product from wishlist
     * DELETE /api/v1/wishlist/remove/:productId
     */
    removeFromWishlist = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            const { productId } = req.params;
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            if (!productId) {
                this.sendError(res, "Product ID is required", 400, "VALIDATION_ERROR");
                return;
            }
            const result = await this.wishlistService.removeFromWishlist(userId, productId);
            if (!result.success) {
                this.sendError(res, result.message, 404, "REMOVE_FROM_WISHLIST_FAILED");
                return;
            }
            this.logAction("WISHLIST_ITEM_REMOVED", userId, "WISHLIST", undefined, {
                productId,
            });
            this.sendSuccess(res, null, "Product removed from wishlist successfully");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Check if product is in user's wishlist
     * GET /api/v1/wishlist/check/:productId
     */
    checkWishlistItem = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            const { productId } = req.params;
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            if (!productId) {
                this.sendError(res, "Product ID is required", 400, "VALIDATION_ERROR");
                return;
            }
            const isInWishlist = await this.wishlistService.isProductInWishlist(userId, productId);
            this.sendSuccess(res, {
                productId,
                isInWishlist,
                inWishlist: isInWishlist, // Alternative field name for compatibility
            }, "Wishlist status checked successfully");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Clear entire wishlist
     * DELETE /api/v1/wishlist/clear
     */
    clearWishlist = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            const result = await this.wishlistService.clearWishlist(userId);
            this.logAction("WISHLIST_CLEARED", userId, "WISHLIST", undefined, {
                itemsRemoved: result.itemsRemoved,
            });
            this.sendSuccess(res, {
                itemsRemoved: result.itemsRemoved,
            }, "Wishlist cleared successfully");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get wishlist item count
     * GET /api/v1/wishlist/count
     */
    getWishlistCount = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            const count = await this.wishlistService.getWishlistCount(userId);
            this.sendSuccess(res, { count }, "Wishlist count retrieved successfully");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Move wishlist item to cart
     * POST /api/v1/wishlist/move-to-cart/:productId
     */
    moveToCart = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            const { productId } = req.params;
            const { quantity, removeFromWishlist } = req.body;
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            const qty = quantity && quantity > 0 ? quantity : 1;
            const shouldRemove = removeFromWishlist !== false; // Default to true
            if (!productId) {
                this.sendError(res, "Product ID is required", 400, "VALIDATION_ERROR");
                return;
            }
            const result = await this.wishlistService.moveToCart(userId, productId, qty, shouldRemove);
            if (!result.success) {
                this.sendError(res, result.message, 400, "MOVE_TO_CART_FAILED");
                return;
            }
            this.logAction("WISHLIST_ITEM_MOVED_TO_CART", userId, "WISHLIST", undefined, {
                productId,
                quantity: qty,
                removedFromWishlist: shouldRemove,
            });
            this.sendSuccess(res, result, "Product moved to cart successfully");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Move multiple wishlist items to cart
     * POST /api/v1/wishlist/move-multiple-to-cart
     */
    moveMultipleToCart = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            const { items, removeFromWishlist } = req.body;
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            if (!items || !Array.isArray(items) || items.length === 0) {
                this.sendError(res, "Items array is required and cannot be empty", 400, "VALIDATION_ERROR");
                return;
            }
            // Validate items structure
            const validationErrors = this.validateMoveToCartItems(items);
            if (validationErrors.length > 0) {
                this.sendError(res, "Invalid items data", 400, "VALIDATION_ERROR", validationErrors);
                return;
            }
            const shouldRemove = removeFromWishlist !== false; // Default to true
            const result = await this.wishlistService.moveMultipleToCart(userId, items, shouldRemove);
            this.logAction("WISHLIST_MULTIPLE_MOVED_TO_CART", userId, "WISHLIST", undefined, {
                itemCount: items.length,
                successCount: result.successCount,
                failureCount: result.failureCount,
                removedFromWishlist: shouldRemove,
            });
            if (result.successCount === 0) {
                const errorDetails = result.failures?.map(f => `${f.productId}: ${f.reason}`) || [];
                this.sendError(res, "No items could be moved to cart", 400, "MOVE_TO_CART_FAILED", errorDetails);
                return;
            }
            this.sendSuccess(res, result, `${result.successCount} item(s) moved to cart successfully`);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get wishlist summary/analytics
     * GET /api/v1/wishlist/summary
     */
    getWishlistSummary = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            const summary = await this.wishlistService.getWishlistSummary(userId);
            this.sendSuccess(res, summary, "Wishlist summary retrieved successfully");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Share wishlist (generate shareable link)
     * POST /api/v1/wishlist/share
     */
    shareWishlist = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            const { isPublic, expiresInDays } = req.body;
            const result = await this.wishlistService.generateShareableLink(userId, isPublic !== false, // Default to true
            expiresInDays || 30 // Default 30 days
            );
            this.logAction("WISHLIST_SHARED", userId, "WISHLIST", undefined, {
                isPublic: isPublic !== false,
                expiresInDays: expiresInDays || 30,
            });
            this.sendSuccess(res, result, "Wishlist share link generated successfully");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get public shared wishlist
     * GET /api/v1/wishlist/shared/:shareToken
     */
    getSharedWishlist = async (req, res) => {
        try {
            const { shareToken } = req.params;
            if (!shareToken) {
                this.sendError(res, "Share token is required", 400, "VALIDATION_ERROR");
                return;
            }
            const { page, limit } = this.parsePaginationParams(req.query);
            const result = await this.wishlistService.getSharedWishlist(shareToken, {
                page,
                limit,
            });
            if (!result) {
                this.sendError(res, "Shared wishlist not found or expired", 404, "SHARED_WISHLIST_NOT_FOUND");
                return;
            }
            this.sendPaginatedResponse(res, result.items, {
                page: result.pagination.currentPage,
                limit: result.pagination.itemsPerPage,
                total: result.pagination.totalItems,
                totalPages: result.pagination.totalPages,
                hasNext: result.pagination.hasNextPage,
                hasPrev: result.pagination.hasPreviousPage,
            }, "Shared wishlist retrieved successfully");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get products back in stock from wishlist
     * GET /api/v1/wishlist/back-in-stock
     */
    getBackInStockItems = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            const items = await this.wishlistService.getBackInStockItems(userId);
            this.sendSuccess(res, items, "Back in stock items retrieved successfully");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Validate move to cart items structure
     */
    validateMoveToCartItems(items) {
        const errors = [];
        items.forEach((item, index) => {
            if (!item.productId || typeof item.productId !== "string") {
                errors.push(`Item ${index + 1}: Product ID is required and must be a string`);
            }
            if (item.quantity !== undefined &&
                (!Number.isInteger(item.quantity) || item.quantity < 1)) {
                errors.push(`Item ${index + 1}: Quantity must be a positive integer`);
            }
        });
        return errors;
    }
}
exports.WishlistController = WishlistController;
//# sourceMappingURL=WishlistController.js.map