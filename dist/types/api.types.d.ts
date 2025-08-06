import { Request, Response, NextFunction } from 'express';
import { ResponseData, PaginationMeta, PaginationParams, PaginatedResponse } from './common.types';
import { AuthenticatedRequest } from './auth.types';
export { PaginationParams, PaginatedResponse };
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export interface ApiResponse<T = any> extends ResponseData<T> {
}
export interface ApiError {
    code: string;
    message: string;
    statusCode: number;
    details?: string | string[];
    isOperational: boolean;
}
export interface ValidationError {
    field: string;
    message: string;
    value?: any;
}
export interface EndpointMeta {
    method: HttpMethod;
    path: string;
    version: string;
    authRequired: boolean;
    roles?: string[];
    rateLimit?: {
        windowMs: number;
        maxRequests: number;
    };
}
export interface RequestWithFile extends Request {
    file?: any;
    files?: any[];
}
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly isOperational: boolean;
    constructor(message: string, statusCode: number, code: string, isOperational?: boolean);
}
export type Middleware = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
export type RouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
export type AuthRouteHandler = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const createSuccessResponse: <T>(data: T, message?: string, meta?: {
    pagination?: PaginationMeta;
    timestamp?: string;
}) => ApiResponse<T>;
export declare const createErrorResponse: (message: string, code: string, details?: string | string[]) => ApiResponse;
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
    readonly SERVICE_UNAVAILABLE: 503;
};
export declare const ERROR_CODES: {
    readonly INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
    readonly TOKEN_INVALID: "TOKEN_INVALID";
    readonly INVALID_TOKEN: "INVALID_TOKEN";
    readonly SESSION_ERROR: "SESSION_ERROR";
    readonly SESSION_EXPIRED: "SESSION_EXPIRED";
    readonly NOT_AUTHENTICATED: "NOT_AUTHENTICATED";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly INVALID_INPUT: "INVALID_INPUT";
    readonly MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD";
    readonly RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND";
    readonly RESOURCE_ALREADY_EXISTS: "RESOURCE_ALREADY_EXISTS";
    readonly RESOURCE_CONFLICT: "RESOURCE_CONFLICT";
    readonly INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK";
    readonly ORDER_CANNOT_BE_CANCELLED: "ORDER_CANNOT_BE_CANCELLED";
    readonly INVALID_ORDER_STATUS: "INVALID_ORDER_STATUS";
    readonly PAYMENT_FAILED: "PAYMENT_FAILED";
    readonly INVALID_COUPON: "INVALID_COUPON";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly DATABASE_ERROR: "DATABASE_ERROR";
    readonly EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR";
    readonly RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED";
};
//# sourceMappingURL=api.types.d.ts.map