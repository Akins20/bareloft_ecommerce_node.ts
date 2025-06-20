import { Request, Response } from "express";
import { BaseController } from "../BaseController";
import { ReviewService } from "../../services/products/ReviewService";
import {
  CreateReviewRequest,
  UpdateReviewRequest,
  ReviewListQuery,
  ReviewResponse,
  ReviewListResponse,
  ReviewSummary,
} from "../../types/product.types";
import { ApiResponse, PaginationParams } from "../../types/api.types";
import { AuthenticatedRequest } from "../../types/auth.types";

export class ReviewController extends BaseController {
  private reviewService: ReviewService;

  constructor(reviewService: ReviewService) {
    super();
    this.reviewService = reviewService;
  }

  /**
   * Get reviews for a product
   * GET /api/v1/products/:productId/reviews
   */
  public getProductReviews = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { productId } = req.params;

      const query: ReviewListQuery = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
        rating: req.query.rating
          ? parseInt(req.query.rating as string)
          : undefined,
        verified: this.parseBoolean(req.query.verified),
        sortBy: (req.query.sortBy as any) || "createdAt",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
      };

      const result = await this.reviewService.getProductReviews(
        productId,
        query
      );

      this.sendPaginatedResponse(
        res,
        result.reviews,
        result.pagination,
        "Product reviews retrieved successfully"
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get review summary for a product
   * GET /api/v1/products/:productId/reviews/summary
   */
  public getReviewSummary = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { productId } = req.params;

      const summary = await this.reviewService.getReviewSummary(productId);

      const response: ApiResponse<ReviewSummary> = {
        success: true,
        message: "Review summary retrieved successfully",
        data: summary,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Create a new review
   * POST /api/v1/products/:productId/reviews
   */
  public createReview = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { productId } = req.params;

      if (!userId) {
        this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
        return;
      }

      const reviewData: CreateReviewRequest = {
        ...req.body,
        productId,
        userId,
      };

      // Validate review data
      const validationErrors = this.validateReviewData(reviewData);
      if (validationErrors.length > 0) {
        this.sendError(
          res,
          "Validation failed",
          400,
          "VALIDATION_ERROR",
          validationErrors
        );
        return;
      }

      // Check if user has purchased the product
      const canReview = await this.reviewService.canUserReview(
        userId,
        productId
      );
      if (!canReview.allowed) {
        this.sendError(res, canReview.reason, 403, "REVIEW_NOT_ALLOWED");
        return;
      }

      const review = await this.reviewService.createReview(reviewData);

      this.logAction("REVIEW_CREATED", userId, "REVIEW", review.id, {
        productId,
        rating: reviewData.rating,
      });

      this.sendSuccess(res, review, "Review created successfully", 201);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Update a review
   * PUT /api/v1/reviews/:reviewId
   */
  public updateReview = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { reviewId } = req.params;

      if (!userId) {
        this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
        return;
      }

      const updateData: UpdateReviewRequest = req.body;

      // Validate update data
      const validationErrors = this.validateUpdateReviewData(updateData);
      if (validationErrors.length > 0) {
        this.sendError(
          res,
          "Validation failed",
          400,
          "VALIDATION_ERROR",
          validationErrors
        );
        return;
      }

      const review = await this.reviewService.updateReview(
        reviewId,
        userId,
        updateData
      );

      if (!review) {
        this.sendError(
          res,
          "Review not found or unauthorized",
          404,
          "REVIEW_NOT_FOUND"
        );
        return;
      }

      this.logAction("REVIEW_UPDATED", userId, "REVIEW", reviewId);

      this.sendSuccess(res, review, "Review updated successfully");
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Delete a review
   * DELETE /api/v1/reviews/:reviewId
   */
  public deleteReview = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { reviewId } = req.params;

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
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get user's reviews
   * GET /api/v1/users/reviews
   */
  public getUserReviews = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
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

      this.sendPaginatedResponse(
        res,
        result.reviews,
        result.pagination,
        "User reviews retrieved successfully"
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Mark review as helpful
   * POST /api/v1/reviews/:reviewId/helpful
   */
  public markReviewHelpful = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { reviewId } = req.params;

      if (!userId) {
        this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
        return;
      }

      const result = await this.reviewService.markReviewHelpful(
        reviewId,
        userId
      );

      if (!result.success) {
        this.sendError(res, result.message, 400, "HELPFUL_VOTE_FAILED");
        return;
      }

      this.logAction("REVIEW_MARKED_HELPFUL", userId, "REVIEW", reviewId);

      this.sendSuccess(
        res,
        { helpfulVotes: result.helpfulVotes },
        "Review marked as helpful"
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Remove helpful mark from review
   * DELETE /api/v1/reviews/:reviewId/helpful
   */
  public removeHelpfulMark = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { reviewId } = req.params;

      if (!userId) {
        this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
        return;
      }

      const result = await this.reviewService.removeHelpfulMark(
        reviewId,
        userId
      );

      if (!result.success) {
        this.sendError(res, result.message, 400, "HELPFUL_VOTE_REMOVAL_FAILED");
        return;
      }

      this.logAction("REVIEW_HELPFUL_REMOVED", userId, "REVIEW", reviewId);

      this.sendSuccess(
        res,
        { helpfulVotes: result.helpfulVotes },
        "Helpful mark removed"
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Report inappropriate review
   * POST /api/v1/reviews/:reviewId/report
   */
  public reportReview = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { reviewId } = req.params;
      const { reason, description } = req.body;

      if (!userId) {
        this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
        return;
      }

      if (!reason) {
        this.sendError(
          res,
          "Report reason is required",
          400,
          "VALIDATION_ERROR"
        );
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

      this.sendSuccess(
        res,
        null,
        "Review reported successfully. Thank you for helping maintain quality."
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get review by ID
   * GET /api/v1/reviews/:reviewId
   */
  public getReviewById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { reviewId } = req.params;

      const review = await this.reviewService.getReviewById(reviewId);

      if (!review) {
        this.sendError(res, "Review not found", 404, "REVIEW_NOT_FOUND");
        return;
      }

      this.sendSuccess(res, review, "Review retrieved successfully");
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get reviews by rating
   * GET /api/v1/products/:productId/reviews/rating/:rating
   */
  public getReviewsByRating = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { productId, rating } = req.params;
      const ratingValue = parseInt(rating);

      if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
        this.sendError(
          res,
          "Invalid rating value. Must be between 1 and 5",
          400,
          "INVALID_RATING"
        );
        return;
      }

      const { page, limit } = this.parsePaginationParams(req.query);

      const result = await this.reviewService.getReviewsByRating(
        productId,
        ratingValue,
        { page, limit }
      );

      this.sendPaginatedResponse(
        res,
        result.reviews,
        result.pagination,
        `Reviews with ${ratingValue} star${ratingValue > 1 ? "s" : ""} retrieved successfully`
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get verified purchase reviews only
   * GET /api/v1/products/:productId/reviews/verified
   */
  public getVerifiedReviews = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { productId } = req.params;
      const { page, limit } = this.parsePaginationParams(req.query);

      const result = await this.reviewService.getVerifiedReviews(productId, {
        page,
        limit,
      });

      this.sendPaginatedResponse(
        res,
        result.reviews,
        result.pagination,
        "Verified purchase reviews retrieved successfully"
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Check if user can review a product
   * GET /api/v1/products/:productId/can-review
   */
  public canReviewProduct = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { productId } = req.params;

      if (!userId) {
        this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
        return;
      }

      const canReview = await this.reviewService.canUserReview(
        userId,
        productId
      );

      this.sendSuccess(
        res,
        canReview,
        "Review eligibility checked successfully"
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Validate review data for creation
   */
  private validateReviewData(data: CreateReviewRequest): string[] {
    const errors: string[] = [];

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
  private validateUpdateReviewData(data: UpdateReviewRequest): string[] {
    const errors: string[] = [];

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
