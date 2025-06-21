import Joi from "joi";
import { NIGERIAN_STATES } from "../../../types/common.types";

const nigerianPhonePattern = /^(\+234|234|0)[789][01][0-9]{8}$/;

/**
 * Order validation schemas
 */
export const orderSchemas = {
  /**
   * Create order schema
   */
  createOrder: Joi.object({
    shippingAddress: Joi.object({
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

      company: Joi.string().max(100).optional().allow("").messages({
        "string.max": "Company name must not exceed 100 characters",
      }),

      addressLine1: Joi.string().min(5).max(100).required().messages({
        "string.min": "Address line 1 must be at least 5 characters",
        "string.max": "Address line 1 must not exceed 100 characters",
        "any.required": "Address line 1 is required",
      }),

      addressLine2: Joi.string().max(100).optional().allow("").messages({
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
        .allow("")
        .messages({
          "string.pattern.base": "Postal code must be 6 digits",
        }),

      country: Joi.string().valid("NG", "Nigeria").optional().default("NG"),

      phoneNumber: Joi.string()
        .pattern(nigerianPhonePattern)
        .required()
        .messages({
          "string.pattern.base": "Phone number must be a valid Nigerian number",
          "any.required": "Phone number is required",
        }),
    }).required(),

    billingAddress: Joi.object({
      firstName: Joi.string()
        .min(2)
        .max(50)
        .pattern(/^[a-zA-Z\s'-]+$/)
        .required(),
      lastName: Joi.string()
        .min(2)
        .max(50)
        .pattern(/^[a-zA-Z\s'-]+$/)
        .required(),
      company: Joi.string().max(100).optional().allow(""),
      addressLine1: Joi.string().min(5).max(100).required(),
      addressLine2: Joi.string().max(100).optional().allow(""),
      city: Joi.string().min(2).max(50).required(),
      state: Joi.string()
        .valid(...NIGERIAN_STATES)
        .required(),
      postalCode: Joi.string()
        .pattern(/^[0-9]{6}$/)
        .optional()
        .allow(""),
      country: Joi.string().valid("NG", "Nigeria").optional().default("NG"),
      phoneNumber: Joi.string().pattern(nigerianPhonePattern).required(),
    }).optional(), // If not provided, use shipping address

    paymentMethod: Joi.string()
      .valid("card", "bank_transfer", "ussd", "wallet")
      .required()
      .messages({
        "any.only":
          "Payment method must be one of: card, bank_transfer, ussd, wallet",
        "any.required": "Payment method is required",
      }),

    customerNotes: Joi.string().max(500).optional().allow("").messages({
      "string.max": "Customer notes must not exceed 500 characters",
    }),

    couponCode: Joi.string().max(50).optional().allow("").messages({
      "string.max": "Coupon code must not exceed 50 characters",
    }),
  }),

  /**
   * Update order status schema (Admin)
   */
  updateOrderStatus: Joi.object({
    status: Joi.string()
      .valid(
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded"
      )
      .required()
      .messages({
        "any.only":
          "Status must be one of: pending, confirmed, processing, shipped, delivered, cancelled, refunded",
        "any.required": "Status is required",
      }),

    adminNotes: Joi.string().max(1000).optional().allow("").messages({
      "string.max": "Admin notes must not exceed 1000 characters",
    }),

    trackingNumber: Joi.string().max(100).optional().allow("").messages({
      "string.max": "Tracking number must not exceed 100 characters",
    }),

    estimatedDelivery: Joi.date().min("now").optional().messages({
      "date.min": "Estimated delivery date must be in the future",
    }),
  }),

  /**
   * Order query parameters schema
   */
  orderQuery: Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
    status: Joi.string()
      .valid(
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded"
      )
      .optional(),
    paymentStatus: Joi.string()
      .valid("pending", "paid", "failed", "refunded", "partial_refund")
      .optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().min(Joi.ref("startDate")).optional(),
    search: Joi.string().max(100).optional().allow(""),
    sortBy: Joi.string()
      .valid("createdAt", "totalAmount", "status")
      .optional()
      .default("createdAt"),
    sortOrder: Joi.string().valid("asc", "desc").optional().default("desc"),
    userId: Joi.string().uuid().optional(),
  }),

  /**
   * Cancel order schema
   */
  cancelOrder: Joi.object({
    reason: Joi.string().max(500).required().messages({
      "string.max": "Cancellation reason must not exceed 500 characters",
      "any.required": "Cancellation reason is required",
    }),
  }),
};

/**
 * Cart validation schemas
 */
export const cartSchemas = {
  /**
   * Add to cart schema
   */
  addToCart: Joi.object({
    productId: Joi.string().uuid().required().messages({
      "string.uuid": "Product ID must be a valid UUID",
      "any.required": "Product ID is required",
    }),

    quantity: Joi.number().integer().min(1).max(99).required().messages({
      "number.integer": "Quantity must be a whole number",
      "number.min": "Quantity must be at least 1",
      "number.max": "Quantity must not exceed 99",
      "any.required": "Quantity is required",
    }),
  }),

  /**
   * Update cart item schema
   */
  updateCartItem: Joi.object({
    productId: Joi.string().uuid().required().messages({
      "string.uuid": "Product ID must be a valid UUID",
      "any.required": "Product ID is required",
    }),

    quantity: Joi.number().integer().min(0).max(99).required().messages({
      "number.integer": "Quantity must be a whole number",
      "number.min": "Quantity must be at least 0 (0 to remove)",
      "number.max": "Quantity must not exceed 99",
      "any.required": "Quantity is required",
    }),
  }),

  /**
   * Apply coupon schema
   */
  applyCoupon: Joi.object({
    couponCode: Joi.string().min(3).max(50).required().messages({
      "string.min": "Coupon code must be at least 3 characters",
      "string.max": "Coupon code must not exceed 50 characters",
      "any.required": "Coupon code is required",
    }),
  }),

  /**
   * Update shipping address for cart
   */
  updateShipping: Joi.object({
    state: Joi.string()
      .valid(...NIGERIAN_STATES)
      .required()
      .messages({
        "any.only": "State must be a valid Nigerian state",
        "any.required": "State is required",
      }),

    city: Joi.string().min(2).max(50).required().messages({
      "string.min": "City must be at least 2 characters",
      "string.max": "City must not exceed 50 characters",
      "any.required": "City is required",
    }),

    postalCode: Joi.string()
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
export const checkoutSchemas = {
  /**
   * Initialize checkout schema
   */
  initializeCheckout: Joi.object({
    cartId: Joi.string().uuid().optional().messages({
      "string.uuid": "Cart ID must be a valid UUID",
    }),

    items: Joi.array()
      .items(
        Joi.object({
          productId: Joi.string().uuid().required(),
          quantity: Joi.number().integer().min(1).max(99).required(),
        })
      )
      .min(1)
      .max(50)
      .when("cartId", {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.required(),
      })
      .messages({
        "array.min": "At least 1 item is required",
        "array.max": "Maximum 50 items allowed per order",
      }),
  }),

  /**
   * Guest checkout schema
   */
  guestCheckout: Joi.object({
    customerInfo: Joi.object({
      firstName: Joi.string()
        .min(2)
        .max(50)
        .pattern(/^[a-zA-Z\s'-]+$/)
        .required(),
      lastName: Joi.string()
        .min(2)
        .max(50)
        .pattern(/^[a-zA-Z\s'-]+$/)
        .required(),
      email: Joi.string().email().required(),
      phoneNumber: Joi.string().pattern(nigerianPhonePattern).required(),
    }).required(),

    items: Joi.array()
      .items(
        Joi.object({
          productId: Joi.string().uuid().required(),
          quantity: Joi.number().integer().min(1).max(99).required(),
        })
      )
      .min(1)
      .max(50)
      .required(),

    shippingAddress: Joi.object({
      firstName: Joi.string()
        .min(2)
        .max(50)
        .pattern(/^[a-zA-Z\s'-]+$/)
        .required(),
      lastName: Joi.string()
        .min(2)
        .max(50)
        .pattern(/^[a-zA-Z\s'-]+$/)
        .required(),
      company: Joi.string().max(100).optional().allow(""),
      addressLine1: Joi.string().min(5).max(100).required(),
      addressLine2: Joi.string().max(100).optional().allow(""),
      city: Joi.string().min(2).max(50).required(),
      state: Joi.string()
        .valid(...NIGERIAN_STATES)
        .required(),
      postalCode: Joi.string()
        .pattern(/^[0-9]{6}$/)
        .optional()
        .allow(""),
      country: Joi.string().valid("NG", "Nigeria").optional().default("NG"),
      phoneNumber: Joi.string().pattern(nigerianPhonePattern).required(),
    }).required(),

    paymentMethod: Joi.string()
      .valid("card", "bank_transfer", "ussd", "wallet")
      .required(),
  }),
};

/**
 * Payment validation schemas
 */
export const paymentSchemas = {
  /**
   * Initialize payment schema
   */
  initializePayment: Joi.object({
    orderId: Joi.string().uuid().required().messages({
      "string.uuid": "Order ID must be a valid UUID",
      "any.required": "Order ID is required",
    }),

    paymentMethod: Joi.string()
      .valid("card", "bank_transfer", "ussd", "wallet")
      .required()
      .messages({
        "any.only":
          "Payment method must be one of: card, bank_transfer, ussd, wallet",
        "any.required": "Payment method is required",
      }),

    callbackUrl: Joi.string().uri().optional().messages({
      "string.uri": "Callback URL must be a valid URL",
    }),

    metadata: Joi.object().optional(),
  }),

  /**
   * Verify payment schema
   */
  verifyPayment: Joi.object({
    reference: Joi.string().required().messages({
      "any.required": "Payment reference is required",
    }),
  }),

  /**
   * Process refund schema
   */
  processRefund: Joi.object({
    transactionId: Joi.string().uuid().required().messages({
      "string.uuid": "Transaction ID must be a valid UUID",
      "any.required": "Transaction ID is required",
    }),

    amount: Joi.number().min(1).optional().messages({
      "number.min": "Refund amount must be at least ₦0.01",
    }),

    reason: Joi.string().max(500).required().messages({
      "string.max": "Refund reason must not exceed 500 characters",
      "any.required": "Refund reason is required",
    }),

    metadata: Joi.object().optional(),
  }),
};

/**
 * Shipping validation schemas
 */
export const shippingSchemas = {
  /**
   * Calculate shipping schema
   */
  calculateShipping: Joi.object({
    items: Joi.array()
      .items(
        Joi.object({
          productId: Joi.string().uuid().required(),
          quantity: Joi.number().integer().min(1).required(),
          weight: Joi.number().min(0).optional(),
        })
      )
      .min(1)
      .required()
      .messages({
        "array.min": "At least 1 item is required for shipping calculation",
      }),

    destination: Joi.object({
      state: Joi.string()
        .valid(...NIGERIAN_STATES)
        .required(),
      city: Joi.string().min(2).max(50).required(),
      postalCode: Joi.string()
        .pattern(/^[0-9]{6}$/)
        .optional()
        .allow(""),
    }).required(),
  }),

  /**
   * Update tracking schema
   */
  updateTracking: Joi.object({
    orderId: Joi.string().uuid().required().messages({
      "string.uuid": "Order ID must be a valid UUID",
      "any.required": "Order ID is required",
    }),

    trackingNumber: Joi.string().max(100).required().messages({
      "string.max": "Tracking number must not exceed 100 characters",
      "any.required": "Tracking number is required",
    }),

    carrier: Joi.string().max(100).optional().messages({
      "string.max": "Carrier name must not exceed 100 characters",
    }),

    estimatedDelivery: Joi.date().min("now").optional().messages({
      "date.min": "Estimated delivery must be in the future",
    }),

    trackingUrl: Joi.string().uri().optional().messages({
      "string.uri": "Tracking URL must be a valid URL",
    }),
  }),
};

/**
 * Order analytics schemas
 */
export const orderAnalyticsSchemas = {
  /**
   * Order analytics query schema
   */
  analyticsQuery: Joi.object({
    startDate: Joi.date().required().messages({
      "any.required": "Start date is required",
    }),

    endDate: Joi.date().min(Joi.ref("startDate")).required().messages({
      "date.min": "End date must be after start date",
      "any.required": "End date is required",
    }),

    groupBy: Joi.string()
      .valid("day", "week", "month", "year")
      .optional()
      .default("day"),

    status: Joi.array()
      .items(
        Joi.string().valid(
          "pending",
          "confirmed",
          "processing",
          "shipped",
          "delivered",
          "cancelled",
          "refunded"
        )
      )
      .optional(),

    paymentMethod: Joi.array()
      .items(Joi.string().valid("card", "bank_transfer", "ussd", "wallet"))
      .optional(),

    includeRefunds: Joi.boolean().optional().default(false),
  }),

  /**
   * Sales report schema
   */
  salesReportQuery: Joi.object({
    period: Joi.string()
      .valid(
        "today",
        "yesterday",
        "last_7_days",
        "last_30_days",
        "this_month",
        "last_month",
        "custom"
      )
      .required(),

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

    includeDetails: Joi.boolean().optional().default(false),

    format: Joi.string().valid("json", "csv", "pdf").optional().default("json"),
  }),
};

export default {
  orderSchemas,
  cartSchemas,
  checkoutSchemas,
  paymentSchemas,
  shippingSchemas,
  orderAnalyticsSchemas,
};
