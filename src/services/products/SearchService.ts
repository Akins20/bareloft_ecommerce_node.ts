/**
 * 🔍 Search Service
 * Advanced product search with Nigerian market optimization
 * Supports fuzzy search, autocomplete, and intelligent filtering
 */

import { ProductRepository } from "../../repositories/ProductRepository";
import { CategoryRepository } from "../../repositories/CategoryRepository";
import { BaseService } from "../BaseService";
import { CacheService } from "../cache/CacheService";
import { logger } from "../../utils/logger/winston";
import { CurrencyUtils, NigerianUtils } from "../../utils/helpers/nigerian";
import {
  SearchQuery,
  SearchResult,
  SearchSuggestion,
  SearchFilters,
  PopularSearch,
  SearchAnalytics,
} from "../../types/product.types";

export class SearchService extends BaseService {
  private productRepo: ProductRepository;
  private categoryRepo: CategoryRepository;
  private cacheService: CacheService;

  // 🇳🇬 Nigerian market specific search terms
  private readonly NIGERIAN_PRODUCT_ALIASES = {
    ankara: ["african print", "wax print", "traditional fabric"],
    agbada: ["traditional wear", "nigerian clothing", "formal wear"],
    gele: ["headwrap", "head tie", "traditional headgear"],
    dashiki: ["african shirt", "traditional shirt"],
    kente: ["african fabric", "traditional cloth"],
    phone: ["mobile", "smartphone", "handset"],
    laptop: ["computer", "notebook"],
    garri: ["cassava flakes", "food"],
    yam: ["tuber", "food"],
    rice: ["grain", "food"],
    plantain: ["cooking banana", "food"],
  };

  // 🔍 Common search intent patterns for Nigerian users
  private readonly SEARCH_INTENT_PATTERNS = {
    price: /\b(cheap|affordable|budget|expensive|price|cost|₦|naira)\b/i,
    location:
      /\b(lagos|abuja|kano|port\s*harcourt|ibadan|delivery|shipping)\b/i,
    brand: /\b(samsung|apple|nike|adidas|lg|tecno|infinix)\b/i,
    quality: /\b(original|authentic|quality|durable|lasting)\b/i,
    urgency: /\b(urgent|asap|quick|fast|immediate|today)\b/i,
  };

  constructor() {
    super();
    this.productRepo = new ProductRepository();
    this.categoryRepo = new CategoryRepository();
    this.cacheService = new CacheService();
  }

  /**
   * 🔍 Main search function with intelligent query processing
   */
  async search(query: SearchQuery): Promise<SearchResult> {
    try {
      const startTime = Date.now();

      // Normalize and analyze query
      const processedQuery = this.processSearchQuery(query.q);
      const searchIntent = this.analyzeSearchIntent(query.q);

      // Check cache first
      const cacheKey = this.generateCacheKey(query);
      const cachedResult = await this.cacheService.get<SearchResult>(cacheKey);

      if (cachedResult && !query.bypassCache) {
        logger.info("Search cache hit", { query: query.q, cacheKey });
        return {
          ...cachedResult,
          fromCache: true,
          searchTime: Date.now() - startTime,
        };
      }

      // Build search filters based on intent and explicit filters
      const searchFilters = this.buildSearchFilters(
        processedQuery,
        searchIntent,
        query.filters
      );

      // Execute search
      const products = await this.executeSearch(processedQuery, searchFilters);

      // Get search suggestions
      const suggestions = await this.getSearchSuggestions(query.q);

      // Analyze results for Nigerian market insights
      const marketInsights = this.analyzeSearchResults(
        products,
        processedQuery,
        searchIntent
      );

      const result: SearchResult = {
        query: query.q,
        processedQuery,
        searchIntent,
        products: products.data,
        pagination: products.pagination,
        suggestions,
        marketInsights,
        appliedFilters: searchFilters,
        searchTime: Date.now() - startTime,
        fromCache: false,
      };

      // Cache result for 5 minutes
      await this.cacheService.setex(cacheKey, 300, result);

      // Track search for analytics
      this.trackSearch(query.q, result.products.length, searchIntent);

      return result;
    } catch (error) {
      logger.error("Search error", {
        error: error instanceof Error ? error.message : "Unknown error",
        query: query.q,
      });
      throw error;
    }
  }

