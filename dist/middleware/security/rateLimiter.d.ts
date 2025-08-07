/**
 * 🚦 Rate Limiting Middleware
 * Protects against DDoS attacks and abuse
 * Nigerian market optimized with mobile-friendly limits
 */
import { Request } from "express";
import "../auth/authenticate";
declare const createRateLimiter: (options: {
    windowMs: number;
    max: number;
    message?: string;
    skipSuccessfulRequests?: boolean;
    keyGenerator?: (req: Request) => string;
}) => import("express-rate-limit").RateLimitRequestHandler;
export declare const rateLimiter: {
    general: import("express-rate-limit").RateLimitRequestHandler;
    auth: import("express-rate-limit").RateLimitRequestHandler;
    otp: import("express-rate-limit").RateLimitRequestHandler;
    authenticated: import("express-rate-limit").RateLimitRequestHandler;
    admin: import("express-rate-limit").RateLimitRequestHandler;
    payment: import("express-rate-limit").RateLimitRequestHandler;
    upload: import("express-rate-limit").RateLimitRequestHandler;
    webhook: import("express-rate-limit").RateLimitRequestHandler;
};
export { createRateLimiter };
/**
 * 🌐 CORS Configuration
 * Cross-Origin Resource Sharing setup for Nigerian market
 */
import cors from "cors";
export declare const corsConfig: (req: cors.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void;
//# sourceMappingURL=rateLimiter.d.ts.map