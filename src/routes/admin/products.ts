/**
 * Admin Product Management Routes
 * 
 * Comprehensive product management for Nigerian e-commerce platform:
 * - Full CRUD operations with Nigerian business context
 * - Multi-currency support (Naira/Kobo conversion)
 * - Bulk operations for efficiency
 * - Advanced filtering and search
 * - Product analytics and statistics
 * - Admin activity logging
 * 
 * All routes require admin authentication and proper authorization
 */

import { Router } from "express";
import { AdminProductController } from "../../controllers/admin/AdminProductController";
import { validateRequest } from "../../middleware/validation/validateRequest";
import { rateLimiter } from "../../middleware/security/rateLimiter";
import Joi from "joi";

const router = Router();
const adminProductController = new AdminProductController();

/**
 * Validation schemas for admin product operations
 */
const productSchemas = {
  createProduct: Joi.object({
    name: Joi.string().min(2).max(200).required().messages({
      'string.min': 'Product name must be at least 2 characters',
      'string.max': 'Product name must not exceed 200 characters',
      'any.required': 'Product name is required'
    }),
    
    description: Joi.string().max(2000).optional().allow('').messages({
      'string.max': 'Description must not exceed 2000 characters'
    }),
    
    price: Joi.number().min(0).precision(2).required().messages({
      'number.min': 'Price must be non-negative',
      'any.required': 'Price is required'
    }),
    
    costPrice: Joi.number().min(0).precision(2).optional().messages({
      'number.min': 'Cost price must be non-negative'
    }),
    
    sku: Joi.string().max(100).optional().messages({
      'string.max': 'SKU must not exceed 100 characters'
    }),
    
    categoryId: Joi.string().required().messages({
      'any.required': 'Category ID is required'
    }),
    
    stock: Joi.number().integer().min(0).optional().default(0).messages({
      'number.integer': 'Stock must be a whole number',
      'number.min': 'Stock must be non-negative'
    }),
    
    lowStockThreshold: Joi.number().integer().min(0).optional().default(10).messages({
      'number.integer': 'Low stock threshold must be a whole number',
      'number.min': 'Low stock threshold must be non-negative'
    }),
    
    trackQuantity: Joi.boolean().optional().default(true),
    
    weight: Joi.number().min(0).precision(2).optional().messages({
      'number.min': 'Weight must be non-negative'
    }),
    
    dimensions: Joi.string().max(100).optional().messages({
      'string.max': 'Dimensions must not exceed 100 characters'
    }),
    
    isActive: Joi.boolean().optional().default(true),
    
    isFeatured: Joi.boolean().optional().default(false),
    
    tags: Joi.array().items(Joi.string()).optional(),
    
    images: Joi.array().items(Joi.string().uri()).optional(),
    
    metadata: Joi.object().optional()
  }),
  
  updateProduct: Joi.object({
    name: Joi.string().min(2).max(200).optional(),
    description: Joi.string().max(2000).optional().allow(''),
    price: Joi.number().min(0).precision(2).optional(),
    costPrice: Joi.number().min(0).precision(2).optional(),
    sku: Joi.string().max(100).optional(),
    categoryId: Joi.string().optional(),
    stock: Joi.number().integer().min(0).optional(),
    lowStockThreshold: Joi.number().integer().min(0).optional(),
    trackQuantity: Joi.boolean().optional(),
    weight: Joi.number().min(0).precision(2).optional(),
    dimensions: Joi.string().max(100).optional(),
    isActive: Joi.boolean().optional(),
    isFeatured: Joi.boolean().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    images: Joi.array().items(Joi.string().uri()).optional(),
    metadata: Joi.object().optional()
  }),
  
  bulkAction: Joi.object({
    action: Joi.string().valid('activate', 'deactivate', 'feature', 'unfeature', 'update', 'delete').required().messages({
      'any.only': 'Action must be one of: activate, deactivate, feature, unfeature, update, delete',
      'any.required': 'Action is required'
    }),
    
    productIds: Joi.array().items(Joi.string()).min(1).max(100).required().messages({
      'array.min': 'At least 1 product ID is required',
      'array.max': 'Maximum 100 products allowed per bulk action',
      'any.required': 'Product IDs are required'
    }),
    
    data: Joi.object().optional() // For bulk updates
  }),
  
  queryProducts: Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
    search: Joi.string().max(200).optional(),
    categoryId: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
    isFeatured: Joi.boolean().optional(),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    sortBy: Joi.string().valid('name', 'price', 'stock', 'createdAt', 'updatedAt').optional().default('updatedAt'),
    sortOrder: Joi.string().valid('asc', 'desc').optional().default('desc')
  })
};

