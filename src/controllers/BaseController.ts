import { Request, Response } from "express";
import { ApiResponse } from "../types/api.types";
import { logger } from "../utils/logger/winston";

export abstract class BaseController {
  /**
   * Handle errors in a consistent way across all controllers
   */
  protected handleError(error: any, req: Request, res: Response): void {
    // Log the error with request context
    logger.error("Controller Error:", {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
      userId: (req as any).user?.id,
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
    } else if (error.name === "UnauthorizedError") {
      statusCode = 401;
      message = "Unauthorized access";
      errorCode = "UNAUTHORIZED";
    } else if (error.name === "ForbiddenError") {
      statusCode = 403;
      message = "Access forbidden";
      errorCode = "FORBIDDEN";
    } else if (error.name === "NotFoundError") {
      statusCode = 404;
      message = "Resource not found";
      errorCode = "NOT_FOUND";
    } else if (error.name === "ConflictError") {
      statusCode = 409;
      message = "Resource conflict";
      errorCode = "CONFLICT";
    } else if (error.name === "TooManyRequestsError") {
      statusCode = 429;
      message = "Too many requests";
      errorCode = "RATE_LIMIT_EXCEEDED";
    } else if (error.message && typeof error.message === "string") {
      // Use the error message if it's a controlled error
      message = error.message;
      if (error.statusCode) {
        statusCode = error.statusCode;
      }
    }

    const errorResponse: ApiResponse<null> = {
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
  protected sendSuccess<T>(
    res: Response,
    data: T,
    message: string = "Success",
    statusCode: number = 200
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send paginated response
   */
  protected sendPaginatedResponse<T>(
    res: Response,
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext?: boolean;
      hasPrev?: boolean;
    },
    message: string = "Data retrieved successfully"
  ): void {
    const response: ApiResponse<{
      items: T[];
      pagination: typeof pagination;
    }> = {
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
  protected sendError(
    res: Response,
    message: string,
    statusCode: number = 400,
    errorCode?: string,
    errors?: string[]
  ): void {
    const response: ApiResponse<null> = {
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
  protected validateRequiredFields(
    body: any,
    requiredFields: string[]
  ): { isValid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (
        body[field] === undefined ||
        body[field] === null ||
        body[field] === ""
      ) {
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
  protected parsePaginationParams(query: any): {
    page: number;
    limit: number;
    offset: number;
  } {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(query.limit) || 20), 100);
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }

  /**
   * Parse sort parameters from query
   */
  protected parseSortParams(
    query: any,
    allowedFields: string[] = [],
    defaultSort: { field: string; order: "asc" | "desc" } = {
      field: "createdAt",
      order: "desc",
    }
  ): { sortBy: string; sortOrder: "asc" | "desc" } {
    let sortBy = query.sortBy || defaultSort.field;
    let sortOrder: "asc" | "desc" = query.sortOrder === "asc" ? "asc" : "desc";

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
  protected parseFilterParams(
    query: any,
    allowedFilters: string[] = []
  ): Record<string, any> {
    const filters: Record<string, any> = {};

    for (const key of allowedFilters) {
      if (query[key] !== undefined) {
        // Handle boolean filters
        if (query[key] === "true") {
          filters[key] = true;
        } else if (query[key] === "false") {
          filters[key] = false;
        } else {
          filters[key] = query[key];
        }
      }
    }

    return filters;
  }

  /**
   * Validate UUID format
   */
  protected isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate email format
   */
  protected isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate Nigerian phone number
   */
  protected isValidNigerianPhone(phoneNumber: string): boolean {
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
  protected sanitizeString(input: string): string {
    if (!input || typeof input !== "string") return "";

    return input
      .trim()
      .replace(/[<>]/g, "") // Remove basic HTML chars
      .substring(0, 1000); // Limit length
  }

  /**
   * Extract user ID from authenticated request
   */
  protected getUserId(req: any): string | null {
    return req.user?.id || null;
  }

  /**
   * Check if user has required role
   */
  protected hasRole(req: any, requiredRole: string): boolean {
    const userRole = req.user?.role;

    const roleHierarchy = {
      customer: 1,
      admin: 2,
      super_admin: 3,
    };

    const userLevel =
      roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    const requiredLevel =
      roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 999;

    return userLevel >= requiredLevel;
  }

  /**
   * Generate consistent cache key
   */
  protected generateCacheKey(
    prefix: string,
    ...parts: (string | number)[]
  ): string {
    return `${prefix}:${parts.join(":")}`;
  }

  /**
   * Convert query string boolean to actual boolean
   */
  protected parseBoolean(value: any): boolean | undefined {
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
  }

  /**
   * Parse date range from query parameters
   */
  protected parseDateRange(query: any): { startDate?: Date; endDate?: Date } {
    const result: { startDate?: Date; endDate?: Date } = {};

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
  protected logAction(
    action: string,
    userId?: string,
    resourceType?: string,
    resourceId?: string,
    metadata?: any
  ): void {
    logger.info("Controller Action", {
      action,
      userId,
      resourceType,
      resourceId,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }
}
