import Joi from "joi";
import { NIGERIAN_STATES } from "../../../types/common.types";

/**
 * Nigerian phone number validation pattern
 */
const nigerianPhonePattern = /^(\+234|234|0)[789][01][0-9]{8}$/;

/**
 * Authentication validation schemas
 */
export const authSchemas = {
  /**
   * Request OTP schema
   */
  requestOTP: Joi.object({
    phoneNumber: Joi.string()
      .pattern(nigerianPhonePattern)
      .required()
      .messages({
        "string.pattern.base":
          "Phone number must be a valid Nigerian number (+234XXXXXXXXXX)",
        "any.required": "Phone number is required",
      }),
    purpose: Joi.string()
      .valid("login", "signup", "password_reset", "phone_verification")
      .required()
      .messages({
        "any.only":
          "Purpose must be one of: login, signup, password_reset, phone_verification",
        "any.required": "Purpose is required",
      }),
  }),

  /**
   * Verify OTP schema
   */
  verifyOTP: Joi.object({
    phoneNumber: Joi.string()
      .pattern(nigerianPhonePattern)
      .required()
      .messages({
        "string.pattern.base": "Phone number must be a valid Nigerian number",
        "any.required": "Phone number is required",
      }),
    code: Joi.string()
      .length(6)
      .pattern(/^[0-9]+$/)
      .required()
      .messages({
        "string.length": "OTP code must be exactly 6 digits",
        "string.pattern.base": "OTP code must contain only numbers",
        "any.required": "OTP code is required",
      }),
    purpose: Joi.string()
      .valid("login", "signup", "password_reset", "phone_verification")
      .required(),
  }),

  /**
   * User signup schema
   */
  signup: Joi.object({
    phoneNumber: Joi.string()
      .pattern(nigerianPhonePattern)
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
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .optional()
      .messages({
        "string.email": "Email must be a valid email address",
      }),
    otpCode: Joi.string()
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
  login: Joi.object({
    phoneNumber: Joi.string()
      .pattern(nigerianPhonePattern)
      .required()
      .messages({
        "string.pattern.base": "Phone number must be a valid Nigerian number",
        "any.required": "Phone number is required",
      }),
    otpCode: Joi.string()
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
  refreshToken: Joi.object({
    refreshToken: Joi.string().required().messages({
      "any.required": "Refresh token is required",
    }),
  }),

  /**
   * Password reset schema (for future implementation)
   */
  resetPassword: Joi.object({
    phoneNumber: Joi.string().pattern(nigerianPhonePattern).required(),
    otpCode: Joi.string()
      .length(6)
      .pattern(/^[0-9]+$/)
      .required(),
    newPassword: Joi.string()
      .min(8)
      .max(128)
      .pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/
      )
      .required()
      .messages({
        "string.min": "Password must be at least 8 characters long",
        "string.max": "Password must not exceed 128 characters",
        "string.pattern.base":
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      }),
  }),

  /**
   * Change password schema
   */
  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      "any.required": "Current password is required",
    }),
    newPassword: Joi.string()
      .min(8)
      .max(128)
      .pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/
      )
      .required()
      .messages({
        "string.min": "New password must be at least 8 characters long",
        "string.max": "New password must not exceed 128 characters",
        "string.pattern.base":
          "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      }),
  }),
};

/**
 * User profile validation schemas
 */
