import Joi from "joi";
import { NIGERIAN_STATES } from "../../../types/common.types";

/**
 * Product validation schemas
 */
export const productSchemas = {
  /**
   * Create product schema
   */
  createProduct: Joi.object({
    name: Joi.string().min(2).max(200).required().messages({
      "string.min": "Product name must be at least 2 characters",
      "string.max": "Product name must not exceed 200 characters",
      "any.required": "Product name is required",
    }),

    description: Joi.string().max(5000).optional().allow("").messages({
      "string.max": "Description must not exceed 5000 characters",
    }),

    shortDescription: Joi.string().max(500).optional().allow("").messages({
      "string.max": "Short description must not exceed 500 characters",
    }),

    sku: Joi.string()
      .pattern(/^[A-Z]{3,6}[0-9]{6,12}$/)
      .required()
      .messages({
        "string.pattern.base":
          "SKU must be 3-6 letters followed by 6-12 digits",
        "any.required": "SKU is required",
      }),

    price: Joi.number().min(1).max(100000000).precision(2).required().messages({
      "number.min": "Price must be at least ₦0.01",
      "number.max": "Price must not exceed ₦1,000,000",
      "any.required": "Price is required",
    }),

    comparePrice: Joi.number()
      .min(Joi.ref("price"))
      .max(100000000)
      .precision(2)
      .optional()
      .messages({
        "number.min":
          "Compare price must be greater than or equal to selling price",
        "number.max": "Compare price must not exceed ₦1,000,000",
      }),

    costPrice: Joi.number()
      .min(0)
      .max(Joi.ref("price"))
      .precision(2)
      .optional()
      .messages({
        "number.min": "Cost price must be non-negative",
        "number.max": "Cost price must not exceed selling price",
      }),

    categoryId: Joi.string().uuid().required().messages({
      "string.uuid": "Category ID must be a valid UUID",
      "any.required": "Category is required",
    }),

    brand: Joi.string().max(100).optional().allow("").messages({
      "string.max": "Brand must not exceed 100 characters",
    }),

    weight: Joi.number().min(0.001).max(1000).precision(3).optional().messages({
      "number.min": "Weight must be at least 0.001 kg",
      "number.max": "Weight must not exceed 1000 kg",
    }),

    dimensions: Joi.object({
      length: Joi.number().min(0.1).max(1000).precision(2).optional(),
      width: Joi.number().min(0.1).max(1000).precision(2).optional(),
      height: Joi.number().min(0.1).max(1000).precision(2).optional(),
    }).optional(),

    isActive: Joi.boolean().optional().default(true),
    isFeatured: Joi.boolean().optional().default(false),

    seoTitle: Joi.string().max(160).optional().allow("").messages({
      "string.max": "SEO title must not exceed 160 characters",
    }),

    seoDescription: Joi.string().max(320).optional().allow("").messages({
      "string.max": "SEO description must not exceed 320 characters",
    }),

    // Inventory data
    inventory: Joi.object({
      quantity: Joi.number().integer().min(0).required().messages({
        "number.integer": "Inventory quantity must be a whole number",
        "number.min": "Inventory quantity must be non-negative",
        "any.required": "Initial inventory quantity is required",
      }),

      lowStockThreshold: Joi.number()
        .integer()
        .min(0)
        .optional()
        .default(10)
        .messages({
          "number.integer": "Low stock threshold must be a whole number",
          "number.min": "Low stock threshold must be non-negative",
        }),

      trackInventory: Joi.boolean().optional().default(true),
    }).required(),

    // Images
    images: Joi.array()
      .items(
        Joi.object({
          imageUrl: Joi.string().uri().required(),
          altText: Joi.string().max(200).optional().allow(""),
          isPrimary: Joi.boolean().optional().default(false),
        })
      )
      .max(10)
      .optional()
      .messages({
        "array.max": "Maximum 10 images allowed per product",
      }),
  }),

  /**
   * Update product schema
   */
  updateProduct: Joi.object({
    name: Joi.string().min(2).max(200).optional(),
    description: Joi.string().max(5000).optional().allow(""),
    shortDescription: Joi.string().max(500).optional().allow(""),
    sku: Joi.string()
      .pattern(/^[A-Z]{3,6}[0-9]{6,12}$/)
      .optional(),
    price: Joi.number().min(1).max(100000000).precision(2).optional(),
    comparePrice: Joi.number().min(0).max(100000000).precision(2).optional(),
    costPrice: Joi.number().min(0).precision(2).optional(),
    categoryId: Joi.string().uuid().optional(),
    brand: Joi.string().max(100).optional().allow(""),
    weight: Joi.number().min(0.001).max(1000).precision(3).optional(),
    dimensions: Joi.object({
      length: Joi.number().min(0.1).max(1000).precision(2).optional(),
      width: Joi.number().min(0.1).max(1000).precision(2).optional(),
      height: Joi.number().min(0.1).max(1000).precision(2).optional(),
    }).optional(),
    isActive: Joi.boolean().optional(),
    isFeatured: Joi.boolean().optional(),
    seoTitle: Joi.string().max(160).optional().allow(""),
    seoDescription: Joi.string().max(320).optional().allow(""),
  }),

  /**
   * Product query parameters schema
   */
  productQuery: Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
    sortBy: Joi.string()
      .valid("name", "price", "rating", "created", "popularity", "discount")
      .optional()
      .default("created"),
    sortOrder: Joi.string().valid("asc", "desc").optional().default("desc"),
    categoryId: Joi.string().uuid().optional(),
    categorySlug: Joi.string().optional(),
    brand: Joi.string().optional(),
    priceMin: Joi.number().min(0).optional(),
    priceMax: Joi.number().min(Joi.ref("priceMin")).optional(),
    isActive: Joi.boolean().optional(),
    isFeatured: Joi.boolean().optional(),
    inStock: Joi.boolean().optional(),
    hasDiscount: Joi.boolean().optional(),
    rating: Joi.number().min(1).max(5).optional(),
    search: Joi.string().max(100).optional().allow(""),
    availability: Joi.string()
      .valid("all", "in_stock", "out_of_stock", "low_stock")
      .optional()
      .default("all"),
  }),

  /**
   * Product search schema
   */
  productSearch: Joi.object({
    query: Joi.string().min(1).max(100).required().messages({
      "string.min": "Search query must be at least 1 character",
      "string.max": "Search query must not exceed 100 characters",
      "any.required": "Search query is required",
    }),
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(50).optional().default(20),
    categoryId: Joi.string().uuid().optional(),
    filters: Joi.object({
      brand: Joi.array().items(Joi.string()).optional(),
      priceRange: Joi.object({
        min: Joi.number().min(0).required(),
        max: Joi.number().min(Joi.ref("min")).required(),
      }).optional(),
      rating: Joi.number().min(1).max(5).optional(),
      availability: Joi.string()
        .valid("all", "in_stock", "out_of_stock")
        .optional()
        .default("all"),
      hasDiscount: Joi.boolean().optional(),
      isFeatured: Joi.boolean().optional(),
    }).optional(),
    sortBy: Joi.string()
      .valid(
        "relevance",
        "price_asc",
        "price_desc",
        "rating",
        "newest",
        "popularity"
      )
      .optional()
      .default("relevance"),
  }),
};

