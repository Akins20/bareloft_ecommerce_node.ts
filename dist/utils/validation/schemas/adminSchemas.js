"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.couponSchemas = exports.settingsSchemas = exports.analyticsSchemas = exports.userManagementSchemas = exports.inventorySchemas = void 0;
const joi_1 = __importDefault(require("joi"));
/**
 * Admin validation schemas for Bareloft platform
 */
/**
 * Inventory management schemas
 */
exports.inventorySchemas = {
    /**
     * Update inventory schema
     */
    updateInventory: joi_1.default.object({
        productId: joi_1.default.string().uuid().required().messages({
            "string.uuid": "Product ID must be a valid UUID",
            "any.required": "Product ID is required",
        }),
        quantity: joi_1.default.number().integer().min(0).optional().messages({
            "number.integer": "Quantity must be a whole number",
            "number.min": "Quantity must be non-negative",
        }),
        lowStockThreshold: joi_1.default.number().integer().min(0).optional().messages({
            "number.integer": "Low stock threshold must be a whole number",
            "number.min": "Low stock threshold must be non-negative",
        }),
        reorderPoint: joi_1.default.number().integer().min(0).optional().messages({
            "number.integer": "Reorder point must be a whole number",
            "number.min": "Reorder point must be non-negative",
        }),
        reorderQuantity: joi_1.default.number().integer().min(1).optional().messages({
            "number.integer": "Reorder quantity must be a whole number",
            "number.min": "Reorder quantity must be at least 1",
        }),
        allowBackorder: joi_1.default.boolean().optional(),
        reason: joi_1.default.string().max(500).optional().allow("").messages({
            "string.max": "Reason must not exceed 500 characters",
        }),
        notes: joi_1.default.string().max(1000).optional().allow("").messages({
            "string.max": "Notes must not exceed 1000 characters",
        }),
    }),
    /**
     * Bulk inventory update schema
     */
    bulkInventoryUpdate: joi_1.default.object({
        updates: joi_1.default.array()
            .items(joi_1.default.object({
            productId: joi_1.default.string().uuid().required(),
            quantity: joi_1.default.number().integer().min(0).required(),
            reason: joi_1.default.string().max(200).optional().allow(""),
        }))
            .min(1)
            .max(100)
            .required()
            .messages({
            "array.min": "At least 1 update is required",
            "array.max": "Maximum 100 updates allowed per batch",
        }),
        batchReason: joi_1.default.string().max(500).optional().allow("").messages({
            "string.max": "Batch reason must not exceed 500 characters",
        }),
        notes: joi_1.default.string().max(1000).optional().allow("").messages({
            "string.max": "Notes must not exceed 1000 characters",
        }),
    }),
    /**
     * Inventory adjustment schema
     */
    inventoryAdjustment: joi_1.default.object({
        productId: joi_1.default.string().uuid().required().messages({
            "string.uuid": "Product ID must be a valid UUID",
            "any.required": "Product ID is required",
        }),
        adjustmentType: joi_1.default.string()
            .valid("set", "increase", "decrease")
            .required()
            .messages({
            "any.only": "Adjustment type must be one of: set, increase, decrease",
            "any.required": "Adjustment type is required",
        }),
        quantity: joi_1.default.number().integer().min(0).required().messages({
            "number.integer": "Quantity must be a whole number",
            "number.min": "Quantity must be non-negative",
            "any.required": "Quantity is required",
        }),
        reason: joi_1.default.string().max(500).required().messages({
            "string.max": "Reason must not exceed 500 characters",
            "any.required": "Reason is required",
        }),
        notes: joi_1.default.string().max(1000).optional().allow("").messages({
            "string.max": "Notes must not exceed 1000 characters",
        }),
        unitCost: joi_1.default.number().min(0).precision(2).optional().messages({
            "number.min": "Unit cost must be non-negative",
        }),
    }),
    /**
     * Low stock report query schema
     */
    lowStockQuery: joi_1.default.object({
        threshold: joi_1.default.number().integer().min(0).optional().default(10).messages({
            "number.integer": "Threshold must be a whole number",
            "number.min": "Threshold must be non-negative",
        }),
        categoryId: joi_1.default.string().uuid().optional().messages({
            "string.uuid": "Category ID must be a valid UUID",
        }),
        includeOutOfStock: joi_1.default.boolean().optional().default(true),
    }),
};
/**
 * User management schemas
 */
