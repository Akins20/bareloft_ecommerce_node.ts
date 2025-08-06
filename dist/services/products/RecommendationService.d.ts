import { BaseService } from "../BaseService";
import { ProductRepository } from "../../repositories/ProductRepository";
import { Product } from "../../types";
import { CacheService } from "../cache/CacheService";
interface RecommendationOptions {
    limit?: number;
    excludeOutOfStock?: boolean;
    includeCategories?: string[];
    excludeCategories?: string[];
    priceRange?: {
        min?: number;
        max?: number;
    };
    userId?: string;
}
export declare class RecommendationService extends BaseService {
    private productRepository;
    private cacheService;
    constructor(productRepository?: ProductRepository, cacheService?: CacheService);
    /**
     * Get personalized recommendations for a user
     * Combines collaborative filtering and content-based filtering
     */
    getPersonalizedRecommendations(userId: string, options?: RecommendationOptions): Promise<Product[]>;
    /**
     * Get product recommendations based on a specific product (similar products)
     */
    getSimilarProducts(productId: string, options?: RecommendationOptions): Promise<Product[]>;
    /**
     * Get frequently bought together recommendations
     */
    getFrequentlyBoughtTogether(productId: string, options?: RecommendationOptions): Promise<Product[]>;
    /**
     * Get trending/popular recommendations
     */
    getTrendingRecommendations(options?: RecommendationOptions): Promise<Product[]>;
    /**
     * Get category-based recommendations
     */
    getCategoryRecommendations(categoryId: string, options?: RecommendationOptions): Promise<Product[]>;
    /**
     * Get cross-sell recommendations (complementary products)
     */
    getCrossSellRecommendations(cartItems: string[], options?: RecommendationOptions): Promise<Product[]>;
    /**
     * Get upsell recommendations (higher-value alternatives)
     */
    getUpsellRecommendations(productId: string, options?: RecommendationOptions): Promise<Product[]>;
    private getUserBehavior;
    private isNewUser;
    private getCollaborativeRecommendations;
    private getContentBasedRecommendations;
    private findSimilarProducts;
    private rankBySimilarity;
    private calculateSimilarity;
    private getProductCoOccurrence;
    private getTrendingProducts;
    private getTopCategoryProducts;
    private findComplementaryProducts;
    private findUpsellProducts;
    private findSimilarUsers;
    private mergeRecommendations;
    private applyFilters;
    private transformProduct;
}
export {};
//# sourceMappingURL=RecommendationService.d.ts.map