"use strict";
/**
 * ⚡ Cache Middleware
 * Intelligent caching system optimized for Nigerian e-commerce
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheStrategies = exports.invalidateCache = exports.cacheMiddleware = void 0;
const RedisService_1 = require("../../services/cache/RedisService");
const winston_1 = require("../../utils/logger/winston");
const crypto = __importStar(require("crypto"));
/**
 * 🔑 Generate cache key from request
 */
const generateCacheKey = (req, options) => {
    const parts = [options.prefix || "cache", req.method, req.path];
    // Include query parameters
    const queryString = new URLSearchParams(req.query).toString();
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
const compressData = (data) => {
    const zlib = require("zlib");
    return zlib.gzipSync(data);
};
/**
 * 📦 Decompress response data
 */
const decompressData = (data) => {
    const zlib = require("zlib");
    return zlib.gunzipSync(data).toString();
};
/**
 * ⚡ Main cache middleware factory
 */
const cacheMiddleware = (options = {}) => {
    const { ttl = 300, // 5 minutes default
    prefix = "api_cache", skipMethods = ["POST", "PUT", "PATCH", "DELETE"], skipPaths = ["/api/auth/", "/api/admin/", "/api/cart/", "/api/orders/"], varyBy = ["Accept", "User-Agent"], compress = true, staleWhileRevalidate = 60, // 1 minute
    maxSize = 1024 * 1024, // 1MB
    conditionalCaching, } = options;
    const redis = new RedisService_1.RedisService();
    return async (req, res, next) => {
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
            const cachedEntry = await redis.getJSON(cacheKey);
            if (cachedEntry) {
                const age = Math.floor((Date.now() - cachedEntry.timestamp) / 1000);
                const isStale = age > ttl;
                const shouldRevalidate = age > ttl - staleWhileRevalidate;
                // If content is fresh, serve from cache
                if (!isStale) {
                    winston_1.logger.debug("Cache hit (fresh)", {
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
                        responseData = decompressData(Buffer.from(cachedEntry.data, "base64"));
                        res.set("Content-Encoding", "gzip");
                    }
                    res.status(cachedEntry.statusCode).send(responseData);
                    return;
                }
                // If stale but within revalidation window, serve stale content
                // and update cache in background
                if (shouldRevalidate) {
                    winston_1.logger.debug("Cache hit (stale-while-revalidate)", {
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
                        responseData = decompressData(Buffer.from(cachedEntry.data, "base64"));
                        res.set("Content-Encoding", "gzip");
                    }
                    res.status(cachedEntry.statusCode).send(responseData);
                    // Trigger background revalidation
                    setImmediate(() => {
                        // This would trigger a background request to update the cache
                        winston_1.logger.debug("Background revalidation triggered", { cacheKey });
                    });
                    return;
                }
            }
            // Cache miss - capture response and cache it
            winston_1.logger.debug("Cache miss", {
                cacheKey,
                path: req.path,
                method: req.method,
            });
            res.set("X-Cache", "MISS");
            // Capture original methods
            const originalJson = res.json;
            const originalSend = res.send;
            const originalEnd = res.end;
            let responseBody;
            let responseSent = false;
            // Override json method
            res.json = function (obj) {
                if (!responseSent) {
                    responseBody = obj;
                    cacheResponse(JSON.stringify(obj));
                }
                return originalJson.call(this, obj);
            };
            // Override send method
            res.send = function (body) {
                if (!responseSent) {
                    responseBody = body;
                    cacheResponse(typeof body === "string" ? body : JSON.stringify(body));
                }
                return originalSend.call(this, body);
            };
            // Override end method
            const originalThis = res;
            res.end = function (chunk, encoding, cb) {
                if (!responseSent && chunk) {
                    responseBody = chunk;
                    cacheResponse(typeof chunk === "string" ? chunk : chunk.toString());
                }
                return originalEnd.call(originalThis, chunk, encoding, cb);
            };
            // Cache response function
            const cacheResponse = async (body) => {
                if (responseSent)
                    return;
                responseSent = true;
                try {
                    // Only cache successful responses
                    if (res.statusCode < 200 || res.statusCode >= 300) {
                        return;
                    }
                    // Check response size
                    const bodySize = Buffer.byteLength(body, "utf8");
                    if (bodySize > maxSize) {
                        winston_1.logger.warn("Response too large for caching", {
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
                    const cacheEntry = {
                        data: dataToCache,
                        statusCode: res.statusCode,
                        headers: {
                            "content-type": res.get("Content-Type") || "application/json",
                            "cache-control": res.get("Cache-Control") || `max-age=${ttl}, public`,
                        },
                        timestamp: Date.now(),
                        etag,
                        compressed,
                    };
                    // Store in cache
                    await redis.setexJSON(cacheKey, ttl, cacheEntry);
                    winston_1.logger.debug("Response cached", {
                        cacheKey,
                        size: bodySize,
                        compressed,
                        compressionRatio: compressed
                            ? Math.round((1 - Buffer.from(dataToCache, "base64").length / bodySize) *
                                100)
                            : 0,
                        ttl,
                    });
                }
                catch (error) {
                    winston_1.logger.error("Cache storage failed", {
                        error: error instanceof Error ? error.message : "Unknown error",
                        cacheKey,
                        path: req.path,
                    });
                }
            };
            next();
        }
        catch (error) {
            winston_1.logger.error("Cache middleware error", {
                error: error instanceof Error ? error.message : "Unknown error",
                path: req.path,
                method: req.method,
            });
            // Continue without caching
            next();
        }
    };
};
exports.cacheMiddleware = cacheMiddleware;
/**
 * 🗑️ Cache invalidation middleware
 * Invalidates cache entries when data changes
 */
const invalidateCache = (patterns) => {
    const redis = new RedisService_1.RedisService();
    return async (req, res, next) => {
        // Store original end method
        const originalEnd = res.end;
        const originalThis = res;
        res.end = function (chunk, encoding, cb) {
            // Only invalidate on successful operations
            if (res.statusCode >= 200 && res.statusCode < 300) {
                setImmediate(async () => {
                    try {
                        const invalidationPatterns = typeof patterns === "function" ? patterns(req) : patterns;
                        for (const pattern of invalidationPatterns) {
                            const keys = await redis.keys(pattern);
                            if (keys.length > 0) {
                                await redis.del(...keys);
                                winston_1.logger.debug("Cache invalidated", {
                                    pattern,
                                    keysDeleted: keys.length,
                                    path: req.path,
                                    method: req.method,
                                });
                            }
                        }
                    }
                    catch (error) {
                        winston_1.logger.error("Cache invalidation failed", {
                            error: error instanceof Error ? error.message : "Unknown error",
                            patterns: typeof patterns === "function" ? "dynamic" : patterns,
                            path: req.path,
                        });
                    }
                });
            }
            return originalEnd.call(originalThis, chunk, encoding, cb);
        };
        next();
    };
};
exports.invalidateCache = invalidateCache;
/**
 * 🎯 Pre-configured cache strategies
 */
exports.cacheStrategies = {
    // Product listings (cache for 10 minutes, vary by filters)
    products: (0, exports.cacheMiddleware)({
        ttl: 600,
        prefix: "products",
        varyBy: ["Accept", "Authorization"],
        staleWhileRevalidate: 120,
    }),
    // Product details (cache for 30 minutes)
    productDetails: (0, exports.cacheMiddleware)({
        ttl: 1800,
        prefix: "product_detail",
        varyBy: ["Accept"],
        staleWhileRevalidate: 300,
    }),
    // Categories (cache for 1 hour)
    categories: (0, exports.cacheMiddleware)({
        ttl: 3600,
        prefix: "categories",
        varyBy: ["Accept"],
        staleWhileRevalidate: 600,
    }),
    // Static content (cache for 24 hours)
    static: (0, exports.cacheMiddleware)({
        ttl: 86400,
        prefix: "static",
        varyBy: ["Accept"],
        staleWhileRevalidate: 3600,
    }),
    // User-specific content (cache for 5 minutes)
    userSpecific: (0, exports.cacheMiddleware)({
        ttl: 300,
        prefix: "user",
        varyBy: ["Authorization"],
        conditionalCaching: (req) => !!req.user,
    }),
};
//# sourceMappingURL=cacheMiddleware.js.map