"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSearchRoutes = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../middleware/auth/authenticate");
const authorize_1 = require("../../middleware/auth/authorize");
const rateLimiter_1 = require("../../middleware/security/rateLimiter");
const router = (0, express_1.Router)();
// Initialize controller
let searchController;
const initializeSearchRoutes = (controller) => {
    searchController = controller;
    return router;
};
exports.initializeSearchRoutes = initializeSearchRoutes;
// Rate limiting for search operations
const searchRateLimit = rateLimiter_1.rateLimiter.general;
const autocompleteRateLimit = rateLimiter_1.rateLimiter.general;
// ==================== MAIN SEARCH ENDPOINTS ====================
/**
 * @route   GET /api/v1/search
 * @desc    Search products with advanced filtering
 * @access  Public
 * @query   {
 *   q: string (required),
 *   page?: number,
 *   limit?: number,
 *   categoryId?: string,
 *   minPrice?: number,
 *   maxPrice?: number,
 *   brand?: string,
 *   inStock?: boolean,
 *   rating?: number,
 *   sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popularity',
 *   sortOrder?: 'asc' | 'desc',
 *   features?: string[], (for products with specific features)
 *   colors?: string[], (for products with color variants)
 *   sizes?: string[], (for products with size variants)
 *   onSale?: boolean,
 *   discountPercentage?: number
 * }
 */
