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
export { authenticate } from "./auth/authenticate";
export { validateRequest } from "./validation/validateRequest";
export { rateLimiter, createRateLimiter } from "./security/rateLimiter";
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
export declare const createMiddlewareStack: {
    public: () => (((fn: (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => Promise<any>) => (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void) | ((req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void) | ((req: import("cors").CorsRequest, res: {
        statusCode?: number | undefined;
        setHeader(key: string, value: string): any;
        end(): any;
    }, next: (err?: any) => any) => void))[];
    authenticated: () => (((fn: (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => Promise<any>) => (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void) | ((req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void) | ((req: import("cors").CorsRequest, res: {
        statusCode?: number | undefined;
        setHeader(key: string, value: string): any;
        end(): any;
    }, next: (err?: any) => any) => void))[];
    admin: () => (((fn: (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => Promise<any>) => (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void) | ((req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void) | ((req: import("cors").CorsRequest, res: {
        statusCode?: number | undefined;
        setHeader(key: string, value: string): any;
        end(): any;
    }, next: (err?: any) => any) => void) | ((req: import("../types").AuthenticatedRequest, res: import("express").Response, next: import("express").NextFunction) => void))[];
    payment: () => (((fn: (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => Promise<any>) => (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void) | ((req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void) | ((req: import("cors").CorsRequest, res: {
        statusCode?: number | undefined;
        setHeader(key: string, value: string): any;
        end(): any;
    }, next: (err?: any) => any) => void))[];
};
export declare const middlewarePresets: {
    development: {
        enableCors: boolean;
        enableLogging: boolean;
        rateLimitStrict: boolean;
        cacheEnabled: boolean;
    };
    production: {
        enableCors: boolean;
        enableLogging: boolean;
        rateLimitStrict: boolean;
        cacheEnabled: boolean;
    };
    testing: {
        enableCors: boolean;
        enableLogging: boolean;
        rateLimitStrict: boolean;
        cacheEnabled: boolean;
    };
};
//# sourceMappingURL=index.d.ts.map