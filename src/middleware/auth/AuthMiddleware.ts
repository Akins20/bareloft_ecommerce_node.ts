import { Request, Response, NextFunction } from "express";
import { AuthService } from "@/services/auth/AuthService";
import { JWTService } from "@/services/auth/JWTService";
import {
  AuthenticatedRequest,
  createErrorResponse,
  HTTP_STATUS,
  ERROR_CODES,
  UserRole,
  PublicUser,
} from "@/types";

export class AuthMiddleware {
  private authService: AuthService;
  private jwtService: JWTService;

  constructor() {
    this.authService = new AuthService();
    this.jwtService = new JWTService();
  }

  /**
   * Authenticate request using Bearer token
   */
  authenticate() {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
          res
            .status(HTTP_STATUS.UNAUTHORIZED)
            .json(
              createErrorResponse(
                "Authorization header is required",
                ERROR_CODES.UNAUTHORIZED
              )
            );
          return;
        }

        const token = this.extractToken(authHeader);
        if (!token) {
          res
            .status(HTTP_STATUS.UNAUTHORIZED)
            .json(
              createErrorResponse(
                "Invalid authorization header format",
                ERROR_CODES.UNAUTHORIZED
              )
            );
          return;
        }

        // Validate token and get user
        const user = await this.authService.validateToken(token);

        // Attach user to request
        const authenticatedUser: PublicUser = {
          id: user.id,
          userId: user.id,
          phoneNumber: user.phoneNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isVerified: user.isVerified,
          sessionId: this.jwtService.extractSessionId(token),
          createdAt: user.createdAt,
        };
        
        // Add optional fields if they exist
        if (user.email) authenticatedUser.email = user.email;
        if (user.avatar) authenticatedUser.avatar = user.avatar;
        
        (req as AuthenticatedRequest).user = authenticatedUser;

