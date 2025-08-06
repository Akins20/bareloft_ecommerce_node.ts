import { BaseService } from "../BaseService";
import {
  ProductModel,
  OrderModel,
  CartModel,
  ProductReviewModel,
  WishlistItemModel,
} from "../../models";
import { ProductRepository } from "../../repositories/ProductRepository";
import { Product, AppError, HTTP_STATUS, ERROR_CODES } from "../../types";
import { CacheService } from "../cache/CacheService";

interface RecommendationOptions {
  limit?: number;
  excludeOutOfStock?: boolean;
  includeCategories?: string[];
  excludeCategories?: string[];
  priceRange?: { min?: number; max?: number };
  userId?: string;
}

interface ProductSimilarity {
  productId: string;
  similarity: number;
  reasons: string[];
}

interface UserBehavior {
  userId: string;
  viewedProducts: string[];
  purchasedProducts: string[];
  cartProducts: string[];
  wishlistProducts: string[];
  reviewedProducts: string[];
  categoryPreferences: Record<string, number>;
  brandPreferences: Record<string, number>;
  priceRange: { min: number; max: number; avg: number };
}

export class RecommendationService extends BaseService {
  private productRepository: ProductRepository;
  private cacheService: CacheService;

  constructor(
    productRepository?: ProductRepository,
    cacheService?: CacheService
  ) {
    super();
    this.productRepository = productRepository || {} as any;
    this.cacheService = cacheService || {} as any;
  }

  /**
   * Get personalized recommendations for a user
   * Combines collaborative filtering and content-based filtering
   */
  async getPersonalizedRecommendations(
    userId: string,
    options: RecommendationOptions = {}
  ): Promise<Product[]> {
    try {
      const { limit = 10 } = options;
      const cacheKey = `recommendations:user:${userId}:${JSON.stringify(options)}`;

      // Check cache first
      const cached = await this.cacheService.get<Product[]>(cacheKey);
      if (cached) return cached;

      // Get user behavior data
      const userBehavior = await this.getUserBehavior(userId);

      if (this.isNewUser(userBehavior)) {
        // For new users, use trending and popular products
        return this.getTrendingRecommendations(options);
      }

      // Generate recommendations using multiple strategies
      const [
        collaborativeRecommendations,
        contentBasedRecommendations,
        trendingRecommendations,
      ] = await Promise.all([
        this.getCollaborativeRecommendations(userId, userBehavior, limit),
        this.getContentBasedRecommendations(userId, userBehavior, limit),
        this.getTrendingRecommendations({
          ...options,
          limit: Math.ceil(limit / 3),
        }),
      ]);

      // Merge and rank recommendations
      const mergedRecommendations = this.mergeRecommendations(
        [
          { recommendations: collaborativeRecommendations, weight: 0.4 },
          { recommendations: contentBasedRecommendations, weight: 0.4 },
          { recommendations: trendingRecommendations, weight: 0.2 },
        ],
        limit
      );

      // Apply filters
      const filteredRecommendations = await this.applyFilters(
        mergedRecommendations,
        options
      );

      // Cache recommendations for 1 hour
      if (this.cacheService.set) {
        await this.cacheService.set(cacheKey, filteredRecommendations, { ttl: 3600 });
      }

      return filteredRecommendations;
    } catch (error) {
      this.handleError("Error generating personalized recommendations", error);
    }
  }

