import { PrismaClient } from "@prisma/client";
import { BaseRepository } from "./BaseRepository";
import {
  Product,
  CreateProductRequest,
  UpdateProductRequest,
  ProductQueryParams,
  ProductListResponse,
  ProductAnalytics,
  PaginationParams,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
} from "../types";

export interface CreateProductData {
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  sku: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  categoryId: string;
  brand?: string;
  weight?: number;
  dimensions?: any;
  isActive?: boolean;
  isFeatured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
}

export interface UpdateProductData {
  name?: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  sku?: string;
  price?: number;
  comparePrice?: number;
  costPrice?: number;
  categoryId?: string;
  brand?: string;
  weight?: number;
  dimensions?: any;
  isActive?: boolean;
  isFeatured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
}

export class ProductRepository extends BaseRepository<
  Product,
  CreateProductData,
  UpdateProductData
> {
  constructor(prisma: PrismaClient) {
    super(prisma, "product");
  }

  /**
   * Find product by slug
   */
  async findBySlug(slug: string): Promise<Product | null> {
    try {
      return await this.findFirst(
        { slug, isActive: true },
        {
          category: true,
          images: {
            orderBy: { position: "asc" },
          },
          reviews: {
            include: { user: true },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          inventory: true,
        }
      );
    } catch (error) {
      this.handleError("Error finding product by slug", error);
      throw error;
    }
  }

  /**
   * Find product by SKU
   */
  async findBySKU(sku: string): Promise<Product | null> {
    try {
      return await this.findFirst(
        { sku },
        {
          category: true,
          images: true,
          inventory: true,
        }
      );
    } catch (error) {
      this.handleError("Error finding product by SKU", error);
      throw error;
    }
  }

  /**
   * Create product with validation
   */
  async createProduct(productData: CreateProductData): Promise<Product> {
    try {
      // Check if SKU already exists
      const existingSKU = await this.findBySKU(productData.sku);
      if (existingSKU) {
        throw new AppError(
          "SKU already exists",
          HTTP_STATUS.CONFLICT,
          ERROR_CODES.RESOURCE_ALREADY_EXISTS
        );
      }

      // Check if slug already exists
      const existingSlug = await this.findBySlug(productData.slug);
      if (existingSlug) {
        throw new AppError(
          "Slug already exists",
          HTTP_STATUS.CONFLICT,
          ERROR_CODES.RESOURCE_ALREADY_EXISTS
        );
      }

      return await this.create(productData, {
        category: true,
        images: true,
        inventory: true,
      });
    } catch (error) {
      this.handleError("Error creating product", error);
      throw error;
    }
  }

  /**
   * Update product with validation
   */
  async updateProduct(
    productId: string,
    productData: UpdateProductData
  ): Promise<Product> {
    try {
      // Check SKU uniqueness if being updated
      if (productData.sku) {
        const existingSKU = await this.findFirst({
          sku: productData.sku,
          id: { not: productId },
        });
        if (existingSKU) {
          throw new AppError(
            "SKU already exists",
            HTTP_STATUS.CONFLICT,
            ERROR_CODES.RESOURCE_CONFLICT
          );
        }
      }

      // Check slug uniqueness if being updated
      if (productData.slug) {
        const existingSlug = await this.findFirst({
          slug: productData.slug,
          id: { not: productId },
        });
        if (existingSlug) {
          throw new AppError(
            "Slug already exists",
            HTTP_STATUS.CONFLICT,
            ERROR_CODES.RESOURCE_CONFLICT
          );
        }
      }

      return await this.update(productId, productData, {
        category: true,
        images: true,
        inventory: true,
        reviews: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
      });
    } catch (error) {
      this.handleError("Error updating product", error);
      throw error;
    }
  }

  /**
   * Find products with advanced filtering
   */
  async findProductsWithFilters(
    queryParams: ProductQueryParams
  ): Promise<ProductListResponse> {
    try {
      const {
        categoryId,
        categorySlug,
        brand,
        priceMin,
        priceMax,
        isActive = true,
        isFeatured,
        inStock,
        hasDiscount,
        rating,
        sortBy = "createdAt",
        sortOrder = "desc",
        availability,
        query,
        page = 1,
        limit = 20,
      } = queryParams;

      // Build where clause
      const where: any = { isActive };

      // Category filter
      if (categoryId) {
        where.categoryId = categoryId;
      } else if (categorySlug) {
        where.category = { slug: categorySlug };
      }

      // Brand filter
      if (brand) {
        where.brand = { contains: brand, mode: "insensitive" };
      }

      // Price range filter
      if (priceMin !== undefined || priceMax !== undefined) {
        where.price = {};
        if (priceMin !== undefined) where.price.gte = priceMin;
        if (priceMax !== undefined) where.price.lte = priceMax;
      }

      // Featured filter
      if (typeof isFeatured === "boolean") {
        where.isFeatured = isFeatured;
      }

      // Discount filter
      if (hasDiscount) {
        where.comparePrice = { gt: 0 };
      }

      // Stock availability filter
      if (inStock || availability) {
        switch (availability) {
          case "in_stock":
            where.stock = { gt: 0 };
            break;
          case "out_of_stock":
            where.stock = { lte: 0 };
            break;
          case "low_stock":
            // For now, consider products with stock <= 10 as low stock
            where.AND = [
              { stock: { gt: 0 } },
              { stock: { lte: 10 } }
            ];
            break;
          default:
            if (inStock) {
              where.stock = { gt: 0 };
            }
        }
      }

      // Rating filter
      if (rating) {
        where.reviews = {
          some: {},
        };
        // Would need to calculate average rating in a more complex query
      }

      // Search query
      if (query) {
        where.OR = [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { brand: { contains: query, mode: "insensitive" } },
          { sku: { contains: query, mode: "insensitive" } },
        ];
      }

      // Build order by
      let orderBy: any = { createdAt: "desc" };
      switch (sortBy) {
        case "name":
          orderBy = { name: sortOrder };
          break;
        case "price":
          orderBy = { price: sortOrder };
          break;
        case "created":
          orderBy = { createdAt: sortOrder };
          break;
        case "popularity":
          // Would order by sales count or view count
          orderBy = { createdAt: "desc" };
          break;
        case "discount":
          // Order by discount percentage
          orderBy = { comparePrice: sortOrder };
          break;
      }

      const result = await this.findMany(where, {
        include: {
          category: true,
          images: {
            where: { isPrimary: true },
            take: 1,
          },
          inventory: true,
          reviews: {
            select: { rating: true },
          },
          _count: {
            select: {
              reviews: true,
              orderItems: true,
            },
          },
        },
        orderBy,
        pagination: { page, limit },
      });

      // Get filter options for the response
      const filters = await this.getFilterOptions(where);

      // Calculate facets
      const facets = await this.getProductFacets(where);

      return {
        products: result.data.map(this.transformProductForList),
        pagination: result.pagination,
        filters,
        facets,
      };
    } catch (error) {
      this.handleError("Error finding products with filters", error);
      throw error;
    }
  }

  /**
   * Search products
   */
  async searchProducts(
    searchTerm: string,
    filters: {
      categoryId?: string;
      priceMin?: number;
      priceMax?: number;
      brand?: string;
      inStock?: boolean;
    } = {},
    pagination?: PaginationParams
  ): Promise<{
    data: Product[];
    pagination: any;
    searchMeta: any;
  }> {
    try {
      const searchFields = ["name", "description", "brand", "sku"];
      const where: any = {
        isActive: true,
        ...filters,
      };

      // Add stock filter
      if (filters.inStock) {
        where.stock = { gt: 0 };
        delete where.inStock;
      }

      return await this.search(searchTerm, searchFields, where, {
        include: {
          category: true,
          images: {
            where: { isPrimary: true },
            take: 1,
          },
          inventory: true,
          reviews: {
            select: { rating: true },
            take: 5,
          },
        },
        pagination,
      });
    } catch (error) {
      this.handleError("Error searching products", error);
      throw error;
    }
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit: number = 12): Promise<Product[]> {
    try {
      const result = await this.findMany(
        {
          isActive: true,
          isFeatured: true,
          stock: { gt: 0 },
        },
        {
          include: {
            category: true,
            images: {
              where: { isPrimary: true },
              take: 1,
            },
            reviews: {
              select: { rating: true },
            },
          },
          orderBy: { createdAt: "desc" },
          pagination: { page: 1, limit },
        }
      );

      return result.data;
    } catch (error) {
      this.handleError("Error getting featured products", error);
      throw error;
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(
    categoryId: string,
    pagination?: PaginationParams
  ): Promise<{
    data: Product[];
    pagination: any;
  }> {
    try {
      return await this.findMany(
        {
          categoryId,
          isActive: true,
        },
        {
          include: {
            category: true,
            images: {
              where: { isPrimary: true },
              take: 1,
            },
            reviews: {
              select: { rating: true },
            },
          },
          orderBy: { createdAt: "desc" },
          pagination,
        }
      );
    } catch (error) {
      this.handleError("Error getting products by category", error);
      throw error;
    }
  }

  /**
   * Get related products
   */
  async getRelatedProducts(
    productId: string,
    limit: number = 8
  ): Promise<Product[]> {
    try {
      // Get the current product to find related ones
      const currentProduct = await this.findById(productId, { category: true });
      if (!currentProduct) {
        return [];
      }

      const result = await this.findMany(
        {
          categoryId: currentProduct.categoryId,
          isActive: true,
          id: { not: productId },
          stock: { gt: 0 },
        },
        {
          include: {
            category: true,
            images: {
              where: { isPrimary: true },
              take: 1,
            },
            reviews: {
              select: { rating: true },
            },
          },
          orderBy: { createdAt: "desc" },
          pagination: { page: 1, limit },
        }
      );

      return result.data;
    } catch (error) {
      this.handleError("Error getting related products", error);
      throw error;
    }
  }

  /**
   * Get best selling products
   */
  async getBestSellingProducts(
    limit: number = 10,
    categoryId?: string
  ): Promise<Array<Product & { salesCount: number }>> {
    try {
      const where: any = { isActive: true };
      if (categoryId) {
        where.categoryId = categoryId;
      }

      // This would typically involve aggregating order items
      // For now, get products with most order items
      const products = await this.prisma.product.findMany({
        where,
        include: {
          category: true,
          images: {
            orderBy: { position: "asc" },
            take: 1,
          },
          orderItems: {
            include: {
              order: true,
            },
          },
          reviews: {
            select: { rating: true },
          },
        },
        take: limit * 2, // Get more to calculate and sort
      });

      const productsWithSales = products
        .map((product: any) => ({
          ...product,
          salesCount: product.orderItems
            .filter((item: any) => item.order?.status === "DELIVERED")
            .reduce((sum: number, item: any) => sum + item.quantity, 0),
        }))
        .sort((a, b) => b.salesCount - a.salesCount)
        .slice(0, limit);

      return productsWithSales;
    } catch (error) {
      this.handleError("Error getting best selling products", error);
      throw error;
    }
  }

  /**
   * Get products with low stock
   */
  async getLowStockProducts(limit?: number): Promise<
    Array<
      Product & {
        currentStock: number;
        threshold: number;
      }
    >
  > {
    try {
      const result = await this.findMany(
        {
          isActive: true,
          stock: {
            gt: 0,
            lte: 10, // Consider products with stock <= 10 as low stock
          },
        },
        {
          include: {
            category: true,
          },
          orderBy: [{ stock: "asc" }],
          pagination: limit ? { page: 1, limit } : undefined,
        }
      );

      return result.data.map((product: any) => ({
        ...product,
        currentStock: product.stock || 0,
        threshold: product.lowStockThreshold || 0,
      }));
    } catch (error) {
      this.handleError("Error getting low stock products", error);
      throw error;
    }
  }

  /**
   * Get out of stock products
   */
  async getOutOfStockProducts(limit?: number): Promise<Product[]> {
    try {
      const result = await this.findMany(
        {
          isActive: true,
          stock: { lte: 0 },
        },
        {
          include: {
            category: true,
          },
          orderBy: { updatedAt: "desc" },
          pagination: limit ? { page: 1, limit } : undefined,
        }
      );

      return result.data;
    } catch (error) {
      this.handleError("Error getting out of stock products", error);
      throw error;
    }
  }

  /**
   * Get product analytics
   */
  async getProductAnalytics(): Promise<ProductAnalytics> {
    try {
      const [
        totalProducts,
        activeProducts,
        inactiveProducts,
        inStockProducts,
        outOfStockProducts,
        lowStockProducts,
        featuredProducts,
        categoryStats,
        brandStats,
        priceStats,
      ] = await Promise.all([
        this.count(),
        this.count({ isActive: true }),
        this.count({ isActive: false }),
        this.count({
          isActive: true,
          stock: { gt: 0 },
        }),
        this.count({
          isActive: true,
          stock: { lte: 0 },
        }),
        this.count({
          isActive: true,
          stock: {
            gt: 0,
            lte: 10, // Consider stock <= 10 as low stock
          },
        }),
        this.count({ isFeatured: true }),
        this.getCategoryAnalytics(),
        this.getBrandAnalytics(),
        this.getPriceAnalytics(),
      ]);

      // Calculate total inventory value from product stock
      const inventoryValue = await this.prisma.product.aggregate({
        _sum: {
          stock: true,
        },
        where: {
          isActive: true,
        },
      });

      const avgPriceResult = await this.aggregate(
        { isActive: true },
        { _avg: { price: true } }
      );

      return {
        totalProducts,
        activeProducts,
        inactiveProducts,
        inStockProducts,
        outOfStockProducts,
        lowStockProducts,
        featuredProducts,
        totalValue: 0, // Would calculate from inventory * cost
        averagePrice: Number(avgPriceResult._avg.price) || 0,
        topCategories: categoryStats,
        topBrands: brandStats,
        priceDistribution: priceStats,
        recentlyAdded: [],
        mostViewed: [],
        bestRated: [],
      };
    } catch (error) {
      this.handleError("Error getting product analytics", error);
      throw error;
    }
  }

  /**
   * Bulk update product status
   */
  async bulkUpdateStatus(
    productIds: string[],
    isActive: boolean
  ): Promise<{ count: number }> {
    try {
      return await this.updateMany({ id: { in: productIds } }, { isActive });
    } catch (error) {
      this.handleError("Error bulk updating product status", error);
      throw error;
    }
  }

  /**
   * Bulk update product category
   */
  async bulkUpdateCategory(
    productIds: string[],
    categoryId: string
  ): Promise<{ count: number }> {
    try {
      return await this.updateMany({ id: { in: productIds } }, { categoryId });
    } catch (error) {
      this.handleError("Error bulk updating product category", error);
      throw error;
    }
  }

  // Private helper methods

  private async getFilterOptions(baseWhere: any): Promise<any> {
    try {
      // Get available categories
      const categories = await this.prisma.category.findMany({
        where: {
          products: { some: baseWhere },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: { products: true },
          },
        },
      });

      // Get available brands
      const brands = await this.groupBy(
        ["brand"],
        { ...baseWhere, brand: { not: null } },
        undefined,
        { _count: { id: true } }
      );

      // Get price range
      const priceRange = await this.aggregate(baseWhere, {
        _min: { price: true },
        _max: { price: true },
      });

      return {
        categories: categories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          count: cat._count.products,
        })),
        brands: brands.map((brand) => ({
          name: brand.brand,
          count: brand._count.id,
        })),
        priceRange: {
          min: Number(priceRange._min.price) || 0,
          max: Number(priceRange._max.price) || 0,
        },
      };
    } catch (error) {
      return {
        categories: [],
        brands: [],
        priceRange: { min: 0, max: 0 },
      };
    }
  }

  private async getProductFacets(baseWhere: any): Promise<any> {
    try {
      const [totalProducts, inStock, outOfStock, onSale, featured] =
        await Promise.all([
          this.count(baseWhere),
          this.count({
            ...baseWhere,
            stock: { gt: 0 },
          }),
          this.count({
            ...baseWhere,
            stock: { lte: 0 },
          }),
          this.count({
            ...baseWhere,
            comparePrice: { gt: 0 },
          }),
          this.count({
            ...baseWhere,
            isFeatured: true,
          }),
        ]);

      return {
        totalProducts,
        inStock,
        outOfStock,
        onSale,
        featured,
      };
    } catch (error) {
      return {
        totalProducts: 0,
        inStock: 0,
        outOfStock: 0,
        onSale: 0,
        featured: 0,
      };
    }
  }

  private transformProductForList(product: any): any {
    // Calculate average rating
    const averageRating =
      product.reviews && product.reviews.length > 0
        ? product.reviews.reduce(
            (sum: number, review: any) => sum + review.rating,
            0
          ) / product.reviews.length
        : 0;

    // Calculate discount percentage
    const discountPercentage =
      product.comparePrice && product.comparePrice > product.price
        ? Math.round(
            ((product.comparePrice - product.price) / product.comparePrice) *
              100
          )
        : 0;

    return {
      ...product,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: product._count?.reviews || 0,
      isInStock: product.stock > 0,
      discountPercentage,
      primaryImage: product.images?.[0]?.url || null,
    };
  }

  private async getCategoryAnalytics(): Promise<any[]> {
    // Would implement category-based analytics
    return [];
  }

  private async getBrandAnalytics(): Promise<any[]> {
    // Would implement brand-based analytics
    return [];
  }

  private async getPriceAnalytics(): Promise<any[]> {
    // Would implement price distribution analytics
    return [];
  }
}
