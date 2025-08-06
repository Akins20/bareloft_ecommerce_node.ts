/**
 * ❌ Global Error Handling Middleware
 * Comprehensive error handling with Nigerian market considerations
 */

import { Request, Response, NextFunction } from "express";
import { logger } from "../../utils/logger/winston";
import { config } from "../../config/environment";

// Extend Express Request type to include additional properties
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

// 🔧 Custom error types
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errorCode: string;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = "INTERNAL_ERROR",
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errorCode = errorCode;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 🔧 Specific error classes for different scenarios
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(message, 403, "AUTHORIZATION_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT_ERROR");
  }
}

export class PaymentError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 402, "PAYMENT_ERROR", details);
  }
}

export class InventoryError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, "INVENTORY_ERROR", details);
  }
}

/**
 * 🇳🇬 Nigerian-friendly error messages
 */
const getNigerianFriendlyMessage = (error: any): string => {
  const friendlyMessages: Record<string, string> = {
    VALIDATION_ERROR: "Please check your input and try again",
    AUTHENTICATION_ERROR: "Please log in to continue",
    AUTHORIZATION_ERROR: "You do not have permission for this action",
    NOT_FOUND: "The requested item could not be found",
    PAYMENT_ERROR:
      "Payment processing failed. Please try again or contact support",
    INVENTORY_ERROR: "Product is currently out of stock",
    NETWORK_ERROR: "Please check your internet connection and try again",
    SERVER_ERROR: "Something went wrong on our end. Please try again later",
  };

  const errorCode: string = error.errorCode || "SERVER_ERROR";
  return (friendlyMessages[errorCode] ?? friendlyMessages["SERVER_ERROR"]) as string;
};

/**
 * 🔍 Error classification
 */
const classifyError = (
  error: any
): {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  shouldNotify: boolean;
} => {
  // Database errors
  if (error.code === "P2002") {
    // Prisma unique constraint
    return { type: "database", severity: "low", shouldNotify: false };
  }

  if (error.code?.startsWith("P")) {
    // Other Prisma errors
    return { type: "database", severity: "medium", shouldNotify: true };
  }

  // Authentication/Authorization errors
  if (error.statusCode === 401 || error.statusCode === 403) {
    return { type: "auth", severity: "low", shouldNotify: false };
  }

  // Validation errors
  if (error.statusCode === 400 && error.errorCode === "VALIDATION_ERROR") {
    return { type: "validation", severity: "low", shouldNotify: false };
  }

  // Payment errors
  if (error.errorCode === "PAYMENT_ERROR") {
    return { type: "payment", severity: "high", shouldNotify: true };
  }

  // Network/External service errors
  if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
    return { type: "network", severity: "high", shouldNotify: true };
  }

  // File system errors
  if (error.code === "ENOENT" || error.code === "EACCES") {
    return { type: "filesystem", severity: "medium", shouldNotify: true };
  }

  // Unknown/unhandled errors
  if (error.statusCode >= 500) {
    return { type: "server", severity: "critical", shouldNotify: true };
  }

  return { type: "unknown", severity: "medium", shouldNotify: true };
};

/**
 * 📊 Error metrics tracking
 */
const trackErrorMetrics = (error: any, req: Request): void => {
  const classification = classifyError(error);

  // Log error with context
  logger.error("Request error occurred", {
    error: {
      message: error.message,
      code: error.errorCode || error.code,
      statusCode: error.statusCode,
      stack: error.stack,
      type: classification.type,
      severity: classification.severity,
    },
    request: {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      userId: req.user?.id,
      sessionId: req.user?.sessionId,
    },
    timestamp: new Date().toISOString(),
  });

  // Track error frequency for monitoring
  // This would integrate with your monitoring service (e.g., DataDog, New Relic)
  if (classification.shouldNotify && config.nodeEnv === "production") {
    // Send to error tracking service
    // Sentry, Bugsnag, etc.
  }
};

