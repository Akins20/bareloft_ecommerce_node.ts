"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewSchemas = exports.categorySchemas = exports.productSchemas = void 0;
const joi_1 = __importDefault(require("joi"));
/**
 * Product validation schemas
 */
exports.productSchemas = {
    /**
     * Create product schema
     */
    createProduct: joi_1.default.object({
        name: joi_1.default.string().min(2).max(200).required().messages({
            "string.min": "Product name must be at least 2 characters",
            "string.max": "Product name must not exceed 200 characters",
            "any.required": "Product name is required",
        }),
        description: joi_1.default.string().max(5000).optional().allow("").messages({
            "string.max": "Description must not exceed 5000 characters",
        }),
        shortDescription: joi_1.default.string().max(500).optional().allow("").messages({
            "string.max": "Short description must not exceed 500 characters",
        }),
        sku: joi_1.default.string()
            .pattern(/^[A-Z]{3,6}[0-9]{6,12}$/)
            .required()
            .messages({
            "string.pattern.base": "SKU must be 3-6 letters followed by 6-12 digits",
            "any.required": "SKU is required",
        }),
        price: joi_1.default.number().min(1).max(100000000).precision(2).required().messages({
            "number.min": "Price must be at least ₦0.01",
            "number.max": "Price must not exceed ₦1,000,000",
            "any.required": "Price is required",
        }),
        comparePrice: joi_1.default.number()
            .min(joi_1.default.ref("price"))
            .max(100000000)
            .precision(2)
            .optional()
            .messages({
            "number.min": "Compare price must be greater than or equal to selling price",
            "number.max": "Compare price must not exceed ₦1,000,000",
        }),
        costPrice: joi_1.default.number()
            .min(0)
            .max(joi_1.default.ref("price"))
            .precision(2)
            .optional()
            .messages({
            "number.min": "Cost price must be non-negative",
            "number.max": "Cost price must not exceed selling price",
        }),
        categoryId: joi_1.default.string().uuid().required().messages({
            "string.uuid": "Category ID must be a valid UUID",
            "any.required": "Category is required",
        }),
        brand: joi_1.default.string().max(100).optional().allow("").messages({
            "string.max": "Brand must not exceed 100 characters",
        }),
        weight: joi_1.default.number().min(0.001).max(1000).precision(3).optional().messages({
            "number.min": "Weight must be at least 0.001 kg",
            "number.max": "Weight must not exceed 1000 kg",
        }),
        dimensions: joi_1.default.object({
            length: joi_1.default.number().min(0.1).max(1000).precision(2).optional(),
            width: joi_1.default.number().min(0.1).max(1000).precision(2).optional(),
            height: joi_1.default.number().min(0.1).max(1000).precision(2).optional(),
        }).optional(),
        isActive: joi_1.default.boolean().optional().default(true),
        isFeatured: joi_1.default.boolean().optional().default(false),
        seoTitle: joi_1.default.string().max(160).optional().allow("").messages({
            "string.max": "SEO title must not exceed 160 characters",
        }),
        seoDescription: joi_1.default.string().max(320).optional().allow("").messages({
            "string.max": "SEO description must not exceed 320 characters",
        }),
        // Inventory data
        inventory: joi_1.default.object({
            quantity: joi_1.default.number().integer().min(0).required().messages({
                "number.integer": "Inventory quantity must be a whole number",
                "number.min": "Inventory quantity must be non-negative",
                "any.required": "Initial inventory quantity is required",
            }),
            lowStockThreshold: joi_1.default.number()
                .integer()
                .min(0)
                .optional()
                .default(10)
                .messages({
                "number.integer": "Low stock threshold must be a whole number",
                "number.min": "Low stock threshold must be non-negative",
            }),
            trackInventory: joi_1.default.boolean().optional().default(true),
        }).required(),
        // Images
        images: joi_1.default.array()
            .items(joi_1.default.object({
            imageUrl: joi_1.default.string().uri().required(),
            altText: joi_1.default.string().max(200).optional().allow(""),
            isPrimary: joi_1.default.boolean().optional().default(false),
        }))
            .max(10)
            .optional()
            .messages({
            "array.max": "Maximum 10 images allowed per product",
        }),
    }),
    /**
     * Update product schema
     */
    updateProduct: joi_1.default.object({
        name: joi_1.default.string().min(2).max(200).optional(),
        description: joi_1.default.string().max(5000).optional().allow(""),
        shortDescription: joi_1.default.string().max(500).optional().allow(""),
        sku: joi_1.default.string()
            .pattern(/^[A-Z]{3,6}[0-9]{6,12}$/)
            .optional(),
        price: joi_1.default.number().min(1).max(100000000).precision(2).optional(),
        comparePrice: joi_1.default.number().min(0).max(100000000).precision(2).optional(),
        costPrice: joi_1.default.number().min(0).precision(2).optional(),
        categoryId: joi_1.default.string().uuid().optional(),
        brand: joi_1.default.string().max(100).optional().allow(""),
        weight: joi_1.default.number().min(0.001).max(1000).precision(3).optional(),
        dimensions: joi_1.default.object({
            length: joi_1.default.number().min(0.1).max(1000).precision(2).optional(),
            width: joi_1.default.number().min(0.1).max(1000).precision(2).optional(),
            height: joi_1.default.number().min(0.1).max(1000).precision(2).optional(),
        }).optional(),
        isActive: joi_1.default.boolean().optional(),
        isFeatured: joi_1.default.boolean().optional(),
        seoTitle: joi_1.default.string().max(160).optional().allow(""),
        seoDescription: joi_1.default.string().max(320).optional().allow(""),
    }),
    /**
     * Product query parameters schema
     */
    productQuery: joi_1.default.object({
        page: joi_1.default.number().integer().min(1).optional().default(1),
        limit: joi_1.default.number().integer().min(1).max(100).optional().default(20),
        sortBy: joi_1.default.string()
            .valid("name", "price", "rating", "created", "popularity", "discount")
            .optional()
            .default("created"),
        sortOrder: joi_1.default.string().valid("asc", "desc").optional().default("desc"),
        categoryId: joi_1.default.string().uuid().optional(),
        categorySlug: joi_1.default.string().optional(),
        brand: joi_1.default.string().optional(),
        priceMin: joi_1.default.number().min(0).optional(),
        priceMax: joi_1.default.number().min(joi_1.default.ref("priceMin")).optional(),
        isActive: joi_1.default.boolean().optional(),
        isFeatured: joi_1.default.boolean().optional(),
        inStock: joi_1.default.boolean().optional(),
        hasDiscount: joi_1.default.boolean().optional(),
        rating: joi_1.default.number().min(1).max(5).optional(),
        search: joi_1.default.string().max(100).optional().allow(""),
        availability: joi_1.default.string()
            .valid("all", "in_stock", "out_of_stock", "low_stock")
            .optional()
            .default("all"),
    }),
    /**
     * Product search schema
     */
    productSearch: joi_1.default.object({
        query: joi_1.default.string().min(1).max(100).required().messages({
            "string.min": "Search query must be at least 1 character",
            "string.max": "Search query must not exceed 100 characters",
            "any.required": "Search query is required",
        }),
        page: joi_1.default.number().integer().min(1).optional().default(1),
        limit: joi_1.default.number().integer().min(1).max(50).optional().default(20),
        categoryId: joi_1.default.string().uuid().optional(),
        filters: joi_1.default.object({
            brand: joi_1.default.array().items(joi_1.default.string()).optional(),
            priceRange: joi_1.default.object({
                min: joi_1.default.number().min(0).required(),
                max: joi_1.default.number().min(joi_1.default.ref("min")).required(),
            }).optional(),
            rating: joi_1.default.number().min(1).max(5).optional(),
            availability: joi_1.default.string()
                .valid("all", "in_stock", "out_of_stock")
                .optional()
                .default("all"),
            hasDiscount: joi_1.default.boolean().optional(),
            isFeatured: joi_1.default.boolean().optional(),
        }).optional(),
        sortBy: joi_1.default.string()
            .valid("relevance", "price_asc", "price_desc", "rating", "newest", "popularity")
            .optional()
            .default("relevance"),
    }),
};
/**
 * Category validation schemas
 */
