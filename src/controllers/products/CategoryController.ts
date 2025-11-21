import { Request, Response } from "express";
import { BaseController } from "../BaseController";
import { CategoryService } from "../../services/products/CategoryService";
import {
  Category,
  CategoryListQuery,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryWithProductCount,
} from "../../types/product.types";
import { ApiResponse, PaginationParams } from "../../types/api.types";

export class CategoryController extends BaseController {
  private categoryService: CategoryService;

  constructor(categoryService: CategoryService) {
    super();
    this.categoryService = categoryService;
  }

  /**
   * Get all categories with optional filtering and pagination
   * GET /api/v1/categories
   */
  public getCategories = async (req: Request, res: Response): Promise<void> => {
    try {
      const query: CategoryListQuery = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 50, 100),
        sortBy: (req.query.sortBy as any) || "sortOrder",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "asc",
        includeProductCount: req.query.includeProductCount === "true",
      };

      if (req.query.parentId) {
        query.parentId = req.query.parentId as string;
      }

      if (req.query.isActive !== undefined) {
        query.isActive = req.query.isActive === "true";
      }

      const result = await this.categoryService.getCategories(query);

      const response: ApiResponse<any> = {
        success: true,
        message: "Categories retrieved successfully",
        data: result,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get category by ID
   * GET /api/v1/categories/:id
   */
  public getCategoryById = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const includeProducts = req.query.includeProducts === "true";

      if (!id) {
        res.status(400).json({
          success: false,
          message: "Category ID is required",
        });
        return;
      }

      const category = await this.categoryService.getCategoryById(
        id,
        includeProducts
      );

      if (!category) {
        res.status(404).json({
          success: false,
          message: "Category not found",
        });
        return;
      }

      const response: ApiResponse<any> = {
        success: true,
        message: "Category retrieved successfully",
        data: category,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get category by slug (SEO-friendly)
   * GET /api/v1/categories/slug/:slug
   */
  public getCategoryBySlug = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { slug } = req.params;
      const includeProducts = req.query.includeProducts === "true";

      if (!slug) {
        res.status(400).json({
          success: false,
          message: "Category slug is required",
        });
        return;
      }

      const category = await this.categoryService.getCategoryBySlug(slug);

      if (!category) {
        res.status(404).json({
          success: false,
          message: "Category not found",
        });
        return;
      }

      const response: ApiResponse<any> = {
        success: true,
        message: "Category retrieved successfully",
        data: category,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get category tree structure (hierarchical)
   * GET /api/v1/categories/tree
   */
  public getCategoryTree = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const includeProductCount = req.query.includeProductCount === "true";
      const activeOnly = req.query.activeOnly !== "false"; // Default to true

      const tree = await this.categoryService.getCategoryTree();

      const response: ApiResponse<any> = {
        success: true,
        message: "Category tree retrieved successfully",
        data: tree,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get root categories (top-level categories)
   * GET /api/v1/categories/root
   */
  public getRootCategories = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const includeProductCount = req.query.includeProductCount === "true";
      const activeOnly = req.query.activeOnly !== "false";

      const categories = await this.categoryService.getRootCategories();

      const response: ApiResponse<any> = {
        success: true,
        message: "Root categories retrieved successfully",
        data: categories,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get child categories of a parent category
   * GET /api/v1/categories/:id/children
   */
  public getChildCategories = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const includeProductCount = req.query.includeProductCount === "true";
      const activeOnly = req.query.activeOnly !== "false";

      if (!id) {
        res.status(400).json({
          success: false,
          message: "Parent category ID is required",
        });
        return;
      }

      const children = await this.categoryService.getChildCategories(id);

      const response: ApiResponse<Category[]> = {
        success: true,
        message: "Child categories retrieved successfully",
        data: children,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get category breadcrumb path
   * GET /api/v1/categories/:id/breadcrumb
   */
  public getCategoryBreadcrumb = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: "Category ID is required",
        });
        return;
      }

      const breadcrumb = await this.categoryService.getCategoryBreadcrumb(id);

      if (!breadcrumb || breadcrumb.length === 0) {
        res.status(404).json({
          success: false,
          message: "Category not found",
        });
        return;
      }

      const response: ApiResponse<any[]> = {
        success: true,
        message: "Category breadcrumb retrieved successfully",
        data: breadcrumb,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get featured categories
   * GET /api/v1/categories/featured
   */
  public getFeaturedCategories = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 8, 20);

      const categories =
        await this.categoryService.getFeaturedCategories(limit);

      const response: ApiResponse<Category[]> = {
        success: true,
        message: "Featured categories retrieved successfully",
        data: categories,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Search categories
   * GET /api/v1/categories/search
   */
  public searchCategories = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const query = (req.query.q as string) || (req.query.search as string);

      if (!query || query.trim().length < 2) {
        res.status(400).json({
          success: false,
          message: "Search query must be at least 2 characters long",
        });
        return;
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const categories = await this.categoryService.searchCategories(
        query.trim(),
        limit
      );

      const response: ApiResponse<any[]> = {
        success: true,
        message: "Category search completed successfully",
        data: categories,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get categories with most products
   * GET /api/v1/categories/popular
   */
  public getPopularCategories = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

      const categories = await this.categoryService.getPopularCategories(limit);

      const response: ApiResponse<CategoryWithProductCount[]> = {
        success: true,
        message: "Popular categories retrieved successfully",
        data: categories,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get category statistics
   * GET /api/v1/categories/:id/stats
   */
  public getCategoryStats = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: "Category ID is required",
        });
        return;
      }

      const stats = await this.categoryService.getCategoryStats(id);

      if (!stats) {
        res.status(404).json({
          success: false,
          message: "Category not found",
        });
        return;
      }

      const response: ApiResponse<any> = {
        success: true,
        message: "Category statistics retrieved successfully",
        data: stats,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get all categories as a flat list (for dropdowns)
   * GET /api/v1/categories/flat
   */
  public getFlatCategoryList = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const activeOnly = req.query.activeOnly !== "false";
      const includeHierarchy = req.query.includeHierarchy === "true";

      const categories = await this.categoryService.getFlatCategoryList();

      const response: ApiResponse<any[]> = {
        success: true,
        message: "Flat category list retrieved successfully",
        data: categories,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Check if category has products
   * GET /api/v1/categories/:id/has-products
   */
  public checkCategoryHasProducts = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const includeSubcategories = req.query.includeSubcategories === "true";

      if (!id) {
        res.status(400).json({
          success: false,
          message: "Category ID is required",
        });
        return;
      }

      const hasProducts = await this.categoryService.checkCategoryHasProducts(id);

      const response: ApiResponse<boolean> = {
        success: true,
        message: "Category product check completed",
        data: hasProducts,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Validate category data
   */
  private validateCategoryData(
    data: CreateCategoryRequest | UpdateCategoryRequest
  ): string[] {
    const errors: string[] = [];

    if ("name" in data && (!data.name || data.name.trim().length < 2)) {
      errors.push("Category name must be at least 2 characters long");
    }

    if ("slug" in data && (data as any).slug && !/^[a-z0-9-]+$/.test((data as any).slug)) {
      errors.push(
        "Category slug can only contain lowercase letters, numbers, and hyphens"
      );
    }

    if (
      "sortOrder" in data &&
      data.sortOrder !== undefined &&
      data.sortOrder < 0
    ) {
      errors.push("Sort order must be a non-negative number");
    }

    return errors;
  }

  /**
   * Create a new category (Admin only)
   * POST /api/admin/categories
   */
  public createCategory = async (req: Request, res: Response): Promise<void> => {
    try {
      const categoryData: CreateCategoryRequest = req.body;

      const result = await this.categoryService.createCategory(categoryData);

      const response: ApiResponse<Category> = {
        success: true,
        message: "Category created successfully",
        data: result,
      };

      res.status(201).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Update an existing category (Admin only)
   * PUT /api/admin/categories/:id
   */
  public updateCategory = async (req: Request, res: Response): Promise<void> => {
    try {
      const categoryId = req.params.id;
      const updateData: UpdateCategoryRequest = req.body;

      const result = await this.categoryService.updateCategory(categoryId, updateData);

      const response: ApiResponse<Category> = {
        success: true,
        message: "Category updated successfully",
        data: result,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Delete a category (Admin only)
   * DELETE /api/admin/categories/:id
   */
  public deleteCategory = async (req: Request, res: Response): Promise<void> => {
    try {
      const categoryId = req.params.id;
      const handleChildren = (req.query.handleChildren as 'delete' | 'move_to_parent' | 'move_to_root') || 'move_to_parent';

      await this.categoryService.deleteCategory(categoryId, handleChildren);

      const response: ApiResponse<null> = {
        success: true,
        message: "Category deleted successfully",
        data: null,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };
}
