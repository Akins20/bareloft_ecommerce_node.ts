import { BaseService } from "../BaseService";
import { ProductReviewModel } from "../../models";
import { UserRepository } from "../../repositories/UserRepository";
import { ProductRepository } from "../../repositories/ProductRepository";
import { OrderRepository } from "../../repositories/OrderRepository";
import {
  CreateReviewRequest,
  UpdateReviewRequest,
  ReviewQueryParams,
  ProductReview,
  PublicUser,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
  PaginationMeta,
} from "../../types";
import { CacheService } from "../cache/CacheService";
import { NotificationService } from "../notifications/NotificationService";

export class ReviewService extends BaseService {
  private userRepository: UserRepository;
  private productRepository: ProductRepository;
  private orderRepository: OrderRepository;
  private cacheService: CacheService;
  private notificationService: NotificationService;

  constructor(
    userRepository: UserRepository,
    productRepository: ProductRepository,
    orderRepository: OrderRepository,
    cacheService: CacheService,
    notificationService: NotificationService
  ) {
    super();
    this.userRepository = userRepository;
    this.productRepository = productRepository;
    this.orderRepository = orderRepository;
    this.cacheService = cacheService;
    this.notificationService = notificationService;
  }

  /**
   * Create a new product review
   * Validates purchase history for verification
   */
  async createReview(
    userId: string,
    request: CreateReviewRequest
  ): Promise<{ review: ProductReview; isVerifiedPurchase: boolean }> {
    try {
      // Validate product exists
      const product = await this.productRepository.findById(request.productId);
      if (!product) {
        throw new AppError(
          "Product not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Check if user already reviewed this product
      const existingReview = await ProductReviewModel.findFirst({
        where: {
          productId: request.productId,
          userId: userId,
        },
      });

      if (existingReview) {
        throw new AppError(
          "You have already reviewed this product",
          HTTP_STATUS.CONFLICT,
          ERROR_CODES.RESOURCE_ALREADY_EXISTS
        );
      }

      // Check for verified purchase
      const verifiedPurchase = await this.checkVerifiedPurchase(
        userId,
        request.productId
      );

      // Validate rating
      if (request.rating < 1 || request.rating > 5) {
        throw new AppError(
          "Rating must be between 1 and 5",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Create review
      const review = await ProductReviewModel.create({
        data: {
          productId: request.productId,
          userId: userId,
          orderId: verifiedPurchase?.orderId || null,
          rating: request.rating,
          title: request.title?.trim(),
          comment: request.comment?.trim(),
          isVerified: !!verifiedPurchase,
          isApproved: true, // Auto-approve for now
          helpfulVotes: 0,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              isVerified: true,
            },
          },
        },
      });

      // Clear product cache
      await this.clearProductCache(request.productId);

      // Send notification to product owner/admin
      if (verifiedPurchase) {
        await this.notificationService.sendNotification({
          type: "PRODUCT_REVIEW_ADDED",
          channel: "EMAIL",
          recipient: {
            email: "admin@bareloft.com", // Admin notification
          },
          variables: {
            productName: product.name,
            rating: request.rating,
            reviewerName: `${review.user.firstName} ${review.user.lastName}`,
            isVerified: true,
          },
        });
      }

      return {
        review: this.transformReview(review),
        isVerifiedPurchase: !!verifiedPurchase,
      };
    } catch (error) {
      this.handleError("Error creating review", error);
    }
  }

  /**
   * Get reviews for a product with pagination and filtering
   */
  async getProductReviews(
    productId: string,
    params: ReviewQueryParams = {}
  ): Promise<{
    reviews: ProductReview[];
    pagination: PaginationMeta;
    summary: ReviewSummary;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        rating,
        isVerified,
        sortBy = "created",
        sortOrder = "desc",
      } = params;

      // Build where clause
      const where: any = {
        productId,
        isApproved: true,
      };

      if (rating !== undefined) {
        where.rating = rating;
      }

      if (isVerified !== undefined) {
        where.isVerified = isVerified;
      }

      // Build order clause
      const orderBy: any = {};
      switch (sortBy) {
        case "rating":
          orderBy.rating = sortOrder;
          break;
        case "helpful":
          orderBy.helpfulVotes = sortOrder;
          break;
        case "created":
        default:
          orderBy.createdAt = sortOrder;
          break;
      }

      // Execute queries
      const [reviews, total, summary] = await Promise.all([
        ProductReviewModel.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
                isVerified: true,
              },
            },
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
        ProductReviewModel.count({ where }),
        this.getReviewSummary(productId),
      ]);

      const pagination = this.createPagination(page, limit, total);