exports.categorySchemas = {
    /**
     * Create category schema
     */
    createCategory: joi_1.default.object({
        name: joi_1.default.string().min(2).max(100).required().messages({
            "string.min": "Category name must be at least 2 characters",
            "string.max": "Category name must not exceed 100 characters",
            "any.required": "Category name is required",
        }),
        description: joi_1.default.string().max(1000).optional().allow("").messages({
            "string.max": "Description must not exceed 1000 characters",
        }),
        parentId: joi_1.default.string().uuid().optional().messages({
            "string.uuid": "Parent category ID must be a valid UUID",
        }),
        isActive: joi_1.default.boolean().optional().default(true),
        sortOrder: joi_1.default.number().integer().min(0).optional().default(0).messages({
            "number.integer": "Sort order must be a whole number",
            "number.min": "Sort order must be non-negative",
        }),
        imageUrl: joi_1.default.string().uri().optional().allow("").messages({
            "string.uri": "Image URL must be a valid URL",
        }),
        seoTitle: joi_1.default.string().max(160).optional().allow("").messages({
            "string.max": "SEO title must not exceed 160 characters",
        }),
        seoDescription: joi_1.default.string().max(320).optional().allow("").messages({
            "string.max": "SEO description must not exceed 320 characters",
        }),
    }),
    /**
     * Update category schema
     */
    updateCategory: joi_1.default.object({
        name: joi_1.default.string().min(2).max(100).optional(),
        description: joi_1.default.string().max(1000).optional().allow(""),
        parentId: joi_1.default.string().uuid().optional().allow(null),
        isActive: joi_1.default.boolean().optional(),
        sortOrder: joi_1.default.number().integer().min(0).optional(),
        imageUrl: joi_1.default.string().uri().optional().allow(""),
        seoTitle: joi_1.default.string().max(160).optional().allow(""),
        seoDescription: joi_1.default.string().max(320).optional().allow(""),
    }),
    /**
     * Category query parameters schema
     */
    categoryQuery: joi_1.default.object({
        page: joi_1.default.number().integer().min(1).optional().default(1),
        limit: joi_1.default.number().integer().min(1).max(100).optional().default(20),
        parentId: joi_1.default.string().uuid().optional(),
        isActive: joi_1.default.boolean().optional(),
        hasProducts: joi_1.default.boolean().optional(),
        sortBy: joi_1.default.string()
            .valid("name", "sortOrder", "productCount", "created")
            .optional()
            .default("sortOrder"),
        sortOrder: joi_1.default.string().valid("asc", "desc").optional().default("asc"),
    }),
};
/**
 * Product review validation schemas
 */
