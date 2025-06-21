import { Request, Response, NextFunction } from "express";
/**
 * CSRF (Cross-Site Request Forgery) Protection Utility
 */
export declare class CSRFProtection {
    private static readonly TOKEN_LENGTH;
    private static readonly SECRET_LENGTH;
    private static readonly TOKEN_EXPIRY;
    private static readonly HEADER_NAME;
    private static readonly COOKIE_NAME;
    /**
     * Generate a CSRF token
     */
    static generateToken(): string;
    /**
     * Generate a CSRF secret
     */
    static generateSecret(): string;
    /**
     * Create CSRF token hash using secret
     */
    static createTokenHash(token: string, secret: string): string;
    /**
     * Verify CSRF token against secret
     */
    static verifyToken(token: string, secret: string, hash: string): boolean;
    /**
     * Store CSRF token in Redis with expiry
     */
    static storeToken(sessionId: string, token: string, secret: string): Promise<void>;
    /**
     * Retrieve and verify CSRF token from Redis
     */
    static validateStoredToken(sessionId: string, providedToken: string): Promise<boolean>;
    /**
     * Generate CSRF token for session
     */
    static generateTokenForSession(sessionId: string): Promise<string>;
    /**
     * Invalidate CSRF token for session
     */
    static invalidateToken(sessionId: string): Promise<void>;
    /**
     * Middleware for CSRF protection
     */
    static middleware(options?: {
        ignoreMethods?: string[];
        headerName?: string;
        cookieName?: string;
        skipPaths?: string[];
    }): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
    /**
     * Generate CSRF token endpoint
     */
    static generateTokenEndpoint(req: Request, res: Response): Promise<void>;
    /**
     * Double Submit Cookie pattern implementation
     */
    static doubleSubmitCookieMiddleware(options?: {
        cookieName?: string;
        secure?: boolean;
        sameSite?: "strict" | "lax" | "none";
    }): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
    /**
     * Cleanup expired tokens (run periodically)
     */
    static cleanupExpiredTokens(): Promise<void>;
}
export default CSRFProtection;
//# sourceMappingURL=csrf.d.ts.map