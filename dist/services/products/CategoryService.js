"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryService = void 0;
// src/services/products/CategoryService.ts
const BaseService_1 = require("../BaseService");
const CategoryRepository_1 = require("@/repositories/CategoryRepository");
const api_types_1 = require("@/types/api.types");
class CategoryService extends BaseService_1.BaseService {
    categoryRepository;
    constructor() {
        const categoryRepository = new CategoryRepository_1.CategoryRepository();
        super(categoryRepository, 'Category');
        this.categoryRepository = categoryRepository;
    }
    /**
     * Create new category with validation
     */
    async createCategory(data) {
        try {
            await this.validateCreateData(data);
            // Validate parent category if provided
            if (data.parentId) {
                const parentExists = await this.categoryRepository.exists(data.parentId);
                if (!parentExists) {
                    throw new api_types_1.AppError('Parent category not found', api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
                }
                // Check category depth (limit to 3 levels)
                const parentDepth = await this.categoryRepository.getCategoryDepth(data.parentId);
                if (parentDepth >= 3) {
                    throw new api_types_1.AppError('Maximum category depth exceeded (3 levels)', api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.VALIDATION_ERROR);
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
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            console.error('Error creating category:', error);
            throw new api_types_1.AppError('Failed to create category', api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    /**
     * Update category with validation
     */
    async updateCategory(id, data) {
        try {
            await this.validateUpdateData(data);
            const existingCategory = await this.categoryRepository.findById(id);
            if (!existingCategory) {
                throw new api_types_1.AppError('Category not found', api_types_1.HTTP_STATUS.NOT_FOUND, api_types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            // Validate parent category if being updated
            if (data.parentId && data.parentId !== existingCategory.parentId) {
                if (data.parentId === id) {
                    throw new api_types_1.AppError('Category cannot be its own parent', api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.VALIDATION_ERROR);
                }
                const parentExists = await this.categoryRepository.exists(data.parentId);
                if (!parentExists) {
                    throw new api_types_1.AppError('Parent category not found', api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
                }
                // Check if this would create a circular reference
                const descendants = await this.categoryRepository.getDescendants(id);
                if (descendants.some(desc => desc.id === data.parentId)) {
                    throw new api_types_1.AppError('Cannot move category: would create circular reference', api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.VALIDATION_ERROR);
                }
                // Check depth limit
                const parentDepth = await this.categoryRepository.getCategoryDepth(data.parentId);
                if (parentDepth >= 3) {
                    throw new api_types_1.AppError('Maximum category depth exceeded (3 levels)', api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.VALIDATION_ERROR);
                }
            }
            // Update slug if name is being updated
            if (data.name && data.name !== existingCategory.name) {
                data.slug = await this.generateUniqueSlug(data.name, id);
            }
            return await this.categoryRepository.update(id, data);
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            console.error('Error updating category:', error);
            throw new api_types_1.AppError('Failed to update category', api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    /**
     * Get category by slug
     */
    async getCategoryBySlug(slug) {
        try {
            const category = await this.categoryRepository.findBySlug(slug);
            if (!category) {
                throw new api_types_1.AppError('Category not found', api_types_1.HTTP_STATUS.NOT_FOUND, api_types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            return this.enrichCategory(category);
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            throw new api_types_1.AppError('Failed to get category', api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    /**
     * Get category hierarchy (nested structure)
     */
    async getCategoryHierarchy() {
        try {
            const categories = await this.categoryRepository.getCategoryHierarchy();
            return categories.map(category => this.enrichCategory(category));
        }
        catch (error) {
            console.error('Error getting category hierarchy:', error);
            throw new api_types_1.AppError('Failed to get category hierarchy', api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    /**
     * Get root categories (no parent)
     */
    async getRootCategories() {
        try {
            const categories = await this.categoryRepository.getRootCategories();
            return categories.map(category => this.enrichCategory(category));
        }
        catch (error) {
            console.error('Error getting root categories:', error);
            throw new api_types_1.AppError('Failed to get root categories', api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    /**
     * Get subcategories of a parent
     */
    async getSubcategories(parentId) {
        try {
            // Verify parent category exists
            const parentExists = await this.categoryRepository.exists(parentId);
            if (!parentExists) {
                throw new api_types_1.AppError('Parent category not found', api_types_1.HTTP_STATUS.NOT_FOUND, api_types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            const categories = await this.categoryRepository.getSubcategories(parentId);
            return categories.map(category => this.enrichCategory(category));
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            console.error('Error getting subcategories:', error);
            throw new api_types_1.AppError('Failed to get subcategories', api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    /**
     * Get category breadcrumb path
     */
    async getCategoryPath(categoryId) {
        try {
            const exists = await this.categoryRepository.exists(categoryId);
            if (!exists) {
                throw new api_types_1.AppError('Category not found', api_types_1.HTTP_STATUS.NOT_FOUND, api_types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            return await this.categoryRepository.getCategoryPath(categoryId);
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            console.error('Error getting category path:', error);
            throw new api_types_1.AppError('Failed to get category path', api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    /**
     * Get categories with filtering
     */
    async getCategories(params) {
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
        }
        catch (error) {
            console.error('Error getting categories:', error);
            throw new api_types_1.AppError('Failed to get categories', api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    /**
     * Get top categories by product count
     */
    async getTopCategories(limit = 10) {
        try {
            return await this.categoryRepository.getTopCategories(limit);
        }
        catch (error) {
            console.error('Error getting top categories:', error);
            throw new api_types_1.AppError('Failed to get top categories', api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    /**
     * Move category to different parent
     */
    async moveCategory(categoryId, newParentId) {
        try {
            const exists = await this.categoryRepository.exists(categoryId);
            if (!exists) {
                throw new api_types_1.AppError('Category not found', api_types_1.HTTP_STATUS.NOT_FOUND, api_types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            if (newParentId) {
                if (newParentId === categoryId) {
                    throw new api_types_1.AppError('Category cannot be its own parent', api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.VALIDATION_ERROR);
                }
                const parentExists = await this.categoryRepository.exists(newParentId);
                if (!parentExists) {
                    throw new api_types_1.AppError('Parent category not found', api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
                }
                // Check circular reference
                const descendants = await this.categoryRepository.getDescendants(categoryId);
                if (descendants.some(desc => desc.id === newParentId)) {
                    throw new api_types_1.AppError('Cannot move category: would create circular reference', api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.VALIDATION_ERROR);
                }
            }
            return await this.categoryRepository.moveCategory(categoryId, newParentId);
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            console.error('Error moving category:', error);
            throw new api_types_1.AppError('Failed to move category', api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    /**
     * Update category sort order
     */
    async updateSortOrder(categoryId, sortOrder) {
        try {
            const exists = await this.categoryRepository.exists(categoryId);
            if (!exists) {
                throw new api_types_1.AppError('Category not found', api_types_1.HTTP_STATUS.NOT_FOUND, api_types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            return await this.categoryRepository.updateSortOrder(categoryId, sortOrder);
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            console.error('Error updating sort order:', error);
            throw new api_types_1.AppError('Failed to update sort order', api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    /**
     * Bulk update sort orders
     */
    async bulkUpdateSortOrder(updates) {
        try {
            // Validate all categories exist
            for (const update of updates) {
                const exists = await this.categoryRepository.exists(update.id);
                if (!exists) {
                    throw new api_types_1.AppError(`Category ${update.id} not found`, api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
                }
            }
            return await this.categoryRepository.bulkUpdateSortOrder(updates);
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            console.error('Error in bulk sort order update:', error);
            throw new api_types_1.AppError('Failed to update sort orders', api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    /**
     * Delete category with options for handling children
     */
    async deleteCategory(categoryId, handleChildren = 'move_to_parent') {
        try {
            const exists = await this.categoryRepository.exists(categoryId);
            if (!exists) {
                throw new api_types_1.AppError('Category not found', api_types_1.HTTP_STATUS.NOT_FOUND, api_types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            await this.categoryRepository.deleteCategory(categoryId, handleChildren);
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            console.error('Error deleting category:', error);
            throw new api_types_1.AppError('Failed to delete category', api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    /**
     * Toggle category active status
     */
    async toggleActiveStatus(categoryId) {
        try {
            const category = await this.categoryRepository.findById(categoryId);
            if (!category) {
                throw new api_types_1.AppError('Category not found', api_types_1.HTTP_STATUS.NOT_FOUND, api_types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            return await this.categoryRepository.update(categoryId, {
                isActive: !category.isActive
            });
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            console.error('Error toggling category status:', error);
            throw new api_types_1.AppError('Failed to toggle category status', api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    // Validation methods
    async validateCreateData(data) {
        if (!data.name || data.name.trim().length < 2) {
            throw new api_types_1.AppError('Category name must be at least 2 characters long', api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.VALIDATION_ERROR);
        }
        if (data.name.length > 100) {
            throw new api_types_1.AppError('Category name cannot exceed 100 characters', api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.VALIDATION_ERROR);
        }
        if (data.description && data.description.length > 500) {
            throw new api_types_1.AppError('Category description cannot exceed 500 characters', api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.VALIDATION_ERROR);
        }
        if (data.sortOrder !== undefined && (data.sortOrder < 0 || data.sortOrder > 999)) {
            throw new api_types_1.AppError('Sort order must be between 0 and 999', api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.VALIDATION_ERROR);
        }
    }
    async validateUpdateData(data) {
        if (data.name !== undefined) {
            if (!data.name || data.name.trim().length < 2) {
                throw new api_types_1.AppError('Category name must be at least 2 characters long', api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.VALIDATION_ERROR);
            }
            if (data.name.length > 100) {
                throw new api_types_1.AppError('Category name cannot exceed 100 characters', api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.VALIDATION_ERROR);
            }
        }
        if (data.description !== undefined && data.description && data.description.length > 500) {
            throw new api_types_1.AppError('Category description cannot exceed 500 characters', api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.VALIDATION_ERROR);
        }
        if (data.sortOrder !== undefined && (data.sortOrder < 0 || data.sortOrder > 999)) {
            throw new api_types_1.AppError('Sort order must be between 0 and 999', api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.VALIDATION_ERROR);
        }
    }
    // Helper methods
    enrichCategory(category) {
        return {
            ...category,
            productCount: category._count?.products || 0,
            hasChildren: category.children && category.children.length > 0
        };
    }
    async generateUniqueSlug(name, excludeId) {
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
exports.CategoryService = CategoryService;
//# sourceMappingURL=CategoryService.js.map