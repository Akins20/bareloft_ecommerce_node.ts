/**
 * ✅ Request Validation Middleware
 * Comprehensive validation using Joi with Nigerian market optimizations
 */
import { Request, Response, NextFunction } from "express";
import Joi from "joi";
interface ValidationOptions {
    body?: Joi.ObjectSchema;
    params?: Joi.ObjectSchema;
    query?: Joi.ObjectSchema;
    headers?: Joi.ObjectSchema;
    skipOnError?: boolean;
    customMessages?: Record<string, string>;
}
/**
 * 🔍 Main validation middleware factory
 * Creates validation middleware for different request parts
 */
export declare const validateRequest: (options: ValidationOptions) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * 📋 Pre-built validation schemas for common use cases
 */
export declare const validationSchemas: {
    nigerianPhone: any;
    optionalNigerianPhone: any;
    nigerianState: any;
    nairaAmount: any;
    pagination: Joi.ObjectSchema<any>;
    mongoId: Joi.StringSchema<string>;
    uuid: Joi.StringSchema<string>;
    productSearch: Joi.ObjectSchema<any>;
    userRegistration: Joi.ObjectSchema<any>;
    nigerianAddress: Joi.ObjectSchema<any>;
};
export {};
//# sourceMappingURL=validateRequest.d.ts.map