  /**
   * 💡 Get search suggestions and autocomplete
   */
  async getSuggestions(
    partialQuery: string,
    limit: number = 10
  ): Promise<SearchSuggestion[]> {
    try {
      if (!partialQuery || partialQuery.length < 2) {
        return this.getPopularSearches(limit);
      }

      const suggestions: SearchSuggestion[] = [];

      // Product name suggestions
      const productSuggestions = await this.productRepo.searchSuggestions(
        partialQuery,
        Math.ceil(limit * 0.6)
      );
      suggestions.push(
        ...productSuggestions.map((product) => ({
          text: product.name,
          type: "product" as const,
          category: product.category?.name,
          count: 1,
          highlight: this.highlightMatch(product.name, partialQuery),
        }))
      );

      // Category suggestions
      const categorySuggestions = await this.categoryRepo.searchSuggestions(
        partialQuery,
        Math.ceil(limit * 0.4)
      );
      suggestions.push(
        ...categorySuggestions.map((category) => ({
          text: category.name,
          type: "category" as const,
          count: category.productCount || 0,
          highlight: this.highlightMatch(category.name, partialQuery),
        }))
      );

      // Nigerian-specific aliases
      const aliases = this.getNigerianAliases(partialQuery);
      suggestions.push(
        ...aliases.map((alias) => ({
          text: alias,
          type: "suggestion" as const,
          count: 0,
          highlight: this.highlightMatch(alias, partialQuery),
        }))
      );

      // Sort by relevance and limit
      return suggestions
        .sort(
          (a, b) =>
            this.calculateSuggestionRelevance(b, partialQuery) -
            this.calculateSuggestionRelevance(a, partialQuery)
        )
        .slice(0, limit);
    } catch (error) {
      logger.error("Error getting search suggestions", {
        error: error instanceof Error ? error.message : "Unknown error",
        partialQuery,
      });
      return [];
    }
  }

