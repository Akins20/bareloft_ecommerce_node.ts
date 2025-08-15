
/**
 * Application-wide constants for Bareloft e-commerce platform
 */

// Nigerian Market Constants
export const NIGERIAN_CONSTANTS = {
  COUNTRY_CODE: "NG",
  CURRENCY: "NGN",
  CURRENCY_SYMBOL: "₦",
  TIMEZONE: "Africa/Lagos",
  LOCALE: "en-NG",

  // Phone number patterns
  PHONE_PATTERNS: {
    INTERNATIONAL: /^\+234[789][01][0-9]{8}$/,
    LOCAL: /^0[789][01][0-9]{8}$/,
    RAW: /^234[789][01][0-9]{8}$/,
  },

  // Major mobile networks
  MOBILE_NETWORKS: {
    MTN: [
      "0803",
      "0806",
      "0813",
      "0814",
      "0816",
      "0903",
      "0906",
      "0913",
      "0916",
    ],
    AIRTEL: ["0802", "0808", "0812", "0901", "0902", "0907", "0911", "0912"],
    GLO: ["0805", "0807", "0811", "0815", "0905", "0915"],
    NINE_MOBILE: ["0809", "0817", "0818", "0908", "0909"],
  },

  // Business hours (WAT - West Africa Time)
  BUSINESS_HOURS: {
    WEEKDAYS: { start: "08:00", end: "18:00" },
    SATURDAY: { start: "09:00", end: "16:00" },
    SUNDAY: { start: "12:00", end: "17:00" },
  },

  // Major cities and delivery zones
  MAJOR_CITIES: [
    "Lagos",
    "Abuja",
    "Kano",
    "Ibadan",
    "Port Harcourt",
    "Benin City",
    "Kaduna",
    "Enugu",
    "Onitsha",
    "Warri",
  ],

  // Delivery zones with estimated days
  DELIVERY_ZONES: {
    LAGOS: { days: 1, fee: 1500 },
    ABUJA: { days: 2, fee: 2000 },
    MAJOR_CITIES: { days: 3, fee: 2500 },
    OTHER_STATES: { days: 5, fee: 3000 },
    REMOTE_AREAS: { days: 7, fee: 4000 },
  },
} as const;

// Authentication Constants
export const AUTH_CONSTANTS = {
  // OTP Configuration
  OTP: {
    LENGTH: 6,
    EXPIRY_MINUTES: 10,
    MAX_ATTEMPTS: 3,
    RATE_LIMIT_MINUTES: 15,
    RESEND_COOLDOWN_SECONDS: 60,
  },

  // JWT Configuration
  JWT: {
    ACCESS_TOKEN_EXPIRY: "15m",
    REFRESH_TOKEN_EXPIRY: "7d",
    ISSUER: "bareloft.com",
    ALGORITHM: "HS256" as const,
  },

  // Password Requirements
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
    BLOCKED_PATTERNS: [
      "password",
      "password123",
      "123456",
      "123456789",
      "qwerty",
      "abc123",
      "password1",
      "admin",
    ],
  },

  // Session Management
  SESSION: {
    MAX_CONCURRENT_SESSIONS: 5,
    IDLE_TIMEOUT_MINUTES: 30,
    ABSOLUTE_TIMEOUT_HOURS: 24,
    REMEMBER_ME_DAYS: 30,
  },
} as const;

