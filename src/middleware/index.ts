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

import { authenticate } from "./auth/authenticate";
import { authorize } from "./auth/AuthMiddleware";
import { asyncHandler } from "./error/errorHandler";
import { auditLogger } from "./logging/auditLogging";
import { requestLogger } from "./logging/requestLogger";
import { helmetConfig } from "./security/helmet";
import { corsConfig, rateLimiter } from "./security/rateLimiter";
import { xssProtection } from "./security/xss";
import { sanitizeInput } from "./validation/sanitizeInput";


// 🔐 Authentication & Authorization
export { authenticate } from "./auth/authenticate";


// ✅ Validation & Sanitization
export { validateRequest } from "./validation/validateRequest";

// 🛡️ Security Protection
export { rateLimiter, createRateLimiter } from "./security/rateLimiter";
// 🔧 Utility types for middleware
export interface MiddlewareOptions {
  skipPaths?: string[];
  enableLogging?: boolean;
  customConfig?: Record<string, any>;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}

export interface CacheConfig {
  ttl: number;
  prefix?: string;
  skipMethods?: string[];
}

/**
 * 🎯 Middleware Pipeline Builder
 * Creates a standardized middleware stack for different route types
 */
export const createMiddlewareStack = {
  // Public routes (no auth required)
  public: () => [
    corsConfig,
    helmetConfig,
    requestLogger,
    rateLimiter.general,
    sanitizeInput,
    xssProtection,
    asyncHandler,
  ],

  // Authenticated routes
  authenticated: () => [
    corsConfig,
    helmetConfig,
    requestLogger,
    rateLimiter.authenticated,
    authenticate,
    sanitizeInput,
    xssProtection,
    asyncHandler,
  ],

  // Admin routes (requires admin role)
  admin: () => [
    corsConfig,
    helmetConfig,
    requestLogger,
    rateLimiter.admin,
    authenticate,
    authorize(["admin", "super_admin"]),
    sanitizeInput,
    xssProtection,
    auditLogger,
    asyncHandler,
  ],

  // Payment/sensitive routes (extra security)
  payment: () => [
    corsConfig,
    helmetConfig,
    requestLogger,
    rateLimiter.payment,
    authenticate,
    sanitizeInput,
    xssProtection,
    auditLogger,
    asyncHandler,
  ],
};

// 🚀 Quick setup for common middleware combinations
export const middlewarePresets = {
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
