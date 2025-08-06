"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = void 0;
const BaseController_1 = require("../BaseController");
class ProductController extends BaseController_1.BaseController {
    productService;
    constructor(productService) {
        super();
        this.productService = productService;
    }
    /**
     * Get all products with filtering, search, and pagination
     * GET /api/v1/products
     */
    getProducts = async (req, res) => {
        try {
            const filters = {
                page: parseInt(req.query.page) || 1,
                limit: Math.min(parseInt(req.query.limit) || 20, 100),
                sortBy: req.query.sortBy || "createdAt",
                sortOrder: req.query.sortOrder || "desc",
            };
            if (req.query.search) {
                filters.search = req.query.search;
            }
            if (req.query.categoryId) {
                filters.categoryId = req.query.categoryId;
            }
            if (req.query.priceMin) {
                filters.priceMin = parseFloat(req.query.priceMin);
            }
            if (req.query.priceMax) {
                filters.priceMax = parseFloat(req.query.priceMax);
            }
            if (req.query.featured !== undefined) {
                filters.featured = req.query.featured === "true";
            }
            if (req.query.inStock !== undefined) {
                filters.inStock = req.query.inStock === "true";
            }
            const result = await this.productService.getProducts(filters);
            const response = {
                success: true,
                message: "Products retrieved successfully",
                data: result,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get product by ID with full details
     * GET /api/v1/products/:id
     */
    getProductById = async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) {
                this.sendError(res, "Product ID is required", 400, "INVALID_REQUEST");
                return;
            }
            const product = await this.productService.getProduct(id);
            if (!product) {
                this.sendError(res, "Product not found", 404, "PRODUCT_NOT_FOUND");
                return;
            }
            const response = {
                success: true,
                message: "Product retrieved successfully",
                data: { product },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get product by slug (SEO-friendly URL)
     * GET /api/v1/products/slug/:slug
     */
    getProductBySlug = async (req, res) => {
        try {
            const { slug } = req.params;
            if (!slug) {
                this.sendError(res, "Product slug is required", 400, "INVALID_REQUEST");
                return;
            }
            const product = await this.productService.getProduct(slug);
            if (!product) {
                this.sendError(res, "Product not found", 404, "PRODUCT_NOT_FOUND");
                return;
            }
            const response = {
                success: true,
                message: "Product retrieved successfully",
                data: { product },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get featured products
     * GET /api/v1/products/featured
     */
    getFeaturedProducts = async (req, res) => {
        try {
            const limit = Math.min(parseInt(req.query.limit) || 12, 50);
            const products = await this.productService.getFeaturedProducts(limit);
            const response = {
                success: true,
                message: "Featured products retrieved successfully",
                data: products,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get products by category
     * GET /api/v1/products/category/:categoryId
     */
    getProductsByCategory = async (req, res) => {
        try {
            const { categoryId } = req.params;
            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: Math.min(parseInt(req.query.limit) || 20, 100),
            };
            if (!categoryId) {
                this.sendError(res, "Category ID is required", 400, "INVALID_REQUEST");
                return;
            }
            const filters = {
                ...pagination,
                categoryId,
                sortBy: req.query.sortBy || "name",
                sortOrder: req.query.sortOrder || "asc",
            };
            const result = await this.productService.getProducts(filters);
            const response = {
                success: true,
                message: "Products retrieved successfully",
                data: result,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get related products based on category and price range
     * GET /api/v1/products/:id/related
     */
    getRelatedProducts = async (req, res) => {
        try {
            const { id } = req.params;
            const limit = Math.min(parseInt(req.query.limit) || 8, 20);
            if (!id) {
                this.sendError(res, "Product ID is required", 400, "INVALID_REQUEST");
                return;
            }
            // First get the product to get its categoryId
            const product = await this.productService.getProduct(id);
            if (!product) {
                this.sendError(res, "Product not found", 404, "PRODUCT_NOT_FOUND");
                return;
            }
            const products = await this.productService.getRelatedProducts(id, product.categoryId, limit);
            const response = {
                success: true,
                message: "Related products retrieved successfully",
                data: products,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Search products with advanced filtering
     * GET /api/v1/products/search
     */
    searchProducts = async (req, res) => {
        try {
            const search = req.query.q || req.query.search;
            const categoryId = req.query.categoryId;
            const brand = req.query.brand;
            const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : undefined;
            const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined;
            const inStock = req.query.inStock !== undefined ? req.query.inStock === "true" : undefined;
            const query = {
                page: parseInt(req.query.page) || 1,
                limit: Math.min(parseInt(req.query.limit) || 20, 100),
                search,
                sortBy: req.query.sortBy || "relevance",
                sortOrder: req.query.sortOrder || "desc",
            };
            // Only add defined values to avoid undefined assignment issues
            if (categoryId)
                query.categoryId = categoryId;
            if (brand)
                query.brand = brand;
            if (minPrice !== undefined)
                query.minPrice = minPrice;
            if (maxPrice !== undefined)
                query.maxPrice = maxPrice;
            if (inStock !== undefined)
                query.inStock = inStock;
            if (!query.search) {
                this.sendError(res, "Search query is required", 400, "SEARCH_QUERY_REQUIRED");
                return;
            }
            const searchFilters = {};
            if (query.page !== undefined)
                searchFilters.page = query.page;
            if (query.limit !== undefined)
                searchFilters.limit = query.limit;
            if (query.categoryId !== undefined)
                searchFilters.categoryId = query.categoryId;
            if (query.minPrice !== undefined)
                searchFilters.priceMin = query.minPrice;
            if (query.maxPrice !== undefined)
                searchFilters.priceMax = query.maxPrice;
            if (query.sortBy !== undefined)
                searchFilters.sortBy = query.sortBy;
            if (query.sortOrder !== undefined)
                searchFilters.sortOrder = query.sortOrder;
            if (query.inStock !== undefined)
                searchFilters.inStock = query.inStock;
            const result = await this.productService.searchProducts(query.search || "", searchFilters);
            const response = {
                success: true,
                message: "Search completed successfully",
                data: result,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get product stock availability
     * GET /api/v1/products/:id/stock
     */
    getProductStock = async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) {
                this.sendError(res, "Product ID is required", 400, "INVALID_REQUEST");
                return;
            }
            const stock = await this.productService.getProductStock(id);
            if (stock === null) {
                this.sendError(res, "Product not found", 404, "PRODUCT_NOT_FOUND");
                return;
            }
            const response = {
                success: true,
                message: "Stock information retrieved successfully",
                data: {
                    productId: id,
                    inStock: stock.quantity > 0,
                    quantity: stock.quantity,
                    lowStock: stock.quantity <= stock.lowStockThreshold,
                    availableQuantity: Math.max(0, stock.quantity - stock.reservedQuantity),
                    reservedQuantity: stock.reservedQuantity,
                    lastUpdated: stock.updatedAt,
                },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Check multiple products stock availability (for cart validation)
     * POST /api/v1/products/check-stock
     */
    checkMultipleStock = async (req, res) => {
        try {
            const { productIds } = req.body;
            if (!Array.isArray(productIds) || productIds.length === 0) {
                this.sendError(res, "Product IDs array is required", 400, "INVALID_PRODUCT_IDS");
                return;
            }
            const stockInfo = await this.productService.checkMultipleStock(productIds);
            const response = {
                success: true,
                message: "Stock information retrieved successfully",
                data: stockInfo,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get product reviews summary
     * GET /api/v1/products/:id/reviews/summary
     */
    getProductReviewsSummary = async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) {
                this.sendError(res, "Product ID is required", 400, "INVALID_REQUEST");
                return;
            }
            const summary = await this.productService.getProductReviewsSummary(id);
            const response = {
                success: true,
                message: "Product reviews summary retrieved successfully",
                data: summary,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get product price history (for price tracking)
     * GET /api/v1/products/:id/price-history
     */
    getProductPriceHistory = async (req, res) => {
        try {
            const { id } = req.params;
            const days = parseInt(req.query.days) || 30;
            if (!id) {
                this.sendError(res, "Product ID is required", 400, "INVALID_REQUEST");
                return;
            }
            const history = await this.productService.getProductPriceHistory(id, days);
            const response = {
                success: true,
                message: "Price history retrieved successfully",
                data: history,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get products with low stock (admin endpoint)
     * GET /api/v1/products/low-stock
     */
    getLowStockProducts = async (req, res) => {
        try {
            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: Math.min(parseInt(req.query.limit) || 20, 100),
            };
            const result = await this.productService.getLowStockProducts(pagination);
            const response = {
                success: true,
                message: "Low stock products retrieved successfully",
                data: result,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get product analytics (admin endpoint)
     * GET /api/v1/products/:id/analytics
     */
    getProductAnalytics = async (req, res) => {
        try {
            const { id } = req.params;
            const days = parseInt(req.query.days) || 30;
            if (!id) {
                this.sendError(res, "Product ID is required", 400, "INVALID_REQUEST");
                return;
            }
            const analytics = await this.productService.getProductAnalytics(id, days);
            const response = {
                success: true,
                message: "Product analytics retrieved successfully",
                data: analytics,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Create new product (admin endpoint)
     * POST /api/v1/products
     */
    createProduct = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            if (!userId || !this.hasRole(req, "admin")) {
                this.sendError(res, "Admin access required", 403, "FORBIDDEN");
                return;
            }
            const productData = req.body;
            // Validate product data
            const validationErrors = this.validateProductData(productData);
            if (validationErrors.length > 0) {
                this.sendError(res, "Validation failed", 400, "VALIDATION_ERROR", validationErrors);
                return;
            }
            const product = await this.productService.createProduct(productData, userId);
            this.logAction("PRODUCT_CREATED", userId, "PRODUCT", product.id, {
                name: productData.name,
                sku: productData.sku,
                price: productData.price,
            });
            this.sendSuccess(res, product, "Product created successfully", 201);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Update product (admin endpoint)
     * PUT /api/v1/products/:id
     */
    updateProduct = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            const { id } = req.params;
            if (!userId || !this.hasRole(req, "admin")) {
                this.sendError(res, "Admin access required", 403, "FORBIDDEN");
                return;
            }
            const updateData = req.body;
            // Validate update data
            const validationErrors = this.validateProductData(updateData, true);
            if (validationErrors.length > 0) {
                this.sendError(res, "Validation failed", 400, "VALIDATION_ERROR", validationErrors);
                return;
            }
            if (!id) {
                this.sendError(res, "Product ID is required", 400, "INVALID_REQUEST");
                return;
            }
            const product = await this.productService.updateProduct(id, updateData, userId);
            if (!product) {
                this.sendError(res, "Product not found", 404, "PRODUCT_NOT_FOUND");
                return;
            }
            this.logAction("PRODUCT_UPDATED", userId, "PRODUCT", id);
            this.sendSuccess(res, product, "Product updated successfully");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Delete product (admin endpoint)
     * DELETE /api/v1/products/:id
     */
    deleteProduct = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            const { id } = req.params;
            if (!userId || !this.hasRole(req, "admin")) {
                this.sendError(res, "Admin access required", 403, "FORBIDDEN");
                return;
            }
            if (!id) {
                this.sendError(res, "Product ID is required", 400, "INVALID_REQUEST");
                return;
            }
            const result = await this.productService.deleteProduct(id, userId);
            if (!result.success) {
                this.sendError(res, result.message, 400, "DELETE_FAILED");
                return;
            }
            this.logAction("PRODUCT_DELETED", userId, "PRODUCT", id);
            this.sendSuccess(res, null, "Product deleted successfully");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Validate product data before creation/update
     */
    validateProductData(data, isUpdate = false) {
        const errors = [];
        if (!isUpdate || data.name !== undefined) {
            if (!data.name || data.name.trim().length < 2) {
                errors.push("Product name must be at least 2 characters long");
            }
        }
        if (!isUpdate || data.price !== undefined) {
            if (data.price === undefined || data.price <= 0) {
                errors.push("Product price must be greater than 0");
            }
        }
        if (!isUpdate || data.sku !== undefined) {
            if (!data.sku || data.sku.trim().length < 2) {
                errors.push("Product SKU is required and must be at least 2 characters long");
            }
        }
        if (!isUpdate || data.categoryId !== undefined) {
            if (!data.categoryId || data.categoryId.trim().length === 0) {
                errors.push("Category ID is required");
            }
        }
        if (data.comparePrice !== undefined &&
            data.price !== undefined &&
            data.comparePrice <= data.price) {
            errors.push("Compare price must be greater than selling price");
        }
        if (data.weight !== undefined && data.weight < 0) {
            errors.push("Product weight cannot be negative");
        }
        return errors;
    }
}
exports.ProductController = ProductController;
//# sourceMappingURL=ProductController.js.map