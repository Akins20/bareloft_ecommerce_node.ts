"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authPresets = exports.authorizeIf = exports.authorizeOwnership = exports.authorize = void 0;
const winston_1 = require("../../utils/logger/winston");
/**
 * Creates authorization middleware for specific roles
 * @param allowedRoles Array of roles that can access the resource
 * @returns Express middleware function
 */
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        // Check if user is authenticated
        if (!req.user) {
            winston_1.logger.warn("Authorization attempted without authentication", {
                path: req.path,
                method: req.method,
                ip: req.ip,
            });
            return res.status(401).json({
                success: false,
                error: "AUTHENTICATION_REQUIRED",
                message: "Please log in to access this resource",
                code: "AUTHZ_001",
            });
        }
        // Check if user role is allowed
        if (!allowedRoles.includes(req.user.role)) {
            winston_1.logger.warn("Authorization failed - insufficient permissions", {
                userId: req.user.id,
                userRole: req.user.role,
                requiredRoles: allowedRoles,
                path: req.path,
                method: req.method,
                ip: req.ip,
            });
            return res.status(403).json({
                success: false,
                error: "INSUFFICIENT_PERMISSIONS",
                message: "You do not have permission to access this resource",
                code: "AUTHZ_002",
            });
        }
        winston_1.logger.debug("Authorization successful", {
            userId: req.user.id,
            userRole: req.user.role,
            allowedRoles,
            path: req.path,
        });
        next();
    };
};
exports.authorize = authorize;
/**
 * 🛡️ Resource ownership authorization
 * Ensures users can only access their own resources
 */
const authorizeOwnership = (resourceUserIdField = "userId") => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: "AUTHENTICATION_REQUIRED",
                message: "Please log in to access this resource",
                code: "AUTHZ_003",
            });
        }
        // Admins can access any resource
        if (["admin", "super_admin"].includes(req.user.role)) {
            return next();
        }
        // Get resource user ID from request params, body, or query
        const resourceUserId = req.params[resourceUserIdField] ||
            req.body[resourceUserIdField] ||
            req.query[resourceUserIdField];
        if (!resourceUserId) {
            winston_1.logger.warn("Resource ownership check failed - no user ID found", {
                userId: req.user.id,
                path: req.path,
                method: req.method,
                expectedField: resourceUserIdField,
            });
            return res.status(400).json({
                success: false,
                error: "INVALID_REQUEST",
                message: "Resource identification missing",
                code: "AUTHZ_004",
            });
        }
        // Check if user owns the resource
        if (resourceUserId !== req.user.id) {
            winston_1.logger.warn("Resource ownership violation", {
                userId: req.user.id,
                resourceUserId,
                path: req.path,
                method: req.method,
                ip: req.ip,
            });
            return res.status(403).json({
                success: false,
                error: "RESOURCE_ACCESS_DENIED",
                message: "You can only access your own resources",
                code: "AUTHZ_005",
            });
        }
        next();
    };
};
exports.authorizeOwnership = authorizeOwnership;
/**
 * 🎯 Conditional authorization based on conditions
 * More flexible authorization for complex scenarios
 */
const authorizeIf = (condition, allowedRoles) => {
    return (req, res, next) => {
        // If condition is not met, skip authorization
        if (!condition(req)) {
            return next();
        }
        // Apply role-based authorization
        (0, exports.authorize)(allowedRoles)(req, res, next);
    };
};
exports.authorizeIf = authorizeIf;
/**
 * 📱 Pre-configured authorization middlewares for common scenarios
 */
exports.authPresets = {
    // Customer-only access
    customer: (0, exports.authorize)(["customer"]),
    // Admin-only access
    admin: (0, exports.authorize)(["admin", "super_admin"]),
    // Super admin only
    superAdmin: (0, exports.authorize)(["super_admin"]),
    // Admin or resource owner
    adminOrOwner: (resourceField = "userId") => [
        authenticate,
        (req, res, next) => {
            if (["admin", "super_admin"].includes(req.user?.role || "")) {
                return next();
            }
            (0, exports.authorizeOwnership)(resourceField)(req, res, next);
        },
    ],
};
//# sourceMappingURL=authorize.js.map