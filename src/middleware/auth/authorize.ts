import { Request, Response, NextFunction } from "express";
import { UserRole } from "../../types/user.types";
import { logger } from "../../utils/logger/winston";
import { authenticate } from "./authenticate";

/**
 * Creates authorization middleware for specific roles
 * @param allowedRoles Array of roles that can access the resource
 * @returns Express middleware function
 */
export const authorize = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if user is authenticated
    if (!req.user) {
      logger.warn("Authorization attempted without authentication", {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      res.status(401).json({
        success: false,
        error: "AUTHENTICATION_REQUIRED",
        message: "Please log in to access this resource",
        code: "AUTHZ_001",
      });
      return;
    }

    // Check if user role is allowed
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn("Authorization failed - insufficient permissions", {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      res.status(403).json({
        success: false,
        error: "INSUFFICIENT_PERMISSIONS",
        message: "You do not have permission to access this resource",
        code: "AUTHZ_002",
      });
      return;
    }

    logger.debug("Authorization successful", {
      userId: req.user.id,
      userRole: req.user.role,
      allowedRoles,
      path: req.path,
    });

    next();
  };
};

/**
 * 🛡️ Resource ownership authorization
 * Ensures users can only access their own resources
 */
export const authorizeOwnership = (resourceUserIdField: string = "userId") => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "AUTHENTICATION_REQUIRED",
        message: "Please log in to access this resource",
        code: "AUTHZ_003",
      });
      return;
    }

    // Admins can access any resource
    if (["ADMIN", "SUPER_ADMIN"].includes(req.user.role)) {
      next();
      return;
    }

    // Get resource user ID from request params, body, or query
    const resourceUserId =
      req.params[resourceUserIdField] ||
      req.body[resourceUserIdField] ||
      req.query[resourceUserIdField];

    if (!resourceUserId) {
      logger.warn("Resource ownership check failed - no user ID found", {
        userId: req.user.id,
        path: req.path,
        method: req.method,
        expectedField: resourceUserIdField,
      });

      res.status(400).json({
        success: false,
        error: "INVALID_REQUEST",
        message: "Resource identification missing",
        code: "AUTHZ_004",
      });
      return;
    }

    // Check if user owns the resource
    if (resourceUserId !== req.user.id) {
      logger.warn("Resource ownership violation", {
        userId: req.user.id,
        resourceUserId,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      res.status(403).json({
        success: false,
        error: "RESOURCE_ACCESS_DENIED",
        message: "You can only access your own resources",
        code: "AUTHZ_005",
      });
      return;
    }

    next();
  };
};

/**
 * 🎯 Conditional authorization based on conditions
 * More flexible authorization for complex scenarios
 */
export const authorizeIf = (
  condition: (req: Request) => boolean,
  allowedRoles: UserRole[]
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // If condition is not met, skip authorization
    if (!condition(req)) {
      next();
      return;
    }

    // Apply role-based authorization
    authorize(allowedRoles)(req, res, next);
  };
};

/**
 * 📱 Pre-configured authorization middlewares for common scenarios
 */
export const authPresets = {
  // Customer-only access
  customer: authorize(["CUSTOMER"]),

  // Admin-only access
  admin: authorize(["ADMIN", "SUPER_ADMIN"]),

  // Super admin only
  superAdmin: authorize(["SUPER_ADMIN"]),

  // Admin or resource owner
  adminOrOwner: (resourceField: string = "userId") => [
    authenticate,
    (req: Request, res: Response, next: NextFunction) => {
      if (["ADMIN", "SUPER_ADMIN"].includes(req.user?.role || "")) {
        next();
        return;
      }
      authorizeOwnership(resourceField)(req, res, next);
    },
  ],
};