router.get("/", searchRateLimit, async (req, res, next) => {
    try {
        await searchController.searchProducts(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/search/autocomplete
 * @desc    Get search autocomplete suggestions
 * @access  Public
 * @query   {
 *   q: string (min 2 chars),
 *   limit?: number (max 20)
 * }
 */
router.get("/autocomplete", autocompleteRateLimit, 
// cacheMiddleware({ ttl: 300 }), // 5 minute cache - disabled for now
async (req, res, next) => {
    try {
        await searchController.getAutocomplete(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/search/suggestions
 * @desc    Get personalized search suggestions based on user history
 * @access  Public (personalized if authenticated)
 * @query   { limit?: number }
 */
router.get("/suggestions", 
// cacheMiddleware({ ttl: 600 }), // 10 minute cache - disabled for now
async (req, res, next) => {
    try {
        await searchController.getPersonalizedSuggestions(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/search/popular
 * @desc    Get popular search terms
 * @access  Public
 * @query   {
 *   limit?: number,
 *   timeframe?: '7d' | '30d' | '90d'
 * }
 */
router.get("/popular", 
// cacheMiddleware({ ttl: 1800 }), // 30 minute cache - disabled for now
async (req, res, next) => {
    try {
        await searchController.getPopularSearchTerms(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/search/trending
 * @desc    Get trending searches (recent spike in activity)
 * @access  Public
 * @query   {
 *   limit?: number,
 *   hours?: number (default 24)
 * }
 */
router.get("/trending", 
// cacheMiddleware({ ttl: 900 }), // 15 minute cache - disabled for now
async (req, res, next) => {
    try {
        await searchController.getTrendingSearches(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/search/filters
 * @desc    Get available filters for current search query
 * @access  Public
 * @query   { q: string }
 */
router.get("/filters", 
// cacheMiddleware({ ttl: 300 }), // 5 minute cache - disabled for now
async (req, res, next) => {
    try {
        await searchController.getSearchFilters(req, res);
    }
    catch (error) {
        next(error);
    }
});
// ==================== CATEGORY-SPECIFIC SEARCH ====================
/**
 * @route   GET /api/v1/search/category/:categoryId
 * @desc    Search within a specific category
 * @access  Public
 * @param   categoryId - Category ID
 * @query   {
 *   q: string,
 *   page?: number,
 *   limit?: number,
 *   minPrice?: number,
 *   maxPrice?: number,
 *   brand?: string,
 *   inStock?: boolean,
 *   rating?: number,
 *   sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest',
 *   sortOrder?: 'asc' | 'desc'
 * }
 */
router.get("/category/:categoryId", searchRateLimit, async (req, res, next) => {
    try {
        await searchController.searchInCategory(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/search/brand/:brand
 * @desc    Search products by brand
 * @access  Public
 * @param   brand - Brand name (URL encoded)
 * @query   {
 *   q?: string,
 *   page?: number,
 *   limit?: number,
 *   categoryId?: string,
 *   minPrice?: number,
 *   maxPrice?: number,
 *   inStock?: boolean,
 *   rating?: number,
 *   sortBy?: 'name' | 'price_asc' | 'price_desc' | 'rating' | 'newest',
 *   sortOrder?: 'asc' | 'desc'
 * }
 */
router.get("/brand/:brand", searchRateLimit, async (req, res, next) => {
    try {
        await searchController.searchByBrand(req, res);
    }
    catch (error) {
        next(error);
    }
});
// ==================== USER SEARCH HISTORY ====================
/**
 * @route   GET /api/v1/search/history
 * @desc    Get search history for authenticated user
 * @access  Private (Customer)
 * @query   { page?: number, limit?: number }
 */
router.get("/history", authenticate_1.authenticate, async (req, res, next) => {
    try {
        await searchController.getSearchHistory(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   POST /api/v1/search/save
 * @desc    Save search to user history (for logged-in users)
 * @access  Private (Customer)
 * @body    {
 *   query: string,
 *   filters?: object,
 *   resultCount?: number
 * }
 */
router.post("/save", authenticate_1.authenticate, async (req, res, next) => {
    try {
        await searchController.saveSearch(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   DELETE /api/v1/search/history
 * @desc    Clear search history for authenticated user
 * @access  Private (Customer)
 */
router.delete("/history", authenticate_1.authenticate, async (req, res, next) => {
    try {
        await searchController.clearSearchHistory(req, res);
    }
    catch (error) {
        next(error);
    }
});
// ==================== SAVED SEARCHES ====================
/**
 * @route   GET /api/v1/search/saved
 * @desc    Get user's saved searches
 * @access  Private (Customer)
 * @query   { page?: number, limit?: number }
 */
router.get("/saved", authenticate_1.authenticate, async (req, res, next) => {
    try {
        // This would be handled by a saved searches method
        res.status(501).json({
            success: false,
            message: "Saved searches feature not yet implemented",
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   POST /api/v1/search/saved
 * @desc    Save a search query for future alerts
 * @access  Private (Customer)
 * @body    {
 *   name: string,
 *   query: string,
 *   filters?: object,
 *   alertEnabled?: boolean
 * }
 */
router.post("/saved", authenticate_1.authenticate, async (req, res, next) => {
    try {
        res.status(501).json({
            success: false,
            message: "Save search feature not yet implemented",
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   DELETE /api/v1/search/saved/:searchId
 * @desc    Delete saved search
 * @access  Private (Customer)
 * @param   searchId - Saved search ID
 */
router.delete("/saved/:searchId", authenticate_1.authenticate, async (req, res, next) => {
    try {
        res.status(501).json({
            success: false,
            message: "Delete saved search not yet implemented",
        });
    }
    catch (error) {
        next(error);
    }
});
// ==================== SEARCH ALERTS ====================
/**
 * @route   POST /api/v1/search/alerts
 * @desc    Create search alert for new products matching criteria
 * @access  Private (Customer)
 * @body    {
 *   name: string,
 *   query: string,
 *   filters?: object,
 *   frequency: 'daily' | 'weekly' | 'monthly'
 * }
 */
router.post("/alerts", authenticate_1.authenticate, async (req, res, next) => {
    try {
        res.status(501).json({
            success: false,
            message: "Search alerts feature not yet implemented",
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/search/alerts
 * @desc    Get user's search alerts
 * @access  Private (Customer)
 */
router.get("/alerts", authenticate_1.authenticate, async (req, res, next) => {
    try {
        res.status(501).json({
            success: false,
            message: "Get search alerts not yet implemented",
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   PUT /api/v1/search/alerts/:alertId
 * @desc    Update search alert
 * @access  Private (Customer)
 * @param   alertId - Alert ID
 * @body    {
 *   name?: string,
 *   query?: string,
 *   filters?: object,
 *   frequency?: 'daily' | 'weekly' | 'monthly',
 *   isActive?: boolean
 * }
 */
router.put("/alerts/:alertId", authenticate_1.authenticate, async (req, res, next) => {
    try {
        res.status(501).json({
            success: false,
            message: "Update search alert not yet implemented",
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   DELETE /api/v1/search/alerts/:alertId
 * @desc    Delete search alert
 * @access  Private (Customer)
 * @param   alertId - Alert ID
 */
router.delete("/alerts/:alertId", authenticate_1.authenticate, async (req, res, next) => {
    try {
        res.status(501).json({
            success: false,
            message: "Delete search alert not yet implemented",
        });
    }
    catch (error) {
        next(error);
    }
});
// ==================== ADMIN SEARCH ANALYTICS ====================
/**
 * @route   GET /api/v1/search/analytics
 * @desc    Get search analytics and insights (Admin only)
 * @access  Private (Admin)
 * @query   { days?: number }
 */
router.get("/analytics", authenticate_1.authenticate, (0, authorize_1.authorize)(["ADMIN", "SUPER_ADMIN"]), async (req, res, next) => {
    try {
        await searchController.getSearchAnalytics(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/search/analytics/no-results
 * @desc    Get searches with no results (for content strategy)
 * @access  Private (Admin)
 * @query   { page?: number, limit?: number, days?: number }
 */
router.get("/analytics/no-results", authenticate_1.authenticate, (0, authorize_1.authorize)(["ADMIN", "SUPER_ADMIN"]), async (req, res, next) => {
    try {
        res.status(501).json({
            success: false,
            message: "No results analytics not yet implemented",
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/search/analytics/low-results
 * @desc    Get searches with few results (less than 5)
 * @access  Private (Admin)
 * @query   { page?: number, limit?: number, days?: number }
 */
router.get("/analytics/low-results", authenticate_1.authenticate, (0, authorize_1.authorize)(["ADMIN", "SUPER_ADMIN"]), async (req, res, next) => {
    try {
        res.status(501).json({
            success: false,
            message: "Low results analytics not yet implemented",
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=search.js.map