/**
 * @route   GET /api/admin/products
 * @desc    Get paginated products list with filtering and search
 * @access  Admin, Super Admin
 * @rateLimit Standard admin limits
 * 
 * @query {
 *   page?: number,
 *   limit?: number,
 *   search?: string,
 *   categoryId?: string,
 *   isActive?: boolean,
 *   isFeatured?: boolean,
 *   minPrice?: number,
 *   maxPrice?: number,
 *   sortBy?: 'name' | 'price' | 'stock' | 'createdAt' | 'updatedAt',
 *   sortOrder?: 'asc' | 'desc'
 * }
 */
router.get(
  "/",
  rateLimiter.admin,
  (req, res, next) => {
    // Manual validation for query parameters
    const { error } = productSchemas.queryProducts.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        error: { code: "VALIDATION_ERROR" },
        details: error.details.map(d => d.message)
      });
    }
    next();
  },
  adminProductController.getProducts
);

/**
 * @route   GET /api/admin/products/statistics
 * @desc    Get comprehensive product statistics and analytics
 * @access  Admin, Super Admin
 * @rateLimit Standard admin limits
 */
router.get(
  "/statistics", 
  rateLimiter.admin,
  adminProductController.getProductStatistics
);

/**
 * @route   GET /api/admin/products/:id
 * @desc    Get detailed information about a specific product
 * @access  Admin, Super Admin
 * @rateLimit Standard admin limits
 * 
 * @params {
 *   id: string (UUID) - Product ID
 * }
 */
router.get(
  "/:id",
  rateLimiter.admin,
  adminProductController.getProduct
);

/**
 * @route   POST /api/admin/products
 * @desc    Create a new product with full Nigerian e-commerce features
 * @access  Admin, Super Admin
 * @rateLimit Standard admin limits
 * 
 * @body {
 *   name: string (required) - Product name,
 *   description?: string - Product description,
 *   price: number (required) - Price in Naira,
 *   costPrice?: number - Cost price in Naira,
 *   sku?: string - Stock keeping unit,
 *   categoryId: string (required) - Category UUID,
 *   stock?: number - Initial stock quantity,
 *   lowStockThreshold?: number - Low stock alert threshold,
 *   trackQuantity?: boolean - Whether to track inventory,
 *   weight?: number - Product weight in grams,
 *   dimensions?: string - Product dimensions,
 *   isActive?: boolean - Whether product is active,
 *   isFeatured?: boolean - Whether product is featured,
 *   tags?: string[] - Product tags,
 *   images?: string[] - Image URLs,
 *   metadata?: object - Additional metadata
 * }
 */
router.post(
  "/",
  rateLimiter.admin,
  (req, res, next) => {
    const { error } = productSchemas.createProduct.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid product data",
        error: { code: "VALIDATION_ERROR" },
        details: error.details.map(d => d.message)
      });
    }
    next();
  },
  adminProductController.createProduct
);

