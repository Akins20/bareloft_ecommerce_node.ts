import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest, UserRole } from "@/types";
export declare class AuthMiddleware {
    private authService;
    private jwtService;
    constructor();
    /**
     * Authenticate request using Bearer token
     */
    authenticate(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Optional authentication - continues even if token is invalid
     */
    optionalAuthenticate(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Authorize user based on roles
     */
    authorize(allowedRoles: UserRole | UserRole[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
    /**
     * Admin only authorization
     */
    adminOnly(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
    /**
     * Super admin only authorization
     */
    superAdminOnly(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
    /**
     * Customer only authorization
     */
    customerOnly(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
    /**
     * Check if user owns the resource
     */
    resourceOwner(getUserIdFromParams: (req: Request) => string): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
    /**
     * Rate limiting for authenticated users
     */
    authenticatedRateLimit(maxRequests?: number, windowMs?: number): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
    /**
     * Verify user account is active and verified
     */
    requireVerifiedUser(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Check if user has specific permission
     */
    hasPermission(permission: string): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
    /**
     * Extract token from Authorization header
     */
    private extractToken;
    /**
     * Get user ID from request parameters
     */
    static getUserIdFromParams(paramName?: string): (req: Request) => string;
    /**
     * Get user ID from request body
     */
    static getUserIdFromBody(fieldName?: string): (req: Request) => string;
}
export declare const authMiddleware: AuthMiddleware;
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const optionalAuthenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const adminOnly: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const superAdminOnly: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const customerOnly: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const requireVerifiedUser: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const authorize: (roles: UserRole | UserRole[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const resourceOwner: (getUserId: (req: Request) => string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const hasPermission: (permission: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const authenticatedRateLimit: (maxRequests?: number, windowMs?: number) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=AuthMiddleware.d.ts.map