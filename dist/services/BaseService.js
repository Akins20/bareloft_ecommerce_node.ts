"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = void 0;
const api_types_1 = require("../types/api.types");
const winston_1 = require("../utils/logger/winston");
/**
 * Base service class providing common functionality
 */
class BaseService {
    logger = winston_1.logger;
    /**
     * Handle service errors consistently
     */
    handleError(message, error) {
        this.logger.error(message, { error: error.message, stack: error.stack });
        if (error instanceof api_types_1.AppError) {
            throw error;
        }
        throw new api_types_1.AppError(message, api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
    }
    /**
     * Validate required fields
     */
    validateRequired(data, fields) {
        const missing = fields.filter(field => !data[field]);
        if (missing.length > 0) {
            throw new api_types_1.AppError(`Missing required fields: ${missing.join(', ')}`, api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.MISSING_REQUIRED_FIELD);
        }
    }
    /**
     * Validate ID format
     */
    validateId(id) {
        if (!id || typeof id !== 'string') {
            throw new api_types_1.AppError('Invalid ID provided', api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.INVALID_INPUT);
        }
    }
    /**
     * Sanitize input data
     */
    sanitizeInput(data) {
        if (typeof data === 'string') {
            return data.trim();
        }
        if (typeof data === 'object' && data !== null) {
            const sanitized = {};
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    sanitized[key] = this.sanitizeInput(data[key]);
                }
            }
            return sanitized;
        }
        return data;
    }
    /**
     * Create pagination metadata
     */
    createPagination(page, limit, total) {
        const totalPages = Math.ceil(total / limit);
        return {
            currentPage: page,
            totalPages,
            totalItems: total,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
        };
    }
}
exports.BaseService = BaseService;
//# sourceMappingURL=BaseService.js.map