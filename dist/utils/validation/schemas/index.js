"use strict";
// Central export for all validation schemas
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCHEMA_NAMES = exports.validateSchema = exports.allSchemas = exports.couponSchemas = exports.settingsSchemas = exports.analyticsSchemas = exports.userManagementSchemas = exports.inventorySchemas = exports.orderAnalyticsSchemas = exports.shippingSchemas = exports.paymentSchemas = exports.checkoutSchemas = exports.cartSchemas = exports.orderSchemas = exports.reviewSchemas = exports.categorySchemas = exports.productSchemas = exports.commonSchemas = exports.userSchemas = exports.authSchemas = void 0;
// Auth schemas
var authSchemas_1 = require("./authSchemas");
Object.defineProperty(exports, "authSchemas", { enumerable: true, get: function () { return authSchemas_1.authSchemas; } });
Object.defineProperty(exports, "userSchemas", { enumerable: true, get: function () { return authSchemas_1.userSchemas; } });
Object.defineProperty(exports, "commonSchemas", { enumerable: true, get: function () { return authSchemas_1.commonSchemas; } });
// Product schemas
var productSchemas_1 = require("./productSchemas");
Object.defineProperty(exports, "productSchemas", { enumerable: true, get: function () { return productSchemas_1.productSchemas; } });
Object.defineProperty(exports, "categorySchemas", { enumerable: true, get: function () { return productSchemas_1.categorySchemas; } });
Object.defineProperty(exports, "reviewSchemas", { enumerable: true, get: function () { return productSchemas_1.reviewSchemas; } });
// Order schemas
var orderSchemas_1 = require("./orderSchemas");
Object.defineProperty(exports, "orderSchemas", { enumerable: true, get: function () { return orderSchemas_1.orderSchemas; } });
Object.defineProperty(exports, "cartSchemas", { enumerable: true, get: function () { return orderSchemas_1.cartSchemas; } });
Object.defineProperty(exports, "checkoutSchemas", { enumerable: true, get: function () { return orderSchemas_1.checkoutSchemas; } });
Object.defineProperty(exports, "paymentSchemas", { enumerable: true, get: function () { return orderSchemas_1.paymentSchemas; } });
Object.defineProperty(exports, "shippingSchemas", { enumerable: true, get: function () { return orderSchemas_1.shippingSchemas; } });
Object.defineProperty(exports, "orderAnalyticsSchemas", { enumerable: true, get: function () { return orderSchemas_1.orderAnalyticsSchemas; } });
// Admin schemas
var adminSchemas_1 = require("./adminSchemas");
Object.defineProperty(exports, "inventorySchemas", { enumerable: true, get: function () { return adminSchemas_1.inventorySchemas; } });
Object.defineProperty(exports, "userManagementSchemas", { enumerable: true, get: function () { return adminSchemas_1.userManagementSchemas; } });
Object.defineProperty(exports, "analyticsSchemas", { enumerable: true, get: function () { return adminSchemas_1.analyticsSchemas; } });
Object.defineProperty(exports, "settingsSchemas", { enumerable: true, get: function () { return adminSchemas_1.settingsSchemas; } });
Object.defineProperty(exports, "couponSchemas", { enumerable: true, get: function () { return adminSchemas_1.couponSchemas; } });
// All schemas grouped for easy access
exports.allSchemas = {
    // Authentication & Users
    auth: {
        requestOTP: () => Promise.resolve().then(() => __importStar(require("./authSchemas"))).then((m) => m.authSchemas.requestOTP),
        verifyOTP: () => Promise.resolve().then(() => __importStar(require("./authSchemas"))).then((m) => m.authSchemas.verifyOTP),
        signup: () => Promise.resolve().then(() => __importStar(require("./authSchemas"))).then((m) => m.authSchemas.signup),
        login: () => Promise.resolve().then(() => __importStar(require("./authSchemas"))).then((m) => m.authSchemas.login),
        refreshToken: () => Promise.resolve().then(() => __importStar(require("./authSchemas"))).then((m) => m.authSchemas.refreshToken),
        resetPassword: () => Promise.resolve().then(() => __importStar(require("./authSchemas"))).then((m) => m.authSchemas.resetPassword),
        changePassword: () => Promise.resolve().then(() => __importStar(require("./authSchemas"))).then((m) => m.authSchemas.changePassword),
    },
    user: {
        updateProfile: () => Promise.resolve().then(() => __importStar(require("./authSchemas"))).then((m) => m.userSchemas.updateProfile),
        createAddress: () => Promise.resolve().then(() => __importStar(require("./authSchemas"))).then((m) => m.userSchemas.createAddress),
        updateAddress: () => Promise.resolve().then(() => __importStar(require("./authSchemas"))).then((m) => m.userSchemas.updateAddress),
    },
    // Products & Categories
    product: {
        createProduct: () => Promise.resolve().then(() => __importStar(require("./productSchemas"))).then((m) => m.productSchemas.createProduct),
        updateProduct: () => Promise.resolve().then(() => __importStar(require("./productSchemas"))).then((m) => m.productSchemas.updateProduct),
        productQuery: () => Promise.resolve().then(() => __importStar(require("./productSchemas"))).then((m) => m.productSchemas.productQuery),
        productSearch: () => Promise.resolve().then(() => __importStar(require("./productSchemas"))).then((m) => m.productSchemas.productSearch),
    },
    category: {
        createCategory: () => Promise.resolve().then(() => __importStar(require("./productSchemas"))).then((m) => m.categorySchemas.createCategory),
        updateCategory: () => Promise.resolve().then(() => __importStar(require("./productSchemas"))).then((m) => m.categorySchemas.updateCategory),
        categoryQuery: () => Promise.resolve().then(() => __importStar(require("./productSchemas"))).then((m) => m.categorySchemas.categoryQuery),
    },
    review: {
        createReview: () => Promise.resolve().then(() => __importStar(require("./productSchemas"))).then((m) => m.reviewSchemas.createReview),
        updateReview: () => Promise.resolve().then(() => __importStar(require("./productSchemas"))).then((m) => m.reviewSchemas.updateReview),
        reviewQuery: () => Promise.resolve().then(() => __importStar(require("./productSchemas"))).then((m) => m.reviewSchemas.reviewQuery),
    },
    // Shopping & Orders
    cart: {
        addToCart: () => Promise.resolve().then(() => __importStar(require("./orderSchemas"))).then((m) => m.cartSchemas.addToCart),
        updateCartItem: () => Promise.resolve().then(() => __importStar(require("./orderSchemas"))).then((m) => m.cartSchemas.updateCartItem),
        applyCoupon: () => Promise.resolve().then(() => __importStar(require("./orderSchemas"))).then((m) => m.cartSchemas.applyCoupon),
        updateShipping: () => Promise.resolve().then(() => __importStar(require("./orderSchemas"))).then((m) => m.cartSchemas.updateShipping),
    },
    order: {
        createOrder: () => Promise.resolve().then(() => __importStar(require("./orderSchemas"))).then((m) => m.orderSchemas.createOrder),
        updateOrderStatus: () => Promise.resolve().then(() => __importStar(require("./orderSchemas"))).then((m) => m.orderSchemas.updateOrderStatus),
        orderQuery: () => Promise.resolve().then(() => __importStar(require("./orderSchemas"))).then((m) => m.orderSchemas.orderQuery),
        cancelOrder: () => Promise.resolve().then(() => __importStar(require("./orderSchemas"))).then((m) => m.orderSchemas.cancelOrder),
    },
    checkout: {
        initializeCheckout: () => Promise.resolve().then(() => __importStar(require("./orderSchemas"))).then((m) => m.checkoutSchemas.initializeCheckout),
        guestCheckout: () => Promise.resolve().then(() => __importStar(require("./orderSchemas"))).then((m) => m.checkoutSchemas.guestCheckout),
    },
    payment: {
        initializePayment: () => Promise.resolve().then(() => __importStar(require("./orderSchemas"))).then((m) => m.paymentSchemas.initializePayment),
        verifyPayment: () => Promise.resolve().then(() => __importStar(require("./orderSchemas"))).then((m) => m.paymentSchemas.verifyPayment),
        processRefund: () => Promise.resolve().then(() => __importStar(require("./orderSchemas"))).then((m) => m.paymentSchemas.processRefund),
    },
    shipping: {
        calculateShipping: () => Promise.resolve().then(() => __importStar(require("./orderSchemas"))).then((m) => m.shippingSchemas.calculateShipping),
        updateTracking: () => Promise.resolve().then(() => __importStar(require("./orderSchemas"))).then((m) => m.shippingSchemas.updateTracking),
    },
    // Admin Operations
    inventory: {
        updateInventory: () => Promise.resolve().then(() => __importStar(require("./adminSchemas"))).then((m) => m.inventorySchemas.updateInventory),
        bulkInventoryUpdate: () => Promise.resolve().then(() => __importStar(require("./adminSchemas"))).then((m) => m.inventorySchemas.bulkInventoryUpdate),
        inventoryAdjustment: () => Promise.resolve().then(() => __importStar(require("./adminSchemas"))).then((m) => m.inventorySchemas.inventoryAdjustment),
        lowStockQuery: () => Promise.resolve().then(() => __importStar(require("./adminSchemas"))).then((m) => m.inventorySchemas.lowStockQuery),
    },
    userManagement: {
        createUser: () => Promise.resolve().then(() => __importStar(require("./adminSchemas"))).then((m) => m.userManagementSchemas.createUser),
        updateUser: () => Promise.resolve().then(() => __importStar(require("./adminSchemas"))).then((m) => m.userManagementSchemas.updateUser),
        userQuery: () => Promise.resolve().then(() => __importStar(require("./adminSchemas"))).then((m) => m.userManagementSchemas.userQuery),
        userBulkAction: () => Promise.resolve().then(() => __importStar(require("./adminSchemas"))).then((m) => m.userManagementSchemas.userBulkAction),
    },
    analytics: {
        dashboardAnalytics: () => Promise.resolve().then(() => __importStar(require("./adminSchemas"))).then((m) => m.analyticsSchemas.dashboardAnalytics),
        productAnalytics: () => Promise.resolve().then(() => __importStar(require("./adminSchemas"))).then((m) => m.analyticsSchemas.productAnalytics),
        customerAnalytics: () => Promise.resolve().then(() => __importStar(require("./adminSchemas"))).then((m) => m.analyticsSchemas.customerAnalytics),
        orderAnalytics: () => Promise.resolve().then(() => __importStar(require("./orderSchemas"))).then((m) => m.orderAnalyticsSchemas.analyticsQuery),
        salesReport: () => Promise.resolve().then(() => __importStar(require("./orderSchemas"))).then((m) => m.orderAnalyticsSchemas.salesReportQuery),
    },
    settings: {
        generalSettings: () => Promise.resolve().then(() => __importStar(require("./adminSchemas"))).then((m) => m.settingsSchemas.generalSettings),
        paymentSettings: () => Promise.resolve().then(() => __importStar(require("./adminSchemas"))).then((m) => m.settingsSchemas.paymentSettings),
        notificationSettings: () => Promise.resolve().then(() => __importStar(require("./adminSchemas"))).then((m) => m.settingsSchemas.notificationSettings),
    },
    coupon: {
        createCoupon: () => Promise.resolve().then(() => __importStar(require("./adminSchemas"))).then((m) => m.couponSchemas.createCoupon),
        updateCoupon: () => Promise.resolve().then(() => __importStar(require("./adminSchemas"))).then((m) => m.couponSchemas.updateCoupon),
    },
    // Common schemas
    common: {
        pagination: () => Promise.resolve().then(() => __importStar(require("./authSchemas"))).then((m) => m.commonSchemas.pagination),
        search: () => Promise.resolve().then(() => __importStar(require("./authSchemas"))).then((m) => m.commonSchemas.search),
        uuidParam: () => Promise.resolve().then(() => __importStar(require("./authSchemas"))).then((m) => m.commonSchemas.uuidParam),
        dateRange: () => Promise.resolve().then(() => __importStar(require("./authSchemas"))).then((m) => m.commonSchemas.dateRange),
    },
};
// Schema validation helper
const validateSchema = async (schemaPath, data) => {
    try {
        const schemaKeys = schemaPath.split(".");
        let schema = exports.allSchemas;
        for (const key of schemaKeys) {
            schema = schema[key];
            if (!schema) {
                throw new Error(`Schema not found: ${schemaPath}`);
            }
        }
        // If it's a function, call it to get the schema
        const resolvedSchema = typeof schema === "function" ? await schema() : schema;
        const { error, value } = resolvedSchema.validate(data);
        if (error) {
            return {
                isValid: false,
                error: error.details[0].message,
                details: error.details,
            };
        }
        return {
            isValid: true,
            data: value,
        };
    }
    catch (error) {
        return {
            isValid: false,
            error: error instanceof Error ? error.message : "Validation failed",
        };
    }
};
exports.validateSchema = validateSchema;
// Schema names for dynamic validation
exports.SCHEMA_NAMES = {
    // Auth schemas
    REQUEST_OTP: "auth.requestOTP",
    VERIFY_OTP: "auth.verifyOTP",
    SIGNUP: "auth.signup",
    LOGIN: "auth.login",
    REFRESH_TOKEN: "auth.refreshToken",
    RESET_PASSWORD: "auth.resetPassword",
    CHANGE_PASSWORD: "auth.changePassword",
    // User schemas
    UPDATE_PROFILE: "user.updateProfile",
    CREATE_ADDRESS: "user.createAddress",
    UPDATE_ADDRESS: "user.updateAddress",
    // Product schemas
    CREATE_PRODUCT: "product.createProduct",
    UPDATE_PRODUCT: "product.updateProduct",
    PRODUCT_QUERY: "product.productQuery",
    PRODUCT_SEARCH: "product.productSearch",
    // Category schemas
    CREATE_CATEGORY: "category.createCategory",
    UPDATE_CATEGORY: "category.updateCategory",
    CATEGORY_QUERY: "category.categoryQuery",
    // Review schemas
    CREATE_REVIEW: "review.createReview",
    UPDATE_REVIEW: "review.updateReview",
    REVIEW_QUERY: "review.reviewQuery",
    // Cart schemas
    ADD_TO_CART: "cart.addToCart",
    UPDATE_CART_ITEM: "cart.updateCartItem",
    APPLY_COUPON: "cart.applyCoupon",
    UPDATE_SHIPPING: "cart.updateShipping",
    // Order schemas
    CREATE_ORDER: "order.createOrder",
    UPDATE_ORDER_STATUS: "order.updateOrderStatus",
    ORDER_QUERY: "order.orderQuery",
    CANCEL_ORDER: "order.cancelOrder",
    // Checkout schemas
    INITIALIZE_CHECKOUT: "checkout.initializeCheckout",
    GUEST_CHECKOUT: "checkout.guestCheckout",
    // Payment schemas
    INITIALIZE_PAYMENT: "payment.initializePayment",
    VERIFY_PAYMENT: "payment.verifyPayment",
    PROCESS_REFUND: "payment.processRefund",
    // Shipping schemas
    CALCULATE_SHIPPING: "shipping.calculateShipping",
    UPDATE_TRACKING: "shipping.updateTracking",
    // Admin schemas
    UPDATE_INVENTORY: "inventory.updateInventory",
    BULK_INVENTORY_UPDATE: "inventory.bulkInventoryUpdate",
    INVENTORY_ADJUSTMENT: "inventory.inventoryAdjustment",
    LOW_STOCK_QUERY: "inventory.lowStockQuery",
    // User management
    CREATE_USER: "userManagement.createUser",
    UPDATE_USER: "userManagement.updateUser",
    USER_QUERY: "userManagement.userQuery",
    USER_BULK_ACTION: "userManagement.userBulkAction",
    // Analytics
    DASHBOARD_ANALYTICS: "analytics.dashboardAnalytics",
    PRODUCT_ANALYTICS: "analytics.productAnalytics",
    CUSTOMER_ANALYTICS: "analytics.customerAnalytics",
    ORDER_ANALYTICS: "analytics.orderAnalytics",
    SALES_REPORT: "analytics.salesReport",
    // Settings
    GENERAL_SETTINGS: "settings.generalSettings",
    PAYMENT_SETTINGS: "settings.paymentSettings",
    NOTIFICATION_SETTINGS: "settings.notificationSettings",
    // Coupon
    CREATE_COUPON: "coupon.createCoupon",
    UPDATE_COUPON: "coupon.updateCoupon",
    // Common
    PAGINATION: "common.pagination",
    SEARCH: "common.search",
    UUID_PARAM: "common.uuidParam",
    DATE_RANGE: "common.dateRange",
};
exports.default = exports.allSchemas;
//# sourceMappingURL=index.js.map