/**
 * 🛠️ Main error handling middleware
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Track error metrics
  trackErrorMetrics(error, req);

  // Default error values
  let statusCode = error.statusCode || 500;
  let errorCode = error.errorCode || "INTERNAL_ERROR";
  let message = error.message || "Internal server error";
  let details = error.details;

  // Handle specific error types
  if (error.name === "ValidationError") {
    statusCode = 400;
    errorCode = "VALIDATION_ERROR";
    message = "Validation failed";
    details = error.details;
  }

  // Handle Prisma database errors
  if (error.code === "P2002") {
    statusCode = 409;
    errorCode = "DUPLICATE_ERROR";
    message = "A record with this information already exists";
    details = { field: error.meta?.target };
  }

  if (error.code === "P2025") {
    statusCode = 404;
    errorCode = "NOT_FOUND";
    message = "Record not found";
  }

  // Handle JWT errors
  if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    errorCode = "INVALID_TOKEN";
    message = "Invalid authentication token";
  }

  if (error.name === "TokenExpiredError") {
    statusCode = 401;
    errorCode = "TOKEN_EXPIRED";
    message = "Authentication token has expired";
  }

  // Handle Joi validation errors
  if (error.name === "ValidationError" && error.isJoi) {
    statusCode = 400;
    errorCode = "VALIDATION_ERROR";
    message = "Request validation failed";
    details = error.details?.map((detail: any) => ({
      field: detail.path.join("."),
      message: detail.message,
    }));
  }

  // Handle MongoDB/Mongoose errors
  if (error.name === "CastError") {
    statusCode = 400;
    errorCode = "INVALID_ID";
    message = "Invalid ID format";
  }

  // Handle multer file upload errors
  if (error.code === "LIMIT_FILE_SIZE") {
    statusCode = 413;
    errorCode = "FILE_TOO_LARGE";
    message = "File size exceeds the allowed limit";
  }

  // Build error response
  const errorResponse: any = {
    success: false,
    error: errorCode,
    message:
      config.nodeEnv === "production"
        ? getNigerianFriendlyMessage({ errorCode })
        : message,
    ...(details && { details }),
    timestamp: new Date().toISOString(),
  };

  // Add request ID for tracking (if available)
  if (req.id) {
    errorResponse.requestId = req.id;
  }

  // Include stack trace in development
  if (config.nodeEnv === "development") {
    errorResponse.stack = error.stack;
    errorResponse.originalMessage = message;
  }

  // Add helpful hints for common errors
  if (statusCode === 401) {
    errorResponse.hint =
      "Try logging in again or check your authentication token";
  }

  if (statusCode === 403) {
    errorResponse.hint =
      "Contact support if you believe you should have access to this resource";
  }

  if (statusCode === 404) {
    errorResponse.hint = "Check the URL or try searching for what you need";
  }

  if (errorCode === "PAYMENT_ERROR") {
    errorResponse.hint = "Try a different payment method or contact your bank";
    errorResponse.supportContact = "support@bareloft.com";
  }

  res.status(statusCode).json(errorResponse);
};

// ==========================================

// src/middleware/error/notFound.ts
/**
 * 🔍 404 Not Found Handler
 * Handles requests to non-existent endpoints
 */

/**
 * 🚫 404 Not Found middleware
 * Provides helpful responses for missing endpoints
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log 404 attempts for monitoring
  logger.warn("404 - Route not found", {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    referer: req.get("Referer"),
    userId: req.user?.id,
  });

  // Check if this looks like an API request
  const isApiRequest =
    req.path.startsWith("/api/") ||
    req.get("Accept")?.includes("application/json") ||
    req.get("Content-Type")?.includes("application/json");

  if (isApiRequest) {
    // API endpoint not found
    const suggestions = generateApiSuggestions(req.path);

    res.status(404).json({
      success: false,
      error: "ENDPOINT_NOT_FOUND",
      message: "The requested API endpoint does not exist",
      code: "404_001",
      path: req.path,
      method: req.method,
      ...(suggestions.length > 0 && { suggestions }),
      documentation: "https://docs.bareloft.com/api",
      timestamp: new Date().toISOString(),
    });
  } else {
    // Web page not found
    res.status(404).json({
      success: false,
      error: "PAGE_NOT_FOUND",
      message: "The requested page could not be found",
      code: "404_002",
      path: req.path,
      suggestions: [
        "Check the URL for typos",
        "Visit our homepage",
        "Use the search feature",
        "Browse our product categories",
      ],
      links: {
        homepage: "/",
        products: "/products",
        support: "/support",
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * 🎯 Generate API endpoint suggestions
 * Suggests similar endpoints when one is not found
 */
