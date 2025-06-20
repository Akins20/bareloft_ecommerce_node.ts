"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeInput = void 0;
const validator_1 = __importDefault(require("validator"));
const winston_1 = require("../../utils/logger/winston");
/**
 * Sanitizes string input
 */
const sanitizeString = (str) => {
    if (typeof str !== "string")
        return str;
    return str
        .trim() // Remove leading/trailing whitespace
        .replace(/\s+/g, " ") // Normalize multiple spaces
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
        .substring(0, 10000); // Limit length to prevent DoS
};
/**
 * Normalizes Nigerian phone numbers
 */
const normalizeNigerianPhone = (phone) => {
    if (typeof phone !== "string")
        return phone;
    let normalized = phone.replace(/\s+/g, "").replace(/[^\d+]/g, "");
    // Convert various formats to +234 format
    if (normalized.startsWith("0")) {
        normalized = "+234" + normalized.substring(1);
    }
    else if (normalized.startsWith("234") && !normalized.startsWith("+234")) {
        normalized = "+" + normalized;
    }
    else if (!normalized.startsWith("+234") && normalized.length === 10) {
        normalized = "+234" + normalized;
    }
    return normalized;
};
/**
 * Recursively sanitizes object properties
 */
const sanitizeObject = (obj) => {
    if (obj === null || obj === undefined)
        return obj;
    if (typeof obj === "string") {
        return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
    }
    if (typeof obj === "object") {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            let sanitizedKey = sanitizeString(key);
            // Special handling for specific fields
            if (sanitizedKey.toLowerCase().includes("phone")) {
                sanitized[sanitizedKey] =
                    typeof value === "string"
                        ? normalizeNigerianPhone(value)
                        : sanitizeObject(value);
            }
            else if (sanitizedKey.toLowerCase().includes("email")) {
                sanitized[sanitizedKey] =
                    typeof value === "string"
                        ? validator_1.default.normalizeEmail(value) || value
                        : sanitizeObject(value);
            }
            else {
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
const sanitizeInput = (req, res, next) => {
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
    }
    catch (error) {
        winston_1.logger.error("Input sanitization error", {
            error: error instanceof Error ? error.message : "Unknown error",
            path: req.path,
            method: req.method,
        });
        // Continue with unsanitized data rather than blocking the request
        next();
    }
};
exports.sanitizeInput = sanitizeInput;
//# sourceMappingURL=sanitizeInput.js.map