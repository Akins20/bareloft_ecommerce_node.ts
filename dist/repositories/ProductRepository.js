"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
class ProductRepository extends BaseRepository_1.BaseRepository {
    modelName = "product";
    constructor(database) {
        super(database);
    }
    /**
     * Find product by slug
     */
    async findBySlug(slug) {
        try {
            return await this.model.findUnique({
                where: { slug },
                include: {
                    category: true,
                    images: {
                        orderBy: { sortOrder: "asc" },
                    },
                    inventory: true,
                    reviews: {
                        where: { isApproved: true },
                        include: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    avatar: true,
                                },
                            },
                        },
                        orderBy: { createdAt: "desc" },
                        take: 10,
                    },
                },
            });
        }
        catch (error) {
            console.error(`Error finding product by slug ${slug}:`, error);
            throw error;
        }
    }
    /**
     * Find product by SKU
     */
    async findBySku(sku) {
        try {
            return await this.model.findUnique({
                where: { sku },
                include: {
                    category: true,
                    inventory: true,
                },
            });
        }
        catch (error) {
            console.error(`Error finding product by SKU ${sku}:`, error);
            throw error;
        }
    }
    /**
     * Create product with relationships
     */
    async createProduct(productData) {
        try {
            return await this.db.$transaction(async (prisma) => {
                // Create product
                const product = await prisma.product.create({
                    data: {
                        name: productData.name,
                        slug: productData.slug,
                        description: productData.description,
                        shortDescription: productData.shortDescription,
                        sku: productData.sku,
                        price: productData.price,
                        comparePrice: productData.comparePrice,
                        categoryId: productData.categoryId,
                        brand: productData.brand,
                        weight: productData.weight,
                        dimensions: productData.dimensions,
                        isActive: productData.isActive ?? true,
                        isFeatured: productData.isFeatured ?? false,
                        seoTitle: productData.seoTitle,
                        seoDescription: productData.seoDescription,
                    },
                });
                // Create inventory
                await prisma.inventory.create({
                    data: {
                        productId: product.id,
                        quantity: productData.inventory.quantity,
                        reservedQuantity: 0,
                        lowStockThreshold: productData.inventory.lowStockThreshold ?? 10,
                        trackInventory: productData.inventory.trackInventory ?? true,
                    },
                });
                // Create images if provided
                if (productData.images && productData.images.length > 0) {
                    await prisma.productImage.createMany({
                        data: productData.images.map((image, index) => ({
                            productId: product.id,
                            imageUrl: image.imageUrl,
                            altText: image.altText,
                            sortOrder: index,
                            isPrimary: image.isPrimary ?? index === 0,
                        })),
                    });
                }
                // Create initial inventory movement
                await prisma.inventoryMovement.create({
                    data: {
                        productId: product.id,
                        type: "RESTOCK",
                        quantity: productData.inventory.quantity,
                        previousQuantity: 0,
                        newQuantity: productData.inventory.quantity,
                        reason: "Initial stock",
                    },
                });
                return product;
            });
        }
        catch (error) {
            console.error("Error creating product:", error);
            throw error;
        }
    }
    /**
     * Find products with advanced filtering
     */
    async findWithFilters(params) {
        try {
            const page = params.page || 1;
            const limit = Math.min(params.limit || 20, 100);
            const skip = (page - 1) * limit;
            // Build where clause
            const where = {};
            // Active products only (unless admin)
            if (params.isActive !== false) {
                where.isActive = true;
            }
            if (params.query) {
                where.OR = [
                    { name: { contains: params.query, mode: "insensitive" } },
                    { description: { contains: params.query, mode: "insensitive" } },
                    { brand: { contains: params.query, mode: "insensitive" } },
                    { sku: { contains: params.query, mode: "insensitive" } },
                ];
            }
            if (params.categoryId) {
                where.categoryId = params.categoryId;
            }
            if (params.categorySlug) {
                where.category = {
                    slug: params.categorySlug,
                };
            }
            if (params.brand) {
                where.brand = { contains: params.brand, mode: "insensitive" };
            }
            if (params.priceMin || params.priceMax) {
                where.price = {};
                if (params.priceMin)
                    where.price.gte = params.priceMin;
                if (params.priceMax)
                    where.price.lte = params.priceMax;
            }
            if (params.isFeatured) {
                where.isFeatured = true;
            }
            if (params.hasDiscount) {
                where.comparePrice = { gt: 0 };
            }
            if (params.inStock) {
                where.inventory = {
                    quantity: { gt: 0 },
                };
            }
            if (params.availability) {
                switch (params.availability) {
                    case "in_stock":
                        where.inventory = { quantity: { gt: 0 } };
                        break;
                    case "out_of_stock":
                        where.inventory = { quantity: { lte: 0 } };
                        break;
                    case "low_stock":
                        where.inventory = {
                            quantity: { lte: { inventory: { lowStockThreshold: true } } },
                        };
                        break;
                }
            }
            // Build orderBy clause
            let orderBy = {};
            switch (params.sortBy) {
                case "price":
                    orderBy = { price: params.sortOrder || "asc" };
                    break;
                case "name":
                    orderBy = { name: params.sortOrder || "asc" };
                    break;
                case "created":
                    orderBy = { createdAt: params.sortOrder || "desc" };
                    break;
                case "rating":
                    // This would require a complex aggregation query
                    orderBy = { createdAt: "desc" }; // Fallback
                    break;
                case "popularity":
                    // This would require view/order count tracking
                    orderBy = { createdAt: "desc" }; // Fallback
                    break;
                default:
                    orderBy = { createdAt: "desc" };
            }
            const [products, total, facets] = await Promise.all([
                this.model.findMany({
                    where,
                    take: limit,
                    skip,
                    orderBy,
                    include: {
                        category: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                            },
                        },
                        images: {
                            where: { isPrimary: true },
                            take: 1,
                        },
                        inventory: {
                            select: {
                                quantity: true,
                                reservedQuantity: true,
                            },
                        },
                        _count: {
                            select: {
                                reviews: {
                                    where: { isApproved: true },
                                },
                            },
                        },
                    },
                }),
                this.model.count({ where }),
                this.getFacets(where),
            ]);
            return { products, total, facets };
        }
        catch (error) {
            console.error("Error finding products with filters:", error);
            throw error;
        }
    }
    /**
     * Get featured products
     */
    async getFeaturedProducts(limit = 12) {
        try {
            return await this.model.findMany({
                where: {
                    isFeatured: true,
                    isActive: true,
                    inventory: {
                        quantity: { gt: 0 },
                    },
                },
                take: limit,
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                        },
                    },
                    images: {
                        where: { isPrimary: true },
                        take: 1,
                    },
                    inventory: true,
                },
                orderBy: { createdAt: "desc" },
            });
        }
        catch (error) {
            console.error("Error getting featured products:", error);
            throw error;
        }
    }
    /**
     * Get products by category
     */
    async getByCategory(categoryId, limit = 20) {
        try {
            return await this.model.findMany({
                where: {
                    categoryId,
                    isActive: true,
                },
                take: limit,
                include: {
                    category: true,
                    images: {
                        where: { isPrimary: true },
                        take: 1,
                    },
                    inventory: true,
                },
                orderBy: { createdAt: "desc" },
            });
        }
        catch (error) {
            console.error(`Error getting products by category ${categoryId}:`, error);
            throw error;
        }
    }
    /**
     * Get related products
     */
    async getRelatedProducts(productId, limit = 8) {
        try {
            // Get the product to find related products in same category
            const product = await this.model.findUnique({
                where: { id: productId },
                select: { categoryId: true, brand: true },
            });
            if (!product)
                return [];
            return await this.model.findMany({
                where: {
                    AND: [
                        { id: { not: productId } },
                        { isActive: true },
                        {
                            OR: [
                                { categoryId: product.categoryId },
                                { brand: product.brand },
                            ],
                        },
                    ],
                },
                take: limit,
                include: {
                    category: true,
                    images: {
                        where: { isPrimary: true },
                        take: 1,
                    },
                    inventory: true,
                },
                orderBy: { createdAt: "desc" },
            });
        }
        catch (error) {
            console.error(`Error getting related products for ${productId}:`, error);
            throw error;
        }
    }
    /**
     * Search products with full-text search
     */
    async searchProducts(query, params) {
        try {
            const startTime = Date.now();
            const page = params.page || 1;
            const limit = Math.min(params.limit || 20, 100);
            const skip = (page - 1) * limit;
            // Build search conditions
            const searchConditions = {
                AND: [
                    { isActive: true },
                    {
                        OR: [
                            { name: { contains: query, mode: "insensitive" } },
                            { description: { contains: query, mode: "insensitive" } },
                            { brand: { contains: query, mode: "insensitive" } },
                            { sku: { contains: query, mode: "insensitive" } },
                        ],
                    },
                ],
            };
            // Add additional filters
            if (params.categoryId) {
                searchConditions.AND.push({ categoryId: params.categoryId });
            }
            if (params.priceMin || params.priceMax) {
                const priceFilter = {};
                if (params.priceMin)
                    priceFilter.gte = params.priceMin;
                if (params.priceMax)
                    priceFilter.lte = params.priceMax;
                searchConditions.AND.push({ price: priceFilter });
            }
            const [products, total] = await Promise.all([
                this.model.findMany({
                    where: searchConditions,
                    take: limit,
                    skip,
                    include: {
                        category: true,
                        images: {
                            where: { isPrimary: true },
                            take: 1,
                        },
                        inventory: true,
                    },
                    orderBy: params.sortBy === "price"
                        ? { price: params.sortOrder || "asc" }
                        : { createdAt: "desc" },
                }),
                this.model.count({ where: searchConditions }),
            ]);
            const searchTime = Date.now() - startTime;
            return { products, total, searchTime };
        }
        catch (error) {
            console.error(`Error searching products with query "${query}":`, error);
            throw error;
        }
    }
    /**
     * Get product analytics
     */
    async getProductAnalytics() {
        try {
            const [totalProducts, activeProducts, inStockProducts, outOfStockProducts, lowStockProducts, featuredProducts, topCategories, topBrands, recentlyAdded, inventoryValue,] = await Promise.all([
                this.model.count(),
                this.model.count({ where: { isActive: true } }),
                this.model.count({
                    where: {
                        inventory: { quantity: { gt: 0 } },
                    },
                }),
                this.model.count({
                    where: {
                        inventory: { quantity: { lte: 0 } },
                    },
                }),
                this.model.count({
                    where: {
                        inventory: {
                            quantity: { lte: { inventory: { lowStockThreshold: true } } },
                        },
                    },
                }),
                this.model.count({ where: { isFeatured: true } }),
                this.getTopCategories(10),
                this.getTopBrands(10),
                this.model.findMany({
                    take: 10,
                    orderBy: { createdAt: "desc" },
                    include: {
                        category: true,
                        images: {
                            where: { isPrimary: true },
                            take: 1,
                        },
                    },
                }),
                this.getTotalInventoryValue(),
            ]);
            const averagePrice = await this.getAveragePrice();
            return {
                totalProducts,
                activeProducts,
                inactiveProducts: totalProducts - activeProducts,
                inStockProducts,
                outOfStockProducts,
                lowStockProducts,
                featuredProducts,
                totalValue: inventoryValue,
                averagePrice,
                topCategories,
                topBrands,
                priceDistribution: await this.getPriceDistribution(),
                recentlyAdded,
                mostViewed: [], // Would need view tracking
                bestRated: [], // Would need rating aggregation
            };
        }
        catch (error) {
            console.error("Error getting product analytics:", error);
            throw error;
        }
    }
    /**
     * Update product with inventory
     */
    async updateProductWithInventory(productId, productData, inventoryData) {
        try {
            return await this.db.$transaction(async (prisma) => {
                // Update product
                const product = await prisma.product.update({
                    where: { id: productId },
                    data: productData,
                });
                // Update inventory if provided
                if (inventoryData) {
                    const currentInventory = await prisma.inventory.findUnique({
                        where: { productId },
                    });
                    if (currentInventory && inventoryData.quantity !== undefined) {
                        // Update inventory quantity
                        await prisma.inventory.update({
                            where: { productId },
                            data: {
                                quantity: inventoryData.quantity,
                                lowStockThreshold: inventoryData.lowStockThreshold,
                                trackInventory: inventoryData.trackInventory,
                            },
                        });
                        // Create inventory movement record
                        if (inventoryData.quantity !== currentInventory.quantity) {
                            await prisma.inventoryMovement.create({
                                data: {
                                    productId,
                                    type: "ADJUSTMENT",
                                    quantity: inventoryData.quantity - currentInventory.quantity,
                                    previousQuantity: currentInventory.quantity,
                                    newQuantity: inventoryData.quantity,
                                    reason: inventoryData.reason || "Manual adjustment",
                                },
                            });
                        }
                    }
                }
                return product;
            });
        }
        catch (error) {
            console.error(`Error updating product with inventory ${productId}:`, error);
            throw error;
        }
    }
    /**
     * Check if SKU exists
     */
    async skuExists(sku, excludeProductId) {
        try {
            const where = { sku };
            if (excludeProductId) {
                where.id = { not: excludeProductId };
            }
            const product = await this.model.findUnique({
                where,
                select: { id: true },
            });
            return !!product;
        }
        catch (error) {
            console.error(`Error checking SKU existence ${sku}:`, error);
            return false;
        }
    }
    /**
     * Check if slug exists
     */
    async slugExists(slug, excludeProductId) {
        try {
            const where = { slug };
            if (excludeProductId) {
                where.id = { not: excludeProductId };
            }
            const product = await this.model.findUnique({
                where,
                select: { id: true },
            });
            return !!product;
        }
        catch (error) {
            console.error(`Error checking slug existence ${slug}:`, error);
            return false;
        }
    }
    /**
     * Get low stock products
     */
    async getLowStockProducts(limit = 50) {
        try {
            return await this.model.findMany({
                where: {
                    isActive: true,
                    inventory: {
                        trackInventory: true,
                        quantity: {
                            lte: { inventory: { lowStockThreshold: true } },
                        },
                    },
                },
                take: limit,
                include: {
                    category: true,
                    inventory: true,
                },
                orderBy: {
                    inventory: { quantity: "asc" },
                },
            });
        }
        catch (error) {
            console.error("Error getting low stock products:", error);
            throw error;
        }
    }
    /**
     * Get products by brand
     */
    async getByBrand(brand, limit = 20) {
        try {
            return await this.model.findMany({
                where: {
                    brand: { contains: brand, mode: "insensitive" },
                    isActive: true,
                },
                take: limit,
                include: {
                    category: true,
                    images: {
                        where: { isPrimary: true },
                        take: 1,
                    },
                    inventory: true,
                },
                orderBy: { createdAt: "desc" },
            });
        }
        catch (error) {
            console.error(`Error getting products by brand ${brand}:`, error);
            throw error;
        }
    }
    /**
     * Bulk update products
     */
    async bulkUpdate(updates) {
        try {
            let updatedCount = 0;
            await this.db.$transaction(async (prisma) => {
                for (const update of updates) {
                    await prisma.product.update({
                        where: { id: update.id },
                        data: update.data,
                    });
                    updatedCount++;
                }
            });
            return updatedCount;
        }
        catch (error) {
            console.error("Error in bulk update:", error);
            throw error;
        }
    }
    // Private helper methods
    async getFacets(where) {
        try {
            const [totalProducts, inStock, outOfStock, onSale, featured] = await Promise.all([
                this.model.count({ where }),
                this.model.count({
                    where: {
                        ...where,
                        inventory: { quantity: { gt: 0 } },
                    },
                }),
                this.model.count({
                    where: {
                        ...where,
                        inventory: { quantity: { lte: 0 } },
                    },
                }),
                this.model.count({
                    where: {
                        ...where,
                        comparePrice: { gt: 0 },
                    },
                }),
                this.model.count({
                    where: {
                        ...where,
                        isFeatured: true,
                    },
                }),
            ]);
            return {
                totalProducts,
                inStock,
                outOfStock,
                onSale,
                featured,
            };
        }
        catch (error) {
            console.error("Error getting facets:", error);
            return {
                totalProducts: 0,
                inStock: 0,
                outOfStock: 0,
                onSale: 0,
                featured: 0,
            };
        }
    }
    async getTopCategories(limit) {
        try {
            return await this.db.category
                .findMany({
                take: limit,
                include: {
                    _count: {
                        select: {
                            products: {
                                where: { isActive: true },
                            },
                        },
                    },
                    products: {
                        where: { isActive: true },
                        select: { price: true },
                    },
                },
                orderBy: {
                    products: {
                        _count: "desc",
                    },
                },
            })
                .then((categories) => categories.map((category) => ({
                category: {
                    id: category.id,
                    name: category.name,
                    slug: category.slug,
                },
                productCount: category._count.products,
                totalValue: category.products.reduce((sum, p) => sum + Number(p.price), 0),
            })));
        }
        catch (error) {
            console.error("Error getting top categories:", error);
            return [];
        }
    }
    async getTopBrands(limit) {
        try {
            const brands = await this.model.groupBy({
                by: ["brand"],
                where: {
                    isActive: true,
                    brand: { not: null },
                },
                _count: {
                    brand: true,
                },
                _avg: {
                    price: true,
                },
                orderBy: {
                    _count: {
                        brand: "desc",
                    },
                },
                take: limit,
            });
            return brands.map((brand) => ({
                brand: brand.brand || "Unknown",
                productCount: brand._count.brand,
                totalValue: (brand._avg.price || 0) * brand._count.brand,
            }));
        }
        catch (error) {
            console.error("Error getting top brands:", error);
            return [];
        }
    }
    async getTotalInventoryValue() {
        try {
            const result = await this.db.product.aggregate({
                where: { isActive: true },
                _sum: {
                    price: true,
                },
            });
            return Number(result._sum.price) || 0;
        }
        catch (error) {
            console.error("Error getting total inventory value:", error);
            return 0;
        }
    }
    async getAveragePrice() {
        try {
            const result = await this.db.product.aggregate({
                where: { isActive: true },
                _avg: {
                    price: true,
                },
            });
            return Number(result._avg.price) || 0;
        }
        catch (error) {
            console.error("Error getting average price:", error);
            return 0;
        }
    }
    async getPriceDistribution() {
        try {
            // Define price ranges in Naira
            const ranges = [
                { min: 0, max: 5000, label: "₦0 - ₦5,000" },
                { min: 5001, max: 15000, label: "₦5,001 - ₦15,000" },
                { min: 15001, max: 50000, label: "₦15,001 - ₦50,000" },
                { min: 50001, max: 150000, label: "₦50,001 - ₦150,000" },
                { min: 150001, max: 500000, label: "₦150,001 - ₦500,000" },
                { min: 500001, max: 9999999, label: "₦500,000+" },
            ];
            const distribution = await Promise.all(ranges.map(async (range) => {
                const count = await this.model.count({
                    where: {
                        isActive: true,
                        price: {
                            gte: range.min,
                            lte: range.max,
                        },
                    },
                });
                return {
                    range: range.label,
                    count,
                };
            }));
            return distribution;
        }
        catch (error) {
            console.error("Error getting price distribution:", error);
            return [];
        }
    }
}
exports.ProductRepository = ProductRepository;
//# sourceMappingURL=ProductRepository.js.map