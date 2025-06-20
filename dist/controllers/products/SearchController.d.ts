import { Request, Response } from "express";
import { BaseController } from "../BaseController";
import { SearchService } from "../../services/products/SearchService";
import { AuthenticatedRequest } from "../../types/auth.types";
export declare class SearchController extends BaseController {
    private searchService;
    constructor(searchService: SearchService);
    /**
     * Search products with advanced filtering
     * GET /api/v1/search
     */
    searchProducts: (req: Request, res: Response) => Promise<void>;
    /**
     * Get search autocomplete suggestions
     * GET /api/v1/search/autocomplete
     */
    getAutocomplete: (req: Request, res: Response) => Promise<void>;
    /**
     * Get popular search terms
     * GET /api/v1/search/popular
     */
    getPopularSearchTerms: (req: Request, res: Response) => Promise<void>;
    /**
     * Get search suggestions based on user history
     * GET /api/v1/search/suggestions
     */
    getPersonalizedSuggestions: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Search within a specific category
     * GET /api/v1/search/category/:categoryId
     */
    searchInCategory: (req: Request, res: Response) => Promise<void>;
    /**
     * Search by brand
     * GET /api/v1/search/brand/:brand
     */
    searchByBrand: (req: Request, res: Response) => Promise<void>;
    /**
     * Get search filters for current query
     * GET /api/v1/search/filters
     */
    getSearchFilters: (req: Request, res: Response) => Promise<void>;
    /**
     * Get search history for authenticated user
     * GET /api/v1/search/history
     */
    getSearchHistory: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Clear search history
     * DELETE /api/v1/search/history
     */
    clearSearchHistory: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Get trending searches
     * GET /api/v1/search/trending
     */
    getTrendingSearches: (req: Request, res: Response) => Promise<void>;
    /**
     * Save search to user history
     * POST /api/v1/search/save
     */
    saveSearch: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Get search analytics (admin endpoint)
     * GET /api/v1/search/analytics
     */
    getSearchAnalytics: (req: Request, res: Response) => Promise<void>;
    /**
     * Parse search filters from query parameters
     */
    private parseSearchFilters;
}
//# sourceMappingURL=SearchController.d.ts.map