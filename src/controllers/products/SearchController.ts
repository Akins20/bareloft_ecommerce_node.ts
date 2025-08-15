import { Request, Response } from "express";
import { BaseController } from "../BaseController";
import { SearchService } from "../../services/products/SearchService";
import {
  SearchQuery,
  SearchResponse,
  SearchSuggestion,
  SearchFilters,
  AutocompleteResponse,
} from "../../types/product.types";
import { ApiResponse } from "../../types/api.types";
import { AuthenticatedRequest } from "../../types/auth.types";

export class SearchController extends BaseController {
  private searchService: SearchService;

  constructor(searchService: SearchService) {
    super();
    this.searchService = searchService;
  }

  /**
   * Search products with advanced filtering
   * GET /api/v1/search
   */
  public searchProducts = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const query = (req.query.q as string) || (req.query.query as string);

      if (!query || query.trim().length < 2) {
        this.sendError(
          res,
          "Search query must be at least 2 characters long",
          400,
          "INVALID_QUERY"
        );
        return;
      }

      const searchQuery: SearchQuery = {
        query: query.trim(),
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
        categoryId: req.query.categoryId as string,
        minPrice: req.query.minPrice
          ? parseFloat(req.query.minPrice as string)
          : undefined,
        maxPrice: req.query.maxPrice
          ? parseFloat(req.query.maxPrice as string)
          : undefined,
        brand: req.query.brand as string,
        inStock: this.parseBoolean(req.query.inStock),
        rating: req.query.rating
          ? parseInt(req.query.rating as string)
          : undefined,
        sortBy: (req.query.sortBy as any) || "relevance",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
        filters: this.parseSearchFilters(req.query),
      };

      const result = await this.searchService.searchProducts(searchQuery);

      // Log search for analytics
      this.logAction(
        "PRODUCT_SEARCH",
        (req as any).user?.id,
        "SEARCH",
        undefined,
        {
          query: query.trim(),
          resultCount: result.products.length,
          totalResults: result.pagination.total,
        }
      );