      return {
        reviews: reviews.map(this.transformReview),
        pagination,
        summary,
      };
    } catch (error) {
      this.handleError("Error fetching product reviews", error);
    }
  }

  /**
   * Get review summary for a product (rating distribution, averages)
   */
  async getReviewSummary(productId: string): Promise<ReviewSummary> {
    try {
      const cacheKey = `review-summary:${productId}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached;

      const reviews = await ProductReviewModel.findMany({
        where: {
          productId,
          isApproved: true,
        },
        select: {
          rating: true,
          isVerified: true,
        },
      });

      if (reviews.length === 0) {
        return {
          totalReviews: 0,
          averageRating: 0,
          verifiedReviews: 0,
          ratingDistribution: {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
          },
        };
      }

      const totalReviews = reviews.length;
      const verifiedReviews = reviews.filter((r) => r.isVerified).length;
      const averageRating =
        reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;

      const ratingDistribution = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };

      reviews.forEach((review) => {
        ratingDistribution[review.rating as keyof typeof ratingDistribution]++;
      });

      const summary = {
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        verifiedReviews,
        ratingDistribution,
      };

      // Cache for 30 minutes
      await this.cacheService.set(cacheKey, summary, 1800);

      return summary;
    } catch (error) {
      this.handleError("Error getting review summary", error);
    }
  }

  /**
   * Update an existing review
   */
  async updateReview(
    userId: string,
    reviewId: string,
    request: UpdateReviewRequest
  ): Promise<ProductReview> {
    try {
      // Find and verify ownership
      const existingReview = await ProductReviewModel.findFirst({
        where: {
          id: reviewId,
          userId: userId,
        },
      });

      if (!existingReview) {
        throw new AppError(
          "Review not found or you do not have permission to edit it",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Validate rating if provided
      if (request.rating && (request.rating < 1 || request.rating > 5)) {
        throw new AppError(
          "Rating must be between 1 and 5",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Update review
      const updatedReview = await ProductReviewModel.update({
        where: { id: reviewId },
        data: {
          rating: request.rating,
          title: request.title?.trim(),
          comment: request.comment?.trim(),
          updatedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              isVerified: true,
            },
          },
        },
      });

      // Clear caches
      await this.clearProductCache(existingReview.productId);

      return this.transformReview(updatedReview);
    } catch (error) {
      this.handleError("Error updating review", error);
    }
  }

  /**
   * Delete a review
   */
  async deleteReview(userId: string, reviewId: string): Promise<void> {
    try {
      // Find and verify ownership
      const review = await ProductReviewModel.findFirst({
        where: {
          id: reviewId,
          userId: userId,
        },
      });

      if (!review) {
        throw new AppError(
          "Review not found or you do not have permission to delete it",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Delete review
      await ProductReviewModel.delete({
        where: { id: reviewId },
      });

      // Clear caches
      await this.clearProductCache(review.productId);
    } catch (error) {
      this.handleError("Error deleting review", error);
    }
  }

  /**
   * Mark review as helpful
   */
  async markReviewHelpful(reviewId: string): Promise<{ helpfulVotes: number }> {
    try {
      const updatedReview = await ProductReviewModel.update({
        where: { id: reviewId },
        data: {
          helpfulVotes: {
            increment: 1,
          },
        },
      });

      return { helpfulVotes: updatedReview.helpfulVotes };
    } catch (error) {
      this.handleError("Error marking review as helpful", error);
    }
  }

  /**
   * Get user's reviews with pagination
   */
  async getUserReviews(
    userId: string,
    params: ReviewQueryParams = {}
  ): Promise<{
    reviews: ProductReview[];
    pagination: PaginationMeta;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = "created",
        sortOrder = "desc",
      } = params;

      const where = {
        userId,
        isApproved: true,
      };

      const orderBy: any = {};
      switch (sortBy) {
        case "rating":
          orderBy.rating = sortOrder;
          break;
        case "helpful":
          orderBy.helpfulVotes = sortOrder;
          break;
        case "created":
        default:
          orderBy.createdAt = sortOrder;
          break;
      }

      const [reviews, total] = await Promise.all([
        ProductReviewModel.findMany({
          where,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: {
                  where: { isPrimary: true },
                  select: { imageUrl: true },
                },
              },
            },
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
        ProductReviewModel.count({ where }),
      ]);

      const pagination = this.createPagination(page, limit, total);

      return {
        reviews: reviews.map((review) => ({
          ...this.transformReview(review),
          product: {
            id: review.product.id,
            name: review.product.name,
            slug: review.product.slug,
            primaryImage: review.product.images[0]?.imageUrl,
          },
        })),
        pagination,
      };
    } catch (error) {
      this.handleError("Error fetching user reviews", error);
    }
  }

  /**
   * Get review analytics for admin dashboard
   */
  async getReviewAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<ReviewAnalytics> {
    try {
      const dateFilter: any = {};
      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.gte = startDate;
        if (endDate) dateFilter.createdAt.lte = endDate;
      }

      const [
        totalReviews,
        approvedReviews,
        verifiedReviews,
        averageRating,
        ratingDistribution,
        recentReviews,
        topRatedProducts,
      ] = await Promise.all([
        ProductReviewModel.count({ where: dateFilter }),
        ProductReviewModel.count({
          where: { ...dateFilter, isApproved: true },
        }),
        ProductReviewModel.count({
          where: { ...dateFilter, isVerified: true },
        }),
        this.getAverageRating(dateFilter),
        this.getRatingDistribution(dateFilter),
        this.getRecentReviews(5),
        this.getTopRatedProducts(10),
      ]);

      return {
        totalReviews,
        approvedReviews,
        pendingReviews: totalReviews - approvedReviews,
        verifiedReviews,
        averageRating,
        ratingDistribution,
        recentReviews,
        topRatedProducts,
        reviewsOverTime: await this.getReviewsOverTime(startDate, endDate),
      };
    } catch (error) {
      this.handleError("Error fetching review analytics", error);
    }
  }

  /**
   * Admin: Moderate review (approve/reject)
   */
  async moderateReview(
    reviewId: string,
    action: "approve" | "reject",
    adminId: string,
    reason?: string
  ): Promise<ProductReview> {
    try {
      const review = await ProductReviewModel.findUnique({
        where: { id: reviewId },
        include: {
          user: true,
          product: true,
        },
      });

      if (!review) {
        throw new AppError(
          "Review not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      const updatedReview = await ProductReviewModel.update({
        where: { id: reviewId },
        data: {
          isApproved: action === "approve",
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              isVerified: true,
            },
          },
        },
      });

      // Notify user of moderation decision
      await this.notificationService.sendNotification({
        type: action === "approve" ? "REVIEW_APPROVED" : "REVIEW_REJECTED",
        channel: "EMAIL",
        userId: review.userId,
        recipient: {
          email: review.user.email,
          name: `${review.user.firstName} ${review.user.lastName}`,
        },
        variables: {
          productName: review.product.name,
          reason: reason || "",
        },
      });

      // Clear caches
      await this.clearProductCache(review.productId);

      return this.transformReview(updatedReview);
    } catch (error) {
      this.handleError("Error moderating review", error);
    }
  }

  // Private helper methods

  private async checkVerifiedPurchase(
    userId: string,
    productId: string
  ): Promise<{ orderId: string } | null> {
    const purchase = await this.orderRepository.findVerifiedPurchase(
      userId,
      productId
    );
    return purchase ? { orderId: purchase.id } : null;
  }

  private async clearProductCache(productId: string): Promise<void> {
    await Promise.all([
      this.cacheService.delete(`review-summary:${productId}`),
      this.cacheService.delete(`product:${productId}`),
      this.cacheService.deletePattern(`product-reviews:${productId}:*`),
    ]);
  }

  private transformReview(review: any): ProductReview {
    return {
      id: review.id,
      productId: review.productId,
      userId: review.userId,
      orderId: review.orderId,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      isVerified: review.isVerified,
      isApproved: review.isApproved,
      helpfulVotes: review.helpfulVotes,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      user: review.user
        ? {
            id: review.user.id,
            firstName: review.user.firstName,
            lastName: review.user.lastName,
            avatar: review.user.avatar,
            isVerified: review.user.isVerified,
          }
        : undefined,
    };
  }

  private async getAverageRating(dateFilter: any): Promise<number> {
    const result = await ProductReviewModel.aggregate({
      where: { ...dateFilter, isApproved: true },
      _avg: { rating: true },
    });
    return Math.round((result._avg.rating || 0) * 10) / 10;
  }

  private async getRatingDistribution(
    dateFilter: any
  ): Promise<Record<number, number>> {
    const reviews = await ProductReviewModel.findMany({
      where: { ...dateFilter, isApproved: true },
      select: { rating: true },
    });

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((review) => {
      distribution[review.rating as keyof typeof distribution]++;
    });

    return distribution;
  }

  private async getRecentReviews(limit: number): Promise<ProductReview[]> {
    const reviews = await ProductReviewModel.findMany({
      where: { isApproved: true },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            isVerified: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return reviews.map(this.transformReview);
  }

  private async getTopRatedProducts(limit: number): Promise<any[]> {
    const products = await ProductReviewModel.groupBy({
      by: ["productId"],
      where: { isApproved: true },
      _avg: { rating: true },
      _count: { rating: true },
      having: {
        rating: {
          _count: {
            gte: 5, // At least 5 reviews
          },
        },
      },
      orderBy: {
        _avg: {
          rating: "desc",
        },
      },
      take: limit,
    });

    // Get product details
    const productDetails = await Promise.all(
      products.map(async (p) => {
        const product = await this.productRepository.findById(p.productId);
        return {
          productId: p.productId,
          productName: product?.name,
          averageRating: Math.round((p._avg.rating || 0) * 10) / 10,
          reviewCount: p._count.rating,
        };
      })
    );

    return productDetails;
  }

  private async getReviewsOverTime(
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ date: string; count: number; averageRating: number }>> {
    // Implementation for time-series data
    // This would typically use database-specific functions for grouping by date
    return [];
  }
}

interface ReviewSummary {
  totalReviews: number;
  averageRating: number;
  verifiedReviews: number;
  ratingDistribution: Record<number, number>;
}

interface ReviewAnalytics {
  totalReviews: number;
  approvedReviews: number;
  pendingReviews: number;
  verifiedReviews: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  recentReviews: ProductReview[];
  topRatedProducts: any[];
  reviewsOverTime: Array<{
    date: string;
    count: number;
    averageRating: number;
  }>;
}
