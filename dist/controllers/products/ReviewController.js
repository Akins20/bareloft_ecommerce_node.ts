"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewController = void 0;
const BaseController_1 = require("../BaseController");
class ReviewController extends BaseController_1.BaseController {
    reviewService;
    constructor(reviewService) {
        super();
        this.reviewService = reviewService;
    }
    /**
     * Get reviews for a product
     * GET /api/v1/products/:productId/reviews
     */
    getProductReviews = async (req, res) => {
        try {
            const { productId } = req.params;
            if (!productId) {
                this.sendError(res, "Product ID is required", 400, "VALIDATION_ERROR");
                return;
            }
            const query = {
                page: parseInt(req.query.page) || 1,
                limit: Math.min(parseInt(req.query.limit) || 20, 100),
                ...(req.query.rating && {
                    rating: parseInt(req.query.rating)
                }),
                sortBy: req.query.sortBy || "createdAt",
                sortOrder: req.query.sortOrder || "desc",
            };
            // Handle optional isVerified parameter
            const isVerified = req.query.verified ? this.parseBoolean(req.query.verified) : undefined;
            if (isVerified !== undefined) {
                query.isVerified = isVerified;
            }
            const result = await this.reviewService.getProductReviews(productId, query);
            this.sendPaginatedResponse(res, result.reviews, {
                page: result.pagination.currentPage,
                limit: result.pagination.itemsPerPage,
                total: result.pagination.totalItems,
                totalPages: result.pagination.totalPages,
                hasNext: result.pagination.hasNextPage,
                hasPrev: result.pagination.hasPreviousPage,
            }, "Product reviews retrieved successfully");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get review summary for a product
     * GET /api/v1/products/:productId/reviews/summary
     */
    getReviewSummary = async (req, res) => {
        try {
            const { productId } = req.params;
            if (!productId) {
                this.sendError(res, "Product ID is required", 400, "VALIDATION_ERROR");
                return;
            }
            const summary = await this.reviewService.getReviewSummary(productId);
            // Convert rating distribution to expected format
            const formattedSummary = {
                ...summary,
                ratingDistribution: Object.entries(summary.ratingDistribution).map(([rating, count]) => ({
                    rating: parseInt(rating),
                    count,
                    percentage: summary.totalReviews > 0 ? Math.round((count / summary.totalReviews) * 100) : 0,
                })),
            };
            const response = {
                success: true,
                message: "Review summary retrieved successfully",
                data: formattedSummary,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Create a new review
     * POST /api/v1/products/:productId/reviews
     */
    createReview = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            const { productId } = req.params;
            if (!productId) {
                this.sendError(res, "Product ID is required", 400, "VALIDATION_ERROR");
                return;
            }
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            const reviewData = {
                ...req.body,
                productId,
                userId,
            };
            // Validate review data
            const validationErrors = this.validateReviewData(reviewData);
            if (validationErrors.length > 0) {
                this.sendError(res, "Validation failed", 400, "VALIDATION_ERROR", validationErrors);
                return;
            }
            // Check if user has purchased the product
            const canReview = await this.reviewService.canUserReview(userId, productId);
            if (!canReview.allowed) {
                this.sendError(res, canReview.reason, 403, "REVIEW_NOT_ALLOWED");
                return;
            }
            const result = await this.reviewService.createReview(reviewData);
            const review = result.review;
            this.logAction("REVIEW_CREATED", userId, "REVIEW", review.id, {
                productId,
                rating: reviewData.rating,
            });
            this.sendSuccess(res, review, "Review created successfully", 201);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Update a review
     * PUT /api/v1/reviews/:reviewId
     */
    updateReview = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            const { reviewId } = req.params;
            if (!reviewId) {
                this.sendError(res, "Review ID is required", 400, "VALIDATION_ERROR");
                return;
            }
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            const updateData = req.body;
            // Validate update data
            const validationErrors = this.validateUpdateReviewData(updateData);
            if (validationErrors.length > 0) {
                this.sendError(res, "Validation failed", 400, "VALIDATION_ERROR", validationErrors);
                return;
            }
            const review = await this.reviewService.updateReview(reviewId, userId, updateData);
            if (!review) {
                this.sendError(res, "Review not found or unauthorized", 404, "REVIEW_NOT_FOUND");
                return;
            }
            this.logAction("REVIEW_UPDATED", userId, "REVIEW", reviewId);
            this.sendSuccess(res, review, "Review updated successfully");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Delete a review
     * DELETE /api/v1/reviews/:reviewId
     */
    deleteReview = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            const { reviewId } = req.params;
            if (!reviewId) {
                this.sendError(res, "Review ID is required", 400, "VALIDATION_ERROR");
                return;
            }
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            const result = await this.reviewService.deleteReview(reviewId, userId);
            if (!result.success) {
                this.sendError(res, result.message, 404, "REVIEW_NOT_FOUND");
                return;
            }
            this.logAction("REVIEW_DELETED", userId, "REVIEW", reviewId);
            this.sendSuccess(res, null, "Review deleted successfully");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get user's reviews
     * GET /api/v1/users/reviews
     */
    getUserReviews = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            const { page, limit } = this.parsePaginationParams(req.query);
            const result = await this.reviewService.getUserReviews(userId, {
                page,
                limit,
            });
            this.sendPaginatedResponse(res, result.reviews, {
                page: result.pagination.currentPage,
                limit: result.pagination.itemsPerPage,
                total: result.pagination.totalItems,
                totalPages: result.pagination.totalPages,
                hasNext: result.pagination.hasNextPage,
                hasPrev: result.pagination.hasPreviousPage,
            }, "User reviews retrieved successfully");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Mark review as helpful
     * POST /api/v1/reviews/:reviewId/helpful
     */
    markReviewHelpful = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            const { reviewId } = req.params;
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            if (!reviewId) {
                this.sendError(res, "Review ID is required", 400, "VALIDATION_ERROR");
                return;
            }
            const result = await this.reviewService.markReviewHelpful(reviewId, userId);
            if (!result.success) {
                this.sendError(res, result.message, 400, "HELPFUL_VOTE_FAILED");
                return;
            }
            this.logAction("REVIEW_MARKED_HELPFUL", userId, "REVIEW", reviewId);
            this.sendSuccess(res, { helpfulVotes: result.helpfulVotes }, "Review marked as helpful");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Remove helpful mark from review
     * DELETE /api/v1/reviews/:reviewId/helpful
     */
    removeHelpfulMark = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            const { reviewId } = req.params;
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            if (!reviewId) {
                this.sendError(res, "Review ID is required", 400, "VALIDATION_ERROR");
                return;
            }
            const result = await this.reviewService.removeHelpfulMark(reviewId, userId);
            if (!result.success) {
                this.sendError(res, result.message, 400, "HELPFUL_VOTE_REMOVAL_FAILED");
                return;
            }
            this.logAction("REVIEW_HELPFUL_REMOVED", userId, "REVIEW", reviewId);
            this.sendSuccess(res, { helpfulVotes: result.helpfulVotes }, "Helpful mark removed");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Report inappropriate review
     * POST /api/v1/reviews/:reviewId/report
     */
    reportReview = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            const { reviewId } = req.params;
            const { reason, description } = req.body;
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            if (!reviewId) {
                this.sendError(res, "Review ID is required", 400, "VALIDATION_ERROR");
                return;
            }
            if (!reason) {
                this.sendError(res, "Report reason is required", 400, "VALIDATION_ERROR");
                return;
            }
            const result = await this.reviewService.reportReview(reviewId, userId, {
                reason,
                description,
            });
            if (!result.success) {
                this.sendError(res, result.message, 400, "REPORT_FAILED");
                return;
            }
            this.logAction("REVIEW_REPORTED", userId, "REVIEW", reviewId, { reason });
            this.sendSuccess(res, null, "Review reported successfully. Thank you for helping maintain quality.");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get review by ID
     * GET /api/v1/reviews/:reviewId
     */
    getReviewById = async (req, res) => {
        try {
            const { reviewId } = req.params;
            if (!reviewId) {
                this.sendError(res, "Review ID is required", 400, "VALIDATION_ERROR");
                return;
            }
            const review = await this.reviewService.getReviewById(reviewId);
            if (!review) {
                this.sendError(res, "Review not found", 404, "REVIEW_NOT_FOUND");
                return;
            }
            this.sendSuccess(res, review, "Review retrieved successfully");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get reviews by rating
     * GET /api/v1/products/:productId/reviews/rating/:rating
     */
    getReviewsByRating = async (req, res) => {
        try {
            const { productId, rating } = req.params;
            if (!productId) {
                this.sendError(res, "Product ID is required", 400, "VALIDATION_ERROR");
                return;
            }
            const ratingValue = parseInt(rating);
            if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
                this.sendError(res, "Invalid rating value. Must be between 1 and 5", 400, "INVALID_RATING");
                return;
            }
            const { page, limit } = this.parsePaginationParams(req.query);
            const result = await this.reviewService.getReviewsByRating(productId, ratingValue, { page, limit });
            this.sendPaginatedResponse(res, result.reviews, {
                page: result.pagination.currentPage,
                limit: result.pagination.itemsPerPage,
                total: result.pagination.totalItems,
                totalPages: result.pagination.totalPages,
                hasNext: result.pagination.hasNextPage,
                hasPrev: result.pagination.hasPreviousPage,
            }, `Reviews with ${ratingValue} star${ratingValue > 1 ? "s" : ""} retrieved successfully`);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get verified purchase reviews only
     * GET /api/v1/products/:productId/reviews/verified
     */
    getVerifiedReviews = async (req, res) => {
        try {
            const { productId } = req.params;
            if (!productId) {
                this.sendError(res, "Product ID is required", 400, "VALIDATION_ERROR");
                return;
            }
            const { page, limit } = this.parsePaginationParams(req.query);
            const result = await this.reviewService.getVerifiedReviews(productId, {
                page,
                limit,
            });
            this.sendPaginatedResponse(res, result.reviews, {
                page: result.pagination.currentPage,
                limit: result.pagination.itemsPerPage,
                total: result.pagination.totalItems,
                totalPages: result.pagination.totalPages,
                hasNext: result.pagination.hasNextPage,
                hasPrev: result.pagination.hasPreviousPage,
            }, "Verified purchase reviews retrieved successfully");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Check if user can review a product
     * GET /api/v1/products/:productId/can-review
     */
    canReviewProduct = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            const { productId } = req.params;
            if (!productId) {
                this.sendError(res, "Product ID is required", 400, "VALIDATION_ERROR");
                return;
            }
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            const canReview = await this.reviewService.canUserReview(userId, productId);
            this.sendSuccess(res, canReview, "Review eligibility checked successfully");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Validate review data for creation
     */
    validateReviewData(data) {
        const errors = [];
        if (!data.rating || data.rating < 1 || data.rating > 5) {
            errors.push("Rating must be between 1 and 5");
        }
        if (data.title && data.title.length > 100) {
            errors.push("Review title cannot exceed 100 characters");
        }
        if (data.comment && data.comment.length > 2000) {
            errors.push("Review comment cannot exceed 2000 characters");
        }
        if (data.comment && data.comment.trim().length < 10) {
            errors.push("Review comment must be at least 10 characters long");
        }
        return errors;
    }
    /**
     * Validate review data for update
     */
    validateUpdateReviewData(data) {
        const errors = [];
        if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
            errors.push("Rating must be between 1 and 5");
        }
        if (data.title !== undefined && data.title.length > 100) {
            errors.push("Review title cannot exceed 100 characters");
        }
        if (data.comment !== undefined) {
            if (data.comment.length > 2000) {
                errors.push("Review comment cannot exceed 2000 characters");
            }
            if (data.comment.trim().length < 10) {
                errors.push("Review comment must be at least 10 characters long");
            }
        }
        return errors;
    }
}
exports.ReviewController = ReviewController;
//# sourceMappingURL=ReviewController.js.map