const generateApiSuggestions = (requestedPath: string): string[] => {
  const commonEndpoints = [
    "/api/v1/auth/login",
    "/api/v1/auth/signup",
    "/api/v1/auth/refresh",
    "/api/v1/products",
    "/api/v1/products/search",
    "/api/v1/categories",
    "/api/v1/cart",
    "/api/v1/orders",
    "/api/v1/users/profile",
    "/api/v1/addresses",
    "/api/v1/wishlist",
    "/api/admin/products",
    "/api/admin/orders",
    "/api/admin/inventory",
    "/api/admin/analytics",
  ];

  const suggestions: string[] = [];
  const normalizedPath = requestedPath.toLowerCase();

  // Find similar endpoints using basic string matching
  commonEndpoints.forEach((endpoint) => {
    const normalizedEndpoint = endpoint.toLowerCase();

    // Check for partial matches
    if (
      normalizedEndpoint.includes(
        normalizedPath.replace("/api/", "").split("/")[0] || ""
      ) ||
      normalizedPath.includes(normalizedEndpoint.split("/")[3] ?? "")
    ) {
      suggestions.push(endpoint);
    }
  });

  // Limit suggestions to top 3
  return suggestions.slice(0, 3);
};

// ==========================================

// src/middleware/error/asyncHandler.ts
/**
 * 🔄 Async Error Handler
 * Wraps async functions to catch and forward errors
 */

type AsyncFunction = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

/**
 * 🔧 Async handler wrapper
 * Automatically catches async errors and forwards them to error middleware
 */
export const asyncHandler = (fn: AsyncFunction) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 🎯 Controller wrapper for consistent error handling
 * Provides additional context and logging for controller errors
 */
export const controllerWrapper = (
  controllerName: string,
  actionName: string
) => {
  return (fn: AsyncFunction) => {
    return asyncHandler(
      async (req: Request, res: Response, next: NextFunction) => {
        const startTime = Date.now();

        try {
          await fn(req, res, next);

          // Log successful controller execution
          const duration = Date.now() - startTime;
          if (duration > 1000) {
            // Log slow operations
            logger.warn("Slow controller execution", {
              controller: controllerName,
              action: actionName,
              duration,
              path: req.path,
              method: req.method,
              userId: req.user?.id,
            });
          }
        } catch (error) {
          // Add controller context to error
          const enhancedError =
            error instanceof Error ? error : new Error(String(error));
          (enhancedError as any).controller = controllerName;
          (enhancedError as any).action = actionName;
          (enhancedError as any).duration = Date.now() - startTime;

          throw enhancedError;
        }
      }
    );
  };
};

/**
 * 🛡️ Service wrapper for external service calls
 * Handles timeout and retry logic for external services
 */
export const serviceWrapper = (serviceName: string, timeout: number = 5000) => {
  return (fn: AsyncFunction) => {
    return asyncHandler(
      async (req: Request, res: Response, next: NextFunction) => {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(`${serviceName} service timeout after ${timeout}ms`)
            );
          }, timeout);
        });

        try {
          await Promise.race([fn(req, res, next), timeoutPromise]);
        } catch (error) {
          // Add service context to error
          const serviceError =
            error instanceof Error ? error : new Error(String(error));
          (serviceError as any).service = serviceName;
          (serviceError as any).isServiceError = true;

          logger.error(`${serviceName} service error`, {
            service: serviceName,
            error: serviceError.message,
            path: req.path,
            method: req.method,
            userId: req.user?.id,
          });

          throw serviceError;
        }
      }
    );
  };
};

/**
 * 📊 Performance monitoring wrapper
 * Tracks execution time and resource usage
 */
export const performanceWrapper = (threshold: number = 1000) => {
  return (fn: AsyncFunction) => {
    return asyncHandler(
      async (req: Request, res: Response, next: NextFunction) => {
        const startTime = Date.now();
        const startMemory = process.memoryUsage();

        try {
          await fn(req, res, next);
        } finally {
          const duration = Date.now() - startTime;
          const endMemory = process.memoryUsage();
          const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

          if (duration > threshold) {
            logger.warn("Performance threshold exceeded", {
              duration,
              memoryDelta,
              path: req.path,
              method: req.method,
              userId: req.user?.id,
              threshold,
            });
          }

          // Add performance headers
          res.set("X-Response-Time", `${duration}ms`);
          res.set("X-Memory-Delta", `${Math.round(memoryDelta / 1024)}KB`);
        }
      }
    );
  };
};
