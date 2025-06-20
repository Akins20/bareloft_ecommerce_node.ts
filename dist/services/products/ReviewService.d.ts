import { BaseService } from "../BaseService";
import { UserRepository } from "../../repositories/UserRepository";
import { ProductRepository } from "../../repositories/ProductRepository";
import { OrderRepository } from "../../repositories/OrderRepository";
import { CreateReviewRequest, UpdateReviewRequest, ReviewQueryParams, ProductReview, PaginationMeta } from "../../types";
import { CacheService } from "../cache/CacheService";
import { NotificationService } from "../notifications/NotificationService";
export declare class ReviewService extends BaseService {
    private userRepository;
    private productRepository;
    private orderRepository;
    private cacheService;
    private notificationService;
    constructor(userRepository: UserRepository, productRepository: ProductRepository, orderRepository: OrderRepository, cacheService: CacheService, notificationService: NotificationService);
    /**
     * Create a new product review
     * Validates purchase history for verification
     */
    createReview(userId: string, request: CreateReviewRequest): Promise<{
        review: ProductReview;
        isVerifiedPurchase: boolean;
    }>;
    /**
     * Get reviews for a product with pagination and filtering
     */
    getProductReviews(productId: string, params?: ReviewQueryParams): Promise<{
        reviews: ProductReview[];
        pagination: PaginationMeta;
        summary: ReviewSummary;
    }>;
    /**
     * Get review summary for a product (rating distribution, averages)
     */
    getReviewSummary(productId: string): Promise<ReviewSummary>;
    /**
     * Update an existing review
     */
    updateReview(userId: string, reviewId: string, request: UpdateReviewRequest): Promise<ProductReview>;
    /**
     * Delete a review
     */
    deleteReview(userId: string, reviewId: string): Promise<void>;
    /**
     * Mark review as helpful
     */
    markReviewHelpful(reviewId: string): Promise<{
        helpfulVotes: number;
    }>;
    /**
     * Get user's reviews with pagination
     */
    getUserReviews(userId: string, params?: ReviewQueryParams): Promise<{
        reviews: ProductReview[];
        pagination: PaginationMeta;
    }>;
    /**
     * Get review analytics for admin dashboard
     */
    getReviewAnalytics(startDate?: Date, endDate?: Date): Promise<ReviewAnalytics>;
    /**
     * Admin: Moderate review (approve/reject)
     */
    moderateReview(reviewId: string, action: "approve" | "reject", adminId: string, reason?: string): Promise<ProductReview>;
    private checkVerifiedPurchase;
    private clearProductCache;
    private transformReview;
    private getAverageRating;
    private getRatingDistribution;
    private getRecentReviews;
    private getTopRatedProducts;
    private getReviewsOverTime;
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
export {};
//# sourceMappingURL=ReviewService.d.ts.map