  /**
   * 📊 Get popular searches for Nigerian market
   */
  async getPopularSearches(limit: number = 10): Promise<SearchSuggestion[]> {
    try {
      const cacheKey = "popular_searches";
      const cached = await this.cacheService.get<SearchSuggestion[]>(cacheKey);

      if (cached) {
        return cached.slice(0, limit);
      }

      // Nigerian market popular searches
      const popularSearches: SearchSuggestion[] = [
        { text: "Samsung phone", type: "suggestion", count: 1250 },
        { text: "Ankara fabric", type: "suggestion", count: 980 },
        { text: "Laptop", type: "suggestion", count: 850 },
        { text: "Sneakers", type: "suggestion", count: 720 },
        { text: "Traditional wear", type: "suggestion", count: 680 },
        { text: "iPhone", type: "suggestion", count: 650 },
        { text: "Agbada", type: "suggestion", count: 420 },
        { text: "Kitchen appliances", type: "suggestion", count: 380 },
        { text: "Headphones", type: "suggestion", count: 350 },
        { text: "Perfume", type: "suggestion", count: 290 },
      ];

      // Cache for 1 hour
      await this.cacheService.setex(cacheKey, 3600, popularSearches);

      return popularSearches.slice(0, limit);
    } catch (error) {
      logger.error("Error getting popular searches", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return [];
    }
  }

  /**
   * 📈 Get search analytics and trends
   */
  async getSearchAnalytics(
    timeframe: "day" | "week" | "month" = "week"
  ): Promise<SearchAnalytics> {
    try {
      // This would typically pull from analytics database
      // For now, return simulated data
      const analytics: SearchAnalytics = {
        totalSearches: 15420,
        uniqueSearches: 8930,
        avgSearchTime: 245, // milliseconds
        topQueries: [
          { query: "samsung phone", count: 1250, trend: "up" },
          { query: "ankara fabric", count: 980, trend: "stable" },
          { query: "laptop", count: 850, trend: "up" },
          { query: "sneakers", count: 720, trend: "down" },
          { query: "traditional wear", count: 680, trend: "up" },
        ],
        noResultsQueries: [
          { query: "imported rice", count: 45 },
          { query: "luxury cars", count: 32 },
          { query: "vintage phones", count: 28 },
        ],
        searchIntent: {
          product: 65,
          category: 20,
          brand: 10,
          price: 5,
        },
        conversionRate: 12.5, // percentage of searches that led to purchases
        avgResultsPerSearch: 24.7,
        mobileSearchPercentage: 78.5, // High mobile usage in Nigeria
        peakSearchHours: [
          { hour: 9, searches: 890 },
          { hour: 13, searches: 1240 },
          { hour: 19, searches: 1560 },
        ],
      };

      return analytics;
    } catch (error) {
      logger.error("Error getting search analytics", {
        error: error instanceof Error ? error.message : "Unknown error",
        timeframe,
      });
      throw error;
    }
  }

  /**
   * 🔧 Process and normalize search query
   */
  private processSearchQuery(query: string): string {
    let processed = query.toLowerCase().trim();

    // Remove special characters but keep spaces and Nigerian currency symbols
    processed = processed.replace(/[^\w\s₦\-]/g, "");

    // Handle Nigerian-specific terms
    Object.entries(this.NIGERIAN_PRODUCT_ALIASES).forEach(([key, aliases]) => {
      aliases.forEach((alias) => {
        if (processed.includes(alias)) {
          processed = processed.replace(new RegExp(alias, "gi"), key);
        }
      });
    });

    // Normalize common misspellings
    const corrections = {
      andara: "ankara",
      agada: "agbada",
      iphone: "iPhone",
      samsung: "Samsung",
      tecno: "Tecno",
      infinix: "Infinix",
    };

    Object.entries(corrections).forEach(([wrong, correct]) => {
      processed = processed.replace(
        new RegExp(`\\b${wrong}\\b`, "gi"),
        correct
      );
    });

    return processed;
  }

  /**
   * 🧠 Analyze search intent for Nigerian market
   */
  private analyzeSearchIntent(query: string): any {
    const intent = {
      type: "general",
      confidence: 0.5,
      signals: [],
      nigerianContext: {},
    };

    // Check for price intent
    if (this.SEARCH_INTENT_PATTERNS.price.test(query)) {
      intent.type = "price";
      intent.confidence = 0.8;
      intent.signals.push("price_focused");

      // Extract price range if mentioned
      const priceMatch = query.match(/₦?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
      if (priceMatch) {
        intent.nigerianContext.priceRange = parseFloat(
          priceMatch[1].replace(",", "")
        );
      }
    }

    // Check for location intent
    if (this.SEARCH_INTENT_PATTERNS.location.test(query)) {
      intent.type = "location";
      intent.confidence = 0.9;
      intent.signals.push("location_specific");

      // Extract Nigerian cities
      const cities = ["lagos", "abuja", "kano", "port harcourt", "ibadan"];
      const mentionedCity = cities.find((city) =>
        query.toLowerCase().includes(city)
      );
      if (mentionedCity) {
        intent.nigerianContext.preferredLocation = mentionedCity;
      }
    }

    // Check for brand intent
    if (this.SEARCH_INTENT_PATTERNS.brand.test(query)) {
      intent.type = "brand";
      intent.confidence = 0.85;
      intent.signals.push("brand_focused");
    }

    // Check for quality intent
    if (this.SEARCH_INTENT_PATTERNS.quality.test(query)) {
      intent.signals.push("quality_conscious");
      intent.nigerianContext.qualityFocus = true;
    }

    // Check for urgency
    if (this.SEARCH_INTENT_PATTERNS.urgency.test(query)) {
      intent.signals.push("urgent_need");
      intent.nigerianContext.urgency = true;
    }

    return intent;
  }

  /**
   * 🔨 Build search filters based on processed query and intent
   */
  private buildSearchFilters(
    processedQuery: string,
    searchIntent: any,
    explicitFilters?: SearchFilters
  ): any {
    const filters: any = {
      isActive: true,
      inStock: true,
      ...explicitFilters,
    };

    // Apply intent-based filters
    if (
      searchIntent.type === "price" &&
      searchIntent.nigerianContext.priceRange
    ) {
      const price = searchIntent.nigerianContext.priceRange;
      if (
        processedQuery.includes("cheap") ||
        processedQuery.includes("budget")
      ) {
        filters.priceMax = price;
      } else if (
        processedQuery.includes("expensive") ||
        processedQuery.includes("premium")
      ) {
        filters.priceMin = price;
      }
    }

    // Quality filters for Nigerian market
    if (searchIntent.nigerianContext.qualityFocus) {
      filters.excludeLowRated = true; // Exclude products with rating < 3
      filters.verifiedSellers = true; // Prefer verified sellers
    }

    // Urgency filters
    if (searchIntent.nigerianContext.urgency) {
      filters.quickDelivery = true; // Products available for same-day delivery
      filters.inStock = true;
    }

    return filters;
  }

  /**
   * 🎯 Execute the actual search with ranking
   */
  private async executeSearch(
    processedQuery: string,
    filters: any
  ): Promise<any> {
    try {
      // Multi-field search with different weights
      const searchConfig = {
        query: processedQuery,
        fields: {
          name: { weight: 3, boost: true },
          description: { weight: 2 },
          tags: { weight: 2 },
          sku: { weight: 1 },
          category: { weight: 1.5 },
        },
        filters,
        ranking: {
          factors: [
            { field: "popularity", weight: 0.3 },
            { field: "rating", weight: 0.2 },
            { field: "relevance", weight: 0.3 },
            { field: "recency", weight: 0.1 },
            { field: "availability", weight: 0.1 },
          ],
        },
        pagination: {
          page: filters.page || 1,
          limit: filters.limit || 20,
        },
      };

      const results = await this.productRepo.advancedSearch(searchConfig);

      // Apply Nigerian market ranking adjustments
      results.data = this.applyNigerianMarketRanking(
        results.data,
        processedQuery
      );

      return results;
    } catch (error) {
      logger.error("Error executing search", {
        error: error instanceof Error ? error.message : "Unknown error",
        processedQuery,
        filters,
      });
      throw error;
    }
  }

  /**
   * 🇳🇬 Apply Nigerian market specific ranking
   */
  private applyNigerianMarketRanking(products: any[], query: string): any[] {
    return products
      .map((product) => {
        let boost = 1;

        // Boost Nigerian brands and locally relevant products
        const nigerianBrands = ["tecno", "infinix", "gionee"];
        if (
          nigerianBrands.some((brand) =>
            product.name.toLowerCase().includes(brand)
          )
        ) {
          boost += 0.1;
        }

        // Boost products with Nigerian Naira pricing optimization
        if (product.price <= 50000) {
          // Affordable range for Nigerian market
          boost += 0.05;
        }

        // Boost products with good ratings (Nigerian customers value reviews)
        if (product.averageRating >= 4) {
          boost += 0.1;
        }

        // Boost products with fast delivery to major Nigerian cities
        if (product.quickDelivery) {
          boost += 0.05;
        }

        return {
          ...product,
          searchScore: (product.searchScore || 1) * boost,
          nigerianRelevance: boost > 1,
        };
      })
      .sort((a, b) => (b.searchScore || 0) - (a.searchScore || 0));
  }

  /**
   * 📊 Analyze search results for market insights
   */
  private analyzeSearchResults(
    products: any,
    query: string,
    searchIntent: any
  ): any {
    const totalResults = products.data.length;
    const avgPrice =
      products.data.reduce((sum: number, p: any) => sum + p.price, 0) /
      totalResults;

    const insights = {
      totalResults,
      avgPrice: CurrencyUtils.format(avgPrice),
      priceRange: {
        min: Math.min(...products.data.map((p: any) => p.price)),
        max: Math.max(...products.data.map((p: any) => p.price)),
      },
      categories: this.getTopCategories(products.data),
      brands: this.getTopBrands(products.data),
      availability: {
        inStock: products.data.filter((p: any) => p.inStock).length,
        outOfStock: products.data.filter((p: any) => !p.inStock).length,
      },
      nigerianMarketInsights: {
        affordableOptions: products.data.filter((p: any) => p.price <= 25000)
          .length,
        premiumOptions: products.data.filter((p: any) => p.price > 100000)
          .length,
        localBrands: products.data.filter((p: any) =>
          this.isNigerianBrand(p.brand)
        ).length,
        fastDeliveryOptions: products.data.filter((p: any) => p.quickDelivery)
          .length,
      },
      recommendations: this.generateSearchRecommendations(
        products.data,
        query,
        searchIntent
      ),
    };

    return insights;
  }

  /**
   * 💡 Generate search recommendations
   */
  private generateSearchRecommendations(
    products: any[],
    query: string,
    searchIntent: any
  ): string[] {
    const recommendations: string[] = [];

    if (products.length === 0) {
      recommendations.push("Try using more general terms");
      recommendations.push("Check spelling of product names");
      recommendations.push("Browse our categories instead");
    } else if (products.length < 5) {
      recommendations.push("Try related search terms");
      recommendations.push("Consider similar products");
      recommendations.push("Expand your price range");
    } else {
      if (searchIntent.nigerianContext.urgency) {
        const quickDelivery = products.filter((p) => p.quickDelivery).length;
        if (quickDelivery > 0) {
          recommendations.push(
            `${quickDelivery} products available for quick delivery`
          );
        }
      }

      const affordable = products.filter((p) => p.price <= 25000).length;
      if (affordable > 0) {
        recommendations.push(`${affordable} affordable options under ₦25,000`);
      }

      recommendations.push("Sort by customer ratings for best quality");
      recommendations.push("Check for bulk purchase discounts");
    }

    return recommendations;
  }

  /**
   * 🏷️ Get top categories from search results
   */
  private getTopCategories(products: any[]): any[] {
    const categoryCount: { [key: string]: number } = {};

    products.forEach((product) => {
      if (product.category?.name) {
        categoryCount[product.category.name] =
          (categoryCount[product.category.name] || 0) + 1;
      }
    });

    return Object.entries(categoryCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /**
   * 🏢 Get top brands from search results
   */
  private getTopBrands(products: any[]): any[] {
    const brandCount: { [key: string]: number } = {};

    products.forEach((product) => {
      if (product.brand) {
        brandCount[product.brand] = (brandCount[product.brand] || 0) + 1;
      }
    });

    return Object.entries(brandCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /**
   * 🇳🇬 Check if brand is Nigerian
   */
  private isNigerianBrand(brand: string): boolean {
    const nigerianBrands = ["tecno", "infinix", "gionee", "itel"];
    return nigerianBrands.includes(brand?.toLowerCase());
  }

  /**
   * 🎯 Get Nigerian aliases for search term
   */
  private getNigerianAliases(term: string): string[] {
    const aliases: string[] = [];

    Object.entries(this.NIGERIAN_PRODUCT_ALIASES).forEach(([key, values]) => {
      if (
        key.includes(term.toLowerCase()) ||
        values.some((v) => v.includes(term.toLowerCase()))
      ) {
        aliases.push(...values);
      }
    });

    return aliases.slice(0, 3); // Limit to 3 aliases
  }

  /**
   * 🔆 Highlight matching text in suggestions
   */
  private highlightMatch(text: string, query: string): string {
    const regex = new RegExp(`(${query})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
  }

  /**
   * ⭐ Calculate suggestion relevance score
   */
  private calculateSuggestionRelevance(
    suggestion: SearchSuggestion,
    query: string
  ): number {
    let score = 0;

    // Exact match gets highest score
    if (suggestion.text.toLowerCase() === query.toLowerCase()) {
      score += 100;
    }

    // Starts with query gets high score
    if (suggestion.text.toLowerCase().startsWith(query.toLowerCase())) {
      score += 50;
    }

    // Contains query gets medium score
    if (suggestion.text.toLowerCase().includes(query.toLowerCase())) {
      score += 25;
    }

    // Product suggestions get boost
    if (suggestion.type === "product") {
      score += 10;
    }

    // Popular items get boost based on count
    score += Math.log(suggestion.count + 1) * 5;

    return score;
  }

  /**
   * 🔑 Generate cache key for search query
   */
  private generateCacheKey(query: SearchQuery): string {
    const key = `search:${query.q}:${JSON.stringify(query.filters || {})}`;
    return key.replace(/\s/g, "_").toLowerCase();
  }

  /**
   * 📊 Track search for analytics
   */
  private trackSearch(
    query: string,
    resultCount: number,
    searchIntent: any
  ): void {
    // This would typically save to analytics database
    logger.info("Search tracked", {
      query,
      resultCount,
      intent: searchIntent.type,
      timestamp: new Date().toISOString(),
    });
  }
}
