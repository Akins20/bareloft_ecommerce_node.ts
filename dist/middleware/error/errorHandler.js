"use strict";
/**
 * ❌ Global Error Handling Middleware
 * Comprehensive error handling with Nigerian market considerations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceWrapper = exports.serviceWrapper = exports.controllerWrapper = exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = exports.InventoryError = exports.PaymentError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
const winston_1 = require("../../utils/logger/winston");
const environment_1 = require("../../config/environment");
// 🔧 Custom error types
class AppError extends Error {
    statusCode;
    isOperational;
    errorCode;
    details;
    constructor(message, statusCode = 500, errorCode = "INTERNAL_ERROR", details) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.errorCode = errorCode;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
// 🔧 Specific error classes for different scenarios
class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 400, "VALIDATION_ERROR", details);
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends AppError {
    constructor(message = "Authentication required") {
        super(message, 401, "AUTHENTICATION_ERROR");
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = "Insufficient permissions") {
        super(message, 403, "AUTHORIZATION_ERROR");
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends AppError {
    constructor(resource = "Resource") {
        super(`${resource} not found`, 404, "NOT_FOUND");
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message) {
        super(message, 409, "CONFLICT_ERROR");
    }
}
exports.ConflictError = ConflictError;
class PaymentError extends AppError {
    constructor(message, details) {
        super(message, 402, "PAYMENT_ERROR", details);
    }
}
exports.PaymentError = PaymentError;
class InventoryError extends AppError {
    constructor(message, details) {
        super(message, 400, "INVENTORY_ERROR", details);
    }
}
exports.InventoryError = InventoryError;
/**
 * 🇳🇬 Nigerian-friendly error messages
 */
const getNigerianFriendlyMessage = (error) => {
    const friendlyMessages = {
        VALIDATION_ERROR: "Please check your input and try again",
        AUTHENTICATION_ERROR: "Please log in to continue",
        AUTHORIZATION_ERROR: "You do not have permission for this action",
        NOT_FOUND: "The requested item could not be found",
        PAYMENT_ERROR: "Payment processing failed. Please try again or contact support",
        INVENTORY_ERROR: "Product is currently out of stock",
        NETWORK_ERROR: "Please check your internet connection and try again",
        SERVER_ERROR: "Something went wrong on our end. Please try again later",
    };
    const errorCode = error.errorCode || "SERVER_ERROR";
    return (friendlyMessages[errorCode] ?? friendlyMessages["SERVER_ERROR"]);
};
/**
 * 🔍 Error classification
 */
const classifyError = (error) => {
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
const trackErrorMetrics = (error, req) => {
    const classification = classifyError(error);
    // Log error with context
    winston_1.logger.error("Request error occurred", {
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
    if (classification.shouldNotify && environment_1.config.nodeEnv === "production") {
        // Send to error tracking service
        // Sentry, Bugsnag, etc.
    }
};
/**
 * 🛠️ Main error handling middleware
 */
const errorHandler = (error, req, res, next) => {
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
        details = error.details?.map((detail) => ({
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
    const errorResponse = {
        success: false,
        error: errorCode,
        message: environment_1.config.nodeEnv === "production"
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
    if (environment_1.config.nodeEnv === "development") {
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
exports.errorHandler = errorHandler;
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
const notFoundHandler = (req, res, next) => {
    // Log 404 attempts for monitoring
    winston_1.logger.warn("404 - Route not found", {
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        referer: req.get("Referer"),
        userId: req.user?.id,
    });
    // Check if this looks like an API request
    const isApiRequest = req.path.startsWith("/api/") ||
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
    }
    else {
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
exports.notFoundHandler = notFoundHandler;
/**
 * 🎯 Generate API endpoint suggestions
 * Suggests similar endpoints when one is not found
 */
const generateApiSuggestions = (requestedPath) => {
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
    const suggestions = [];
    const normalizedPath = requestedPath.toLowerCase();
    // Find similar endpoints using basic string matching
    commonEndpoints.forEach((endpoint) => {
        const normalizedEndpoint = endpoint.toLowerCase();
        // Check for partial matches
        if (normalizedEndpoint.includes(normalizedPath.replace("/api/", "").split("/")[0] || "") ||
            normalizedPath.includes(normalizedEndpoint.split("/")[3] ?? "")) {
            suggestions.push(endpoint);
        }
    });
    // Limit suggestions to top 3
    return suggestions.slice(0, 3);
};
/**
 * 🔧 Async handler wrapper
 * Automatically catches async errors and forwards them to error middleware
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
/**
 * 🎯 Controller wrapper for consistent error handling
 * Provides additional context and logging for controller errors
 */
const controllerWrapper = (controllerName, actionName) => {
    return (fn) => {
        return (0, exports.asyncHandler)(async (req, res, next) => {
            const startTime = Date.now();
            try {
                await fn(req, res, next);
                // Log successful controller execution
                const duration = Date.now() - startTime;
                if (duration > 1000) {
                    // Log slow operations
                    winston_1.logger.warn("Slow controller execution", {
                        controller: controllerName,
                        action: actionName,
                        duration,
                        path: req.path,
                        method: req.method,
                        userId: req.user?.id,
                    });
                }
            }
            catch (error) {
                // Add controller context to error
                const enhancedError = error instanceof Error ? error : new Error(String(error));
                enhancedError.controller = controllerName;
                enhancedError.action = actionName;
                enhancedError.duration = Date.now() - startTime;
                throw enhancedError;
            }
        });
    };
};
exports.controllerWrapper = controllerWrapper;
/**
 * 🛡️ Service wrapper for external service calls
 * Handles timeout and retry logic for external services
 */
const serviceWrapper = (serviceName, timeout = 5000) => {
    return (fn) => {
        return (0, exports.asyncHandler)(async (req, res, next) => {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`${serviceName} service timeout after ${timeout}ms`));
                }, timeout);
            });
            try {
                await Promise.race([fn(req, res, next), timeoutPromise]);
            }
            catch (error) {
                // Add service context to error
                const serviceError = error instanceof Error ? error : new Error(String(error));
                serviceError.service = serviceName;
                serviceError.isServiceError = true;
                winston_1.logger.error(`${serviceName} service error`, {
                    service: serviceName,
                    error: serviceError.message,
                    path: req.path,
                    method: req.method,
                    userId: req.user?.id,
                });
                throw serviceError;
            }
        });
    };
};
exports.serviceWrapper = serviceWrapper;
/**
 * 📊 Performance monitoring wrapper
 * Tracks execution time and resource usage
 */
const performanceWrapper = (threshold = 1000) => {
    return (fn) => {
        return (0, exports.asyncHandler)(async (req, res, next) => {
            const startTime = Date.now();
            const startMemory = process.memoryUsage();
            try {
                await fn(req, res, next);
            }
            finally {
                const duration = Date.now() - startTime;
                const endMemory = process.memoryUsage();
                const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
                if (duration > threshold) {
                    winston_1.logger.warn("Performance threshold exceeded", {
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
        });
    };
};
exports.performanceWrapper = performanceWrapper;
//# sourceMappingURL=errorHandler.js.map