      const response: ApiResponse<SearchResponse> = {
        success: true,
        message: `Found ${result.products.length} product(s) for "${query}"`,
        data: result,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get search autocomplete suggestions
   * GET /api/v1/search/autocomplete
   */
  public getAutocomplete = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const query = (req.query.q as string) || (req.query.query as string);
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

      if (!query || query.trim().length < 2) {
        this.sendSuccess(
          res,
          { suggestions: [] },
          "Autocomplete suggestions retrieved"
        );
        return;
      }

      const suggestions = await this.searchService.getAutocompleteSuggestions(
        query.trim(),
        limit
      );

      const response: ApiResponse<AutocompleteResponse> = {
        success: true,
        message: "Autocomplete suggestions retrieved successfully",
        data: { suggestions },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get popular search terms
   * GET /api/v1/search/popular
   */
  public getPopularSearchTerms = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const timeframe = (req.query.timeframe as string) || "7d"; // 7d, 30d, 90d

      const popularTerms = await this.searchService.getPopularSearchTerms(
        limit,
        timeframe
      );

      this.sendSuccess(
        res,
        {
          terms: popularTerms,
          timeframe,
          generatedAt: new Date().toISOString(),
        },
        "Popular search terms retrieved successfully"
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get search suggestions based on user history
   * GET /api/v1/search/suggestions
   */
  public getPersonalizedSuggestions = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

      let suggestions: SearchSuggestion[];

      if (userId) {
        suggestions = await this.searchService.getPersonalizedSuggestions(
          userId,
          limit
        );
      } else {
        // Fallback to popular suggestions for non-authenticated users
        suggestions = await this.searchService.getPopularSuggestions(limit);
      }

      this.sendSuccess(
        res,
        {
          suggestions,
          personalized: !!userId,
        },
        "Search suggestions retrieved successfully"
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Search within a specific category
   * GET /api/v1/search/category/:categoryId
   */
  public searchInCategory = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { categoryId } = req.params;
      const query = (req.query.q as string) || (req.query.query as string);

      if (!query || query.trim().length < 2) {
        this.sendError(
          res,
          "Search query must be at least 2 characters long",
          400,
          "INVALID_QUERY"
        );
        return;
      }

      const searchQuery: SearchQuery = {
        query: query.trim(),
        categoryId,
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
        minPrice: req.query.minPrice
          ? parseFloat(req.query.minPrice as string)
          : undefined,
        maxPrice: req.query.maxPrice
          ? parseFloat(req.query.maxPrice as string)
          : undefined,
        brand: req.query.brand as string,
        inStock: this.parseBoolean(req.query.inStock),
        rating: req.query.rating
          ? parseInt(req.query.rating as string)
          : undefined,
        sortBy: (req.query.sortBy as any) || "relevance",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
      };

      const result = await this.searchService.searchInCategory(searchQuery);

      this.logAction(
        "CATEGORY_SEARCH",
        (req as any).user?.id,
        "SEARCH",
        undefined,
        {
          query: query.trim(),
          categoryId,
          resultCount: result.products.length,
        }
      );

      const response: ApiResponse<SearchResponse> = {
        success: true,
        message: `Found ${result.pagination.total} product(s) in category`,
        data: result,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Search by brand
   * GET /api/v1/search/brand/:brand
   */
  public searchByBrand = async (req: Request, res: Response): Promise<void> => {
    try {
      const { brand } = req.params;
      const query = (req.query.q as string) || "";

      const decodedBrand = decodeURIComponent(brand!);
      
      const searchQuery: SearchQuery = {
        query: query.trim(),
        brand: decodedBrand,
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
        categoryId: req.query.categoryId as string,
        minPrice: req.query.minPrice
          ? parseFloat(req.query.minPrice as string)
          : undefined,
        maxPrice: req.query.maxPrice
          ? parseFloat(req.query.maxPrice as string)
          : undefined,
        inStock: this.parseBoolean(req.query.inStock),
        rating: req.query.rating
          ? parseInt(req.query.rating as string)
          : undefined,
        sortBy: (req.query.sortBy as any) || "name",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "asc",
      };

      const result = await this.searchService.searchByBrand(searchQuery);

      this.logAction(
        "BRAND_SEARCH",
        (req as any).user?.id,
        "SEARCH",
        undefined,
        {
          brand: decodedBrand,
          query: query.trim(),
          resultCount: result.products.length,
        }
      );

      const response: ApiResponse<SearchResponse> = {
        success: true,
        message: `Found ${result.pagination.total} product(s) from ${decodedBrand}`,
        data: result,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get search filters for current query
   * GET /api/v1/search/filters
   */
  public getSearchFilters = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const query = (req.query.q as string) || (req.query.query as string);

      if (!query || query.trim().length < 2) {
        this.sendError(res, "Search query is required", 400, "INVALID_QUERY");
        return;
      }

      const filters = await this.searchService.getAvailableFilters(
        query.trim()
      );

      this.sendSuccess(res, filters, "Search filters retrieved successfully");
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get search history for authenticated user
   * GET /api/v1/search/history
   */
  public getSearchHistory = async (
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

      const history = await this.searchService.getUserSearchHistory(userId, {
        page,
        limit,
      });

      this.sendPaginatedResponse(
        res,
        history.searches,
        history.pagination,
        "Search history retrieved successfully"
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Clear search history
   * DELETE /api/v1/search/history
   */
  public clearSearchHistory = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);

      if (!userId) {
        this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
        return;
      }

      const result = await this.searchService.clearUserSearchHistory(userId);

      this.logAction("SEARCH_HISTORY_CLEARED", userId, "SEARCH", undefined, {
        itemsCleared: result.clearedCount,
      });

      this.sendSuccess(
        res,
        {
          clearedCount: result.clearedCount,
        },
        "Search history cleared successfully"
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get trending searches
   * GET /api/v1/search/trending
   */
  public getTrendingSearches = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
      const hours = parseInt(req.query.hours as string) || 24; // Last 24 hours by default

      const trending = await this.searchService.getTrendingSearches(
        limit,
        hours
      );

      this.sendSuccess(
        res,
        {
          searches: trending,
          timeframe: `${hours} hours`,
          generatedAt: new Date().toISOString(),
        },
        "Trending searches retrieved successfully"
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Save search to user history
   * POST /api/v1/search/save
   */
  public saveSearch = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { query, filters, resultCount } = req.body;

      if (!query || query.trim().length < 2) {
        this.sendError(
          res,
          "Valid search query is required",
          400,
          "INVALID_QUERY"
        );
        return;
      }

      if (userId) {
        await this.searchService.saveSearchToHistory(userId, {
          query: query.trim(),
          filters,
          resultCount: resultCount || 0,
        });

        this.logAction("SEARCH_SAVED", userId, "SEARCH", undefined, {
          query: query.trim(),
          resultCount: resultCount || 0,
        });
      }

      this.sendSuccess(res, null, "Search saved successfully");
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get search analytics (admin endpoint)
   * GET /api/v1/search/analytics
   */
  public getSearchAnalytics = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      // Check admin permissions
      if (!this.hasRole(req, "admin")) {
        this.sendError(res, "Admin access required", 403, "FORBIDDEN");
        return;
      }

      const days = parseInt(req.query.days as string) || 30;

      const analytics = await this.searchService.getSearchAnalyticsWithDays(days);

      this.sendSuccess(
        res,
        analytics,
        "Search analytics retrieved successfully"
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Parse search filters from query parameters
   */
  private parseSearchFilters(query: any): SearchFilters {
    const filters: SearchFilters = {};

    // Price range
    if (query.minPrice) filters.minPrice = parseFloat(query.minPrice);
    if (query.maxPrice) filters.maxPrice = parseFloat(query.maxPrice);

    // Rating
    if (query.rating) filters.rating = parseInt(query.rating);

    // Availability
    if (query.inStock !== undefined)
      filters.inStock = this.parseBoolean(query.inStock);

    // Brand
    if (query.brand) filters.brand = query.brand;

    // Category
    if (query.categoryId) filters.categoryId = query.categoryId;

    // Features (for products with specific features)
    if (query.features) {
      filters.features = Array.isArray(query.features)
        ? query.features
        : [query.features];
    }

    // Colors (for products with color variants)
    if (query.colors) {
      filters.colors = Array.isArray(query.colors)
        ? query.colors
        : [query.colors];
    }

    // Sizes (for products with size variants)
    if (query.sizes) {
      filters.sizes = Array.isArray(query.sizes) ? query.sizes : [query.sizes];
    }

    // Discount filters
    if (query.onSale !== undefined)
      filters.onSale = this.parseBoolean(query.onSale);
    if (query.discountPercentage)
      filters.discountPercentage = parseInt(query.discountPercentage);

    return filters;
  }
}
