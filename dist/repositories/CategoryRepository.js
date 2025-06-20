"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
class CategoryRepository extends BaseRepository_1.BaseRepository {
    modelName = "category";
    constructor(database) {
        super(database);
    }
    /**
     * Find category by slug
     */
    async findBySlug(slug) {
        try {
            return await this.model.findUnique({
                where: { slug },
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
            });
        }
        catch (error) {
            console.error(`Error finding category by slug ${slug}:`, error);
            throw error;
        }
    }
    /**
     * Get all root categories (no parent)
     */
    async getRootCategories() {
        try {
            return await this.model.findMany({
                where: {
                    parentId: null,
                    isActive: true,
                },
                include: {
                    children: {
                        where: { isActive: true },
                        orderBy: { sortOrder: "asc" },
                        include: {
                            _count: {
                                select: {
                                    products: {
                                        where: { isActive: true },
                                    },
                                },
                            },
                        },
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
        }
        catch (error) {
            console.error("Error getting root categories:", error);
            throw error;
        }
    }
    /**
     * Get category hierarchy (nested structure)
     */
    async getCategoryHierarchy() {
        try {
            return await this.model.findMany({
                where: {
                    parentId: null,
                    isActive: true,
                },
                include: {
                    children: {
                        where: { isActive: true },
                        include: {
                            children: {
                                where: { isActive: true },
                                orderBy: { sortOrder: "asc" },
                                include: {
                                    _count: {
                                        select: {
                                            products: {
                                                where: { isActive: true },
                                            },
                                        },
                                    },
                                },
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
        }
        catch (error) {
            console.error("Error getting category hierarchy:", error);
            throw error;
        }
    }
    /**
     * Get subcategories of a parent category
     */
    async getSubcategories(parentId) {
        try {
            return await this.model.findMany({
                where: {
                    parentId,
                    isActive: true,
                },
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
            });
        }
        catch (error) {
            console.error(`Error getting subcategories for ${parentId}:`, error);
            throw error;
        }
    }
    /**
     * Get category breadcrumb path
     */
    async getCategoryPath(categoryId) {
        try {
            const path = [];
            let currentCategoryId = categoryId;
            while (currentCategoryId) {
                const category = await this.model.findUnique({
                    where: { id: currentCategoryId },
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        parentId: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                });
                if (!category)
                    break;
                path.unshift(category);
                currentCategoryId = category.parentId;
            }
            return path;
        }
        catch (error) {
            console.error(`Error getting category path for ${categoryId}:`, error);
            throw error;
        }
    }
    /**
     * Find categories with filtering
     */
    async findWithFilters(params) {
        try {
            const page = params.page || 1;
            const limit = Math.min(params.limit || 50, 100);
            const skip = (page - 1) * limit;
            // Build where clause
            const where = {};
            if (params.parentId !== undefined) {
                where.parentId = params.parentId;
            }
            if (params.isActive !== undefined) {
                where.isActive = params.isActive;
            }
            if (params.hasProducts) {
                where.products = {
                    some: {
                        isActive: true,
                    },
                };
            }
            // Build orderBy clause
            let orderBy = {};
            switch (params.sortBy) {
                case "name":
                    orderBy = { name: params.sortOrder || "asc" };
                    break;
                case "sortOrder":
                    orderBy = { sortOrder: params.sortOrder || "asc" };
                    break;
                case "productCount":
                    // This would need a more complex query
                    orderBy = { sortOrder: "asc" };
                    break;
                case "created":
                    orderBy = { createdAt: params.sortOrder || "desc" };
                    break;
                default:
                    orderBy = { sortOrder: "asc" };
            }
            const [categories, total] = await Promise.all([
                this.model.findMany({
                    where,
                    take: limit,
                    skip,
                    orderBy,
                    include: {
                        parent: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                            },
                        },
                        children: {
                            where: { isActive: true },
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                            },
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
                }),
                this.model.count({ where }),
            ]);
            return { categories, total };
        }
        catch (error) {
            console.error("Error finding categories with filters:", error);
            throw error;
        }
    }
    /**
     * Create category with unique slug
     */
    async createCategory(categoryData) {
        try {
            // Ensure slug is unique
            let finalSlug = categoryData.slug;
            let counter = 1;
            while (await this.slugExists(finalSlug)) {
                finalSlug = `${categoryData.slug}-${counter}`;
                counter++;
            }
            return await this.model.create({
                data: {
                    ...categoryData,
                    slug: finalSlug,
                    isActive: categoryData.isActive ?? true,
                    sortOrder: categoryData.sortOrder ?? 0,
                },
            });
        }
        catch (error) {
            console.error("Error creating category:", error);
            throw error;
        }
    }
    /**
     * Update category sort order
     */
    async updateSortOrder(categoryId, sortOrder) {
        try {
            return await this.model.update({
                where: { id: categoryId },
                data: { sortOrder },
            });
        }
        catch (error) {
            console.error(`Error updating sort order for category ${categoryId}:`, error);
            throw error;
        }
    }
    /**
     * Move category to different parent
     */
    async moveCategory(categoryId, newParentId) {
        try {
            // Validate that we're not creating a circular reference
            if (newParentId) {
                const wouldCreateCircle = await this.wouldCreateCircularReference(categoryId, newParentId);
                if (wouldCreateCircle) {
                    throw new Error("Cannot move category: would create circular reference");
                }
            }
            return await this.model.update({
                where: { id: categoryId },
                data: { parentId: newParentId },
            });
        }
        catch (error) {
            console.error(`Error moving category ${categoryId}:`, error);
            throw error;
        }
    }
    /**
     * Get categories with product count
     */
    async getCategoriesWithProductCount() {
        try {
            const categories = await this.model.findMany({
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
            });
            return categories.map((category) => ({
                ...category,
                productCount: category._count.products,
            }));
        }
        catch (error) {
            console.error("Error getting categories with product count:", error);
            throw error;
        }
    }
    /**
     * Get top categories by product count
     */
    async getTopCategories(limit = 10) {
        try {
            const categories = await this.model.findMany({
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
                orderBy: {
                    products: {
                        _count: "desc",
                    },
                },
                take: limit,
            });
            return categories.map((category) => ({
                ...category,
                productCount: category._count.products,
            }));
        }
        catch (error) {
            console.error("Error getting top categories:", error);
            throw error;
        }
    }
    /**
     * Check if slug exists
     */
    async slugExists(slug, excludeCategoryId) {
        try {
            const where = { slug };
            if (excludeCategoryId) {
                where.id = { not: excludeCategoryId };
            }
            const category = await this.model.findUnique({
                where,
                select: { id: true },
            });
            return !!category;
        }
        catch (error) {
            console.error(`Error checking slug existence ${slug}:`, error);
            return false;
        }
    }
    /**
     * Get category depth (how many levels deep)
     */
    async getCategoryDepth(categoryId) {
        try {
            let depth = 0;
            let currentCategoryId = categoryId;
            while (currentCategoryId) {
                const category = await this.model.findUnique({
                    where: { id: currentCategoryId },
                    select: { parentId: true },
                });
                if (!category)
                    break;
                depth++;
                currentCategoryId = category.parentId;
            }
            return depth;
        }
        catch (error) {
            console.error(`Error getting category depth for ${categoryId}:`, error);
            return 0;
        }
    }
    /**
     * Get all descendant categories
     */
    async getDescendants(categoryId) {
        try {
            const descendants = [];
            const queue = [categoryId];
            while (queue.length > 0) {
                const currentId = queue.shift();
                const children = await this.model.findMany({
                    where: { parentId: currentId },
                    include: {
                        _count: {
                            select: {
                                products: {
                                    where: { isActive: true },
                                },
                            },
                        },
                    },
                });
                for (const child of children) {
                    descendants.push(child);
                    queue.push(child.id);
                }
            }
            return descendants;
        }
        catch (error) {
            console.error(`Error getting descendants for category ${categoryId}:`, error);
            throw error;
        }
    }
    /**
     * Delete category and handle children
     */
    async deleteCategory(categoryId, handleChildren = "move_to_parent") {
        try {
            await this.db.$transaction(async (prisma) => {
                const category = await prisma.category.findUnique({
                    where: { id: categoryId },
                    include: {
                        children: true,
                        products: true,
                    },
                });
                if (!category) {
                    throw new Error("Category not found");
                }
                // Check if category has products
                if (category.products.length > 0) {
                    throw new Error("Cannot delete category with products. Move products first.");
                }
                // Handle children based on strategy
                if (category.children.length > 0) {
                    switch (handleChildren) {
                        case "delete":
                            // Recursively delete all children
                            for (const child of category.children) {
                                await this.deleteCategory(child.id, "delete");
                            }
                            break;
                        case "move_to_parent":
                            // Move children to this category's parent
                            await prisma.category.updateMany({
                                where: { parentId: categoryId },
                                data: { parentId: category.parentId },
                            });
                            break;
                        case "move_to_root":
                            // Move children to root level
                            await prisma.category.updateMany({
                                where: { parentId: categoryId },
                                data: { parentId: null },
                            });
                            break;
                    }
                }
                // Delete the category
                await prisma.category.delete({
                    where: { id: categoryId },
                });
            });
        }
        catch (error) {
            console.error(`Error deleting category ${categoryId}:`, error);
            throw error;
        }
    }
    /**
     * Bulk update categories
     */
    async bulkUpdateSortOrder(updates) {
        try {
            let updatedCount = 0;
            await this.db.$transaction(async (prisma) => {
                for (const update of updates) {
                    await prisma.category.update({
                        where: { id: update.id },
                        data: { sortOrder: update.sortOrder },
                    });
                    updatedCount++;
                }
            });
            return updatedCount;
        }
        catch (error) {
            console.error("Error in bulk sort order update:", error);
            throw error;
        }
    }
    // Private helper methods
    async wouldCreateCircularReference(categoryId, potentialParentId) {
        try {
            // Check if potentialParentId is a descendant of categoryId
            const descendants = await this.getDescendants(categoryId);
            return descendants.some((desc) => desc.id === potentialParentId);
        }
        catch (error) {
            console.error("Error checking circular reference:", error);
            return true; // Err on the side of caution
        }
    }
}
exports.CategoryRepository = CategoryRepository;
//# sourceMappingURL=CategoryRepository.js.map