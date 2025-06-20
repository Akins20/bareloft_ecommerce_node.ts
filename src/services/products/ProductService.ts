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
  private productRepo: ProductRepository;
  private categoryRepo: CategoryRepository;
  private inventoryRepo: InventoryRepository;

  constructor() {
    super();
    this.productRepo = new ProductRepository();
    this.categoryRepo = new CategoryRepository();
    this.inventoryRepo = new InventoryRepository();
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
        queryFilters.search = search;
      }

      if (categoryId) {
        // Verify category exists
        const category = await this.categoryRepo.findById(categoryId);
        if (!category) {
          throw new NotFoundError("Category");
        }
        queryFilters.categoryId = categoryId;
      }

      if (priceMin !== undefined) {
        queryFilters.priceMin = priceMin;
      }

      if (priceMax !== undefined) {
        queryFilters.priceMax = priceMax;
      }

      if (featured !== undefined) {
        queryFilters.isFeatured = featured;
      }

      if (inStock) {
        queryFilters.inStock = true;
      }

      // Get products with pagination
      const products = await this.productRepo.findMany({
        filters: queryFilters,
        pagination: { page, limit },
        sort: { field: sortBy, order: sortOrder },
        include: {
          category: true,
          images: true,
          inventory: true,
          reviews: {
            select: {
              rating: true,
            },
          },
        },
      });

      // Calculate Nigerian market insights
      const productInsights = this.calculateMarketInsights(products.data);

      return {
        data: products.data.map((product) =>
          this.formatProductForResponse(product)
        ),
        pagination: products.pagination,
        filters: {
          appliedFilters: queryFilters,
          availableCategories: await this.getAvailableCategories(),
          priceRange: await this.getPriceRange(),
        },
        insights: productInsights,
      };
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

      // Check if identifier is UUID (ID) or slug
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          identifier
        );

      if (isUUID) {
        product = await this.productRepo.findById(identifier, {
          include: {
            category: true,
            images: true,
            inventory: true,
            reviews: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        });
      } else {
        product = await this.productRepo.findBySlug(identifier, {
          include: {
            category: true,
            images: true,
            inventory: true,
            reviews: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        });
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

      return {
        ...formattedProduct,
        relatedProducts: relatedProducts.map((p) =>
          this.formatProductForResponse(p)
        ),
        marketInsights: this.calculateProductMarketInsights(product),
      };
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
        const existingProduct = await this.productRepo.findBySku(
          productData.sku
        );
        if (existingProduct) {
          throw new ValidationError("SKU already exists");
        }
      }

      // Generate slug from name
      const slug = this.generateSlug(productData.name);

      // Ensure slug uniqueness
      const existingSlug = await this.productRepo.findBySlug(slug);
      if (existingSlug) {
        const uniqueSlug = `${slug}-${Date.now()}`;
        productData.slug = uniqueSlug;
      } else {
        productData.slug = slug;
      }

      // Validate Nigerian pricing
      if (productData.price) {
        if (!CurrencyUtils.isValid(productData.price)) {
          throw new ValidationError("Invalid price format");
        }
      }

      // Create product
      const product = await this.productRepo.create({
        ...productData,
        createdBy: adminId,
        updatedBy: adminId,
      });

      // Create initial inventory record if quantity provided
      if (productData.initialQuantity !== undefined) {
        await this.inventoryRepo.create({
          productId: product.id,
          quantity: productData.initialQuantity,
          lowStockThreshold: productData.lowStockThreshold || 10,
          trackInventory: productData.trackInventory !== false,
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
        const existingBySku = await this.productRepo.findBySku(productData.sku);
        if (existingBySku) {
          throw new ValidationError("SKU already exists");
        }
      }

      // Update slug if name changed
      if (productData.name && productData.name !== existingProduct.name) {
        productData.slug = this.generateSlug(productData.name);

        // Ensure slug uniqueness
        const existingSlug = await this.productRepo.findBySlug(
          productData.slug
        );
        if (existingSlug && existingSlug.id !== productId) {
          productData.slug = `${productData.slug}-${Date.now()}`;
        }
      }

      // Validate pricing changes
      if (productData.price !== undefined) {
        if (!CurrencyUtils.isValid(productData.price)) {
          throw new ValidationError("Invalid price format");
        }
      }

      // Update product
      const updatedProduct = await this.productRepo.update(productId, {
        ...productData,
        updatedBy: adminId,
        updatedAt: new Date(),
      });

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
  async deleteProduct(productId: string, adminId: string): Promise<void> {
    try {
      const product = await this.productRepo.findById(productId);
      if (!product) {
        throw new NotFoundError("Product");
      }

      // Check if product has pending orders
      const hasPendingOrders =
        await this.productRepo.hasPendingOrders(productId);
      if (hasPendingOrders) {
        throw new ValidationError("Cannot delete product with pending orders");
      }

      // Soft delete
      await this.productRepo.update(productId, {
        isActive: false,
        deletedAt: new Date(),
        updatedBy: adminId,
      });

      logger.info("Product deleted successfully", {
        productId,
        productName: product.name,
        adminId,
      });
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
      const products = await this.productRepo.findMany({
        filters: {
          isActive: true,
          isFeatured: true,
          inStock: true,
        },
        pagination: { page: 1, limit },
        sort: { field: "updatedAt", order: "desc" },
        include: {
          category: true,
          images: true,
          inventory: true,
        },
      });

      return products.data.map((product) =>
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
  private async getRelatedProducts(
    productId: string,
    categoryId: string,
    limit: number = 8
  ): Promise<any[]> {
    try {
      const products = await this.productRepo.findMany({
        filters: {
          isActive: true,
          categoryId,
          excludeIds: [productId],
          inStock: true,
        },
        pagination: { page: 1, limit },
        sort: { field: "createdAt", order: "desc" },
        include: {
          category: true,
          images: true,
          inventory: true,
        },
      });

      return products.data;
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
      price: CurrencyUtils.format(product.price),
      comparePrice: product.comparePrice
        ? CurrencyUtils.format(product.comparePrice)
        : null,
      averageRating: this.calculateAverageRating(product.reviews || []),
      reviewCount: product.reviews?.length || 0,
      inStock: product.inventory?.quantity > 0,
      stockQuantity: product.inventory?.quantity || 0,
      canOrder:
        product.isActive &&
        (product.inventory?.quantity > 0 || !product.inventory?.trackInventory),
    };
  }

  /**
   * 📊 Calculate market insights for Nigerian context
   */
  private calculateMarketInsights(products: any[]): any {
    const totalProducts = products.length;
    const inStockProducts = products.filter(
      (p) => p.inventory?.quantity > 0
    ).length;
    const featuredProducts = products.filter((p) => p.isFeatured).length;

    const prices = products.map((p) => p.price).filter((p) => p > 0);
    const avgPrice =
      prices.length > 0
        ? prices.reduce((sum, price) => sum + price, 0) / prices.length
        : 0;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    return {
      totalProducts,
      inStockProducts,
      featuredProducts,
      stockPercentage:
        totalProducts > 0
          ? Math.round((inStockProducts / totalProducts) * 100)
          : 0,
      priceRange: {
        min: CurrencyUtils.format(minPrice),
        max: CurrencyUtils.format(maxPrice),
        average: CurrencyUtils.format(avgPrice),
      },
      marketRecommendations: this.generateMarketRecommendations(products),
    };
  }

  /**
   * 📈 Calculate product-specific market insights
   */
  private calculateProductMarketInsights(product: any): any {
    const price = product.price;
    const category = product.category?.name;

    return {
      priceCategory: this.categorizePriceForNigerianMarket(price),
      recommendedShipping: MarketUtils.getShippingMethods(
        product.shippingState || "Lagos"
      ),
      estimatedDelivery: MarketUtils.estimateDeliveryTime(
        "Lagos",
        product.shippingState || "Lagos"
      ),
      paymentMethods: CurrencyUtils.getAvailablePaymentMethods(price, "Lagos"),
      marketPosition: this.determineMarketPosition(price, category),
    };
  }

  /**
   * 🎯 Generate market recommendations
   */
  private generateMarketRecommendations(products: any[]): string[] {
    const recommendations: string[] = [];

    const lowStockProducts = products.filter(
      (p) => p.inventory?.quantity < 10
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
      return await this.categoryRepo.findMany({
        filters: { isActive: true },
        select: { id: true, name: true, slug: true },
      });
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
      const range = await this.productRepo.getPriceRange();
      return {
        min: range?.min || 0,
        max: range?.max || 1000000,
      };
    } catch (error) {
      logger.error("Error fetching price range", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return { min: 0, max: 1000000 };
    }
  }
}