// E-commerce Business Rules
export const BUSINESS_CONSTANTS = {
  // Order Configuration
  ORDER: {
    NUMBER_PREFIX: "BL",
    CANCELLATION_WINDOW_HOURS: 24,
    AUTO_CONFIRM_MINUTES: 30,
    DELIVERY_ESTIMATE_BUFFER_DAYS: 1,
    MAX_ITEMS_PER_ORDER: 50,
  },

  // Cart Configuration
  CART: {
    MAX_QUANTITY_PER_ITEM: 99,
    SESSION_EXPIRY_DAYS: 30,
    GUEST_CART_EXPIRY_HOURS: 24,
    MERGE_STRATEGY: "combine" as const,
    AUTO_SAVE_INTERVAL_SECONDS: 30,
  },

  // Inventory Management
  INVENTORY: {
    DEFAULT_LOW_STOCK_THRESHOLD: 10,
    RESERVATION_EXPIRY_MINUTES: 15,
    REORDER_POINT_MULTIPLIER: 2,
    MAX_RESERVED_PERCENTAGE: 80,
    STOCKOUT_GRACE_HOURS: 2,
  },

  // Pricing Rules
  PRICING: {
    MIN_PRODUCT_PRICE: 100, // ₦1.00
    MAX_PRODUCT_PRICE: 100000000, // ₦1,000,000
    TAX_RATE: 0, // VAT not applicable for this platform
    FREE_SHIPPING_THRESHOLD: 50000, // ₦50,000
    DEFAULT_SHIPPING_FEE: 2500, // ₦25.00
    MAX_DISCOUNT_PERCENTAGE: 90,
  },

  // Product Configuration
  PRODUCT: {
    MAX_IMAGES_PER_PRODUCT: 10,
    MAX_VARIANTS_PER_PRODUCT: 20,
    SKU_FORMAT_REGEX: /^[A-Z]{3,6}[0-9]{6,12}$/,
    SLUG_MAX_LENGTH: 100,
    DESCRIPTION_MAX_LENGTH: 5000,
    SHORT_DESCRIPTION_MAX_LENGTH: 500,
  },
} as const;

// Payment Constants
export const PAYMENT_CONSTANTS = {
  // Paystack Configuration
  PAYSTACK: {
    CURRENCY: "NGN",
    MIN_AMOUNT_KOBO: 5000, // ₦50.00 minimum
    MAX_AMOUNT_KOBO: 1000000000, // ₦10,000,000 maximum
    WEBHOOK_TOLERANCE_SECONDS: 600, // 10 minutes
    RETRY_ATTEMPTS: 3,
    TIMEOUT_SECONDS: 30,
  },

  // Payment Methods
  PAYMENT_METHODS: {
    CARD: {
      name: "Debit/Credit Card",
      fees: { percentage: 1.5, cap: 200000 }, // 1.5% capped at ₦2,000
      processing_time: "Instant",
    },
    BANK_TRANSFER: {
      name: "Bank Transfer",
      fees: { flat: 5000 }, // ₦50 flat fee
      processing_time: "10-30 minutes",
    },
    USSD: {
      name: "USSD",
      fees: { flat: 10000 }, // ₦100 flat fee
      processing_time: "Instant",
    },
  },

  // Refund Policy
  REFUND: {
    WINDOW_DAYS: 7,
    PROCESSING_DAYS: 5,
    MIN_REFUND_AMOUNT: 100, // ₦1.00
    PARTIAL_REFUND_THRESHOLD: 0.1, // 10% minimum for partial refunds
  },
} as const;

// File Upload Constants
export const UPLOAD_CONSTANTS = {
  // File Size Limits
  SIZE_LIMITS: {
    PRODUCT_IMAGE: 5 * 1024 * 1024, // 5MB
    AVATAR: 2 * 1024 * 1024, // 2MB
    DOCUMENT: 10 * 1024 * 1024, // 10MB
    BULK_IMPORT: 50 * 1024 * 1024, // 50MB
  },

  // Allowed Formats
  ALLOWED_FORMATS: {
    IMAGES: ["jpg", "jpeg", "png", "webp", "gif"],
    DOCUMENTS: ["pdf", "doc", "docx", "xls", "xlsx", "csv"],
    ARCHIVES: ["zip", "rar", "7z"],
  },

  // Image Processing
  IMAGE_PROCESSING: {
    THUMBNAIL_SIZE: { width: 300, height: 300 },
    MEDIUM_SIZE: { width: 600, height: 600 },
    LARGE_SIZE: { width: 1200, height: 1200 },
    QUALITY: 85,
    FORMAT: "webp" as const,
  },

  // Storage Configuration
  STORAGE: {
    BUCKET_NAME: "bareloft-assets",
    CDN_URL: "https://cdn.bareloft.com",
    CACHE_DURATION: 31536000, // 1 year in seconds
    FOLDER_STRUCTURE: {
      PRODUCTS: "products",
      AVATARS: "avatars",
      DOCUMENTS: "documents",
      TEMP: "temp",
    },
  },
} as const;

