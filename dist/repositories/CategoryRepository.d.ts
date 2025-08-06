import { PrismaClient } from "@prisma/client";
import { BaseRepository } from "./BaseRepository";
import { Category, CategoryQueryParams, PaginationParams } from "../types";
export interface CreateCategoryData {
    name: string;
    slug: string;
    description?: string;
    image?: string;
    parentId?: string;
    isActive?: boolean;
    sortOrder?: number;
    seoTitle?: string;
    seoDescription?: string;
}
export interface UpdateCategoryData {
    name?: string;
    slug?: string;
    description?: string;
    image?: string;
    parentId?: string;
    isActive?: boolean;
    sortOrder?: number;
    seoTitle?: string;
    seoDescription?: string;
}
export interface CategoryWithProducts extends Omit<Category, 'products'> {
    productCount: number;
    hasChildren: boolean;
    products?: any[];
}
export declare class CategoryRepository extends BaseRepository<Category, CreateCategoryData, UpdateCategoryData> {
    constructor(prisma: PrismaClient);
    /**
     * Find category by slug
     */
    findBySlug(slug: string): Promise<CategoryWithProducts | null>;
    /**
     * Create category with validation
     */
    createCategory(categoryData: CreateCategoryData): Promise<Category>;
    /**
     * Update category with validation
     */
    updateCategory(categoryId: string, categoryData: UpdateCategoryData): Promise<Category>;
    /**
     * Get category hierarchy (all categories with nested structure)
     */
    getCategoryHierarchy(): Promise<CategoryWithProducts[]>;
    /**
     * Get flat list of categories with filtering
     */
    getCategoriesWithFilters(queryParams: CategoryQueryParams): Promise<{
        data: CategoryWithProducts[];
        pagination: any;
    }>;
    /**
     * Get top-level categories only
     */
    getRootCategories(): Promise<CategoryWithProducts[]>;
    /**
     * Get subcategories of a parent category
     */
    getSubcategories(parentId: string, pagination?: PaginationParams): Promise<{
        data: CategoryWithProducts[];
        pagination: any;
    }>;
    /**
     * Get category breadcrumb path
     */
    getCategoryBreadcrumb(categoryId: string): Promise<Category[]>;
    /**
     * Get categories with most products
     */
    getPopularCategories(limit?: number): Promise<CategoryWithProducts[]>;
    /**
     * Search categories
     */
    searchCategories(searchTerm: string, pagination?: PaginationParams): Promise<{
        data: CategoryWithProducts[];
        pagination: any;
        searchMeta: any;
    }>;
    /**
     * Reorder categories within the same parent
     */
    reorderCategories(categoryOrders: Array<{
        id: string;
        sortOrder: number;
    }>): Promise<void>;
    /**
     * Move category to different parent
     */
    moveCategory(categoryId: string, newParentId: string | null): Promise<Category>;
    /**
     * Get category statistics
     */
    getCategoryStatistics(): Promise<{
        totalCategories: number;
        activeCategories: number;
        rootCategories: number;
        categoriesWithProducts: number;
        averageProductsPerCategory: number;
        maxDepth: number;
    }>;
    /**
     * Bulk update category status
     */
    bulkUpdateStatus(categoryIds: string[], isActive: boolean): Promise<{
        count: number;
    }>;
    /**
     * Delete category (with children handling)
     */
    deleteCategory(categoryId: string, strategy?: "move_to_parent" | "delete_children"): Promise<boolean>;
    private wouldCreateCircularReference;
    private transformCategoryWithCounts;
    private calculateMaxDepth;
}
//# sourceMappingURL=CategoryRepository.d.ts.map