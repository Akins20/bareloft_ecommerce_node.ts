"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const BaseService_1 = require("../BaseService");
const types_1 = require("../../types");
class CacheService extends BaseService_1.BaseService {
    redis;
    defaultTTL;
    constructor(redisService) {
        super();
        this.redis = redisService;
        this.defaultTTL = types_1.CONSTANTS.CACHE_TTL.MEDIUM; // 30 minutes default
    }
    /**
     * Set cache value
     */
    async set(key, value, options = {}) {
        try {
            const finalKey = this.buildKey(key, options.prefix);
            const ttl = options.ttl || this.defaultTTL;
            let serializedValue;
            if (options.serialize !== false && typeof value === "object") {
                serializedValue = JSON.stringify(value);
            }
            else {
                serializedValue = String(value);
            }
            await this.redis.setex(finalKey, ttl, serializedValue);
        }
        catch (error) {
            this.handleError("Error setting cache", error);
            // Don't throw - cache failures shouldn't break the app
        }
    }
    /**
     * Get cache value
     */
    async get(key, options = {}) {
        try {
            const finalKey = this.buildKey(key, options.prefix);
            const value = await this.redis.get(finalKey);
            if (value === null) {
                return null;
            }
            if (options.serialize !== false) {
                try {
                    return JSON.parse(value);
                }
                catch {
                    // If JSON parsing fails, return as string
                    return value;
                }
            }
            return value;
        }
        catch (error) {
            this.handleError("Error getting cache", error);
            return null;
        }
    }
    /**
     * Delete cache value
     */
    async delete(key, prefix) {
        try {
            const finalKey = this.buildKey(key, prefix);
            const result = await this.redis.del(finalKey);
            return result > 0;
        }
        catch (error) {
            this.handleError("Error deleting cache", error);
            return false;
        }
    }
    /**
     * Check if key exists
     */
    async exists(key, prefix) {
        try {
            const finalKey = this.buildKey(key, prefix);
            const result = await this.redis.exists(finalKey);
            return result === 1;
        }
        catch (error) {
            this.handleError("Error checking cache existence", error);
            return false;
        }
    }
    /**
     * Get or set pattern - fetch from cache or execute function and cache result
     */
    async getOrSet(key, fetchFunction, options = {}) {
        try {
            // Try to get from cache first
            const cached = await this.get(key, options);
            if (cached !== null) {
                return cached;
            }
            // Cache miss - execute function
            const result = await fetchFunction();
            // Cache the result
            await this.set(key, result, options);
            return result;
        }
        catch (error) {
            this.handleError("Error in getOrSet cache operation", error);
            // If cache fails, still execute the function
            return await fetchFunction();
        }
    }
    /**
     * Increment counter
     */
    async increment(key, amount = 1, ttl) {
        try {
            const finalKey = this.buildKey(key);
            const result = await this.redis.incrby(finalKey, amount);
            if (ttl) {
                await this.redis.expire(finalKey, ttl);
            }
            return result;
        }
        catch (error) {
            this.handleError("Error incrementing cache counter", error);
            return 0;
        }
    }
    /**
     * Set multiple values at once
     */
    async setMultiple(entries, prefix) {
        try {
            const pipeline = this.redis.pipeline();
            for (const entry of entries) {
                const finalKey = this.buildKey(entry.key, prefix);
                const serializedValue = typeof entry.value === "object"
                    ? JSON.stringify(entry.value)
                    : String(entry.value);
                pipeline.setex(finalKey, entry.ttl || this.defaultTTL, serializedValue);
            }
            await pipeline.exec();
        }
        catch (error) {
            this.handleError("Error setting multiple cache values", error);
        }
    }
    /**
     * Get multiple values at once
     */
    async getMultiple(keys, prefix) {
        try {
            const finalKeys = keys.map((key) => this.buildKey(key, prefix));
            const values = await this.redis.mget(...finalKeys);
            const result = {};
            keys.forEach((originalKey, index) => {
                const value = values[index];
                if (value !== null) {
                    try {
                        result[originalKey] = JSON.parse(value);
                    }
                    catch {
                        result[originalKey] = value;
                    }
                }
                else {
                    result[originalKey] = null;
                }
            });
            return result;
        }
        catch (error) {
            this.handleError("Error getting multiple cache values", error);
            return keys.reduce((acc, key) => ({ ...acc, [key]: null }), {});
        }
    }
    /**
     * Clear cache by pattern
     */
    async clearPattern(pattern) {
        try {
            const keys = await this.redis.keys(pattern);
            if (keys.length === 0) {
                return 0;
            }
            return await this.redis.del(...keys);
        }
        catch (error) {
            this.handleError("Error clearing cache pattern", error);
            return 0;
        }
    }
    /**
     * Get cache statistics
     */
    async getStats() {
        try {
            const info = await this.redis.info("memory");
            const keyCount = await this.redis.dbsize();
            return {
                totalKeys: keyCount,
                memoryUsage: this.parseMemoryUsage(info),
            };
        }
        catch (error) {
            this.handleError("Error getting cache stats", error);
            return {
                totalKeys: 0,
                memoryUsage: "0MB",
            };
        }
    }
    /**
     * Cache warming - preload frequently accessed data
     */
    async warmCache(cacheWarmers) {
        try {
            const promises = cacheWarmers.map(async (warmer) => {
                const exists = await this.exists(warmer.key);
                if (!exists) {
                    const data = await warmer.loader();
                    await this.set(warmer.key, data, { ttl: warmer.ttl });
                }
            });
            await Promise.allSettled(promises);
        }
        catch (error) {
            this.handleError("Error warming cache", error);
        }
    }
    // Product-specific cache methods
    /**
     * Cache product data
     */
    async cacheProduct(productId, product, ttl) {
        await this.set(`product:${productId}`, product, {
            ttl: ttl || types_1.CONSTANTS.CACHE_TTL.LONG,
            prefix: "products",
        });
    }
    /**
     * Get cached product
     */
    async getCachedProduct(productId) {
        return this.get(`product:${productId}`, { prefix: "products" });
    }
    /**
     * Cache product list
     */
    async cacheProductList(queryKey, products, ttl) {
        await this.set(`list:${queryKey}`, products, {
            ttl: ttl || types_1.CONSTANTS.CACHE_TTL.SHORT,
            prefix: "products",
        });
    }
    /**
     * Cache user session
     */
    async cacheUserSession(userId, sessionData) {
        await this.set(`session:${userId}`, sessionData, {
            ttl: types_1.CONSTANTS.CACHE_TTL.VERY_LONG,
            prefix: "auth",
        });
    }
    /**
     * Cache cart data
     */
    async cacheCart(cartId, cartData) {
        await this.set(`cart:${cartId}`, cartData, {
            ttl: types_1.CONSTANTS.CACHE_TTL.LONG,
            prefix: "carts",
        });
    }
    /**
     * Invalidate related caches when product changes
     */
    async invalidateProductCaches(productId) {
        const patterns = [
            `products:product:${productId}`,
            `products:list:*`,
            `analytics:products:*`,
        ];
        for (const pattern of patterns) {
            await this.clearPattern(pattern);
        }
    }
    // Private helper methods
    buildKey(key, prefix) {
        const basePrefix = "bareloft";
        if (prefix) {
            return `${basePrefix}:${prefix}:${key}`;
        }
        return `${basePrefix}:${key}`;
    }
    parseMemoryUsage(info) {
        const match = info.match(/used_memory_human:(.+)/);
        return match ? match[1].trim() : "0MB";
    }
}
exports.CacheService = CacheService;
//# sourceMappingURL=CacheService.js.map