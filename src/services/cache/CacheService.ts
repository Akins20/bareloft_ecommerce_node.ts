import { BaseService } from "../BaseService";
import { RedisService } from "./RedisService";
import { CONSTANTS } from "../../types";

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  serialize?: boolean;
}

export class CacheService extends BaseService {
  private redis: RedisService;
  private defaultTTL: number;

  constructor(redisService: RedisService) {
    super();
    this.redis = redisService;
    this.defaultTTL = CONSTANTS.CACHE_TTL.MEDIUM; // 30 minutes default
  }

  /**
   * Set cache value
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const finalKey = this.buildKey(key, options.prefix);
      const ttl = options.ttl || this.defaultTTL;

      let serializedValue: string;

      if (options.serialize !== false && typeof value === "object") {
        serializedValue = JSON.stringify(value);
      } else {
        serializedValue = String(value);
      }

      await this.redis.setex(finalKey, ttl, serializedValue);
    } catch (error) {
      this.handleError("Error setting cache", error);
      // Don't throw - cache failures shouldn't break the app
    }
  }

  /**
   * Get cache value
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      const finalKey = this.buildKey(key, options.prefix);
      const value = await this.redis.get(finalKey);

      if (value === null) {
        return null;
      }

      if (options.serialize !== false) {
        try {
          return JSON.parse(value) as T;
        } catch {
          // If JSON parsing fails, return as string
          return value as unknown as T;
        }
      }

      return value as unknown as T;
    } catch (error) {
      this.handleError("Error getting cache", error);
      return null;
    }
  }

  /**
   * Delete cache value
   */
  async delete(key: string, prefix?: string): Promise<boolean> {
    try {
      const finalKey = this.buildKey(key, prefix);
      const result = await this.redis.del(finalKey);
      return result > 0;
    } catch (error) {
      this.handleError("Error deleting cache", error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string, prefix?: string): Promise<boolean> {
    try {
      const finalKey = this.buildKey(key, prefix);
      const result = await this.redis.exists(finalKey);
      return result === 1;
    } catch (error) {
      this.handleError("Error checking cache existence", error);
      return false;
    }
  }

  /**
   * Get or set pattern - fetch from cache or execute function and cache result
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key, options);

      if (cached !== null) {
        return cached;
      }

      // Cache miss - execute function
      const result = await fetchFunction();

      // Cache the result
      await this.set(key, result, options);

      return result;
    } catch (error) {
      this.handleError("Error in getOrSet cache operation", error);
      // If cache fails, still execute the function
      return await fetchFunction();
    }
  }

  /**
   * Increment counter
   */
  async increment(
    key: string,
    amount: number = 1,
    ttl?: number
  ): Promise<number> {
    try {
      const finalKey = this.buildKey(key);
      const result = await this.redis.incrby(finalKey, amount);

      if (ttl) {
        await this.redis.expire(finalKey, ttl);
      }

      return result;
    } catch (error) {
      this.handleError("Error incrementing cache counter", error);
      return 0;
    }
  }

  /**
   * Set multiple values at once
   */
  async setMultiple<T>(
    entries: Array<{ key: string; value: T; ttl?: number }>,
    prefix?: string
  ): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();

      for (const entry of entries) {
        const finalKey = this.buildKey(entry.key, prefix);
        const serializedValue =
          typeof entry.value === "object"
            ? JSON.stringify(entry.value)
            : String(entry.value);

        pipeline.setex(finalKey, entry.ttl || this.defaultTTL, serializedValue);
      }

      await pipeline.exec();
    } catch (error) {
      this.handleError("Error setting multiple cache values", error);
    }
  }

  /**
   * Get multiple values at once
   */
  async getMultiple<T>(
    keys: string[],
    prefix?: string
  ): Promise<Record<string, T | null>> {
    try {
      const finalKeys = keys.map((key) => this.buildKey(key, prefix));
      const values = await this.redis.mget(...finalKeys);

      const result: Record<string, T | null> = {};

      keys.forEach((originalKey, index) => {
        const value = values[index];
        if (value !== null) {
          try {
            result[originalKey] = JSON.parse(value) as T;
          } catch {
            result[originalKey] = value as unknown as T;
          }
        } else {
          result[originalKey] = null;
        }
      });

      return result;
    } catch (error) {
      this.handleError("Error getting multiple cache values", error);
      return keys.reduce((acc, key) => ({ ...acc, [key]: null }), {});
    }
  }

  /**
   * Clear cache by pattern
   */
  async clearPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      return await this.redis.del(...keys);
    } catch (error) {
      this.handleError("Error clearing cache pattern", error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate?: number;
  }> {
    try {
      const info = await this.redis.info("memory");
      const keyCount = await this.redis.dbsize();

      return {
        totalKeys: keyCount,
        memoryUsage: this.parseMemoryUsage(info),
      };
    } catch (error) {
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
  async warmCache(
    cacheWarmers: Array<{
      key: string;
      loader: () => Promise<any>;
      ttl?: number;
    }>
  ): Promise<void> {
    try {
      const promises = cacheWarmers.map(async (warmer) => {
        const exists = await this.exists(warmer.key);
        if (!exists) {
          const data = await warmer.loader();
          await this.set(warmer.key, data, { ttl: warmer.ttl });
        }
      });

      await Promise.allSettled(promises);
    } catch (error) {
      this.handleError("Error warming cache", error);
    }
  }

  // Product-specific cache methods

  /**
   * Cache product data
   */
  async cacheProduct(
    productId: string,
    product: any,
    ttl?: number
  ): Promise<void> {
    await this.set(`product:${productId}`, product, {
      ttl: ttl || CONSTANTS.CACHE_TTL.LONG,
      prefix: "products",
    });
  }

  /**
   * Get cached product
   */
  async getCachedProduct(productId: string): Promise<any | null> {
    return this.get(`product:${productId}`, { prefix: "products" });
  }

  /**
   * Cache product list
   */
  async cacheProductList(
    queryKey: string,
    products: any[],
    ttl?: number
  ): Promise<void> {
    await this.set(`list:${queryKey}`, products, {
      ttl: ttl || CONSTANTS.CACHE_TTL.SHORT,
      prefix: "products",
    });
  }

  /**
   * Cache user session
   */
  async cacheUserSession(userId: string, sessionData: any): Promise<void> {
    await this.set(`session:${userId}`, sessionData, {
      ttl: CONSTANTS.CACHE_TTL.VERY_LONG,
      prefix: "auth",
    });
  }

  /**
   * Cache cart data
   */
  async cacheCart(cartId: string, cartData: any): Promise<void> {
    await this.set(`cart:${cartId}`, cartData, {
      ttl: CONSTANTS.CACHE_TTL.LONG,
      prefix: "carts",
    });
  }

  /**
   * Invalidate related caches when product changes
   */
  async invalidateProductCaches(productId: string): Promise<void> {
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

  private buildKey(key: string, prefix?: string): string {
    const basePrefix = "bareloft";
    if (prefix) {
      return `${basePrefix}:${prefix}:${key}`;
    }
    return `${basePrefix}:${key}`;
  }

  private parseMemoryUsage(info: string): string {
    const match = info.match(/used_memory_human:(.+)/);
    return match ? match[1].trim() : "0MB";
  }
}
