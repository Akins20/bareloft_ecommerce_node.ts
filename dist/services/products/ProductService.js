"use strict";
/**
 * 🛍️ Product Service
 * Business logic for product management in Nigerian e-commerce context
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
const ProductRepository_1 = require("../../repositories/ProductRepository");
const CategoryRepository_1 = require("../../repositories/CategoryRepository");
const InventoryRepository_1 = require("../../repositories/InventoryRepository");
const BaseService_1 = require("../BaseService");
const winston_1 = require("../../utils/logger/winston");
const nigerian_1 = require("../../utils/helpers/nigerian");
const errorHandler_1 = require("../../middleware/error/errorHandler");
class ProductService extends BaseService_1.BaseService {
    productRepo;
    categoryRepo;
    inventoryRepo;
    constructor() {
        super();
        this.productRepo = new ProductRepository_1.ProductRepository();
        this.categoryRepo = new CategoryRepository_1.CategoryRepository();
        this.inventoryRepo = new InventoryRepository_1.InventoryRepository();
    }
    /**
     * 📋 Get products with filtering, search, and pagination
     * Nigerian market optimized with local categories and pricing
     */
    async getProducts(filters) {
        try {
            const { page = 1, limit = 20, search, categoryId, priceMin, priceMax, inStock = true, featured, sortBy = "createdAt", sortOrder = "desc", } = filters;
            // Validate price range for Nigerian market
            if (priceMin && priceMax && priceMin > priceMax) {
                throw new errorHandler_1.ValidationError("Minimum price cannot be greater than maximum price");
            }
            // Build query filters
            const queryFilters = {
                isActive: true,
            };
            if (search) {
                queryFilters.search = search;
            }
            if (categoryId) {
                // Verify category exists
                const category = await this.categoryRepo.findById(categoryId);
                if (!category) {
                    throw new errorHandler_1.NotFoundError("Category");
                }
                queryFilters.categoryId = categoryId;
            }
            if (priceMin !== undefined) {
                queryFilters.priceMin = priceMin;
            }
            if (priceMax !== undefined) {
                queryFilters.priceMax = priceMax;
            }
            if (featured !== undefined) {
                queryFilters.isFeatured = featured;
            }
            if (inStock) {
                queryFilters.inStock = true;
            }
            // Get products with pagination
            const products = await this.productRepo.findMany({
                filters: queryFilters,
                pagination: { page, limit },
                sort: { field: sortBy, order: sortOrder },
                include: {
                    category: true,
                    images: true,
                    inventory: true,
                    reviews: {
                        select: {
                            rating: true,
                        },
                    },
                },
            });
            // Calculate Nigerian market insights
            const productInsights = this.calculateMarketInsights(products.data);
            return {
                data: products.data.map((product) => this.formatProductForResponse(product)),
                pagination: products.pagination,
                filters: {
                    appliedFilters: queryFilters,
                    availableCategories: await this.getAvailableCategories(),
                    priceRange: await this.getPriceRange(),
                },
                insights: productInsights,
            };
        }
        catch (error) {
            winston_1.logger.error("Error fetching products", {
                error: error instanceof Error ? error.message : "Unknown error",
                filters,
            });
            throw error;
        }
    }
    /**
     * 🔍 Get single product by ID or slug
     */
    async getProduct(identifier) {
        try {
            let product;
            // Check if identifier is UUID (ID) or slug
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
            if (isUUID) {
                product = await this.productRepo.findById(identifier, {
                    include: {
                        category: true,
                        images: true,
                        inventory: true,
                        reviews: {
                            include: {
                                user: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                    },
                                },
                            },
                            orderBy: {
                                createdAt: "desc",
                            },
                        },
                    },
                });
            }
            else {
                product = await this.productRepo.findBySlug(identifier, {
                    include: {
                        category: true,
                        images: true,
                        inventory: true,
                        reviews: {
                            include: {
                                user: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                    },
                                },
                            },
                            orderBy: {
                                createdAt: "desc",
                            },
                        },
                    },
                });
            }
            if (!product) {
                throw new errorHandler_1.NotFoundError("Product");
            }
            if (!product.isActive) {
                throw new errorHandler_1.NotFoundError("Product");
            }
            // Get related products
            const relatedProducts = await this.getRelatedProducts(product.id, product.categoryId);
            // Calculate Nigerian market specific data
            const formattedProduct = this.formatProductForResponse(product);
            return {
                ...formattedProduct,
                relatedProducts: relatedProducts.map((p) => this.formatProductForResponse(p)),
                marketInsights: this.calculateProductMarketInsights(product),
            };
        }
        catch (error) {
            winston_1.logger.error("Error fetching product", {
                error: error instanceof Error ? error.message : "Unknown error",
                identifier,
            });
            throw error;
        }
    }
    /**
     * ➕ Create new product
     */
    async createProduct(productData, adminId) {
        try {
            // Validate category exists
            if (productData.categoryId) {
                const category = await this.categoryRepo.findById(productData.categoryId);
                if (!category) {
                    throw new errorHandler_1.ValidationError("Invalid category ID");
                }
            }
            // Validate SKU uniqueness
            if (productData.sku) {
                const existingProduct = await this.productRepo.findBySku(productData.sku);
                if (existingProduct) {
                    throw new errorHandler_1.ValidationError("SKU already exists");
                }
            }
            // Generate slug from name
            const slug = this.generateSlug(productData.name);
            // Ensure slug uniqueness
            const existingSlug = await this.productRepo.findBySlug(slug);
            if (existingSlug) {
                const uniqueSlug = `${slug}-${Date.now()}`;
                productData.slug = uniqueSlug;
            }
            else {
                productData.slug = slug;
            }
            // Validate Nigerian pricing
            if (productData.price) {
                if (!nigerian_1.NairaCurrencyUtils.isValid(productData.price)) {
                    throw new errorHandler_1.ValidationError("Invalid price format");
                }
            }
            // Create product
            const product = await this.productRepo.create({
                ...productData,
                createdBy: adminId,
                updatedBy: adminId,
            });
            // Create initial inventory record if quantity provided
            if (productData.initialQuantity !== undefined) {
                await this.inventoryRepo.create({
                    productId: product.id,
                    quantity: productData.initialQuantity,
                    lowStockThreshold: productData.lowStockThreshold || 10,
                    trackInventory: productData.trackInventory !== false,
                });
            }
            winston_1.logger.info("Product created successfully", {
                productId: product.id,
                name: product.name,
                sku: product.sku,
                adminId,
            });
            return this.formatProductForResponse(product);
        }
        catch (error) {
            winston_1.logger.error("Error creating product", {
                error: error instanceof Error ? error.message : "Unknown error",
                productData: { ...productData, adminId },
            });
            throw error;
        }
    }
    /**
     * ✏️ Update existing product
     */
    async updateProduct(productId, productData, adminId) {
        try {
            // Check if product exists
            const existingProduct = await this.productRepo.findById(productId);
            if (!existingProduct) {
                throw new errorHandler_1.NotFoundError("Product");
            }
            // Validate category if provided
            if (productData.categoryId) {
                const category = await this.categoryRepo.findById(productData.categoryId);
                if (!category) {
                    throw new errorHandler_1.ValidationError("Invalid category ID");
                }
            }
            // Validate SKU uniqueness if changed
            if (productData.sku && productData.sku !== existingProduct.sku) {
                const existingBySku = await this.productRepo.findBySku(productData.sku);
                if (existingBySku) {
                    throw new errorHandler_1.ValidationError("SKU already exists");
                }
            }
            // Update slug if name changed
            if (productData.name && productData.name !== existingProduct.name) {
                productData.slug = this.generateSlug(productData.name);
                // Ensure slug uniqueness
                const existingSlug = await this.productRepo.findBySlug(productData.slug);
                if (existingSlug && existingSlug.id !== productId) {
                    productData.slug = `${productData.slug}-${Date.now()}`;
                }
            }
            // Validate pricing changes
            if (productData.price !== undefined) {
                if (!nigerian_1.NairaCurrencyUtils.isValid(productData.price)) {
                    throw new errorHandler_1.ValidationError("Invalid price format");
                }
            }
            // Update product
            const updatedProduct = await this.productRepo.update(productId, {
                ...productData,
                updatedBy: adminId,
                updatedAt: new Date(),
            });
            winston_1.logger.info("Product updated successfully", {
                productId,
                changes: Object.keys(productData),
                adminId,
            });
            return this.formatProductForResponse(updatedProduct);
        }
        catch (error) {
            winston_1.logger.error("Error updating product", {
                error: error instanceof Error ? error.message : "Unknown error",
                productId,
                productData,
            });
            throw error;
        }
    }
    /**
     * 🗑️ Delete product (soft delete)
     */
    async deleteProduct(productId, adminId) {
        try {
            const product = await this.productRepo.findById(productId);
            if (!product) {
                throw new errorHandler_1.NotFoundError("Product");
            }
            // Check if product has pending orders
            const hasPendingOrders = await this.productRepo.hasPendingOrders(productId);
            if (hasPendingOrders) {
                throw new errorHandler_1.ValidationError("Cannot delete product with pending orders");
            }
            // Soft delete
            await this.productRepo.update(productId, {
                isActive: false,
                deletedAt: new Date(),
                updatedBy: adminId,
            });
            winston_1.logger.info("Product deleted successfully", {
                productId,
                productName: product.name,
                adminId,
            });
        }
        catch (error) {
            winston_1.logger.error("Error deleting product", {
                error: error instanceof Error ? error.message : "Unknown error",
                productId,
                adminId,
            });
            throw error;
        }
    }
    /**
     * 🔍 Search products with advanced filters
     */
    async searchProducts(query, filters = {}) {
        try {
            if (!query || query.trim().length < 2) {
                throw new errorHandler_1.ValidationError("Search query must be at least 2 characters");
            }
            const searchFilters = {
                ...filters,
                search: query.trim(),
                page: filters.page || 1,
                limit: filters.limit || 20,
            };
            return this.getProducts(searchFilters);
        }
        catch (error) {
            winston_1.logger.error("Error searching products", {
                error: error instanceof Error ? error.message : "Unknown error",
                query,
                filters,
            });
            throw error;
        }
    }
    /**
     * 🏷️ Get products by category
     */
    async getProductsByCategory(categoryId, filters = {}) {
        try {
            const category = await this.categoryRepo.findById(categoryId);
            if (!category) {
                throw new errorHandler_1.NotFoundError("Category");
            }
            const categoryFilters = {
                ...filters,
                categoryId,
                page: filters.page || 1,
                limit: filters.limit || 20,
            };
            return this.getProducts(categoryFilters);
        }
        catch (error) {
            winston_1.logger.error("Error fetching products by category", {
                error: error instanceof Error ? error.message : "Unknown error",
                categoryId,
                filters,
            });
            throw error;
        }
    }
    /**
     * ⭐ Get featured products
     */
    async getFeaturedProducts(limit = 12) {
        try {
            const products = await this.productRepo.findMany({
                filters: {
                    isActive: true,
                    isFeatured: true,
                    inStock: true,
                },
                pagination: { page: 1, limit },
                sort: { field: "updatedAt", order: "desc" },
                include: {
                    category: true,
                    images: true,
                    inventory: true,
                },
            });
            return products.data.map((product) => this.formatProductForResponse(product));
        }
        catch (error) {
            winston_1.logger.error("Error fetching featured products", {
                error: error instanceof Error ? error.message : "Unknown error",
                limit,
            });
            throw error;
        }
    }
    /**
     * 🔗 Get related products
     */
    async getRelatedProducts(productId, categoryId, limit = 8) {
        try {
            const products = await this.productRepo.findMany({
                filters: {
                    isActive: true,
                    categoryId,
                    excludeIds: [productId],
                    inStock: true,
                },
                pagination: { page: 1, limit },
                sort: { field: "createdAt", order: "desc" },
                include: {
                    category: true,
                    images: true,
                    inventory: true,
                },
            });
            return products.data;
        }
        catch (error) {
            winston_1.logger.error("Error fetching related products", {
                error: error instanceof Error ? error.message : "Unknown error",
                productId,
                categoryId,
            });
            return [];
        }
    }
    /**
     * 🎯 Format product for API response
     */
    formatProductForResponse(product) {
        return {
            ...product,
            price: nigerian_1.NairaCurrencyUtils.format(product.price),
            comparePrice: product.comparePrice
                ? nigerian_1.NairaCurrencyUtils.format(product.comparePrice)
                : null,
            averageRating: this.calculateAverageRating(product.reviews || []),
            reviewCount: product.reviews?.length || 0,
            inStock: product.inventory?.quantity > 0,
            stockQuantity: product.inventory?.quantity || 0,
            canOrder: product.isActive &&
                (product.inventory?.quantity > 0 || !product.inventory?.trackInventory),
        };
    }
    /**
     * 📊 Calculate market insights for Nigerian context
     */
    calculateMarketInsights(products) {
        const totalProducts = products.length;
        const inStockProducts = products.filter((p) => p.inventory?.quantity > 0).length;
        const featuredProducts = products.filter((p) => p.isFeatured).length;
        const prices = products.map((p) => p.price).filter((p) => p > 0);
        const avgPrice = prices.length > 0
            ? prices.reduce((sum, price) => sum + price, 0) / prices.length
            : 0;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        return {
            totalProducts,
            inStockProducts,
            featuredProducts,
            stockPercentage: totalProducts > 0
                ? Math.round((inStockProducts / totalProducts) * 100)
                : 0,
            priceRange: {
                min: nigerian_1.NairaCurrencyUtils.format(minPrice),
                max: nigerian_1.NairaCurrencyUtils.format(maxPrice),
                average: nigerian_1.NairaCurrencyUtils.format(avgPrice),
            },
            marketRecommendations: this.generateMarketRecommendations(products),
        };
    }
    /**
     * 📈 Calculate product-specific market insights
     */
    calculateProductMarketInsights(product) {
        const price = product.price;
        const category = product.category?.name;
        return {
            priceCategory: this.categorizePriceForNigerianMarket(price),
            recommendedShipping: nigerian_1.NigerianMarketplaceUtils.getShippingMethods(product.shippingState || "Lagos"),
            estimatedDelivery: nigerian_1.NigerianMarketplaceUtils.estimateDeliveryTime("Lagos", product.shippingState || "Lagos"),
            paymentMethods: nigerian_1.NairaCurrencyUtils.getAvailablePaymentMethods(price, "Lagos"),
            marketPosition: this.determineMarketPosition(price, category),
        };
    }
    /**
     * 🎯 Generate market recommendations
     */
    generateMarketRecommendations(products) {
        const recommendations = [];
        const lowStockProducts = products.filter((p) => p.inventory?.quantity < 10).length;
        const highPriceProducts = products.filter((p) => p.price > 100000).length;
        if (lowStockProducts > 0) {
            recommendations.push(`${lowStockProducts} products need restocking`);
        }
        if (highPriceProducts > 0) {
            recommendations.push(`Consider payment plans for ${highPriceProducts} high-value items`);
        }
        recommendations.push("Optimize for mobile-first Nigerian customers");
        return recommendations;
    }
    /**
     * 💰 Categorize price for Nigerian market
     */
    categorizePriceForNigerianMarket(price) {
        if (price <= 5000)
            return "budget";
        if (price <= 25000)
            return "affordable";
        if (price <= 100000)
            return "mid-range";
        if (price <= 500000)
            return "premium";
        return "luxury";
    }
    /**
     * 📊 Determine market position
     */
    determineMarketPosition(price, category) {
        // This would typically involve more complex market analysis
        const priceCategory = this.categorizePriceForNigerianMarket(price);
        return `${priceCategory} ${category?.toLowerCase() || "product"}`;
    }
    /**
     * ⭐ Calculate average rating
     */
    calculateAverageRating(reviews) {
        if (!reviews || reviews.length === 0)
            return 0;
        const total = reviews.reduce((sum, review) => sum + review.rating, 0);
        return Math.round((total / reviews.length) * 10) / 10; // Round to 1 decimal
    }
    /**
     * 🔗 Generate SEO-friendly slug
     */
    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^\w\s-]/g, "") // Remove special characters
            .replace(/\s+/g, "-") // Replace spaces with hyphens
            .replace(/-+/g, "-") // Replace multiple hyphens with single
            .trim();
    }
    /**
     * 📂 Get available categories for filters
     */
    async getAvailableCategories() {
        try {
            return await this.categoryRepo.findMany({
                filters: { isActive: true },
                select: { id: true, name: true, slug: true },
            });
        }
        catch (error) {
            winston_1.logger.error("Error fetching available categories", {
                error: error instanceof Error ? error.message : "Unknown error",
            });
            return [];
        }
    }
    /**
     * 💰 Get price range for filters
     */
    async getPriceRange() {
        try {
            const range = await this.productRepo.getPriceRange();
            return {
                min: range?.min || 0,
                max: range?.max || 1000000,
            };
        }
        catch (error) {
            winston_1.logger.error("Error fetching price range", {
                error: error instanceof Error ? error.message : "Unknown error",
            });
            return { min: 0, max: 1000000 };
        }
    }
}
exports.ProductService = ProductService;
//# sourceMappingURL=ProductService.js.map