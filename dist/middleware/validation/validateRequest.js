"use strict";
// src/middleware/validation/validateRequest.ts
/**
 * ✅ Request Validation Middleware
 * Comprehensive validation using Joi with Nigerian market optimizations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationSchemas = exports.validateRequest = void 0;
const joi_1 = __importDefault(require("joi"));
const winston_1 = require("../../utils/logger/winston");
// 🇳🇬 Nigerian-specific validation patterns
const NIGERIAN_PHONE_REGEX = /^(\+234|234|0)?[789][01]\d{8}$/;
const NIGERIAN_STATES = [
    "Abia",
    "Adamawa",
    "Akwa Ibom",
    "Anambra",
    "Bauchi",
    "Bayelsa",
    "Benue",
    "Borno",
    "Cross River",
    "Delta",
    "Ebonyi",
    "Edo",
    "Ekiti",
    "Enugu",
    "Gombe",
    "Imo",
    "Jigawa",
    "Kaduna",
    "Kano",
    "Katsina",
    "Kebbi",
    "Kogi",
    "Kwara",
    "Lagos",
    "Nasarawa",
    "Niger",
    "Ogun",
    "Ondo",
    "Osun",
    "Oyo",
    "Plateau",
    "Rivers",
    "Sokoto",
    "Taraba",
    "Yobe",
    "Zamfara",
    "FCT",
];
/**
 * 🔧 Custom Joi extensions for Nigerian market
 */
const customJoi = joi_1.default.extend({
    type: "nigerian",
    base: joi_1.default.string(),
    messages: {
        "nigerian.phone": "Phone number must be a valid Nigerian number (+234xxxxxxxxxx)",
        "nigerian.state": "State must be a valid Nigerian state",
        "nigerian.currency": "Amount must be a valid Nigerian Naira amount",
    },
    rules: {
        phone: {
            method() {
                return this.$_addRule({ name: "phone" });
            },
            validate(value, helpers) {
                // Normalize phone number
                let normalized = value.replace(/\s+/g, "");
                // Add +234 if starts with 0
                if (normalized.startsWith("0")) {
                    normalized = "+234" + normalized.substring(1);
                }
                // Add +234 if starts with 234
                if (normalized.startsWith("234") && !normalized.startsWith("+234")) {
                    normalized = "+" + normalized;
                }
                // Add +234 if no country code
                if (!normalized.startsWith("+234") && normalized.length === 10) {
                    normalized = "+234" + normalized;
                }
                if (!NIGERIAN_PHONE_REGEX.test(normalized)) {
                    return helpers.error("nigerian.phone");
                }
                return normalized;
            },
        },
        state: {
            method() {
                return this.$_addRule({ name: "state" });
            },
            validate(value, helpers) {
                if (!NIGERIAN_STATES.includes(value)) {
                    return helpers.error("nigerian.state");
                }
                return value;
            },
        },
        currency: {
            method() {
                return this.$_addRule({ name: "currency" });
            },
            validate(value, helpers) {
                // Validate Nigerian Naira amounts (no decimals beyond 2 places)
                if (typeof value !== "number" || value < 0) {
                    return helpers.error("nigerian.currency");
                }
                // Round to 2 decimal places
                return Math.round(value * 100) / 100;
            },
        },
    },
});
/**
 * 🔍 Main validation middleware factory
 * Creates validation middleware for different request parts
 */
