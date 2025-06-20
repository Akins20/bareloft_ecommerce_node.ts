"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitorValidation = exports.validateIf = exports.validateSchema = void 0;
const winston_1 = require("../../utils/logger/winston");
// Schema cache for performance
const schemaCache = new Map();
/**
 * 🎯 Dynamic schema validation
 * Validates against dynamically provided schemas
 */
const validateSchema = (schemaProvider, options = {}) => {
    const { cache = true, abortEarly = false, stripUnknown = true, convert = true, allowUnknown = false, } = options;
    return async (req, res, next) => {
        try {
            let schema;
            // Try to get schema from cache
            const cacheKey = options.cacheKey || `${req.method}:${req.route?.path || req.path}`;
            if (cache && schemaCache.has(cacheKey)) {
                schema = schemaCache.get(cacheKey);
            }
            else {
                schema = await schemaProvider(req);
                if (cache) {
                    schemaCache.set(cacheKey, schema);
                }
            }
            // Validate request data
            const { error, value } = schema.validate(req.body, {
                abortEarly,
                stripUnknown,
                convert,
                allowUnknown,
            });
            if (error) {
                const validationErrors = error.details.map((detail) => ({
                    field: detail.path.join("."),
                    message: detail.message,
                    value: detail.context?.value,
                    type: detail.type,
                }));
                winston_1.logger.warn("Schema validation failed", {
                    path: req.path,
                    method: req.method,
                    errors: validationErrors,
                    ip: req.ip,
                });
                return res.status(400).json({
                    success: false,
                    error: "SCHEMA_VALIDATION_ERROR",
                    message: "Request data does not match required schema",
                    details: validationErrors,
                    code: "SCHEMA_001",
                });
            }
            // Replace request body with validated/converted data
            req.body = value;
            next();
        }
        catch (error) {
            winston_1.logger.error("Schema validation middleware error", {
                error: error instanceof Error ? error.message : "Unknown error",
                path: req.path,
                method: req.method,
            });
            res.status(500).json({
                success: false,
                error: "SCHEMA_SERVICE_ERROR",
                message: "Schema validation service unavailable",
                code: "SCHEMA_500",
            });
        }
    };
};
exports.validateSchema = validateSchema;
/**
 * 🔄 Conditional validation
 * Applies validation only when certain conditions are met
 */
const validateIf = (condition, schema) => {
    return (req, res, next) => {
        if (!condition(req)) {
            return next();
        }
        (0, exports.validateSchema)(() => schema)(req, res, next);
    };
};
exports.validateIf = validateIf;
/**
 * 📊 Validation performance monitoring
 */
const monitorValidation = (req, res, next) => {
    const startTime = Date.now();
    // Override the end method to capture timing
    const originalEnd = res.end;
    res.end = function (...args) {
        const duration = Date.now() - startTime;
        if (duration > 100) {
            // Log slow validations
            winston_1.logger.warn("Slow validation detected", {
                path: req.path,
                method: req.method,
                duration,
                ip: req.ip,
            });
        }
        originalEnd.apply(this, args);
    };
    next();
};
exports.monitorValidation = monitorValidation;
//# sourceMappingURL=validateSchema.js.map