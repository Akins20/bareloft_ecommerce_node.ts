import validator from "validator";
import DOMPurify from "isomorphic-dompurify";
import { Request, Response, NextFunction } from "express";

/**
 * Input sanitization utility for preventing XSS and injection attacks
 */
export class InputSanitizer {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHTML(input: string): string {
    if (!input || typeof input !== "string") {
      return "";
    }

    // Configure DOMPurify for Nigerian e-commerce content
    const cleanHTML = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [
        "b",
        "i",
        "em",
        "strong",
        "p",
        "br",
        "ul",
        "ol",
        "li",
        "a",
      ],
      ALLOWED_ATTR: ["href", "target"],
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP:
        /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });

    return cleanHTML.trim();
  }

  /**
   * Sanitize plain text input
   */
  static sanitizeText(input: string): string {
    if (!input || typeof input !== "string") {
      return "";
    }

    return validator.escape(input).trim();
  }

  /**
   * Sanitize Nigerian phone number
   */
  static sanitizePhoneNumber(phoneNumber: string): string {
    if (!phoneNumber || typeof phoneNumber !== "string") {
      return "";
    }

    // Remove all non-numeric characters
    let sanitized = phoneNumber.replace(/\D/g, "");

    // Handle different formats
    if (sanitized.startsWith("234")) {
      sanitized = "+" + sanitized;
    } else if (sanitized.startsWith("0")) {
      sanitized = "+234" + sanitized.substring(1);
    } else if (sanitized.length === 10) {
      sanitized = "+234" + sanitized;
    }

    return sanitized;
  }

  /**
   * Sanitize email address
   */
  static sanitizeEmail(email: string): string {
    if (!email || typeof email !== "string") {
      return "";
    }

    return validator.normalizeEmail(email.trim().toLowerCase()) || "";
  }

  /**
   * Sanitize name fields (first name, last name, etc.)
   */
  static sanitizeName(name: string): string {
    if (!name || typeof name !== "string") {
      return "";
    }

    // Remove special characters except spaces, hyphens, and apostrophes
    let sanitized = name.replace(/[^a-zA-Z\s'-]/g, "");

    // Trim and normalize spaces
    sanitized = sanitized.trim().replace(/\s+/g, " ");

    // Capitalize first letter of each word
    sanitized = sanitized.replace(/\b\w/g, (l) => l.toUpperCase());

    return sanitized;
  }

  /**
   * Sanitize Nigerian address
   */
  static sanitizeAddress(address: string): string {
    if (!address || typeof address !== "string") {
      return "";
    }

    // Allow alphanumeric, spaces, commas, periods, hyphens, and forward slashes
    let sanitized = address.replace(/[^a-zA-Z0-9\s,.\-/]/g, "");

    // Trim and normalize spaces
    sanitized = sanitized.trim().replace(/\s+/g, " ");

    return sanitized;
  }

  /**
   * Sanitize price/currency values
   */
  static sanitizePrice(price: string | number): number {
    if (typeof price === "number") {
      return Math.max(0, Math.round(price * 100) / 100); // Round to 2 decimal places
    }

    if (typeof price === "string") {
      // Remove currency symbols and spaces
      const sanitized = price.replace(/[₦,\s]/g, "");
      const parsed = parseFloat(sanitized);
      return isNaN(parsed) ? 0 : Math.max(0, Math.round(parsed * 100) / 100);
    }

    return 0;
  }

  /**
   * Sanitize product SKU
   */
  static sanitizeSKU(sku: string): string {
    if (!sku || typeof sku !== "string") {
      return "";
    }

    // Allow only alphanumeric, hyphens, and underscores
    return sku
      .replace(/[^a-zA-Z0-9\-_]/g, "")
      .toUpperCase()
      .trim();
  }

  /**
   * Sanitize slug for URLs
   */
  static sanitizeSlug(slug: string): string {
    if (!slug || typeof slug !== "string") {
      return "";
    }

    return slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
  }

  /**
   * Sanitize search query
   */
  static sanitizeSearchQuery(query: string): string {
    if (!query || typeof query !== "string") {
      return "";
    }

    // Remove potentially dangerous characters but keep search-friendly ones
    let sanitized = query.replace(/[<>\"']/g, "");

    // Trim and normalize spaces
    sanitized = sanitized.trim().replace(/\s+/g, " ");

    // Limit length
    return sanitized.substring(0, 100);
  }

  /**
   * Sanitize order notes/comments
   */
  static sanitizeComment(comment: string): string {
    if (!comment || typeof comment !== "string") {
      return "";
    }

    // Allow basic punctuation but escape HTML
    let sanitized = validator.escape(comment);

    // Trim and normalize spaces
    sanitized = sanitized.trim().replace(/\s+/g, " ");

    // Limit length for comments
    return sanitized.substring(0, 500);
  }

  /**
   * Sanitize metadata and JSON fields
   */
  static sanitizeMetadata(metadata: any): any {
    if (!metadata || typeof metadata !== "object") {
      return {};
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(metadata)) {
      // Sanitize key
      const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, "").substring(0, 50);

      if (sanitizedKey) {
        if (typeof value === "string") {
          sanitized[sanitizedKey] = this.sanitizeText(value).substring(0, 200);
        } else if (typeof value === "number") {
          sanitized[sanitizedKey] = isNaN(value) ? 0 : value;
        } else if (typeof value === "boolean") {
          sanitized[sanitizedKey] = Boolean(value);
        } else if (Array.isArray(value)) {
          sanitized[sanitizedKey] = value
            .slice(0, 10) // Limit array size
            .map((item) =>
              typeof item === "string"
                ? this.sanitizeText(item).substring(0, 100)
                : item
            );
        }
      }
    }

    return sanitized;
  }

  /**
   * Express middleware for automatic input sanitization
   */
  static middleware(
    options: {
      sanitizeBody?: boolean;
      sanitizeQuery?: boolean;
      sanitizeParams?: boolean;
      customSanitizers?: Record<string, (value: any) => any>;
    } = {}
  ) {
    const {
      sanitizeBody = true,
      sanitizeQuery = true,
      sanitizeParams = true,
      customSanitizers = {},
    } = options;

    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Sanitize request body
        if (sanitizeBody && req.body) {
          req.body = this.sanitizeObject(req.body, customSanitizers);
        }

        // Sanitize query parameters
        if (sanitizeQuery && req.query) {
          req.query = this.sanitizeObject(req.query, customSanitizers);
        }

        // Sanitize route parameters
        if (sanitizeParams && req.params) {
          req.params = this.sanitizeObject(req.params, customSanitizers);
        }

        next();
      } catch (error) {
        console.error("Input sanitization error:", error);
        res.status(400).json({
          success: false,
          message: "Invalid input data",
          error: { code: "SANITIZATION_ERROR" },
        });
      }
    };
  }

  /**
   * Recursively sanitize object properties
   */
  private static sanitizeObject(
    obj: any,
    customSanitizers: Record<string, (value: any) => any>
  ): any {
    if (!obj || typeof obj !== "object") {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item, customSanitizers));
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      // Apply custom sanitizer if available
      if (customSanitizers[key]) {
        sanitized[key] = customSanitizers[key](value);
        continue;
      }

      // Apply default sanitization based on key name and value type
      if (typeof value === "string") {
        sanitized[key] = this.sanitizeStringByContext(key, value);
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitizeObject(value, customSanitizers);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Context-aware string sanitization
   */
  private static sanitizeStringByContext(key: string, value: string): string {
    const lowerKey = key.toLowerCase();

    // Phone number fields
    if (lowerKey.includes("phone") || lowerKey.includes("mobile")) {
      return this.sanitizePhoneNumber(value);
    }

    // Email fields
    if (lowerKey.includes("email")) {
      return this.sanitizeEmail(value);
    }

    // Name fields
    if (lowerKey.includes("name") && !lowerKey.includes("username")) {
      return this.sanitizeName(value);
    }

    // Address fields
    if (
      lowerKey.includes("address") ||
      lowerKey === "city" ||
      lowerKey === "street"
    ) {
      return this.sanitizeAddress(value);
    }

    // Price fields
    if (
      lowerKey.includes("price") ||
      lowerKey.includes("amount") ||
      lowerKey.includes("cost")
    ) {
      return this.sanitizePrice(value).toString();
    }

    // SKU fields
    if (lowerKey === "sku") {
      return this.sanitizeSKU(value);
    }

    // Slug fields
    if (lowerKey.includes("slug")) {
      return this.sanitizeSlug(value);
    }

    // Search query fields
    if (lowerKey.includes("query") || lowerKey.includes("search")) {
      return this.sanitizeSearchQuery(value);
    }

    // Comment/note fields
    if (
      lowerKey.includes("comment") ||
      lowerKey.includes("note") ||
      lowerKey.includes("description")
    ) {
      return this.sanitizeComment(value);
    }

    // Default text sanitization
    return this.sanitizeText(value);
  }
}

export default InputSanitizer;
