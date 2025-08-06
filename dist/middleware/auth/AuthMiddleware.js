"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticatedRateLimit = exports.hasPermission = exports.resourceOwner = exports.authorize = exports.requireVerifiedUser = exports.customerOnly = exports.superAdminOnly = exports.adminOnly = exports.optionalAuthenticate = exports.authenticate = exports.authMiddleware = exports.AuthMiddleware = void 0;
const AuthService_1 = require("@/services/auth/AuthService");
const JWTService_1 = require("@/services/auth/JWTService");
const types_1 = require("@/types");
class AuthMiddleware {
    authService;
    jwtService;
    constructor() {
        this.authService = new AuthService_1.AuthService();
        this.jwtService = new JWTService_1.JWTService();
    }
    /**
     * Authenticate request using Bearer token
     */
    authenticate() {
        return async (req, res, next) => {
            try {
                const authHeader = req.headers.authorization;
                if (!authHeader) {
                    res
                        .status(types_1.HTTP_STATUS.UNAUTHORIZED)
                        .json((0, types_1.createErrorResponse)("Authorization header is required", types_1.ERROR_CODES.UNAUTHORIZED));
                    return;
                }
                const token = this.extractToken(authHeader);
                if (!token) {
                    res
                        .status(types_1.HTTP_STATUS.UNAUTHORIZED)
                        .json((0, types_1.createErrorResponse)("Invalid authorization header format", types_1.ERROR_CODES.UNAUTHORIZED));
                    return;
                }
                // Validate token and get user
                const user = await this.authService.validateToken(token);
                // Attach user to request
                const authenticatedUser = {
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
                if (user.email)
                    authenticatedUser.email = user.email;
                if (user.avatar)
                    authenticatedUser.avatar = user.avatar;
                req.user = authenticatedUser;
                next();
            }
            catch (error) {
                res
                    .status(types_1.HTTP_STATUS.UNAUTHORIZED)
                    .json((0, types_1.createErrorResponse)("Invalid or expired token", types_1.ERROR_CODES.TOKEN_INVALID));
            }
        };
    }
    /**
     * Optional authentication - continues even if token is invalid
     */
    optionalAuthenticate() {
        return async (req, res, next) => {
            try {
                const authHeader = req.headers.authorization;
                if (authHeader) {
                    const token = this.extractToken(authHeader);
                    if (token) {
                        try {
                            const user = await this.authService.validateToken(token);
                            const authenticatedUser = {
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
                            if (user.email)
                                authenticatedUser.email = user.email;
                            if (user.avatar)
                                authenticatedUser.avatar = user.avatar;
                            req.user = authenticatedUser;
                        }
                        catch (error) {
                            // Ignore authentication errors in optional auth
                        }
                    }
                }
                next();
            }
            catch (error) {
                // Continue without authentication
                next();
            }
        };
    }
    /**
     * Authorize user based on roles
     */
    authorize(allowedRoles) {
        return (req, res, next) => {
            try {
                if (!req.user) {
                    res
                        .status(types_1.HTTP_STATUS.UNAUTHORIZED)
                        .json((0, types_1.createErrorResponse)("Authentication required", types_1.ERROR_CODES.UNAUTHORIZED));
                    return;
                }
                const userRole = req.user.role;
                const roles = Array.isArray(allowedRoles)
                    ? allowedRoles
                    : [allowedRoles];
                if (!roles.includes(userRole)) {
                    res
                        .status(types_1.HTTP_STATUS.FORBIDDEN)
                        .json((0, types_1.createErrorResponse)("Insufficient permissions", types_1.ERROR_CODES.FORBIDDEN));
                    return;
                }
                next();
            }
            catch (error) {
                res
                    .status(types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR)
                    .json((0, types_1.createErrorResponse)("Authorization error", types_1.ERROR_CODES.INTERNAL_ERROR));
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
    resourceOwner(getUserIdFromParams) {
        return (req, res, next) => {
            try {
                if (!req.user) {
                    res
                        .status(types_1.HTTP_STATUS.UNAUTHORIZED)
                        .json((0, types_1.createErrorResponse)("Authentication required", types_1.ERROR_CODES.UNAUTHORIZED));
                    return;
                }
                const resourceUserId = getUserIdFromParams(req);
                const currentUserId = req.user.userId;
                // Allow if user owns the resource or is admin
                if (resourceUserId === currentUserId ||
                    ["ADMIN", "SUPER_ADMIN"].includes(req.user.role)) {
                    next();
                    return;
                }
                res
                    .status(types_1.HTTP_STATUS.FORBIDDEN)
                    .json((0, types_1.createErrorResponse)("Access denied - you can only access your own resources", types_1.ERROR_CODES.FORBIDDEN));
            }
            catch (error) {
                res
                    .status(types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR)
                    .json((0, types_1.createErrorResponse)("Authorization error", types_1.ERROR_CODES.INTERNAL_ERROR));
            }
        };
    }
    /**
     * Rate limiting for authenticated users
     */
    authenticatedRateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) {
        const requests = new Map();
        return (req, res, next) => {
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
                        .status(types_1.HTTP_STATUS.TOO_MANY_REQUESTS)
                        .json((0, types_1.createErrorResponse)("Rate limit exceeded", types_1.ERROR_CODES.RATE_LIMIT_EXCEEDED));
                    return;
                }
                userRequests.count++;
                next();
            }
            catch (error) {
                next();
            }
        };
    }
    /**
     * Verify user account is active and verified
     */
    requireVerifiedUser() {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    res
                        .status(types_1.HTTP_STATUS.UNAUTHORIZED)
                        .json((0, types_1.createErrorResponse)("Authentication required", types_1.ERROR_CODES.UNAUTHORIZED));
                    return;
                }
                // Get full user details
                const user = await this.authService.validateToken(this.extractToken(req.headers.authorization));
                if (!user.isVerified) {
                    res
                        .status(types_1.HTTP_STATUS.FORBIDDEN)
                        .json((0, types_1.createErrorResponse)("Account verification required", types_1.ERROR_CODES.FORBIDDEN));
                    return;
                }
                if (!user.isActive) {
                    res
                        .status(types_1.HTTP_STATUS.FORBIDDEN)
                        .json((0, types_1.createErrorResponse)("Account has been deactivated", types_1.ERROR_CODES.FORBIDDEN));
                    return;
                }
                next();
            }
            catch (error) {
                res
                    .status(types_1.HTTP_STATUS.UNAUTHORIZED)
                    .json((0, types_1.createErrorResponse)("Invalid or expired token", types_1.ERROR_CODES.TOKEN_INVALID));
            }
        };
    }
    /**
     * Check if user has specific permission
     */
    hasPermission(permission) {
        return (req, res, next) => {
            try {
                if (!req.user) {
                    res
                        .status(types_1.HTTP_STATUS.UNAUTHORIZED)
                        .json((0, types_1.createErrorResponse)("Authentication required", types_1.ERROR_CODES.UNAUTHORIZED));
                    return;
                }
                // Permission checking logic would go here
                // For now, we'll use role-based permissions
                const rolePermissions = {
                    CUSTOMER: ["read:own", "update:own", "delete:own"],
                    ADMIN: ["read:any", "update:any", "delete:any", "create:any"],
                    SUPER_ADMIN: ["*"],
                };
                const userPermissions = rolePermissions[req.user.role] || [];
                if (userPermissions.includes("*") ||
                    userPermissions.includes(permission)) {
                    next();
                    return;
                }
                res
                    .status(types_1.HTTP_STATUS.FORBIDDEN)
                    .json((0, types_1.createErrorResponse)(`Permission denied - ${permission} required`, types_1.ERROR_CODES.FORBIDDEN));
            }
            catch (error) {
                res
                    .status(types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR)
                    .json((0, types_1.createErrorResponse)("Authorization error", types_1.ERROR_CODES.INTERNAL_ERROR));
            }
        };
    }
    /**
     * Extract token from Authorization header
     */
    extractToken(authHeader) {
        const parts = authHeader.split(" ");
        if (parts.length !== 2 || parts[0] !== "Bearer") {
            return null;
        }
        return parts[1] || null;
    }
    /**
     * Get user ID from request parameters
     */
    static getUserIdFromParams(paramName = "userId") {
        return (req) => {
            return req.params[paramName] || "";
        };
    }
    /**
     * Get user ID from request body
     */
    static getUserIdFromBody(fieldName = "userId") {
        return (req) => {
            return req.body[fieldName] || "";
        };
    }
}
exports.AuthMiddleware = AuthMiddleware;
// Export singleton instance
exports.authMiddleware = new AuthMiddleware();
// Export individual middleware functions for convenience
exports.authenticate = exports.authMiddleware.authenticate();
exports.optionalAuthenticate = exports.authMiddleware.optionalAuthenticate();
exports.adminOnly = exports.authMiddleware.adminOnly();
exports.superAdminOnly = exports.authMiddleware.superAdminOnly();
exports.customerOnly = exports.authMiddleware.customerOnly();
exports.requireVerifiedUser = exports.authMiddleware.requireVerifiedUser();
// Export helper functions
const authorize = (roles) => exports.authMiddleware.authorize(roles);
exports.authorize = authorize;
const resourceOwner = (getUserId) => exports.authMiddleware.resourceOwner(getUserId);
exports.resourceOwner = resourceOwner;
const hasPermission = (permission) => exports.authMiddleware.hasPermission(permission);
exports.hasPermission = hasPermission;
const authenticatedRateLimit = (maxRequests, windowMs) => exports.authMiddleware.authenticatedRateLimit(maxRequests, windowMs);
exports.authenticatedRateLimit = authenticatedRateLimit;
//# sourceMappingURL=AuthMiddleware.js.map