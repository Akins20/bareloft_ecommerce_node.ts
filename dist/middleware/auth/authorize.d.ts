import { Request, Response, NextFunction } from "express";
import { UserRole } from "../../types/user.types";
/**
 * Creates authorization middleware for specific roles
 * @param allowedRoles Array of roles that can access the resource
 * @returns Express middleware function
 */
export declare const authorize: (allowedRoles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * 🛡️ Resource ownership authorization
 * Ensures users can only access their own resources
 */
export declare const authorizeOwnership: (resourceUserIdField?: string) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * 🎯 Conditional authorization based on conditions
 * More flexible authorization for complex scenarios
 */
export declare const authorizeIf: (condition: (req: Request) => boolean, allowedRoles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * 📱 Pre-configured authorization middlewares for common scenarios
 */
export declare const authPresets: {
    customer: (req: Request, res: Response, next: NextFunction) => void;
    admin: (req: Request, res: Response, next: NextFunction) => void;
    superAdmin: (req: Request, res: Response, next: NextFunction) => void;
    adminOrOwner: (resourceField?: string) => ((req: Request, res: Response, next: NextFunction) => void)[];
};
//# sourceMappingURL=authorize.d.ts.map