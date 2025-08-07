import Joi from "joi";
/**
 * Admin validation schemas for Bareloft platform
 */
/**
 * Inventory management schemas
 */
export declare const inventorySchemas: {
    /**
     * Update inventory schema
     */
    updateInventory: Joi.ObjectSchema<any>;
    /**
     * Bulk inventory update schema
     */
    bulkInventoryUpdate: Joi.ObjectSchema<any>;
    /**
     * Inventory adjustment schema
     */
    inventoryAdjustment: Joi.ObjectSchema<any>;
    /**
     * Low stock report query schema
     */
    lowStockQuery: Joi.ObjectSchema<any>;
    /**
     * Stock reservation schema
     */
    stockReservation: Joi.ObjectSchema<any>;
    /**
     * Release stock reservation schema
     */
    releaseReservation: Joi.ObjectSchema<any>;
    /**
     * Inventory movement query schema
     */
    inventoryMovementQuery: Joi.ObjectSchema<any>;
    /**
     * Bulk stock reservation schema
     */
    bulkStockReservation: Joi.ObjectSchema<any>;
    /**
     * Inventory export schema
     */
    inventoryExport: Joi.ObjectSchema<any>;
};
/**
 * User management schemas
 */
export declare const userManagementSchemas: {
    /**
     * Create user schema (Admin)
     */
    createUser: Joi.ObjectSchema<any>;
    /**
     * Update user schema (Admin)
     */
    updateUser: Joi.ObjectSchema<any>;
    /**
     * User query schema (Admin)
     */
    userQuery: Joi.ObjectSchema<any>;
    /**
     * User bulk action schema
     */
    userBulkAction: Joi.ObjectSchema<any>;
};
/**
 * Analytics schemas
 */
export declare const analyticsSchemas: {
    /**
     * Dashboard analytics query schema
     */
    dashboardAnalytics: Joi.ObjectSchema<any>;
    /**
     * Product analytics query schema
     */
    productAnalytics: Joi.ObjectSchema<any>;
    /**
     * Customer analytics query schema
     */
    customerAnalytics: Joi.ObjectSchema<any>;
};
/**
 * Settings management schemas
 */
export declare const settingsSchemas: {
    /**
     * General settings schema
     */
    generalSettings: Joi.ObjectSchema<any>;
    /**
     * Payment settings schema
     */
    paymentSettings: Joi.ObjectSchema<any>;
    /**
     * Notification settings schema
     */
    notificationSettings: Joi.ObjectSchema<any>;
};
/**
 * Coupon management schemas
 */
export declare const couponSchemas: {
    /**
     * Create coupon schema
     */
    createCoupon: Joi.ObjectSchema<any>;
    /**
     * Update coupon schema
     */
    updateCoupon: Joi.ObjectSchema<any>;
};
declare const _default: {
    inventorySchemas: {
        /**
         * Update inventory schema
         */
        updateInventory: Joi.ObjectSchema<any>;
        /**
         * Bulk inventory update schema
         */
        bulkInventoryUpdate: Joi.ObjectSchema<any>;
        /**
         * Inventory adjustment schema
         */
        inventoryAdjustment: Joi.ObjectSchema<any>;
        /**
         * Low stock report query schema
         */
        lowStockQuery: Joi.ObjectSchema<any>;
        /**
         * Stock reservation schema
         */
        stockReservation: Joi.ObjectSchema<any>;
        /**
         * Release stock reservation schema
         */
        releaseReservation: Joi.ObjectSchema<any>;
        /**
         * Inventory movement query schema
         */
        inventoryMovementQuery: Joi.ObjectSchema<any>;
        /**
         * Bulk stock reservation schema
         */
        bulkStockReservation: Joi.ObjectSchema<any>;
        /**
         * Inventory export schema
         */
        inventoryExport: Joi.ObjectSchema<any>;
    };
    userManagementSchemas: {
        /**
         * Create user schema (Admin)
         */
        createUser: Joi.ObjectSchema<any>;
        /**
         * Update user schema (Admin)
         */
        updateUser: Joi.ObjectSchema<any>;
        /**
         * User query schema (Admin)
         */
        userQuery: Joi.ObjectSchema<any>;
        /**
         * User bulk action schema
         */
        userBulkAction: Joi.ObjectSchema<any>;
    };
    analyticsSchemas: {
        /**
         * Dashboard analytics query schema
         */
        dashboardAnalytics: Joi.ObjectSchema<any>;
        /**
         * Product analytics query schema
         */
        productAnalytics: Joi.ObjectSchema<any>;
        /**
         * Customer analytics query schema
         */
        customerAnalytics: Joi.ObjectSchema<any>;
    };
    settingsSchemas: {
        /**
         * General settings schema
         */
        generalSettings: Joi.ObjectSchema<any>;
        /**
         * Payment settings schema
         */
        paymentSettings: Joi.ObjectSchema<any>;
        /**
         * Notification settings schema
         */
        notificationSettings: Joi.ObjectSchema<any>;
    };
    couponSchemas: {
        /**
         * Create coupon schema
         */
        createCoupon: Joi.ObjectSchema<any>;
        /**
         * Update coupon schema
         */
        updateCoupon: Joi.ObjectSchema<any>;
    };
};
export default _default;
//# sourceMappingURL=adminSchemas.d.ts.map