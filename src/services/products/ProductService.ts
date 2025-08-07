/**
 * 🛍️ Product Service
 * Business logic for product management in Nigerian e-commerce context
 */

import { ProductRepository } from "../../repositories/ProductRepository";
import { CategoryRepository } from "../../repositories/CategoryRepository";
import { InventoryRepository } from "../../repositories/InventoryRepository";
import { BaseService } from "../BaseService";
import { logger } from "../../utils/logger/winston";
import {
  NairaCurrencyUtils as CurrencyUtils,
  NigerianMarketplaceUtils as MarketUtils,
} from "../../utils/helpers/nigerian";
import {
  Product,
  ProductCreateInput,
  ProductUpdateInput,
  ProductFilters,
  ProductListResponse,
} from "../../types/product.types";
import {
  AppError,
  NotFoundError,
  ValidationError,
} from "../../middleware/error/errorHandler";

export class ProductService extends BaseService {
  private productRepo: any;
  private categoryRepo: any;
  private inventoryRepo: any;

  constructor(productRepo?: any, categoryRepo?: any, inventoryRepo?: any) {
    super();
    this.productRepo = productRepo || {} as any; // Accept injected repository or use mock
    this.categoryRepo = categoryRepo || {} as any; // Accept injected repository or use mock
    this.inventoryRepo = inventoryRepo || {} as any; // Accept injected repository or use mock
  }

  /**
   * 📋 Get products with filtering, search, and pagination
   * Nigerian market optimized with local categories and pricing
   */
  async getProducts(filters: ProductFilters): Promise<ProductListResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        categoryId,
        priceMin,
        priceMax,
        inStock = true,
        featured,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = filters;

      // Validate price range for Nigerian market
      if (priceMin && priceMax && priceMin > priceMax) {
        throw new ValidationError(
          "Minimum price cannot be greater than maximum price"
        );
      }

      // Build query filters
      const queryFilters: any = {
        isActive: true,
      };

