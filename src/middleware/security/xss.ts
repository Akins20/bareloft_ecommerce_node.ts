import { Request, Response, NextFunction } from "express";
import DOMPurify from "isomorphic-dompurify";
import { logger } from "../../utils/logger/winston";

/**
 * Sanitizes string input to prevent XSS attacks
 * Supports common Nigerian languages and special characters
 */
const sanitizeString = (str: string): string => {
  if (typeof str !== "string") return str;

  // Basic HTML sanitization
  let sanitized = DOMPurify.sanitize(str, {
    ALLOWED_TAGS: [], // No HTML tags allowed in regular input
    ALLOWED_ATTR: [],
  });

  // Remove potentially dangerous patterns
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
    .replace(/javascript:/gi, "") // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .replace(/data:(?!image\/)/gi, "") // Remove data URLs except images
    .replace(/vbscript:/gi, "") // Remove vbscript
    .replace(/expression\s*\(/gi, "") // Remove CSS expressions
    .trim();

  return sanitized;
};

/**
 * Recursively sanitizes object properties
 */
const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === "object") {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize both key and value
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
};

/**
 * XSS Protection Middleware
 * Sanitizes all request data (body, query, params)
 */
export const xssProtection = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Track if any sanitization occurred
    let sanitizationOccurred = false;
    const originalData: any = {};

    // Sanitize request body
    if (req.body && typeof req.body === "object") {
      originalData.body = JSON.stringify(req.body);
      const sanitizedBody = sanitizeObject(req.body);

      if (JSON.stringify(sanitizedBody) !== originalData.body) {
        sanitizationOccurred = true;
      }

      req.body = sanitizedBody;
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === "object") {
      originalData.query = JSON.stringify(req.query);
      const sanitizedQuery = sanitizeObject(req.query);

      if (JSON.stringify(sanitizedQuery) !== originalData.query) {
        sanitizationOccurred = true;
      }

      req.query = sanitizedQuery;
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === "object") {
      originalData.params = JSON.stringify(req.params);
      const sanitizedParams = sanitizeObject(req.params);

      if (JSON.stringify(sanitizedParams) !== originalData.params) {
        sanitizationOccurred = true;
      }

      req.params = sanitizedParams;
    }

    // Log potential XSS attempts
    if (sanitizationOccurred) {
      logger.warn("XSS attempt detected and sanitized", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        path: req.path,
        method: req.method,
        userId: req.user?.id,
      });
    }

    next();
  } catch (error) {
    logger.error("XSS protection middleware error", {
      error: error instanceof Error ? error.message : "Unknown error",
      path: req.path,
      method: req.method,
    });

    // Don't block the request on sanitization errors
    next();
  }
};

/**
 * Content sanitization for rich text (like product descriptions)
 * Allows safe HTML tags for formatting
 */
export const sanitizeRichContent = (content: string): string => {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "ol",
      "ul",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
    ],
    ALLOWED_ATTR: ["class"],
    FORBID_ATTR: ["data-*"],
  });
};
