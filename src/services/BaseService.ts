import { AppError, HTTP_STATUS, ERROR_CODES } from '../types/api.types';
import { PaginationMeta } from '../types/common.types';
import { logger } from '../utils/logger/winston';

/**
 * Base service class providing common functionality
 */
export abstract class BaseService {
  protected logger = logger;

  /**
   * Handle service errors consistently
   */
  protected handleError(message: string, error: any): never {
    this.logger.error(message, { error: error.message, stack: error.stack });
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError(
      message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }

  /**
   * Validate required fields
   */
  protected validateRequired(data: any, fields: string[]): void {
    const missing = fields.filter(field => !data[field]);
    if (missing.length > 0) {
      throw new AppError(
        `Missing required fields: ${missing.join(', ')}`,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.MISSING_REQUIRED_FIELD
      );
    }
  }

  /**
   * Validate ID format
   */
  protected validateId(id: string): void {
    if (!id || typeof id !== 'string') {
      throw new AppError(
        'Invalid ID provided',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }
  }

  /**
   * Sanitize input data
   */
  protected sanitizeInput(data: any): any {
    if (typeof data === 'string') {
      return data.trim();
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
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
  protected createPagination(page: number, limit: number, total: number): PaginationMeta {
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