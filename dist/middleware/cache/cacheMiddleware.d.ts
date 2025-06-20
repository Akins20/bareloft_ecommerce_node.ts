/**
 * ⚡ Cache Middleware
 * Intelligent caching system optimized for Nigerian e-commerce
 */
import { Request, Response, NextFunction } from "express";
interface CacheOptions {
    ttl?: number;
    prefix?: string;
    skipMethods?: string[];
    skipPaths?: string[];
    varyBy?: string[];
    compress?: boolean;
    staleWhileRevalidate?: number;
    maxSize?: number;
    conditionalCaching?: (req: Request) => boolean;
}
/**
 * ⚡ Main cache middleware factory
 */
export declare const cacheMiddleware: (options?: CacheOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * 🗑️ Cache invalidation middleware
 * Invalidates cache entries when data changes
 */
export declare const invalidateCache: (patterns: string[] | ((req: Request) => string[])) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * 🎯 Pre-configured cache strategies
 */
export declare const cacheStrategies: {
    products: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    productDetails: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    categories: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    static: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    userSpecific: (req: Request, res: Response, next: NextFunction) => Promise<void>;
};
export {};
//# sourceMappingURL=cacheMiddleware.d.ts.map