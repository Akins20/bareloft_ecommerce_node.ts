/**
 * Application-wide constants for Bareloft e-commerce platform
 */
export declare const NIGERIAN_CONSTANTS: {
    readonly COUNTRY_CODE: "NG";
    readonly CURRENCY: "NGN";
    readonly CURRENCY_SYMBOL: "₦";
    readonly TIMEZONE: "Africa/Lagos";
    readonly LOCALE: "en-NG";
    readonly PHONE_PATTERNS: {
        readonly INTERNATIONAL: RegExp;
        readonly LOCAL: RegExp;
        readonly RAW: RegExp;
    };
    readonly MOBILE_NETWORKS: {
        readonly MTN: readonly ["0803", "0806", "0813", "0814", "0816", "0903", "0906", "0913", "0916"];
        readonly AIRTEL: readonly ["0802", "0808", "0812", "0901", "0902", "0907", "0911", "0912"];
        readonly GLO: readonly ["0805", "0807", "0811", "0815", "0905", "0915"];
        readonly NINE_MOBILE: readonly ["0809", "0817", "0818", "0908", "0909"];
    };
    readonly BUSINESS_HOURS: {
        readonly WEEKDAYS: {
            readonly start: "08:00";
            readonly end: "18:00";
        };
        readonly SATURDAY: {
            readonly start: "09:00";
            readonly end: "16:00";
        };
        readonly SUNDAY: {
            readonly start: "12:00";
            readonly end: "17:00";
        };
    };
    readonly MAJOR_CITIES: readonly ["Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt", "Benin City", "Kaduna", "Enugu", "Onitsha", "Warri"];
    readonly DELIVERY_ZONES: {
        readonly LAGOS: {
            readonly days: 1;
            readonly fee: 1500;
        };
        readonly ABUJA: {
            readonly days: 2;
            readonly fee: 2000;
        };
        readonly MAJOR_CITIES: {
            readonly days: 3;
            readonly fee: 2500;
        };
        readonly OTHER_STATES: {
            readonly days: 5;
            readonly fee: 3000;
        };
        readonly REMOTE_AREAS: {
            readonly days: 7;
            readonly fee: 4000;
        };
    };
};
export declare const AUTH_CONSTANTS: {
    readonly OTP: {
        readonly LENGTH: 6;
        readonly EXPIRY_MINUTES: 10;
        readonly MAX_ATTEMPTS: 3;
        readonly RATE_LIMIT_MINUTES: 15;
        readonly RESEND_COOLDOWN_SECONDS: 60;
    };
    readonly JWT: {
        readonly ACCESS_TOKEN_EXPIRY: "15m";
        readonly REFRESH_TOKEN_EXPIRY: "7d";
        readonly ISSUER: "bareloft.com";
        readonly ALGORITHM: "HS256";
    };
    readonly PASSWORD: {
        readonly MIN_LENGTH: 8;
        readonly MAX_LENGTH: 128;
        readonly REQUIRE_UPPERCASE: true;
        readonly REQUIRE_LOWERCASE: true;
        readonly REQUIRE_NUMBERS: true;
        readonly REQUIRE_SPECIAL_CHARS: true;
        readonly BLOCKED_PATTERNS: readonly ["password", "password123", "123456", "123456789", "qwerty", "abc123", "password1", "admin"];
    };
    readonly SESSION: {
        readonly MAX_CONCURRENT_SESSIONS: 5;
        readonly IDLE_TIMEOUT_MINUTES: 30;
        readonly ABSOLUTE_TIMEOUT_HOURS: 24;
        readonly REMEMBER_ME_DAYS: 30;
    };
};
export declare const BUSINESS_CONSTANTS: {
    readonly ORDER: {
        readonly NUMBER_PREFIX: "BL";
        readonly CANCELLATION_WINDOW_HOURS: 24;
        readonly AUTO_CONFIRM_MINUTES: 30;
        readonly DELIVERY_ESTIMATE_BUFFER_DAYS: 1;
        readonly MAX_ITEMS_PER_ORDER: 50;
    };
    readonly CART: {
        readonly MAX_QUANTITY_PER_ITEM: 99;
        readonly SESSION_EXPIRY_DAYS: 30;
        readonly GUEST_CART_EXPIRY_HOURS: 24;
        readonly MERGE_STRATEGY: "combine";
        readonly AUTO_SAVE_INTERVAL_SECONDS: 30;
    };
    readonly INVENTORY: {
        readonly DEFAULT_LOW_STOCK_THRESHOLD: 10;
        readonly RESERVATION_EXPIRY_MINUTES: 15;
        readonly REORDER_POINT_MULTIPLIER: 2;
        readonly MAX_RESERVED_PERCENTAGE: 80;
        readonly STOCKOUT_GRACE_HOURS: 2;
    };
    readonly PRICING: {
        readonly MIN_PRODUCT_PRICE: 100;
        readonly MAX_PRODUCT_PRICE: 100000000;
        readonly TAX_RATE: 0.075;
        readonly FREE_SHIPPING_THRESHOLD: 50000;
        readonly DEFAULT_SHIPPING_FEE: 2500;
        readonly MAX_DISCOUNT_PERCENTAGE: 90;
    };
    readonly PRODUCT: {
        readonly MAX_IMAGES_PER_PRODUCT: 10;
        readonly MAX_VARIANTS_PER_PRODUCT: 20;
        readonly SKU_FORMAT_REGEX: RegExp;
        readonly SLUG_MAX_LENGTH: 100;
        readonly DESCRIPTION_MAX_LENGTH: 5000;
        readonly SHORT_DESCRIPTION_MAX_LENGTH: 500;
    };
};
export declare const PAYMENT_CONSTANTS: {
    readonly PAYSTACK: {
        readonly CURRENCY: "NGN";
        readonly MIN_AMOUNT_KOBO: 5000;
        readonly MAX_AMOUNT_KOBO: 1000000000;
        readonly WEBHOOK_TOLERANCE_SECONDS: 600;
        readonly RETRY_ATTEMPTS: 3;
        readonly TIMEOUT_SECONDS: 30;
    };
    readonly PAYMENT_METHODS: {
        readonly CARD: {
            readonly name: "Debit/Credit Card";
            readonly fees: {
                readonly percentage: 1.5;
                readonly cap: 200000;
            };
            readonly processing_time: "Instant";
        };
        readonly BANK_TRANSFER: {
            readonly name: "Bank Transfer";
            readonly fees: {
                readonly flat: 5000;
            };
            readonly processing_time: "10-30 minutes";
        };
        readonly USSD: {
            readonly name: "USSD";
            readonly fees: {
                readonly flat: 10000;
            };
            readonly processing_time: "Instant";
        };
    };
    readonly REFUND: {
        readonly WINDOW_DAYS: 7;
        readonly PROCESSING_DAYS: 5;
        readonly MIN_REFUND_AMOUNT: 100;
        readonly PARTIAL_REFUND_THRESHOLD: 0.1;
    };
};
export declare const UPLOAD_CONSTANTS: {
    readonly SIZE_LIMITS: {
        readonly PRODUCT_IMAGE: number;
        readonly AVATAR: number;
        readonly DOCUMENT: number;
        readonly BULK_IMPORT: number;
    };
    readonly ALLOWED_FORMATS: {
        readonly IMAGES: readonly ["jpg", "jpeg", "png", "webp", "gif"];
        readonly DOCUMENTS: readonly ["pdf", "doc", "docx", "xls", "xlsx", "csv"];
        readonly ARCHIVES: readonly ["zip", "rar", "7z"];
    };
    readonly IMAGE_PROCESSING: {
        readonly THUMBNAIL_SIZE: {
            readonly width: 300;
            readonly height: 300;
        };
        readonly MEDIUM_SIZE: {
            readonly width: 600;
            readonly height: 600;
        };
        readonly LARGE_SIZE: {
            readonly width: 1200;
            readonly height: 1200;
        };
        readonly QUALITY: 85;
        readonly FORMAT: "webp";
    };
    readonly STORAGE: {
        readonly BUCKET_NAME: "bareloft-assets";
        readonly CDN_URL: "https://cdn.bareloft.com";
        readonly CACHE_DURATION: 31536000;
        readonly FOLDER_STRUCTURE: {
            readonly PRODUCTS: "products";
            readonly AVATARS: "avatars";
            readonly DOCUMENTS: "documents";
            readonly TEMP: "temp";
        };
    };
};
export declare const API_CONSTANTS: {
    readonly RATE_LIMITS: {
        readonly GLOBAL: {
            readonly windowMs: number;
            readonly max: 1000;
        };
        readonly AUTH: {
            readonly windowMs: number;
            readonly max: 10;
        };
        readonly OTP: {
            readonly windowMs: number;
            readonly max: 3;
        };
        readonly UPLOAD: {
            readonly windowMs: number;
            readonly max: 10;
        };
        readonly SEARCH: {
            readonly windowMs: number;
            readonly max: 100;
        };
    };
    readonly PAGINATION: {
        readonly DEFAULT_LIMIT: 20;
        readonly MAX_LIMIT: 100;
        readonly DEFAULT_PAGE: 1;
    };
    readonly CACHE_TTL: {
        readonly PRODUCTS: number;
        readonly CATEGORIES: number;
        readonly INVENTORY: number;
        readonly USERS: number;
        readonly ORDERS: number;
        readonly ANALYTICS: number;
        readonly STATIC_CONTENT: number;
    };
    readonly HEADERS: {
        readonly API_VERSION: "1.0";
        readonly CONTENT_TYPE: "application/json";
        readonly CHARSET: "utf-8";
        readonly CACHE_CONTROL: "no-cache, no-store, must-revalidate";
        readonly X_FRAME_OPTIONS: "DENY";
        readonly X_CONTENT_TYPE_OPTIONS: "nosniff";
    };
    readonly ERROR_CODES: {
        readonly INVALID_CREDENTIALS: "AUTH_001";
        readonly TOKEN_EXPIRED: "AUTH_002";
        readonly TOKEN_INVALID: "AUTH_003";
        readonly OTP_EXPIRED: "AUTH_004";
        readonly OTP_INVALID: "AUTH_005";
        readonly ACCOUNT_LOCKED: "AUTH_006";
        readonly VALIDATION_ERROR: "VAL_001";
        readonly MISSING_FIELD: "VAL_002";
        readonly INVALID_FORMAT: "VAL_003";
        readonly OUT_OF_RANGE: "VAL_004";
        readonly INSUFFICIENT_STOCK: "BIZ_001";
        readonly ORDER_NOT_FOUND: "BIZ_002";
        readonly PAYMENT_FAILED: "BIZ_003";
        readonly INVALID_COUPON: "BIZ_004";
        readonly PRODUCT_UNAVAILABLE: "BIZ_005";
        readonly CART_EMPTY: "BIZ_006";
        readonly DATABASE_ERROR: "SYS_001";
        readonly EXTERNAL_SERVICE_ERROR: "SYS_002";
        readonly FILE_UPLOAD_ERROR: "SYS_003";
        readonly RATE_LIMIT_EXCEEDED: "SYS_004";
    };
};
export declare const NOTIFICATION_CONSTANTS: {
    readonly CHANNELS: {
        readonly EMAIL: "email";
        readonly SMS: "sms";
        readonly PUSH: "push";
        readonly IN_APP: "in_app";
    };
    readonly TYPES: {
        readonly ORDER_CONFIRMATION: "order_confirmation";
        readonly ORDER_SHIPPED: "order_shipped";
        readonly ORDER_DELIVERED: "order_delivered";
        readonly PAYMENT_SUCCESSFUL: "payment_successful";
        readonly PAYMENT_FAILED: "payment_failed";
        readonly LOW_STOCK_ALERT: "low_stock_alert";
        readonly WELCOME_SERIES: "welcome_series";
        readonly ABANDONED_CART: "abandoned_cart";
        readonly PROMOTIONAL: "promotional";
    };
    readonly TIMING: {
        readonly IMMEDIATE: 0;
        readonly DELAYED_5_MIN: number;
        readonly DELAYED_1_HOUR: number;
        readonly DELAYED_24_HOURS: number;
        readonly WEEKLY: number;
    };
    readonly EMAIL_TEMPLATES: {
        readonly WELCOME: "welcome-email";
        readonly ORDER_CONFIRMATION: "order-confirmation";
        readonly ORDER_SHIPPED: "order-shipped";
        readonly ORDER_DELIVERED: "order-delivered";
        readonly PASSWORD_RESET: "password-reset";
        readonly ABANDONED_CART: "abandoned-cart";
        readonly LOW_STOCK: "low-stock-alert";
    };
    readonly SMS_TEMPLATES: {
        readonly OTP_LOGIN: "Your Bareloft OTP: {{code}}. Valid for 10 minutes.";
        readonly ORDER_CONFIRMED: "Order {{orderNumber}} confirmed. Track: {{trackingUrl}}";
        readonly ORDER_SHIPPED: "Order {{orderNumber}} shipped! Delivery in {{days}} days.";
        readonly PAYMENT_RECEIVED: "Payment of {{amount}} received for order {{orderNumber}}.";
    };
};
export declare const ANALYTICS_CONSTANTS: {
    readonly EVENTS: {
        readonly PAGE_VIEW: "page_view";
        readonly PRODUCT_VIEW: "product_view";
        readonly ADD_TO_CART: "add_to_cart";
        readonly REMOVE_FROM_CART: "remove_from_cart";
        readonly CHECKOUT_START: "checkout_start";
        readonly PURCHASE: "purchase";
        readonly SEARCH: "search";
        readonly USER_SIGNUP: "user_signup";
        readonly USER_LOGIN: "user_login";
    };
    readonly METRICS: {
        readonly CONVERSION_RATE: "conversion_rate";
        readonly AVERAGE_ORDER_VALUE: "average_order_value";
        readonly CART_ABANDONMENT_RATE: "cart_abandonment_rate";
        readonly CUSTOMER_LIFETIME_VALUE: "customer_lifetime_value";
        readonly BOUNCE_RATE: "bounce_rate";
        readonly TIME_ON_SITE: "time_on_site";
    };
    readonly PERIODS: {
        readonly REAL_TIME: "real_time";
        readonly HOURLY: "hourly";
        readonly DAILY: "daily";
        readonly WEEKLY: "weekly";
        readonly MONTHLY: "monthly";
        readonly QUARTERLY: "quarterly";
        readonly YEARLY: "yearly";
    };
    readonly RETENTION: {
        readonly RAW_EVENTS: 90;
        readonly AGGREGATED_HOURLY: 365;
        readonly AGGREGATED_DAILY: 1095;
        readonly AGGREGATED_MONTHLY: -1;
    };
};
export declare const SECURITY_CONSTANTS: {
    readonly PASSWORD_POLICY: {
        readonly MIN_LENGTH: 8;
        readonly MAX_LENGTH: 128;
        readonly REQUIRE_MIXED_CASE: true;
        readonly REQUIRE_NUMBERS: true;
        readonly REQUIRE_SPECIAL_CHARS: true;
        readonly PREVENT_COMMON_PASSWORDS: true;
        readonly PREVENT_PERSONAL_INFO: true;
        readonly HISTORY_COUNT: 5;
    };
    readonly ACCOUNT_SECURITY: {
        readonly MAX_LOGIN_ATTEMPTS: 5;
        readonly LOCKOUT_DURATION_MINUTES: 30;
        readonly PASSWORD_RESET_EXPIRY_HOURS: 1;
        readonly EMAIL_VERIFICATION_EXPIRY_HOURS: 24;
        readonly SESSION_TIMEOUT_MINUTES: 30;
    };
    readonly ENCRYPTION: {
        readonly ALGORITHM: "aes-256-gcm";
        readonly KEY_LENGTH: 32;
        readonly IV_LENGTH: 16;
        readonly TAG_LENGTH: 16;
        readonly SALT_LENGTH: 32;
        readonly ITERATIONS: 100000;
    };
    readonly CORS: {
        readonly ALLOWED_ORIGINS: readonly ["https://bareloft.com", "https://www.bareloft.com"];
        readonly ALLOWED_METHODS: readonly ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"];
        readonly ALLOWED_HEADERS: readonly ["Content-Type", "Authorization", "X-CSRF-Token"];
        readonly CREDENTIALS: true;
        readonly MAX_AGE: 86400;
    };
};
export declare const MONITORING_CONSTANTS: {
    readonly HEALTH_CHECK: {
        readonly INTERVAL_SECONDS: 30;
        readonly TIMEOUT_SECONDS: 5;
        readonly FAILURE_THRESHOLD: 3;
        readonly SUCCESS_THRESHOLD: 2;
    };
    readonly PERFORMANCE: {
        readonly API_RESPONSE_TIME_THRESHOLD_MS: 1000;
        readonly DATABASE_QUERY_TIME_THRESHOLD_MS: 500;
        readonly ERROR_RATE_THRESHOLD_PERCENTAGE: 1;
        readonly UPTIME_THRESHOLD_PERCENTAGE: 99.9;
    };
    readonly ALERTS: {
        readonly HIGH_ERROR_RATE: "high_error_rate";
        readonly SLOW_RESPONSE_TIME: "slow_response_time";
        readonly LOW_DISK_SPACE: "low_disk_space";
        readonly HIGH_MEMORY_USAGE: "high_memory_usage";
        readonly DATABASE_CONNECTION_ISSUES: "database_connection_issues";
    };
    readonly LOG_LEVELS: {
        readonly ERROR: "error";
        readonly WARN: "warn";
        readonly INFO: "info";
        readonly DEBUG: "debug";
        readonly TRACE: "trace";
    };
};
export declare const FEATURE_FLAGS: {
    readonly PRODUCT_REVIEWS: true;
    readonly WISHLIST: true;
    readonly PRODUCT_COMPARISON: false;
    readonly SOCIAL_LOGIN: false;
    readonly GUEST_CHECKOUT: true;
    readonly SAVE_PAYMENT_METHODS: true;
    readonly INSTALLMENT_PAYMENTS: false;
    readonly CRYPTO_PAYMENTS: false;
    readonly REFERRAL_PROGRAM: false;
    readonly LOYALTY_POINTS: false;
    readonly DYNAMIC_PRICING: false;
    readonly PERSONALIZED_RECOMMENDATIONS: false;
    readonly BULK_OPERATIONS: true;
    readonly ADVANCED_ANALYTICS: true;
    readonly INVENTORY_FORECASTING: false;
    readonly AI_CHATBOT: false;
    readonly VOICE_SEARCH: false;
    readonly AR_PRODUCT_VIEW: false;
};
export declare const ENVIRONMENT_CONSTANTS: {
    readonly DEVELOPMENT: {
        readonly LOG_LEVEL: "debug";
        readonly ENABLE_CORS: true;
        readonly MOCK_PAYMENTS: true;
        readonly SEED_DATA: true;
        readonly DEBUG_MODE: true;
    };
    readonly STAGING: {
        readonly LOG_LEVEL: "info";
        readonly ENABLE_CORS: true;
        readonly MOCK_PAYMENTS: false;
        readonly SEED_DATA: false;
        readonly DEBUG_MODE: false;
    };
    readonly PRODUCTION: {
        readonly LOG_LEVEL: "warn";
        readonly ENABLE_CORS: false;
        readonly MOCK_PAYMENTS: false;
        readonly SEED_DATA: false;
        readonly DEBUG_MODE: false;
    };
};
export declare const CONSTANTS: {
    readonly NIGERIAN: {
        readonly COUNTRY_CODE: "NG";
        readonly CURRENCY: "NGN";
        readonly CURRENCY_SYMBOL: "₦";
        readonly TIMEZONE: "Africa/Lagos";
        readonly LOCALE: "en-NG";
        readonly PHONE_PATTERNS: {
            readonly INTERNATIONAL: RegExp;
            readonly LOCAL: RegExp;
            readonly RAW: RegExp;
        };
        readonly MOBILE_NETWORKS: {
            readonly MTN: readonly ["0803", "0806", "0813", "0814", "0816", "0903", "0906", "0913", "0916"];
            readonly AIRTEL: readonly ["0802", "0808", "0812", "0901", "0902", "0907", "0911", "0912"];
            readonly GLO: readonly ["0805", "0807", "0811", "0815", "0905", "0915"];
            readonly NINE_MOBILE: readonly ["0809", "0817", "0818", "0908", "0909"];
        };
        readonly BUSINESS_HOURS: {
            readonly WEEKDAYS: {
                readonly start: "08:00";
                readonly end: "18:00";
            };
            readonly SATURDAY: {
                readonly start: "09:00";
                readonly end: "16:00";
            };
            readonly SUNDAY: {
                readonly start: "12:00";
                readonly end: "17:00";
            };
        };
        readonly MAJOR_CITIES: readonly ["Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt", "Benin City", "Kaduna", "Enugu", "Onitsha", "Warri"];
        readonly DELIVERY_ZONES: {
            readonly LAGOS: {
                readonly days: 1;
                readonly fee: 1500;
            };
            readonly ABUJA: {
                readonly days: 2;
                readonly fee: 2000;
            };
            readonly MAJOR_CITIES: {
                readonly days: 3;
                readonly fee: 2500;
            };
            readonly OTHER_STATES: {
                readonly days: 5;
                readonly fee: 3000;
            };
            readonly REMOTE_AREAS: {
                readonly days: 7;
                readonly fee: 4000;
            };
        };
    };
    readonly AUTH: {
        readonly OTP: {
            readonly LENGTH: 6;
            readonly EXPIRY_MINUTES: 10;
            readonly MAX_ATTEMPTS: 3;
            readonly RATE_LIMIT_MINUTES: 15;
            readonly RESEND_COOLDOWN_SECONDS: 60;
        };
        readonly JWT: {
            readonly ACCESS_TOKEN_EXPIRY: "15m";
            readonly REFRESH_TOKEN_EXPIRY: "7d";
            readonly ISSUER: "bareloft.com";
            readonly ALGORITHM: "HS256";
        };
        readonly PASSWORD: {
            readonly MIN_LENGTH: 8;
            readonly MAX_LENGTH: 128;
            readonly REQUIRE_UPPERCASE: true;
            readonly REQUIRE_LOWERCASE: true;
            readonly REQUIRE_NUMBERS: true;
            readonly REQUIRE_SPECIAL_CHARS: true;
            readonly BLOCKED_PATTERNS: readonly ["password", "password123", "123456", "123456789", "qwerty", "abc123", "password1", "admin"];
        };
        readonly SESSION: {
            readonly MAX_CONCURRENT_SESSIONS: 5;
            readonly IDLE_TIMEOUT_MINUTES: 30;
            readonly ABSOLUTE_TIMEOUT_HOURS: 24;
            readonly REMEMBER_ME_DAYS: 30;
        };
    };
    readonly BUSINESS: {
        readonly ORDER: {
            readonly NUMBER_PREFIX: "BL";
            readonly CANCELLATION_WINDOW_HOURS: 24;
            readonly AUTO_CONFIRM_MINUTES: 30;
            readonly DELIVERY_ESTIMATE_BUFFER_DAYS: 1;
            readonly MAX_ITEMS_PER_ORDER: 50;
        };
        readonly CART: {
            readonly MAX_QUANTITY_PER_ITEM: 99;
            readonly SESSION_EXPIRY_DAYS: 30;
            readonly GUEST_CART_EXPIRY_HOURS: 24;
            readonly MERGE_STRATEGY: "combine";
            readonly AUTO_SAVE_INTERVAL_SECONDS: 30;
        };
        readonly INVENTORY: {
            readonly DEFAULT_LOW_STOCK_THRESHOLD: 10;
            readonly RESERVATION_EXPIRY_MINUTES: 15;
            readonly REORDER_POINT_MULTIPLIER: 2;
            readonly MAX_RESERVED_PERCENTAGE: 80;
            readonly STOCKOUT_GRACE_HOURS: 2;
        };
        readonly PRICING: {
            readonly MIN_PRODUCT_PRICE: 100;
            readonly MAX_PRODUCT_PRICE: 100000000;
            readonly TAX_RATE: 0.075;
            readonly FREE_SHIPPING_THRESHOLD: 50000;
            readonly DEFAULT_SHIPPING_FEE: 2500;
            readonly MAX_DISCOUNT_PERCENTAGE: 90;
        };
        readonly PRODUCT: {
            readonly MAX_IMAGES_PER_PRODUCT: 10;
            readonly MAX_VARIANTS_PER_PRODUCT: 20;
            readonly SKU_FORMAT_REGEX: RegExp;
            readonly SLUG_MAX_LENGTH: 100;
            readonly DESCRIPTION_MAX_LENGTH: 5000;
            readonly SHORT_DESCRIPTION_MAX_LENGTH: 500;
        };
    };
    readonly PAYMENT: {
        readonly PAYSTACK: {
            readonly CURRENCY: "NGN";
            readonly MIN_AMOUNT_KOBO: 5000;
            readonly MAX_AMOUNT_KOBO: 1000000000;
            readonly WEBHOOK_TOLERANCE_SECONDS: 600;
            readonly RETRY_ATTEMPTS: 3;
            readonly TIMEOUT_SECONDS: 30;
        };
        readonly PAYMENT_METHODS: {
            readonly CARD: {
                readonly name: "Debit/Credit Card";
                readonly fees: {
                    readonly percentage: 1.5;
                    readonly cap: 200000;
                };
                readonly processing_time: "Instant";
            };
            readonly BANK_TRANSFER: {
                readonly name: "Bank Transfer";
                readonly fees: {
                    readonly flat: 5000;
                };
                readonly processing_time: "10-30 minutes";
            };
            readonly USSD: {
                readonly name: "USSD";
                readonly fees: {
                    readonly flat: 10000;
                };
                readonly processing_time: "Instant";
            };
        };
        readonly REFUND: {
            readonly WINDOW_DAYS: 7;
            readonly PROCESSING_DAYS: 5;
            readonly MIN_REFUND_AMOUNT: 100;
            readonly PARTIAL_REFUND_THRESHOLD: 0.1;
        };
    };
    readonly UPLOAD: {
        readonly SIZE_LIMITS: {
            readonly PRODUCT_IMAGE: number;
            readonly AVATAR: number;
            readonly DOCUMENT: number;
            readonly BULK_IMPORT: number;
        };
        readonly ALLOWED_FORMATS: {
            readonly IMAGES: readonly ["jpg", "jpeg", "png", "webp", "gif"];
            readonly DOCUMENTS: readonly ["pdf", "doc", "docx", "xls", "xlsx", "csv"];
            readonly ARCHIVES: readonly ["zip", "rar", "7z"];
        };
        readonly IMAGE_PROCESSING: {
            readonly THUMBNAIL_SIZE: {
                readonly width: 300;
                readonly height: 300;
            };
            readonly MEDIUM_SIZE: {
                readonly width: 600;
                readonly height: 600;
            };
            readonly LARGE_SIZE: {
                readonly width: 1200;
                readonly height: 1200;
            };
            readonly QUALITY: 85;
            readonly FORMAT: "webp";
        };
        readonly STORAGE: {
            readonly BUCKET_NAME: "bareloft-assets";
            readonly CDN_URL: "https://cdn.bareloft.com";
            readonly CACHE_DURATION: 31536000;
            readonly FOLDER_STRUCTURE: {
                readonly PRODUCTS: "products";
                readonly AVATARS: "avatars";
                readonly DOCUMENTS: "documents";
                readonly TEMP: "temp";
            };
        };
    };
    readonly API: {
        readonly RATE_LIMITS: {
            readonly GLOBAL: {
                readonly windowMs: number;
                readonly max: 1000;
            };
            readonly AUTH: {
                readonly windowMs: number;
                readonly max: 10;
            };
            readonly OTP: {
                readonly windowMs: number;
                readonly max: 3;
            };
            readonly UPLOAD: {
                readonly windowMs: number;
                readonly max: 10;
            };
            readonly SEARCH: {
                readonly windowMs: number;
                readonly max: 100;
            };
        };
        readonly PAGINATION: {
            readonly DEFAULT_LIMIT: 20;
            readonly MAX_LIMIT: 100;
            readonly DEFAULT_PAGE: 1;
        };
        readonly CACHE_TTL: {
            readonly PRODUCTS: number;
            readonly CATEGORIES: number;
            readonly INVENTORY: number;
            readonly USERS: number;
            readonly ORDERS: number;
            readonly ANALYTICS: number;
            readonly STATIC_CONTENT: number;
        };
        readonly HEADERS: {
            readonly API_VERSION: "1.0";
            readonly CONTENT_TYPE: "application/json";
            readonly CHARSET: "utf-8";
            readonly CACHE_CONTROL: "no-cache, no-store, must-revalidate";
            readonly X_FRAME_OPTIONS: "DENY";
            readonly X_CONTENT_TYPE_OPTIONS: "nosniff";
        };
        readonly ERROR_CODES: {
            readonly INVALID_CREDENTIALS: "AUTH_001";
            readonly TOKEN_EXPIRED: "AUTH_002";
            readonly TOKEN_INVALID: "AUTH_003";
            readonly OTP_EXPIRED: "AUTH_004";
            readonly OTP_INVALID: "AUTH_005";
            readonly ACCOUNT_LOCKED: "AUTH_006";
            readonly VALIDATION_ERROR: "VAL_001";
            readonly MISSING_FIELD: "VAL_002";
            readonly INVALID_FORMAT: "VAL_003";
            readonly OUT_OF_RANGE: "VAL_004";
            readonly INSUFFICIENT_STOCK: "BIZ_001";
            readonly ORDER_NOT_FOUND: "BIZ_002";
            readonly PAYMENT_FAILED: "BIZ_003";
            readonly INVALID_COUPON: "BIZ_004";
            readonly PRODUCT_UNAVAILABLE: "BIZ_005";
            readonly CART_EMPTY: "BIZ_006";
            readonly DATABASE_ERROR: "SYS_001";
            readonly EXTERNAL_SERVICE_ERROR: "SYS_002";
            readonly FILE_UPLOAD_ERROR: "SYS_003";
            readonly RATE_LIMIT_EXCEEDED: "SYS_004";
        };
    };
    readonly NOTIFICATION: {
        readonly CHANNELS: {
            readonly EMAIL: "email";
            readonly SMS: "sms";
            readonly PUSH: "push";
            readonly IN_APP: "in_app";
        };
        readonly TYPES: {
            readonly ORDER_CONFIRMATION: "order_confirmation";
            readonly ORDER_SHIPPED: "order_shipped";
            readonly ORDER_DELIVERED: "order_delivered";
            readonly PAYMENT_SUCCESSFUL: "payment_successful";
            readonly PAYMENT_FAILED: "payment_failed";
            readonly LOW_STOCK_ALERT: "low_stock_alert";
            readonly WELCOME_SERIES: "welcome_series";
            readonly ABANDONED_CART: "abandoned_cart";
            readonly PROMOTIONAL: "promotional";
        };
        readonly TIMING: {
            readonly IMMEDIATE: 0;
            readonly DELAYED_5_MIN: number;
            readonly DELAYED_1_HOUR: number;
            readonly DELAYED_24_HOURS: number;
            readonly WEEKLY: number;
        };
        readonly EMAIL_TEMPLATES: {
            readonly WELCOME: "welcome-email";
            readonly ORDER_CONFIRMATION: "order-confirmation";
            readonly ORDER_SHIPPED: "order-shipped";
            readonly ORDER_DELIVERED: "order-delivered";
            readonly PASSWORD_RESET: "password-reset";
            readonly ABANDONED_CART: "abandoned-cart";
            readonly LOW_STOCK: "low-stock-alert";
        };
        readonly SMS_TEMPLATES: {
            readonly OTP_LOGIN: "Your Bareloft OTP: {{code}}. Valid for 10 minutes.";
            readonly ORDER_CONFIRMED: "Order {{orderNumber}} confirmed. Track: {{trackingUrl}}";
            readonly ORDER_SHIPPED: "Order {{orderNumber}} shipped! Delivery in {{days}} days.";
            readonly PAYMENT_RECEIVED: "Payment of {{amount}} received for order {{orderNumber}}.";
        };
    };
    readonly ANALYTICS: {
        readonly EVENTS: {
            readonly PAGE_VIEW: "page_view";
            readonly PRODUCT_VIEW: "product_view";
            readonly ADD_TO_CART: "add_to_cart";
            readonly REMOVE_FROM_CART: "remove_from_cart";
            readonly CHECKOUT_START: "checkout_start";
            readonly PURCHASE: "purchase";
            readonly SEARCH: "search";
            readonly USER_SIGNUP: "user_signup";
            readonly USER_LOGIN: "user_login";
        };
        readonly METRICS: {
            readonly CONVERSION_RATE: "conversion_rate";
            readonly AVERAGE_ORDER_VALUE: "average_order_value";
            readonly CART_ABANDONMENT_RATE: "cart_abandonment_rate";
            readonly CUSTOMER_LIFETIME_VALUE: "customer_lifetime_value";
            readonly BOUNCE_RATE: "bounce_rate";
            readonly TIME_ON_SITE: "time_on_site";
        };
        readonly PERIODS: {
            readonly REAL_TIME: "real_time";
            readonly HOURLY: "hourly";
            readonly DAILY: "daily";
            readonly WEEKLY: "weekly";
            readonly MONTHLY: "monthly";
            readonly QUARTERLY: "quarterly";
            readonly YEARLY: "yearly";
        };
        readonly RETENTION: {
            readonly RAW_EVENTS: 90;
            readonly AGGREGATED_HOURLY: 365;
            readonly AGGREGATED_DAILY: 1095;
            readonly AGGREGATED_MONTHLY: -1;
        };
    };
    readonly SECURITY: {
        readonly PASSWORD_POLICY: {
            readonly MIN_LENGTH: 8;
            readonly MAX_LENGTH: 128;
            readonly REQUIRE_MIXED_CASE: true;
            readonly REQUIRE_NUMBERS: true;
            readonly REQUIRE_SPECIAL_CHARS: true;
            readonly PREVENT_COMMON_PASSWORDS: true;
            readonly PREVENT_PERSONAL_INFO: true;
            readonly HISTORY_COUNT: 5;
        };
        readonly ACCOUNT_SECURITY: {
            readonly MAX_LOGIN_ATTEMPTS: 5;
            readonly LOCKOUT_DURATION_MINUTES: 30;
            readonly PASSWORD_RESET_EXPIRY_HOURS: 1;
            readonly EMAIL_VERIFICATION_EXPIRY_HOURS: 24;
            readonly SESSION_TIMEOUT_MINUTES: 30;
        };
        readonly ENCRYPTION: {
            readonly ALGORITHM: "aes-256-gcm";
            readonly KEY_LENGTH: 32;
            readonly IV_LENGTH: 16;
            readonly TAG_LENGTH: 16;
            readonly SALT_LENGTH: 32;
            readonly ITERATIONS: 100000;
        };
        readonly CORS: {
            readonly ALLOWED_ORIGINS: readonly ["https://bareloft.com", "https://www.bareloft.com"];
            readonly ALLOWED_METHODS: readonly ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"];
            readonly ALLOWED_HEADERS: readonly ["Content-Type", "Authorization", "X-CSRF-Token"];
            readonly CREDENTIALS: true;
            readonly MAX_AGE: 86400;
        };
    };
    readonly MONITORING: {
        readonly HEALTH_CHECK: {
            readonly INTERVAL_SECONDS: 30;
            readonly TIMEOUT_SECONDS: 5;
            readonly FAILURE_THRESHOLD: 3;
            readonly SUCCESS_THRESHOLD: 2;
        };
        readonly PERFORMANCE: {
            readonly API_RESPONSE_TIME_THRESHOLD_MS: 1000;
            readonly DATABASE_QUERY_TIME_THRESHOLD_MS: 500;
            readonly ERROR_RATE_THRESHOLD_PERCENTAGE: 1;
            readonly UPTIME_THRESHOLD_PERCENTAGE: 99.9;
        };
        readonly ALERTS: {
            readonly HIGH_ERROR_RATE: "high_error_rate";
            readonly SLOW_RESPONSE_TIME: "slow_response_time";
            readonly LOW_DISK_SPACE: "low_disk_space";
            readonly HIGH_MEMORY_USAGE: "high_memory_usage";
            readonly DATABASE_CONNECTION_ISSUES: "database_connection_issues";
        };
        readonly LOG_LEVELS: {
            readonly ERROR: "error";
            readonly WARN: "warn";
            readonly INFO: "info";
            readonly DEBUG: "debug";
            readonly TRACE: "trace";
        };
    };
    readonly FEATURES: {
        readonly PRODUCT_REVIEWS: true;
        readonly WISHLIST: true;
        readonly PRODUCT_COMPARISON: false;
        readonly SOCIAL_LOGIN: false;
        readonly GUEST_CHECKOUT: true;
        readonly SAVE_PAYMENT_METHODS: true;
        readonly INSTALLMENT_PAYMENTS: false;
        readonly CRYPTO_PAYMENTS: false;
        readonly REFERRAL_PROGRAM: false;
        readonly LOYALTY_POINTS: false;
        readonly DYNAMIC_PRICING: false;
        readonly PERSONALIZED_RECOMMENDATIONS: false;
        readonly BULK_OPERATIONS: true;
        readonly ADVANCED_ANALYTICS: true;
        readonly INVENTORY_FORECASTING: false;
        readonly AI_CHATBOT: false;
        readonly VOICE_SEARCH: false;
        readonly AR_PRODUCT_VIEW: false;
    };
    readonly ENVIRONMENT: {
        readonly DEVELOPMENT: {
            readonly LOG_LEVEL: "debug";
            readonly ENABLE_CORS: true;
            readonly MOCK_PAYMENTS: true;
            readonly SEED_DATA: true;
            readonly DEBUG_MODE: true;
        };
        readonly STAGING: {
            readonly LOG_LEVEL: "info";
            readonly ENABLE_CORS: true;
            readonly MOCK_PAYMENTS: false;
            readonly SEED_DATA: false;
            readonly DEBUG_MODE: false;
        };
        readonly PRODUCTION: {
            readonly LOG_LEVEL: "warn";
            readonly ENABLE_CORS: false;
            readonly MOCK_PAYMENTS: false;
            readonly SEED_DATA: false;
            readonly DEBUG_MODE: false;
        };
    };
};
export declare const getConstant: (category: keyof typeof CONSTANTS, key: string) => any;
export declare const isFeatureEnabled: (feature: keyof typeof FEATURE_FLAGS) => boolean;
export declare const getEnvironmentConfig: (env: "DEVELOPMENT" | "STAGING" | "PRODUCTION") => {
    readonly LOG_LEVEL: "debug";
    readonly ENABLE_CORS: true;
    readonly MOCK_PAYMENTS: true;
    readonly SEED_DATA: true;
    readonly DEBUG_MODE: true;
} | {
    readonly LOG_LEVEL: "info";
    readonly ENABLE_CORS: true;
    readonly MOCK_PAYMENTS: false;
    readonly SEED_DATA: false;
    readonly DEBUG_MODE: false;
} | {
    readonly LOG_LEVEL: "warn";
    readonly ENABLE_CORS: false;
    readonly MOCK_PAYMENTS: false;
    readonly SEED_DATA: false;
    readonly DEBUG_MODE: false;
};
export default CONSTANTS;
//# sourceMappingURL=constants.d.ts.map