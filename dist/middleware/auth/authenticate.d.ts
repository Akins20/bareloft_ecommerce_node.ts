/**
 * 🔐 Authentication Middleware
 * Validates JWT tokens and sets user context
 * Nigerian market optimized with mobile-friendly error messages
 */
import { Request, Response, NextFunction } from "express";
import { UserRole } from "../../types/user.types";
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                phoneNumber: string;
                email?: string;
                firstName: string;
                lastName: string;
                role: UserRole;
                isVerified: boolean;
                sessionId?: string;
            };
        }
    }
}
/**
 * 🔐 Main Authentication Middleware
 * Validates access tokens and sets user context
 */
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * 🔓 Optional Authentication Middleware
 * Sets user context if token is provided, but doesn't require it
 */
export declare const optionalAuthenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=authenticate.d.ts.map