import { PrismaClient } from "@prisma/client";
import { BaseRepository } from "./BaseRepository";
import { randomUUID } from "crypto";
import {
  Cart,
  CartItem,
  AddToCartRequest,
  UpdateCartItemRequest,
  CartResponse,
  CartActionResponse,
  CartValidationResult,
  CartIssue,
  PaginationParams,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
  CONSTANTS,
} from "../types";
import { ProductImage } from "@prisma/client";

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
  items: Array<
    CartItem & {
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
    }
  >;
  itemCount: number;
  hasOutOfStockItems: boolean;
  hasPriceChanges: boolean;
  isValid: boolean;
}

export class CartRepository extends BaseRepository<
  CartItem,
  CreateCartItemData,
  UpdateCartItemData
> {
  constructor(prisma?: PrismaClient) {
    super(prisma || new PrismaClient(), "cartItem");
  }

  /**
   * Find cart items by user ID
   */
  async findByUserId(userId: string): Promise<any[]> {
    try {
      const items = await this.prisma.cartItem.findMany({
        where: { userId },
        include: {
          product: {
            include: {
              images: {
                orderBy: { position: "asc" },
                take: 1,
              },
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return items.map((item) => ({
        ...item,
        cartId: `user_${userId}`,
        unitPrice: Number(item.price),
        totalPrice: Number(item.price) * item.quantity,
        isAvailable: item.product.isActive && item.product.stock > 0,
        hasStockIssue: item.product.stock < item.quantity,
        priceChanged: false, // Would need price history to determine this
      }));
    } catch (error) {
      this.handleError("Error finding cart items by user ID", error);
      throw error;
    }
  }

  /**
   * Find cart item by user and product
   */
  async findByUserAndProduct(userId: string, productId: string): Promise<any | null> {
    try {
      const item = await this.prisma.cartItem.findUnique({
        where: {
          productId_userId: {
            productId,
            userId,
          },
        },
        include: {
          product: true,
        },
      });

      if (!item) return null;

      return {
        ...item,
        cartId: `user_${userId}`,
        unitPrice: Number(item.price),
        totalPrice: Number(item.price) * item.quantity,
        isAvailable: item.product.isActive && item.product.stock > 0,
        hasStockIssue: item.product.stock < item.quantity,
        priceChanged: false,
      };
    } catch (error) {
      this.handleError("Error finding cart item by user and product", error);
      throw error;
    }
  }

  /**
   * Find cart item by ID and user
   */
  async findByIdAndUser(itemId: string, userId: string): Promise<any | null> {
    try {
      const item = await this.prisma.cartItem.findFirst({
        where: {
          id: itemId,
          userId,
        },
        include: {
          product: true,
        },
      });

      if (!item) return null;

      return {
        ...item,
        cartId: `user_${userId}`,
        unitPrice: Number(item.price),
        totalPrice: Number(item.price) * item.quantity,
        isAvailable: item.product.isActive && item.product.stock > 0,
        hasStockIssue: item.product.stock < item.quantity,
        priceChanged: false,
      };
    } catch (error) {
      this.handleError("Error finding cart item by ID and user", error);
      throw error;
    }
  }

  /**
   * Update cart item quantity
   */
  async updateQuantity(itemId: string, quantity: number): Promise<any> {
    try {
      const item = await this.prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity },
        include: {
          product: true,
        },
      });

      return {
        ...item,
        cartId: `user_${item.userId}`,
        unitPrice: Number(item.price),
        totalPrice: Number(item.price) * item.quantity,
        isAvailable: item.product.isActive && item.product.stock > 0,
        hasStockIssue: item.product.stock < item.quantity,
        priceChanged: false,
      };
    } catch (error) {
      this.handleError("Error updating cart item quantity", error);
      throw error;
    }
  }

  /**
   * Delete cart items by user ID
   */
  async deleteByUserId(userId: string): Promise<void> {
    try {
      await this.prisma.cartItem.deleteMany({
        where: { userId },
      });
    } catch (error) {
      this.handleError("Error deleting cart items by user ID", error);
      throw error;
    }
  }

  /**
   * Get cart for user (virtual cart from cart items)
   */
  async getOrCreateUserCart(userId: string): Promise<CartWithDetails> {
    try {
      const items = await this.prisma.cartItem.findMany({
        where: { userId },
        include: {
          product: {
            include: {
              images: {
                orderBy: { position: "asc" },
                take: 1,
              },
            },
          },
        },
      });

      // Create virtual cart from cart items
      const virtualCart = {
        id: `user_${userId}`,
        userId,
        items: items.map((item) => ({
          ...item,
          cartId: `user_${userId}`,
          unitPrice: Number(item.price),
          totalPrice: Number(item.price) * item.quantity,
          product: {
            id: item.product.id,
            name: item.product.name,
            slug: item.product.slug,
            sku: item.product.sku || '',
            price: Number(item.product.price),
            comparePrice: item.product.comparePrice ? Number(item.product.comparePrice) : undefined,
            primaryImage: item.product.images?.[0]?.url || null,
            inStock: item.product.stock > 0,
            stockQuantity: item.product.stock,
            weight: item.product.weight ? Number(item.product.weight) : undefined,
          },
          isAvailable: item.product.isActive && item.product.stock > 0,
          hasStockIssue: item.product.stock < item.quantity,
          priceChanged: false,
        })),
        currency: "NGN",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return this.transformCartWithDetails(virtualCart);
    } catch (error) {
      this.handleError("Error getting user cart", error);
      throw error;
    }
  }

  /**
   * Get guest cart (returns empty cart since guests need authentication)
   */
  async getOrCreateGuestCart(sessionId: string): Promise<CartWithDetails> {
    try {
      // For guests, return empty cart since CartItem requires userId
      // Guest cart functionality would need to be stored in session/localStorage
      const virtualCart = {
        id: `guest_${sessionId}`,
        sessionId,
        items: [],
        currency: "NGN",
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + (CONSTANTS.CART_EXPIRY_DAYS || 7) * 24 * 60 * 60 * 1000),
      };

      return this.transformCartWithDetails(virtualCart);
    } catch (error) {
      this.handleError("Error getting guest cart", error);
      throw error;
    }
  }

  /**
   * Add item to cart for user
   */
  async addItemToCart(
    userId: string,
    productId: string,
    quantity: number
  ): Promise<CartWithDetails> {
    try {
      return await this.transaction(async (prisma) => {
        // Get product details
        const product = await prisma.product.findUnique({
          where: { id: productId, isActive: true },
        });

        if (!product) {
          throw new AppError(
            "Product not found or inactive",
            HTTP_STATUS.NOT_FOUND,
            ERROR_CODES.RESOURCE_NOT_FOUND
          );
        }

        // Check stock availability
        const availableStock = product.stock;
        if (availableStock < quantity) {
          throw new AppError(
            "Insufficient stock available",
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.INSUFFICIENT_STOCK
          );
        }

        // Validate quantity limits
        if (quantity > (CONSTANTS.CART_ITEM_MAX_QUANTITY || 99)) {
          throw new AppError(
            `Maximum quantity per item is ${CONSTANTS.CART_ITEM_MAX_QUANTITY || 99}`,
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR
          );
        }

        // Check if item already exists in cart
        const existingItem = await prisma.cartItem.findFirst({
          where: {
            productId,
            userId,
          },
        });

        if (existingItem) {
          // Update existing item quantity
          const newQuantity = existingItem.quantity + quantity;

          if (newQuantity > (CONSTANTS.CART_ITEM_MAX_QUANTITY || 99)) {
            throw new AppError(
              `Maximum quantity per item is ${CONSTANTS.CART_ITEM_MAX_QUANTITY || 99}`,
              HTTP_STATUS.BAD_REQUEST,
              ERROR_CODES.VALIDATION_ERROR
            );
          }

          if (availableStock < newQuantity) {
            throw new AppError(
              "Insufficient stock for requested quantity",
              HTTP_STATUS.BAD_REQUEST,
              ERROR_CODES.INSUFFICIENT_STOCK
            );
          }

          await prisma.cartItem.update({
            where: { id: existingItem.id },
            data: {
              quantity: newQuantity,
              price: product.price,
            },
          });
        } else {
          // Create new cart item
          await prisma.cartItem.create({
            data: {
              productId,
              userId,
              quantity,
              price: product.price,
            },
          });
        }

        // Return updated cart
        return await this.getOrCreateUserCart(userId);
      });
    } catch (error) {
      this.handleError("Error adding item to cart", error);
      throw error;
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(
    userId: string,
    productId: string,
    quantity: number
  ): Promise<CartWithDetails> {
    try {
      return await this.transaction(async (prisma) => {
        // Find the cart item
        const cartItem = await prisma.cartItem.findFirst({
          where: {
            productId,
            userId,
          },
          include: {
            product: true,
          },
        });

        if (!cartItem) {
          throw new AppError(
            "Cart item not found",
            HTTP_STATUS.NOT_FOUND,
            ERROR_CODES.RESOURCE_NOT_FOUND
          );
        }

        // Validate quantity
        if (quantity <= 0) {
          // Remove item if quantity is 0 or negative
          await prisma.cartItem.delete({
            where: { id: cartItem.id },
          });
        } else {
          // Validate quantity limits
          if (quantity > (CONSTANTS.CART_ITEM_MAX_QUANTITY || 99)) {
            throw new AppError(
              `Maximum quantity per item is ${CONSTANTS.CART_ITEM_MAX_QUANTITY || 99}`,
              HTTP_STATUS.BAD_REQUEST,
              ERROR_CODES.VALIDATION_ERROR
            );
          }

          // Check stock availability
          const availableStock = cartItem.product.stock;

          if (availableStock < quantity) {
            throw new AppError(
              "Insufficient stock for requested quantity",
              HTTP_STATUS.BAD_REQUEST,
              ERROR_CODES.INSUFFICIENT_STOCK
            );
          }

          // Update item
          await prisma.cartItem.update({
            where: { id: cartItem.id },
            data: {
              quantity,
              price: cartItem.product.price,
            },
          });
        }

        // Return updated cart
        return await this.getOrCreateUserCart(userId);
      });
    } catch (error) {
      this.handleError("Error updating cart item", error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeItemFromCart(
    userId: string,
    productId: string
  ): Promise<CartWithDetails> {
    try {
      return await this.transaction(async (prisma) => {
        // Delete the cart item
        await prisma.cartItem.deleteMany({
          where: {
            userId,
            productId,
          },
        });

        // Return updated cart
        return await this.getOrCreateUserCart(userId);
      });
    } catch (error) {
      this.handleError("Error removing item from cart", error);
      throw error;
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart(userId: string): Promise<CartWithDetails> {
    try {
      return await this.transaction(async (prisma) => {
        // Delete all cart items for user
        await prisma.cartItem.deleteMany({
          where: { userId },
        });

        // Return empty cart
        return await this.getOrCreateUserCart(userId);
      });
    } catch (error) {
      this.handleError("Error clearing cart", error);
      throw error;
    }
  }

  /**
   * Validate cart before checkout
   */
  async validateCart(userId: string): Promise<CartValidationResult> {
    try {
      const cart = await this.getOrCreateUserCart(userId);

      const issues: CartIssue[] = [];
      let isValid = true;

      for (const item of cart.items) {
        const product = item.product;

        // Check if product is still active
        if (!product.inStock || product.stockQuantity <= 0) {
          issues.push({
            type: "out_of_stock",
            productId: product.id,
            productName: product.name,
            message: `${product.name} is out of stock`,
            severity: "error",
            action: "remove",
          });
          isValid = false;
          continue;
        }

        // Check stock availability
        const availableStock = product.stockQuantity;
        if (availableStock < item.quantity) {
          issues.push({
            type: "quantity_limit",
            productId: product.id,
            productName: product.name,
            message: `Only ${availableStock} units of ${product.name} are available`,
            severity: "warning",
            action: "reduce_quantity",
          });
          isValid = false;
        }

        // Check price changes
        const currentPrice = product.price;
        if (currentPrice !== item.unitPrice) {
          issues.push({
            type: "price_change",
            productId: product.id,
            productName: product.name,
            message: `Price of ${product.name} has changed from ₦${item.unitPrice} to ₦${currentPrice}`,
            severity: "warning",
            action: "update_price",
          });
          // Price changes don't make cart invalid, just notify user
        }
      }

      return {
        isValid,
        issues,
        cart,
      };
    } catch (error) {
      this.handleError("Error validating cart", error);
      throw error;
    }
  }

  /**
   * Merge guest cart with user cart (since guest carts are session-based)
   */
  async mergeGuestCartToUser(
    guestCartItems: Array<{ productId: string; quantity: number }>,
    userId: string,
    strategy: "replace" | "merge" | "keep_authenticated" = "merge"
  ): Promise<CartWithDetails> {
    try {
      if (!guestCartItems || guestCartItems.length === 0) {
        return await this.getOrCreateUserCart(userId);
      }

      return await this.transaction(async (prisma) => {
        switch (strategy) {
          case "replace":
            // Clear existing user cart and add guest items
            await prisma.cartItem.deleteMany({
              where: { userId },
            });
            
            for (const guestItem of guestCartItems) {
              const product = await prisma.product.findUnique({
                where: { id: guestItem.productId, isActive: true },
              });
              
              if (product && product.stock >= guestItem.quantity) {
                await prisma.cartItem.create({
                  data: {
                    userId,
                    productId: guestItem.productId,
                    quantity: guestItem.quantity,
                    price: product.price,
                  },
                });
              }
            }
            break;

          case "merge":
            // Merge guest items with existing user cart
            for (const guestItem of guestCartItems) {
              const existingItem = await prisma.cartItem.findFirst({
                where: {
                  productId: guestItem.productId,
                  userId,
                },
              });

              const product = await prisma.product.findUnique({
                where: { id: guestItem.productId, isActive: true },
              });

              if (!product) continue;

              if (existingItem) {
                const newQuantity = Math.min(
                  existingItem.quantity + guestItem.quantity,
                  CONSTANTS.CART_ITEM_MAX_QUANTITY || 99
                );

                if (product.stock >= newQuantity) {
                  await prisma.cartItem.update({
                    where: { id: existingItem.id },
                    data: {
                      quantity: newQuantity,
                      price: product.price,
                    },
                  });
                }
              } else {
                if (product.stock >= guestItem.quantity) {
                  await prisma.cartItem.create({
                    data: {
                      userId,
                      productId: guestItem.productId,
                      quantity: guestItem.quantity,
                      price: product.price,
                    },
                  });
                }
              }
            }
            break;

          case "keep_authenticated":
            // Keep existing user cart, ignore guest items
            break;
        }

        return await this.getOrCreateUserCart(userId);
      });
    } catch (error) {
      this.handleError("Error merging guest cart to user", error);
      throw error;
    }
  }

  /**
   * Apply coupon to cart (virtual calculation since no cart table)
   */
  async applyCoupon(
    userId: string,
    couponCode: string
  ): Promise<{ cart: CartWithDetails; discountAmount: number }> {
    try {
      // Note: Coupon table doesn't exist in the schema, so this is a placeholder implementation
      // In a real implementation, you would have a coupon table
      throw new AppError(
        "Coupon functionality not implemented",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
      
      /* Placeholder for when coupon table exists:
      const coupon = await this.prisma.coupon.findFirst({
        where: {
          code: couponCode,
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });

      if (!coupon) {
        throw new AppError(
          "Invalid or expired coupon",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_COUPON
        );
      }

      // Get user cart
      const cart = await this.getOrCreateUserCart(userId);
      
      // Calculate discount
      let discountAmount = 0;
      const subtotal = cart.subtotal;
      
      if (coupon.type === "PERCENTAGE") {
        discountAmount = subtotal * (Number(coupon.value) / 100);
      } else if (coupon.type === "FIXED_AMOUNT") {
        discountAmount = Math.min(Number(coupon.value), subtotal);
      }

      // Apply coupon to virtual cart
      const cartWithCoupon = {
        ...cart,
        appliedCoupon: {
          code: coupon.code,
          discountAmount,
          discountType: coupon.type === "PERCENTAGE" ? "percentage" as const : "fixed" as const,
        },
        estimatedTotal: Math.max(0, cart.estimatedTotal - discountAmount),
      };

      return {
        cart: cartWithCoupon,
        discountAmount,
      };
      */
    } catch (error) {
      this.handleError("Error applying coupon to cart", error);
      throw error;
    }
  }

  /**
   * Get abandoned carts for marketing (based on cart items)
   */
  async getAbandonedCarts(
    abandonedAfterHours: number = 24,
    limit: number = 100
  ): Promise<
    Array<
      CartWithDetails & {
        abandonedAt: Date;
        customerEmail?: string;
        customerPhone?: string;
      }
    >
  > {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - abandonedAfterHours);

      // Find users with cart items that haven't been updated recently
      const abandonedUserIds = await this.prisma.cartItem.findMany({
        where: {
          updatedAt: { lt: cutoffTime },
        },
        select: {
          userId: true,
          updatedAt: true,
        },
        distinct: ['userId'],
        take: limit,
      });

      const abandonedCarts = [];
      
      for (const item of abandonedUserIds) {
        const user = await this.prisma.user.findUnique({
          where: { id: item.userId },
          select: {
            email: true,
            phoneNumber: true,
            firstName: true,
            lastName: true,
          },
        });
        
        const cart = await this.getOrCreateUserCart(item.userId);
        
        if (cart.items.length > 0) {
          abandonedCarts.push({
            ...cart,
            abandonedAt: item.updatedAt,
            customerEmail: user?.email,
            customerPhone: user?.phoneNumber,
          });
        }
      }

      return abandonedCarts;
    } catch (error) {
      this.handleError("Error getting abandoned carts", error);
      throw error;
    }
  }

  /**
   * Clean up old cart items (since no guest carts in database)
   */
  async cleanupExpiredCarts(): Promise<{ deletedCount: number }> {
    try {
      // Clean up cart items older than a certain period (e.g., 30 days)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      const result = await this.prisma.cartItem.deleteMany({
        where: {
          updatedAt: { lt: cutoffDate },
        },
      });

      return { deletedCount: result.count };
    } catch (error) {
      this.handleError("Error cleaning up old cart items", error);
      return { deletedCount: 0 };
    }
  }

  // Private helper methods

  private calculateCartTotals(
    items: Array<{ price: any; quantity: number }>,
    appliedCoupon?: {
      code: string;
      discountAmount: number;
      discountType: "percentage" | "fixed";
    }
  ): {
    subtotal: number;
    estimatedTax: number;
    estimatedShipping: number;
    estimatedTotal: number;
  } {
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0
    );

    // Calculate tax (5% VAT for Nigeria)
    const estimatedTax = subtotal * 0.05;

    // Calculate shipping (free over threshold)
    const freeShippingThreshold = CONSTANTS.FREE_SHIPPING_THRESHOLD || 50000;
    const defaultShippingFee = CONSTANTS.DEFAULT_SHIPPING_FEE || 2000;
    const estimatedShipping = subtotal >= freeShippingThreshold ? 0 : defaultShippingFee;

    let discountAmount = 0;
    if (appliedCoupon) {
      discountAmount = appliedCoupon.discountAmount;
    }

    const estimatedTotal = Math.max(
      0,
      subtotal + estimatedTax + estimatedShipping - discountAmount
    );

    return {
      subtotal,
      estimatedTax,
      estimatedShipping,
      estimatedTotal,
    };
  }

  private transformCartWithDetails(cart: any): CartWithDetails {
    const items = cart.items || [];
    const itemCount = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    const hasOutOfStockItems = items.some((item: any) => !item.isAvailable);
    const hasPriceChanges = items.some((item: any) => item.priceChanged);
    const isValid = !hasOutOfStockItems && items.every((item: any) => !item.hasStockIssue);

    // Calculate totals
    const totals = this.calculateCartTotals(items, cart.appliedCoupon);

    return {
      ...cart,
      items,
      itemCount,
      hasOutOfStockItems,
      hasPriceChanges,
      isValid,
      ...totals,
    };
  }
}
