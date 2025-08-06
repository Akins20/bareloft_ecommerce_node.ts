/**
 * 🔍 Search Service
 * Advanced product search with Nigerian market optimization
 * Supports fuzzy search, autocomplete, and intelligent filtering
 */
import { BaseService } from "../BaseService";
import { SearchQuery, SearchResult, SearchSuggestion, SearchFilters, SearchAnalytics, SearchResponse, SearchHistoryResponse, ClearHistoryResult, TrendingSearch } from "../../types/product.types";
import { PaginationParams } from "../../types/common.types";
export declare class SearchService extends BaseService {
    private productRepo;
    private categoryRepo;
    private cacheService;
    private readonly NIGERIAN_PRODUCT_ALIASES;
    private readonly SEARCH_INTENT_PATTERNS;
    constructor();
    /**
     * 🔍 Search products with advanced filtering
     */
    searchProducts(query: SearchQuery): Promise<SearchResponse>;
    /**
     * 🔍 Main search function with intelligent query processing
     */
    search(query: SearchQuery): Promise<SearchResult>;
    /**
     * 🔍 Get autocomplete suggestions
     */
    getAutocompleteSuggestions(query: string, limit?: number): Promise<SearchSuggestion[]>;
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
    /**
     * 🔍 Get popular search terms
     */
    getPopularSearchTerms(limit?: number, timeframe?: string): Promise<{
        query: string;
        count: number;
    }[]>;
    /**
     * 👤 Get personalized suggestions for user
     */
    getPersonalizedSuggestions(userId: string, limit?: number): Promise<SearchSuggestion[]>;
    /**
     * 🌟 Get popular suggestions
     */
    getPopularSuggestions(limit?: number): Promise<SearchSuggestion[]>;
    /**
     * 🔍 Search in specific category
     */
    searchInCategory(query: SearchQuery): Promise<SearchResponse>;
    /**
     * 🏷️ Search by brand
     */
    searchByBrand(query: SearchQuery): Promise<SearchResponse>;
    /**
     * 🔧 Get available filters for search query
     */
    getAvailableFilters(query: string): Promise<{
        brands: {
            name: string;
            count: number;
        }[];
        categories: {
            id: string;
            name: string;
            count: number;
        }[];
        priceRanges: {
            min: number;
            max: number;
            count: number;
        }[];
    }>;
    /**
     * 📜 Get user search history
     */
    getUserSearchHistory(userId: string, params: PaginationParams): Promise<SearchHistoryResponse>;
    /**
     * 🗑️ Clear user search history
     */
    clearUserSearchHistory(userId: string): Promise<ClearHistoryResult>;
    /**
     * 📈 Get trending searches
     */
    getTrendingSearches(limit?: number, hours?: number): Promise<TrendingSearch[]>;
    /**
     * 💾 Save search to user history
     */
    saveSearchToHistory(userId: string, searchData: {
        query: string;
        filters?: SearchFilters;
        resultCount: number;
    }): Promise<void>;
    /**
     * 📊 Get search analytics (admin) - with days parameter
     */
    getSearchAnalyticsWithDays(days?: number): Promise<SearchAnalytics>;
}
//# sourceMappingURL=SearchService.d.ts.map