        next();
      } catch (error) {
        res
          .status(HTTP_STATUS.UNAUTHORIZED)
          .json(
            createErrorResponse(
              "Invalid or expired token",
              ERROR_CODES.TOKEN_INVALID
            )
          );
      }
    };
  }

  /**
   * Optional authentication - continues even if token is invalid
   */
  optionalAuthenticate() {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const authHeader = req.headers.authorization;

        if (authHeader) {
          const token = this.extractToken(authHeader);
          if (token) {
            try {
              const user = await this.authService.validateToken(token);
              const authenticatedUser: PublicUser = {
                id: user.id,
                userId: user.id,
                phoneNumber: user.phoneNumber,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                isVerified: user.isVerified,
                sessionId: this.jwtService.extractSessionId(token),
                createdAt: user.createdAt,
              };
              
              // Add optional fields if they exist
              if (user.email) authenticatedUser.email = user.email;
              if (user.avatar) authenticatedUser.avatar = user.avatar;
              
              (req as AuthenticatedRequest).user = authenticatedUser;
            } catch (error) {
              // Ignore authentication errors in optional auth
            }
          }
        }

        next();
      } catch (error) {
        // Continue without authentication
        next();
      }
    };
  }

  /**
   * Authorize user based on roles
   */
  authorize(allowedRoles: UserRole | UserRole[]) {
    return (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): void => {
      try {
        if (!req.user) {
          res
            .status(HTTP_STATUS.UNAUTHORIZED)
            .json(
              createErrorResponse(
                "Authentication required",
                ERROR_CODES.UNAUTHORIZED
              )
            );
          return;
        }

        const userRole = req.user.role;
        const roles = Array.isArray(allowedRoles)
          ? allowedRoles
          : [allowedRoles];

        if (!roles.includes(userRole)) {
          res
            .status(HTTP_STATUS.FORBIDDEN)
            .json(
              createErrorResponse(
                "Insufficient permissions",
                ERROR_CODES.FORBIDDEN
              )
            );
          return;
        }

        next();
      } catch (error) {
        res
          .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json(
            createErrorResponse(
              "Authorization error",
              ERROR_CODES.INTERNAL_ERROR
            )
          );
      }
    };
  }

  /**
   * Admin only authorization
   */
  adminOnly() {
    return this.authorize(["ADMIN", "SUPER_ADMIN"]);
  }

  /**
   * Super admin only authorization
   */
  superAdminOnly() {
    return this.authorize("SUPER_ADMIN");
  }

  /**
   * Customer only authorization
   */
  customerOnly() {
    return this.authorize("CUSTOMER");
  }

  /**
   * Check if user owns the resource
   */
  resourceOwner(getUserIdFromParams: (req: Request) => string) {
    return (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): void => {
      try {
        if (!req.user) {
          res
            .status(HTTP_STATUS.UNAUTHORIZED)
            .json(
              createErrorResponse(
                "Authentication required",
                ERROR_CODES.UNAUTHORIZED
              )
            );
          return;
        }

        const resourceUserId = getUserIdFromParams(req);
        const currentUserId = req.user.userId;

        // Allow if user owns the resource or is admin
        if (
          resourceUserId === currentUserId ||
          ["ADMIN", "SUPER_ADMIN"].includes(req.user.role)
        ) {
          next();
          return;
        }

        res
          .status(HTTP_STATUS.FORBIDDEN)
          .json(
            createErrorResponse(
              "Access denied - you can only access your own resources",
              ERROR_CODES.FORBIDDEN
            )
          );
      } catch (error) {
        res
          .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json(
            createErrorResponse(
              "Authorization error",
              ERROR_CODES.INTERNAL_ERROR
            )
          );
      }
    };
  }

  /**
   * Rate limiting for authenticated users
   */
  authenticatedRateLimit(
    maxRequests: number = 100,
    windowMs: number = 15 * 60 * 1000
  ) {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): void => {
      try {
        if (!req.user) {
          next();
          return;
        }

        const userId = req.user.userId;
        const now = Date.now();
        const userRequests = requests.get(userId);

        if (!userRequests || now > userRequests.resetTime) {
          requests.set(userId, { count: 1, resetTime: now + windowMs });
          next();
          return;
        }

        if (userRequests.count >= maxRequests) {
          res
            .status(HTTP_STATUS.TOO_MANY_REQUESTS)
            .json(
              createErrorResponse(
                "Rate limit exceeded",
                ERROR_CODES.RATE_LIMIT_EXCEEDED
              )
            );
          return;
        }

        userRequests.count++;
        next();
      } catch (error) {
        next();
      }
    };
  }

  /**
   * Verify user account is active and verified
   */
  requireVerifiedUser() {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        if (!req.user) {
          res
            .status(HTTP_STATUS.UNAUTHORIZED)
            .json(
              createErrorResponse(
                "Authentication required",
                ERROR_CODES.UNAUTHORIZED
              )
            );
          return;
        }

        // Get full user details
        const user = await this.authService.validateToken(
          this.extractToken(req.headers.authorization!)!
        );

        if (!user.isVerified) {
          res
            .status(HTTP_STATUS.FORBIDDEN)
            .json(
              createErrorResponse(
                "Account verification required",
                ERROR_CODES.FORBIDDEN
              )
            );
          return;
        }

        if (!user.isActive) {
          res
            .status(HTTP_STATUS.FORBIDDEN)
            .json(
              createErrorResponse(
                "Account has been deactivated",
                ERROR_CODES.FORBIDDEN
              )
            );
          return;
        }

        next();
      } catch (error) {
        res
          .status(HTTP_STATUS.UNAUTHORIZED)
          .json(
            createErrorResponse(
              "Invalid or expired token",
              ERROR_CODES.TOKEN_INVALID
            )
          );
      }
    };
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string) {
    return (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): void => {
      try {
        if (!req.user) {
          res
            .status(HTTP_STATUS.UNAUTHORIZED)
            .json(
              createErrorResponse(
                "Authentication required",
                ERROR_CODES.UNAUTHORIZED
              )
            );
          return;
        }

        // Permission checking logic would go here
        // For now, we'll use role-based permissions
        const rolePermissions: Record<UserRole, string[]> = {
          CUSTOMER: ["read:own", "update:own", "delete:own"],
          ADMIN: ["read:any", "update:any", "delete:any", "create:any"],
          SUPER_ADMIN: ["*"],
        };

        const userPermissions = rolePermissions[req.user.role] || [];

        if (
          userPermissions.includes("*") ||
          userPermissions.includes(permission)
        ) {
          next();
          return;
        }

        res
          .status(HTTP_STATUS.FORBIDDEN)
          .json(
            createErrorResponse(
              `Permission denied - ${permission} required`,
              ERROR_CODES.FORBIDDEN
            )
          );
      } catch (error) {
        res
          .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json(
            createErrorResponse(
              "Authorization error",
              ERROR_CODES.INTERNAL_ERROR
            )
          );
      }
    };
  }

  /**
   * Extract token from Authorization header
   */
  private extractToken(authHeader: string): string | null {
    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return null;
    }

    return parts[1] || null;
  }

  /**
   * Get user ID from request parameters
   */
  static getUserIdFromParams(paramName: string = "userId") {
    return (req: Request): string => {
      return req.params[paramName] || "";
    };
  }

  /**
   * Get user ID from request body
   */
  static getUserIdFromBody(fieldName: string = "userId") {
    return (req: Request): string => {
      return req.body[fieldName] || "";
    };
  }
}

// Export singleton instance
export const authMiddleware = new AuthMiddleware();

// Export individual middleware functions for convenience
export const authenticate = authMiddleware.authenticate();
export const optionalAuthenticate = authMiddleware.optionalAuthenticate();
export const adminOnly = authMiddleware.adminOnly();
export const superAdminOnly = authMiddleware.superAdminOnly();
export const customerOnly = authMiddleware.customerOnly();
export const requireVerifiedUser = authMiddleware.requireVerifiedUser();

// Export helper functions
export const authorize = (roles: UserRole | UserRole[]) =>
  authMiddleware.authorize(roles);
export const resourceOwner = (getUserId: (req: Request) => string) =>
  authMiddleware.resourceOwner(getUserId);
export const hasPermission = (permission: string) =>
  authMiddleware.hasPermission(permission);
export const authenticatedRateLimit = (
  maxRequests?: number,
  windowMs?: number
) => authMiddleware.authenticatedRateLimit(maxRequests, windowMs);
