import { BaseService } from "../BaseService";
import { RedisService } from "./RedisService";
export interface CacheOptions {
    ttl?: number;
    prefix?: string;
    serialize?: boolean;
}
export declare class CacheService extends BaseService {
    private redis;
    private defaultTTL;
    constructor(redisService: RedisService);
    /**
     * Set cache value
     */
    set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
    /**
     * Get cache value
     */
    get<T>(key: string, options?: CacheOptions): Promise<T | null>;
    /**
     * Delete cache value
     */
    delete(key: string, prefix?: string): Promise<boolean>;
    /**
     * Check if key exists
     */
    exists(key: string, prefix?: string): Promise<boolean>;
    /**
     * Get or set pattern - fetch from cache or execute function and cache result
     */
    getOrSet<T>(key: string, fetchFunction: () => Promise<T>, options?: CacheOptions): Promise<T>;
    /**
     * Increment counter
     */
    increment(key: string, amount?: number, ttl?: number): Promise<number>;
    /**
     * Set multiple values at once
     */
    setMultiple<T>(entries: Array<{
        key: string;
        value: T;
        ttl?: number;
    }>, prefix?: string): Promise<void>;
    /**
     * Get multiple values at once
     */
    getMultiple<T>(keys: string[], prefix?: string): Promise<Record<string, T | null>>;
    /**
     * Clear cache by pattern
     */
    clearPattern(pattern: string): Promise<number>;
    /**
     * Get cache statistics
     */
    getStats(): Promise<{
        totalKeys: number;
        memoryUsage: string;
        hitRate?: number;
    }>;
    /**
     * Cache warming - preload frequently accessed data
     */
    warmCache(cacheWarmers: Array<{
        key: string;
        loader: () => Promise<any>;
        ttl?: number;
    }>): Promise<void>;
    /**
     * Cache product data
     */
    cacheProduct(productId: string, product: any, ttl?: number): Promise<void>;
    /**
     * Get cached product
     */
    getCachedProduct(productId: string): Promise<any | null>;
    /**
     * Cache product list
     */
    cacheProductList(queryKey: string, products: any[], ttl?: number): Promise<void>;
    /**
     * Cache user session
     */
    cacheUserSession(userId: string, sessionData: any): Promise<void>;
    /**
     * Cache cart data
     */
    cacheCart(cartId: string, cartData: any): Promise<void>;
    /**
     * Invalidate related caches when product changes
     */
    invalidateProductCaches(productId: string): Promise<void>;
    private buildKey;
    private parseMemoryUsage;
}
//# sourceMappingURL=CacheService.d.ts.map