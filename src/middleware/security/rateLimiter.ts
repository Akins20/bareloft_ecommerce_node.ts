/**
 * 🚦 Rate Limiting Middleware
 * Protects against DDoS attacks and abuse
 * Nigerian market optimized with mobile-friendly limits
 */

import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import { logger } from "../../utils/logger/winston";

// Import to ensure extended Request type is available
import "../auth/authenticate";

// 🇳🇬 Nigerian-optimized rate limiting
// Accounts for slower mobile networks and data costs
const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || {
      error: "Too many requests from this IP, please try again later.",
      retryAfter: Math.ceil(options.windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,

    // Custom key generator for user-based limiting
    keyGenerator:
      options.keyGenerator ||
      ((req: Request) => {
        // Prefer user ID for authenticated requests, fallback to IP
        return req.user?.id || req.ip || 'anonymous';
      }),

    // Custom handler for rate limit exceeded
    handler: (req: Request, res: Response) => {
      logger.warn("Rate limit exceeded", {
        ip: req.ip,
        userId: req.user?.id,
        userAgent: req.get("User-Agent"),
        path: req.path,
        method: req.method,
      });

      res.status(429).json({
        success: false,
        error: "Rate limit exceeded",
        message: "Too many requests. Please wait before trying again.",
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    },

    // Skip certain IPs (admin, health checks)
    skip: (req: Request) => {
      const skipIPs = process.env.RATE_LIMIT_SKIP_IPS?.split(",") || [];
      return req.ip ? skipIPs.includes(req.ip) : false;
    },
  });
};

// 🎯 Pre-configured rate limiters for different use cases
export const rateLimiter = {
  // General API requests (generous for mobile users)
  general: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50000, // 50000 requests per 15 minutes (10x increase)
    message: "Too many requests, please slow down",
  }),

  // Authentication endpoints (stricter)
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 login attempts per 15 minutes (10x increase)
    message: "Too many login attempts, please try again later",
    skipSuccessfulRequests: true,
  }),

  // OTP requests (very strict)
  otp: createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 30, // 30 OTP requests per 5 minutes (10x increase)
    message:
      "Too many OTP requests, please wait before requesting another code",
  }),

  // Authenticated users (more generous)
  authenticated: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20000, // 20000 requests per 15 minutes for logged-in users (10x increase)
    message: "Request limit reached, please wait",
  }),

  // Admin endpoints (moderate)
  admin: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5000, // 5000 admin requests per 15 minutes (10x increase)
    message: "Admin rate limit exceeded",
  }),

  // Payment endpoints (strict)
  payment: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 payment requests per 15 minutes (10x increase)
    message: "Payment request limit exceeded, please contact support if needed",
  }),

  // File upload (very strict)
  upload: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 200, // 200 uploads per hour (10x increase)
    message: "Upload limit exceeded, please try again later",
  }),

  // Webhook rate limit (high limit for external services)
  webhook: createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10000, // 10000 requests per minute for webhooks (10x increase)
    message: "Webhook rate limit exceeded",
    keyGenerator: (req: Request) => req.ip || 'webhook', // Use IP for webhooks
  }),
};

export { createRateLimiter };

// ==========================================

// src/middleware/security/cors.ts
/**
 * 🌐 CORS Configuration
 * Cross-Origin Resource Sharing setup for Nigerian market
 */

import cors from "cors";
import { config } from "../../config/environment";

const allowedOrigins = [
  "http://localhost:3000", // Development frontend
  "http://localhost:3001", // Alternative dev port
  "https://bareloft.com", // Production domain
  "https://www.bareloft.com", // www subdomain
  "https://admin.bareloft.com", // Admin panel
  "https://staging.bareloft.com", // Staging environment
  // Add mobile app origins if using web views
  "capacitor://localhost",
  "ionic://localhost",
];

// 🇳🇬 Add Nigerian CDN and development origins
if (config.nodeEnv === "development") {
  allowedOrigins.push(
    "http://localhost:8080",
    "http://127.0.0.1:3000",
    "http://192.168.1.*" // Local network for mobile testing
  );
}

export const corsConfig = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list or matches pattern
    const isAllowed = allowedOrigins.some((allowedOrigin) => {
      if (allowedOrigin.includes("*")) {
        const pattern = allowedOrigin.replace("*", "\\d+");
        return new RegExp(pattern).test(origin);
      }
      return allowedOrigin === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn("CORS origin blocked", { origin });
      callback(new Error("Not allowed by CORS"));
    }
  },

  credentials: true, // Allow cookies and auth headers

  // Allowed methods for Nigerian e-commerce
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],

  // Allowed headers
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "Cache-Control",
    "X-CSRF-Token",
    "X-Client-Info",
  ],

  // Expose headers to frontend
  exposedHeaders: [
    "X-Total-Count",
    "X-Page-Count",
    "X-Rate-Limit-Remaining",
    "X-Rate-Limit-Reset",
  ],

  // Cache preflight requests for 24 hours
  maxAge: 86400, // 24 hours

  // Enable preflight across-the-board
  preflightContinue: false,
  optionsSuccessStatus: 204,
});
