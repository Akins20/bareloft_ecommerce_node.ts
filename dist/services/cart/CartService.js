"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartService = void 0;
const BaseService_1 = require("../BaseService");
const CartRepository_1 = require("@/repositories/CartRepository");
const ProductRepository_1 = require("@/repositories/ProductRepository");
const types_1 = require("@/types");
class CartService extends BaseService_1.BaseService {
    cartRepository;
    productRepository;
    constructor() {
        super();
        this.cartRepository = new CartRepository_1.CartRepository();
        this.productRepository = new ProductRepository_1.ProductRepository();
    }
    /**
     * Get user's cart
     */
    async getCart(userId) {
        try {
            const cartItems = await this.cartRepository.findByUserId(userId);
            return this.calculateCartSummary(cartItems);
        }
        catch (error) {
            this.handleError("Error getting cart", error);
            throw error;
        }
    }
    /**
     * Add item to cart
     */
    async addToCart(userId, data) {
        try {
            const { productId, quantity } = data;
            // Validate product exists
            const product = await this.productRepository.findById(productId);
            if (!product) {
                throw new types_1.AppError("Product not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            // Check stock availability
            if (product.stock < quantity) {
                throw new types_1.AppError("Insufficient stock", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.INSUFFICIENT_STOCK);
            }
            // Check if item already exists in cart
            const existingItem = await this.cartRepository.findByUserAndProduct(userId, productId);
            if (existingItem) {
                // Update existing item
                const newQuantity = existingItem.quantity + quantity;
                if (newQuantity > product.stock) {
                    throw new types_1.AppError("Insufficient stock for requested quantity", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.INSUFFICIENT_STOCK);
                }
                return await this.cartRepository.updateQuantity(existingItem.id, newQuantity);
            }
            else {
                // Create new cart item
                return await this.cartRepository.create({
                    userId,
                    productId,
                    quantity,
                    price: product.price,
                });
            }
        }
        catch (error) {
            this.handleError("Error adding to cart", error);
            throw error;
        }
    }
    /**
     * Update cart item quantity
     */
    async updateCartItem(userId, itemId, data) {
        try {
            const { quantity } = data;
            // Validate cart item belongs to user
            const cartItem = await this.cartRepository.findByIdAndUser(itemId, userId);
            if (!cartItem) {
                throw new types_1.AppError("Cart item not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            // Validate product stock
            const product = await this.productRepository.findById(cartItem.productId);
            if (!product) {
                throw new types_1.AppError("Product not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            if (product.stock < quantity) {
                throw new types_1.AppError("Insufficient stock", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.INSUFFICIENT_STOCK);
            }
            return await this.cartRepository.updateQuantity(itemId, quantity);
        }
        catch (error) {
            this.handleError("Error updating cart item", error);
            throw error;
        }
    }
    /**
     * Remove item from cart
     */
    async removeFromCart(userId, itemId) {
        try {
            // Validate cart item belongs to user
            const cartItem = await this.cartRepository.findByIdAndUser(itemId, userId);
            if (!cartItem) {
                throw new types_1.AppError("Cart item not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            await this.cartRepository.delete(itemId);
        }
        catch (error) {
            this.handleError("Error removing from cart", error);
            throw error;
        }
    }
    /**
     * Clear user's cart
     */
    async clearCart(userId) {
        try {
            await this.cartRepository.deleteByUserId(userId);
        }
        catch (error) {
            this.handleError("Error clearing cart", error);
            throw error;
        }
    }
    /**
     * Calculate cart summary
     */
    calculateCartSummary(cartItems) {
        const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.075; // 7.5% VAT in Nigeria
        const total = subtotal + tax;
        const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        return {
            items: cartItems,
            subtotal,
            tax,
            total,
            itemCount,
        };
    }
    /**
     * Handle service errors
     */
    handleError(message, error) {
        console.error(message, error);
        if (error instanceof types_1.AppError) {
            throw error;
        }
        throw new types_1.AppError(message, types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.INTERNAL_ERROR);
    }
}
exports.CartService = CartService;
//# sourceMappingURL=CartService.js.map