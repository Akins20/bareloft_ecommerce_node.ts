"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CategoryController_1 = require("../../controllers/products/CategoryController");
const authenticate_1 = require("../../middleware/auth/authenticate");
const authorize_1 = require("../../middleware/auth/authorize");
// Service imports
const serviceContainer_1 = require("../../config/serviceContainer");
// Note: Category schemas not yet created, using placeholder validation
const createCategorySchema = {};
const updateCategorySchema = {};
const router = (0, express_1.Router)();
// Get services from container
const serviceContainer = (0, serviceContainer_1.getServiceContainer)();
const categoryService = serviceContainer.getService('categoryService');
// Initialize controller with service
const categoryController = new CategoryController_1.CategoryController(categoryService);
// ==================== PUBLIC CATEGORY ENDPOINTS ====================
/**
 * @route   GET /api/v1/categories
 * @desc    Get all categories with optional filtering and pagination
 * @access  Public
 * @query   {
 *   page?: number,
 *   limit?: number,
 *   search?: string,
 *   parentId?: string,
 *   isActive?: boolean,
 *   includeProductCount?: boolean,
 *   sortBy?: 'name' | 'sortOrder' | 'productCount' | 'created',
 *   sortOrder?: 'asc' | 'desc'
 * }
 */
router.get("/", 
// cacheMiddleware({ ttl: 300 }), // 5 minute cache - disabled for now
async (req, res, next) => {
    try {
        await categoryController.getCategories(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/categories/tree
 * @desc    Get category tree structure (hierarchical)
 * @access  Public
 * @query   {
 *   includeProductCount?: boolean,
 *   activeOnly?: boolean
 * }
 */
router.get("/tree", 
// cacheMiddleware({ ttl: 600 }), // 10 minute cache - disabled for now
async (req, res, next) => {
    try {
        await categoryController.getCategoryTree(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/categories/root
 * @desc    Get root categories (top-level categories)
 * @access  Public
 * @query   {
 *   includeProductCount?: boolean,
 *   activeOnly?: boolean
 * }
 */
router.get("/root", 
// cacheMiddleware({ ttl: 300 }), // 5 minute cache - disabled for now
async (req, res, next) => {
    try {
        await categoryController.getRootCategories(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/categories/featured
 * @desc    Get featured categories
 * @access  Public
 * @query   { limit?: number }
 */
router.get("/featured", 
// cacheMiddleware({ ttl: 600 }), // 10 minute cache - disabled for now
async (req, res, next) => {
    try {
        await categoryController.getFeaturedCategories(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/categories/popular
 * @desc    Get categories with most products
 * @access  Public
 * @query   { limit?: number }
 */
router.get("/popular", 
// cacheMiddleware({ ttl: 300 }), // 5 minute cache - disabled for now
async (req, res, next) => {
    try {
        await categoryController.getPopularCategories(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/categories/flat
 * @desc    Get all categories as a flat list (for dropdowns)
 * @access  Public
 * @query   {
 *   activeOnly?: boolean,
 *   includeHierarchy?: boolean
 * }
 */
router.get("/flat", 
// cacheMiddleware({ ttl: 300 }), // 5 minute cache - disabled for now
async (req, res, next) => {
    try {
        await categoryController.getFlatCategoryList(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/categories/search
 * @desc    Search categories
 * @access  Public
 * @query   {
 *   q: string,
 *   limit?: number
 * }
 */
router.get("/search", async (req, res, next) => {
    try {
        await categoryController.searchCategories(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/categories/slug/:slug
 * @desc    Get category by slug (SEO-friendly)
 * @access  Public
 * @param   slug - Category slug
 * @query   { includeProducts?: boolean }
 */
router.get("/slug/:slug", 
// cacheMiddleware({ ttl: 300 }), // 5 minute cache - disabled for now
async (req, res, next) => {
    try {
        await categoryController.getCategoryBySlug(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/categories/:id
 * @desc    Get category by ID
 * @access  Public
 * @param   id - Category ID
 * @query   { includeProducts?: boolean }
 */
router.get("/:id", 
// cacheMiddleware({ ttl: 300 }), // 5 minute cache - disabled for now
async (req, res, next) => {
    try {
        await categoryController.getCategoryById(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/categories/:id/children
 * @desc    Get child categories of a parent category
 * @access  Public
 * @param   id - Parent category ID
 * @query   {
 *   includeProductCount?: boolean,
 *   activeOnly?: boolean
 * }
 */
router.get("/:id/children", 
// cacheMiddleware({ ttl: 300 }), // 5 minute cache - disabled for now
async (req, res, next) => {
    try {
        await categoryController.getChildCategories(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/categories/:id/breadcrumb
 * @desc    Get category breadcrumb path
 * @access  Public
 * @param   id - Category ID
 */
router.get("/:id/breadcrumb", 
// cacheMiddleware({ ttl: 600 }), // 10 minute cache - disabled for now
async (req, res, next) => {
    try {
        await categoryController.getCategoryBreadcrumb(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/categories/:id/stats
 * @desc    Get category statistics
 * @access  Public
 * @param   id - Category ID
 */
router.get("/:id/stats", 
// cacheMiddleware({ ttl: 300 }), // 5 minute cache - disabled for now
async (req, res, next) => {
    try {
        await categoryController.getCategoryStats(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/categories/:id/has-products
 * @desc    Check if category has products
 * @access  Public
 * @param   id - Category ID
 * @query   { includeSubcategories?: boolean }
 */
router.get("/:id/has-products", 
// cacheMiddleware({ ttl: 300 }), // 5 minute cache - disabled for now
async (req, res, next) => {
    try {
        await categoryController.checkCategoryHasProducts(req, res);
    }
    catch (error) {
        next(error);
    }
});
// ==================== ADMIN CATEGORY ENDPOINTS ====================
/**
 * @route   POST /api/v1/categories
 * @desc    Create new category (Admin only)
 * @access  Private (Admin)
 * @body    CreateCategoryRequest
 */
router.post("/", authenticate_1.authenticate, (0, authorize_1.authorize)(["ADMIN", "SUPER_ADMIN"]), 
// validateRequest(createCategorySchema), // Skip validation for now due to empty schema
async (req, res, next) => {
    try {
        // This would be handled by an admin-specific controller method
        // For now, we'll use the existing controller structure
        res.status(501).json({
            success: false,
            message: "Category creation endpoint not yet implemented",
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   PUT /api/v1/categories/:id
 * @desc    Update category (Admin only)
 * @access  Private (Admin)
 * @param   id - Category ID
 * @body    UpdateCategoryRequest
 */
router.put("/:id", authenticate_1.authenticate, (0, authorize_1.authorize)(["ADMIN", "SUPER_ADMIN"]), 
// validateRequest(updateCategorySchema), // Skip validation for now due to empty schema
async (req, res, next) => {
    try {
        // This would be handled by an admin-specific controller method
        res.status(501).json({
            success: false,
            message: "Category update endpoint not yet implemented",
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   DELETE /api/v1/categories/:id
 * @desc    Delete category (Admin only)
 * @access  Private (Admin)
 * @param   id - Category ID
 */
router.delete("/:id", authenticate_1.authenticate, (0, authorize_1.authorize)(["ADMIN", "SUPER_ADMIN"]), async (req, res, next) => {
    try {
        // This would be handled by an admin-specific controller method
        res.status(501).json({
            success: false,
            message: "Category deletion endpoint not yet implemented",
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=categories.js.map