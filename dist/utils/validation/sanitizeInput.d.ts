import { Request, Response, NextFunction } from "express";
/**
 * Input sanitization utility for preventing XSS and injection attacks
 */
export declare class InputSanitizer {
    /**
     * Sanitize HTML content to prevent XSS attacks
     */
    static sanitizeHTML(input: string): string;
    /**
     * Sanitize plain text input
     */
    static sanitizeText(input: string): string;
    /**
     * Sanitize Nigerian phone number
     */
    static sanitizePhoneNumber(phoneNumber: string): string;
    /**
     * Sanitize email address
     */
    static sanitizeEmail(email: string): string;
    /**
     * Sanitize name fields (first name, last name, etc.)
     */
    static sanitizeName(name: string): string;
    /**
     * Sanitize Nigerian address
     */
    static sanitizeAddress(address: string): string;
    /**
     * Sanitize price/currency values
     */
    static sanitizePrice(price: string | number): number;
    /**
     * Sanitize product SKU
     */
    static sanitizeSKU(sku: string): string;
    /**
     * Sanitize slug for URLs
     */
    static sanitizeSlug(slug: string): string;
    /**
     * Sanitize search query
     */
    static sanitizeSearchQuery(query: string): string;
    /**
     * Sanitize order notes/comments
     */
    static sanitizeComment(comment: string): string;
    /**
     * Sanitize metadata and JSON fields
     */
    static sanitizeMetadata(metadata: any): any;
    /**
     * Express middleware for automatic input sanitization
     */
    static middleware(options?: {
        sanitizeBody?: boolean;
        sanitizeQuery?: boolean;
        sanitizeParams?: boolean;
        customSanitizers?: Record<string, (value: any) => any>;
    }): (req: Request, res: Response, next: NextFunction) => void;
    /**
     * Recursively sanitize object properties
     */
    private static sanitizeObject;
    /**
     * Context-aware string sanitization
     */
    private static sanitizeStringByContext;
}
export default InputSanitizer;
//# sourceMappingURL=sanitizeInput.d.ts.map