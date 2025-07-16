"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseController = void 0;
const winston_1 = require("../utils/logger/winston");
class BaseController {
    logger = winston_1.logger;
    /**
     * Handle errors in a consistent way across all controllers
     */
    handleError(error, req, res) {
        // Log the error with request context
        winston_1.logger.error("Controller Error:", {
            error: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method,
            userAgent: req.get("User-Agent"),
            ip: req.ip,
            userId: req.user?.id,
            timestamp: new Date().toISOString(),
        });
        // Determine error type and appropriate response
        let statusCode = 500;
        let message = "Internal server error";
        let errorCode = "INTERNAL_ERROR";
        if (error.name === "ValidationError") {
            statusCode = 400;
            message = "Validation failed";
            errorCode = "VALIDATION_ERROR";
        }
        else if (error.name === "UnauthorizedError") {
            statusCode = 401;
            message = "Unauthorized access";
            errorCode = "UNAUTHORIZED";
        }
        else if (error.name === "ForbiddenError") {
            statusCode = 403;
            message = "Access forbidden";
            errorCode = "FORBIDDEN";
        }
        else if (error.name === "NotFoundError") {
            statusCode = 404;
            message = "Resource not found";
            errorCode = "NOT_FOUND";
        }
        else if (error.name === "ConflictError") {
            statusCode = 409;
            message = "Resource conflict";
            errorCode = "CONFLICT";
        }
        else if (error.name === "TooManyRequestsError") {
            statusCode = 429;
            message = "Too many requests";
            errorCode = "RATE_LIMIT_EXCEEDED";
        }
        else if (error.message && typeof error.message === "string") {
            // Use the error message if it's a controlled error
            message = error.message;
            if (error.statusCode) {
                statusCode = error.statusCode;
            }
        }
        const errorResponse = {
            success: false,
            message,
            error: {
                code: errorCode,
                ...(process.env.NODE_ENV === "development" && {
                    stack: error.stack,
                    details: error,
                }),
            },
            data: null,
        };
        res.status(statusCode).json(errorResponse);
    }
    /**
     * Send success response with consistent format
     */
    sendSuccess(res, data, message = "Success", statusCode = 200) {
        const response = {
            success: true,
            message,
            data,
        };
        res.status(statusCode).json(response);
    }
    /**
     * Send paginated response
     */
    sendPaginatedResponse(res, data, pagination, message = "Data retrieved successfully") {
        const response = {
            success: true,
            message,
            data: {
                items: data,
                pagination,
            },
        };
        res.json(response);
    }
    /**
     * Send error response with consistent format
     */
    sendError(res, message, statusCode = 400, errorCode, errors) {
        const response = {
            success: false,
            message,
            error: {
                code: errorCode || "ERROR",
                ...(errors && { details: errors }),
            },
            data: null,
        };
        res.status(statusCode).json(response);
    }
    /**
     * Validate required fields in request body
     */
    validateRequiredFields(body, requiredFields) {
        const missingFields = [];
        for (const field of requiredFields) {
            if (body[field] === undefined ||
                body[field] === null ||
                body[field] === "") {
                missingFields.push(field);
            }
        }
        return {
            isValid: missingFields.length === 0,
            missingFields,
        };
    }
    /**
     * Parse pagination parameters from query
     */
    parsePaginationParams(query) {
        const page = Math.max(1, parseInt(query.page) || 1);
        const limit = Math.min(Math.max(1, parseInt(query.limit) || 20), 100);
        const offset = (page - 1) * limit;
        return { page, limit, offset };
    }
    /**
     * Parse sort parameters from query
     */
    parseSortParams(query, allowedFields = [], defaultSort = {
        field: "createdAt",
        order: "desc",
    }) {
        let sortBy = query.sortBy || defaultSort.field;
        let sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
        // Validate sort field if allowed fields are specified
        if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
            sortBy = defaultSort.field;
            sortOrder = defaultSort.order;
        }
        return { sortBy, sortOrder };
    }
    /**
     * Parse filter parameters from query
     */
    parseFilterParams(query, allowedFilters = []) {
        const filters = {};
        for (const key of allowedFilters) {
            if (query[key] !== undefined) {
                // Handle boolean filters
                if (query[key] === "true") {
                    filters[key] = true;
                }
                else if (query[key] === "false") {
                    filters[key] = false;
                }
                else {
                    filters[key] = query[key];
                }
            }
        }
        return filters;
    }
    /**
     * Validate UUID format
     */
    isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }
    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    /**
     * Validate Nigerian phone number
     */
    isValidNigerianPhone(phoneNumber) {
        const cleanPhone = phoneNumber.replace(/\s+/g, "");
        const patterns = [
            /^(\+234|234|0)(70|71|80|81|90|91)\d{8}$/, // Mobile
            /^(\+234|234|0)(1)\d{8}$/, // Landline
        ];
        return patterns.some((pattern) => pattern.test(cleanPhone));
    }
    /**
     * Sanitize string input
     */
    sanitizeString(input) {
        if (!input || typeof input !== "string")
            return "";
        return input
            .trim()
            .replace(/[<>]/g, "") // Remove basic HTML chars
            .substring(0, 1000); // Limit length
    }
    /**
     * Extract user ID from authenticated request
     */
    getUserId(req) {
        return req.user?.id || null;
    }
    /**
     * Check if user has required role
     */
    hasRole(req, requiredRole) {
        const userRole = req.user?.role;
        const roleHierarchy = {
            customer: 1,
            admin: 2,
            super_admin: 3,
        };
        const userLevel = roleHierarchy[userRole] || 0;
        const requiredLevel = roleHierarchy[requiredRole] || 999;
        return userLevel >= requiredLevel;
    }
    /**
     * Generate consistent cache key
     */
    generateCacheKey(prefix, ...parts) {
        return `${prefix}:${parts.join(":")}`;
    }
    /**
     * Convert query string boolean to actual boolean
     */
    parseBoolean(value) {
        if (value === "true")
            return true;
        if (value === "false")
            return false;
        return undefined;
    }
    /**
     * Parse date range from query parameters
     */
    parseDateRange(query) {
        const result = {};
        if (query.startDate) {
            const start = new Date(query.startDate);
            if (!isNaN(start.getTime())) {
                result.startDate = start;
            }
        }
        if (query.endDate) {
            const end = new Date(query.endDate);
            if (!isNaN(end.getTime())) {
                result.endDate = end;
            }
        }
        return result;
    }
    /**
     * Log controller action for audit purposes
     */
    logAction(action, userId, resourceType, resourceId, metadata) {
        winston_1.logger.info("Controller Action", {
            action,
            userId,
            resourceType,
            resourceId,
            metadata,
            timestamp: new Date().toISOString(),
        });
    }
}
exports.BaseController = BaseController;
//# sourceMappingURL=BaseController.js.map