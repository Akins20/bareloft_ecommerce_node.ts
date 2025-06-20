import { Request, Response, NextFunction } from "express";
import validator from "validator";
import { logger } from "../../utils/logger/winston";

/**
 * Sanitizes string input
 */
const sanitizeString = (str: string): string => {
  if (typeof str !== "string") return str;

  return str
    .trim() // Remove leading/trailing whitespace
    .replace(/\s+/g, " ") // Normalize multiple spaces
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
    .substring(0, 10000); // Limit length to prevent DoS
};

/**
 * Normalizes Nigerian phone numbers
 */
const normalizeNigerianPhone = (phone: string): string => {
  if (typeof phone !== "string") return phone;

  let normalized = phone.replace(/\s+/g, "").replace(/[^\d+]/g, "");

  // Convert various formats to +234 format
  if (normalized.startsWith("0")) {
    normalized = "+234" + normalized.substring(1);
  } else if (normalized.startsWith("234") && !normalized.startsWith("+234")) {
    normalized = "+" + normalized;
  } else if (!normalized.startsWith("+234") && normalized.length === 10) {
    normalized = "+234" + normalized;
  }

  return normalized;
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
      let sanitizedKey = sanitizeString(key);

      // Special handling for specific fields
      if (sanitizedKey.toLowerCase().includes("phone")) {
        sanitized[sanitizedKey] =
          typeof value === "string"
            ? normalizeNigerianPhone(value)
            : sanitizeObject(value);
      } else if (sanitizedKey.toLowerCase().includes("email")) {
        sanitized[sanitizedKey] =
          typeof value === "string"
            ? validator.normalizeEmail(value) || value
            : sanitizeObject(value);
      } else {
        sanitized[sanitizedKey] = sanitizeObject(value);
      }
    }
    return sanitized;
  }

  return obj;
};

/**
 * 🧹 Main sanitization middleware
 */
export const sanitizeInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === "object") {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === "object") {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === "object") {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    logger.error("Input sanitization error", {
      error: error instanceof Error ? error.message : "Unknown error",
      path: req.path,
      method: req.method,
    });

    // Continue with unsanitized data rather than blocking the request
    next();
  }
};
