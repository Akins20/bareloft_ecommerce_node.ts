"use strict";
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
exports.conditionalHandler = exports.etagHandler = void 0;
const crypto = __importStar(require("crypto"));
const winston_1 = require("../../utils/logger/winston");
/**
 * 🔧 Generate ETag from response body
 */
const generateETag = (body, options) => {
    const algorithm = options.algorithm || "md5";
    const prefix = options.weak ? "W/" : "";
    let content;
    if (typeof body === "string") {
        content = body;
    }
    else if (Buffer.isBuffer(body)) {
        content = body.toString();
    }
    else {
        content = JSON.stringify(body);
    }
    const hash = crypto.createHash(algorithm).update(content).digest("hex");
    return `${prefix}"${hash}"`;
};
/**
 * 🏷️ ETag middleware
 */
const etagHandler = (options = {}) => {
    const { weak = false, algorithm = "md5", skipPaths = ["/api/auth/", "/api/admin/"], generateETag: customGenerator, } = options;
    return (req, res, next) => {
        // Skip ETag for certain paths
        if (skipPaths.some((path) => req.path.startsWith(path))) {
            return next();
        }
        // Skip for non-GET requests
        if (req.method !== "GET") {
            return next();
        }
        // Check for existing ETag in request
        const clientETag = req.get("If-None-Match");
        // Capture original methods
        const originalJson = res.json;
        const originalSend = res.send;
        const originalEnd = res.end;
        let responseBody;
        let etagGenerated = false;
        const handleETag = (body) => {
            if (etagGenerated)
                return;
            etagGenerated = true;
            try {
                // Generate ETag
                const etag = customGenerator
                    ? customGenerator(body, req)
                    : generateETag(body, { weak, algorithm });
                // Set ETag header
                res.set("ETag", etag);
                // Check if client ETag matches
                if (clientETag) {
                    // Handle both strong and weak ETag comparison
                    const clientETags = clientETag.split(",").map((tag) => tag.trim());
                    const matches = clientETags.some((clientTag) => {
                        // Strong comparison
                        if (!weak && !clientTag.startsWith("W/") && clientTag === etag) {
                            return true;
                        }
                        // Weak comparison
                        const normalizedClientTag = clientTag.replace(/^W\//, "");
                        const normalizedServerTag = etag.replace(/^W\//, "");
                        return normalizedClientTag === normalizedServerTag;
                    });
                    if (matches) {
                        winston_1.logger.debug("ETag match - returning 304", {
                            path: req.path,
                            clientETag,
                            serverETag: etag,
                        });
                        // Remove content headers for 304 response
                        res.removeHeader("Content-Type");
                        res.removeHeader("Content-Length");
                        res.removeHeader("Content-Encoding");
                        res.status(304).end();
                        return;
                    }
                }
                // Set caching headers
                res.set("Cache-Control", "max-age=0, must-revalidate");
                winston_1.logger.debug("ETag generated", {
                    path: req.path,
                    etag,
                    weak,
                    algorithm,
                });
            }
            catch (error) {
                winston_1.logger.error("ETag generation failed", {
                    error: error instanceof Error ? error.message : "Unknown error",
                    path: req.path,
                });
            }
        };
        // Override json method
        res.json = function (obj) {
            responseBody = obj;
            handleETag(JSON.stringify(obj));
            if (res.headersSent)
                return this;
            return originalJson.call(this, obj);
        };
        // Override send method
        res.send = function (body) {
            responseBody = body;
            const content = typeof body === "string" ? body : JSON.stringify(body);
            handleETag(content);
            if (res.headersSent)
                return this;
            return originalSend.call(this, body);
        };
        // Override end method
        res.end = function (chunk, encoding, cb) {
            if (chunk && !etagGenerated) {
                responseBody = chunk;
                handleETag(chunk);
            }
            if (!res.headersSent) {
                // Call original end method with proper parameters
                originalEnd.call(this, chunk, encoding, cb);
            }
            return this;
        };
        next();
    };
};
exports.etagHandler = etagHandler;
/**
 * 🔄 Conditional request handler
 * Handles If-Modified-Since and If-Unmodified-Since headers
 */
const conditionalHandler = (req, res, next) => {
    const ifModifiedSince = req.get("If-Modified-Since");
    const ifUnmodifiedSince = req.get("If-Unmodified-Since");
    if (!ifModifiedSince && !ifUnmodifiedSince) {
        return next();
    }
    // This would typically check against resource modification time
    // For now, we'll set a Last-Modified header and let normal processing continue
    const lastModified = new Date().toUTCString();
    res.set("Last-Modified", lastModified);
    next();
};
exports.conditionalHandler = conditionalHandler;
//# sourceMappingURL=etag.js.map