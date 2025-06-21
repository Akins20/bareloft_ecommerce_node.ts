"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderAnalyticsSchemas = exports.shippingSchemas = exports.paymentSchemas = exports.checkoutSchemas = exports.cartSchemas = exports.orderSchemas = void 0;
const joi_1 = __importDefault(require("joi"));
const common_types_1 = require("../../../types/common.types");
const nigerianPhonePattern = /^(\+234|234|0)[789][01][0-9]{8}$/;
/**
 * Order validation schemas
 */
exports.orderSchemas = {
    /**
     * Create order schema
     */
    createOrder: joi_1.default.object({
        shippingAddress: joi_1.default.object({
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
            company: joi_1.default.string().max(100).optional().allow("").messages({
                "string.max": "Company name must not exceed 100 characters",
            }),
            addressLine1: joi_1.default.string().min(5).max(100).required().messages({
                "string.min": "Address line 1 must be at least 5 characters",
                "string.max": "Address line 1 must not exceed 100 characters",
                "any.required": "Address line 1 is required",
            }),
            addressLine2: joi_1.default.string().max(100).optional().allow("").messages({
                "string.max": "Address line 2 must not exceed 100 characters",
            }),
            city: joi_1.default.string().min(2).max(50).required().messages({
                "string.min": "City must be at least 2 characters",
                "string.max": "City must not exceed 50 characters",
                "any.required": "City is required",
            }),
            state: joi_1.default.string()
                .valid(...common_types_1.NIGERIAN_STATES)
                .required()
                .messages({
                "any.only": "State must be a valid Nigerian state",
                "any.required": "State is required",
            }),
            postalCode: joi_1.default.string()
                .pattern(/^[0-9]{6}$/)
                .optional()
                .allow("")
                .messages({
                "string.pattern.base": "Postal code must be 6 digits",
            }),
            country: joi_1.default.string().valid("NG", "Nigeria").optional().default("NG"),
            phoneNumber: joi_1.default.string()
                .pattern(nigerianPhonePattern)
                .required()
                .messages({
                "string.pattern.base": "Phone number must be a valid Nigerian number",
                "any.required": "Phone number is required",
            }),
        }).required(),
        billingAddress: joi_1.default.object({
            firstName: joi_1.default.string()
                .min(2)
                .max(50)
                .pattern(/^[a-zA-Z\s'-]+$/)
                .required(),
            lastName: joi_1.default.string()
                .min(2)
                .max(50)
                .pattern(/^[a-zA-Z\s'-]+$/)
                .required(),
            company: joi_1.default.string().max(100).optional().allow(""),
            addressLine1: joi_1.default.string().min(5).max(100).required(),
            addressLine2: joi_1.default.string().max(100).optional().allow(""),
            city: joi_1.default.string().min(2).max(50).required(),
            state: joi_1.default.string()
                .valid(...common_types_1.NIGERIAN_STATES)
                .required(),
            postalCode: joi_1.default.string()
                .pattern(/^[0-9]{6}$/)
                .optional()
                .allow(""),
            country: joi_1.default.string().valid("NG", "Nigeria").optional().default("NG"),
            phoneNumber: joi_1.default.string().pattern(nigerianPhonePattern).required(),
        }).optional(), // If not provided, use shipping address
        paymentMethod: joi_1.default.string()
            .valid("card", "bank_transfer", "ussd", "wallet")
            .required()
            .messages({
            "any.only": "Payment method must be one of: card, bank_transfer, ussd, wallet",
            "any.required": "Payment method is required",
        }),
        customerNotes: joi_1.default.string().max(500).optional().allow("").messages({
            "string.max": "Customer notes must not exceed 500 characters",
        }),
        couponCode: joi_1.default.string().max(50).optional().allow("").messages({
            "string.max": "Coupon code must not exceed 50 characters",
        }),
    }),
    /**
     * Update order status schema (Admin)
     */
    updateOrderStatus: joi_1.default.object({
        status: joi_1.default.string()
            .valid("pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded")
            .required()
            .messages({
            "any.only": "Status must be one of: pending, confirmed, processing, shipped, delivered, cancelled, refunded",
            "any.required": "Status is required",
        }),
        adminNotes: joi_1.default.string().max(1000).optional().allow("").messages({
            "string.max": "Admin notes must not exceed 1000 characters",
        }),
        trackingNumber: joi_1.default.string().max(100).optional().allow("").messages({
            "string.max": "Tracking number must not exceed 100 characters",
        }),
        estimatedDelivery: joi_1.default.date().min("now").optional().messages({
            "date.min": "Estimated delivery date must be in the future",
        }),
    }),
    /**
     * Order query parameters schema
     */
    orderQuery: joi_1.default.object({
        page: joi_1.default.number().integer().min(1).optional().default(1),
        limit: joi_1.default.number().integer().min(1).max(100).optional().default(20),
        status: joi_1.default.string()
            .valid("pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded")
            .optional(),
        paymentStatus: joi_1.default.string()
            .valid("pending", "paid", "failed", "refunded", "partial_refund")
            .optional(),
        startDate: joi_1.default.date().optional(),
        endDate: joi_1.default.date().min(joi_1.default.ref("startDate")).optional(),
        search: joi_1.default.string().max(100).optional().allow(""),
        sortBy: joi_1.default.string()
            .valid("createdAt", "totalAmount", "status")
            .optional()
            .default("createdAt"),
        sortOrder: joi_1.default.string().valid("asc", "desc").optional().default("desc"),
        userId: joi_1.default.string().uuid().optional(),
    }),
    /**
     * Cancel order schema
     */
    cancelOrder: joi_1.default.object({
        reason: joi_1.default.string().max(500).required().messages({
            "string.max": "Cancellation reason must not exceed 500 characters",
            "any.required": "Cancellation reason is required",
        }),
    }),
};
/**
 * Cart validation schemas
 */
exports.cartSchemas = {
    /**
     * Add to cart schema
     */
    addToCart: joi_1.default.object({
        productId: joi_1.default.string().uuid().required().messages({
            "string.uuid": "Product ID must be a valid UUID",
            "any.required": "Product ID is required",
        }),
        quantity: joi_1.default.number().integer().min(1).max(99).required().messages({
            "number.integer": "Quantity must be a whole number",
            "number.min": "Quantity must be at least 1",
            "number.max": "Quantity must not exceed 99",
            "any.required": "Quantity is required",
        }),
    }),
    /**
     * Update cart item schema
     */
    updateCartItem: joi_1.default.object({
        productId: joi_1.default.string().uuid().required().messages({
            "string.uuid": "Product ID must be a valid UUID",
            "any.required": "Product ID is required",
        }),
        quantity: joi_1.default.number().integer().min(0).max(99).required().messages({
            "number.integer": "Quantity must be a whole number",
            "number.min": "Quantity must be at least 0 (0 to remove)",
            "number.max": "Quantity must not exceed 99",
            "any.required": "Quantity is required",
        }),
    }),
    /**
     * Apply coupon schema
     */
    applyCoupon: joi_1.default.object({
        couponCode: joi_1.default.string().min(3).max(50).required().messages({
            "string.min": "Coupon code must be at least 3 characters",
            "string.max": "Coupon code must not exceed 50 characters",
            "any.required": "Coupon code is required",
        }),
    }),
    /**
     * Update shipping address for cart
     */
    updateShipping: joi_1.default.object({
        state: joi_1.default.string()
            .valid(...common_types_1.NIGERIAN_STATES)
            .required()
            .messages({
            "any.only": "State must be a valid Nigerian state",
            "any.required": "State is required",
        }),
        city: joi_1.default.string().min(2).max(50).required().messages({
            "string.min": "City must be at least 2 characters",
            "string.max": "City must not exceed 50 characters",
            "any.required": "City is required",
        }),
        postalCode: joi_1.default.string()
            .pattern(/^[0-9]{6}$/)
            .optional()
            .allow("")
            .messages({
            "string.pattern.base": "Postal code must be 6 digits",
        }),
    }),
};
/**
 * Checkout validation schemas
 */
exports.checkoutSchemas = {
    /**
     * Initialize checkout schema
     */
    initializeCheckout: joi_1.default.object({
        cartId: joi_1.default.string().uuid().optional().messages({
            "string.uuid": "Cart ID must be a valid UUID",
        }),
        items: joi_1.default.array()
            .items(joi_1.default.object({
            productId: joi_1.default.string().uuid().required(),
            quantity: joi_1.default.number().integer().min(1).max(99).required(),
        }))
            .min(1)
            .max(50)
            .when("cartId", {
            is: joi_1.default.exist(),
            then: joi_1.default.optional(),
            otherwise: joi_1.default.required(),
        })
            .messages({
            "array.min": "At least 1 item is required",
            "array.max": "Maximum 50 items allowed per order",
        }),
    }),
    /**
     * Guest checkout schema
     */
    guestCheckout: joi_1.default.object({
        customerInfo: joi_1.default.object({
            firstName: joi_1.default.string()
                .min(2)
                .max(50)
                .pattern(/^[a-zA-Z\s'-]+$/)
                .required(),
            lastName: joi_1.default.string()
                .min(2)
                .max(50)
                .pattern(/^[a-zA-Z\s'-]+$/)
                .required(),
            email: joi_1.default.string().email().required(),
            phoneNumber: joi_1.default.string().pattern(nigerianPhonePattern).required(),
        }).required(),
        items: joi_1.default.array()
            .items(joi_1.default.object({
            productId: joi_1.default.string().uuid().required(),
            quantity: joi_1.default.number().integer().min(1).max(99).required(),
        }))
            .min(1)
            .max(50)
            .required(),
        shippingAddress: joi_1.default.object({
            firstName: joi_1.default.string()
                .min(2)
                .max(50)
                .pattern(/^[a-zA-Z\s'-]+$/)
                .required(),
            lastName: joi_1.default.string()
                .min(2)
                .max(50)
                .pattern(/^[a-zA-Z\s'-]+$/)
                .required(),
            company: joi_1.default.string().max(100).optional().allow(""),
            addressLine1: joi_1.default.string().min(5).max(100).required(),
            addressLine2: joi_1.default.string().max(100).optional().allow(""),
            city: joi_1.default.string().min(2).max(50).required(),
            state: joi_1.default.string()
                .valid(...common_types_1.NIGERIAN_STATES)
                .required(),
            postalCode: joi_1.default.string()
                .pattern(/^[0-9]{6}$/)
                .optional()
                .allow(""),
            country: joi_1.default.string().valid("NG", "Nigeria").optional().default("NG"),
            phoneNumber: joi_1.default.string().pattern(nigerianPhonePattern).required(),
        }).required(),
        paymentMethod: joi_1.default.string()
            .valid("card", "bank_transfer", "ussd", "wallet")
            .required(),
    }),
};
/**
 * Payment validation schemas
 */
exports.paymentSchemas = {
    /**
     * Initialize payment schema
     */
    initializePayment: joi_1.default.object({
        orderId: joi_1.default.string().uuid().required().messages({
            "string.uuid": "Order ID must be a valid UUID",
            "any.required": "Order ID is required",
        }),
        paymentMethod: joi_1.default.string()
            .valid("card", "bank_transfer", "ussd", "wallet")
            .required()
            .messages({
            "any.only": "Payment method must be one of: card, bank_transfer, ussd, wallet",
            "any.required": "Payment method is required",
        }),
        callbackUrl: joi_1.default.string().uri().optional().messages({
            "string.uri": "Callback URL must be a valid URL",
        }),
        metadata: joi_1.default.object().optional(),
    }),
    /**
     * Verify payment schema
     */
    verifyPayment: joi_1.default.object({
        reference: joi_1.default.string().required().messages({
            "any.required": "Payment reference is required",
        }),
    }),
    /**
     * Process refund schema
     */
    processRefund: joi_1.default.object({
        transactionId: joi_1.default.string().uuid().required().messages({
            "string.uuid": "Transaction ID must be a valid UUID",
            "any.required": "Transaction ID is required",
        }),
        amount: joi_1.default.number().min(1).optional().messages({
            "number.min": "Refund amount must be at least ₦0.01",
        }),
        reason: joi_1.default.string().max(500).required().messages({
            "string.max": "Refund reason must not exceed 500 characters",
            "any.required": "Refund reason is required",
        }),
        metadata: joi_1.default.object().optional(),
    }),
};
/**
 * Shipping validation schemas
 */
exports.shippingSchemas = {
    /**
     * Calculate shipping schema
     */
    calculateShipping: joi_1.default.object({
        items: joi_1.default.array()
            .items(joi_1.default.object({
            productId: joi_1.default.string().uuid().required(),
            quantity: joi_1.default.number().integer().min(1).required(),
            weight: joi_1.default.number().min(0).optional(),
        }))
            .min(1)
            .required()
            .messages({
            "array.min": "At least 1 item is required for shipping calculation",
        }),
        destination: joi_1.default.object({
            state: joi_1.default.string()
                .valid(...common_types_1.NIGERIAN_STATES)
                .required(),
            city: joi_1.default.string().min(2).max(50).required(),
            postalCode: joi_1.default.string()
                .pattern(/^[0-9]{6}$/)
                .optional()
                .allow(""),
        }).required(),
    }),
    /**
     * Update tracking schema
     */
    updateTracking: joi_1.default.object({
        orderId: joi_1.default.string().uuid().required().messages({
            "string.uuid": "Order ID must be a valid UUID",
            "any.required": "Order ID is required",
        }),
        trackingNumber: joi_1.default.string().max(100).required().messages({
            "string.max": "Tracking number must not exceed 100 characters",
            "any.required": "Tracking number is required",
        }),
        carrier: joi_1.default.string().max(100).optional().messages({
            "string.max": "Carrier name must not exceed 100 characters",
        }),
        estimatedDelivery: joi_1.default.date().min("now").optional().messages({
            "date.min": "Estimated delivery must be in the future",
        }),
        trackingUrl: joi_1.default.string().uri().optional().messages({
            "string.uri": "Tracking URL must be a valid URL",
        }),
    }),
};
/**
 * Order analytics schemas
 */
exports.orderAnalyticsSchemas = {
    /**
     * Order analytics query schema
     */
    analyticsQuery: joi_1.default.object({
        startDate: joi_1.default.date().required().messages({
            "any.required": "Start date is required",
        }),
        endDate: joi_1.default.date().min(joi_1.default.ref("startDate")).required().messages({
            "date.min": "End date must be after start date",
            "any.required": "End date is required",
        }),
        groupBy: joi_1.default.string()
            .valid("day", "week", "month", "year")
            .optional()
            .default("day"),
        status: joi_1.default.array()
            .items(joi_1.default.string().valid("pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"))
            .optional(),
        paymentMethod: joi_1.default.array()
            .items(joi_1.default.string().valid("card", "bank_transfer", "ussd", "wallet"))
            .optional(),
        includeRefunds: joi_1.default.boolean().optional().default(false),
    }),
    /**
     * Sales report schema
     */
    salesReportQuery: joi_1.default.object({
        period: joi_1.default.string()
            .valid("today", "yesterday", "last_7_days", "last_30_days", "this_month", "last_month", "custom")
            .required(),
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
        includeDetails: joi_1.default.boolean().optional().default(false),
        format: joi_1.default.string().valid("json", "csv", "pdf").optional().default("json"),
    }),
};
exports.default = {
    orderSchemas: exports.orderSchemas,
    cartSchemas: exports.cartSchemas,
    checkoutSchemas: exports.checkoutSchemas,
    paymentSchemas: exports.paymentSchemas,
    shippingSchemas: exports.shippingSchemas,
    orderAnalyticsSchemas: exports.orderAnalyticsSchemas,
};
//# sourceMappingURL=orderSchemas.js.map