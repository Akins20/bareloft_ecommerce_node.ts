import { BaseService } from "../BaseService";
import { UserRepository } from "../../repositories/UserRepository";
import { ProductRepository } from "../../repositories/ProductRepository";
import { CartService } from "../cart/CartService";
import { prisma } from "../../database/connection";
import {
  Product,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
} from "../../types";
import {
  WishlistItem,
  AddToWishlistRequest,
  WishlistResponse,
  WishlistOperationResult,
  WishlistClearResult,
  MoveToCartItem,
  MoveToCartResult,
  WishlistSummary,
  ShareableWishlistResult,
} from "../../types/user.types";
import { PaginationParams } from "../../types/api.types";

export class WishlistService extends BaseService {
  private userRepository: UserRepository;
  private productRepository: ProductRepository;
  private cartService: CartService;

  constructor(userRepository?: UserRepository, productRepository?: ProductRepository, cartService?: CartService) {
    super();
    this.userRepository = userRepository || new UserRepository(prisma);
    this.productRepository = productRepository || new ProductRepository(prisma);
    this.cartService = cartService || new CartService();
  }

  /**
   * Get user's wishlist with pagination and filters
   */
  async getUserWishlist(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      includeOutOfStock?: boolean;
    }
  ): Promise<WishlistResponse> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const includeOutOfStock = options?.includeOutOfStock ?? true;

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Get wishlist items from database
      const [items, total] = await Promise.all([
        prisma.wishlistItem.findMany({
          where: { userId },
          include: {
            product: {
              include: {
                category: true,
                images: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.wishlistItem.count({ where: { userId } }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        items: items as any,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      this.handleError("Error getting user wishlist", error);
      throw error;
    }
  }

  /**
   * Add product to wishlist
   */
  async addToWishlist(userId: string, productId: string): Promise<WishlistOperationResult> {
    try {
      // Validate product exists
      const product = await this.productRepository.findById(productId);
      if (!product) {
        return {
          success: false,
          message: "Product not found",
        };
      }

      // Check if already in wishlist
      const existsInWishlist = await this.isProductInWishlist(userId, productId);
      if (existsInWishlist) {
        return {
          success: false,
          message: "Product is already in your wishlist",
        };
      }

      // Get user info for the wishlist item
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      // Create wishlist item in database
      const wishlistItem = await prisma.wishlistItem.create({
        data: {
          userId,
          productId,
        },
        include: {
          product: {
            include: {
              category: true,
              images: true,
            },
          },
          user: true,
        },
      });

      return {
        success: true,
        message: "Product added to wishlist successfully",
        item: wishlistItem as any,
      };
    } catch (error) {
      this.handleError("Error adding to wishlist", error);
      throw error;
    }
  }

  /**
   * Remove product from wishlist
   */
  async removeFromWishlist(userId: string, productId: string): Promise<WishlistOperationResult> {
    try {
      // Check if product exists in wishlist
      const existsInWishlist = await this.isProductInWishlist(userId, productId);
      if (!existsInWishlist) {
        return {
          success: false,
          message: "Product not found in wishlist",
        };
      }

      // Remove wishlist item from database
      await prisma.wishlistItem.deleteMany({
        where: {
          userId,
          productId,
        },
      });

      return {
        success: true,
        message: "Product removed from wishlist successfully",
      };
    } catch (error) {
      this.handleError("Error removing from wishlist", error);
      throw error;
    }
  }

  /**
   * Clear user's wishlist
   */
  async clearWishlist(userId: string): Promise<WishlistClearResult> {
    try {
      // Delete all wishlist items for the user
      const result = await prisma.wishlistItem.deleteMany({
        where: { userId },
      });

      return {
        itemsRemoved: result.count,
      };
    } catch (error) {
      this.handleError("Error clearing wishlist", error);
      throw error;
    }
  }

  /**
   * Check if product is in user's wishlist
   */
  async isProductInWishlist(userId: string, productId: string): Promise<boolean> {
    try {
      const item = await prisma.wishlistItem.findFirst({
        where: {
          userId,
          productId,
        },
      });
      return !!item;
    } catch (error) {
      this.handleError("Error checking wishlist item", error);
      throw error;
    }
  }

  /**
   * Get wishlist item count
   */
  async getWishlistCount(userId: string): Promise<number> {
    try {
      const count = await prisma.wishlistItem.count({
        where: { userId },
      });
      return count;
    } catch (error) {
      this.handleError("Error getting wishlist count", error);
      throw error;
    }
  }

  /**
   * Move wishlist item to cart
   */
  async moveToCart(
    userId: string,
    productId: string,
    quantity: number = 1,
    removeFromWishlist: boolean = true
  ): Promise<MoveToCartResult> {
    try {
      // Check if product exists in wishlist
      const existsInWishlist = await this.isProductInWishlist(userId, productId);
      if (!existsInWishlist) {
        return {
          success: false,
          message: "Product not found in wishlist",
        };
      }

      // Validate product exists and is available
      const product = await this.productRepository.findById(productId);
      if (!product) {
        return {
          success: false,
          message: "Product not found",
        };
      }

      // Check if product is in stock
      if (product.stock < quantity) {
        return {
          success: false,
          message: "Product is out of stock or insufficient quantity available",
        };
      }

      // Add product to cart
      await this.cartService.addToCart(userId, {
        productId,
        quantity,
      });

      // Optionally remove from wishlist
      if (removeFromWishlist) {
        await this.removeFromWishlist(userId, productId);
      }

      return {
        success: true,
        message: "Product moved to cart successfully",
      };
    } catch (error) {
      this.handleError("Error moving to cart", error);
      throw error;
    }
  }

  /**
   * Move multiple wishlist items to cart
   */
  async moveMultipleToCart(
    userId: string,
    items: MoveToCartItem[],
    removeFromWishlist: boolean = true
  ): Promise<MoveToCartResult> {
    try {
      let successCount = 0;
      let failureCount = 0;
      const failures: { productId: string; reason: string }[] = [];

      for (const item of items) {
        try {
          const result = await this.moveToCart(
            userId,
            item.productId,
            item.quantity || 1,
            removeFromWishlist
          );

          if (result.success) {
            successCount++;
          } else {
            failureCount++;
            failures.push({
              productId: item.productId,
              reason: result.message,
            });
          }
        } catch (error) {
          failureCount++;
          failures.push({
            productId: item.productId,
            reason: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return {
        success: successCount > 0,
        message: `${successCount} item(s) moved to cart successfully`,
        successCount,
        failureCount,
        ...(failures.length > 0 && { failures }),
      };
    } catch (error) {
      this.handleError("Error moving multiple items to cart", error);
      throw error;
    }
  }

  /**
   * Get wishlist summary/analytics
   */
  async getWishlistSummary(userId: string): Promise<WishlistSummary> {
    try {
      // Get all wishlist items with product details
      const items = await prisma.wishlistItem.findMany({
        where: { userId },
        include: {
          product: {
            include: {
              category: true,
              images: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Calculate total value
      const totalValue = items.reduce((sum, item) => {
        const price = typeof item.product.price === 'string'
          ? parseFloat(item.product.price)
          : Number(item.product.price);
        return sum + price;
      }, 0);

      // Count out of stock items
      const outOfStockItems = items.filter(
        item => item.product.stock === 0
      ).length;

      // Group by categories
      const categoryMap = new Map<string, { name: string; count: number }>();
      items.forEach(item => {
        if (item.product.category) {
          const categoryId = item.product.category.id;
          const existing = categoryMap.get(categoryId);
          if (existing) {
            existing.count++;
          } else {
            categoryMap.set(categoryId, {
              name: item.product.category.name,
              count: 1,
            });
          }
        }
      });

      const categories = Array.from(categoryMap.values());

      // Get recently added items (last 5)
      const recentlyAdded: any[] = items.slice(0, 5).map(item => ({
        productId: item.productId,
        productName: item.product.name,
        addedAt: item.createdAt,
      }));

      return {
        totalItems: items.length,
        totalValue,
        categories,
        outOfStockItems,
        recentlyAdded,
      };
    } catch (error) {
      this.handleError("Error getting wishlist summary", error);
      throw error;
    }
  }

  /**
   * Generate shareable wishlist link
   */
  async generateShareableLink(
    userId: string,
    isPublic: boolean = true,
    expiresInDays: number = 30
  ): Promise<ShareableWishlistResult> {
    try {
      // Generate unique share token
      const shareToken = `share_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      // Placeholder implementation - would normally save to database
      console.log(`Generating shareable link for user ${userId}`);

      return {
        shareToken,
        shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/shared-wishlist/${shareToken}`,
        expiresAt,
        isPublic,
      };
    } catch (error) {
      this.handleError("Error generating shareable link", error);
      throw error;
    }
  }

  /**
   * Get shared wishlist by token
   */
  async getSharedWishlist(
    shareToken: string,
    options?: { page?: number; limit?: number }
  ): Promise<WishlistResponse | null> {
    try {
      // Placeholder implementation - would normally validate token and fetch from database
      console.log(`Getting shared wishlist with token ${shareToken}`);
      
      // For now, return empty structure or null if not found/expired
      const page = options?.page || 1;
      const limit = options?.limit || 20;

      return {
        items: [],
        pagination: {
          currentPage: page,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: limit,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    } catch (error) {
      this.handleError("Error getting shared wishlist", error);
      throw error;
    }
  }

  /**
   * Get products back in stock from wishlist
   */
  async getBackInStockItems(userId: string): Promise<WishlistItem[]> {
    try {
      // Placeholder implementation - would normally check inventory status
      console.log(`Getting back in stock items for user ${userId}`);
      
      return [];
    } catch (error) {
      this.handleError("Error getting back in stock items", error);
      throw error;
    }
  }

}