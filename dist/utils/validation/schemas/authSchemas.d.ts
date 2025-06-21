import Joi from "joi";
/**
 * Authentication validation schemas
 */
export declare const authSchemas: {
    /**
     * Request OTP schema
     */
    requestOTP: Joi.ObjectSchema<any>;
    /**
     * Verify OTP schema
     */
    verifyOTP: Joi.ObjectSchema<any>;
    /**
     * User signup schema
     */
    signup: Joi.ObjectSchema<any>;
    /**
     * Login schema
     */
    login: Joi.ObjectSchema<any>;
    /**
     * Refresh token schema
     */
    refreshToken: Joi.ObjectSchema<any>;
    /**
     * Password reset schema (for future implementation)
     */
    resetPassword: Joi.ObjectSchema<any>;
    /**
     * Change password schema
     */
    changePassword: Joi.ObjectSchema<any>;
};
/**
 * User profile validation schemas
 */
export declare const userSchemas: {
    /**
     * Update profile schema
     */
    updateProfile: Joi.ObjectSchema<any>;
    /**
     * Create address schema
     */
    createAddress: Joi.ObjectSchema<any>;
    /**
     * Update address schema
     */
    updateAddress: Joi.ObjectSchema<any>;
};
/**
 * Common validation schemas
 */
export declare const commonSchemas: {
    /**
     * Pagination schema
     */
    pagination: Joi.ObjectSchema<any>;
    /**
     * Search schema
     */
    search: Joi.ObjectSchema<any>;
    /**
     * UUID parameter schema
     */
    uuidParam: Joi.ObjectSchema<any>;
    /**
     * Date range schema
     */
    dateRange: Joi.ObjectSchema<any>;
};
declare const _default: {
    authSchemas: {
        /**
         * Request OTP schema
         */
        requestOTP: Joi.ObjectSchema<any>;
        /**
         * Verify OTP schema
         */
        verifyOTP: Joi.ObjectSchema<any>;
        /**
         * User signup schema
         */
        signup: Joi.ObjectSchema<any>;
        /**
         * Login schema
         */
        login: Joi.ObjectSchema<any>;
        /**
         * Refresh token schema
         */
        refreshToken: Joi.ObjectSchema<any>;
        /**
         * Password reset schema (for future implementation)
         */
        resetPassword: Joi.ObjectSchema<any>;
        /**
         * Change password schema
         */
        changePassword: Joi.ObjectSchema<any>;
    };
    userSchemas: {
        /**
         * Update profile schema
         */
        updateProfile: Joi.ObjectSchema<any>;
        /**
         * Create address schema
         */
        createAddress: Joi.ObjectSchema<any>;
        /**
         * Update address schema
         */
        updateAddress: Joi.ObjectSchema<any>;
    };
    commonSchemas: {
        /**
         * Pagination schema
         */
        pagination: Joi.ObjectSchema<any>;
        /**
         * Search schema
         */
        search: Joi.ObjectSchema<any>;
        /**
         * UUID parameter schema
         */
        uuidParam: Joi.ObjectSchema<any>;
        /**
         * Date range schema
         */
        dateRange: Joi.ObjectSchema<any>;
    };
};
export default _default;
//# sourceMappingURL=authSchemas.d.ts.map