exports.reviewSchemas = {
    /**
     * Create review schema
     */
    createReview: joi_1.default.object({
        productId: joi_1.default.string().uuid().required().messages({
            "string.uuid": "Product ID must be a valid UUID",
            "any.required": "Product ID is required",
        }),
        rating: joi_1.default.number().integer().min(1).max(5).required().messages({
            "number.integer": "Rating must be a whole number",
            "number.min": "Rating must be at least 1 star",
            "number.max": "Rating must not exceed 5 stars",
            "any.required": "Rating is required",
        }),
        title: joi_1.default.string().max(200).optional().allow("").messages({
            "string.max": "Review title must not exceed 200 characters",
        }),
        comment: joi_1.default.string().max(2000).optional().allow("").messages({
            "string.max": "Review comment must not exceed 2000 characters",
        }),
    }),
    /**
     * Update review schema
     */
    updateReview: joi_1.default.object({
        rating: joi_1.default.number().integer().min(1).max(5).optional(),
        title: joi_1.default.string().max(200).optional().allow(""),
        comment: joi_1.default.string().max(2000).optional().allow(""),
    }),
    /**
     * Review query parameters schema
     */
    reviewQuery: joi_1.default.object({
        page: joi_1.default.number().integer().min(1).optional().default(1),
        limit: joi_1.default.number().integer().min(1).max(50).optional().default(20),
        productId: joi_1.default.string().uuid().optional(),
        userId: joi_1.default.string().uuid().optional(),
        rating: joi_1.default.number().integer().min(1).max(5).optional(),
        isVerified: joi_1.default.boolean().optional(),
        isApproved: joi_1.default.boolean().optional(),
        sortBy: joi_1.default.string()
            .valid("rating", "helpful", "created")
            .optional()
            .default("created"),
        sortOrder: joi_1.default.string().valid("asc", "desc").optional().default("desc"),
    }),
};
exports.default = {
    productSchemas: exports.productSchemas,
    categorySchemas: exports.categorySchemas,
    reviewSchemas: exports.reviewSchemas,
};
//# sourceMappingURL=productSchemas.js.map