  /**
   * Get product recommendations based on a specific product (similar products)
   */
  async getSimilarProducts(
    productId: string,
    options: RecommendationOptions = {}
  ): Promise<Product[]> {
    try {
      const { limit = 8 } = options;
      const cacheKey = `recommendations:similar:${productId}:${JSON.stringify(options)}`;

      const cached = await this.cacheService.get<Product[]>(cacheKey);
      if (cached) return cached;

      // Get the source product
      const sourceProduct = await this.productRepository.findById(productId);
      if (!sourceProduct) {
        throw new AppError(
          "Product not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Find similar products using multiple criteria
      const similarProducts = await this.findSimilarProducts(
        sourceProduct,
        limit * 2
      );

      // Rank by similarity
      const rankedProducts = this.rankBySimilarity(
        sourceProduct,
        similarProducts
      );

      // Apply filters and limit
      const filteredProducts = await this.applyFilters(
        rankedProducts.slice(0, limit),
        options
      );

      // Cache for 2 hours
      if (this.cacheService.set) {
        await this.cacheService.set(cacheKey, filteredProducts, { ttl: 7200 });
      }

      return filteredProducts;
    } catch (error) {
      this.handleError("Error getting similar products", error);
    }
  }

  /**
   * Get frequently bought together recommendations
   */
  async getFrequentlyBoughtTogether(
    productId: string,
    options: RecommendationOptions = {}
  ): Promise<Product[]> {
    try {
      const { limit = 5 } = options;
      const cacheKey = `recommendations:bought-together:${productId}`;

      const cached = await this.cacheService.get<Product[]>(cacheKey);
      if (cached) return cached;

      // Find products frequently bought together
      const coOccurrenceData = await this.getProductCoOccurrence(productId);

      // Get product details for top co-occurring products
      const productIds = coOccurrenceData
        .slice(0, limit)
        .map((item) => item.productId);

      // Simplified since findManyByIds method doesn't exist
      const products = await ProductModel.findMany({
        where: { id: { in: productIds } },
        include: {
          category: true,
          images: { take: 1 },
        },
      });

      // Maintain order based on co-occurrence frequency
      const orderedProducts = productIds
        .map((id) => products.find((p) => p.id === id))
        .filter(Boolean)
        .map(this.transformProduct);

      // Cache for 6 hours
      if (this.cacheService.set) {
        await this.cacheService.set(cacheKey, orderedProducts, { ttl: 21600 });
      }

      return orderedProducts;
    } catch (error) {
      this.handleError(
        "Error getting frequently bought together products",
        error
      );
    }
  }

  /**
   * Get trending/popular recommendations
   */
  async getTrendingRecommendations(
    options: RecommendationOptions = {}
  ): Promise<Product[]> {
    try {
      const { limit = 10 } = options;
      const cacheKey = `recommendations:trending:${JSON.stringify(options)}`;

      const cached = await this.cacheService.get<Product[]>(cacheKey);
      if (cached) return cached;

      // Get trending products based on recent sales, views, and ratings
      const trendingProducts = await this.getTrendingProducts(limit * 2);

      // Apply filters
      const filteredProducts = await this.applyFilters(
        trendingProducts.slice(0, limit),
        options
      );

      // Cache for 30 minutes (trending data changes frequently)
      if (this.cacheService.set) {
        await this.cacheService.set(cacheKey, filteredProducts, { ttl: 1800 });
      }

      return filteredProducts;
    } catch (error) {
      this.handleError("Error getting trending recommendations", error);
    }
  }

  /**
   * Get category-based recommendations
   */
  async getCategoryRecommendations(
    categoryId: string,
    options: RecommendationOptions = {}
  ): Promise<Product[]> {
    try {
      const { limit = 12, userId } = options;

      // Get user preferences if available
      let userBehavior: UserBehavior | null = null;
      if (userId) {
        userBehavior = await this.getUserBehavior(userId);
      }

      // Get top products in category
      const categoryProducts = await this.getTopCategoryProducts(
        categoryId,
        userBehavior,
        limit * 2
      );

      // Apply filters
      const filteredProducts = await this.applyFilters(
        categoryProducts.slice(0, limit),
        options
      );

      return filteredProducts;
    } catch (error) {
      this.handleError("Error getting category recommendations", error);
    }
  }

  /**
   * Get cross-sell recommendations (complementary products)
   */
  async getCrossSellRecommendations(
    cartItems: string[],
    options: RecommendationOptions = {}
  ): Promise<Product[]> {
    try {
      const { limit = 6 } = options;

      if (cartItems.length === 0) {
        return this.getTrendingRecommendations(options);
      }

      // Find complementary products for cart items
      const complementaryProducts = await this.findComplementaryProducts(
        cartItems,
        limit * 2
      );

      // Apply filters
      const filteredProducts = await this.applyFilters(
        complementaryProducts.slice(0, limit),
        options
      );

      return filteredProducts;
    } catch (error) {
      this.handleError("Error getting cross-sell recommendations", error);
    }
  }

  /**
   * Get upsell recommendations (higher-value alternatives)
   */
  async getUpsellRecommendations(
    productId: string,
    options: RecommendationOptions = {}
  ): Promise<Product[]> {
    try {
      const { limit = 4 } = options;

      const sourceProduct = await this.productRepository.findById(productId);
      if (!sourceProduct) {
        throw new AppError(
          "Product not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Find higher-value products in same category
      const upsellProducts = await this.findUpsellProducts(
        sourceProduct,
        limit * 2
      );

      // Apply filters
      const filteredProducts = await this.applyFilters(
        upsellProducts.slice(0, limit),
        options
      );

      return filteredProducts;
    } catch (error) {
      this.handleError("Error getting upsell recommendations", error);
    }
  }

  // Private helper methods

  private async getUserBehavior(userId: string): Promise<UserBehavior> {
    const cacheKey = `user-behavior:${userId}`;
    const cached = await this.cacheService.get<UserBehavior>(cacheKey);
    if (cached) return cached;

    const [orders, cart, wishlist, reviews] = await Promise.all([
      OrderModel.findMany({
        where: { userId, status: "DELIVERED" },
        include: { items: { include: { product: true } } },
      }),
      CartModel.findFirst({
        where: { userId },
      }),
      WishlistItemModel.findMany({
        where: { userId },
        include: { product: true },
      }),
      ProductReviewModel.findMany({
        where: { userId },
        include: { product: true },
      }),
    ]);

    const purchasedProducts = orders.flatMap((order) =>
      order.items.map((item) => item.productId)
    );

    const cartProducts: string[] = []; // Simplified since cartItems relationship doesn't exist
    const wishlistProducts = wishlist.map((item) => item.productId);
    const reviewedProducts = reviews.map((review) => review.productId);

    // Calculate category preferences
    const categoryPreferences: Record<string, number> = {};
    const brandPreferences: Record<string, number> = {};
    let totalSpent = 0;
    let minPrice = Infinity;
    let maxPrice = 0;

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const category = item.product.categoryId;
        const brand = null; // Brand field doesn't exist in schema
        const price = Number(item.product.price);

        categoryPreferences[category] =
          (categoryPreferences[category] || 0) + 1;
        if (brand) {
          brandPreferences[brand] = (brandPreferences[brand] || 0) + 1;
        }

        totalSpent += price * item.quantity;
        minPrice = Math.min(minPrice, price);
        maxPrice = Math.max(maxPrice, price);
      });
    });

    const totalItems = purchasedProducts.length;
    const avgPrice = totalItems > 0 ? totalSpent / totalItems : 0;

    const behavior: UserBehavior = {
      userId,
      viewedProducts: [], // Would come from analytics/tracking
      purchasedProducts,
      cartProducts,
      wishlistProducts,
      reviewedProducts,
      categoryPreferences,
      brandPreferences,
      priceRange: {
        min: minPrice === Infinity ? 0 : minPrice,
        max: maxPrice,
        avg: avgPrice,
      },
    };

    // Cache for 1 hour
    if (this.cacheService.set) {
      await this.cacheService.set(cacheKey, behavior, { ttl: 3600 });
    }
    return behavior;
  }