// API Configuration
export const API_CONSTANTS = {
  // Rate Limiting
  RATE_LIMITS: {
    GLOBAL: { windowMs: 15 * 60 * 1000, max: 1000 }, // 1000 requests per 15 minutes
    AUTH: { windowMs: 15 * 60 * 1000, max: 10 }, // 10 auth requests per 15 minutes
    OTP: { windowMs: 60 * 1000, max: 3 }, // 3 OTP requests per minute
    UPLOAD: { windowMs: 60 * 1000, max: 10 }, // 10 uploads per minute
    SEARCH: { windowMs: 60 * 1000, max: 100 }, // 100 searches per minute
  },

  // Pagination
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    DEFAULT_PAGE: 1,
  },

  // Caching
  CACHE_TTL: {
    PRODUCTS: 30 * 60, // 30 minutes
    CATEGORIES: 60 * 60, // 1 hour
    INVENTORY: 5 * 60, // 5 minutes
    USERS: 15 * 60, // 15 minutes
    ORDERS: 10 * 60, // 10 minutes
    ANALYTICS: 60 * 60, // 1 hour
    STATIC_CONTENT: 24 * 60 * 60, // 24 hours
  },

  // Response Headers
  HEADERS: {
    API_VERSION: "1.0",
    CONTENT_TYPE: "application/json",
    CHARSET: "utf-8",
    CACHE_CONTROL: "no-cache, no-store, must-revalidate",
    X_FRAME_OPTIONS: "DENY",
    X_CONTENT_TYPE_OPTIONS: "nosniff",
  },

  // Error Codes
  ERROR_CODES: {
    // Authentication
    INVALID_CREDENTIALS: "AUTH_001",
    TOKEN_EXPIRED: "AUTH_002",
    TOKEN_INVALID: "AUTH_003",
    OTP_EXPIRED: "AUTH_004",
    OTP_INVALID: "AUTH_005",
    ACCOUNT_LOCKED: "AUTH_006",

    // Validation
    VALIDATION_ERROR: "VAL_001",
    MISSING_FIELD: "VAL_002",
    INVALID_FORMAT: "VAL_003",
    OUT_OF_RANGE: "VAL_004",

    // Business Logic
    INSUFFICIENT_STOCK: "BIZ_001",
    ORDER_NOT_FOUND: "BIZ_002",
    PAYMENT_FAILED: "BIZ_003",
    INVALID_COUPON: "BIZ_004",
    PRODUCT_UNAVAILABLE: "BIZ_005",
    CART_EMPTY: "BIZ_006",

    // System
    DATABASE_ERROR: "SYS_001",
    EXTERNAL_SERVICE_ERROR: "SYS_002",
    FILE_UPLOAD_ERROR: "SYS_003",
    RATE_LIMIT_EXCEEDED: "SYS_004",
  },
} as const;

