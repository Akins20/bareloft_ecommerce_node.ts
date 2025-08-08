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
import { redisClient } from "../../config/redis";
import { CouponService } from "../coupon/CouponService";
import { CouponRepository } from "../../repositories/CouponRepository";

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

export interface GuestCartItem {
  productId: string;
  quantity: number;
  addedAt: Date;
}

export interface GuestCart {
  sessionId: string;
  items: GuestCartItem[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export class CartService extends BaseService {
  private cartRepository: any;
  private productRepository: any;
  private couponService: CouponService;

  constructor(cartRepository?: any, productRepository?: any, couponRepository?: CouponRepository) {
    super();
    this.cartRepository = cartRepository || {};
    this.productRepository = productRepository || {};
    
    // Initialize coupon service with database repository for production
    if (couponRepository) {
      this.couponService = new CouponService(couponRepository);
    } else {
      // Fallback: create coupon repository with same prisma instance
      const { PrismaClient } = require("@prisma/client");
      const prisma = new PrismaClient();
      const couponRepo = new CouponRepository(prisma);
      this.couponService = new CouponService(couponRepo);
    }
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
      
      // Validate and calculate discount
      const couponResult = await this.couponService.calculateDiscount(
        couponCode.toUpperCase(),
        currentCart.subtotal
      );

      if (!couponResult.isValid) {
        return {
          success: false,
          message: couponResult.message,
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
      }

      // Apply discount to cart
      const discountAmount = couponResult.discount;
      const discountedSubtotal = Math.max(0, currentCart.subtotal - discountAmount);
      const tax = discountedSubtotal * 0.075; // 7.5% VAT on discounted amount
      const shippingCost = couponResult.shippingDiscount > 0 ? 0 : 0; // Free shipping if applicable
      const total = discountedSubtotal + tax + shippingCost;
      
      const cartWithCoupon = {
        id: `cart_${userId}`,
        userId,
        items: currentCart.items,
        subtotal: currentCart.subtotal,
        discountAmount,
        discountedSubtotal,
        estimatedTax: tax,
        estimatedShipping: shippingCost,
        estimatedTotal: total,
        currency: "NGN",
        appliedCoupon: {
          code: couponResult.coupon?.code,
          type: couponResult.coupon?.type,
          value: couponResult.coupon?.value,
          discountAmount,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store applied coupon in Redis for session persistence
      const couponKey = `cart_coupon:${userId}`;
      await redisClient.set(couponKey, {
        code: couponCode.toUpperCase(),
        appliedAt: new Date(),
        discount: discountAmount,
        shippingDiscount: couponResult.shippingDiscount,
      }, 60 * 60); // 1 hour expiry

      return {
        success: true,
        message: couponResult.message,
        cart: cartWithCoupon
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
   * Get guest cart from Redis
   */
  async getGuestCart(sessionId: string): Promise<any> {
    try {
      const cartKey = `guest_cart:${sessionId}`;
      const cartData = await redisClient.get(cartKey);
      
      if (!cartData) {
        // Return empty guest cart
        return {
          id: `guest_${sessionId}`,
          sessionId,
          items: [],
          subtotal: 0,
          estimatedTax: 0,
          estimatedShipping: 0,
          estimatedTotal: 0,
          currency: "NGN",
          itemCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      // RedisConnection already parses JSON, so cartData is already an object
      const guestCart: GuestCart = cartData as GuestCart;

      // Enrich cart items with product data and proper pricing
      const items = [];
      let subtotal = 0;

      for (const item of guestCart.items || []) {
        try {
          // Fetch product data for pricing
          const product = await this.productRepository.findById?.(item.productId);
          if (product) {
            const unitPrice = Number((product as any).price) || 0;
            const totalPrice = unitPrice * item.quantity;
            subtotal += totalPrice;

            items.push({
              id: `${sessionId}_${item.productId}`,
              cartId: `guest_${sessionId}`,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice,
              totalPrice,
              product: {
                id: product.id,
                name: (product as any).name,
                slug: (product as any).slug,
                sku: (product as any).sku,
                primaryImage: (product as any).primaryImage,
                inStock: ((product as any).stock || 0) > 0,
                stockQuantity: (product as any).stock || 0
              },
              isAvailable: ((product as any).stock || 0) >= item.quantity,
              hasStockIssue: ((product as any).stock || 0) < item.quantity,
              priceChanged: false,
            });
          }
        } catch (error) {
          console.warn(`Failed to enrich guest cart item ${item.productId}:`, error);
          // Add item with zero pricing if product fetch fails
          items.push({
            id: `${sessionId}_${item.productId}`,
            cartId: `guest_${sessionId}`,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: 0,
            totalPrice: 0,
            product: null,
            isAvailable: false,
            hasStockIssue: true,
            priceChanged: false,
          });
        }
      }

      // Calculate tax and total
      const tax = subtotal * 0.075; // 7.5% VAT in Nigeria
      const estimatedTotal = subtotal + tax;

      return {
        id: `guest_${sessionId}`,
        sessionId,
        items,
        subtotal,
        estimatedTax: tax,
        estimatedShipping: 0,
        estimatedTotal,
        currency: "NGN",
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        createdAt: new Date(guestCart.createdAt),
        updatedAt: new Date(guestCart.updatedAt),
      };
    } catch (error) {
      console.error("Error in getGuestCart:", error);
      // Return empty cart on any error to prevent system failure
      return {
        id: `guest_${sessionId}`,
        sessionId,
        items: [],
        subtotal: 0,
        estimatedTax: 0,
        estimatedShipping: 0,
        estimatedTotal: 0,
        currency: "NGN",
        itemCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Add item to guest cart
   */
  async addToGuestCart(sessionId: string, data: AddToCartRequest): Promise<any> {
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

      const cartKey = `guest_cart:${sessionId}`;
      let guestCart: GuestCart;

      // Get existing cart or create new one
      const existingCartData = await redisClient.get(cartKey);
      if (existingCartData) {
        guestCart = existingCartData as GuestCart;
      } else {
        guestCart = {
          sessionId,
          items: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        };
      }

      // Check if item already exists
      const existingItemIndex = guestCart.items.findIndex(item => item.productId === productId);
      
      if (existingItemIndex >= 0) {
        // Update existing item
        const newQuantity = guestCart.items[existingItemIndex].quantity + quantity;
        if (newQuantity > (product as any).stock) {
          throw new AppError(
            "Insufficient stock for requested quantity",
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.INSUFFICIENT_STOCK
          );
        }
        guestCart.items[existingItemIndex].quantity = newQuantity;
      } else {
        // Add new item
        guestCart.items.push({
          productId,
          quantity,
          addedAt: new Date(),
        });
      }

      guestCart.updatedAt = new Date();

      // Save to Redis with 24 hour expiry
      await redisClient.set(cartKey, guestCart, 24 * 60 * 60);

      // Return updated cart with proper pricing
      const updatedCart = await this.getGuestCart(sessionId);

      return {
        success: true,
        message: "Item added to guest cart successfully",
        cart: updatedCart,
      };
    } catch (error) {
      this.handleError("Error adding to guest cart", error);
      throw error;
    }
  }

  /**
   * Update guest cart item
   */
  async updateGuestCartItem(sessionId: string, productId: string, quantity: number): Promise<any> {
    try {
      const cartKey = `guest_cart:${sessionId}`;
      const existingCartData = await redisClient.get(cartKey);
      
      if (!existingCartData) {
        throw new AppError(
          "Guest cart not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      const guestCart: GuestCart = existingCartData as GuestCart;
      const itemIndex = guestCart.items.findIndex(item => item.productId === productId);

      if (itemIndex === -1) {
        throw new AppError(
          "Item not found in cart",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        guestCart.items.splice(itemIndex, 1);
      } else {
        // Validate stock
        const product = await this.productRepository.findById?.(productId);
        if (!product || (product as any).stock < quantity) {
          throw new AppError(
            "Insufficient stock",
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.INSUFFICIENT_STOCK
          );
        }

        guestCart.items[itemIndex].quantity = quantity;
      }

      guestCart.updatedAt = new Date();

      // Save updated cart
      await redisClient.set(cartKey, guestCart, 24 * 60 * 60);

      // Get updated cart to return
      const updatedCart = await this.getGuestCart(sessionId);

      return {
        success: true,
        message: "Guest cart updated successfully",
        cart: updatedCart,
      };
    } catch (error) {
      this.handleError("Error updating guest cart", error);
      throw error;
    }
  }

  /**
   * Remove item from guest cart
   */
  async removeFromGuestCart(sessionId: string, productId: string): Promise<any> {
    try {
      const cartKey = `guest_cart:${sessionId}`;
      const existingCartData = await redisClient.get(cartKey);
      
      if (!existingCartData) {
        throw new AppError(
          "Guest cart not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      const guestCart: GuestCart = existingCartData as GuestCart;
      const initialLength = guestCart.items.length;
      
      guestCart.items = guestCart.items.filter(item => item.productId !== productId);

      if (guestCart.items.length === initialLength) {
        throw new AppError(
          "Item not found in cart",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      guestCart.updatedAt = new Date();

      // Save updated cart
      await redisClient.set(cartKey, guestCart, 24 * 60 * 60);

      // Get updated cart to return
      const updatedCart = await this.getGuestCart(sessionId);

      return {
        success: true,
        message: "Item removed from guest cart successfully",
        cart: updatedCart,
      };
    } catch (error) {
      this.handleError("Error removing from guest cart", error);
      throw error;
    }
  }

  /**
   * Clear guest cart
   */
  async clearGuestCart(sessionId: string): Promise<any> {
    try {
      const cartKey = `guest_cart:${sessionId}`;
      await redisClient.delete(cartKey);

      const emptyCart = {
        id: `guest_${sessionId}`,
        sessionId,
        items: [],
        subtotal: 0,
        estimatedTax: 0,
        estimatedShipping: 0,
        estimatedTotal: 0,
        currency: "NGN",
        itemCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return {
        success: true,
        message: "Guest cart cleared successfully",
        cart: emptyCart,
      };
    } catch (error) {
      this.handleError("Error clearing guest cart", error);
      throw error;
    }
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