  private isNewUser(behavior: UserBehavior): boolean {
    return (
      behavior.purchasedProducts.length === 0 &&
      behavior.wishlistProducts.length === 0 &&
      behavior.reviewedProducts.length === 0
    );
  }

  private async getCollaborativeRecommendations(
    userId: string,
    userBehavior: UserBehavior,
    limit: number
  ): Promise<Product[]> {
    // Find users with similar behavior
    const similarUsers = await this.findSimilarUsers(userId, userBehavior);

    // Get products purchased by similar users
    const recommendedProductIds = new Set<string>();

    for (const similarUser of similarUsers.slice(0, 10)) {
      const userOrders = await OrderModel.findMany({
        where: { userId: similarUser.userId, status: "DELIVERED" },
        include: { items: true },
      });

      userOrders.forEach((order) => {
        order.items.forEach((item) => {
          if (!userBehavior.purchasedProducts.includes(item.productId)) {
            recommendedProductIds.add(item.productId);
          }
        });
      });
    }

    // Get product details - use ProductModel since findManyByIds doesn't exist
    const products = await ProductModel.findMany({
      where: { id: { in: Array.from(recommendedProductIds).slice(0, limit) } },
      include: {
        category: true,
        images: { take: 1 },
      },
    });

    return products.map(this.transformProduct);
  }

