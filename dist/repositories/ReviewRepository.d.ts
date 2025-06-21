import { PrismaClient } from "@prisma/client";
import { BaseRepository } from "./BaseRepository";
import { ProductReview, CreateReviewRequest, UpdateReviewRequest, ReviewQueryParams, PaginationMeta } from "../types";
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
export declare class ReviewRepository extends BaseRepository<ProductReview, CreateReviewData, UpdateReviewData> {
    constructor(prisma?: PrismaClient);
    /**
     * Get reviews for a specific product
     */
    findByProductId(productId: string, params?: ReviewQueryParams): Promise<{
        data: ProductReview[];
        pagination: PaginationMeta;
        summary: {
            totalReviews: number;
            averageRating: number;
            ratingDistribution: {
                rating: number;
                count: number;
            }[];
        };
    }>;
    /**
     * Get reviews by user
     */
    findByUserId(userId: string, params?: ReviewQueryParams): Promise<{
        data: ProductReview[];
        pagination: PaginationMeta;
    }>;
    /**
     * Create new review
     */
    createReview(userId: string, data: CreateReviewRequest): Promise<ProductReview>;
    /**
     * Update review
     */
    updateReview(reviewId: string, userId: string, data: UpdateReviewRequest): Promise<ProductReview>;
    /**
     * Delete review
     */
    deleteReview(reviewId: string, userId: string): Promise<boolean>;
    /**
     * Add helpful vote to review
     */
    addHelpfulVote(reviewId: string): Promise<ProductReview>;
    /**
     * Get reviews requiring moderation (admin)
     */
    getPendingReviews(params?: ReviewQueryParams): Promise<{
        data: ProductReview[];
        pagination: PaginationMeta;
    }>;
    /**
     * Approve/reject review (admin)
     */
    moderateReview(reviewId: string, isApproved: boolean): Promise<ProductReview>;
    /**
     * Get review statistics for admin dashboard
     */
    getReviewStats(): Promise<{
        totalReviews: number;
        pendingReviews: number;
        averageRating: number;
        reviewsByRating: {
            rating: number;
            count: number;
        }[];
        recentReviews: ProductReview[];
    }>;
    /**
     * Private: Update product average rating
     */
    private updateProductRating;
    /**
     * Private: Build order by clause for reviews
     */
    private buildOrderBy;
}
export {};
//# sourceMappingURL=ReviewRepository.d.ts.map