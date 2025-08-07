import Joi from "joi";

/**
 * Admin validation schemas for Bareloft platform
 */

/**
 * Inventory management schemas
 */
export const inventorySchemas = {
  /**
   * Update inventory schema
   */
  updateInventory: Joi.object({
    productId: Joi.string().uuid().required().messages({
      "string.uuid": "Product ID must be a valid UUID",
      "any.required": "Product ID is required",
    }),

    quantity: Joi.number().integer().min(0).optional().messages({
      "number.integer": "Quantity must be a whole number",
      "number.min": "Quantity must be non-negative",
    }),

    lowStockThreshold: Joi.number().integer().min(0).optional().messages({
      "number.integer": "Low stock threshold must be a whole number",
      "number.min": "Low stock threshold must be non-negative",
    }),

    reorderPoint: Joi.number().integer().min(0).optional().messages({
      "number.integer": "Reorder point must be a whole number",
      "number.min": "Reorder point must be non-negative",
    }),

    reorderQuantity: Joi.number().integer().min(1).optional().messages({
      "number.integer": "Reorder quantity must be a whole number",
      "number.min": "Reorder quantity must be at least 1",
    }),

    allowBackorder: Joi.boolean().optional(),

    reason: Joi.string().max(500).optional().allow("").messages({
      "string.max": "Reason must not exceed 500 characters",
    }),

    notes: Joi.string().max(1000).optional().allow("").messages({
      "string.max": "Notes must not exceed 1000 characters",
    }),
  }),

  /**
   * Bulk inventory update schema
   */
  bulkInventoryUpdate: Joi.object({
    updates: Joi.array()
      .items(
        Joi.object({
          productId: Joi.string().uuid().required(),
          quantity: Joi.number().integer().min(0).required(),
          reason: Joi.string().max(200).optional().allow(""),
        })
      )
      .min(1)
      .max(100)
      .required()
      .messages({
        "array.min": "At least 1 update is required",
        "array.max": "Maximum 100 updates allowed per batch",
      }),

    batchReason: Joi.string().max(500).optional().allow("").messages({
      "string.max": "Batch reason must not exceed 500 characters",
    }),

    notes: Joi.string().max(1000).optional().allow("").messages({
      "string.max": "Notes must not exceed 1000 characters",
    }),
  }),

  /**
   * Inventory adjustment schema
   */
  inventoryAdjustment: Joi.object({
    productId: Joi.string().uuid().required().messages({
      "string.uuid": "Product ID must be a valid UUID",
      "any.required": "Product ID is required",
    }),

    adjustmentType: Joi.string()
      .valid("set", "increase", "decrease")
      .required()
      .messages({
        "any.only": "Adjustment type must be one of: set, increase, decrease",
        "any.required": "Adjustment type is required",
      }),

    quantity: Joi.number().integer().min(0).required().messages({
      "number.integer": "Quantity must be a whole number",
      "number.min": "Quantity must be non-negative",
      "any.required": "Quantity is required",
    }),

    reason: Joi.string().max(500).required().messages({
      "string.max": "Reason must not exceed 500 characters",
      "any.required": "Reason is required",
    }),

    notes: Joi.string().max(1000).optional().allow("").messages({
      "string.max": "Notes must not exceed 1000 characters",
    }),

    unitCost: Joi.number().min(0).precision(2).optional().messages({
      "number.min": "Unit cost must be non-negative",
    }),
  }),

  /**
   * Low stock report query schema
   */
  lowStockQuery: Joi.object({
    threshold: Joi.number().integer().min(0).optional().default(10).messages({
      "number.integer": "Threshold must be a whole number",
      "number.min": "Threshold must be non-negative",
    }),

    categoryId: Joi.string().uuid().optional().messages({
      "string.uuid": "Category ID must be a valid UUID",
    }),

    includeOutOfStock: Joi.boolean().optional().default(true),
  }),

  /**
   * Stock reservation schema
   */
  stockReservation: Joi.object({
    productId: Joi.string().uuid().required().messages({
      "string.uuid": "Product ID must be a valid UUID",
      "any.required": "Product ID is required",
    }),

    quantity: Joi.number().integer().min(1).required().messages({
      "number.integer": "Quantity must be a whole number",
      "number.min": "Quantity must be at least 1",
      "any.required": "Quantity is required",
    }),

    orderId: Joi.string().uuid().optional().messages({
      "string.uuid": "Order ID must be a valid UUID",
    }),

    cartId: Joi.string().uuid().optional().messages({
      "string.uuid": "Cart ID must be a valid UUID",
    }),

    reason: Joi.string().max(500).required().messages({
      "string.max": "Reason must not exceed 500 characters",
      "any.required": "Reason is required",
    }),

    expirationMinutes: Joi.number().integer().min(1).max(1440).optional().default(15).messages({
      "number.integer": "Expiration minutes must be a whole number",
      "number.min": "Expiration must be at least 1 minute",
      "number.max": "Expiration cannot exceed 24 hours (1440 minutes)",
    }),
  }),

  /**
   * Release stock reservation schema
   */
  releaseReservation: Joi.object({
    reservationId: Joi.string().uuid().optional().messages({
      "string.uuid": "Reservation ID must be a valid UUID",
    }),

    orderId: Joi.string().uuid().optional().messages({
      "string.uuid": "Order ID must be a valid UUID",
    }),

    cartId: Joi.string().uuid().optional().messages({
      "string.uuid": "Cart ID must be a valid UUID",
    }),

    reason: Joi.string().max(500).optional().allow("").messages({
      "string.max": "Reason must not exceed 500 characters",
    }),
  }).or('reservationId', 'orderId', 'cartId').messages({
    "object.missing": "At least one of reservationId, orderId, or cartId must be provided",
  }),

  /**
   * Inventory movement query schema
   */
  inventoryMovementQuery: Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(50),
    
    productId: Joi.string().uuid().optional().messages({
      "string.uuid": "Product ID must be a valid UUID",
    }),

    type: Joi.string().valid(
      "IN", "OUT", "ADJUSTMENT", "SALE", "RESTOCK", "RETURN", 
      "TRANSFER_IN", "TRANSFER_OUT", "DAMAGE", "THEFT", "EXPIRED", 
      "RESERVE", "RELEASE_RESERVE"
    ).optional(),

    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().min(Joi.ref("dateFrom")).optional().messages({
      "date.min": "End date must be after start date",
    }),

    createdBy: Joi.string().uuid().optional().messages({
      "string.uuid": "Created by must be a valid user UUID",
    }),
  }),

  /**
   * Bulk stock reservation schema
   */
  bulkStockReservation: Joi.object({
    items: Joi.array()
      .items(
        Joi.object({
          productId: Joi.string().uuid().required(),
          quantity: Joi.number().integer().min(1).required(),
        })
      )
      .min(1)
      .max(50)
      .required()
      .messages({
        "array.min": "At least 1 item is required",
        "array.max": "Maximum 50 items allowed per bulk reservation",
      }),

    orderId: Joi.string().uuid().optional().messages({
      "string.uuid": "Order ID must be a valid UUID",
    }),

    cartId: Joi.string().uuid().optional().messages({
      "string.uuid": "Cart ID must be a valid UUID",
    }),

    reason: Joi.string().max(500).required().messages({
      "string.max": "Reason must not exceed 500 characters",
      "any.required": "Reason is required",
    }),

    expirationMinutes: Joi.number().integer().min(1).max(1440).optional().default(15).messages({
      "number.integer": "Expiration minutes must be a whole number",
      "number.min": "Expiration must be at least 1 minute",
      "number.max": "Expiration cannot exceed 24 hours (1440 minutes)",
    }),
  }),

  /**
   * Inventory export schema
   */
  inventoryExport: Joi.object({
    format: Joi.string().valid("csv", "excel", "pdf").optional().default("csv").messages({
      "any.only": "Format must be one of: csv, excel, pdf",
    }),

    includeVAT: Joi.boolean().optional().default(true),

    currency: Joi.object({
      format: Joi.string().valid("naira", "kobo").optional().default("naira"),
      includeSymbol: Joi.boolean().optional().default(true),
      decimalPlaces: Joi.number().integer().min(0).max(4).optional().default(2),
    }).optional(),

    timezone: Joi.string().valid("Africa/Lagos", "UTC").optional().default("Africa/Lagos"),

    includeNigerianFields: Joi.boolean().optional().default(true),

    complianceLevel: Joi.string().valid("basic", "full", "nafdac").optional().default("basic"),

    filters: Joi.object({
      categoryId: Joi.string().uuid().optional(),
      lowStock: Joi.boolean().optional(),
      outOfStock: Joi.boolean().optional(),
      dateFrom: Joi.date().optional(),
      dateTo: Joi.date().min(Joi.ref("dateFrom")).optional(),
    }).optional(),
  }),
};