  private async getContentBasedRecommendations(
    userId: string,
    userBehavior: UserBehavior,
    limit: number
  ): Promise<Product[]> {
    // Get user's preferred categories and brands
    const topCategories = Object.entries(userBehavior.categoryPreferences)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([categoryId]) => categoryId);

    const topBrands = Object.entries(userBehavior.brandPreferences)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([brand]) => brand);

    // Find products matching user preferences
    const where: any = {
      isActive: true,
      id: { notIn: userBehavior.purchasedProducts },
    };

    if (topCategories.length > 0) {
      where.categoryId = { in: topCategories };
    }

    // Brand filter removed since brand field doesn't exist in schema
    // if (topBrands.length > 0) {
    //   where.brand = { in: topBrands };
    // }

    // Price range filter
    if (userBehavior.priceRange.avg > 0) {
      const minPrice = userBehavior.priceRange.avg * 0.7;
      const maxPrice = userBehavior.priceRange.avg * 1.5;
      where.price = { gte: minPrice, lte: maxPrice };
    }

    const products = await ProductModel.findMany({
      where,
      include: {
        category: true,
        images: { take: 1 },
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return products.map(this.transformProduct);
  }

  private async findSimilarProducts(
    sourceProduct: Product,
    limit: number
  ): Promise<Product[]> {
    const where: any = {
      isActive: true,
      id: { not: sourceProduct.id },
    };

    // Same category first priority
    where.categoryId = sourceProduct.categoryId;

    let products = await ProductModel.findMany({
      where,
      include: {
        category: true,
        images: { take: 1 },
      },
      take: limit,
    });

    // If not enough products in same category, expand to same brand
    if (products.length < limit && sourceProduct.brand) {
      const brandProducts = await ProductModel.findMany({
        where: {
          isActive: true,
          id: {
            not: sourceProduct.id,
            notIn: products.map((p) => p.id),
          },
          // brand field doesn't exist in schema
        },
        include: {
          category: true,
          images: { take: 1 },
        },
        take: limit - products.length,
      });

      products = [...products, ...brandProducts];
    }

    return products.map(this.transformProduct);
  }

  private rankBySimilarity(
    sourceProduct: Product,
    products: Product[]
  ): Product[] {
    return products
      .map((product) => ({
        product,
        similarity: this.calculateSimilarity(sourceProduct, product),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .map(({ product }) => product);
  }

  private calculateSimilarity(product1: Product, product2: Product): number {
    let similarity = 0;

    // Category match (highest weight)
    if (product1.categoryId === product2.categoryId) {
      similarity += 0.4;
    }

    // Brand match - simplified since brand field doesn't exist
    // if (product1.brand && product2.brand && product1.brand === product2.brand) {
    //   similarity += 0.3;
    // }

    // Price similarity (within 50% range)
    const priceDiff = Math.abs(Number(product1.price) - Number(product2.price));
    const avgPrice = (Number(product1.price) + Number(product2.price)) / 2;
    const priceRatio = priceDiff / avgPrice;

    if (priceRatio <= 0.5) {
      similarity += 0.2 * (1 - priceRatio);
    }

    // Feature flags similarity
    if (product1.isFeatured === product2.isFeatured) {
      similarity += 0.1;
    }

    return similarity;
  }

  private async getProductCoOccurrence(productId: string): Promise<
    Array<{
      productId: string;
      coOccurrenceCount: number;
    }>
  > {
    // Find orders containing the source product
    const ordersWithProduct = await OrderModel.findMany({
      where: {
        items: {
          some: { productId },
        },
        status: "DELIVERED",
      },
      include: {
        items: true,
      },
    });

    // Count co-occurrences
    const coOccurrenceCounts: Record<string, number> = {};

    ordersWithProduct.forEach((order) => {
      order.items.forEach((item) => {
        if (item.productId !== productId) {
          coOccurrenceCounts[item.productId] =
            (coOccurrenceCounts[item.productId] || 0) + 1;
        }
      });
    });

    return Object.entries(coOccurrenceCounts)
      .map(([productId, count]) => ({
        productId,
        coOccurrenceCount: count,
      }))
      .sort((a, b) => b.coOccurrenceCount - a.coOccurrenceCount);
  }

  private async getTrendingProducts(limit: number): Promise<Product[]> {
    // Calculate trending score based on recent sales and ratings
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trendingData = await OrderModel.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: "DELIVERED",
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                images: { take: 1 },
                reviews: {
                  where: { isApproved: true },
                  select: { rating: true },
                },
              },
            },
          },
        },
      },
    });

    // Calculate trending scores
    const productScores: Record<
      string,
      {
        product: any;
        salesCount: number;
        totalRevenue: number;
        avgRating: number;
        trendingScore: number;
      }
    > = {};

    trendingData.forEach((order) => {
      order.items?.forEach((item) => {
        const productId = item.productId;
        const product = item.product;

        if (!productScores[productId]) {
          const avgRating =
            product.reviews.length > 0
              ? product.reviews.reduce(
                  (sum: number, r: any) => sum + r.rating,
                  0
                ) / product.reviews.length
              : 0;

          productScores[productId] = {
            product,
            salesCount: 0,
            totalRevenue: 0,
            avgRating,
            trendingScore: 0,
          };
        }

        productScores[productId].salesCount += item.quantity;
        productScores[productId].totalRevenue += Number(item.quantity) * Number(item.product.price);
      });
    });

    // Calculate trending scores
    Object.values(productScores).forEach((data) => {
      // Trending score = (sales_count * 0.4) + (revenue_normalized * 0.4) + (rating * 0.2)
      const salesScore = Math.min(data.salesCount / 10, 10); // Normalize to 0-10
      const revenueScore = Math.min(data.totalRevenue / 100000, 10); // Normalize to 0-10
      const ratingScore = data.avgRating; // Already 0-5, scale to 0-10

      data.trendingScore =
        salesScore * 0.4 + revenueScore * 0.4 + ratingScore * 0.2;
    });

    return Object.values(productScores)
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit)
      .map((data) => this.transformProduct(data.product));
  }

  private async getTopCategoryProducts(
    categoryId: string,
    userBehavior: UserBehavior | null,
    limit: number
  ): Promise<Product[]> {
    const where: any = {
      categoryId,
      isActive: true,
    };

    // If user has behavior data, prefer their price range
    if (userBehavior && userBehavior.priceRange.avg > 0) {
      const minPrice = userBehavior.priceRange.avg * 0.5;
      const maxPrice = userBehavior.priceRange.avg * 2;
      where.price = { gte: minPrice, lte: maxPrice };
    }

    const products = await ProductModel.findMany({
      where,
      include: {
        category: true,
        images: { take: 1 },
        reviews: {
          where: { isApproved: true },
          select: { rating: true },
        },
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return products.map(this.transformProduct);
  }

  private async findComplementaryProducts(
    cartItemIds: string[],
    limit: number
  ): Promise<Product[]> {
    // Find products frequently bought with cart items
    const complementaryIds = new Set<string>();

    for (const itemId of cartItemIds) {
      const coOccurrence = await this.getProductCoOccurrence(itemId);
      coOccurrence.slice(0, 5).forEach(({ productId }) => {
        if (!cartItemIds.includes(productId)) {
          complementaryIds.add(productId);
        }
      });
    }

    const products = await ProductModel.findMany({
      where: { id: { in: Array.from(complementaryIds).slice(0, limit) } },
      include: {
        category: true,
        images: { take: 1 },
      },
    });

    return products.map(this.transformProduct);
  }

  private async findUpsellProducts(
    sourceProduct: Product,
    limit: number
  ): Promise<Product[]> {
    const minPrice = Number(sourceProduct.price) * 1.2; // 20% higher
    const maxPrice = Number(sourceProduct.price) * 3; // Up to 3x price

    const products = await ProductModel.findMany({
      where: {
        categoryId: sourceProduct.categoryId,
        isActive: true,
        id: { not: sourceProduct.id },
        price: { gte: minPrice, lte: maxPrice },
      },
      include: {
        category: true,
        images: { take: 1 },
      },
      orderBy: [
        { isFeatured: "desc" },
        { price: "asc" }, // Start with lower upsell prices
      ],
      take: limit,
    });

    return products.map(this.transformProduct);
  }

  private async findSimilarUsers(
    userId: string,
    userBehavior: UserBehavior
  ): Promise<Array<{ userId: string; similarity: number }>> {
    // Simple implementation - in production, you'd use more sophisticated algorithms
    const otherUsers = await OrderModel.findMany({
      where: {
        userId: { not: userId },
        status: "DELIVERED",
      },
      include: {
        items: true,
        user: true,
      },
      distinct: ["userId"],
    });

    const userSimilarities = new Map<string, number>();

    otherUsers.forEach((order) => {
      const otherUserId = order.userId;
      const purchasedProducts = order.items?.map((item) => item.productId) || [];

      // Calculate Jaccard similarity
      const intersection = userBehavior.purchasedProducts.filter((productId) =>
        purchasedProducts.includes(productId)
      ).length;

      const union = new Set([
        ...userBehavior.purchasedProducts,
        ...purchasedProducts,
      ]).size;

      const similarity = union > 0 ? intersection / union : 0;

      if (similarity > 0) {
        userSimilarities.set(
          otherUserId,
          Math.max(userSimilarities.get(otherUserId) || 0, similarity)
        );
      }
    });

    return Array.from(userSimilarities.entries())
      .map(([userId, similarity]) => ({ userId, similarity }))
      .sort((a, b) => b.similarity - a.similarity);
  }

  private mergeRecommendations(
    sources: Array<{ recommendations: Product[]; weight: number }>,
    limit: number
  ): Product[] {
    const productScores = new Map<
      string,
      { product: Product; score: number }
    >();

    sources.forEach(({ recommendations, weight }) => {
      recommendations.forEach((product, index) => {
        const positionScore = 1 - index / recommendations.length;
        const weightedScore = positionScore * weight;

        const existing = productScores.get(product.id);
        if (existing) {
          existing.score += weightedScore;
        } else {
          productScores.set(product.id, {
            product,
            score: weightedScore,
          });
        }
      });
    });

    return Array.from(productScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ product }) => product);
  }

  private async applyFilters(
    products: Product[],
    options: RecommendationOptions
  ): Promise<Product[]> {
    let filtered = [...products];

    // Filter out of stock - simplified since inventory relationship doesn't exist in Product type
    if (options.excludeOutOfStock) {
      filtered = filtered.filter(
        (product) => (product as any).stock > 0
      );
    }

    // Include/exclude categories
    if (options.includeCategories?.length) {
      filtered = filtered.filter((product) =>
        options.includeCategories!.includes(product.categoryId)
      );
    }

    if (options.excludeCategories?.length) {
      filtered = filtered.filter(
        (product) => !options.excludeCategories!.includes(product.categoryId)
      );
    }

    // Price range filter
    if (options.priceRange) {
      filtered = filtered.filter((product) => {
        const price = Number(product.price);
        return (
          (!options.priceRange!.min || price >= options.priceRange!.min) &&
          (!options.priceRange!.max || price <= options.priceRange!.max)
        );
      });
    }

    return filtered;
  }

  private transformProduct(product: any): Product {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      shortDescription: product.shortDescription,
      sku: product.sku,
      price: Number(product.price),
      comparePrice: product.comparePrice
        ? Number(product.comparePrice)
        : undefined,
      categoryId: product.categoryId,
      brand: null, // Brand field doesn't exist in schema
      weight: product.weight ? Number(product.weight) : undefined,
      dimensions: product.dimensions,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      category: product.category,
      images: product.images || [],
      // inventory: null, // Inventory field doesn't exist in Product type
      reviews: product.reviews || [],
      averageRating:
        product.reviews?.length > 0
          ? product.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) /
            product.reviews.length
          : 0,
      totalReviews: product.reviews?.length || 0,
      isInStock: (product as any).stock > 0,
      discountPercentage: product.comparePrice
        ? Math.round(
            ((Number(product.comparePrice) - Number(product.price)) /
              Number(product.comparePrice)) *
              100
          )
        : undefined,
    };
  }
}
