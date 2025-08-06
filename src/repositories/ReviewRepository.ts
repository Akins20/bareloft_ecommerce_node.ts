import { PrismaClient } from "@prisma/client";
import { BaseRepository } from "./BaseRepository";
import {
  ProductReview,
  CreateReviewRequest,
  UpdateReviewRequest,
  ReviewQueryParams,
  PaginationMeta,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
  OrderStatus,
} from "../types";

interface CreateReviewData {
  productId: string;
  userId: string;
  orderId?: string;
  rating: number;
  title?: string;
  comment?: string;
  isVerified: boolean;
  isApproved: boolean;
  helpfulVotes: number;
}

interface UpdateReviewData {
  rating?: number;
  title?: string;
  comment?: string;
  isApproved?: boolean;
  helpfulVotes?: number;
}

export class ReviewRepository extends BaseRepository<
  ProductReview,
  CreateReviewData,
  UpdateReviewData
> {
  constructor(prisma?: PrismaClient) {
    super(prisma || new PrismaClient(), "productReview");
  }

  /**
   * Get reviews for a specific product
   */
  async findByProductId(
    productId: string,
    params?: ReviewQueryParams
  ): Promise<{
    data: ProductReview[];
    pagination: PaginationMeta;
    summary: {
      totalReviews: number;
      averageRating: number;
      ratingDistribution: { rating: number; count: number }[];
    };
  }> {
    try {
      const where = {
        productId,
        isApproved: true,
        ...(params?.rating && { rating: params.rating }),
        ...(params?.isVerified !== undefined && {
          isVerified: params.isVerified,
        }),
      };

      // Get reviews with pagination
      const result = await this.findMany(where, {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
        orderBy: this.buildOrderBy(params?.sortBy, params?.sortOrder),
        pagination: {
          page: params?.page,
          limit: params?.limit,
        },
      });

      // Get summary statistics
      const [totalStats, ratingDistribution] = await Promise.all([
        this.aggregate(
          { productId, isApproved: true },
          {
            _count: { id: true },
            _avg: { rating: true },
          }
        ),
        this.groupBy(["rating"], { productId, isApproved: true }, undefined, {
          _count: { rating: true },
        }),
      ]);

      const summary = {
        totalReviews: totalStats._count.id || 0,
        averageRating: Number(totalStats._avg.rating?.toFixed(1)) || 0,
        ratingDistribution: ratingDistribution.map((item: any) => ({
          rating: item.rating,
          count: item._count.rating,
        })),
      };

      return {
        data: result.data,
        pagination: result.pagination,
        summary,
      };
    } catch (error) {
      throw new AppError(
        "Error fetching product reviews",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Get reviews by user
   */
  async findByUserId(
    userId: string,
    params?: ReviewQueryParams
  ): Promise<{
    data: ProductReview[];
    pagination: PaginationMeta;
  }> {
    try {
      const where = {
        userId,
        ...(params?.productId && { productId: params.productId }),
        ...(params?.rating && { rating: params.rating }),
      };

      return await this.findMany(where, {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: {
                where: { isPrimary: true },
                select: { imageUrl: true },
                take: 1,
              },
            },
          },
        },
        orderBy: this.buildOrderBy(params?.sortBy, params?.sortOrder),
        pagination: {
          page: params?.page,
          limit: params?.limit,
        },
      });
    } catch (error) {
      throw new AppError(
        "Error fetching user reviews",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Create new review
   */
  async createReview(
    userId: string,
    data: CreateReviewRequest
  ): Promise<ProductReview> {
    try {
      const result = await this.transaction(async (prisma) => {
        // Check if user already reviewed this product
        const existingReview = await prisma.productReview.findFirst({
          where: {
            productId: data.productId,
            userId,
          },
        });

        if (existingReview) {
          throw new AppError(
            "You have already reviewed this product",
            HTTP_STATUS.CONFLICT,
            ERROR_CODES.RESOURCE_ALREADY_EXISTS
          );
        }

        // Check if user purchased this product (verified review)
        const purchaseOrder = await prisma.order.findFirst({
          where: {
            userId,
            status: "DELIVERED",
            items: {
              some: {
                productId: data.productId,
              },
            },
          },
          include: {
            items: {
              where: { productId: data.productId },
              take: 1,
            },
          },
        });

        const reviewData: CreateReviewData = {
          productId: data.productId,
          userId,
          orderId: purchaseOrder?.id,
          rating: data.rating,
          title: data.title,
          comment: data.comment,
          isVerified: !!purchaseOrder,
          isApproved: true, // Auto-approve for now
          helpfulVotes: 0,
        };

        const review = await prisma.productReview.create({
          data: reviewData,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
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
        });

        // Update product average rating
        await this.updateProductRating(data.productId);

        return review as ProductReview;
      });
      return result;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        "Error creating review",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Update review
   */
  async updateReview(
    reviewId: string,
    userId: string,
    data: UpdateReviewRequest
  ): Promise<ProductReview> {
    try {
      const result = await this.transaction(async (prisma) => {
        // Verify review belongs to user
        const existingReview = await prisma.productReview.findFirst({
          where: { id: reviewId, userId },
        });

        if (!existingReview) {
          throw new AppError(
            "Review not found",
            HTTP_STATUS.NOT_FOUND,
            ERROR_CODES.RESOURCE_NOT_FOUND
          );
        }

        const updatedReview = await prisma.productReview.update({
          where: { id: reviewId },
          data,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
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
        });

        // Update product rating if rating changed
        if (data.rating) {
          await this.updateProductRating(existingReview.productId);
        }

        return updatedReview as ProductReview;
      });
      return result;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        "Error updating review",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Delete review
   */
  async deleteReview(reviewId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.transaction(async (prisma) => {
        // Verify review belongs to user
        const existingReview = await prisma.productReview.findFirst({
          where: { id: reviewId, userId },
        });

        if (!existingReview) {
          throw new AppError(
            "Review not found",
            HTTP_STATUS.NOT_FOUND,
            ERROR_CODES.RESOURCE_NOT_FOUND
          );
        }

        await prisma.productReview.delete({
          where: { id: reviewId },
        });

        // Update product rating
        await this.updateProductRating(existingReview.productId);

        return true;
      });
      return result;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        "Error deleting review",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Add helpful vote to review
   */
  async addHelpfulVote(reviewId: string): Promise<ProductReview> {
    try {
      return await this.prisma.productReview.update({
        where: { id: reviewId },
        data: { helpfulVotes: { increment: 1 } },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
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
      }) as ProductReview;
    } catch (error) {
      throw new AppError(
        "Error adding helpful vote",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Get reviews requiring moderation (admin)
   */
  async getPendingReviews(params?: ReviewQueryParams): Promise<{
    data: ProductReview[];
    pagination: PaginationMeta;
  }> {
    try {
      return await this.findMany(
        { isApproved: false },
        {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
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
          pagination: {
            page: params?.page,
            limit: params?.limit,
          },
        }
      );
    } catch (error) {
      throw new AppError(
        "Error fetching pending reviews",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Approve/reject review (admin)
   */
  async moderateReview(
    reviewId: string,
    isApproved: boolean
  ): Promise<ProductReview> {
    try {
      const result = await this.transaction(async (prisma) => {
        const review = await prisma.productReview.update({
          where: { id: reviewId },
          data: { isApproved },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
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
        });

        // Update product rating if approved
        if (isApproved) {
          await this.updateProductRating(review.productId);
        }

        return review as ProductReview;
      });
      return result;
    } catch (error) {
      throw new AppError(
        "Error moderating review",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Get review statistics for admin dashboard
   */
  async getReviewStats(): Promise<{
    totalReviews: number;
    pendingReviews: number;
    averageRating: number;
    reviewsByRating: { rating: number; count: number }[];
    recentReviews: ProductReview[];
  }> {
    try {
      const [totalStats, pendingCount, ratingDistribution, recentReviews] =
        await Promise.all([
          this.aggregate(
            { isApproved: true },
            {
              _count: { id: true },
              _avg: { rating: true },
            }
          ),
          this.count({ isApproved: false }),
          this.groupBy(["rating"], { isApproved: true }, undefined, {
            _count: { rating: true },
          }),
          this.findMany(
            { isApproved: true },
            {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
                product: {
                  select: {
                    name: true,
                  },
                },
              },
              orderBy: { createdAt: "desc" },
              pagination: { page: 1, limit: 10 },
            }
          ),
        ]);

      return {
        totalReviews: totalStats._count.id || 0,
        pendingReviews: pendingCount,
        averageRating: Number(totalStats._avg.rating?.toFixed(1)) || 0,
        reviewsByRating: ratingDistribution.map((item: any) => ({
          rating: item.rating,
          count: item._count.rating,
        })),
        recentReviews: recentReviews.data,
      };
    } catch (error) {
      throw new AppError(
        "Error fetching review statistics",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Private: Update product average rating
   */
  private async updateProductRating(productId: string): Promise<void> {
    try {
      const stats = await this.aggregate(
        { productId, isApproved: true },
        {
          _avg: { rating: true },
          _count: { id: true },
        }
      );

      const averageRating = stats._avg.rating
        ? Number(stats._avg.rating.toFixed(1))
        : 0;

      await this.prisma.product.update({
        where: { id: productId },
        data: {
          // Note: You may need to add these fields to your Product model
          // averageRating,
          // totalReviews: stats._count.id
        },
      });
    } catch (error) {
      console.error("Error updating product rating:", error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Protected: Build order by clause for reviews
   */
  protected buildOrderBy(sortBy?: string, sortOrder?: "asc" | "desc"): any {
    const order = sortOrder || "desc";

    switch (sortBy) {
      case "rating":
        return { rating: order };
      case "helpful":
        return { helpfulVotes: order };
      case "created":
        return { createdAt: order };
      default:
        return { createdAt: "desc" };
    }
  }
}