// Notification Constants
export const NOTIFICATION_CONSTANTS = {
  // Channels
  CHANNELS: {
    EMAIL: "email",
    SMS: "sms",
    PUSH: "push",
    IN_APP: "in_app",
  },

  // Types
  TYPES: {
    ORDER_CONFIRMATION: "order_confirmation",
    ORDER_SHIPPED: "order_shipped",
    ORDER_DELIVERED: "order_delivered",
    PAYMENT_SUCCESSFUL: "payment_successful",
    PAYMENT_FAILED: "payment_failed",
    LOW_STOCK_ALERT: "low_stock_alert",
    WELCOME_SERIES: "welcome_series",
    ABANDONED_CART: "abandoned_cart",
    PROMOTIONAL: "promotional",
  },

  // Timing
  TIMING: {
    IMMEDIATE: 0,
    DELAYED_5_MIN: 5 * 60,
    DELAYED_1_HOUR: 60 * 60,
    DELAYED_24_HOURS: 24 * 60 * 60,
    WEEKLY: 7 * 24 * 60 * 60,
  },

  // Templates
  EMAIL_TEMPLATES: {
    WELCOME: "welcome-email",
    ORDER_CONFIRMATION: "order-confirmation",
    ORDER_SHIPPED: "order-shipped",
    ORDER_DELIVERED: "order-delivered",
    PASSWORD_RESET: "password-reset",
    ABANDONED_CART: "abandoned-cart",
    LOW_STOCK: "low-stock-alert",
  },

  // SMS Templates
  SMS_TEMPLATES: {
    OTP_LOGIN: "Your Bareloft OTP: {{code}}. Valid for 10 minutes.",
    ORDER_CONFIRMED: "Order {{orderNumber}} confirmed. Track: {{trackingUrl}}",
    ORDER_SHIPPED: "Order {{orderNumber}} shipped! Delivery in {{days}} days.",
    PAYMENT_RECEIVED:
      "Payment of {{amount}} received for order {{orderNumber}}.",
  },
} as const;

// Analytics Constants
export const ANALYTICS_CONSTANTS = {
  // Event Types
  EVENTS: {
    PAGE_VIEW: "page_view",
    PRODUCT_VIEW: "product_view",
    ADD_TO_CART: "add_to_cart",
    REMOVE_FROM_CART: "remove_from_cart",
    CHECKOUT_START: "checkout_start",
    PURCHASE: "purchase",
    SEARCH: "search",
    USER_SIGNUP: "user_signup",
    USER_LOGIN: "user_login",
  },

  // Metrics
  METRICS: {
    CONVERSION_RATE: "conversion_rate",
    AVERAGE_ORDER_VALUE: "average_order_value",
    CART_ABANDONMENT_RATE: "cart_abandonment_rate",
    CUSTOMER_LIFETIME_VALUE: "customer_lifetime_value",
    BOUNCE_RATE: "bounce_rate",
    TIME_ON_SITE: "time_on_site",
  },

  // Reporting Periods
  PERIODS: {
    REAL_TIME: "real_time",
    HOURLY: "hourly",
    DAILY: "daily",
    WEEKLY: "weekly",
    MONTHLY: "monthly",
    QUARTERLY: "quarterly",
    YEARLY: "yearly",
  },

  // Data Retention
  RETENTION: {
    RAW_EVENTS: 90, // days
    AGGREGATED_HOURLY: 365, // days
    AGGREGATED_DAILY: 1095, // 3 years
    AGGREGATED_MONTHLY: -1, // forever
  },
} as const;

// Security Constants
export const SECURITY_CONSTANTS = {
  // Password Policy
  PASSWORD_POLICY: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_MIXED_CASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
    PREVENT_COMMON_PASSWORDS: true,
    PREVENT_PERSONAL_INFO: true,
    HISTORY_COUNT: 5, // Remember last 5 passwords
  },

  // Account Security
  ACCOUNT_SECURITY: {
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 30,
    PASSWORD_RESET_EXPIRY_HOURS: 1,
    EMAIL_VERIFICATION_EXPIRY_HOURS: 24,
    SESSION_TIMEOUT_MINUTES: 30,
  },

  // Data Encryption
  ENCRYPTION: {
    ALGORITHM: "aes-256-gcm",
    KEY_LENGTH: 32,
    IV_LENGTH: 16,
    TAG_LENGTH: 16,
    SALT_LENGTH: 32,
    ITERATIONS: 100000,
  },

  // CORS Settings
  CORS: {
    ALLOWED_ORIGINS: ["https://bareloft.com", "https://www.bareloft.com"],
    ALLOWED_METHODS: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    ALLOWED_HEADERS: ["Content-Type", "Authorization", "X-CSRF-Token"],
    CREDENTIALS: true,
    MAX_AGE: 86400, // 24 hours
  },
} as const;

