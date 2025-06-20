import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { logger } from "../../utils/logger/winston";

// Schema cache for performance
const schemaCache = new Map<string, Joi.Schema>();

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
export const validateSchema = (
  schemaProvider: (req: Request) => Joi.Schema | Promise<Joi.Schema>,
  options: SchemaValidationOptions = {}
) => {
  const {
    cache = true,
    abortEarly = false,
    stripUnknown = true,
    convert = true,
    allowUnknown = false,
  } = options;

  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      let schema: Joi.Schema;

      // Try to get schema from cache
      const cacheKey =
        options.cacheKey || `${req.method}:${req.route?.path || req.path}`;

      if (cache && schemaCache.has(cacheKey)) {
        schema = schemaCache.get(cacheKey)!;
      } else {
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

        logger.warn("Schema validation failed", {
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
    } catch (error) {
      logger.error("Schema validation middleware error", {
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

/**
 * 🔄 Conditional validation
 * Applies validation only when certain conditions are met
 */
export const validateIf = (
  condition: (req: Request) => boolean,
  schema: Joi.Schema
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!condition(req)) {
      return next();
    }

    validateSchema(() => schema)(req, res, next);
  };
};

/**
 * 📊 Validation performance monitoring
 */
export const monitorValidation = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Override the end method to capture timing
  const originalEnd = res.end;
  res.end = function (...args: any[]) {
    const duration = Date.now() - startTime;

    if (duration > 100) {
      // Log slow validations
      logger.warn("Slow validation detected", {
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
