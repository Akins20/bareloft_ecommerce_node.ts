import { Request, Response } from "express";
import { BaseController } from "../BaseController";
import { CategoryService } from "../../services/products/CategoryService";
export declare class CategoryController extends BaseController {
    private categoryService;
    constructor(categoryService: CategoryService);
    /**
     * Get all categories with optional filtering and pagination
     * GET /api/v1/categories
     */
    getCategories: (req: Request, res: Response) => Promise<void>;
    /**
     * Get category by ID
     * GET /api/v1/categories/:id
     */
    getCategoryById: (req: Request, res: Response) => Promise<void>;
    /**
     * Get category by slug (SEO-friendly)
     * GET /api/v1/categories/slug/:slug
     */
    getCategoryBySlug: (req: Request, res: Response) => Promise<void>;
    /**
     * Get category tree structure (hierarchical)
     * GET /api/v1/categories/tree
     */
    getCategoryTree: (req: Request, res: Response) => Promise<void>;
    /**
     * Get root categories (top-level categories)
     * GET /api/v1/categories/root
     */
    getRootCategories: (req: Request, res: Response) => Promise<void>;
    /**
     * Get child categories of a parent category
     * GET /api/v1/categories/:id/children
     */
    getChildCategories: (req: Request, res: Response) => Promise<void>;
    /**
     * Get category breadcrumb path
     * GET /api/v1/categories/:id/breadcrumb
     */
    getCategoryBreadcrumb: (req: Request, res: Response) => Promise<void>;
    /**
     * Get featured categories
     * GET /api/v1/categories/featured
     */
    getFeaturedCategories: (req: Request, res: Response) => Promise<void>;
    /**
     * Search categories
     * GET /api/v1/categories/search
     */
    searchCategories: (req: Request, res: Response) => Promise<void>;
    /**
     * Get categories with most products
     * GET /api/v1/categories/popular
     */
    getPopularCategories: (req: Request, res: Response) => Promise<void>;
    /**
     * Get category statistics
     * GET /api/v1/categories/:id/stats
     */
    getCategoryStats: (req: Request, res: Response) => Promise<void>;
    /**
     * Get all categories as a flat list (for dropdowns)
     * GET /api/v1/categories/flat
     */
    getFlatCategoryList: (req: Request, res: Response) => Promise<void>;
    /**
     * Check if category has products
     * GET /api/v1/categories/:id/has-products
     */
    checkCategoryHasProducts: (req: Request, res: Response) => Promise<void>;
    /**
     * Validate category data
     */
    private validateCategoryData;
}
//# sourceMappingURL=CategoryController.d.ts.map