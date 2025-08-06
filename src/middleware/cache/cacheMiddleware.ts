/**
 * ⚡ Cache Middleware
 * Intelligent caching system optimized for Nigerian e-commerce
 */

import { Response, NextFunction } from "express";
import { RedisService } from "../../services/cache/RedisService";
import { logger } from "../../utils/logger/winston";
import { config } from "../../config/environment";
import { AuthenticatedRequest } from "../../types/auth.types";
import * as crypto from "crypto";

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Cache key prefix
  skipMethods?: string[]; // HTTP methods to skip caching
  skipPaths?: string[]; // Paths to skip caching
  varyBy?: string[]; // Headers to include in cache key
  compress?: boolean; // Enable gzip compression
  staleWhileRevalidate?: number; // Serve stale content while updating
  maxSize?: number; // Maximum response size to cache (bytes)
  conditionalCaching?: (req: AuthenticatedRequest) => boolean; // Conditional caching logic
}

interface CacheEntry {
  data: any;
  statusCode: number;
  headers: Record<string, string>;
  timestamp: number;
  etag: string;
  compressed: boolean;
}

/**
 * 🔑 Generate cache key from request
 */
const generateCacheKey = (req: AuthenticatedRequest, options: CacheOptions): string => {
  const parts = [options.prefix || "cache", req.method, req.path];

  // Include query parameters
  const queryString = new URLSearchParams(req.query as any).toString();
  if (queryString) {
    parts.push(crypto.createHash("md5").update(queryString).digest("hex"));
  }

  // Include specific headers in cache key
  if (options.varyBy && options.varyBy.length > 0) {
    const headerValues = options.varyBy
      .map((header) => req.get(header) || "")
      .join("|");

    if (headerValues) {
      parts.push(crypto.createHash("md5").update(headerValues).digest("hex"));
    }
  }

  // Include user context for personalized content
  if (req.user) {
    parts.push(`user:${req.user.id}`);
  }

  return parts.join(":");
};

/**
 * 🗜️ Compress response data
 */
const compressData = (data: string): Buffer => {
  const zlib = require("zlib");
  return zlib.gzipSync(data);
};

/**
 * 📦 Decompress response data
 */
const decompressData = (data: Buffer): string => {
  const zlib = require("zlib");
  return zlib.gunzipSync(data).toString();
};

/**
 * ⚡ Main cache middleware factory
 */
export const cacheMiddleware = (options: CacheOptions = {}) => {
  const {
    ttl = 300, // 5 minutes default
    prefix = "api_cache",
    skipMethods = ["POST", "PUT", "PATCH", "DELETE"],
    skipPaths = ["/api/auth/", "/api/admin/", "/api/cart/", "/api/orders/"],
    varyBy = ["Accept", "User-Agent"],
    compress = true,
    staleWhileRevalidate = 60, // 1 minute
    maxSize = 1024 * 1024, // 1MB
    conditionalCaching,
  } = options;

  const redis = new RedisService();

  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Skip caching for certain methods
      if (skipMethods.includes(req.method)) {
        return next();
      }

      // Skip caching for certain paths
      if (skipPaths.some((path) => req.path.startsWith(path))) {
        return next();
      }

      // Skip if conditional caching says no
      if (conditionalCaching && !conditionalCaching(req)) {
        return next();
      }

      // Skip caching for authenticated users on certain endpoints
      if (req.user && req.path.startsWith("/api/user/")) {
        return next();
      }

      const cacheKey = generateCacheKey(req, { ...options, prefix });

      // Try to get from cache
      const cachedEntry = await redis.getJSON<CacheEntry>(cacheKey);

      if (cachedEntry) {
        const age = Math.floor((Date.now() - cachedEntry.timestamp) / 1000);
        const isStale = age > ttl;
        const shouldRevalidate = age > ttl - staleWhileRevalidate;

        // If content is fresh, serve from cache
        if (!isStale) {
          logger.debug("Cache hit (fresh)", {
            cacheKey,
            age,
            path: req.path,
            method: req.method,
          });

          // Set cache headers
          res.set("X-Cache", "HIT");
          res.set("X-Cache-Age", age.toString());
          res.set("Cache-Control", `max-age=${ttl - age}, public`);

          // Set original headers
          Object.entries(cachedEntry.headers).forEach(([key, value]) => {
            if (typeof value === 'string') {
              res.set(key, value);
            }
          });

          // Set ETag
          res.set("ETag", cachedEntry.etag);

          // Decompress if needed
          let responseData = cachedEntry.data;
          if (cachedEntry.compressed && compress) {
            responseData = decompressData(
              Buffer.from(cachedEntry.data, "base64")
            );
            res.set("Content-Encoding", "gzip");
          }

          res.status(cachedEntry.statusCode).send(responseData);
          return;
        }

        // If stale but within revalidation window, serve stale content
        // and update cache in background
        if (shouldRevalidate) {
          logger.debug("Cache hit (stale-while-revalidate)", {
            cacheKey,
            age,
            path: req.path,
          });

          res.set("X-Cache", "STALE");
          res.set("X-Cache-Age", age.toString());

          // Serve stale content
          Object.entries(cachedEntry.headers).forEach(([key, value]) => {
            if (typeof value === 'string') {
              res.set(key, value);
            }
          });

          let responseData = cachedEntry.data;
          if (cachedEntry.compressed && compress) {
            responseData = decompressData(
              Buffer.from(cachedEntry.data, "base64")
            );
            res.set("Content-Encoding", "gzip");
          }

          res.status(cachedEntry.statusCode).send(responseData);

          // Trigger background revalidation
          setImmediate(() => {
            // This would trigger a background request to update the cache
            logger.debug("Background revalidation triggered", { cacheKey });
          });

          return;
        }
      }

      // Cache miss - capture response and cache it
      logger.debug("Cache miss", {
        cacheKey,
        path: req.path,
        method: req.method,
      });

      res.set("X-Cache", "MISS");

      // Capture original methods
      const originalJson = res.json;
      const originalSend = res.send;
      const originalEnd = res.end;

      let responseBody: any;
      let responseSent = false;

      // Override json method
      res.json = function (obj: any): Response {
        if (!responseSent) {
          responseBody = obj;
          cacheResponse(JSON.stringify(obj));
        }
        return originalJson.call(this, obj);
      };

      // Override send method
      res.send = function (body: any): Response {
        if (!responseSent) {
          responseBody = body;
          cacheResponse(typeof body === "string" ? body : JSON.stringify(body));
        }
        return originalSend.call(this, body);
      };

      // Override end method
      const originalThis = res;
      res.end = function (chunk?: any, encoding?: any, cb?: any): any {
        if (!responseSent && chunk) {
          responseBody = chunk;
          cacheResponse(typeof chunk === "string" ? chunk : chunk.toString());
        }
        return (originalEnd as any).call(originalThis, chunk, encoding, cb);
      } as any;

      // Cache response function
      const cacheResponse = async (body: string): Promise<void> => {
        if (responseSent) return;
        responseSent = true;

        try {
          // Only cache successful responses
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return;
          }

          // Check response size
          const bodySize = Buffer.byteLength(body, "utf8");
          if (bodySize > maxSize) {
            logger.warn("Response too large for caching", {
              size: bodySize,
              maxSize,
              path: req.path,
            });
            return;
          }

          // Generate ETag
          const etag = `"${crypto.createHash("md5").update(body).digest("hex")}"`;
          res.set("ETag", etag);

          // Prepare cache entry
          let dataToCache = body;
          let compressed = false;

          if (compress && bodySize > 1024) {
            // Only compress if > 1KB
            const compressedData = compressData(body);
            if (compressedData.length < bodySize * 0.9) {
              // Only use if 10%+ compression
              dataToCache = compressedData.toString("base64");
              compressed = true;
            }
          }

          const cacheEntry: CacheEntry = {
            data: dataToCache,
            statusCode: res.statusCode,
            headers: {
              "content-type": res.get("Content-Type") || "application/json",
              "cache-control":
                res.get("Cache-Control") || `max-age=${ttl}, public`,
            },
            timestamp: Date.now(),
            etag,
            compressed,
          };

          // Store in cache
          await redis.setexJSON(cacheKey, ttl, cacheEntry);

          logger.debug("Response cached", {
            cacheKey,
            size: bodySize,
            compressed,
            compressionRatio: compressed
              ? Math.round(
                  (1 - Buffer.from(dataToCache, "base64").length / bodySize) *
                    100
                )
              : 0,
            ttl,
          });
        } catch (error) {
          logger.error("Cache storage failed", {
            error: error instanceof Error ? error.message : "Unknown error",
            cacheKey,
            path: req.path,
          });
        }
      };

      next();
    } catch (error) {
      logger.error("Cache middleware error", {
        error: error instanceof Error ? error.message : "Unknown error",
        path: req.path,
        method: req.method,
      });

      // Continue without caching
      next();
    }
  };
};

