"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ReviewController_1 = require("../../controllers/products/ReviewController");
const authenticate_1 = require("../../middleware/auth/authenticate");
const authorize_1 = require("../../middleware/auth/authorize");
const rateLimiter_1 = require("../../middleware/security/rateLimiter");
// Note: Review schemas not yet created, using placeholder validation
const createReviewSchema = {};
const updateReviewSchema = {};
const reportReviewSchema = {};
const router = (0, express_1.Router)();
// Service imports
const serviceContainer_1 = require("../../config/serviceContainer");
// Initialize controller with service container
const serviceContainer = (0, serviceContainer_1.getServiceContainer)();
const reviewService = serviceContainer.getService('reviewService');
const reviewController = new ReviewController_1.ReviewController(reviewService);
// Rate limiting for review operations
const reviewActionLimit = rateLimiter_1.rateLimiter.authenticated;
const reviewInteractionLimit = rateLimiter_1.rateLimiter.authenticated;
// ==================== PRODUCT REVIEW ENDPOINTS ====================
/**
 * @route   GET /api/v1/products/:productId/reviews
 * @desc    Get reviews for a specific product
 * @access  Public
 * @param   productId - Product ID
 * @query   {
 *   page?: number,
 *   limit?: number,
 *   rating?: number (1-5),
 *   verified?: boolean,
 *   sortBy?: 'createdAt' | 'rating' | 'helpful',
 *   sortOrder?: 'asc' | 'desc'
 * }
 */