exports.userManagementSchemas = {
    /**
     * Create user schema (Admin)
     */
    createUser: joi_1.default.object({
        phoneNumber: joi_1.default.string()
            .pattern(/^(\+234|234|0)[789][01][0-9]{8}$/)
            .required()
            .messages({
            "string.pattern.base": "Phone number must be a valid Nigerian number",
            "any.required": "Phone number is required",
        }),
        firstName: joi_1.default.string()
            .min(2)
            .max(50)
            .pattern(/^[a-zA-Z\s'-]+$/)
            .required()
            .messages({
            "string.min": "First name must be at least 2 characters",
            "string.max": "First name must not exceed 50 characters",
            "string.pattern.base": "First name can only contain letters, spaces, hyphens and apostrophes",
            "any.required": "First name is required",
        }),
        lastName: joi_1.default.string()
            .min(2)
            .max(50)
            .pattern(/^[a-zA-Z\s'-]+$/)
            .required()
            .messages({
            "string.min": "Last name must be at least 2 characters",
            "string.max": "Last name must not exceed 50 characters",
            "string.pattern.base": "Last name can only contain letters, spaces, hyphens and apostrophes",
            "any.required": "Last name is required",
        }),
        email: joi_1.default.string().email().optional().messages({
            "string.email": "Email must be a valid email address",
        }),
        role: joi_1.default.string()
            .valid("customer", "admin", "super_admin")
            .optional()
            .default("customer")
            .messages({
            "any.only": "Role must be one of: customer, admin, super_admin",
        }),
        isVerified: joi_1.default.boolean().optional().default(false),
        isActive: joi_1.default.boolean().optional().default(true),
    }),
    /**
     * Update user schema (Admin)
     */
    updateUser: joi_1.default.object({
        firstName: joi_1.default.string()
            .min(2)
            .max(50)
            .pattern(/^[a-zA-Z\s'-]+$/)
            .optional(),
        lastName: joi_1.default.string()
            .min(2)
            .max(50)
            .pattern(/^[a-zA-Z\s'-]+$/)
            .optional(),
        email: joi_1.default.string().email().optional(),
        role: joi_1.default.string().valid("customer", "admin", "super_admin").optional(),
        isVerified: joi_1.default.boolean().optional(),
        isActive: joi_1.default.boolean().optional(),
    }),
    /**
     * User query schema (Admin)
     */
    userQuery: joi_1.default.object({
        page: joi_1.default.number().integer().min(1).optional().default(1),
        limit: joi_1.default.number().integer().min(1).max(100).optional().default(20),
        search: joi_1.default.string().max(100).optional().allow(""),
        role: joi_1.default.string().valid("customer", "admin", "super_admin").optional(),
        isVerified: joi_1.default.boolean().optional(),
        isActive: joi_1.default.boolean().optional(),
        dateFrom: joi_1.default.date().optional(),
        dateTo: joi_1.default.date().min(joi_1.default.ref("dateFrom")).optional(),
        sortBy: joi_1.default.string()
            .valid("firstName", "lastName", "email", "createdAt", "lastLoginAt")
            .optional()
            .default("createdAt"),
        sortOrder: joi_1.default.string().valid("asc", "desc").optional().default("desc"),
    }),
    /**
     * User bulk action schema
     */
    userBulkAction: joi_1.default.object({
        action: joi_1.default.string()
            .valid("activate", "deactivate", "verify", "delete")
            .required()
            .messages({
            "any.only": "Action must be one of: activate, deactivate, verify, delete",
            "any.required": "Action is required",
        }),
        userIds: joi_1.default.array()
            .items(joi_1.default.string().uuid())
            .min(1)
            .max(50)
            .required()
            .messages({
            "array.min": "At least 1 user ID is required",
            "array.max": "Maximum 50 users allowed per bulk action",
        }),
        reason: joi_1.default.string().max(500).optional().allow("").messages({
            "string.max": "Reason must not exceed 500 characters",
        }),
    }),
};
/**
 * Analytics schemas
 */
exports.analyticsSchemas = {
    /**
     * Dashboard analytics query schema
     */
    dashboardAnalytics: joi_1.default.object({
        period: joi_1.default.string()
            .valid("today", "yesterday", "last_7_days", "last_30_days", "this_month", "last_month", "this_year", "custom")
            .optional()
            .default("last_30_days"),
        startDate: joi_1.default.date().when("period", {
            is: "custom",
            then: joi_1.default.required(),
            otherwise: joi_1.default.optional(),
        }),
        endDate: joi_1.default.date().min(joi_1.default.ref("startDate")).when("period", {
            is: "custom",
            then: joi_1.default.required(),
            otherwise: joi_1.default.optional(),
        }),
        metrics: joi_1.default.array()
            .items(joi_1.default.string().valid("revenue", "orders", "customers", "products", "conversion_rate", "average_order_value", "cart_abandonment_rate"))
            .optional(),
    }),
    /**
     * Product analytics query schema
     */
    productAnalytics: joi_1.default.object({
        period: joi_1.default.string()
            .valid("last_7_days", "last_30_days", "last_90_days", "this_year", "custom")
            .optional()
            .default("last_30_days"),
        startDate: joi_1.default.date().when("period", {
            is: "custom",
            then: joi_1.default.required(),
            otherwise: joi_1.default.optional(),
        }),
        endDate: joi_1.default.date().min(joi_1.default.ref("startDate")).when("period", {
            is: "custom",
            then: joi_1.default.required(),
            otherwise: joi_1.default.optional(),
        }),
        categoryId: joi_1.default.string().uuid().optional(),
        limit: joi_1.default.number().integer().min(1).max(100).optional().default(10),
    }),
    /**
     * Customer analytics query schema
     */
    customerAnalytics: joi_1.default.object({
        period: joi_1.default.string()
            .valid("last_30_days", "last_90_days", "last_6_months", "this_year", "custom")
            .optional()
            .default("last_90_days"),
        startDate: joi_1.default.date().when("period", {
            is: "custom",
            then: joi_1.default.required(),
            otherwise: joi_1.default.optional(),
        }),
        endDate: joi_1.default.date().min(joi_1.default.ref("startDate")).when("period", {
            is: "custom",
            then: joi_1.default.required(),
            otherwise: joi_1.default.optional(),
        }),
        segmentBy: joi_1.default.string()
            .valid("new_vs_returning", "order_frequency", "total_spent", "location")
            .optional()
            .default("new_vs_returning"),
    }),
};
/**
 * Settings management schemas
 */
exports.settingsSchemas = {
    /**
     * General settings schema
     */
    generalSettings: joi_1.default.object({
        siteName: joi_1.default.string().max(100).optional().messages({
            "string.max": "Site name must not exceed 100 characters",
        }),
        siteDescription: joi_1.default.string().max(500).optional().allow("").messages({
            "string.max": "Site description must not exceed 500 characters",
        }),
        contactEmail: joi_1.default.string().email().optional().messages({
            "string.email": "Contact email must be a valid email address",
        }),
        contactPhone: joi_1.default.string()
            .pattern(/^(\+234|234|0)[789][01][0-9]{8}$/)
            .optional()
            .messages({
            "string.pattern.base": "Contact phone must be a valid Nigerian number",
        }),
        currency: joi_1.default.string().valid("NGN").optional().default("NGN"),
        timezone: joi_1.default.string()
            .valid("Africa/Lagos")
            .optional()
            .default("Africa/Lagos"),
        maintenanceMode: joi_1.default.boolean().optional().default(false),
    }),
    /**
     * Payment settings schema
     */
    paymentSettings: joi_1.default.object({
        paystackPublicKey: joi_1.default.string().max(200).optional().allow("").messages({
            "string.max": "Paystack public key must not exceed 200 characters",
        }),
        paystackSecretKey: joi_1.default.string().max(200).optional().allow("").messages({
            "string.max": "Paystack secret key must not exceed 200 characters",
        }),
        enabledMethods: joi_1.default.array()
            .items(joi_1.default.string().valid("card", "bank_transfer", "ussd", "wallet"))
            .optional()
            .default(["card", "bank_transfer", "ussd"]),
        freeShippingThreshold: joi_1.default.number()
            .min(0)
            .precision(2)
            .optional()
            .default(50000)
            .messages({
            "number.min": "Free shipping threshold must be non-negative",
        }),
        defaultShippingFee: joi_1.default.number()
            .min(0)
            .precision(2)
            .optional()
            .default(2500)
            .messages({
            "number.min": "Default shipping fee must be non-negative",
        }),
        taxRate: joi_1.default.number()
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
    notificationSettings: joi_1.default.object({
        emailNotifications: joi_1.default.boolean().optional().default(true),
        smsNotifications: joi_1.default.boolean().optional().default(true),
        adminEmail: joi_1.default.string().email().optional().messages({
            "string.email": "Admin email must be a valid email address",
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
        orderNotifications: joi_1.default.object({
            newOrder: joi_1.default.boolean().optional().default(true),
            orderCancelled: joi_1.default.boolean().optional().default(true),
            paymentReceived: joi_1.default.boolean().optional().default(true),
        }).optional(),
    }),
};
/**
 * Coupon management schemas
 */
exports.couponSchemas = {
    /**
     * Create coupon schema
     */
    createCoupon: joi_1.default.object({
        code: joi_1.default.string()
            .min(3)
            .max(50)
            .pattern(/^[A-Z0-9]+$/)
            .required()
            .messages({
            "string.min": "Coupon code must be at least 3 characters",
            "string.max": "Coupon code must not exceed 50 characters",
            "string.pattern.base": "Coupon code must contain only uppercase letters and numbers",
            "any.required": "Coupon code is required",
        }),
        name: joi_1.default.string().max(200).required().messages({
            "string.max": "Coupon name must not exceed 200 characters",
            "any.required": "Coupon name is required",
        }),
        description: joi_1.default.string().max(1000).optional().allow("").messages({
            "string.max": "Description must not exceed 1000 characters",
        }),
        discountType: joi_1.default.string()
            .valid("percentage", "fixed")
            .required()
            .messages({
            "any.only": "Discount type must be either percentage or fixed",
            "any.required": "Discount type is required",
        }),
        discountValue: joi_1.default.number().min(0).precision(2).required().messages({
            "number.min": "Discount value must be non-negative",
            "any.required": "Discount value is required",
        }),
        minimumAmount: joi_1.default.number().min(0).precision(2).optional().messages({
            "number.min": "Minimum amount must be non-negative",
        }),
        usageLimit: joi_1.default.number().integer().min(1).optional().messages({
            "number.integer": "Usage limit must be a whole number",
            "number.min": "Usage limit must be at least 1",
        }),
        userUsageLimit: joi_1.default.number().integer().min(1).optional().messages({
            "number.integer": "User usage limit must be a whole number",
            "number.min": "User usage limit must be at least 1",
        }),
        startsAt: joi_1.default.date().optional(),
        expiresAt: joi_1.default.date().min(joi_1.default.ref("startsAt")).optional().messages({
            "date.min": "Expiry date must be after start date",
        }),
        isActive: joi_1.default.boolean().optional().default(true),
    }),
    /**
     * Update coupon schema
     */
    updateCoupon: joi_1.default.object({
        name: joi_1.default.string().max(200).optional(),
        description: joi_1.default.string().max(1000).optional().allow(""),
        discountType: joi_1.default.string().valid("percentage", "fixed").optional(),
        discountValue: joi_1.default.number().min(0).precision(2).optional(),
        minimumAmount: joi_1.default.number().min(0).precision(2).optional(),
        usageLimit: joi_1.default.number().integer().min(1).optional(),
        userUsageLimit: joi_1.default.number().integer().min(1).optional(),
        startsAt: joi_1.default.date().optional(),
        expiresAt: joi_1.default.date().optional(),
        isActive: joi_1.default.boolean().optional(),
    }),
};
exports.default = {
    inventorySchemas: exports.inventorySchemas,
    userManagementSchemas: exports.userManagementSchemas,
    analyticsSchemas: exports.analyticsSchemas,
    settingsSchemas: exports.settingsSchemas,
    couponSchemas: exports.couponSchemas,
};
//# sourceMappingURL=adminSchemas.js.map