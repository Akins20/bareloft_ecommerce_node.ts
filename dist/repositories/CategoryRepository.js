"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
const types_1 = require("../types");
class CategoryRepository extends BaseRepository_1.BaseRepository {
    constructor(prisma) {
        super(prisma, "Category");
    }
    /**
     * Find category by slug
     */
    async findBySlug(slug) {
        try {
            const category = await this.findFirst({ slug, isActive: true }, {
                parent: true,
                children: {
                    where: { isActive: true },
                    orderBy: { sortOrder: "asc" },
                },
                products: {
                    where: { isActive: true },
                    include: {
                        images: {
                            where: { isPrimary: true },
                            take: 1,
                        },
                        inventory: true,
                    },
                    take: 12,
                    orderBy: { createdAt: "desc" },
                },
                _count: {
                    select: {
                        products: {
                            where: { isActive: true },
                        },
                        children: {
                            where: { isActive: true },
                        },
                    },
                },
            });
            if (!category)
                return null;
            return {
                ...category,
                productCount: category._count.products,
                hasChildren: category._count.children > 0,
            };
        }
        catch (error) {
            this.handleError("Error finding category by slug", error);
            throw error;
        }
    }
    /**
     * Create category with validation
     */
    async createCategory(categoryData) {
        try {
            // Check if slug already exists
            const existingSlug = await this.findFirst({ slug: categoryData.slug });
            if (existingSlug) {
                throw new types_1.AppError("Slug already exists", types_1.HTTP_STATUS.CONFLICT, types_1.ERROR_CODES.RESOURCE_ALREADY_EXISTS);
            }
            // Validate parent category exists if provided
            if (categoryData.parentId) {
                const parentCategory = await this.findById(categoryData.parentId);
                if (!parentCategory) {
                    throw new types_1.AppError("Parent category not found", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
                }
                // Prevent circular references
                if (await this.wouldCreateCircularReference(categoryData.parentId, null)) {
                    throw new types_1.AppError("Cannot create circular category reference", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
                }
            }
            return await this.create(categoryData, {
                parent: true,
                children: true,
            });
        }
        catch (error) {
            this.handleError("Error creating category", error);
            throw error;
        }
    }
    /**
     * Update category with validation
     */
    async updateCategory(categoryId, categoryData) {
        try {
            // Check slug uniqueness if being updated
            if (categoryData.slug) {
                const existingSlug = await this.findFirst({
                    slug: categoryData.slug,
                    id: { not: categoryId },
                });
                if (existingSlug) {
                    throw new types_1.AppError("Slug already exists", types_1.HTTP_STATUS.CONFLICT, types_1.ERROR_CODES.RESOURCE_CONFLICT);
                }
            }
            // Validate parent category if being updated
            if (categoryData.parentId) {
                const parentCategory = await this.findById(categoryData.parentId);
                if (!parentCategory) {
                    throw new types_1.AppError("Parent category not found", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
                }
                // Prevent circular references
                if (await this.wouldCreateCircularReference(categoryData.parentId, categoryId)) {
                    throw new types_1.AppError("Cannot create circular category reference", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
                }
            }
            return await this.update(categoryId, categoryData, {
                parent: true,
                children: {
                    where: { isActive: true },
                    orderBy: { sortOrder: "asc" },
                },
                _count: {
                    select: {
                        products: {
                            where: { isActive: true },
                        },
                    },
                },
            });
        }
        catch (error) {
            this.handleError("Error updating category", error);
            throw error;
        }
    }
    /**
     * Get category hierarchy (all categories with nested structure)
     */
    async getCategoryHierarchy() {
        try {
            // Get all root categories (no parent)
            const rootCategories = await this.findMany({ parentId: null, isActive: true }, {
                include: {
                    children: {
                        where: { isActive: true },
                        include: {
                            children: {
                                where: { isActive: true },
                                include: {
                                    _count: {
                                        select: {
                                            products: {
                                                where: { isActive: true },
                                            },
                                        },
                                    },
                                },
                                orderBy: { sortOrder: "asc" },
                            },
                            _count: {
                                select: {
                                    products: {
                                        where: { isActive: true },
                                    },
                                },
                            },
                        },
                        orderBy: { sortOrder: "asc" },
                    },
                    _count: {
                        select: {
                            products: {
                                where: { isActive: true },
                            },
                        },
                    },
                },
                orderBy: { sortOrder: "asc" },
            });
            return rootCategories.data.map(this.transformCategoryWithCounts);
        }
        catch (error) {
            this.handleError("Error getting category hierarchy", error);
            throw error;
        }
    }
    /**
     * Get flat list of categories with filtering
     */
    async getCategoriesWithFilters(queryParams) {
        try {
            const { parentId, isActive = true, hasProducts, sortBy = "sortOrder", sortOrder = "asc", page = 1, limit = 50, } = queryParams;
            // Build where clause
            const where = { isActive };
            // Filter by parent
            if (parentId !== undefined) {
                where.parentId = parentId;
            }
            // Filter categories that have products
            if (hasProducts) {
                where.products = {
                    some: {
                        isActive: true,
                    },
                };
            }
            const result = await this.findMany(where, {
                include: {
                    parent: true,
                    children: {
                        where: { isActive: true },
                        orderBy: { sortOrder: "asc" },
                    },
                    _count: {
                        select: {
                            products: {
                                where: { isActive: true },
                            },
                            children: {
                                where: { isActive: true },
                            },
                        },
                    },
                },
                orderBy: this.buildOrderBy(sortBy, sortOrder),
                pagination: { page, limit },
            });
            return {
                data: result.data.map(this.transformCategoryWithCounts),
                pagination: result.pagination,
            };
        }
        catch (error) {
            this.handleError("Error getting categories with filters", error);
            throw error;
        }
    }
    /**
     * Get top-level categories only
     */
    async getRootCategories() {
        try {
            const result = await this.findMany({ parentId: null, isActive: true }, {
                include: {
                    children: {
                        where: { isActive: true },
                        orderBy: { sortOrder: "asc" },
                        take: 10,
                    },
                    _count: {
                        select: {
                            products: {
                                where: { isActive: true },
                            },
                            children: {
                                where: { isActive: true },
                            },
                        },
                    },
                },
                orderBy: { sortOrder: "asc" },
            });
            return result.data.map(this.transformCategoryWithCounts);
        }
        catch (error) {
            this.handleError("Error getting root categories", error);
            throw error;
        }
    }
    /**
     * Get subcategories of a parent category
     */
    async getSubcategories(parentId, pagination) {
        try {
            const result = await this.findMany({ parentId, isActive: true }, {
                include: {
                    parent: true,
                    children: {
                        where: { isActive: true },
                        orderBy: { sortOrder: "asc" },
                    },
                    _count: {
                        select: {
                            products: {
                                where: { isActive: true },
                            },
                            children: {
                                where: { isActive: true },
                            },
                        },
                    },
                },
                orderBy: { sortOrder: "asc" },
                pagination,
            });
            return {
                data: result.data.map(this.transformCategoryWithCounts),
                pagination: result.pagination,
            };
        }
        catch (error) {
            this.handleError("Error getting subcategories", error);
            throw error;
        }
    }
    /**
     * Get category breadcrumb path
     */
    async getCategoryBreadcrumb(categoryId) {
        try {
            const breadcrumb = [];
            let currentCategory = await this.findById(categoryId, { parent: true });
            while (currentCategory) {
                breadcrumb.unshift(currentCategory);
                currentCategory = currentCategory.parent;
            }
            return breadcrumb;
        }
        catch (error) {
            this.handleError("Error getting category breadcrumb", error);
            throw error;
        }
    }
    /**
     * Get categories with most products
     */
    async getPopularCategories(limit = 10) {
        try {
            const categories = await this.prisma.category.findMany({
                where: { isActive: true },
                include: {
                    parent: true,
                    children: {
                        where: { isActive: true },
                        orderBy: { sortOrder: "asc" },
                    },
                    _count: {
                        select: {
                            products: {
                                where: { isActive: true },
                            },
                        },
                    },
                },
                orderBy: {
                    products: {
                        _count: "desc",
                    },
                },
                take: limit,
            });
            return categories.map(this.transformCategoryWithCounts);
        }
        catch (error) {
            this.handleError("Error getting popular categories", error);
            throw error;
        }
    }
    /**
     * Search categories
     */
    async searchCategories(searchTerm, pagination) {
        try {
            const searchFields = ["name", "description"];
            const where = { isActive: true };
            const result = await this.search(searchTerm, searchFields, where, {
                include: {
                    parent: true,
                    children: {
                        where: { isActive: true },
                        orderBy: { sortOrder: "asc" },
                    },
                    _count: {
                        select: {
                            products: {
                                where: { isActive: true },
                            },
                            children: {
                                where: { isActive: true },
                            },
                        },
                    },
                },
                pagination,
            });
            return {
                data: result.data.map(this.transformCategoryWithCounts),
                pagination: result.pagination,
                searchMeta: result.searchMeta,
            };
        }
        catch (error) {
            this.handleError("Error searching categories", error);
            throw error;
        }
    }
    /**
     * Reorder categories within the same parent
     */
    async reorderCategories(categoryOrders) {
        try {
            await this.transaction(async (prisma) => {
                for (const { id, sortOrder } of categoryOrders) {
                    await prisma.category.update({
                        where: { id },
                        data: { sortOrder },
                    });
                }
            });
        }
        catch (error) {
            this.handleError("Error reordering categories", error);
            throw error;
        }
    }
    /**
     * Move category to different parent
     */
    async moveCategory(categoryId, newParentId) {
        try {
            // Validate new parent exists if provided
            if (newParentId) {
                const newParent = await this.findById(newParentId);
                if (!newParent) {
                    throw new types_1.AppError("New parent category not found", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
                }
                // Prevent circular references
                if (await this.wouldCreateCircularReference(newParentId, categoryId)) {
                    throw new types_1.AppError("Cannot create circular category reference", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
                }
            }
            return await this.update(categoryId, { parentId: newParentId }, {
                parent: true,
                children: {
                    where: { isActive: true },
                    orderBy: { sortOrder: "asc" },
                },
            });
        }
        catch (error) {
            this.handleError("Error moving category", error);
            throw error;
        }
    }
    /**
     * Get category statistics
     */
    async getCategoryStatistics() {
        try {
            const [totalCategories, activeCategories, rootCategories, categoriesWithProducts, productCounts,] = await Promise.all([
                this.count(),
                this.count({ isActive: true }),
                this.count({ parentId: null, isActive: true }),
                this.count({
                    isActive: true,
                    products: {
                        some: {
                            isActive: true,
                        },
                    },
                }),
                this.prisma.category.findMany({
                    where: { isActive: true },
                    include: {
                        _count: {
                            select: {
                                products: {
                                    where: { isActive: true },
                                },
                            },
                        },
                    },
                }),
            ]);
            const averageProductsPerCategory = productCounts.length > 0
                ? productCounts.reduce((sum, cat) => sum + cat._count.products, 0) /
                    productCounts.length
                : 0;
            // Calculate max depth (would need recursive query in real implementation)
            const maxDepth = await this.calculateMaxDepth();
            return {
                totalCategories,
                activeCategories,
                rootCategories,
                categoriesWithProducts,
                averageProductsPerCategory: Math.round(averageProductsPerCategory * 100) / 100,
                maxDepth,
            };
        }
        catch (error) {
            this.handleError("Error getting category statistics", error);
            throw error;
        }
    }
    /**
     * Bulk update category status
     */
    async bulkUpdateStatus(categoryIds, isActive) {
        try {
            return await this.updateMany({ id: { in: categoryIds } }, { isActive });
        }
        catch (error) {
            this.handleError("Error bulk updating category status", error);
            throw error;
        }
    }
    /**
     * Delete category (with children handling)
     */
    async deleteCategory(categoryId, strategy = "move_to_parent") {
        try {
            return await this.transaction(async (prisma) => {
                const category = await prisma.category.findUnique({
                    where: { id: categoryId },
                    include: {
                        children: true,
                        products: true,
                    },
                });
                if (!category) {
                    throw new types_1.AppError("Category not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
                }
                // Check if category has products
                if (category.products.length > 0) {
                    throw new types_1.AppError("Cannot delete category with products. Move products first.", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
                }
                // Handle children based on strategy
                if (category.children.length > 0) {
                    if (strategy === "move_to_parent") {
                        // Move children to this category's parent
                        await prisma.category.updateMany({
                            where: { parentId: categoryId },
                            data: { parentId: category.parentId },
                        });
                    }
                    else {
                        // Delete all children (recursive)
                        for (const child of category.children) {
                            await this.deleteCategory(child.id, strategy);
                        }
                    }
                }
                // Finally delete the category
                await prisma.category.delete({
                    where: { id: categoryId },
                });
                return true;
            });
        }
        catch (error) {
            this.handleError("Error deleting category", error);
            throw error;
        }
    }
    // Private helper methods
    async wouldCreateCircularReference(parentId, categoryId) {
        if (!categoryId || parentId === categoryId) {
            return true;
        }
        try {
            let currentParent = await this.findById(parentId, { parent: true });
            const visited = new Set([parentId]);
            while (currentParent?.parent) {
                if (currentParent.parent.id === categoryId) {
                    return true;
                }
                if (visited.has(currentParent.parent.id)) {
                    return true; // Already visited, circular reference exists
                }
                visited.add(currentParent.parent.id);
                currentParent = currentParent.parent;
            }
            return false;
        }
        catch (error) {
            return true; // Err on the side of caution
        }
    }
    transformCategoryWithCounts = (category) => {
        return {
            ...category,
            productCount: category._count?.products || 0,
            hasChildren: (category._count?.children || 0) > 0,
        };
    };
    async calculateMaxDepth() {
        try {
            // Simplified depth calculation
            // In a real implementation, you'd use a recursive CTE or similar
            const categories = await this.prisma.category.findMany({
                where: { isActive: true },
                include: { parent: true },
            });
            let maxDepth = 0;
            for (const category of categories) {
                let depth = 1;
                let current = category;
                while (current.parent) {
                    depth++;
                    current = current.parent;
                    if (depth > 10)
                        break; // Prevent infinite loops
                }
                maxDepth = Math.max(maxDepth, depth);
            }
            return maxDepth;
        }
        catch (error) {
            return 1; // Default depth
        }
    }
}
exports.CategoryRepository = CategoryRepository;
//# sourceMappingURL=CategoryRepository.js.map