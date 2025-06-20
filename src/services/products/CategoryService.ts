// src/services/products/CategoryService.ts
import { BaseService } from '../BaseService';
import { CategoryRepository } from '@/repositories/CategoryRepository';
import { 
  Category, 
  CreateCategoryRequest, 
  UpdateCategoryRequest,
  CategoryQueryParams
} from '@/types';
import { AppError, HTTP_STATUS, ERROR_CODES } from '@/types/api.types';

export class CategoryService extends BaseService<Category> {
  private categoryRepository: CategoryRepository;

  constructor() {
    const categoryRepository = new CategoryRepository();
    super(categoryRepository, 'Category');
    this.categoryRepository = categoryRepository;
  }

  /**
   * Create new category with validation
   */
  async createCategory(data: CreateCategoryRequest): Promise<Category> {
    try {
      await this.validateCreateData(data);

      // Validate parent category if provided
      if (data.parentId) {
        const parentExists = await this.categoryRepository.exists(data.parentId);
        if (!parentExists) {
          throw new AppError(
            'Parent category not found',
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.RESOURCE_NOT_FOUND
          );
        }

        // Check category depth (limit to 3 levels)
        const parentDepth = await this.categoryRepository.getCategoryDepth(data.parentId);
        if (parentDepth >= 3) {
          throw new AppError(
            'Maximum category depth exceeded (3 levels)',
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR
          );
        }
      }

      // Generate slug from name
      const slug = await this.generateUniqueSlug(data.name);

      const categoryData = {
        ...data,
        slug,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0
      };

      return await this.categoryRepository.createCategory(categoryData);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error creating category:', error);
      throw new AppError(
        'Failed to create category',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Update category with validation
   */
  async updateCategory(id: string, data: UpdateCategoryRequest): Promise<Category> {
    try {
      await this.validateUpdateData(data);

      const existingCategory = await this.categoryRepository.findById(id);
      if (!existingCategory) {
        throw new AppError(
          'Category not found',
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Validate parent category if being updated
      if (data.parentId && data.parentId !== existingCategory.parentId) {
        if (data.parentId === id) {
          throw new AppError(
            'Category cannot be its own parent',
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR
          );
        }

        const parentExists = await this.categoryRepository.exists(data.parentId);
        if (!parentExists) {
          throw new AppError(
            'Parent category not found',
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.RESOURCE_NOT_FOUND
          );
        }

        // Check if this would create a circular reference
        const descendants = await this.categoryRepository.getDescendants(id);
        if (descendants.some(desc => desc.id === data.parentId)) {
          throw new AppError(
            'Cannot move category: would create circular reference',
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR
          );
        }

        // Check depth limit
        const parentDepth = await this.categoryRepository.getCategoryDepth(data.parentId);
        if (parentDepth >= 3) {
          throw new AppError(
            'Maximum category depth exceeded (3 levels)',
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR
          );
        }
      }

      // Update slug if name is being updated
      if (data.name && data.name !== existingCategory.name) {
        data.slug = await this.generateUniqueSlug(data.name, id);
      }

      return await this.categoryRepository.update(id, data);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error updating category:', error);
      throw new AppError(
        'Failed to update category',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(slug: string): Promise<Category> {
    try {
      const category = await this.categoryRepository.findBySlug(slug);
      if (!category) {
        throw new AppError(
          'Category not found',
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      return this.enrichCategory(category);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'Failed to get category',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Get category hierarchy (nested structure)
   */
  async getCategoryHierarchy(): Promise<Category[]> {
    try {
      const categories = await this.categoryRepository.getCategoryHierarchy();
      return categories.map(category => this.enrichCategory(category));
    } catch (error) {
      console.error('Error getting category hierarchy:', error);
      throw new AppError(
        'Failed to get category hierarchy',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Get root categories (no parent)
   */
  async getRootCategories(): Promise<Category[]> {
    try {
      const categories = await this.categoryRepository.getRootCategories();
      return categories.map(category => this.enrichCategory(category));
    } catch (error) {
      console.error('Error getting root categories:', error);
      throw new AppError(
        'Failed to get root categories',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Get subcategories of a parent
   */
  async getSubcategories(parentId: string): Promise<Category[]> {
    try {
      // Verify parent category exists
      const parentExists = await this.categoryRepository.exists(parentId);
      if (!parentExists) {
        throw new AppError(
          'Parent category not found',
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      const categories = await this.categoryRepository.getSubcategories(parentId);
      return categories.map(category => this.enrichCategory(category));
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error getting subcategories:', error);
      throw new AppError(
        'Failed to get subcategories',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Get category breadcrumb path
   */
  async getCategoryPath(categoryId: string): Promise<Category[]> {
    try {
      const exists = await this.categoryRepository.exists(categoryId);
      if (!exists) {
        throw new AppError(
          'Category not found',
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      return await this.categoryRepository.getCategoryPath(categoryId);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error getting category path:', error);
      throw new AppError(
        'Failed to get category path',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Get categories with filtering
   */
  async getCategories(params: CategoryQueryParams): Promise<{
    items: Category[];
    pagination?: any;
  }> {
    try {
      const { categories, total } = await this.categoryRepository.findWithFilters(params);

      const enrichedCategories = categories.map(category => this.enrichCategory(category));

      // Build pagination if needed
      let pagination;
      if (params.page || params.limit) {
        const page = params.page || 1;
        const limit = params.limit || 50;
        const totalPages = Math.ceil(total / limit);

        pagination = {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        };
      }

      return {
        items: enrichedCategories,
        pagination
      };
    } catch (error) {
      console.error('Error getting categories:', error);
      throw new AppError(
        'Failed to get categories',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Get top categories by product count
   */
  async getTopCategories(limit: number = 10): Promise<Array<Category & { productCount: number }>> {
    try {
      return await this.categoryRepository.getTopCategories(limit);
    } catch (error) {
      console.error('Error getting top categories:', error);
      throw new AppError(
        'Failed to get top categories',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Move category to different parent
   */
  async moveCategory(categoryId: string, newParentId?: string): Promise<Category> {
    try {
      const exists = await this.categoryRepository.exists(categoryId);
      if (!exists) {
        throw new AppError(
          'Category not found',
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      if (newParentId) {
        if (newParentId === categoryId) {
          throw new AppError(
            'Category cannot be its own parent',
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR
          );
        }

        const parentExists = await this.categoryRepository.exists(newParentId);
        if (!parentExists) {
          throw new AppError(
            'Parent category not found',
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.RESOURCE_NOT_FOUND
          );
        }

        // Check circular reference
        const descendants = await this.categoryRepository.getDescendants(categoryId);
        if (descendants.some(desc => desc.id === newParentId)) {
          throw new AppError(
            'Cannot move category: would create circular reference',
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR
          );
        }
      }

      return await this.categoryRepository.moveCategory(categoryId, newParentId);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error moving category:', error);
      throw new AppError(
        'Failed to move category',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Update category sort order
   */
  async updateSortOrder(categoryId: string, sortOrder: number): Promise<Category> {
    try {
      const exists = await this.categoryRepository.exists(categoryId);
      if (!exists) {
        throw new AppError(
          'Category not found',
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      return await this.categoryRepository.updateSortOrder(categoryId, sortOrder);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error updating sort order:', error);
      throw new AppError(
        'Failed to update sort order',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Bulk update sort orders
   */
  async bulkUpdateSortOrder(updates: { id: string; sortOrder: number }[]): Promise<number> {
    try {
      // Validate all categories exist
      for (const update of updates) {
        const exists = await this.categoryRepository.exists(update.id);
        if (!exists) {
          throw new AppError(
            `Category ${update.id} not found`,
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.RESOURCE_NOT_FOUND
          );
        }
      }

      return await this.categoryRepository.bulkUpdateSortOrder(updates);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error in bulk sort order update:', error);
      throw new AppError(
        'Failed to update sort orders',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Delete category with options for handling children
   */
  async deleteCategory(
    categoryId: string,
    handleChildren: 'delete' | 'move_to_parent' | 'move_to_root' = 'move_to_parent'
  ): Promise<void> {
    try {
      const exists = await this.categoryRepository.exists(categoryId);
      if (!exists) {
        throw new AppError(
          'Category not found',
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      await this.categoryRepository.deleteCategory(categoryId, handleChildren);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error deleting category:', error);
      throw new AppError(
        'Failed to delete category',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Toggle category active status
   */
  async toggleActiveStatus(categoryId: string): Promise<Category> {
    try {
      const category = await this.categoryRepository.findById(categoryId);
      if (!category) {
        throw new AppError(
          'Category not found',
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      return await this.categoryRepository.update(categoryId, {
        isActive: !category.isActive
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error toggling category status:', error);
      throw new AppError(
        'Failed to toggle category status',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  // Validation methods
  protected async validateCreateData(data: CreateCategoryRequest): Promise<void> {
    if (!data.name || data.name.trim().length < 2) {
      throw new AppError(
        'Category name must be at least 2 characters long',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (data.name.length > 100) {
      throw new AppError(
        'Category name cannot exceed 100 characters',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (data.description && data.description.length > 500) {
      throw new AppError(
        'Category description cannot exceed 500 characters',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (data.sortOrder !== undefined && (data.sortOrder < 0 || data.sortOrder > 999)) {
      throw new AppError(
        'Sort order must be between 0 and 999',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }
  }

  protected async validateUpdateData(data: UpdateCategoryRequest): Promise<void> {
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length < 2) {
        throw new AppError(
          'Category name must be at least 2 characters long',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      if (data.name.length > 100) {
        throw new AppError(
          'Category name cannot exceed 100 characters',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }
    }

    if (data.description !== undefined && data.description && data.description.length > 500) {
      throw new AppError(
        'Category description cannot exceed 500 characters',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (data.sortOrder !== undefined && (data.sortOrder < 0 || data.sortOrder > 999)) {
      throw new AppError(
        'Sort order must be between 0 and 999',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }
  }

  // Helper methods
  private enrichCategory(category: any): Category {
    return {
      ...category,
      productCount: category._count?.products || 0,
      hasChildren: category.children && category.children.length > 0
    };
  }

  private async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    let baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (await this.categoryRepository.slugExists(slug, excludeId)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }
}