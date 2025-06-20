import { Router } from "express";
import { ReviewController } from "../../controllers/products/ReviewController";
import { authenticate } from "../../middleware/auth/authenticate";
import { authorize } from "../../middleware/auth/authorize";
import { validateRequest } from "../../middleware/validation/validateRequest";
import { rateLimiter } from "../../middleware/security/rateLimiter";
import { cacheMiddleware } from "../../middleware/cache/cacheMiddleware";
import {
  createReviewSchema,
  updateReviewSchema,
  reportReviewSchema,
} from "../../utils/validation/schemas/productSchemas";

const router = Router();

// Initialize controller
let reviewController: ReviewController;

export const initializeReviewRoutes = (controller: ReviewController) => {
  reviewController = controller;
  return router;
};

// Rate limiting for review operations
const reviewActionLimit = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5, // 5 reviews per hour
  message: "Too many review submissions. Please try again later.",
});

const reviewInteractionLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20, // 20 interactions per 15 minutes
  message: "Too many review interactions. Please slow down.",
});

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
router.get(
  "/products/:productId/reviews",
  cacheMiddleware(300), // 5 minute cache
  async (req, res, next) => {
    try {
      await reviewController.getProductReviews(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/products/:productId/reviews/summary
 * @desc    Get review summary and statistics for a product
 * @access  Public
 * @param   productId - Product ID
 */
router.get(
  "/products/:productId/reviews/summary",
  cacheMiddleware(600), // 10 minute cache
  async (req, res, next) => {
    try {
      await reviewController.getReviewSummary(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/products/:productId/reviews/rating/:rating
 * @desc    Get reviews by specific rating for a product
 * @access  Public
 * @param   productId - Product ID
 * @param   rating - Rating value (1-5)
 * @query   { page?: number, limit?: number }
 */
router.get(
  "/products/:productId/reviews/rating/:rating",
  cacheMiddleware(300), // 5 minute cache
  async (req, res, next) => {
    try {
      await reviewController.getReviewsByRating(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/products/:productId/reviews/verified
 * @desc    Get verified purchase reviews only
 * @access  Public
 * @param   productId - Product ID
 * @query   { page?: number, limit?: number }
 */
router.get(
  "/products/:productId/reviews/verified",
  cacheMiddleware(300), // 5 minute cache
  async (req, res, next) => {
    try {
      await reviewController.getVerifiedReviews(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/products/:productId/can-review
 * @desc    Check if authenticated user can review this product
 * @access  Private (Customer)
 * @param   productId - Product ID
 */
router.get(
  "/products/:productId/can-review",
  authenticate,
  async (req, res, next) => {
    try {
      await reviewController.canReviewProduct(req, res);
    } catch (error) {
      next(error);
    }
  }
);

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
router.post(
  "/products/:productId/reviews",
  authenticate,
  reviewActionLimit,
  validateRequest(createReviewSchema),
  async (req, res, next) => {
    try {
      await reviewController.createReview(req, res);
    } catch (error) {
      next(error);
    }
  }
);

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
  } catch (error) {
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
router.put(
  "/:reviewId",
  authenticate,
  reviewActionLimit,
  validateRequest(updateReviewSchema),
  async (req, res, next) => {
    try {
      await reviewController.updateReview(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/reviews/:reviewId
 * @desc    Delete review (by review author only)
 * @access  Private (Customer - own reviews only)
 * @param   reviewId - Review ID
 */
router.delete("/:reviewId", authenticate, async (req, res, next) => {
  try {
    await reviewController.deleteReview(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/reviews/:reviewId/helpful
 * @desc    Mark review as helpful
 * @access  Private (Customer)
 * @param   reviewId - Review ID
 */
router.post(
  "/:reviewId/helpful",
  authenticate,
  reviewInteractionLimit,
  async (req, res, next) => {
    try {
      await reviewController.markReviewHelpful(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/reviews/:reviewId/helpful
 * @desc    Remove helpful mark from review
 * @access  Private (Customer)
 * @param   reviewId - Review ID
 */
router.delete(
  "/:reviewId/helpful",
  authenticate,
  reviewInteractionLimit,
  async (req, res, next) => {
    try {
      await reviewController.removeHelpfulMark(req, res);
    } catch (error) {
      next(error);
    }
  }
);

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
router.post(
  "/:reviewId/report",
  authenticate,
  reviewInteractionLimit,
  validateRequest(reportReviewSchema),
  async (req, res, next) => {
    try {
      await reviewController.reportReview(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// ==================== USER REVIEW ENDPOINTS ====================

/**
 * @route   GET /api/v1/users/reviews
 * @desc    Get authenticated user's reviews
 * @access  Private (Customer)
 * @query   { page?: number, limit?: number }
 */
router.get("/users/reviews", authenticate, async (req, res, next) => {
  try {
    await reviewController.getUserReviews(req, res);
  } catch (error) {
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
router.get(
  "/admin/reviews",
  authenticate,
  authorize(["admin", "super_admin"]),
  async (req, res, next) => {
    try {
      // This would be handled by an admin-specific method
      res.status(501).json({
        success: false,
        message: "Admin review management not yet implemented",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/admin/reviews/:reviewId/approve
 * @desc    Approve/disapprove review (Admin only)
 * @access  Private (Admin)
 * @param   reviewId - Review ID
 * @body    { approved: boolean, reason?: string }
 */
router.put(
  "/admin/reviews/:reviewId/approve",
  authenticate,
  authorize(["admin", "super_admin"]),
  async (req, res, next) => {
    try {
      res.status(501).json({
        success: false,
        message: "Review approval not yet implemented",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/admin/reviews/:reviewId
 * @desc    Delete review (Admin only)
 * @access  Private (Admin)
 * @param   reviewId - Review ID
 * @body    { reason: string }
 */
router.delete(
  "/admin/reviews/:reviewId",
  authenticate,
  authorize(["admin", "super_admin"]),
  async (req, res, next) => {
    try {
      res.status(501).json({
        success: false,
        message: "Admin review deletion not yet implemented",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/admin/reviews/reports
 * @desc    Get reported reviews (Admin only)
 * @access  Private (Admin)
 * @query   { page?: number, limit?: number, status?: string }
 */
router.get(
  "/admin/reviews/reports",
  authenticate,
  authorize(["admin", "super_admin"]),
  async (req, res, next) => {
    try {
      res.status(501).json({
        success: false,
        message: "Review reports management not yet implemented",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/admin/reviews/reports/:reportId
 * @desc    Handle review report (Admin only)
 * @access  Private (Admin)
 * @param   reportId - Report ID
 * @body    { action: 'dismiss' | 'remove_review' | 'warn_user', notes?: string }
 */
router.put(
  "/admin/reviews/reports/:reportId",
  authenticate,
  authorize(["admin", "super_admin"]),
  async (req, res, next) => {
    try {
      res.status(501).json({
        success: false,
        message: "Review report handling not yet implemented",
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
