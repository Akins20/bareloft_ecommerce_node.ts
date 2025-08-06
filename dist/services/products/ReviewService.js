"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewService = void 0;
const BaseService_1 = require("../BaseService");
const models_1 = require("../../models");
const types_1 = require("../../types");
class ReviewService extends BaseService_1.BaseService {
    userRepository;
    productRepository;
    orderRepository;
    cacheService;
    notificationService;
    constructor(userRepository, productRepository, orderRepository, cacheService, notificationService) {
        super();
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
        this.cacheService = cacheService;
        this.notificationService = notificationService;
    }
    /**
     * Check if user can review a product
     */
    async canUserReview(userId, productId) {
        try {
            // Check if product exists
            const product = await this.productRepository.findById(productId);
            if (!product) {
                return { allowed: false, reason: "Product not found" };
            }
            // Check if user already reviewed this product
            const existingReview = await models_1.ProductReviewModel.findFirst({
                where: {
                    productId,
                    userId,
                },
            });
            if (existingReview) {
                return { allowed: false, reason: "You have already reviewed this product" };
            }
            // Check for verified purchase (optional for allowing review)
            const verifiedPurchase = await this.checkVerifiedPurchase(userId, productId);
            return {
                allowed: true,
                reason: verifiedPurchase ? "Verified purchase" : "General review allowed"
            };
        }
        catch (error) {
            this.handleError("Error checking review eligibility", error);
        }
    }
    /**
     * Create a new product review
     * Validates purchase history for verification
     */
    async createReview(request) {
        const userId = request.userId;
        try {
            // Validate product exists
            const product = await this.productRepository.findById(request.productId);
            if (!product) {
                throw new types_1.AppError("Product not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            // Check if user already reviewed this product
            const existingReview = await models_1.ProductReviewModel.findFirst({
                where: {
                    productId: request.productId,
                    userId: userId,
                },
            });
            if (existingReview) {
                throw new types_1.AppError("You have already reviewed this product", types_1.HTTP_STATUS.CONFLICT, types_1.ERROR_CODES.RESOURCE_ALREADY_EXISTS);
            }
            // Check for verified purchase
            const verifiedPurchase = await this.checkVerifiedPurchase(userId, request.productId);
            // Validate rating
            if (request.rating < 1 || request.rating > 5) {
                throw new types_1.AppError("Rating must be between 1 and 5", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
            }
            // Create review
            const reviewData = await models_1.ProductReviewModel.create({
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
            const review = this.transformReview(reviewData);
            // Clear product cache
            await this.clearProductCache(request.productId);
            // Send notification to product owner/admin
            if (verifiedPurchase) {
                await this.notificationService.sendNotification({
                    type: "promotional", // Using promotional as placeholder for product review
                    channel: "email",
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
                review,
                isVerifiedPurchase: !!verifiedPurchase,
            };
        }
        catch (error) {
            this.handleError("Error creating review", error);
        }
    }
    /**
     * Get reviews for a product with pagination and filtering
     */
    async getProductReviews(productId, params = {}) {
        try {
            const { page = 1, limit = 20, rating, isVerified, sortBy = "created", sortOrder = "desc", } = params;
            // Build where clause
            const where = {
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
            const orderBy = {};
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
                models_1.ProductReviewModel.findMany({
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
                models_1.ProductReviewModel.count({ where }),
                this.getReviewSummary(productId),
            ]);
            const pagination = this.createPagination(page, limit, total);
            return {
                reviews: reviews.map(this.transformReview),
                pagination,
                summary,
            };
        }
        catch (error) {
            this.handleError("Error fetching product reviews", error);
        }
    }
    /**
     * Get review summary for a product (rating distribution, averages)
     */
    async getReviewSummary(productId) {
        try {
            const cacheKey = `review-summary:${productId}`;
            const cached = await this.cacheService.get(cacheKey);
            if (cached)
                return cached;
            const reviews = await models_1.ProductReviewModel.findMany({
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
                    ratingDistribution: [
                        { rating: 1, count: 0, percentage: 0 },
                        { rating: 2, count: 0, percentage: 0 },
                        { rating: 3, count: 0, percentage: 0 },
                        { rating: 4, count: 0, percentage: 0 },
                        { rating: 5, count: 0, percentage: 0 },
                    ],
                };
            }
            const totalReviews = reviews.length;
            const verifiedReviews = reviews.filter((r) => r.isVerified).length;
            const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;
            const ratingCounts = {
                1: 0,
                2: 0,
                3: 0,
                4: 0,
                5: 0,
            };
            reviews.forEach((review) => {
                ratingCounts[review.rating]++;
            });
            const ratingDistribution = Object.entries(ratingCounts).map(([rating, count]) => ({
                rating: parseInt(rating),
                count,
                percentage: totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0,
            }));
            const summary = {
                totalReviews,
                averageRating: Math.round(averageRating * 10) / 10,
                verifiedReviews,
                ratingDistribution,
            };
            // Cache for 30 minutes
            if (this.cacheService.set) {
                await this.cacheService.set(cacheKey, summary, { ttl: 1800 });
            }
            return summary;
        }
        catch (error) {
            this.handleError("Error getting review summary", error);
        }
    }
    /**
     * Update an existing review
     */
    async updateReview(reviewId, userId, request) {
        try {
            // Find and verify ownership
            const existingReview = await models_1.ProductReviewModel.findFirst({
                where: {
                    id: reviewId,
                    userId: userId,
                },
            });
            if (!existingReview) {
                throw new types_1.AppError("Review not found or you do not have permission to edit it", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            // Validate rating if provided
            if (request.rating && (request.rating < 1 || request.rating > 5)) {
                throw new types_1.AppError("Rating must be between 1 and 5", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
            }
            // Update review
            const updatedReview = await models_1.ProductReviewModel.update({
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
        }
        catch (error) {
            this.handleError("Error updating review", error);
        }
    }
    /**
     * Delete a review
     */
    async deleteReview(reviewId, userId) {
        try {
            // Find and verify ownership
            const review = await models_1.ProductReviewModel.findFirst({
                where: {
                    id: reviewId,
                    userId: userId,
                },
            });
            if (!review) {
                throw new types_1.AppError("Review not found or you do not have permission to delete it", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            // Delete review
            await models_1.ProductReviewModel.delete({
                where: { id: reviewId },
            });
            // Clear caches
            await this.clearProductCache(review.productId);
            return {
                success: true,
                message: "Review deleted successfully"
            };
        }
        catch (error) {
            this.handleError("Error deleting review", error);
        }
    }
    /**
     * Mark review as helpful
     */
    async markReviewHelpful(reviewId, userId) {
        try {
            // Check if review exists
            const review = await models_1.ProductReviewModel.findUnique({
                where: { id: reviewId },
            });
            if (!review) {
                return {
                    success: false,
                    message: "Review not found",
                    helpfulVotes: 0,
                };
            }
            const updatedReview = await models_1.ProductReviewModel.update({
                where: { id: reviewId },
                data: {
                    helpfulVotes: {
                        increment: 1,
                    },
                },
            });
            return {
                success: true,
                helpfulVotes: updatedReview.helpfulVotes
            };
        }
        catch (error) {
            this.handleError("Error marking review as helpful", error);
        }
    }
    /**
     * Get user's reviews with pagination
     */
    async getUserReviews(userId, params = {}) {
        try {
            const { page = 1, limit = 20, sortBy = "created", sortOrder = "desc", } = params;
            const where = {
                userId,
                isApproved: true,
            };
            const orderBy = {};
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
                models_1.ProductReviewModel.findMany({
                    where,
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                images: {
                                    take: 1,
                                    select: { url: true },
                                },
                            },
                        },
                    },
                    orderBy,
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                models_1.ProductReviewModel.count({ where }),
            ]);
            const pagination = this.createPagination(page, limit, total);
            return {
                reviews: reviews.map((review) => ({
                    ...this.transformReview(review),
                    product: {
                        id: review.product?.id || review.productId,
                        name: review.product?.name || 'Unknown Product',
                        slug: review.product?.slug || 'unknown',
                        primaryImage: review.product?.images?.[0]?.url,
                    },
                })),
                pagination,
            };
        }
        catch (error) {
            this.handleError("Error fetching user reviews", error);
        }
    }
    /**
     * Get review analytics for admin dashboard
     */
    async getReviewAnalytics(startDate, endDate) {
        try {
            const dateFilter = {};
            if (startDate || endDate) {
                dateFilter.createdAt = {};
                if (startDate)
                    dateFilter.createdAt.gte = startDate;
                if (endDate)
                    dateFilter.createdAt.lte = endDate;
            }
            const [totalReviews, approvedReviews, verifiedReviews, averageRating, ratingDistribution, recentReviews, topRatedProducts,] = await Promise.all([
                models_1.ProductReviewModel.count({ where: dateFilter }),
                models_1.ProductReviewModel.count({
                    where: { ...dateFilter, isApproved: true },
                }),
                models_1.ProductReviewModel.count({
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
        }
        catch (error) {
            this.handleError("Error fetching review analytics", error);
        }
    }
    /**
     * Admin: Moderate review (approve/reject)
     */
    async moderateReview(reviewId, action, adminId, reason) {
        try {
            const review = await models_1.ProductReviewModel.findUnique({
                where: { id: reviewId },
                include: {
                    user: true,
                    product: true,
                },
            });
            if (!review) {
                throw new types_1.AppError("Review not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            const updatedReview = await models_1.ProductReviewModel.update({
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
                type: "promotional", // Using promotional as placeholder  
                channel: "email",
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
        }
        catch (error) {
            this.handleError("Error moderating review", error);
        }
    }
    /**
     * Remove helpful mark from review
     */
    async removeHelpfulMark(reviewId, userId) {
        try {
            // Check if review exists
            const review = await models_1.ProductReviewModel.findUnique({
                where: { id: reviewId },
            });
            if (!review) {
                return {
                    success: false,
                    message: "Review not found",
                    helpfulVotes: 0,
                };
            }
            const updatedReview = await models_1.ProductReviewModel.update({
                where: { id: reviewId },
                data: {
                    helpfulVotes: {
                        decrement: review.helpfulVotes > 0 ? 1 : 0,
                    },
                },
            });
            return {
                success: true,
                helpfulVotes: updatedReview.helpfulVotes
            };
        }
        catch (error) {
            this.handleError("Error removing helpful mark", error);
        }
    }
    /**
     * Report inappropriate review
     */
    async reportReview(reviewId, userId, report) {
        try {
            // Check if review exists
            const review = await models_1.ProductReviewModel.findUnique({
                where: { id: reviewId },
            });
            if (!review) {
                return {
                    success: false,
                    message: "Review not found",
                };
            }
            // In a real implementation, you would store the report in a reports table
            // For now, we'll just log it and send a notification
            this.logger.warn("Review reported", {
                reviewId,
                reportedBy: userId,
                reason: report.reason,
                description: report.description,
            });
            // Send notification to admin
            await this.notificationService.sendNotification({
                type: "promotional", // Using promotional as placeholder
                channel: "email",
                recipient: {
                    email: "admin@bareloft.com",
                },
                variables: {
                    reviewId,
                    reason: report.reason,
                    description: report.description || "No additional details provided",
                },
            });
            return {
                success: true,
                message: "Review reported successfully",
            };
        }
        catch (error) {
            this.handleError("Error reporting review", error);
        }
    }
    /**
     * Get review by ID
     */
    async getReviewById(reviewId) {
        try {
            const review = await models_1.ProductReviewModel.findUnique({
                where: { id: reviewId },
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
            return review ? this.transformReview(review) : null;
        }
        catch (error) {
            this.handleError("Error fetching review by ID", error);
        }
    }
    /**
     * Get reviews by rating
     */
    async getReviewsByRating(productId, rating, params) {
        try {
            const { page, limit } = params;
            const where = {
                productId,
                rating,
                isApproved: true,
            };
            const [reviews, total] = await Promise.all([
                models_1.ProductReviewModel.findMany({
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
                    orderBy: { createdAt: "desc" },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                models_1.ProductReviewModel.count({ where }),
            ]);
            const pagination = this.createPagination(page, limit, total);
            return {
                reviews: reviews.map(this.transformReview),
                pagination,
            };
        }
        catch (error) {
            this.handleError("Error fetching reviews by rating", error);
        }
    }
    /**
     * Get verified reviews only
     */
    async getVerifiedReviews(productId, params) {
        try {
            const { page, limit } = params;
            const where = {
                productId,
                isVerified: true,
                isApproved: true,
            };
            const [reviews, total] = await Promise.all([
                models_1.ProductReviewModel.findMany({
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
                    orderBy: { createdAt: "desc" },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                models_1.ProductReviewModel.count({ where }),
            ]);
            const pagination = this.createPagination(page, limit, total);
            return {
                reviews: reviews.map(this.transformReview),
                pagination,
            };
        }
        catch (error) {
            this.handleError("Error fetching verified reviews", error);
        }
    }
    // Private helper methods
    async checkVerifiedPurchase(userId, productId) {
        const purchase = await this.orderRepository.findVerifiedPurchase(userId, productId);
        return purchase ? { orderId: purchase.orderId || purchase.id } : null;
    }
    async clearProductCache(productId) {
        // Clear relevant caches
        if (this.cacheService.delete) {
            await Promise.all([
                this.cacheService.delete(`review-summary:${productId}`),
                this.cacheService.delete(`product:${productId}`),
                // deletePattern method doesn't exist, so skip it
                // this.cacheService.deletePattern(`product-reviews:${productId}:*`),
            ]);
        }
    }
    transformReview(review) {
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
            product: review.product || null, // Add product field if it exists
            user: review.user
                ? {
                    userId: review.user.id,
                    id: review.user.id,
                    firstName: review.user.firstName,
                    lastName: review.user.lastName,
                    avatar: review.user.avatar,
                    isVerified: review.user.isVerified,
                    phoneNumber: '', // Default since not included
                    role: 'CUSTOMER', // Default role
                    createdAt: review.user.createdAt || new Date(), // Default
                }
                : undefined,
        };
    }
    async getAverageRating(dateFilter) {
        const result = await models_1.ProductReviewModel.aggregate({
            where: { ...dateFilter, isApproved: true },
            _avg: { rating: true },
        });
        return Math.round((result._avg.rating || 0) * 10) / 10;
    }
    async getRatingDistribution(dateFilter) {
        const reviews = await models_1.ProductReviewModel.findMany({
            where: { ...dateFilter, isApproved: true },
            select: { rating: true },
        });
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach((review) => {
            distribution[review.rating]++;
        });
        return distribution;
    }
    async getRecentReviews(limit) {
        const reviews = await models_1.ProductReviewModel.findMany({
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
    async getTopRatedProducts(limit) {
        const products = await models_1.ProductReviewModel.groupBy({
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
        const productDetails = await Promise.all(products.map(async (p) => {
            const product = await this.productRepository.findById(p.productId);
            return {
                productId: p.productId,
                productName: product?.name,
                averageRating: Math.round((p._avg.rating || 0) * 10) / 10,
                reviewCount: p._count.rating,
            };
        }));
        return productDetails;
    }
    async getReviewsOverTime(startDate, endDate) {
        // Implementation for time-series data
        // This would typically use database-specific functions for grouping by date
        return [];
    }
}
exports.ReviewService = ReviewService;
//# sourceMappingURL=ReviewService.js.map