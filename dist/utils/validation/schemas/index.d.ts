export { authSchemas, userSchemas, commonSchemas } from "./authSchemas";
export { productSchemas, categorySchemas, reviewSchemas, } from "./productSchemas";
export { orderSchemas, cartSchemas, checkoutSchemas, paymentSchemas, shippingSchemas, orderAnalyticsSchemas, } from "./orderSchemas";
export { inventorySchemas, userManagementSchemas, analyticsSchemas, settingsSchemas, couponSchemas, } from "./adminSchemas";
export declare const allSchemas: {
    auth: {
        requestOTP: () => Promise<import("joi").ObjectSchema<any>>;
        verifyOTP: () => Promise<import("joi").ObjectSchema<any>>;
        signup: () => Promise<import("joi").ObjectSchema<any>>;
        login: () => Promise<import("joi").ObjectSchema<any>>;
        refreshToken: () => Promise<import("joi").ObjectSchema<any>>;
        resetPassword: () => Promise<import("joi").ObjectSchema<any>>;
        changePassword: () => Promise<import("joi").ObjectSchema<any>>;
    };
    user: {
        updateProfile: () => Promise<import("joi").ObjectSchema<any>>;
        createAddress: () => Promise<import("joi").ObjectSchema<any>>;
        updateAddress: () => Promise<import("joi").ObjectSchema<any>>;
    };
    product: {
        createProduct: () => Promise<import("joi").ObjectSchema<any>>;
        updateProduct: () => Promise<import("joi").ObjectSchema<any>>;
        productQuery: () => Promise<import("joi").ObjectSchema<any>>;
        productSearch: () => Promise<import("joi").ObjectSchema<any>>;
    };
    category: {
        createCategory: () => Promise<import("joi").ObjectSchema<any>>;
        updateCategory: () => Promise<import("joi").ObjectSchema<any>>;
        categoryQuery: () => Promise<import("joi").ObjectSchema<any>>;
    };
    review: {
        createReview: () => Promise<import("joi").ObjectSchema<any>>;
        updateReview: () => Promise<import("joi").ObjectSchema<any>>;
        reviewQuery: () => Promise<import("joi").ObjectSchema<any>>;
    };
    cart: {
        addToCart: () => Promise<import("joi").ObjectSchema<any>>;
        updateCartItem: () => Promise<import("joi").ObjectSchema<any>>;
        applyCoupon: () => Promise<import("joi").ObjectSchema<any>>;
        updateShipping: () => Promise<import("joi").ObjectSchema<any>>;
    };
    order: {
        createOrder: () => Promise<import("joi").ObjectSchema<any>>;
        updateOrderStatus: () => Promise<import("joi").ObjectSchema<any>>;
        orderQuery: () => Promise<import("joi").ObjectSchema<any>>;
        cancelOrder: () => Promise<import("joi").ObjectSchema<any>>;
    };
    checkout: {
        initializeCheckout: () => Promise<import("joi").ObjectSchema<any>>;
        guestCheckout: () => Promise<import("joi").ObjectSchema<any>>;
    };
    payment: {
        initializePayment: () => Promise<import("joi").ObjectSchema<any>>;
        verifyPayment: () => Promise<import("joi").ObjectSchema<any>>;
        processRefund: () => Promise<import("joi").ObjectSchema<any>>;
    };
    shipping: {
        calculateShipping: () => Promise<import("joi").ObjectSchema<any>>;
        updateTracking: () => Promise<import("joi").ObjectSchema<any>>;
    };
    inventory: {
        updateInventory: () => Promise<import("joi").ObjectSchema<any>>;
        bulkInventoryUpdate: () => Promise<import("joi").ObjectSchema<any>>;
        inventoryAdjustment: () => Promise<import("joi").ObjectSchema<any>>;
        lowStockQuery: () => Promise<import("joi").ObjectSchema<any>>;
    };
    userManagement: {
        createUser: () => Promise<import("joi").ObjectSchema<any>>;
        updateUser: () => Promise<import("joi").ObjectSchema<any>>;
        userQuery: () => Promise<import("joi").ObjectSchema<any>>;
        userBulkAction: () => Promise<import("joi").ObjectSchema<any>>;
    };
    analytics: {
        dashboardAnalytics: () => Promise<import("joi").ObjectSchema<any>>;
        productAnalytics: () => Promise<import("joi").ObjectSchema<any>>;
        customerAnalytics: () => Promise<import("joi").ObjectSchema<any>>;
        orderAnalytics: () => Promise<import("joi").ObjectSchema<any>>;
        salesReport: () => Promise<import("joi").ObjectSchema<any>>;
    };
    settings: {
        generalSettings: () => Promise<import("joi").ObjectSchema<any>>;
        paymentSettings: () => Promise<import("joi").ObjectSchema<any>>;
        notificationSettings: () => Promise<import("joi").ObjectSchema<any>>;
    };
    coupon: {
        createCoupon: () => Promise<import("joi").ObjectSchema<any>>;
        updateCoupon: () => Promise<import("joi").ObjectSchema<any>>;
    };
    common: {
        pagination: () => Promise<import("joi").ObjectSchema<any>>;
        search: () => Promise<import("joi").ObjectSchema<any>>;
        uuidParam: () => Promise<import("joi").ObjectSchema<any>>;
        dateRange: () => Promise<import("joi").ObjectSchema<any>>;
    };
};
export declare const validateSchema: (schemaPath: string, data: any) => Promise<{
    isValid: boolean;
    error: any;
    details: any;
    data?: undefined;
} | {
    isValid: boolean;
    data: any;
    error?: undefined;
    details?: undefined;
} | {
    isValid: boolean;
    error: string;
    details?: undefined;
    data?: undefined;
}>;
export declare const SCHEMA_NAMES: {
    readonly REQUEST_OTP: "auth.requestOTP";
    readonly VERIFY_OTP: "auth.verifyOTP";
    readonly SIGNUP: "auth.signup";
    readonly LOGIN: "auth.login";
    readonly REFRESH_TOKEN: "auth.refreshToken";
    readonly RESET_PASSWORD: "auth.resetPassword";
    readonly CHANGE_PASSWORD: "auth.changePassword";
    readonly UPDATE_PROFILE: "user.updateProfile";
    readonly CREATE_ADDRESS: "user.createAddress";
    readonly UPDATE_ADDRESS: "user.updateAddress";
    readonly CREATE_PRODUCT: "product.createProduct";
    readonly UPDATE_PRODUCT: "product.updateProduct";
    readonly PRODUCT_QUERY: "product.productQuery";
    readonly PRODUCT_SEARCH: "product.productSearch";
    readonly CREATE_CATEGORY: "category.createCategory";
    readonly UPDATE_CATEGORY: "category.updateCategory";
    readonly CATEGORY_QUERY: "category.categoryQuery";
    readonly CREATE_REVIEW: "review.createReview";
    readonly UPDATE_REVIEW: "review.updateReview";
    readonly REVIEW_QUERY: "review.reviewQuery";
    readonly ADD_TO_CART: "cart.addToCart";
    readonly UPDATE_CART_ITEM: "cart.updateCartItem";
    readonly APPLY_COUPON: "cart.applyCoupon";
    readonly UPDATE_SHIPPING: "cart.updateShipping";
    readonly CREATE_ORDER: "order.createOrder";
    readonly UPDATE_ORDER_STATUS: "order.updateOrderStatus";
    readonly ORDER_QUERY: "order.orderQuery";
    readonly CANCEL_ORDER: "order.cancelOrder";
    readonly INITIALIZE_CHECKOUT: "checkout.initializeCheckout";
    readonly GUEST_CHECKOUT: "checkout.guestCheckout";
    readonly INITIALIZE_PAYMENT: "payment.initializePayment";
    readonly VERIFY_PAYMENT: "payment.verifyPayment";
    readonly PROCESS_REFUND: "payment.processRefund";
    readonly CALCULATE_SHIPPING: "shipping.calculateShipping";
    readonly UPDATE_TRACKING: "shipping.updateTracking";
    readonly UPDATE_INVENTORY: "inventory.updateInventory";
    readonly BULK_INVENTORY_UPDATE: "inventory.bulkInventoryUpdate";
    readonly INVENTORY_ADJUSTMENT: "inventory.inventoryAdjustment";
    readonly LOW_STOCK_QUERY: "inventory.lowStockQuery";
    readonly CREATE_USER: "userManagement.createUser";
    readonly UPDATE_USER: "userManagement.updateUser";
    readonly USER_QUERY: "userManagement.userQuery";
    readonly USER_BULK_ACTION: "userManagement.userBulkAction";
    readonly DASHBOARD_ANALYTICS: "analytics.dashboardAnalytics";
    readonly PRODUCT_ANALYTICS: "analytics.productAnalytics";
    readonly CUSTOMER_ANALYTICS: "analytics.customerAnalytics";
    readonly ORDER_ANALYTICS: "analytics.orderAnalytics";
    readonly SALES_REPORT: "analytics.salesReport";
    readonly GENERAL_SETTINGS: "settings.generalSettings";
    readonly PAYMENT_SETTINGS: "settings.paymentSettings";
    readonly NOTIFICATION_SETTINGS: "settings.notificationSettings";
    readonly CREATE_COUPON: "coupon.createCoupon";
    readonly UPDATE_COUPON: "coupon.updateCoupon";
    readonly PAGINATION: "common.pagination";
    readonly SEARCH: "common.search";
    readonly UUID_PARAM: "common.uuidParam";
    readonly DATE_RANGE: "common.dateRange";
};
export type SchemaName = (typeof SCHEMA_NAMES)[keyof typeof SCHEMA_NAMES];
export default allSchemas;
//# sourceMappingURL=index.d.ts.map