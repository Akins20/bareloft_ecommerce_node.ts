/**
 * ⚡ Cache Middleware
 * Intelligent caching system optimized for Nigerian e-commerce
 */
import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../types/auth.types";
interface CacheOptions {
    ttl?: number;
    prefix?: string;
    skipMethods?: string[];
    skipPaths?: string[];
    varyBy?: string[];
    compress?: boolean;
    staleWhileRevalidate?: number;
    maxSize?: number;
    conditionalCaching?: (req: AuthenticatedRequest) => boolean;
}
/**
 * ⚡ Main cache middleware factory
 */
export declare const cacheMiddleware: (options?: CacheOptions) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * 🗑️ Cache invalidation middleware
 * Invalidates cache entries when data changes
 */
export declare const invalidateCache: (patterns: string[] | ((req: AuthenticatedRequest) => string[])) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * 🎯 Pre-configured cache strategies
 */
export declare const cacheStrategies: {
    products: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    productDetails: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    categories: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    static: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    userSpecific: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
};
export {};
//# sourceMappingURL=cacheMiddleware.d.ts.map