import { Request, Response, NextFunction } from "express";
import Joi from "joi";
interface SchemaValidationOptions {
    cache?: boolean;
    cacheKey?: string;
    abortEarly?: boolean;
    stripUnknown?: boolean;
    convert?: boolean;
    allowUnknown?: boolean;
}
/**
 * 🎯 Dynamic schema validation
 * Validates against dynamically provided schemas
 */
export declare const validateSchema: (schemaProvider: (req: Request) => Joi.Schema | Promise<Joi.Schema>, options?: SchemaValidationOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * 🔄 Conditional validation
 * Applies validation only when certain conditions are met
 */
export declare const validateIf: (condition: (req: Request) => boolean, schema: Joi.Schema) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * 📊 Validation performance monitoring
 */
export declare const monitorValidation: (req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=validateSchema.d.ts.map