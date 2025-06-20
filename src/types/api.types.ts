import { Request, Response, NextFunction } from 'express';
import { ResponseData, PaginationMeta } from './common.types';
import { JWTPayload } from './auth.types';
import { FileUpload } from './common.types';

// HTTP Methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// API Response wrapper
export interface ApiResponse<T = any> extends ResponseData<T> {}

// Error types
export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: string | string[];
  isOperational: boolean;
}

// Request validation error
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// API endpoint metadata
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

// Extended Express Request types
export interface AuthenticatedRequest extends Request {
  user: JWTPayload;
}

export interface RequestWithFile extends Request {
  file?: FileUpload;
  files?: FileUpload[];
}

export interface AuthenticatedRequestWithFile extends AuthenticatedRequest {
  file?: FileUpload;
  files?: FileUpload[];
}

// Custom error class
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string, 
    statusCode: number, 
    code: string, 
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Middleware types
export type Middleware = (
  req: Request, 
  res: Response, 
  next: NextFunction
) => void | Promise<void>;

export type RouteHandler = (
  req: Request, 
  res: Response, 
  next: NextFunction
) => Promise<void>;

export type AuthRouteHandler = (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => Promise<void>;

// Standard API response format
export const createSuccessResponse = <T>(
  data: T,
  message: string = 'Success',
  meta?: { pagination?: PaginationMeta; timestamp?: string }
): ApiResponse<T> => ({
  success: true,
  message,
  data,
  meta: {
    timestamp: new Date().toISOString(),
    ...meta
  }
});

export const createErrorResponse = (
  message: string,
  code: string,
  details?: string | string[]
): ApiResponse => ({
  success: false,
  message,
  error: {
    code,
    details
  },
  meta: {
    timestamp: new Date().toISOString()
  }
});

// Common HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

// Common error codes
export const ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  
  // Business logic errors
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  ORDER_CANNOT_BE_CANCELLED: 'ORDER_CANNOT_BE_CANCELLED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  INVALID_COUPON: 'INVALID_COUPON',
  
  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
} as const;