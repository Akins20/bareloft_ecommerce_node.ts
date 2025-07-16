import { BaseService } from "../BaseService";
import { CartRepository } from "@/repositories/CartRepository";
import { ProductRepository } from "@/repositories/ProductRepository";
import {
  CartItem,
  Product,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
} from "@/types";

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

export class CartService extends BaseService {
  private cartRepository: CartRepository;
  private productRepository: ProductRepository;

  constructor() {
    super();
    this.cartRepository = new CartRepository();
    this.productRepository = new ProductRepository();
  }

  /**
   * Get user's cart
   */
  async getCart(userId: string): Promise<CartSummary> {
    try {
      const cartItems = await this.cartRepository.findByUserId(userId);
      
      return this.calculateCartSummary(cartItems);
    } catch (error) {
      this.handleError("Error getting cart", error);
      throw error;
    }
  }

  /**
   * Add item to cart
   */
  async addToCart(userId: string, data: AddToCartRequest): Promise<CartItem> {
    try {
      const { productId, quantity } = data;

      // Validate product exists
      const product = await this.productRepository.findById(productId);
      if (!product) {
        throw new AppError(
          "Product not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Check stock availability
      if (product.stock < quantity) {
        throw new AppError(
          "Insufficient stock",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INSUFFICIENT_STOCK
        );
      }

      // Check if item already exists in cart
      const existingItem = await this.cartRepository.findByUserAndProduct(userId, productId);
      
      if (existingItem) {
        // Update existing item
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > product.stock) {
          throw new AppError(
            "Insufficient stock for requested quantity",
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.INSUFFICIENT_STOCK
          );
        }
        
        return await this.cartRepository.updateQuantity(existingItem.id, newQuantity);
      } else {
        // Create new cart item
        return await this.cartRepository.create({
          userId,
          productId,
          quantity,
          price: product.price,
        });
      }
    } catch (error) {
      this.handleError("Error adding to cart", error);
      throw error;
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(userId: string, itemId: string, data: UpdateCartItemRequest): Promise<CartItem> {
    try {
      const { quantity } = data;

      // Validate cart item belongs to user
      const cartItem = await this.cartRepository.findByIdAndUser(itemId, userId);
      if (!cartItem) {
        throw new AppError(
          "Cart item not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Validate product stock
      const product = await this.productRepository.findById(cartItem.productId);
      if (!product) {
        throw new AppError(
          "Product not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      if (product.stock < quantity) {
        throw new AppError(
          "Insufficient stock",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INSUFFICIENT_STOCK
        );
      }

      return await this.cartRepository.updateQuantity(itemId, quantity);
    } catch (error) {
      this.handleError("Error updating cart item", error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(userId: string, itemId: string): Promise<void> {
    try {
      // Validate cart item belongs to user
      const cartItem = await this.cartRepository.findByIdAndUser(itemId, userId);
      if (!cartItem) {
        throw new AppError(
          "Cart item not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      await this.cartRepository.delete(itemId);
    } catch (error) {
      this.handleError("Error removing from cart", error);
      throw error;
    }
  }

  /**
   * Clear user's cart
   */
  async clearCart(userId: string): Promise<void> {
    try {
      await this.cartRepository.deleteByUserId(userId);
    } catch (error) {
      this.handleError("Error clearing cart", error);
      throw error;
    }
  }

  /**
   * Calculate cart summary
   */
  private calculateCartSummary(cartItems: CartItem[]): CartSummary {
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
  private handleError(message: string, error: any): void {
    console.error(message, error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }
}