/**
 * 🗑️ Cache invalidation middleware
 * Invalidates cache entries when data changes
 */
export const invalidateCache = (
  patterns: string[] | ((req: AuthenticatedRequest) => string[])
) => {
  const redis = new RedisService();

  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Store original end method
    const originalEnd = res.end;

    const originalThis = res;
    res.end = function (chunk?: any, encoding?: any, cb?: any): any {
      // Only invalidate on successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setImmediate(async () => {
          try {
            const invalidationPatterns =
              typeof patterns === "function" ? patterns(req) : patterns;

            for (const pattern of invalidationPatterns) {
              const keys = await redis.keys(pattern);
              if (keys.length > 0) {
                await redis.del(...keys);
                logger.debug("Cache invalidated", {
                  pattern,
                  keysDeleted: keys.length,
                  path: req.path,
                  method: req.method,
                });
              }
            }
          } catch (error) {
            logger.error("Cache invalidation failed", {
              error: error instanceof Error ? error.message : "Unknown error",
              patterns: typeof patterns === "function" ? "dynamic" : patterns,
              path: req.path,
            });
          }
        });
      }

      return (originalEnd as any).call(originalThis, chunk, encoding, cb);
    } as any;

    next();
  };
};

/**
 * 🎯 Pre-configured cache strategies
 */
export const cacheStrategies = {
  // Product listings (cache for 10 minutes, vary by filters)
  products: cacheMiddleware({
    ttl: 600,
    prefix: "products",
    varyBy: ["Accept", "Authorization"],
    staleWhileRevalidate: 120,
  }),

  // Product details (cache for 30 minutes)
  productDetails: cacheMiddleware({
    ttl: 1800,
    prefix: "product_detail",
    varyBy: ["Accept"],
    staleWhileRevalidate: 300,
  }),

  // Categories (cache for 1 hour)
  categories: cacheMiddleware({
    ttl: 3600,
    prefix: "categories",
    varyBy: ["Accept"],
    staleWhileRevalidate: 600,
  }),

  // Static content (cache for 24 hours)
  static: cacheMiddleware({
    ttl: 86400,
    prefix: "static",
    varyBy: ["Accept"],
    staleWhileRevalidate: 3600,
  }),

  // User-specific content (cache for 5 minutes)
  userSpecific: cacheMiddleware({
    ttl: 300,
    prefix: "user",
    varyBy: ["Authorization"],
    conditionalCaching: (req) => !!req.user,
  }),
};
