import { BaseRepository } from "./BaseRepository";
import { Category, CategoryQueryParams } from "@/types";
import { PrismaClient } from "@prisma/client";
export declare class CategoryRepository extends BaseRepository<Category> {
    protected modelName: string;
    constructor(database?: PrismaClient);
    /**
     * Find category by slug
     */
    findBySlug(slug: string): Promise<Category | null>;
    /**
     * Get all root categories (no parent)
     */
    getRootCategories(): Promise<Category[]>;
    /**
     * Get category hierarchy (nested structure)
     */
    getCategoryHierarchy(): Promise<Category[]>;
    /**
     * Get subcategories of a parent category
     */
    getSubcategories(parentId: string): Promise<Category[]>;
    /**
     * Get category breadcrumb path
     */
    getCategoryPath(categoryId: string): Promise<Category[]>;
    /**
     * Find categories with filtering
     */
    findWithFilters(params: CategoryQueryParams): Promise<{
        categories: Category[];
        total: number;
    }>;
    /**
     * Create category with unique slug
     */
    createCategory(categoryData: {
        name: string;
        slug: string;
        description?: string;
        parentId?: string;
        isActive?: boolean;
        sortOrder?: number;
        imageUrl?: string;
    }): Promise<Category>;
    /**
     * Update category sort order
     */
    updateSortOrder(categoryId: string, sortOrder: number): Promise<Category>;
    /**
     * Move category to different parent
     */
    moveCategory(categoryId: string, newParentId?: string): Promise<Category>;
    /**
     * Get categories with product count
     */
    getCategoriesWithProductCount(): Promise<Array<Category & {
        productCount: number;
    }>>;
    /**
     * Get top categories by product count
     */
    getTopCategories(limit?: number): Promise<Array<Category & {
        productCount: number;
    }>>;
    /**
     * Check if slug exists
     */
    slugExists(slug: string, excludeCategoryId?: string): Promise<boolean>;
    /**
     * Get category depth (how many levels deep)
     */
    getCategoryDepth(categoryId: string): Promise<number>;
    /**
     * Get all descendant categories
     */
    getDescendants(categoryId: string): Promise<Category[]>;
    /**
     * Delete category and handle children
     */
    deleteCategory(categoryId: string, handleChildren?: "delete" | "move_to_parent" | "move_to_root"): Promise<void>;
    /**
     * Bulk update categories
     */
    bulkUpdateSortOrder(updates: {
        id: string;
        sortOrder: number;
    }[]): Promise<number>;
    private wouldCreateCircularReference;
}
//# sourceMappingURL=CategoryRepository.d.ts.map