/**
 * User management schemas
 */
export const userManagementSchemas = {
  /**
   * Create user schema (Admin)
   */
  createUser: Joi.object({
    phoneNumber: Joi.string()
      .pattern(/^(\+234|234|0)[789][01][0-9]{8}$/)
      .required()
      .messages({
        "string.pattern.base": "Phone number must be a valid Nigerian number",
        "any.required": "Phone number is required",
      }),

    firstName: Joi.string()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-Z\s'-]+$/)
      .required()
      .messages({
        "string.min": "First name must be at least 2 characters",
        "string.max": "First name must not exceed 50 characters",
        "string.pattern.base":
          "First name can only contain letters, spaces, hyphens and apostrophes",
        "any.required": "First name is required",
      }),

    lastName: Joi.string()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-Z\s'-]+$/)
      .required()
      .messages({
        "string.min": "Last name must be at least 2 characters",
        "string.max": "Last name must not exceed 50 characters",
        "string.pattern.base":
          "Last name can only contain letters, spaces, hyphens and apostrophes",
        "any.required": "Last name is required",
      }),

    email: Joi.string().email().optional().messages({
      "string.email": "Email must be a valid email address",
    }),

    role: Joi.string()
      .valid("customer", "admin", "super_admin")
      .optional()
      .default("customer")
      .messages({
        "any.only": "Role must be one of: customer, admin, super_admin",
      }),

    isVerified: Joi.boolean().optional().default(false),

    isActive: Joi.boolean().optional().default(true),
  }),

  /**
   * Update user schema (Admin)
   */
  updateUser: Joi.object({
    firstName: Joi.string()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-Z\s'-]+$/)
      .optional(),

    lastName: Joi.string()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-Z\s'-]+$/)
      .optional(),

    email: Joi.string().email().optional(),

    role: Joi.string().valid("customer", "admin", "super_admin").optional(),

    isVerified: Joi.boolean().optional(),

    isActive: Joi.boolean().optional(),
  }),

  /**
   * User query schema (Admin)
   */
  userQuery: Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
    search: Joi.string().max(100).optional().allow(""),
    role: Joi.string().valid("customer", "admin", "super_admin").optional(),
    isVerified: Joi.boolean().optional(),
    isActive: Joi.boolean().optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().min(Joi.ref("dateFrom")).optional(),
    sortBy: Joi.string()
      .valid("firstName", "lastName", "email", "createdAt", "lastLoginAt")
      .optional()
      .default("createdAt"),
    sortOrder: Joi.string().valid("asc", "desc").optional().default("desc"),
  }),

  /**
   * User bulk action schema
   */
  userBulkAction: Joi.object({
    action: Joi.string()
      .valid("activate", "deactivate", "verify", "delete")
      .required()
      .messages({
        "any.only":
          "Action must be one of: activate, deactivate, verify, delete",
        "any.required": "Action is required",
      }),

    userIds: Joi.array()
      .items(Joi.string().uuid())
      .min(1)
      .max(50)
      .required()
      .messages({
        "array.min": "At least 1 user ID is required",
        "array.max": "Maximum 50 users allowed per bulk action",
      }),

    reason: Joi.string().max(500).optional().allow("").messages({
      "string.max": "Reason must not exceed 500 characters",
    }),
  }),
};

