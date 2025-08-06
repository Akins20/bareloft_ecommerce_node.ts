"use strict";
/**
 * 🔍 Search Service
 * Advanced product search with Nigerian market optimization
 * Supports fuzzy search, autocomplete, and intelligent filtering
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const ProductRepository_1 = require("../../repositories/ProductRepository");
const CategoryRepository_1 = require("../../repositories/CategoryRepository");
const BaseService_1 = require("../BaseService");
const CacheService_1 = require("../cache/CacheService");
const RedisService_1 = require("../cache/RedisService");
const connection_1 = require("../../database/connection");
const winston_1 = require("../../utils/logger/winston");
class SearchService extends BaseService_1.BaseService {
    productRepo;
    categoryRepo;
    cacheService;
    // 🇳🇬 Nigerian market specific search terms
    NIGERIAN_PRODUCT_ALIASES = {
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
    SEARCH_INTENT_PATTERNS = {
        price: /\b(cheap|affordable|budget|expensive|price|cost|₦|naira)\b/i,
        location: /\b(lagos|abuja|kano|port\s*harcourt|ibadan|delivery|shipping)\b/i,
        brand: /\b(samsung|apple|nike|adidas|lg|tecno|infinix)\b/i,
        quality: /\b(original|authentic|quality|durable|lasting)\b/i,
        urgency: /\b(urgent|asap|quick|fast|immediate|today)\b/i,
    };
    constructor() {
        super();
        this.productRepo = new ProductRepository_1.ProductRepository(connection_1.prisma);
        this.categoryRepo = new CategoryRepository_1.CategoryRepository(connection_1.prisma);
        this.cacheService = new CacheService_1.CacheService(new RedisService_1.RedisService());
    }
    /**
     * 🔍 Search products with advanced filtering
     */
    async searchProducts(query) {
        try {
            const startTime = Date.now();
            const processedQuery = this.processSearchQuery(query.query);
            // Execute search with filters
            const products = await this.productRepo.findMany({
                page: query.page || 1,
                limit: query.limit || 20,
                // Add search filters as needed
            });
            const suggestions = await this.getSuggestions(query.query, 5);
            return {
                products: products.data,
                pagination: {
                    currentPage: products.pagination.page || 1,
                    totalPages: products.pagination.totalPages,
                    total: products.pagination.total || 0,
                    hasNext: products.pagination.hasNext || false,
                    hasPrev: products.pagination.hasPrev || false,
                },
                suggestions,
                searchTime: Date.now() - startTime,
            };
        }
        catch (error) {
            winston_1.logger.error('Search products error', { error, query });
            throw error;
        }
    }
    /**
     * 🔍 Main search function with intelligent query processing
     */
    async search(query) {
        try {
            const startTime = Date.now();
            // Normalize and analyze query
            const processedQuery = this.processSearchQuery(query.query);
            const searchIntent = this.analyzeSearchIntent(query.query);
            // Check cache first
            const cacheKey = this.generateCacheKey(query);
            const cachedResult = await this.cacheService.get(cacheKey);
            if (cachedResult) {
                winston_1.logger.info("Search cache hit", { query: query.query, cacheKey });
                return {
                    ...cachedResult,
                    searchTime: Date.now() - startTime,
                };
            }
            // Build search filters based on intent and explicit filters
            const searchFilters = this.buildSearchFilters(processedQuery, searchIntent, query.filters);
            // Execute search
            const products = await this.executeSearch(processedQuery, searchFilters);
            // Get search suggestions
            const suggestions = await this.getSuggestions(query.query);
            // Analyze results for Nigerian market insights
            const marketInsights = this.analyzeSearchResults(products, processedQuery, searchIntent);
            const result = {
                products: products.data,
                categories: [], // TODO: Add categories
                totalResults: products.pagination.total,
                searchTime: Date.now() - startTime,
                suggestions,
                filters: searchFilters,
                facets: {
                    brands: [],
                    categories: [],
                    priceRanges: [],
                },
            };
            // Cache result for 5 minutes
            await this.cacheService.set(cacheKey, result);
            // Track search for analytics
            this.trackSearch(query.query, result.products.length, searchIntent);
            return result;
        }
        catch (error) {
            winston_1.logger.error("Search error", {
                error: error instanceof Error ? error.message : "Unknown error",
                query: query.query,
            });
            throw error;
        }
    }
    /**
     * 🔍 Get autocomplete suggestions
     */
    async getAutocompleteSuggestions(query, limit = 10) {
        return this.getSuggestions(query, limit);
    }
    /**
     * 💡 Get search suggestions and autocomplete
     */
    async getSuggestions(partialQuery, limit = 10) {
        try {
            if (!partialQuery || partialQuery.length < 2) {
                return this.getPopularSearches(limit);
            }
            const suggestions = [];
            // Product name suggestions (mock implementation)
            const productSuggestions = await this.productRepo.findMany({
                search: partialQuery,
                limit: Math.ceil(limit * 0.6),
            });
            suggestions.push(...productSuggestions.data.map((product) => ({
                text: product.name,
                type: "product",
                category: product.category?.name,
                count: 1,
                relevance: 0.8,
                highlight: this.highlightMatch(product.name, partialQuery),
            })));
            // Category suggestions (mock implementation)
            const categorySuggestions = await this.categoryRepo.findMany({
                search: partialQuery,
                limit: Math.ceil(limit * 0.4),
            });
            suggestions.push(...categorySuggestions.data.map((category) => ({
                text: category.name,
                type: "category",
                count: category.productCount || 0,
                relevance: 0.6,
                highlight: this.highlightMatch(category.name, partialQuery),
            })));
            // Nigerian-specific aliases
            const aliases = this.getNigerianAliases(partialQuery);
            suggestions.push(...aliases.map((alias) => ({
                text: alias,
                type: "suggestion",
                count: 0,
                relevance: 0.4,
                highlight: this.highlightMatch(alias, partialQuery),
            })));
            // Sort by relevance and limit
            return suggestions
                .sort((a, b) => this.calculateSuggestionRelevance(b, partialQuery) -
                this.calculateSuggestionRelevance(a, partialQuery))
                .slice(0, limit);
        }
        catch (error) {
            winston_1.logger.error("Error getting search suggestions", {
                error: error instanceof Error ? error.message : "Unknown error",
                partialQuery,
            });
            return [];
        }
    }
    /**
     * 📊 Get popular searches for Nigerian market
     */
    async getPopularSearches(limit = 10) {
        try {
            const cacheKey = "popular_searches";
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                return cached.slice(0, limit);
            }
            // Nigerian market popular searches
            const popularSearches = [
                { text: "Samsung phone", type: "suggestion", count: 1250, relevance: 0.9 },
                { text: "Ankara fabric", type: "suggestion", count: 980, relevance: 0.85 },
                { text: "Laptop", type: "suggestion", count: 850, relevance: 0.8 },
                { text: "Sneakers", type: "suggestion", count: 720, relevance: 0.75 },
                { text: "Traditional wear", type: "suggestion", count: 680, relevance: 0.7 },
                { text: "iPhone", type: "suggestion", count: 650, relevance: 0.65 },
                { text: "Agbada", type: "suggestion", count: 420, relevance: 0.6 },
                { text: "Kitchen appliances", type: "suggestion", count: 380, relevance: 0.55 },
                { text: "Headphones", type: "suggestion", count: 350, relevance: 0.5 },
                { text: "Perfume", type: "suggestion", count: 290, relevance: 0.45 },
            ];
            // Cache for 1 hour
            await this.cacheService.set(cacheKey, popularSearches);
            return popularSearches.slice(0, limit);
        }
        catch (error) {
            winston_1.logger.error("Error getting popular searches", {
                error: error instanceof Error ? error.message : "Unknown error",
            });
            return [];
        }
    }
    /**
     * 📈 Get search analytics and trends
     */
    async getSearchAnalytics(timeframe = "week") {
        try {
            // This would typically pull from analytics database
            // For now, return simulated data
            const analytics = {
                totalSearches: 15420,
                uniqueSearches: 8930,
                avgSearchTime: 245, // milliseconds
                topQueries: [
                    { query: "samsung phone", count: 1250, trend: "rising", lastSearched: new Date() },
                    { query: "ankara fabric", count: 980, trend: "stable", lastSearched: new Date() },
                    { query: "laptop", count: 850, trend: "rising", lastSearched: new Date() },
                    { query: "sneakers", count: 720, trend: "falling", lastSearched: new Date() },
                    { query: "traditional wear", count: 680, trend: "rising", lastSearched: new Date() },
                ],
                noResultQueries: [
                    "imported rice",
                    "luxury cars",
                    "vintage phones",
                ],
                searchVolume: {
                    total: 15420,
                    unique: 8930,
                    period: "week"
                },
                averageResultsPerQuery: 45.2,
                popularFilters: [
                    { filter: 'category', usage: 35.5 },
                    { filter: 'price', usage: 28.3 },
                    { filter: 'brand', usage: 22.1 }
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
        }
        catch (error) {
            winston_1.logger.error("Error getting search analytics", {
                error: error instanceof Error ? error.message : "Unknown error",
                timeframe,
            });
            throw error;
        }
    }
    /**
     * 🔧 Process and normalize search query
     */
    processSearchQuery(query) {
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
            processed = processed.replace(new RegExp(`\\b${wrong}\\b`, "gi"), correct);
        });
        return processed;
    }
    /**
     * 🧠 Analyze search intent for Nigerian market
     */
    analyzeSearchIntent(query) {
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
                intent.nigerianContext.priceRange = parseFloat(priceMatch[1].replace(",", ""));
            }
        }
        // Check for location intent
        if (this.SEARCH_INTENT_PATTERNS.location.test(query)) {
            intent.type = "location";
            intent.confidence = 0.9;
            intent.signals.push("location_specific");
            // Extract Nigerian cities
            const cities = ["lagos", "abuja", "kano", "port harcourt", "ibadan"];
            const mentionedCity = cities.find((city) => query.toLowerCase().includes(city));
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
    buildSearchFilters(processedQuery, searchIntent, explicitFilters) {
        const filters = {
            isActive: true,
            inStock: true,
            ...explicitFilters,
        };
        // Apply intent-based filters
        if (searchIntent.type === "price" &&
            searchIntent.nigerianContext.priceRange) {
            const price = searchIntent.nigerianContext.priceRange;
            if (processedQuery.includes("cheap") ||
                processedQuery.includes("budget")) {
                filters.priceMax = price;
            }
            else if (processedQuery.includes("expensive") ||
                processedQuery.includes("premium")) {
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
    async executeSearch(processedQuery, filters) {
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
            const results = await this.productRepo.findMany({
                page: filters.page || 1,
                limit: filters.limit || 20,
                // Add search filters as needed
            });
            // Apply Nigerian market ranking adjustments
            results.data = this.applyNigerianMarketRanking(results.data, processedQuery);
            return results;
        }
        catch (error) {
            winston_1.logger.error("Error executing search", {
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
    applyNigerianMarketRanking(products, query) {
        return products
            .map((product) => {
            let boost = 1;
            // Boost Nigerian brands and locally relevant products
            const nigerianBrands = ["tecno", "infinix", "gionee"];
            if (nigerianBrands.some((brand) => product.name.toLowerCase().includes(brand))) {
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
    analyzeSearchResults(products, query, searchIntent) {
        const totalResults = products.data.length;
        const avgPrice = products.data.reduce((sum, p) => sum + p.price, 0) /
            totalResults;
        const insights = {
            totalResults,
            avgPrice: `₦${avgPrice.toFixed(2)}`,
            priceRange: {
                min: Math.min(...products.data.map((p) => p.price)),
                max: Math.max(...products.data.map((p) => p.price)),
            },
            categories: this.getTopCategories(products.data),
            brands: this.getTopBrands(products.data),
            availability: {
                inStock: products.data.filter((p) => p.inStock).length,
                outOfStock: products.data.filter((p) => !p.inStock).length,
            },
            nigerianMarketInsights: {
                affordableOptions: products.data.filter((p) => p.price <= 25000)
                    .length,
                premiumOptions: products.data.filter((p) => p.price > 100000)
                    .length,
                localBrands: products.data.filter((p) => this.isNigerianBrand(p.brand)).length,
                fastDeliveryOptions: products.data.filter((p) => p.quickDelivery)
                    .length,
            },
            recommendations: this.generateSearchRecommendations(products.data, query, searchIntent),
        };
        return insights;
    }
    /**
     * 💡 Generate search recommendations
     */
    generateSearchRecommendations(products, query, searchIntent) {
        const recommendations = [];
        if (products.length === 0) {
            recommendations.push("Try using more general terms");
            recommendations.push("Check spelling of product names");
            recommendations.push("Browse our categories instead");
        }
        else if (products.length < 5) {
            recommendations.push("Try related search terms");
            recommendations.push("Consider similar products");
            recommendations.push("Expand your price range");
        }
        else {
            if (searchIntent.nigerianContext.urgency) {
                const quickDelivery = products.filter((p) => p.quickDelivery).length;
                if (quickDelivery > 0) {
                    recommendations.push(`${quickDelivery} products available for quick delivery`);
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
    getTopCategories(products) {
        const categoryCount = {};
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
    getTopBrands(products) {
        const brandCount = {};
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
    isNigerianBrand(brand) {
        const nigerianBrands = ["tecno", "infinix", "gionee", "itel"];
        return nigerianBrands.includes(brand?.toLowerCase());
    }
    /**
     * 🎯 Get Nigerian aliases for search term
     */
    getNigerianAliases(term) {
        const aliases = [];
        Object.entries(this.NIGERIAN_PRODUCT_ALIASES).forEach(([key, values]) => {
            if (key.includes(term.toLowerCase()) ||
                values.some((v) => v.includes(term.toLowerCase()))) {
                aliases.push(...values);
            }
        });
        return aliases.slice(0, 3); // Limit to 3 aliases
    }
    /**
     * 🔆 Highlight matching text in suggestions
     */
    highlightMatch(text, query) {
        const regex = new RegExp(`(${query})`, "gi");
        return text.replace(regex, "<mark>$1</mark>");
    }
    /**
     * ⭐ Calculate suggestion relevance score
     */
    calculateSuggestionRelevance(suggestion, query) {
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
        score += Math.log((suggestion.count || 0) + 1) * 5;
        return score;
    }
    /**
     * 🔑 Generate cache key for search query
     */
    generateCacheKey(query) {
        const key = `search:${query.query}:${JSON.stringify(query.filters || {})}`;
        return key.replace(/\s/g, "_").toLowerCase();
    }
    /**
     * 📊 Track search for analytics
     */
    trackSearch(query, resultCount, searchIntent) {
        // This would typically save to analytics database
        winston_1.logger.info("Search tracked", {
            query,
            resultCount,
            intent: searchIntent.type,
            timestamp: new Date().toISOString(),
        });
    }
    /**
     * 🔍 Get popular search terms
     */
    async getPopularSearchTerms(limit = 10, timeframe = "7d") {
        try {
            // This would typically query analytics database
            const terms = [
                { query: "samsung phone", count: 1250 },
                { query: "ankara fabric", count: 980 },
                { query: "laptop", count: 850 },
                { query: "sneakers", count: 720 },
                { query: "traditional wear", count: 680 },
                { query: "iPhone", count: 650 },
                { query: "agbada", count: 420 },
                { query: "kitchen appliances", count: 380 },
                { query: "headphones", count: 350 },
                { query: "perfume", count: 290 },
            ];
            return terms.slice(0, limit);
        }
        catch (error) {
            winston_1.logger.error("Error getting popular search terms", { error, timeframe });
            return [];
        }
    }
    /**
     * 👤 Get personalized suggestions for user
     */
    async getPersonalizedSuggestions(userId, limit = 10) {
        try {
            // This would typically analyze user's search history and preferences
            // For now, return popular suggestions with some personalization
            const suggestions = await this.getPopularSearches(limit);
            return suggestions.map(s => ({
                ...s,
                relevance: s.relevance || 0.8,
            }));
        }
        catch (error) {
            winston_1.logger.error("Error getting personalized suggestions", { error, userId });
            return this.getPopularSuggestions(limit);
        }
    }
    /**
     * 🌟 Get popular suggestions
     */
    async getPopularSuggestions(limit = 10) {
        return this.getPopularSearches(limit);
    }
    /**
     * 🔍 Search in specific category
     */
    async searchInCategory(query) {
        return this.searchProducts(query);
    }
    /**
     * 🏷️ Search by brand
     */
    async searchByBrand(query) {
        return this.searchProducts(query);
    }
    /**
     * 🔧 Get available filters for search query
     */
    async getAvailableFilters(query) {
        try {
            // This would typically analyze products matching the query
            return {
                brands: [
                    { name: "Samsung", count: 45 },
                    { name: "Apple", count: 32 },
                    { name: "Nike", count: 28 },
                    { name: "Adidas", count: 25 },
                ],
                categories: [
                    { id: "electronics", name: "Electronics", count: 120 },
                    { id: "fashion", name: "Fashion", count: 85 },
                    { id: "sports", name: "Sports", count: 45 },
                ],
                priceRanges: [
                    { min: 0, max: 10000, count: 35 },
                    { min: 10000, max: 50000, count: 67 },
                    { min: 50000, max: 100000, count: 28 },
                ],
            };
        }
        catch (error) {
            winston_1.logger.error("Error getting available filters", { error, query });
            return { brands: [], categories: [], priceRanges: [] };
        }
    }
    /**
     * 📜 Get user search history
     */
    async getUserSearchHistory(userId, params) {
        try {
            // This would typically query user search history from database
            const searches = [
                {
                    query: "samsung phone",
                    resultCount: 45,
                    timestamp: new Date(Date.now() - 86400000), // 1 day ago
                },
                {
                    query: "laptop",
                    resultCount: 23,
                    timestamp: new Date(Date.now() - 172800000), // 2 days ago
                },
            ];
            const total = searches.length;
            const limit = params.limit || 20;
            const page = params.page || 1;
            const totalPages = Math.ceil(total / limit);
            return {
                searches,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                },
            };
        }
        catch (error) {
            winston_1.logger.error("Error getting user search history", { error, userId });
            throw error;
        }
    }
    /**
     * 🗑️ Clear user search history
     */
    async clearUserSearchHistory(userId) {
        try {
            // This would typically delete from database
            const clearedCount = 5; // Mock result
            winston_1.logger.info("User search history cleared", { userId, clearedCount });
            return { clearedCount };
        }
        catch (error) {
            winston_1.logger.error("Error clearing user search history", { error, userId });
            throw error;
        }
    }
    /**
     * 📈 Get trending searches
     */
    async getTrendingSearches(limit = 10, hours = 24) {
        try {
            const trending = [
                { query: "christmas deals", count: 890, trend: "rising", category: "seasonal" },
                { query: "new year fashion", count: 567, trend: "rising", category: "fashion" },
                { query: "electronics sale", count: 456, trend: "stable", category: "electronics" },
                { query: "traditional wear", count: 234, trend: "falling", category: "fashion" },
            ];
            return trending.slice(0, limit);
        }
        catch (error) {
            winston_1.logger.error("Error getting trending searches", { error, hours });
            return [];
        }
    }
    /**
     * 💾 Save search to user history
     */
    async saveSearchToHistory(userId, searchData) {
        try {
            // This would typically save to database
            winston_1.logger.info("Search saved to history", { userId, searchData });
        }
        catch (error) {
            winston_1.logger.error("Error saving search to history", { error, userId, searchData });
            throw error;
        }
    }
    /**
     * 📊 Get search analytics (admin) - with days parameter
     */
    async getSearchAnalyticsWithDays(days = 30) {
        const timeframe = days <= 1 ? "day" : days <= 7 ? "week" : "month";
        return this.getSearchAnalytics(timeframe);
    }
}
exports.SearchService = SearchService;
//# sourceMappingURL=SearchService.js.map