export const userSchemas = {
  /**
   * Update profile schema
   */
  updateProfile: Joi.object({
    firstName: Joi.string()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-Z\s'-]+$/)
      .optional()
      .messages({
        "string.min": "First name must be at least 2 characters",
        "string.max": "First name must not exceed 50 characters",
        "string.pattern.base":
          "First name can only contain letters, spaces, hyphens and apostrophes",
      }),
    lastName: Joi.string()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-Z\s'-]+$/)
      .optional()
      .messages({
        "string.min": "Last name must be at least 2 characters",
        "string.max": "Last name must not exceed 50 characters",
        "string.pattern.base":
          "Last name can only contain letters, spaces, hyphens and apostrophes",
      }),
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .optional()
      .messages({
        "string.email": "Email must be a valid email address",
      }),
    avatar: Joi.string().uri().optional().messages({
      "string.uri": "Avatar must be a valid URL",
    }),
    dateOfBirth: Joi.date().max("now").optional().messages({
      "date.max": "Date of birth cannot be in the future",
    }),
    gender: Joi.string()
      .valid("male", "female", "other", "prefer_not_to_say")
      .optional(),
  }),

  /**
   * Create address schema
   */
  createAddress: Joi.object({
    type: Joi.string().valid("shipping", "billing").required().messages({
      "any.only": "Address type must be either shipping or billing",
      "any.required": "Address type is required",
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
    company: Joi.string().max(100).optional().messages({
      "string.max": "Company name must not exceed 100 characters",
    }),
    addressLine1: Joi.string().min(5).max(100).required().messages({
      "string.min": "Address line 1 must be at least 5 characters",
      "string.max": "Address line 1 must not exceed 100 characters",
      "any.required": "Address line 1 is required",
    }),
    addressLine2: Joi.string().max(100).optional().messages({
      "string.max": "Address line 2 must not exceed 100 characters",
    }),
    city: Joi.string().min(2).max(50).required().messages({
      "string.min": "City must be at least 2 characters",
      "string.max": "City must not exceed 50 characters",
      "any.required": "City is required",
    }),
    state: Joi.string()
      .valid(...NIGERIAN_STATES)
      .required()
      .messages({
        "any.only": "State must be a valid Nigerian state",
        "any.required": "State is required",
      }),
    postalCode: Joi.string()
      .pattern(/^[0-9]{6}$/)
      .optional()
      .messages({
        "string.pattern.base": "Postal code must be 6 digits",
      }),
    phoneNumber: Joi.string()
      .pattern(nigerianPhonePattern)
      .required()
      .messages({
        "string.pattern.base": "Phone number must be a valid Nigerian number",
        "any.required": "Phone number is required",
      }),
    isDefault: Joi.boolean().optional().default(false),
  }),

  /**
   * Update address schema
   */
  updateAddress: Joi.object({
    type: Joi.string().valid("shipping", "billing").optional(),
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
    company: Joi.string().max(100).optional(),
    addressLine1: Joi.string().min(5).max(100).optional(),
    addressLine2: Joi.string().max(100).optional(),
    city: Joi.string().min(2).max(50).optional(),
    state: Joi.string()
      .valid(...NIGERIAN_STATES)
      .optional(),
    postalCode: Joi.string()
      .pattern(/^[0-9]{6}$/)
      .optional(),
    phoneNumber: Joi.string().pattern(nigerianPhonePattern).optional(),
    isDefault: Joi.boolean().optional(),
  }),
};

/**
 * Common validation schemas
 */
export const commonSchemas = {
  /**
   * Pagination schema
   */
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1).optional().messages({
      "number.integer": "Page must be an integer",
      "number.min": "Page must be at least 1",
    }),
    limit: Joi.number()
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
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid("asc", "desc").default("desc").optional(),
  }),

  /**
   * Search schema
   */
  search: Joi.object({
    query: Joi.string().min(1).max(100).optional().messages({
      "string.min": "Search query must be at least 1 character",
      "string.max": "Search query must not exceed 100 characters",
    }),
  }),

  /**
   * UUID parameter schema
   */
  uuidParam: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.uuid": "ID must be a valid UUID",
      "any.required": "ID is required",
    }),
  }),

  /**
   * Date range schema
   */
  dateRange: Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().min(Joi.ref("startDate")).optional().messages({
      "date.min": "End date must be after start date",
    }),
  }),
};

export default {
  authSchemas,
  userSchemas,
  commonSchemas,
};