// Monitoring Constants
export const MONITORING_CONSTANTS = {
  // Health Check
  HEALTH_CHECK: {
    INTERVAL_SECONDS: 30,
    TIMEOUT_SECONDS: 5,
    FAILURE_THRESHOLD: 3,
    SUCCESS_THRESHOLD: 2,
  },

  // Performance Metrics
  PERFORMANCE: {
    API_RESPONSE_TIME_THRESHOLD_MS: 1000,
    DATABASE_QUERY_TIME_THRESHOLD_MS: 500,
    ERROR_RATE_THRESHOLD_PERCENTAGE: 1,
    UPTIME_THRESHOLD_PERCENTAGE: 99.9,
  },

  // Alerts
  ALERTS: {
    HIGH_ERROR_RATE: "high_error_rate",
    SLOW_RESPONSE_TIME: "slow_response_time",
    LOW_DISK_SPACE: "low_disk_space",
    HIGH_MEMORY_USAGE: "high_memory_usage",
    DATABASE_CONNECTION_ISSUES: "database_connection_issues",
  },

  // Log Levels
  LOG_LEVELS: {
    ERROR: "error",
    WARN: "warn",
    INFO: "info",
    DEBUG: "debug",
    TRACE: "trace",
  },
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  // E-commerce Features
  PRODUCT_REVIEWS: true,
  WISHLIST: true,
  PRODUCT_COMPARISON: false,
  SOCIAL_LOGIN: false,
  GUEST_CHECKOUT: true,

  // Payment Features
  SAVE_PAYMENT_METHODS: true,
  INSTALLMENT_PAYMENTS: false,
  CRYPTO_PAYMENTS: false,

  // Marketing Features
  REFERRAL_PROGRAM: false,
  LOYALTY_POINTS: false,
  DYNAMIC_PRICING: false,
  PERSONALIZED_RECOMMENDATIONS: false,

  // Admin Features
  BULK_OPERATIONS: true,
  ADVANCED_ANALYTICS: true,
  INVENTORY_FORECASTING: false,

  // Experimental Features
  AI_CHATBOT: false,
  VOICE_SEARCH: false,
  AR_PRODUCT_VIEW: false,
} as const;

// Environment-specific Constants
export const ENVIRONMENT_CONSTANTS = {
  DEVELOPMENT: {
    LOG_LEVEL: "debug",
    ENABLE_CORS: true,
    MOCK_PAYMENTS: true,
    SEED_DATA: true,
    DEBUG_MODE: true,
  },

  STAGING: {
    LOG_LEVEL: "info",
    ENABLE_CORS: true,
    MOCK_PAYMENTS: false,
    SEED_DATA: false,
    DEBUG_MODE: false,
  },

  PRODUCTION: {
    LOG_LEVEL: "warn",
    ENABLE_CORS: false,
    MOCK_PAYMENTS: false,
    SEED_DATA: false,
    DEBUG_MODE: false,
  },
} as const;

// Export all constants grouped by category
export const CONSTANTS = {
  NIGERIAN: NIGERIAN_CONSTANTS,
  AUTH: AUTH_CONSTANTS,
  BUSINESS: BUSINESS_CONSTANTS,
  PAYMENT: PAYMENT_CONSTANTS,
  UPLOAD: UPLOAD_CONSTANTS,
  API: API_CONSTANTS,
  NOTIFICATION: NOTIFICATION_CONSTANTS,
  ANALYTICS: ANALYTICS_CONSTANTS,
  SECURITY: SECURITY_CONSTANTS,
  MONITORING: MONITORING_CONSTANTS,
  FEATURES: FEATURE_FLAGS,
  ENVIRONMENT: ENVIRONMENT_CONSTANTS,
} as const;

// Utility functions for constants
export const getConstant = (
  category: keyof typeof CONSTANTS,
  key: string
): any => {
  return (CONSTANTS[category] as any)[key];
};

export const isFeatureEnabled = (
  feature: keyof typeof FEATURE_FLAGS
): boolean => {
  return FEATURE_FLAGS[feature];
};

export const getEnvironmentConfig = (
  env: "DEVELOPMENT" | "STAGING" | "PRODUCTION"
) => {
  return ENVIRONMENT_CONSTANTS[env];
};

export default CONSTANTS;