/**
 * Category validation schemas
 */
export const categorySchemas = {
  /**
   * Create category schema
   */
  createCategory: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      "string.min": "Category name must be at least 2 characters",
      "string.max": "Category name must not exceed 100 characters",
      "any.required": "Category name is required",
    }),

    description: Joi.string().max(1000).optional().allow("").messages({
      "string.max": "Description must not exceed 1000 characters",
    }),

    parentId: Joi.string().uuid().optional().messages({
      "string.uuid": "Parent category ID must be a valid UUID",
    }),

    isActive: Joi.boolean().optional().default(true),

    sortOrder: Joi.number().integer().min(0).optional().default(0).messages({
      "number.integer": "Sort order must be a whole number",
      "number.min": "Sort order must be non-negative",
    }),

    imageUrl: Joi.string().uri().optional().allow("").messages({
      "string.uri": "Image URL must be a valid URL",
    }),

    seoTitle: Joi.string().max(160).optional().allow("").messages({
      "string.max": "SEO title must not exceed 160 characters",
    }),

    seoDescription: Joi.string().max(320).optional().allow("").messages({
      "string.max": "SEO description must not exceed 320 characters",
    }),
  }),

  /**
   * Update category schema
   */
  updateCategory: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(1000).optional().allow(""),
    parentId: Joi.string().uuid().optional().allow(null),
    isActive: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional(),
    imageUrl: Joi.string().uri().optional().allow(""),
    seoTitle: Joi.string().max(160).optional().allow(""),
    seoDescription: Joi.string().max(320).optional().allow(""),
  }),

  /**
   * Category query parameters schema
   */
  categoryQuery: Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
    parentId: Joi.string().uuid().optional(),
    isActive: Joi.boolean().optional(),
    hasProducts: Joi.boolean().optional(),
    sortBy: Joi.string()
      .valid("name", "sortOrder", "productCount", "created")
      .optional()
      .default("sortOrder"),
    sortOrder: Joi.string().valid("asc", "desc").optional().default("asc"),
  }),
};

/**
 * Product review validation schemas
 */
export const reviewSchemas = {
  /**
   * Create review schema
   */
  createReview: Joi.object({
    productId: Joi.string().uuid().required().messages({
      "string.uuid": "Product ID must be a valid UUID",
      "any.required": "Product ID is required",
    }),

    rating: Joi.number().integer().min(1).max(5).required().messages({
      "number.integer": "Rating must be a whole number",
      "number.min": "Rating must be at least 1 star",
      "number.max": "Rating must not exceed 5 stars",
      "any.required": "Rating is required",
    }),

    title: Joi.string().max(200).optional().allow("").messages({
      "string.max": "Review title must not exceed 200 characters",
    }),

    comment: Joi.string().max(2000).optional().allow("").messages({
      "string.max": "Review comment must not exceed 2000 characters",
    }),
  }),

  /**
   * Update review schema
   */
  updateReview: Joi.object({
    rating: Joi.number().integer().min(1).max(5).optional(),
    title: Joi.string().max(200).optional().allow(""),
    comment: Joi.string().max(2000).optional().allow(""),
  }),

  /**
   * Review query parameters schema
   */
  reviewQuery: Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(50).optional().default(20),
    productId: Joi.string().uuid().optional(),
    userId: Joi.string().uuid().optional(),
    rating: Joi.number().integer().min(1).max(5).optional(),
    isVerified: Joi.boolean().optional(),
    isApproved: Joi.boolean().optional(),
    sortBy: Joi.string()
      .valid("rating", "helpful", "created")
      .optional()
      .default("created"),
    sortOrder: Joi.string().valid("asc", "desc").optional().default("desc"),
  }),
};

export default {
  productSchemas,
  categorySchemas,
  reviewSchemas,
};