/**
 * @route   PUT /api/admin/products/:id
 * @desc    Update an existing product with Nigerian business context
 * @access  Admin, Super Admin
 * @rateLimit Standard admin limits
 * 
 * @params {
 *   id: string (UUID) - Product ID
 * }
 * 
 * @body {
 *   name?: string - Product name,
 *   description?: string - Product description,
 *   price?: number - Price in Naira,
 *   costPrice?: number - Cost price in Naira,
 *   sku?: string - Stock keeping unit,
 *   categoryId?: string - Category UUID,
 *   stock?: number - Stock quantity,
 *   lowStockThreshold?: number - Low stock threshold,
 *   trackQuantity?: boolean - Track inventory flag,
 *   weight?: number - Product weight,
 *   dimensions?: string - Product dimensions,
 *   isActive?: boolean - Active status,
 *   isFeatured?: boolean - Featured status,
 *   tags?: string[] - Product tags,
 *   images?: string[] - Image URLs,
 *   metadata?: object - Additional metadata
 * }
 */
router.put(
  "/:id",
  rateLimiter.admin,
  (req, res, next) => {
    const { error } = productSchemas.updateProduct.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid update data",
        error: { code: "VALIDATION_ERROR" },
        details: error.details.map(d => d.message)
      });
    }
    next();
  },
  adminProductController.updateProduct
);

/**
 * @route   DELETE /api/admin/products/:id
 * @desc    Soft delete a product (deactivate)
 * @access  Admin, Super Admin
 * @rateLimit Stricter limits for deletion
 * 
 * @params {
 *   id: string (UUID) - Product ID
 * }
 */
router.delete(
  "/:id",
  rateLimiter.admin,
  adminProductController.deleteProduct
);

/**
 * @route   POST /api/admin/products/bulk
 * @desc    Perform bulk operations on multiple products
 * @access  Admin, Super Admin
 * @rateLimit Stricter limits for bulk operations
 * 
 * @body {
 *   action: 'activate' | 'deactivate' | 'feature' | 'unfeature' | 'update' | 'delete',
 *   productIds: string[] - Array of product UUIDs (max 100),
 *   data?: object - Additional data for bulk updates
 * }
 */
router.post(
  "/bulk",
  rateLimiter.admin,
  (req, res, next) => {
    const { error } = productSchemas.bulkAction.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid bulk action data",
        error: { code: "VALIDATION_ERROR" },
        details: error.details.map(d => d.message)
      });
    }
    next();
  },
  adminProductController.bulkProductActions
);

/**
 * @route   POST /api/admin/products/fix-prices
 * @desc    TEMPORARY: Fix inflated currency values in existing products
 * @access  Super Admin
 * @rateLimit Stricter limits for system operations
 */
router.post(
  "/fix-prices",
  rateLimiter.admin,
  adminProductController.fixInflatedPrices
);

export default router;

/**
 * Admin Product Management API Documentation
 * 
 * ## Features:
 * - Complete CRUD operations for product management
 * - Advanced filtering and search with Nigerian context
 * - Bulk operations for efficient management
 * - Real-time statistics and analytics
 * - Multi-currency support (Naira/Kobo)
 * - Nigerian business hours integration
 * - Comprehensive activity logging
 * - Role-based access control
 * 
 * ## Nigerian Market Specific Features:
 * - Naira currency formatting with kobo support
 * - Nigerian business hours context
 * - Lagos timezone integration
 * - Nigerian e-commerce compliance
 * - Local market pricing considerations
 * 
 * ## Security Features:
 * - JWT authentication required
 * - Role-based authorization (Admin/Super Admin)
 * - Rate limiting per endpoint type
 * - Input validation and sanitization
 * - Admin activity audit logging
 * - Bulk operation limits and monitoring
 * 
 * ## Response Format:
 * All responses follow the standard admin API format:
 * ```json
 * {
 *   "success": boolean,
 *   "message": string,
 *   "data": object,
 *   "meta": {
 *     "timestamp": string,
 *     "requestId": string,
 *     "admin": object,
 *     "activity": string,
 *     "currency": object
 *   }
 * }
 * ```
 * 
 * ## Error Codes:
 * - INVALID_ID: Invalid product UUID format
 * - PRODUCT_NOT_FOUND: Product does not exist
 * - VALIDATION_ERROR: Request validation failed
 * - UNAUTHORIZED: Insufficient permissions
 * - RATE_LIMIT_EXCEEDED: Too many requests
 * - DATABASE_ERROR: Database operation failed
 */