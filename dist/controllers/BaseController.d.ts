import { Request, Response } from "express";
export declare abstract class BaseController {
    protected logger: import("winston").Logger;
    /**
     * Handle errors in a consistent way across all controllers
     */
    protected handleError(error: any, req: Request, res: Response): void;
    /**
     * Send success response with consistent format
     */
    protected sendSuccess<T>(res: Response, data: T, message?: string, statusCode?: number): void;
    /**
     * Send paginated response
     */
    protected sendPaginatedResponse<T>(res: Response, data: T[], pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext?: boolean;
        hasPrev?: boolean;
    }, message?: string): void;
    /**
     * Send error response with consistent format
     */
    protected sendError(res: Response, message: string, statusCode?: number, errorCode?: string, errors?: string[]): void;
    /**
     * Validate required fields in request body
     */
    protected validateRequiredFields(body: any, requiredFields: string[]): {
        isValid: boolean;
        missingFields: string[];
    };
    /**
     * Parse pagination parameters from query
     */
    protected parsePaginationParams(query: any): {
        page: number;
        limit: number;
        offset: number;
    };
    /**
     * Parse sort parameters from query
     */
    protected parseSortParams(query: any, allowedFields?: string[], defaultSort?: {
        field: string;
        order: "asc" | "desc";
    }): {
        sortBy: string;
        sortOrder: "asc" | "desc";
    };
    /**
     * Parse filter parameters from query
     */
    protected parseFilterParams(query: any, allowedFilters?: string[]): Record<string, any>;
    /**
     * Validate UUID format
     */
    protected isValidUUID(uuid: string): boolean;
    /**
     * Validate email format
     */
    protected isValidEmail(email: string): boolean;
    /**
     * Validate Nigerian phone number
     */
    protected isValidNigerianPhone(phoneNumber: string): boolean;
    /**
     * Sanitize string input
     */
    protected sanitizeString(input: string): string;
    /**
     * Extract user ID from authenticated request
     */
    protected getUserId(req: any): string | null;
    /**
     * Check if user has required role
     */
    protected hasRole(req: any, requiredRole: string): boolean;
    /**
     * Generate consistent cache key
     */
    protected generateCacheKey(prefix: string, ...parts: (string | number)[]): string;
    /**
     * Convert query string boolean to actual boolean
     */
    protected parseBoolean(value: any): boolean | undefined;
    /**
     * Parse date range from query parameters
     */
    protected parseDateRange(query: any): {
        startDate?: Date;
        endDate?: Date;
    };
    /**
     * Log controller action for audit purposes
     */
    protected logAction(action: string, userId?: string, resourceType?: string, resourceId?: string, metadata?: any): void;
}
//# sourceMappingURL=BaseController.d.ts.map