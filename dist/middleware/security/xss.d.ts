import { Request, Response, NextFunction } from "express";
/**
 * XSS Protection Middleware
 * Sanitizes all request data (body, query, params)
 */
export declare const xssProtection: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Content sanitization for rich text (like product descriptions)
 * Allows safe HTML tags for formatting
 */
export declare const sanitizeRichContent: (content: string) => string;
//# sourceMappingURL=xss.d.ts.map