import { BaseService } from '../BaseService';
import { Category, CreateCategoryRequest, UpdateCategoryRequest, CategoryQueryParams } from '../../types';
export declare class CategoryService extends BaseService {
    private categoryRepository;
    constructor(categoryRepository?: any);
    /**
     * Create new category with validation
     */
    createCategory(data: CreateCategoryRequest): Promise<Category>;
    /**
     * Update category with validation
     */
    updateCategory(id: string, data: UpdateCategoryRequest): Promise<Category>;
    /**
     * Get category by ID
     */
    getCategoryById(id: string, includeProducts?: boolean): Promise<Category>;
    /**
     * Get category by slug
     */
    getCategoryBySlug(slug: string): Promise<Category>;
    /**
     * Get category tree (alias for hierarchy)
     */
    getCategoryTree(): Promise<Category[]>;
    /**
     * Get category hierarchy (nested structure)
     */
    getCategoryHierarchy(): Promise<Category[]>;
    /**
     * Get root categories (no parent)
     */
    getRootCategories(): Promise<Category[]>;
    /**
     * Get child categories (alias for subcategories)
     */
    getChildCategories(parentId: string): Promise<Category[]>;
    /**
     * Get subcategories of a parent
     */
    getSubcategories(parentId: string): Promise<Category[]>;
    /**
     * Get category breadcrumb path
     */
    getCategoryPath(categoryId: string): Promise<Category[]>;
    /**
     * Get categories with filtering
     */
    getCategories(params: CategoryQueryParams): Promise<{
        items: Category[];
        pagination?: any;
    }>;
    /**
     * Get top categories by product count
     */
    getTopCategories(limit?: number): Promise<Array<Category & {
        productCount: number;
    }>>;
    /**
     * Move category to different parent
     */
    moveCategory(categoryId: string, newParentId?: string): Promise<Category>;
    /**
     * Update category sort order
     */
    updateSortOrder(categoryId: string, sortOrder: number): Promise<Category>;
    /**
     * Bulk update sort orders
     */
    bulkUpdateSortOrder(updates: {
        id: string;
        sortOrder: number;
    }[]): Promise<number>;
    /**
     * Delete category with options for handling children
     */
    deleteCategory(categoryId: string, handleChildren?: 'delete' | 'move_to_parent' | 'move_to_root'): Promise<void>;
    /**
     * Toggle category active status
     */
    toggleActiveStatus(categoryId: string): Promise<Category>;
    protected validateCreateData(data: CreateCategoryRequest): Promise<void>;
    protected validateUpdateData(data: UpdateCategoryRequest): Promise<void>;
    /**
     * Get category breadcrumb
     */
    getCategoryBreadcrumb(categoryId: string): Promise<Category[]>;
    /**
     * Get featured categories
     */
    getFeaturedCategories(limit?: number): Promise<Category[]>;
    /**
     * Search categories
     */
    searchCategories(query: string, limit?: number): Promise<Category[]>;
    /**
     * Get popular categories (alias for top categories)
     */
    getPopularCategories(limit?: number): Promise<Array<Category & {
        productCount: number;
    }>>;
    /**
     * Get category stats
     */
    getCategoryStats(categoryId: string): Promise<any>;
    /**
     * Get flat category list
     */
    getFlatCategoryList(): Promise<Category[]>;
    /**
     * Check if category has products
     */
    checkCategoryHasProducts(categoryId: string): Promise<boolean>;
    private enrichCategory;
    private generateUniqueSlug;
}
//# sourceMappingURL=CategoryService.d.ts.map