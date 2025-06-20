"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUUID = exports.isValidEmail = exports.isNigerianPhoneNumber = exports.CONSTANTS = exports.NIGERIAN_STATES = void 0;
// Nigerian-specific types
exports.NIGERIAN_STATES = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi',
    'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta',
    'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe',
    'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
    'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
    'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
    'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe',
    'Zamfara', 'FCT'
];
// Constants
exports.CONSTANTS = {
    // Pagination
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    // OTP
    OTP_LENGTH: 6,
    OTP_EXPIRY_MINUTES: 10,
    MAX_OTP_ATTEMPTS: 3,
    OTP_RATE_LIMIT_MINUTES: 15,
    // JWT
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    // Cart
    CART_ITEM_MAX_QUANTITY: 99,
    CART_EXPIRY_DAYS: 30,
    // Orders
    ORDER_NUMBER_PREFIX: 'BL',
    ORDER_CANCELLATION_WINDOW_HOURS: 24,
    // Inventory
    LOW_STOCK_DEFAULT_THRESHOLD: 10,
    INVENTORY_RESERVATION_MINUTES: 15,
    // File Upload
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    MAX_FILES_PER_UPLOAD: 10,
    ALLOWED_IMAGE_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
    // Nigerian specific
    FREE_SHIPPING_THRESHOLD: 50000, // ₦50,000
    DEFAULT_SHIPPING_FEE: 2500, // ₦2,500
    NAIRA_TO_KOBO: 100, // Paystack uses kobo
    // Rate limiting
    AUTH_RATE_LIMIT: 5, // 5 requests per 15 minutes
    API_RATE_LIMIT: 100, // 100 requests per 15 minutes
    // Cache TTL (seconds)
    CACHE_TTL: {
        SHORT: 300, // 5 minutes
        MEDIUM: 1800, // 30 minutes
        LONG: 3600, // 1 hour
        VERY_LONG: 86400 // 24 hours
    }
};
// Type guards
const isNigerianPhoneNumber = (phone) => {
    const nigerianPhoneRegex = /^(\+234|234|0)[789][01][0-9]{8}$/;
    return nigerianPhoneRegex.test(phone);
};
exports.isNigerianPhoneNumber = isNigerianPhoneNumber;
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.isValidEmail = isValidEmail;
const isUUID = (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
};
exports.isUUID = isUUID;
//# sourceMappingURL=common.types.js.map