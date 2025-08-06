import { Request, Response, NextFunction } from "express";
import * as crypto from "crypto";
import { logger } from "../../utils/logger/winston";

interface ETagOptions {
  weak?: boolean; // Use weak ETags
  algorithm?: string; // Hash algorithm
  skipPaths?: string[]; // Paths to skip ETag generation
  generateETag?: (body: any, req: Request) => string; // Custom ETag generator
}

/**
 * 🔧 Generate ETag from response body
 */
const generateETag = (body: any, options: ETagOptions): string => {
  const algorithm = options.algorithm || "md5";
  const prefix = options.weak ? "W/" : "";

  let content: string;
  if (typeof body === "string") {
    content = body;
  } else if (Buffer.isBuffer(body)) {
    content = body.toString();
  } else {
    content = JSON.stringify(body);
  }

  const hash = crypto.createHash(algorithm).update(content).digest("hex");
  return `${prefix}"${hash}"`;
};

/**
 * 🏷️ ETag middleware
 */
export const etagHandler = (options: ETagOptions = {}) => {
  const {
    weak = false,
    algorithm = "md5",
    skipPaths = ["/api/auth/", "/api/admin/"],
    generateETag: customGenerator,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
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

    let responseBody: any;
    let etagGenerated = false;

    const handleETag = (body: any): void => {
      if (etagGenerated) return;
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
            logger.debug("ETag match - returning 304", {
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

        logger.debug("ETag generated", {
          path: req.path,
          etag,
          weak,
          algorithm,
        });
      } catch (error) {
        logger.error("ETag generation failed", {
          error: error instanceof Error ? error.message : "Unknown error",
          path: req.path,
        });
      }
    };

    // Override json method
    res.json = function (obj: any): Response {
      responseBody = obj;
      handleETag(JSON.stringify(obj));

      if (res.headersSent) return this;
      return originalJson.call(this, obj);
    };

    // Override send method
    res.send = function (body: any): Response {
      responseBody = body;
      const content = typeof body === "string" ? body : JSON.stringify(body);
      handleETag(content);

      if (res.headersSent) return this;
      return originalSend.call(this, body);
    };

    // Override end method
    res.end = function (chunk?: any, encoding?: any, cb?: any): Response {
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

/**
 * 🔄 Conditional request handler
 * Handles If-Modified-Since and If-Unmodified-Since headers
 */
export const conditionalHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
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
