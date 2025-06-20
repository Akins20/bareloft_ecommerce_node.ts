/**
 * ❌ Global Error Handling Middleware
 * Comprehensive error handling with Nigerian market considerations
 */
import { Request, Response, NextFunction } from "express";
export declare class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    errorCode: string;
    details?: any;
    constructor(message: string, statusCode?: number, errorCode?: string, details?: any);
}
export declare class ValidationError extends AppError {
    constructor(message: string, details?: any);
}
export declare class AuthenticationError extends AppError {
    constructor(message?: string);
}
export declare class AuthorizationError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    constructor(resource?: string);
}
export declare class ConflictError extends AppError {
    constructor(message: string);
}
export declare class PaymentError extends AppError {
    constructor(message: string, details?: any);
}
export declare class InventoryError extends AppError {
    constructor(message: string, details?: any);
}
/**
 * 🛠️ Main error handling middleware
 */
export declare const errorHandler: (error: any, req: Request, res: Response, next: NextFunction) => void;
/**
 * 🚫 404 Not Found middleware
 * Provides helpful responses for missing endpoints
 */
export declare const notFoundHandler: (req: Request, res: Response, next: NextFunction) => void;
type AsyncFunction = (req: Request, res: Response, next: NextFunction) => Promise<any>;
/**
 * 🔧 Async handler wrapper
 * Automatically catches async errors and forwards them to error middleware
 */
export declare const asyncHandler: (fn: AsyncFunction) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * 🎯 Controller wrapper for consistent error handling
 * Provides additional context and logging for controller errors
 */
export declare const controllerWrapper: (controllerName: string, actionName: string) => (fn: AsyncFunction) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * 🛡️ Service wrapper for external service calls
 * Handles timeout and retry logic for external services
 */
export declare const serviceWrapper: (serviceName: string, timeout?: number) => (fn: AsyncFunction) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * 📊 Performance monitoring wrapper
 * Tracks execution time and resource usage
 */
export declare const performanceWrapper: (threshold?: number) => (fn: AsyncFunction) => (req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=errorHandler.d.ts.map