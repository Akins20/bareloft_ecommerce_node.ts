"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.commonSchemas = exports.userSchemas = exports.authSchemas = void 0;
const joi_1 = __importDefault(require("joi"));
const common_types_1 = require("../../../types/common.types");
/**
 * Nigerian phone number validation pattern
 */
const nigerianPhonePattern = /^(\+234|234|0)[789][01][0-9]{8}$/;
/**
 * Authentication validation schemas
 */
exports.authSchemas = {
    /**
     * Request OTP schema
     */
    requestOTP: joi_1.default.object({
        phoneNumber: joi_1.default.string()
            .pattern(nigerianPhonePattern)
            .required()
            .messages({
            "string.pattern.base": "Phone number must be a valid Nigerian number (+234XXXXXXXXXX)",
            "any.required": "Phone number is required",
        }),
        purpose: joi_1.default.string()
            .valid("LOGIN", "SIGNUP", "PASSWORD_RESET", "PHONE_VERIFICATION")
            .required()
            .messages({
            "any.only": "Purpose must be one of: LOGIN, SIGNUP, PASSWORD_RESET, PHONE_VERIFICATION",
            "any.required": "Purpose is required",
        }),
    }),
    /**
     * Verify OTP schema
     */
    verifyOTP: joi_1.default.object({
        phoneNumber: joi_1.default.string()
            .pattern(nigerianPhonePattern)
            .required()
            .messages({
            "string.pattern.base": "Phone number must be a valid Nigerian number",
            "any.required": "Phone number is required",
        }),
        code: joi_1.default.string()
            .length(6)
            .pattern(/^[0-9]+$/)
            .required()
            .messages({
            "string.length": "OTP code must be exactly 6 digits",
            "string.pattern.base": "OTP code must contain only numbers",
            "any.required": "OTP code is required",
        }),
        purpose: joi_1.default.string()
            .valid("LOGIN", "SIGNUP", "PASSWORD_RESET", "PHONE_VERIFICATION")
            .required(),
    }),
    /**
     * User signup schema
     */
    signup: joi_1.default.object({
        phoneNumber: joi_1.default.string()
            .pattern(nigerianPhonePattern)
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
        email: joi_1.default.string()
            .email({ tlds: { allow: false } })
            .optional()
            .messages({
            "string.email": "Email must be a valid email address",
        }),
        otpCode: joi_1.default.string()
            .length(6)
            .pattern(/^[0-9]+$/)
            .required()
            .messages({
            "string.length": "OTP code must be exactly 6 digits",
            "string.pattern.base": "OTP code must contain only numbers",
            "any.required": "OTP code is required",
        }),
    }),
    /**
     * Login schema
     */
    login: joi_1.default.object({
        phoneNumber: joi_1.default.string()
            .pattern(nigerianPhonePattern)
            .required()
            .messages({
            "string.pattern.base": "Phone number must be a valid Nigerian number",
            "any.required": "Phone number is required",
        }),
        otpCode: joi_1.default.string()
            .length(6)
            .pattern(/^[0-9]+$/)
            .required()
            .messages({
            "string.length": "OTP code must be exactly 6 digits",
            "string.pattern.base": "OTP code must contain only numbers",
            "any.required": "OTP code is required",
        }),
    }),
    /**
     * Refresh token schema
     */
    refreshToken: joi_1.default.object({
        refreshToken: joi_1.default.string().required().messages({
            "any.required": "Refresh token is required",
        }),
    }),
    /**
     * Password reset schema (for future implementation)
     */
    resetPassword: joi_1.default.object({
        phoneNumber: joi_1.default.string().pattern(nigerianPhonePattern).required(),
        otpCode: joi_1.default.string()
            .length(6)
            .pattern(/^[0-9]+$/)
            .required(),
        newPassword: joi_1.default.string()
            .min(8)
            .max(128)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
            .required()
            .messages({
            "string.min": "Password must be at least 8 characters long",
            "string.max": "Password must not exceed 128 characters",
            "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        }),
    }),
    /**
     * Change password schema
     */
    changePassword: joi_1.default.object({
        currentPassword: joi_1.default.string().required().messages({
            "any.required": "Current password is required",
        }),
        newPassword: joi_1.default.string()
            .min(8)
            .max(128)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
            .required()
            .messages({
            "string.min": "New password must be at least 8 characters long",
            "string.max": "New password must not exceed 128 characters",
            "string.pattern.base": "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        }),
    }),
};
/**
 * User profile validation schemas
 */
exports.userSchemas = {
    /**
     * Update profile schema
     */
    updateProfile: joi_1.default.object({
        firstName: joi_1.default.string()
            .min(2)
            .max(50)
            .pattern(/^[a-zA-Z\s'-]+$/)
            .optional()
            .messages({
            "string.min": "First name must be at least 2 characters",
            "string.max": "First name must not exceed 50 characters",
            "string.pattern.base": "First name can only contain letters, spaces, hyphens and apostrophes",
        }),
        lastName: joi_1.default.string()
            .min(2)
            .max(50)
            .pattern(/^[a-zA-Z\s'-]+$/)
            .optional()
            .messages({
            "string.min": "Last name must be at least 2 characters",
            "string.max": "Last name must not exceed 50 characters",
            "string.pattern.base": "Last name can only contain letters, spaces, hyphens and apostrophes",
        }),
        email: joi_1.default.string()
            .email({ tlds: { allow: false } })
            .optional()
            .messages({
            "string.email": "Email must be a valid email address",
        }),
        avatar: joi_1.default.string().uri().optional().messages({
            "string.uri": "Avatar must be a valid URL",
        }),
        dateOfBirth: joi_1.default.date().max("now").optional().messages({
            "date.max": "Date of birth cannot be in the future",
        }),
        gender: joi_1.default.string()
            .valid("male", "female", "other", "prefer_not_to_say")
            .optional(),
    }),
    /**
     * Create address schema
     */
    createAddress: joi_1.default.object({
        type: joi_1.default.string().valid("shipping", "billing").required().messages({
            "any.only": "Address type must be either shipping or billing",
            "any.required": "Address type is required",
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
        company: joi_1.default.string().max(100).optional().messages({
            "string.max": "Company name must not exceed 100 characters",
        }),
        addressLine1: joi_1.default.string().min(5).max(100).required().messages({
            "string.min": "Address line 1 must be at least 5 characters",
            "string.max": "Address line 1 must not exceed 100 characters",
            "any.required": "Address line 1 is required",
        }),
        addressLine2: joi_1.default.string().max(100).optional().messages({
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
            .messages({
            "string.pattern.base": "Postal code must be 6 digits",
        }),
        phoneNumber: joi_1.default.string()
            .pattern(nigerianPhonePattern)
            .required()
            .messages({
            "string.pattern.base": "Phone number must be a valid Nigerian number",
            "any.required": "Phone number is required",
        }),
        isDefault: joi_1.default.boolean().optional().default(false),
    }),
    /**
     * Update address schema
     */
    updateAddress: joi_1.default.object({
        type: joi_1.default.string().valid("shipping", "billing").optional(),
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
        company: joi_1.default.string().max(100).optional(),
        addressLine1: joi_1.default.string().min(5).max(100).optional(),
        addressLine2: joi_1.default.string().max(100).optional(),
        city: joi_1.default.string().min(2).max(50).optional(),
        state: joi_1.default.string()
            .valid(...common_types_1.NIGERIAN_STATES)
            .optional(),
        postalCode: joi_1.default.string()
            .pattern(/^[0-9]{6}$/)
            .optional(),
        phoneNumber: joi_1.default.string().pattern(nigerianPhonePattern).optional(),
        isDefault: joi_1.default.boolean().optional(),
    }),
};
/**
 * Common validation schemas
 */
exports.commonSchemas = {
    /**
     * Pagination schema
     */
    pagination: joi_1.default.object({
        page: joi_1.default.number().integer().min(1).default(1).optional().messages({
            "number.integer": "Page must be an integer",
            "number.min": "Page must be at least 1",
        }),
        limit: joi_1.default.number()
            .integer()
            .min(1)
            .max(100)
            .default(20)
            .optional()
            .messages({
            "number.integer": "Limit must be an integer",
            "number.min": "Limit must be at least 1",
            "number.max": "Limit must not exceed 100",
        }),
        sortBy: joi_1.default.string().optional(),
        sortOrder: joi_1.default.string().valid("asc", "desc").default("desc").optional(),
    }),
    /**
     * Search schema
     */
    search: joi_1.default.object({
        query: joi_1.default.string().min(1).max(100).optional().messages({
            "string.min": "Search query must be at least 1 character",
            "string.max": "Search query must not exceed 100 characters",
        }),
    }),
    /**
     * UUID parameter schema
     */
    uuidParam: joi_1.default.object({
        id: joi_1.default.string().uuid().required().messages({
            "string.uuid": "ID must be a valid UUID",
            "any.required": "ID is required",
        }),
    }),
    /**
     * Date range schema
     */
    dateRange: joi_1.default.object({
        startDate: joi_1.default.date().optional(),
        endDate: joi_1.default.date().min(joi_1.default.ref("startDate")).optional().messages({
            "date.min": "End date must be after start date",
        }),
    }),
};
exports.default = {
    authSchemas: exports.authSchemas,
    userSchemas: exports.userSchemas,
    commonSchemas: exports.commonSchemas,
};
//# sourceMappingURL=authSchemas.js.map