/**
 * Base service class providing common functionality
 */
export declare abstract class BaseService {
    protected logger: import("winston").Logger;
    /**
     * Handle service errors consistently
     */
    protected handleError(message: string, error: any): never;
    /**
     * Validate required fields
     */
    protected validateRequired(data: any, fields: string[]): void;
    /**
     * Validate ID format
     */
    protected validateId(id: string): void;
    /**
     * Sanitize input data
     */
    protected sanitizeInput(data: any): any;
}
//# sourceMappingURL=BaseService.d.ts.map