const validateRequest = (options) => {
    return (req, res, next) => {
        const errors = [];
        try {
            // Validate request body
            if (options.body && req.body) {
                const { error, value } = options.body.validate(req.body, {
                    abortEarly: false,
                    stripUnknown: true,
                    convert: true,
                });
                if (error) {
                    errors.push({
                        type: "body",
                        details: error.details.map((detail) => ({
                            field: detail.path.join("."),
                            message: detail.message,
                            value: detail.context?.value,
                        })),
                    });
                }
                else {
                    req.body = value;
                }
            }
            // Validate request parameters
            if (options.params && req.params) {
                const { error, value } = options.params.validate(req.params, {
                    abortEarly: false,
                    stripUnknown: true,
                    convert: true,
                });
                if (error) {
                    errors.push({
                        type: "params",
                        details: error.details.map((detail) => ({
                            field: detail.path.join("."),
                            message: detail.message,
                            value: detail.context?.value,
                        })),
                    });
                }
                else {
                    req.params = value;
                }
            }
            // Validate query parameters
            if (options.query && req.query) {
                const { error, value } = options.query.validate(req.query, {
                    abortEarly: false,
                    stripUnknown: true,
                    convert: true,
                });
                if (error) {
                    errors.push({
                        type: "query",
                        details: error.details.map((detail) => ({
                            field: detail.path.join("."),
                            message: detail.message,
                            value: detail.context?.value,
                        })),
                    });
                }
                else {
                    req.query = value;
                }
            }
            // Validate headers
            if (options.headers && req.headers) {
                const { error } = options.headers.validate(req.headers, {
                    abortEarly: false,
                    allowUnknown: true,
                });
                if (error) {
                    errors.push({
                        type: "headers",
                        details: error.details.map((detail) => ({
                            field: detail.path.join("."),
                            message: detail.message,
                            value: detail.context?.value,
                        })),
                    });
                }
            }
            // Handle validation errors
            if (errors.length > 0) {
                winston_1.logger.warn("Request validation failed", {
                    path: req.path,
                    method: req.method,
                    errors,
                    ip: req.ip,
                    userAgent: req.get("User-Agent"),
                });
                return res.status(400).json({
                    success: false,
                    error: "VALIDATION_ERROR",
                    message: "Request validation failed",
                    details: errors,
                    code: "VAL_001",
                });
            }
            next();
        }
        catch (error) {
            winston_1.logger.error("Validation middleware error", {
                error: error instanceof Error ? error.message : "Unknown error",
                path: req.path,
                method: req.method,
            });
            if (options.skipOnError) {
                return next();
            }
            res.status(500).json({
                success: false,
                error: "VALIDATION_SERVICE_ERROR",
                message: "Validation service temporarily unavailable",
                code: "VAL_500",
            });
        }
    };
};
exports.validateRequest = validateRequest;
/**
 * 📋 Pre-built validation schemas for common use cases
 */
exports.validationSchemas = {
    // Nigerian phone number
    nigerianPhone: customJoi.nigerian().phone().required(),
    // Optional Nigerian phone
    optionalNigerianPhone: customJoi.nigerian().phone().optional(),
    // Nigerian state
    nigerianState: customJoi.nigerian().state().required(),
    // Nigerian currency amount
    nairaAmount: customJoi.number().min(0).precision(2).required(),
    // Pagination
    pagination: joi_1.default.object({
        page: joi_1.default.number().integer().min(1).default(1),
        limit: joi_1.default.number().integer().min(1).max(100).default(20),
        sortBy: joi_1.default.string().optional(),
        sortOrder: joi_1.default.string().valid("asc", "desc").default("desc"),
    }),
    // MongoDB ObjectId
    mongoId: joi_1.default.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required(),
    // UUID
    uuid: joi_1.default.string().uuid().required(),
    // Product search
    productSearch: joi_1.default.object({
        search: joi_1.default.string().min(2).max(100).optional(),
        category: joi_1.default.string().optional(),
        minPrice: joi_1.default.number().min(0).optional(),
        maxPrice: joi_1.default.number().min(0).optional(),
        brand: joi_1.default.string().optional(),
        inStock: joi_1.default.boolean().optional(),
        featured: joi_1.default.boolean().optional(),
    }),
    // User registration
    userRegistration: joi_1.default.object({
        phoneNumber: customJoi.nigerian().phone().required(),
        firstName: joi_1.default.string()
            .min(2)
            .max(50)
            .pattern(/^[a-zA-Z\s]+$/)
            .required(),
        lastName: joi_1.default.string()
            .min(2)
            .max(50)
            .pattern(/^[a-zA-Z\s]+$/)
            .required(),
        email: joi_1.default.string().email().optional(),
        password: joi_1.default.string()
            .min(8)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .optional(),
    }),
    // Address
    nigerianAddress: joi_1.default.object({
        firstName: joi_1.default.string().min(2).max(50).required(),
        lastName: joi_1.default.string().min(2).max(50).required(),
        company: joi_1.default.string().max(100).optional(),
        addressLine1: joi_1.default.string().min(5).max(200).required(),
        addressLine2: joi_1.default.string().max(200).optional(),
        city: joi_1.default.string().min(2).max(100).required(),
        state: customJoi.nigerian().state().required(),
        postalCode: joi_1.default.string()
            .pattern(/^\d{6}$/)
            .optional(),
        country: joi_1.default.string().valid("NG", "Nigeria").default("NG"),
        phoneNumber: customJoi.nigerian().phone().required(),
        isDefault: joi_1.default.boolean().default(false),
    }),
};
//# sourceMappingURL=validateRequest.js.map