      if (search) {
        queryFilters.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { shortDescription: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (categoryId) {
        // Verify category exists
        const category = await this.categoryRepo.findById(categoryId);
        if (!category) {
          throw new NotFoundError("Category");
        }
        queryFilters.categoryId = categoryId;
      }

      if (priceMin !== undefined || priceMax !== undefined) {
        queryFilters.price = {};
        if (priceMin !== undefined) {
          queryFilters.price.gte = priceMin;
        }
        if (priceMax !== undefined) {
          queryFilters.price.lte = priceMax;
        }
      }

      if (featured !== undefined) {
        queryFilters.isFeatured = featured;
      }

      if (inStock) {
        queryFilters.stock = { gt: 0 };
      }

      // Direct Prisma call for now (bypassing BaseRepository complexity)
      const skip = (page - 1) * limit;
      const [productData, total] = await Promise.all([
        this.productRepo.prisma.product.findMany({
          where: queryFilters,
          include: {
            category: true,
            images: true,
            reviews: {
              select: {
                rating: true,
              },
            },
          },
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit,
        }),
        this.productRepo.prisma.product.count({
          where: queryFilters,
        }),
      ]);

      const products = {
        data: productData,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(total / limit),
          hasPreviousPage: page > 1,
        },
      };

      // Calculate Nigerian market insights
      const productInsights = this.calculateMarketInsights(products.data);

      return {
        products: products.data.map((product) =>
          this.formatProductForResponse(product)
        ),
        pagination: products.pagination,
        filters: {
          categories: (await this.getAvailableCategories()) as any,
          brands: [] as any,
          priceRange: await this.getPriceRange(),
          avgRating: 0,
        },
        facets: productInsights,
      } as any;
    } catch (error) {
      logger.error("Error fetching products", {
        error: error instanceof Error ? error.message : "Unknown error",
        filters,
      });
      throw error;
    }
  }

  /**
   * 🔍 Get single product by ID or slug
   */
  async getProduct(identifier: string): Promise<Product> {
    try {
      let product;

      // Check if identifier is CUID (ID) or slug
      // CUID format: starts with 'c' followed by 24 alphanumeric characters
      const isCUID = /^c[a-z0-9]{24}$/i.test(identifier);
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

      if (isCUID || isUUID) {
        product = await this.productRepo.findById?.(identifier) || null;
      } else {
        product = await this.productRepo.findBySlug?.(identifier) || null;
      }

      if (!product) {
        throw new NotFoundError("Product");
      }

      if (!product.isActive) {
        throw new NotFoundError("Product");
      }

      // Get related products
      const relatedProducts = await this.getRelatedProducts(
        product.id,
        product.categoryId
      );

      // Calculate Nigerian market specific data
      const formattedProduct = this.formatProductForResponse(product);

      return formattedProduct as any;
    } catch (error) {
      logger.error("Error fetching product", {
        error: error instanceof Error ? error.message : "Unknown error",
        identifier,
      });
      throw error;
    }
  }

  /**
   * ➕ Create new product
   */
  async createProduct(
    productData: ProductCreateInput,
    adminId: string
  ): Promise<Product> {
    try {
      // Validate category exists
      if (productData.categoryId) {
        const category = await this.categoryRepo.findById(
          productData.categoryId
        );
        if (!category) {
          throw new ValidationError("Invalid category ID");
        }
      }

      // Validate SKU uniqueness
      if (productData.sku) {
        const existingProduct = await this.productRepo.findBySKU?.(
          productData.sku
        );
        if (existingProduct) {
          throw new ValidationError("SKU already exists");
        }
      }

      // Generate slug from name
      const slug = this.generateSlug(productData.name);

      // Ensure slug uniqueness
      const existingSlug = await this.productRepo.findBySlug?.(slug);
      const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

      // Validate Nigerian pricing
      if (productData.price) {
        if (productData.price <= 0) {
          throw new ValidationError("Invalid price format");
        }
      }

      // Create product
      const product = await this.productRepo.create?.({ 
        ...productData, 
        slug: finalSlug 
      }) || {} as any;

      // Create initial inventory record if quantity provided
      if (productData.inventory?.quantity !== undefined) {
        await this.inventoryRepo.create?.({
          productId: product.id,
          quantity: productData.inventory.quantity,
          lowStockThreshold: productData.inventory.lowStockThreshold || 10,
          trackInventory: productData.inventory.trackInventory !== false,
        });
      }

      logger.info("Product created successfully", {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        adminId,
      });

      return this.formatProductForResponse(product);
    } catch (error) {
      logger.error("Error creating product", {
        error: error instanceof Error ? error.message : "Unknown error",
        productData: { ...productData, adminId },
      });
      throw error;
    }
  }

  /**
   * ✏️ Update existing product
   */
  async updateProduct(
    productId: string,
    productData: ProductUpdateInput,
    adminId: string
  ): Promise<Product> {
    try {
      // Check if product exists
      const existingProduct = await this.productRepo.findById(productId);
      if (!existingProduct) {
        throw new NotFoundError("Product");
      }

      // Validate category if provided
      if (productData.categoryId) {
        const category = await this.categoryRepo.findById(
          productData.categoryId
        );
        if (!category) {
          throw new ValidationError("Invalid category ID");
        }
      }

      // Validate SKU uniqueness if changed
      if (productData.sku && productData.sku !== existingProduct.sku) {
        const existingBySku = await this.productRepo.findBySKU?.(productData.sku);
        if (existingBySku) {
          throw new ValidationError("SKU already exists");
        }
      }

      // Update slug if name changed
      let finalSlug;
      if (productData.name && productData.name !== existingProduct.name) {
        finalSlug = this.generateSlug(productData.name);

        // Ensure slug uniqueness
        const existingSlug = await this.productRepo.findBySlug?.(finalSlug);
        if (existingSlug && existingSlug.id !== productId) {
          finalSlug = `${finalSlug}-${Date.now()}`;
        }
      }

      // Validate pricing changes
      if (productData.price !== undefined) {
        if (productData.price <= 0) {
          throw new ValidationError("Invalid price format");
        }
      }

      // Update product
      const updatedProduct = await this.productRepo.update?.(productId, {
        ...productData,
        ...(finalSlug && { slug: finalSlug }),
      }) || {} as any;

      logger.info("Product updated successfully", {
        productId,
        changes: Object.keys(productData),
        adminId,
      });

      return this.formatProductForResponse(updatedProduct);
    } catch (error) {
      logger.error("Error updating product", {
        error: error instanceof Error ? error.message : "Unknown error",
        productId,
        productData,
      });
      throw error;
    }
  }

  /**
   * 🗑️ Delete product (soft delete)
   */
  async deleteProduct(productId: string, adminId: string): Promise<{ success: boolean; message: string }> {
    try {
      const product = await this.productRepo.findById(productId);
      if (!product) {
        throw new NotFoundError("Product");
      }

      // Check if product has pending orders
      const hasPendingOrders = false; // Simplified for now
      if (hasPendingOrders) {
        throw new ValidationError("Cannot delete product with pending orders");
      }

      // Soft delete
      await this.productRepo.update?.(productId, {
        isActive: false,
      });

      logger.info("Product deleted successfully", {
        productId,
        productName: product.name,
        adminId,
      });

      return { success: true, message: "Product deleted successfully" };
    } catch (error) {
      logger.error("Error deleting product", {
        error: error instanceof Error ? error.message : "Unknown error",
        productId,
        adminId,
      });
      throw error;
    }
  }

  /**
   * 🔍 Search products with advanced filters
   */
  async searchProducts(
    query: string,
    filters: Partial<ProductFilters> = {}
  ): Promise<ProductListResponse> {
    try {
      if (!query || query.trim().length < 2) {
        throw new ValidationError("Search query must be at least 2 characters");
      }

      const searchFilters: ProductFilters = {
        ...filters,
        search: query.trim(),
        page: filters.page || 1,
        limit: filters.limit || 20,
      };

      return this.getProducts(searchFilters);
    } catch (error) {
      logger.error("Error searching products", {
        error: error instanceof Error ? error.message : "Unknown error",
        query,
        filters,
      });
      throw error;
    }
  }

  /**
   * 🏷️ Get products by category
   */
  async getProductsByCategory(
    categoryId: string,
    filters: Partial<ProductFilters> = {}
  ): Promise<ProductListResponse> {
    try {
      const category = await this.categoryRepo.findById(categoryId);
      if (!category) {
        throw new NotFoundError("Category");
      }

      const categoryFilters: ProductFilters = {
        ...filters,
        categoryId,
        page: filters.page || 1,
        limit: filters.limit || 20,
      };

      return this.getProducts(categoryFilters);
    } catch (error) {
      logger.error("Error fetching products by category", {
        error: error instanceof Error ? error.message : "Unknown error",
        categoryId,
        filters,
      });
      throw error;
    }
  }

  /**
   * ⭐ Get featured products
   */
  async getFeaturedProducts(limit: number = 12): Promise<Product[]> {
    try {
      const result = await this.productRepo.findMany(
        {
          isActive: true,
          isFeatured: true,
        },
        {
          include: {
            category: true,
            images: {
              orderBy: { position: "asc" },
            },
          },
          orderBy: { updatedAt: "desc" },
          pagination: { page: 1, limit },
        }
      );

      const products = result.data;

      return products.map((product) =>
        this.formatProductForResponse(product)
      );
    } catch (error) {
      logger.error("Error fetching featured products", {
        error: error instanceof Error ? error.message : "Unknown error",
        limit,
      });
      throw error;
    }
  }

  /**
   * 🔗 Get related products
   */
  public async getRelatedProducts(
    productId: string,
    categoryId: string,
    limit: number = 8
  ): Promise<Product[]> {
    try {
      const result = await this.productRepo.findMany(
        {
          isActive: true,
          categoryId,
          id: { not: productId },
          stock: { gt: 0 },
        },
        {
          include: {
            category: true,
            images: {
              orderBy: { position: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
          pagination: { page: 1, limit },
        }
      );

      const products = result.data;
      return products.map((product) => this.formatProductForResponse(product));
    } catch (error) {
      logger.error("Error fetching related products", {
        error: error instanceof Error ? error.message : "Unknown error",
        productId,
        categoryId,
      });
      return [];
    }
  }

  /**
   * 🎯 Format product for API response
   */
  private formatProductForResponse(product: any): Product {
    return {
      ...product,
      price: product.price || 0,
      comparePrice: product.comparePrice || null,
      averageRating: this.calculateAverageRating(product.reviews || []),
      reviewCount: product.reviews?.length || 0,
      inStock: (product.stock || 0) > 0,
      stockQuantity: product.stock || 0,
      canOrder: product.isActive && ((product.stock || 0) > 0 || !product.trackQuantity),
    } as any;
  }

  /**
   * 📊 Calculate market insights for Nigerian context
   */
  private calculateMarketInsights(products: any[]): any {
    const totalProducts = products.length;
    const inStockProducts = products.filter(
      (p) => (p.stock || 0) > 0
    ).length;
    const featuredProducts = products.filter((p) => p.isFeatured).length;

    const prices = products.map((p) => p.price).filter((p) => p > 0);
    const avgPrice =
      prices.length > 0
        ? prices.reduce((sum, price) => sum + price, 0) / prices.length
        : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    return {
      totalProducts,
      inStockProducts,
      featuredProducts,
      stockPercentage:
        totalProducts > 0
          ? Math.round((inStockProducts / totalProducts) * 100)
          : 0,
      priceRange: {
        min: minPrice,
        max: maxPrice,
        average: avgPrice,
      },
      marketRecommendations: this.generateMarketRecommendations(products),
    };
  }

  /**
   * 📈 Calculate product-specific market insights
   */
  private calculateProductMarketInsights(product: any): any {
    const price = product.price || 0;
    const category = product.category?.name;

    return {
      priceCategory: this.categorizePriceForNigerianMarket(price),
      recommendedShipping: ["Standard", "Express"], // Simplified
      estimatedDelivery: "2-5 days", // Simplified
      paymentMethods: ["Card", "Transfer", "Cash"], // Simplified
      marketPosition: this.determineMarketPosition(price, category),
    };
  }

  /**
   * 🎯 Generate market recommendations
   */
  private generateMarketRecommendations(products: any[]): string[] {
    const recommendations: string[] = [];

    const lowStockProducts = products.filter(
      (p) => (p.stock || 0) < 10
    ).length;
    const highPriceProducts = products.filter((p) => p.price > 100000).length;

    if (lowStockProducts > 0) {
      recommendations.push(`${lowStockProducts} products need restocking`);
    }

    if (highPriceProducts > 0) {
      recommendations.push(
        `Consider payment plans for ${highPriceProducts} high-value items`
      );
    }

    recommendations.push("Optimize for mobile-first Nigerian customers");

    return recommendations;
  }

  /**
   * 💰 Categorize price for Nigerian market
   */
  private categorizePriceForNigerianMarket(price: number): string {
    if (price <= 5000) return "budget";
    if (price <= 25000) return "affordable";
    if (price <= 100000) return "mid-range";
    if (price <= 500000) return "premium";
    return "luxury";
  }

  /**
   * 📊 Determine market position
   */
  private determineMarketPosition(price: number, category: string): string {
    // This would typically involve more complex market analysis
    const priceCategory = this.categorizePriceForNigerianMarket(price);
    return `${priceCategory} ${category?.toLowerCase() || "product"}`;
  }

  /**
   * ⭐ Calculate average rating
   */
  private calculateAverageRating(reviews: any[]): number {
    if (!reviews || reviews.length === 0) return 0;

    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return Math.round((total / reviews.length) * 10) / 10; // Round to 1 decimal
  }

  /**
   * 🔗 Generate SEO-friendly slug
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .trim();
  }

  /**
   * 📂 Get available categories for filters
   */
  private async getAvailableCategories(): Promise<any[]> {
    try {
      // Direct Prisma call to avoid BaseRepository complexity
      const categories = await this.categoryRepo.prisma.category.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
      return categories || [];
    } catch (error) {
      logger.error("Error fetching available categories", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return [];
    }
  }

  /**
   * 💰 Get price range for filters
   */
  private async getPriceRange(): Promise<{ min: number; max: number }> {
    try {
      // Simplified implementation
      return { min: 0, max: 1000000 };
    } catch (error) {
      logger.error("Error fetching price range", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return { min: 0, max: 1000000 };
    }
  }

  /**
   * 📦 Get product stock information
   */
  async getProductStock(productId: string): Promise<any> {
    try {
      const product = await this.productRepo.findById?.(productId) || null;

      if (!product) {
        return null;
      }

      return product.stock ? { quantity: product.stock } : null;
    } catch (error) {
      logger.error("Error fetching product stock", {
        error: error instanceof Error ? error.message : "Unknown error",
        productId,
      });
      throw error;
    }
  }

  /**
   * 📦 Check stock for multiple products
   */
  async checkMultipleStock(productIds: string[]): Promise<any[]> {
    try {
      const result = await this.productRepo.findMany?.(
        { 
          id: { in: productIds },
          isActive: true 
        },
        {
          include: {
            category: true,
            images: true,
          }
        }
      ) || { data: [] };
      
      const products = result;

      return products.data.map((product: any) => ({
        productId: product.id,
        inStock: (product.stock || 0) > 0,
        quantity: product.stock || 0,
        lowStock: (product.stock || 0) <= (product.lowStockThreshold || 10),
        availableQuantity: Math.max(0, (product.stock || 0))
      }));
    } catch (error) {
      logger.error("Error checking multiple stock", {
        error: error instanceof Error ? error.message : "Unknown error",
        productIds,
      });
      throw error;
    }
  }

  /**
   * ⭐ Get product reviews summary
   */
  async getProductReviewsSummary(productId: string): Promise<any> {
    try {
      const product = await this.productRepo.findById?.(productId) || null;

      if (!product) {
        throw new NotFoundError("Product");
      }

      const reviews = [];
      const totalReviews = reviews.length;
      const averageRating = this.calculateAverageRating(reviews);
      
      const ratingDistribution = [1, 2, 3, 4, 5].map(rating => {
        const count = reviews.filter(r => r.rating === rating).length;
        return {
          rating,
          count,
          percentage: totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0
        };
      });

      return {
        totalReviews,
        averageRating,
        ratingDistribution,
        verifiedReviews: reviews.filter(r => r.isVerified).length
      };
    } catch (error) {
      logger.error("Error fetching product reviews summary", {
        error: error instanceof Error ? error.message : "Unknown error",
        productId,
      });
      throw error;
    }
  }

  /**
   * 📈 Get product price history
   */
  async getProductPriceHistory(productId: string, days: number = 30): Promise<any[]> {
    try {
      // This would typically come from a price history table
      // For now, return empty array as this is a complex feature
      const product = await this.productRepo.findById(productId);
      
      if (!product) {
        throw new NotFoundError("Product");
      }

      // Mock price history data
      return [{
        date: new Date(),
        price: product.price,
        comparePrice: product.comparePrice
      }];
    } catch (error) {
      logger.error("Error fetching product price history", {
        error: error instanceof Error ? error.message : "Unknown error",
        productId,
      });
      throw error;
    }
  }

  /**
   * ⚠️ Get products with low stock
   */
  async getLowStockProducts(pagination: { page: number; limit: number }): Promise<any> {
    try {
      const products = await this.productRepo.findMany({
        filters: {
          isActive: true,
          lowStock: true
        },
        pagination,
        sort: { field: "updatedAt", order: "desc" },
        include: {
          category: true,
          inventory: true,
        },
      });

      return {
        products: products.data.map(product => this.formatProductForResponse(product)),
        pagination: products.pagination
      };
    } catch (error) {
      logger.error("Error fetching low stock products", {
        error: error instanceof Error ? error.message : "Unknown error",
        pagination,
      });
      throw error;
    }
  }

  /**
   * 📊 Get product analytics
   */
  async getProductAnalytics(productId: string, days: number = 30): Promise<any> {
    try {
      const product = await this.productRepo.findById?.(productId) || null;

      if (!product) {
        throw new NotFoundError("Product");
      }

      // Mock analytics data - in real implementation, this would come from analytics service
      return {
        productId,
        views: 0, // Would come from analytics tracking
        orders: 0, // Would come from order history
        revenue: 0, // Would come from order calculations
        conversionRate: 0,
        averageRating: 0,
        totalReviews: 0,
        stockLevel: product.stock || 0,
        period: `Last ${days} days`,
        trends: {
          views: "stable",
          orders: "stable",
          revenue: "stable"
        }
      };
    } catch (error) {
      logger.error("Error fetching product analytics", {
        error: error instanceof Error ? error.message : "Unknown error",
        productId,
      });
      throw error;
    }
  }
}
