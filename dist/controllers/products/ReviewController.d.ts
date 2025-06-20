import { Request, Response } from "express";
import { BaseController } from "../BaseController";
import { ReviewService } from "../../services/products/ReviewService";
import { AuthenticatedRequest } from "../../types/auth.types";
export declare class ReviewController extends BaseController {
    private reviewService;
    constructor(reviewService: ReviewService);
    /**
     * Get reviews for a product
     * GET /api/v1/products/:productId/reviews
     */
    getProductReviews: (req: Request, res: Response) => Promise<void>;
    /**
     * Get review summary for a product
     * GET /api/v1/products/:productId/reviews/summary
     */
    getReviewSummary: (req: Request, res: Response) => Promise<void>;
    /**
     * Create a new review
     * POST /api/v1/products/:productId/reviews
     */
    createReview: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Update a review
     * PUT /api/v1/reviews/:reviewId
     */
    updateReview: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Delete a review
     * DELETE /api/v1/reviews/:reviewId
     */
    deleteReview: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Get user's reviews
     * GET /api/v1/users/reviews
     */
    getUserReviews: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Mark review as helpful
     * POST /api/v1/reviews/:reviewId/helpful
     */
    markReviewHelpful: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Remove helpful mark from review
     * DELETE /api/v1/reviews/:reviewId/helpful
     */
    removeHelpfulMark: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Report inappropriate review
     * POST /api/v1/reviews/:reviewId/report
     */
    reportReview: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Get review by ID
     * GET /api/v1/reviews/:reviewId
     */
    getReviewById: (req: Request, res: Response) => Promise<void>;
    /**
     * Get reviews by rating
     * GET /api/v1/products/:productId/reviews/rating/:rating
     */
    getReviewsByRating: (req: Request, res: Response) => Promise<void>;
    /**
     * Get verified purchase reviews only
     * GET /api/v1/products/:productId/reviews/verified
     */
    getVerifiedReviews: (req: Request, res: Response) => Promise<void>;
    /**
     * Check if user can review a product
     * GET /api/v1/products/:productId/can-review
     */
    canReviewProduct: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Validate review data for creation
     */
    private validateReviewData;
    /**
     * Validate review data for update
     */
    private validateUpdateReviewData;
}
//# sourceMappingURL=ReviewController.d.ts.map