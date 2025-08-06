"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewRepository = void 0;
const client_1 = require("@prisma/client");
const BaseRepository_1 = require("./BaseRepository");
const types_1 = require("../types");
class ReviewRepository extends BaseRepository_1.BaseRepository {
    constructor(prisma) {
        super(prisma || new client_1.PrismaClient(), "productReview");
    }
    /**
     * Get reviews for a specific product
     */
    async findByProductId(productId, params) {
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
                this.aggregate({ productId, isApproved: true }, {
                    _count: { id: true },
                    _avg: { rating: true },
                }),
                this.groupBy(["rating"], { productId, isApproved: true }, undefined, {
                    _count: { rating: true },
                }),
            ]);
            const summary = {
                totalReviews: totalStats._count.id || 0,
                averageRating: Number(totalStats._avg.rating?.toFixed(1)) || 0,
                ratingDistribution: ratingDistribution.map((item) => ({
                    rating: item.rating,
                    count: item._count.rating,
                })),
            };
            return {
                data: result.data,
                pagination: result.pagination,
                summary,
            };
        }
        catch (error) {
            throw new types_1.AppError("Error fetching product reviews", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Get reviews by user
     */
    async findByUserId(userId, params) {
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
        }
        catch (error) {
            throw new types_1.AppError("Error fetching user reviews", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Create new review
     */
    async createReview(userId, data) {
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
                    throw new types_1.AppError("You have already reviewed this product", types_1.HTTP_STATUS.CONFLICT, types_1.ERROR_CODES.RESOURCE_ALREADY_EXISTS);
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
                const reviewData = {
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
                return review;
            });
            return result;
        }
        catch (error) {
            if (error instanceof types_1.AppError) {
                throw error;
            }
            throw new types_1.AppError("Error creating review", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Update review
     */
    async updateReview(reviewId, userId, data) {
        try {
            const result = await this.transaction(async (prisma) => {
                // Verify review belongs to user
                const existingReview = await prisma.productReview.findFirst({
                    where: { id: reviewId, userId },
                });
                if (!existingReview) {
                    throw new types_1.AppError("Review not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
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
                return updatedReview;
            });
            return result;
        }
        catch (error) {
            if (error instanceof types_1.AppError) {
                throw error;
            }
            throw new types_1.AppError("Error updating review", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Delete review
     */
    async deleteReview(reviewId, userId) {
        try {
            const result = await this.transaction(async (prisma) => {
                // Verify review belongs to user
                const existingReview = await prisma.productReview.findFirst({
                    where: { id: reviewId, userId },
                });
                if (!existingReview) {
                    throw new types_1.AppError("Review not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
                }
                await prisma.productReview.delete({
                    where: { id: reviewId },
                });
                // Update product rating
                await this.updateProductRating(existingReview.productId);
                return true;
            });
            return result;
        }
        catch (error) {
            if (error instanceof types_1.AppError) {
                throw error;
            }
            throw new types_1.AppError("Error deleting review", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Add helpful vote to review
     */
    async addHelpfulVote(reviewId) {
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
            });
        }
        catch (error) {
            throw new types_1.AppError("Error adding helpful vote", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Get reviews requiring moderation (admin)
     */
    async getPendingReviews(params) {
        try {
            return await this.findMany({ isApproved: false }, {
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
            });
        }
        catch (error) {
            throw new types_1.AppError("Error fetching pending reviews", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Approve/reject review (admin)
     */
    async moderateReview(reviewId, isApproved) {
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
                return review;
            });
            return result;
        }
        catch (error) {
            throw new types_1.AppError("Error moderating review", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Get review statistics for admin dashboard
     */
    async getReviewStats() {
        try {
            const [totalStats, pendingCount, ratingDistribution, recentReviews] = await Promise.all([
                this.aggregate({ isApproved: true }, {
                    _count: { id: true },
                    _avg: { rating: true },
                }),
                this.count({ isApproved: false }),
                this.groupBy(["rating"], { isApproved: true }, undefined, {
                    _count: { rating: true },
                }),
                this.findMany({ isApproved: true }, {
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
                }),
            ]);
            return {
                totalReviews: totalStats._count.id || 0,
                pendingReviews: pendingCount,
                averageRating: Number(totalStats._avg.rating?.toFixed(1)) || 0,
                reviewsByRating: ratingDistribution.map((item) => ({
                    rating: item.rating,
                    count: item._count.rating,
                })),
                recentReviews: recentReviews.data,
            };
        }
        catch (error) {
            throw new types_1.AppError("Error fetching review statistics", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Private: Update product average rating
     */
    async updateProductRating(productId) {
        try {
            const stats = await this.aggregate({ productId, isApproved: true }, {
                _avg: { rating: true },
                _count: { id: true },
            });
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
        }
        catch (error) {
            console.error("Error updating product rating:", error);
            // Don't throw error to avoid breaking the main operation
        }
    }
    /**
     * Protected: Build order by clause for reviews
     */
    buildOrderBy(sortBy, sortOrder) {
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
exports.ReviewRepository = ReviewRepository;
//# sourceMappingURL=ReviewRepository.js.map