router.get("/products/:productId/reviews", 
// cacheMiddleware({ ttl: 300 }), // 5 minute cache - disabled for now
async (req, res, next) => {
    try {
        await reviewController.getProductReviews(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/products/:productId/reviews/summary
 * @desc    Get review summary and statistics for a product
 * @access  Public
 * @param   productId - Product ID
 */
router.get("/products/:productId/reviews/summary", 
// cacheMiddleware({ ttl: 600 }), // 10 minute cache - disabled for now
async (req, res, next) => {
    try {
        await reviewController.getReviewSummary(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/products/:productId/reviews/rating/:rating
 * @desc    Get reviews by specific rating for a product
 * @access  Public
 * @param   productId - Product ID
 * @param   rating - Rating value (1-5)
 * @query   { page?: number, limit?: number }
 */
router.get("/products/:productId/reviews/rating/:rating", 
// cacheMiddleware({ ttl: 300 }), // 5 minute cache - disabled for now
async (req, res, next) => {
    try {
        await reviewController.getReviewsByRating(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/products/:productId/reviews/verified
 * @desc    Get verified purchase reviews only
 * @access  Public
 * @param   productId - Product ID
 * @query   { page?: number, limit?: number }
 */
router.get("/products/:productId/reviews/verified", 
// cacheMiddleware({ ttl: 300 }), // 5 minute cache - disabled for now
async (req, res, next) => {
    try {
        await reviewController.getVerifiedReviews(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/products/:productId/can-review
 * @desc    Check if authenticated user can review this product
 * @access  Private (Customer)
 * @param   productId - Product ID
 */
router.get("/products/:productId/can-review", authenticate_1.authenticate, async (req, res, next) => {
    try {
        await reviewController.canReviewProduct(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   POST /api/v1/products/:productId/reviews
 * @desc    Create a new review for a product
 * @access  Private (Customer with verified purchase)
 * @param   productId - Product ID
 * @body    CreateReviewRequest {
 *   rating: number (1-5),
 *   title?: string,
 *   comment?: string
 * }
 */
router.post("/products/:productId/reviews", authenticate_1.authenticate, reviewActionLimit, 
// validateRequest(createReviewSchema), // Skip validation for now due to empty schema
async (req, res, next) => {
    try {
        await reviewController.createReview(req, res);
    }
    catch (error) {
        next(error);
    }
});
// ==================== INDIVIDUAL REVIEW ENDPOINTS ====================
/**
 * @route   GET /api/v1/reviews/:reviewId
 * @desc    Get individual review by ID
 * @access  Public
 * @param   reviewId - Review ID
 */
router.get("/:reviewId", async (req, res, next) => {
    try {
        await reviewController.getReviewById(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   PUT /api/v1/reviews/:reviewId
 * @desc    Update existing review (by review author only)
 * @access  Private (Customer - own reviews only)
 * @param   reviewId - Review ID
 * @body    UpdateReviewRequest {
 *   rating?: number (1-5),
 *   title?: string,
 *   comment?: string
 * }
 */
router.put("/:reviewId", authenticate_1.authenticate, reviewActionLimit, 
// validateRequest(updateReviewSchema), // Skip validation for now due to empty schema
async (req, res, next) => {
    try {
        await reviewController.updateReview(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   DELETE /api/v1/reviews/:reviewId
 * @desc    Delete review (by review author only)
 * @access  Private (Customer - own reviews only)
 * @param   reviewId - Review ID
 */
router.delete("/:reviewId", authenticate_1.authenticate, async (req, res, next) => {
    try {
        await reviewController.deleteReview(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   POST /api/v1/reviews/:reviewId/helpful
 * @desc    Mark review as helpful
 * @access  Private (Customer)
 * @param   reviewId - Review ID
 */
router.post("/:reviewId/helpful", authenticate_1.authenticate, reviewInteractionLimit, async (req, res, next) => {
    try {
        await reviewController.markReviewHelpful(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   DELETE /api/v1/reviews/:reviewId/helpful
 * @desc    Remove helpful mark from review
 * @access  Private (Customer)
 * @param   reviewId - Review ID
 */
router.delete("/:reviewId/helpful", authenticate_1.authenticate, reviewInteractionLimit, async (req, res, next) => {
    try {
        await reviewController.removeHelpfulMark(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   POST /api/v1/reviews/:reviewId/report
 * @desc    Report inappropriate review
 * @access  Private (Customer)
 * @param   reviewId - Review ID
 * @body    {
 *   reason: string,
 *   description?: string
 * }
 */
router.post("/:reviewId/report", authenticate_1.authenticate, reviewInteractionLimit, 
// validateRequest(reportReviewSchema), // Skip validation for now due to empty schema
async (req, res, next) => {
    try {
        await reviewController.reportReview(req, res);
    }
    catch (error) {
        next(error);
    }
});
// ==================== USER REVIEW ENDPOINTS ====================
/**
 * @route   GET /api/v1/users/reviews
 * @desc    Get authenticated user's reviews
 * @access  Private (Customer)
 * @query   { page?: number, limit?: number }
 */
router.get("/users/reviews", authenticate_1.authenticate, async (req, res, next) => {
    try {
        await reviewController.getUserReviews(req, res);
    }
    catch (error) {
        next(error);
    }
});
// ==================== ADMIN REVIEW ENDPOINTS ====================
/**
 * @route   GET /api/v1/admin/reviews
 * @desc    Get all reviews with admin filtering (Admin only)
 * @access  Private (Admin)
 * @query   {
 *   page?: number,
 *   limit?: number,
 *   productId?: string,
 *   userId?: string,
 *   rating?: number,
 *   isApproved?: boolean,
 *   isReported?: boolean,
 *   sortBy?: 'createdAt' | 'rating' | 'helpful',
 *   sortOrder?: 'asc' | 'desc'
 * }
 */
router.get("/admin/reviews", authenticate_1.authenticate, (0, authorize_1.authorize)(["ADMIN", "SUPER_ADMIN"]), async (req, res, next) => {
    try {
        // This would be handled by an admin-specific method
        res.status(501).json({
            success: false,
            message: "Admin review management not yet implemented",
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   PUT /api/v1/admin/reviews/:reviewId/approve
 * @desc    Approve/disapprove review (Admin only)
 * @access  Private (Admin)
 * @param   reviewId - Review ID
 * @body    { approved: boolean, reason?: string }
 */
router.put("/admin/reviews/:reviewId/approve", authenticate_1.authenticate, (0, authorize_1.authorize)(["ADMIN", "SUPER_ADMIN"]), async (req, res, next) => {
    try {
        res.status(501).json({
            success: false,
            message: "Review approval not yet implemented",
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   DELETE /api/v1/admin/reviews/:reviewId
 * @desc    Delete review (Admin only)
 * @access  Private (Admin)
 * @param   reviewId - Review ID
 * @body    { reason: string }
 */
router.delete("/admin/reviews/:reviewId", authenticate_1.authenticate, (0, authorize_1.authorize)(["ADMIN", "SUPER_ADMIN"]), async (req, res, next) => {
    try {
        res.status(501).json({
            success: false,
            message: "Admin review deletion not yet implemented",
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/admin/reviews/reports
 * @desc    Get reported reviews (Admin only)
 * @access  Private (Admin)
 * @query   { page?: number, limit?: number, status?: string }
 */
router.get("/admin/reviews/reports", authenticate_1.authenticate, (0, authorize_1.authorize)(["ADMIN", "SUPER_ADMIN"]), async (req, res, next) => {
    try {
        res.status(501).json({
            success: false,
            message: "Review reports management not yet implemented",
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   PUT /api/v1/admin/reviews/reports/:reportId
 * @desc    Handle review report (Admin only)
 * @access  Private (Admin)
 * @param   reportId - Report ID
 * @body    { action: 'dismiss' | 'remove_review' | 'warn_user', notes?: string }
 */
router.put("/admin/reviews/reports/:reportId", authenticate_1.authenticate, (0, authorize_1.authorize)(["ADMIN", "SUPER_ADMIN"]), async (req, res, next) => {
    try {
        res.status(501).json({
            success: false,
            message: "Review report handling not yet implemented",
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=reviews.js.map