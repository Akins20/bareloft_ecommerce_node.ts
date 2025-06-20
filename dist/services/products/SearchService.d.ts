/**
 * 🔍 Search Service
 * Advanced product search with Nigerian market optimization
 * Supports fuzzy search, autocomplete, and intelligent filtering
 */
import { BaseService } from "../BaseService";
import { SearchQuery, SearchResult, SearchSuggestion, SearchAnalytics } from "../../types/product.types";
export declare class SearchService extends BaseService {
    private productRepo;
    private categoryRepo;
    private cacheService;
    private readonly NIGERIAN_PRODUCT_ALIASES;
    private readonly SEARCH_INTENT_PATTERNS;
    constructor();
    /**
     * 🔍 Main search function with intelligent query processing
     */
    search(query: SearchQuery): Promise<SearchResult>;
    /**
     * 💡 Get search suggestions and autocomplete
     */
    getSuggestions(partialQuery: string, limit?: number): Promise<SearchSuggestion[]>;
    /**
     * 📊 Get popular searches for Nigerian market
     */
    getPopularSearches(limit?: number): Promise<SearchSuggestion[]>;
    /**
     * 📈 Get search analytics and trends
     */
    getSearchAnalytics(timeframe?: "day" | "week" | "month"): Promise<SearchAnalytics>;
    /**
     * 🔧 Process and normalize search query
     */
    private processSearchQuery;
    /**
     * 🧠 Analyze search intent for Nigerian market
     */
    private analyzeSearchIntent;
    /**
     * 🔨 Build search filters based on processed query and intent
     */
    private buildSearchFilters;
    /**
     * 🎯 Execute the actual search with ranking
     */
    private executeSearch;
    /**
     * 🇳🇬 Apply Nigerian market specific ranking
     */
    private applyNigerianMarketRanking;
    /**
     * 📊 Analyze search results for market insights
     */
    private analyzeSearchResults;
    /**
     * 💡 Generate search recommendations
     */
    private generateSearchRecommendations;
    /**
     * 🏷️ Get top categories from search results
     */
    private getTopCategories;
    /**
     * 🏢 Get top brands from search results
     */
    private getTopBrands;
    /**
     * 🇳🇬 Check if brand is Nigerian
     */
    private isNigerianBrand;
    /**
     * 🎯 Get Nigerian aliases for search term
     */
    private getNigerianAliases;
    /**
     * 🔆 Highlight matching text in suggestions
     */
    private highlightMatch;
    /**
     * ⭐ Calculate suggestion relevance score
     */
    private calculateSuggestionRelevance;
    /**
     * 🔑 Generate cache key for search query
     */
    private generateCacheKey;
    /**
     * 📊 Track search for analytics
     */
    private trackSearch;
}
//# sourceMappingURL=SearchService.d.ts.map