/**
 * Analytics schemas
 */
export const analyticsSchemas = {
  /**
   * Dashboard analytics query schema
   */
  dashboardAnalytics: Joi.object({
    period: Joi.string()
      .valid(
        "today",
        "yesterday",
        "last_7_days",
        "last_30_days",
        "this_month",
        "last_month",
        "this_year",
        "custom"
      )
      .optional()
      .default("last_30_days"),

    startDate: Joi.date().when("period", {
      is: "custom",
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),

    endDate: Joi.date().min(Joi.ref("startDate")).when("period", {
      is: "custom",
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),

    metrics: Joi.array()
      .items(
        Joi.string().valid(
          "revenue",
          "orders",
          "customers",
          "products",
          "conversion_rate",
          "average_order_value",
          "cart_abandonment_rate"
        )
      )
      .optional(),
  }),

  /**
   * Product analytics query schema
   */
  productAnalytics: Joi.object({
    period: Joi.string()
      .valid(
        "last_7_days",
        "last_30_days",
        "last_90_days",
        "this_year",
        "custom"
      )
      .optional()
      .default("last_30_days"),

    startDate: Joi.date().when("period", {
      is: "custom",
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),

    endDate: Joi.date().min(Joi.ref("startDate")).when("period", {
      is: "custom",
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),

    categoryId: Joi.string().uuid().optional(),

    limit: Joi.number().integer().min(1).max(100).optional().default(10),
  }),

  /**
   * Customer analytics query schema
   */
  customerAnalytics: Joi.object({
    period: Joi.string()
      .valid(
        "last_30_days",
        "last_90_days",
        "last_6_months",
        "this_year",
        "custom"
      )
      .optional()
      .default("last_90_days"),

    startDate: Joi.date().when("period", {
      is: "custom",
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),

    endDate: Joi.date().min(Joi.ref("startDate")).when("period", {
      is: "custom",
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),

    segmentBy: Joi.string()
      .valid("new_vs_returning", "order_frequency", "total_spent", "location")
      .optional()
      .default("new_vs_returning"),
  }),
};

/**
 * Settings management schemas
 */
export const settingsSchemas = {
  /**
   * General settings schema
   */
  generalSettings: Joi.object({
    siteName: Joi.string().max(100).optional().messages({
      "string.max": "Site name must not exceed 100 characters",
    }),

    siteDescription: Joi.string().max(500).optional().allow("").messages({
      "string.max": "Site description must not exceed 500 characters",
    }),

    contactEmail: Joi.string().email().optional().messages({
      "string.email": "Contact email must be a valid email address",
    }),

    contactPhone: Joi.string()
      .pattern(/^(\+234|234|0)[789][01][0-9]{8}$/)
      .optional()
      .messages({
        "string.pattern.base": "Contact phone must be a valid Nigerian number",
      }),

    currency: Joi.string().valid("NGN").optional().default("NGN"),

    timezone: Joi.string()
      .valid("Africa/Lagos")
      .optional()
      .default("Africa/Lagos"),

    maintenanceMode: Joi.boolean().optional().default(false),
  }),

  /**
   * Payment settings schema
   */
  paymentSettings: Joi.object({
    paystackPublicKey: Joi.string().max(200).optional().allow("").messages({
      "string.max": "Paystack public key must not exceed 200 characters",
    }),

    paystackSecretKey: Joi.string().max(200).optional().allow("").messages({
      "string.max": "Paystack secret key must not exceed 200 characters",
    }),

    enabledMethods: Joi.array()
      .items(Joi.string().valid("card", "bank_transfer", "ussd", "wallet"))
      .optional()
      .default(["card", "bank_transfer", "ussd"]),

    freeShippingThreshold: Joi.number()
      .min(0)
      .precision(2)
      .optional()
      .default(50000)
      .messages({
        "number.min": "Free shipping threshold must be non-negative",
      }),

    defaultShippingFee: Joi.number()
      .min(0)
      .precision(2)
      .optional()
      .default(2500)
      .messages({
        "number.min": "Default shipping fee must be non-negative",
      }),

    taxRate: Joi.number()
      .min(0)
      .max(1)
      .precision(4)
      .optional()
      .default(0.075)
      .messages({
        "number.min": "Tax rate must be non-negative",
        "number.max": "Tax rate must not exceed 100%",
      }),
  }),

  /**
   * Notification settings schema
   */
  notificationSettings: Joi.object({
    emailNotifications: Joi.boolean().optional().default(true),

    smsNotifications: Joi.boolean().optional().default(true),

    adminEmail: Joi.string().email().optional().messages({
      "string.email": "Admin email must be a valid email address",
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

    orderNotifications: Joi.object({
      newOrder: Joi.boolean().optional().default(true),
      orderCancelled: Joi.boolean().optional().default(true),
      paymentReceived: Joi.boolean().optional().default(true),
    }).optional(),
  }),
};

/**
 * Coupon management schemas
 */
export const couponSchemas = {
  /**
   * Create coupon schema
   */
  createCoupon: Joi.object({
    code: Joi.string()
      .min(3)
      .max(50)
      .pattern(/^[A-Z0-9]+$/)
      .required()
      .messages({
        "string.min": "Coupon code must be at least 3 characters",
        "string.max": "Coupon code must not exceed 50 characters",
        "string.pattern.base":
          "Coupon code must contain only uppercase letters and numbers",
        "any.required": "Coupon code is required",
      }),

    name: Joi.string().max(200).required().messages({
      "string.max": "Coupon name must not exceed 200 characters",
      "any.required": "Coupon name is required",
    }),

    description: Joi.string().max(1000).optional().allow("").messages({
      "string.max": "Description must not exceed 1000 characters",
    }),

    discountType: Joi.string()
      .valid("percentage", "fixed")
      .required()
      .messages({
        "any.only": "Discount type must be either percentage or fixed",
        "any.required": "Discount type is required",
      }),

    discountValue: Joi.number().min(0).precision(2).required().messages({
      "number.min": "Discount value must be non-negative",
      "any.required": "Discount value is required",
    }),

    minimumAmount: Joi.number().min(0).precision(2).optional().messages({
      "number.min": "Minimum amount must be non-negative",
    }),

    usageLimit: Joi.number().integer().min(1).optional().messages({
      "number.integer": "Usage limit must be a whole number",
      "number.min": "Usage limit must be at least 1",
    }),

    userUsageLimit: Joi.number().integer().min(1).optional().messages({
      "number.integer": "User usage limit must be a whole number",
      "number.min": "User usage limit must be at least 1",
    }),

    startsAt: Joi.date().optional(),

    expiresAt: Joi.date().min(Joi.ref("startsAt")).optional().messages({
      "date.min": "Expiry date must be after start date",
    }),

    isActive: Joi.boolean().optional().default(true),
  }),

  /**
   * Update coupon schema
   */
  updateCoupon: Joi.object({
    name: Joi.string().max(200).optional(),
    description: Joi.string().max(1000).optional().allow(""),
    discountType: Joi.string().valid("percentage", "fixed").optional(),
    discountValue: Joi.number().min(0).precision(2).optional(),
    minimumAmount: Joi.number().min(0).precision(2).optional(),
    usageLimit: Joi.number().integer().min(1).optional(),
    userUsageLimit: Joi.number().integer().min(1).optional(),
    startsAt: Joi.date().optional(),
    expiresAt: Joi.date().optional(),
    isActive: Joi.boolean().optional(),
  }),
};

export default {
  inventorySchemas,
  userManagementSchemas,
  analyticsSchemas,
  settingsSchemas,
  couponSchemas,
};
