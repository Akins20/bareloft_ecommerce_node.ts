"use strict";
/**
 * 🛡️ Bareloft API Middleware System
 * Central export hub for all middleware components
 *
 * Architecture: Security-first, performance-optimized middleware pipeline
 * - Authentication & Authorization
 * - Input validation & sanitization
 * - Rate limiting & DDoS protection
 * - Error handling & logging
 * - Caching & performance optimization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.middlewarePresets = exports.createMiddlewareStack = exports.createRateLimiter = exports.rateLimiter = exports.validateRequest = exports.authenticate = void 0;
const authenticate_1 = require("./auth/authenticate");
const AuthMiddleware_1 = require("./auth/AuthMiddleware");
const errorHandler_1 = require("./error/errorHandler");
const auditLogging_1 = require("./logging/auditLogging");
const requestLogger_1 = require("./logging/requestLogger");
const helmet_1 = require("./security/helmet");
const rateLimiter_1 = require("./security/rateLimiter");
const xss_1 = require("./security/xss");
const sanitizeInput_1 = require("./validation/sanitizeInput");
// 🔐 Authentication & Authorization
var authenticate_2 = require("./auth/authenticate");
Object.defineProperty(exports, "authenticate", { enumerable: true, get: function () { return authenticate_2.authenticate; } });
// ✅ Validation & Sanitization
var validateRequest_1 = require("./validation/validateRequest");
Object.defineProperty(exports, "validateRequest", { enumerable: true, get: function () { return validateRequest_1.validateRequest; } });
// 🛡️ Security Protection
var rateLimiter_2 = require("./security/rateLimiter");
Object.defineProperty(exports, "rateLimiter", { enumerable: true, get: function () { return rateLimiter_2.rateLimiter; } });
Object.defineProperty(exports, "createRateLimiter", { enumerable: true, get: function () { return rateLimiter_2.createRateLimiter; } });
/**
 * 🎯 Middleware Pipeline Builder
 * Creates a standardized middleware stack for different route types
 */
exports.createMiddlewareStack = {
    // Public routes (no auth required)
    public: () => [
        rateLimiter_1.corsConfig,
        helmet_1.helmetConfig,
        requestLogger_1.requestLogger,
        rateLimiter_1.rateLimiter.general,
        sanitizeInput_1.sanitizeInput,
        xss_1.xssProtection,
        errorHandler_1.asyncHandler,
    ],
    // Authenticated routes
    authenticated: () => [
        rateLimiter_1.corsConfig,
        helmet_1.helmetConfig,
        requestLogger_1.requestLogger,
        rateLimiter_1.rateLimiter.authenticated,
        authenticate_1.authenticate,
        sanitizeInput_1.sanitizeInput,
        xss_1.xssProtection,
        errorHandler_1.asyncHandler,
    ],
    // Admin routes (requires admin role)
    admin: () => [
        rateLimiter_1.corsConfig,
        helmet_1.helmetConfig,
        requestLogger_1.requestLogger,
        rateLimiter_1.rateLimiter.admin,
        authenticate_1.authenticate,
        (0, AuthMiddleware_1.authorize)(["admin", "super_admin"]),
        sanitizeInput_1.sanitizeInput,
        xss_1.xssProtection,
        auditLogging_1.auditLogger,
        errorHandler_1.asyncHandler,
    ],
    // Payment/sensitive routes (extra security)
    payment: () => [
        rateLimiter_1.corsConfig,
        helmet_1.helmetConfig,
        requestLogger_1.requestLogger,
        rateLimiter_1.rateLimiter.payment,
        authenticate_1.authenticate,
        sanitizeInput_1.sanitizeInput,
        xss_1.xssProtection,
        auditLogging_1.auditLogger,
        errorHandler_1.asyncHandler,
    ],
};
// 🚀 Quick setup for common middleware combinations
exports.middlewarePresets = {
    development: {
        enableCors: true,
        enableLogging: true,
        rateLimitStrict: false,
        cacheEnabled: false,
    },
    production: {
        enableCors: false, // Configure specific origins
        enableLogging: true,
        rateLimitStrict: true,
        cacheEnabled: true,
    },
    testing: {
        enableCors: true,
        enableLogging: false,
        rateLimitStrict: false,
        cacheEnabled: false,
    },
};
//# sourceMappingURL=index.js.map