"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryController = void 0;
const BaseController_1 = require("../BaseController");
class CategoryController extends BaseController_1.BaseController {
    categoryService;
    constructor(categoryService) {
        super();
        this.categoryService = categoryService;
    }
    /**
     * Get all categories with optional filtering and pagination
     * GET /api/v1/categories
     */
    getCategories = async (req, res) => {
        try {
            const query = {
                page: parseInt(req.query.page) || 1,
                limit: Math.min(parseInt(req.query.limit) || 50, 100),
                search: req.query.search,
                parentId: req.query.parentId,
                isActive: req.query.isActive !== undefined
                    ? req.query.isActive === "true"
                    : undefined,
                includeProductCount: req.query.includeProductCount === "true",
                sortBy: req.query.sortBy || "sortOrder",
                sortOrder: req.query.sortOrder || "asc",
            };
            const result = await this.categoryService.getCategories(query);
            const response = {
                success: true,
                message: "Categories retrieved successfully",
                data: result,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get category by ID
     * GET /api/v1/categories/:id
     */
    getCategoryById = async (req, res) => {
        try {
            const { id } = req.params;
            const includeProducts = req.query.includeProducts === "true";
            const category = await this.categoryService.getCategoryById(id, includeProducts);
            if (!category) {
                res.status(404).json({
                    success: false,
                    message: "Category not found",
                });
                return;
            }
            const response = {
                success: true,
                message: "Category retrieved successfully",
                data: category,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get category by slug (SEO-friendly)
     * GET /api/v1/categories/slug/:slug
     */
    getCategoryBySlug = async (req, res) => {
        try {
            const { slug } = req.params;
            const includeProducts = req.query.includeProducts === "true";
            const category = await this.categoryService.getCategoryBySlug(slug, includeProducts);
            if (!category) {
                res.status(404).json({
                    success: false,
                    message: "Category not found",
                });
                return;
            }
            const response = {
                success: true,
                message: "Category retrieved successfully",
                data: category,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get category tree structure (hierarchical)
     * GET /api/v1/categories/tree
     */
    getCategoryTree = async (req, res) => {
        try {
            const includeProductCount = req.query.includeProductCount === "true";
            const activeOnly = req.query.activeOnly !== "false"; // Default to true
            const tree = await this.categoryService.getCategoryTree(includeProductCount, activeOnly);
            const response = {
                success: true,
                message: "Category tree retrieved successfully",
                data: tree,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get root categories (top-level categories)
     * GET /api/v1/categories/root
     */
    getRootCategories = async (req, res) => {
        try {
            const includeProductCount = req.query.includeProductCount === "true";
            const activeOnly = req.query.activeOnly !== "false";
            const categories = await this.categoryService.getRootCategories(includeProductCount, activeOnly);
            const response = {
                success: true,
                message: "Root categories retrieved successfully",
                data: categories,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get child categories of a parent category
     * GET /api/v1/categories/:id/children
     */
    getChildCategories = async (req, res) => {
        try {
            const { id } = req.params;
            const includeProductCount = req.query.includeProductCount === "true";
            const activeOnly = req.query.activeOnly !== "false";
            const children = await this.categoryService.getChildCategories(id, includeProductCount, activeOnly);
            const response = {
                success: true,
                message: "Child categories retrieved successfully",
                data: children,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get category breadcrumb path
     * GET /api/v1/categories/:id/breadcrumb
     */
    getCategoryBreadcrumb = async (req, res) => {
        try {
            const { id } = req.params;
            const breadcrumb = await this.categoryService.getCategoryBreadcrumb(id);
            if (!breadcrumb || breadcrumb.length === 0) {
                res.status(404).json({
                    success: false,
                    message: "Category not found",
                });
                return;
            }
            const response = {
                success: true,
                message: "Category breadcrumb retrieved successfully",
                data: breadcrumb,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get featured categories
     * GET /api/v1/categories/featured
     */
    getFeaturedCategories = async (req, res) => {
        try {
            const limit = Math.min(parseInt(req.query.limit) || 8, 20);
            const categories = await this.categoryService.getFeaturedCategories(limit);
            const response = {
                success: true,
                message: "Featured categories retrieved successfully",
                data: categories,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Search categories
     * GET /api/v1/categories/search
     */
    searchCategories = async (req, res) => {
        try {
            const query = req.query.q || req.query.search;
            if (!query || query.trim().length < 2) {
                res.status(400).json({
                    success: false,
                    message: "Search query must be at least 2 characters long",
                });
                return;
            }
            const limit = Math.min(parseInt(req.query.limit) || 20, 50);
            const categories = await this.categoryService.searchCategories(query.trim(), limit);
            const response = {
                success: true,
                message: "Category search completed successfully",
                data: categories,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get categories with most products
     * GET /api/v1/categories/popular
     */
    getPopularCategories = async (req, res) => {
        try {
            const limit = Math.min(parseInt(req.query.limit) || 10, 20);
            const categories = await this.categoryService.getPopularCategories(limit);
            const response = {
                success: true,
                message: "Popular categories retrieved successfully",
                data: categories,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get category statistics
     * GET /api/v1/categories/:id/stats
     */
    getCategoryStats = async (req, res) => {
        try {
            const { id } = req.params;
            const stats = await this.categoryService.getCategoryStats(id);
            if (!stats) {
                res.status(404).json({
                    success: false,
                    message: "Category not found",
                });
                return;
            }
            const response = {
                success: true,
                message: "Category statistics retrieved successfully",
                data: stats,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get all categories as a flat list (for dropdowns)
     * GET /api/v1/categories/flat
     */
    getFlatCategoryList = async (req, res) => {
        try {
            const activeOnly = req.query.activeOnly !== "false";
            const includeHierarchy = req.query.includeHierarchy === "true";
            const categories = await this.categoryService.getFlatCategoryList(activeOnly, includeHierarchy);
            const response = {
                success: true,
                message: "Flat category list retrieved successfully",
                data: categories,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Check if category has products
     * GET /api/v1/categories/:id/has-products
     */
    checkCategoryHasProducts = async (req, res) => {
        try {
            const { id } = req.params;
            const includeSubcategories = req.query.includeSubcategories === "true";
            const hasProducts = await this.categoryService.checkCategoryHasProducts(id, includeSubcategories);
            const response = {
                success: true,
                message: "Category product check completed",
                data: hasProducts,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Validate category data
     */
    validateCategoryData(data) {
        const errors = [];
        if ("name" in data && (!data.name || data.name.trim().length < 2)) {
            errors.push("Category name must be at least 2 characters long");
        }
        if ("slug" in data && data.slug && !/^[a-z0-9-]+$/.test(data.slug)) {
            errors.push("Category slug can only contain lowercase letters, numbers, and hyphens");
        }
        if ("sortOrder" in data &&
            data.sortOrder !== undefined &&
            data.sortOrder < 0) {
            errors.push("Sort order must be a non-negative number");
        }
        return errors;
    }
}
exports.CategoryController = CategoryController;
//# sourceMappingURL=CategoryController.js.map