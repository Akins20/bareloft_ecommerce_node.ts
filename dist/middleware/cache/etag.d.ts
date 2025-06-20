import { Request, Response, NextFunction } from "express";
interface ETagOptions {
    weak?: boolean;
    algorithm?: string;
    skipPaths?: string[];
    generateETag?: (body: any, req: Request) => string;
}
/**
 * 🏷️ ETag middleware
 */
export declare const etagHandler: (options?: ETagOptions) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * 🔄 Conditional request handler
 * Handles If-Modified-Since and If-Unmodified-Since headers
 */
export declare const conditionalHandler: (req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=etag.d.ts.map