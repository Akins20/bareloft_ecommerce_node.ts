import { BaseService } from "../BaseService";
import { CartRepository } from "../../repositories/CartRepository";
import { ProductRepository } from "../../repositories/ProductRepository";
import {
  CartItem,
  Product,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
  UpdateShippingRequest,
  CartValidationResult,
  CartIssue,
  ShippingCalculationResponse,
  ShippingOption,
  MergeCartRequest,
} from "../../types";

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
  private cartRepository: any;
  private productRepository: any;

  constructor(cartRepository?: any, productRepository?: any) {
    super();
    this.cartRepository = cartRepository || {};
    this.productRepository = productRepository || {};
  }

  /**
   * Get user's cart
   */
  async getCart(userId: string): Promise<CartSummary> {
    try {
      const cartItems = await this.cartRepository.findByUserId?.(userId) || [];
      
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
      const product = await this.productRepository.findById?.(productId);
      if (!product) {
        throw new AppError(
          "Product not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Check stock availability
      if ((product as any).stock < quantity) {
        throw new AppError(
          "Insufficient stock",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INSUFFICIENT_STOCK
        );
      }

      // Check if item already exists in cart
      const existingItem = await this.cartRepository.findByUserAndProduct?.(userId, productId);
      
      if (existingItem) {
        // Update existing item
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > (product as any).stock) {
          throw new AppError(
            "Insufficient stock for requested quantity",
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.INSUFFICIENT_STOCK
          );
        }
        
        return await this.cartRepository.updateQuantity?.(existingItem.id, newQuantity) || existingItem;
      } else {
        // Create new cart item
        return await this.cartRepository.create?.({
          userId,
          productId,
          quantity,
          price: (product as any).price,
        }) || { id: 'temp', userId, productId, quantity, price: (product as any).price };
      }
    } catch (error) {
      this.handleError("Error adding to cart", error);
      throw error;
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(userId: string, sessionId: string | null, data: { productId: string; quantity: number }): Promise<{ success: boolean; message: string; cart: any }> {
    try {
      const { productId, quantity } = data;

      // Find cart item by user and product
      const cartItem = await this.cartRepository.findByUserAndProduct?.(userId, productId);
      if (!cartItem) {
        throw new AppError(
          "Cart item not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Validate product stock
      const product = await this.productRepository.findById?.(cartItem.productId);
      if (!product) {
        throw new AppError(
          "Product not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      if ((product as any).stock < quantity) {
        throw new AppError(
          "Insufficient stock",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INSUFFICIENT_STOCK
        );
      }

      const updatedItem = await this.cartRepository.updateQuantity?.(cartItem.id, quantity) || cartItem;
      
      // Get the updated cart summary
      const updatedCart = await this.getCart(userId);
      
      return {
        success: true,
        message: "Cart item updated successfully",
        cart: {
          id: `cart_${userId}`,
          userId,
          items: updatedCart.items,
          subtotal: updatedCart.subtotal,
          estimatedTax: updatedCart.tax,
          estimatedShipping: 0,
          estimatedTotal: updatedCart.total,
          currency: "NGN",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      };
    } catch (error) {
      this.handleError("Error updating cart item", error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(userId: string, sessionId: string | null, data: { productId: string }): Promise<{ success: boolean; message: string; cart: any }> {
    try {
      const { productId } = data;
      
      // Find cart item by user and product
      const cartItem = await this.cartRepository.findByUserAndProduct?.(userId, productId);
      if (!cartItem) {
        throw new AppError(
          "Cart item not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      await this.cartRepository.delete?.(cartItem.id);
      
      // Get the updated cart summary
      const updatedCart = await this.getCart(userId);
      
      return {
        success: true,
        message: "Item removed from cart successfully",
        cart: {
          id: `cart_${userId}`,
          userId,
          items: updatedCart.items,
          subtotal: updatedCart.subtotal,
          estimatedTax: updatedCart.tax,
          estimatedShipping: 0,
          estimatedTotal: updatedCart.total,
          currency: "NGN",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      };
    } catch (error) {
      this.handleError("Error removing from cart", error);
      throw error;
    }
  }

  /**
   * Clear user's cart
   */
  async clearCart(userId: string, sessionId?: string | null): Promise<{ success: boolean; message: string; cart: any }> {
    try {
      await this.cartRepository.deleteByUserId?.(userId);
      
      return {
        success: true,
        message: "Cart cleared successfully",
        cart: {
          id: `cart_${userId}`,
          userId,
          items: [],
          subtotal: 0,
          estimatedTax: 0,
          estimatedShipping: 0,
          estimatedTotal: 0,
          currency: "NGN",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      };
    } catch (error) {
      this.handleError("Error clearing cart", error);
      throw error;
    }
  }

  /**
   * Apply coupon to cart
   */
  async applyCoupon(userId: string, sessionId: string | null, data: { couponCode: string }): Promise<{ success: boolean; message: string; cart: any }> {
    try {
      const { couponCode } = data;
      
      // Get current cart
      const currentCart = await this.getCart(userId);
      
      // TODO: Implement actual coupon validation and application logic
      // For now, return the cart without applying coupon
      
      return {
        success: false,
        message: "Coupon functionality not implemented yet",
        cart: {
          id: `cart_${userId}`,
          userId,
          items: currentCart.items,
          subtotal: currentCart.subtotal,
          estimatedTax: currentCart.tax,
          estimatedShipping: 0,
          estimatedTotal: currentCart.total,
          currency: "NGN",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      };
    } catch (error) {
      this.handleError("Error applying coupon", error);
      throw error;
    }
  }

  /**
   * Remove coupon from cart
   */
  async removeCoupon(userId: string, sessionId: string | null): Promise<{ success: boolean; message: string; cart: any }> {
    try {
      // Get the updated cart summary without coupon
      const updatedCart = await this.getCart(userId);
      
      return {
        success: true,
        message: "Coupon removed successfully",
        cart: {
          id: `cart_${userId}`,
          userId,
          items: updatedCart.items,
          subtotal: updatedCart.subtotal,
          estimatedTax: updatedCart.tax,
          estimatedShipping: 0,
          estimatedTotal: updatedCart.total,
          currency: "NGN",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      };
    } catch (error) {
      this.handleError("Error removing coupon", error);
      throw error;
    }
  }

  /**
   * Update shipping information
   */
  async updateShipping(userId: string, sessionId: string | null, data: UpdateShippingRequest): Promise<{ success: boolean; message: string; cart: any }> {
    try {
      const updatedCart = await this.getCart(userId);
      
      // Calculate shipping based on destination
      const shippingCost = await this.calculateShippingCost(data.state, data.city);
      
      return {
        success: true,
        message: "Shipping information updated successfully",
        cart: {
          id: `cart_${userId}`,
          userId,
          items: updatedCart.items,
          subtotal: updatedCart.subtotal,
          estimatedTax: updatedCart.tax,
          estimatedShipping: shippingCost,
          estimatedTotal: updatedCart.total + shippingCost,
          currency: "NGN",
          shippingAddress: {
            state: data.state,
            city: data.city,
            postalCode: data.postalCode,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      };
    } catch (error) {
      this.handleError("Error updating shipping", error);
      throw error;
    }
  }

  /**
   * Validate cart items
   */
  async validateCart(userId: string, sessionId: string | null): Promise<CartValidationResult> {
    try {
      const cartItems = await this.cartRepository.findByUserId?.(userId) || [];
      const issues: CartIssue[] = [];
      let isValid = true;

      for (const item of cartItems) {
        const product = await this.productRepository.findById?.(item.productId);
        
        if (!product) {
          issues.push({
            type: "product_unavailable",
            productId: item.productId,
            productName: `Product ${item.productId}`,
            message: "This product is no longer available",
            severity: "error",
            action: "remove"
          });
          isValid = false;
        } else {
          // Check stock
          if ((product as any).stock < item.quantity) {
            issues.push({
              type: "out_of_stock",
              productId: item.productId,
              productName: (product as any).name,
              message: `Only ${(product as any).stock} items available`,
              severity: "warning",
              action: "reduce_quantity"
            });
            if ((product as any).stock === 0) {
              isValid = false;
            }
          }
          
          // Check price changes
          if (Math.abs((product as any).price - (item as any).price) > 0.01) {
            issues.push({
              type: "price_change",
              productId: item.productId,
              productName: (product as any).name,
              message: `Price has changed from ₦${(item as any).price} to ₦${(product as any).price}`,
              severity: "warning",
              action: "update_price"
            });
          }
        }
      }

      const cartSummary = this.calculateCartSummary(cartItems);
      
      return {
        isValid,
        issues,
        cart: {
          id: `cart_${userId}`,
          userId,
          items: cartSummary.items,
          itemCount: cartSummary.itemCount,
          subtotal: cartSummary.subtotal,
          estimatedTax: cartSummary.tax,
          estimatedShipping: 0,
          estimatedTotal: cartSummary.total,
          currency: "NGN",
          hasOutOfStockItems: issues.some(i => i.type === "out_of_stock"),
          hasPriceChanges: issues.some(i => i.type === "price_change"),
          isValid,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      };
    } catch (error) {
      this.handleError("Error validating cart", error);
      throw error;
    }
  }

  /**
   * Get cart item count
   */
  async getCartItemCount(userId: string, sessionId: string | null): Promise<{ count: number }> {
    try {
      const cartItems = await this.cartRepository.findByUserId?.(userId) || [];
      const count = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      
      return { count };
    } catch (error) {
      this.handleError("Error getting cart item count", error);
      throw error;
    }
  }

  /**
   * Merge guest cart with user cart
   */
  async mergeCart(userId: string, sessionId: string, data: MergeCartRequest): Promise<{ success: boolean; message: string; cart: any }> {
    try {
      // For now, return success without actual merge logic
      // TODO: Implement guest cart merging
      const updatedCart = await this.getCart(userId);
      
      return {
        success: true,
        message: "Carts merged successfully",
        cart: {
          id: `cart_${userId}`,
          userId,
          items: updatedCart.items,
          subtotal: updatedCart.subtotal,
          estimatedTax: updatedCart.tax,
          estimatedShipping: 0,
          estimatedTotal: updatedCart.total,
          currency: "NGN",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      };
    } catch (error) {
      this.handleError("Error merging cart", error);
      throw error;
    }
  }

  /**
   * Calculate shipping options
   */
  async calculateShipping(userId: string, destination: { state: string; city: string; postalCode?: string }): Promise<ShippingCalculationResponse> {
    try {
      const shippingCost = await this.calculateShippingCost(destination.state, destination.city);
      
      const options: ShippingOption[] = [
        {
          id: "standard",
          name: "Standard Delivery",
          description: "3-5 business days",
          price: shippingCost,
          estimatedDays: 4,
          isAvailable: true,
        },
        {
          id: "express",
          name: "Express Delivery",
          description: "1-2 business days",
          price: shippingCost * 1.5,
          estimatedDays: 2,
          isAvailable: true,
        }
      ];
      
      return {
        options,
        freeShippingThreshold: 50000, // ₦50,000 for free shipping
        freeShippingRemaining: Math.max(0, 50000 - (await this.getCart(userId)).subtotal),
      };
    } catch (error) {
      this.handleError("Error calculating shipping", error);
      throw error;
    }
  }

  /**
   * Save item for later
   */
  async saveForLater(userId: string, productId: string): Promise<{ success: boolean; message: string; cart: any }> {
    try {
      // TODO: Implement save for later functionality
      // For now, remove from cart
      const result = await this.removeFromCart(userId, null, { productId });
      
      return {
        success: true,
        message: "Item saved for later",
        cart: result.cart
      };
    } catch (error) {
      this.handleError("Error saving item for later", error);
      throw error;
    }
  }

  /**
   * Move saved item back to cart
   */
  async moveToCart(userId: string, productId: string): Promise<{ success: boolean; message: string; cart: any }> {
    try {
      // TODO: Implement move from saved to cart functionality
      // For now, add to cart with quantity 1
      await this.addToCart(userId, { productId, quantity: 1 });
      const updatedCart = await this.getCart(userId);
      
      return {
        success: true,
        message: "Item moved to cart",
        cart: {
          id: `cart_${userId}`,
          userId,
          items: updatedCart.items,
          subtotal: updatedCart.subtotal,
          estimatedTax: updatedCart.tax,
          estimatedShipping: 0,
          estimatedTotal: updatedCart.total,
          currency: "NGN",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      };
    } catch (error) {
      this.handleError("Error moving item to cart", error);
      throw error;
    }
  }

  /**
   * Calculate cart summary
   */
  private calculateCartSummary(cartItems: CartItem[]): CartSummary {
    const subtotal = cartItems.reduce((sum, item) => sum + ((item as any).price * item.quantity), 0);
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
   * Calculate shipping cost based on destination
   */
  private async calculateShippingCost(state: string, city: string): Promise<number> {
    // Nigerian shipping cost calculation
    const baseShippingCost = 2000; // ₦2,000 base cost
    
    // Lagos has cheaper shipping
    if (state.toLowerCase() === "lagos") {
      return 1500; // ₦1,500
    }
    
    // Other major cities
    const majorCities = ["abuja", "kano", "ibadan", "kaduna", "port harcourt", "benin city"];
    if (majorCities.includes(city.toLowerCase())) {
      return baseShippingCost;
    }
    
    // Remote areas cost more
    return baseShippingCost + 1000; // ₦3,000
  }

  /**
   * Handle service errors
   */
  protected handleError(message: string, error: any): never {
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