// Central export for all validation schemas

// Auth schemas
export { authSchemas, userSchemas, commonSchemas } from "./authSchemas";

// Product schemas
export {
  productSchemas,
  categorySchemas,
  reviewSchemas,
} from "./productSchemas";

// Order schemas
export {
  orderSchemas,
  cartSchemas,
  checkoutSchemas,
  paymentSchemas,
  shippingSchemas,
  orderAnalyticsSchemas,
} from "./orderSchemas";

// Admin schemas
export {
  inventorySchemas,
  userManagementSchemas,
  analyticsSchemas,
  settingsSchemas,
  couponSchemas,
} from "./adminSchemas";

// All schemas grouped for easy access
export const allSchemas = {
  // Authentication & Users
  auth: {
    requestOTP: () =>
      import("./authSchemas").then((m) => m.authSchemas.requestOTP),
    verifyOTP: () =>
      import("./authSchemas").then((m) => m.authSchemas.verifyOTP),
    signup: () => import("./authSchemas").then((m) => m.authSchemas.signup),
    login: () => import("./authSchemas").then((m) => m.authSchemas.login),
    refreshToken: () =>
      import("./authSchemas").then((m) => m.authSchemas.refreshToken),
    resetPassword: () =>
      import("./authSchemas").then((m) => m.authSchemas.resetPassword),
    changePassword: () =>
      import("./authSchemas").then((m) => m.authSchemas.changePassword),
  },

  user: {
    updateProfile: () =>
      import("./authSchemas").then((m) => m.userSchemas.updateProfile),
    createAddress: () =>
      import("./authSchemas").then((m) => m.userSchemas.createAddress),
    updateAddress: () =>
      import("./authSchemas").then((m) => m.userSchemas.updateAddress),
  },

  // Products & Categories
  product: {
    createProduct: () =>
      import("./productSchemas").then((m) => m.productSchemas.createProduct),
    updateProduct: () =>
      import("./productSchemas").then((m) => m.productSchemas.updateProduct),
    productQuery: () =>
      import("./productSchemas").then((m) => m.productSchemas.productQuery),
    productSearch: () =>
      import("./productSchemas").then((m) => m.productSchemas.productSearch),
  },

  category: {
    createCategory: () =>
      import("./productSchemas").then((m) => m.categorySchemas.createCategory),
    updateCategory: () =>
      import("./productSchemas").then((m) => m.categorySchemas.updateCategory),
    categoryQuery: () =>
      import("./productSchemas").then((m) => m.categorySchemas.categoryQuery),
  },

  review: {
    createReview: () =>
      import("./productSchemas").then((m) => m.reviewSchemas.createReview),
    updateReview: () =>
      import("./productSchemas").then((m) => m.reviewSchemas.updateReview),
    reviewQuery: () =>
      import("./productSchemas").then((m) => m.reviewSchemas.reviewQuery),
  },

  // Shopping & Orders
  cart: {
    addToCart: () =>
      import("./orderSchemas").then((m) => m.cartSchemas.addToCart),
    updateCartItem: () =>
      import("./orderSchemas").then((m) => m.cartSchemas.updateCartItem),
    applyCoupon: () =>
      import("./orderSchemas").then((m) => m.cartSchemas.applyCoupon),
    updateShipping: () =>
      import("./orderSchemas").then((m) => m.cartSchemas.updateShipping),
  },

  order: {
    createOrder: () =>
      import("./orderSchemas").then((m) => m.orderSchemas.createOrder),
    updateOrderStatus: () =>
      import("./orderSchemas").then((m) => m.orderSchemas.updateOrderStatus),
    orderQuery: () =>
      import("./orderSchemas").then((m) => m.orderSchemas.orderQuery),
    cancelOrder: () =>
      import("./orderSchemas").then((m) => m.orderSchemas.cancelOrder),
  },

  checkout: {
    initializeCheckout: () =>
      import("./orderSchemas").then(
        (m) => m.checkoutSchemas.initializeCheckout
      ),
    guestCheckout: () =>
      import("./orderSchemas").then((m) => m.checkoutSchemas.guestCheckout),
  },

  payment: {
    initializePayment: () =>
      import("./orderSchemas").then((m) => m.paymentSchemas.initializePayment),
    verifyPayment: () =>
      import("./orderSchemas").then((m) => m.paymentSchemas.verifyPayment),
    processRefund: () =>
      import("./orderSchemas").then((m) => m.paymentSchemas.processRefund),
  },

  shipping: {
    calculateShipping: () =>
      import("./orderSchemas").then((m) => m.shippingSchemas.calculateShipping),
    updateTracking: () =>
      import("./orderSchemas").then((m) => m.shippingSchemas.updateTracking),
  },

  // Admin Operations
  inventory: {
    updateInventory: () =>
      import("./adminSchemas").then((m) => m.inventorySchemas.updateInventory),
    bulkInventoryUpdate: () =>
      import("./adminSchemas").then(
        (m) => m.inventorySchemas.bulkInventoryUpdate
      ),
    inventoryAdjustment: () =>
      import("./adminSchemas").then(
        (m) => m.inventorySchemas.inventoryAdjustment
      ),
    lowStockQuery: () =>
      import("./adminSchemas").then((m) => m.inventorySchemas.lowStockQuery),
  },

  userManagement: {
    createUser: () =>
      import("./adminSchemas").then((m) => m.userManagementSchemas.createUser),
    updateUser: () =>
      import("./adminSchemas").then((m) => m.userManagementSchemas.updateUser),
    userQuery: () =>
      import("./adminSchemas").then((m) => m.userManagementSchemas.userQuery),
    userBulkAction: () =>
      import("./adminSchemas").then(
        (m) => m.userManagementSchemas.userBulkAction
      ),
  },

  analytics: {
    dashboardAnalytics: () =>
      import("./adminSchemas").then(
        (m) => m.analyticsSchemas.dashboardAnalytics
      ),
    productAnalytics: () =>
      import("./adminSchemas").then((m) => m.analyticsSchemas.productAnalytics),
    customerAnalytics: () =>
      import("./adminSchemas").then(
        (m) => m.analyticsSchemas.customerAnalytics
      ),
    orderAnalytics: () =>
      import("./orderSchemas").then(
        (m) => m.orderAnalyticsSchemas.analyticsQuery
      ),
    salesReport: () =>
      import("./orderSchemas").then(
        (m) => m.orderAnalyticsSchemas.salesReportQuery
      ),
  },

  settings: {
    generalSettings: () =>
      import("./adminSchemas").then((m) => m.settingsSchemas.generalSettings),
    paymentSettings: () =>
      import("./adminSchemas").then((m) => m.settingsSchemas.paymentSettings),
    notificationSettings: () =>
      import("./adminSchemas").then(
        (m) => m.settingsSchemas.notificationSettings
      ),
  },

  coupon: {
    createCoupon: () =>
      import("./adminSchemas").then((m) => m.couponSchemas.createCoupon),
    updateCoupon: () =>
      import("./adminSchemas").then((m) => m.couponSchemas.updateCoupon),
  },

  // Common schemas
  common: {
    pagination: () =>
      import("./authSchemas").then((m) => m.commonSchemas.pagination),
    search: () => import("./authSchemas").then((m) => m.commonSchemas.search),
    uuidParam: () =>
      import("./authSchemas").then((m) => m.commonSchemas.uuidParam),
    dateRange: () =>
      import("./authSchemas").then((m) => m.commonSchemas.dateRange),
  },
};

// Schema validation helper
export const validateSchema = async (schemaPath: string, data: any) => {
  try {
    const schemaKeys = schemaPath.split(".");
    let schema: any = allSchemas;

    for (const key of schemaKeys) {
      schema = schema[key];
      if (!schema) {
        throw new Error(`Schema not found: ${schemaPath}`);
      }
    }

    // If it's a function, call it to get the schema
    const resolvedSchema =
      typeof schema === "function" ? await schema() : schema;

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
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Validation failed",
    };
  }
};

// Schema names for dynamic validation
export const SCHEMA_NAMES = {
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
} as const;

export type SchemaName = (typeof SCHEMA_NAMES)[keyof typeof SCHEMA_NAMES];

export default allSchemas;
