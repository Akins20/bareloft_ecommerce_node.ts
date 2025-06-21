import Joi from "joi";
/**
 * Order validation schemas
 */
export declare const orderSchemas: {
    /**
     * Create order schema
     */
    createOrder: Joi.ObjectSchema<any>;
    /**
     * Update order status schema (Admin)
     */
    updateOrderStatus: Joi.ObjectSchema<any>;
    /**
     * Order query parameters schema
     */
    orderQuery: Joi.ObjectSchema<any>;
    /**
     * Cancel order schema
     */
    cancelOrder: Joi.ObjectSchema<any>;
};
/**
 * Cart validation schemas
 */
export declare const cartSchemas: {
    /**
     * Add to cart schema
     */
    addToCart: Joi.ObjectSchema<any>;
    /**
     * Update cart item schema
     */
    updateCartItem: Joi.ObjectSchema<any>;
    /**
     * Apply coupon schema
     */
    applyCoupon: Joi.ObjectSchema<any>;
    /**
     * Update shipping address for cart
     */
    updateShipping: Joi.ObjectSchema<any>;
};
/**
 * Checkout validation schemas
 */
export declare const checkoutSchemas: {
    /**
     * Initialize checkout schema
     */
    initializeCheckout: Joi.ObjectSchema<any>;
    /**
     * Guest checkout schema
     */
    guestCheckout: Joi.ObjectSchema<any>;
};
/**
 * Payment validation schemas
 */
export declare const paymentSchemas: {
    /**
     * Initialize payment schema
     */
    initializePayment: Joi.ObjectSchema<any>;
    /**
     * Verify payment schema
     */
    verifyPayment: Joi.ObjectSchema<any>;
    /**
     * Process refund schema
     */
    processRefund: Joi.ObjectSchema<any>;
};
/**
 * Shipping validation schemas
 */
export declare const shippingSchemas: {
    /**
     * Calculate shipping schema
     */
    calculateShipping: Joi.ObjectSchema<any>;
    /**
     * Update tracking schema
     */
    updateTracking: Joi.ObjectSchema<any>;
};
/**
 * Order analytics schemas
 */
export declare const orderAnalyticsSchemas: {
    /**
     * Order analytics query schema
     */
    analyticsQuery: Joi.ObjectSchema<any>;
    /**
     * Sales report schema
     */
    salesReportQuery: Joi.ObjectSchema<any>;
};
declare const _default: {
    orderSchemas: {
        /**
         * Create order schema
         */
        createOrder: Joi.ObjectSchema<any>;
        /**
         * Update order status schema (Admin)
         */
        updateOrderStatus: Joi.ObjectSchema<any>;
        /**
         * Order query parameters schema
         */
        orderQuery: Joi.ObjectSchema<any>;
        /**
         * Cancel order schema
         */
        cancelOrder: Joi.ObjectSchema<any>;
    };
    cartSchemas: {
        /**
         * Add to cart schema
         */
        addToCart: Joi.ObjectSchema<any>;
        /**
         * Update cart item schema
         */
        updateCartItem: Joi.ObjectSchema<any>;
        /**
         * Apply coupon schema
         */
        applyCoupon: Joi.ObjectSchema<any>;
        /**
         * Update shipping address for cart
         */
        updateShipping: Joi.ObjectSchema<any>;
    };
    checkoutSchemas: {
        /**
         * Initialize checkout schema
         */
        initializeCheckout: Joi.ObjectSchema<any>;
        /**
         * Guest checkout schema
         */
        guestCheckout: Joi.ObjectSchema<any>;
    };
    paymentSchemas: {
        /**
         * Initialize payment schema
         */
        initializePayment: Joi.ObjectSchema<any>;
        /**
         * Verify payment schema
         */
        verifyPayment: Joi.ObjectSchema<any>;
        /**
         * Process refund schema
         */
        processRefund: Joi.ObjectSchema<any>;
    };
    shippingSchemas: {
        /**
         * Calculate shipping schema
         */
        calculateShipping: Joi.ObjectSchema<any>;
        /**
         * Update tracking schema
         */
        updateTracking: Joi.ObjectSchema<any>;
    };
    orderAnalyticsSchemas: {
        /**
         * Order analytics query schema
         */
        analyticsQuery: Joi.ObjectSchema<any>;
        /**
         * Sales report schema
         */
        salesReportQuery: Joi.ObjectSchema<any>;
    };
};
export default _default;
//# sourceMappingURL=orderSchemas.d.ts.map