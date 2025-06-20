import { Request, Response, NextFunction } from "express";
interface TokenValidationOptions {
    required?: boolean;
    allowRefreshToken?: boolean;
    checkSession?: boolean;
    skipExpiredCheck?: boolean;
}
/**
 * 🔍 Advanced token validation middleware
 * Provides flexible token validation for different use cases
 */
export declare const validateToken: (options?: TokenValidationOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * 🔄 Refresh token validation middleware
 * Specifically for token refresh endpoints
 */
export declare const validateRefreshToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * 📱 API key validation middleware
 * For mobile app or third-party integrations
 */
export declare const validateApiKey: (req: Request, res: Response, next: NextFunction) => void;
declare global {
    namespace Express {
        interface Request {
            token?: any;
            apiKey?: string;
        }
    }
}
export {};
//# sourceMappingURL=validateToken.d.ts.map