// src/types/index.ts - Main Type Definitions Export
// This file serves as the central hub for all type definitions

// Re-export all type definitions for clean imports
export * from './common.types';
export * from './user.types';
export * from './product.types';
export * from './session.types';

// Selective exports to avoid conflicts
export { 
  ApiResponse,
  PaginatedResponse,
  ValidationError,
  AppError,
  HTTP_STATUS,
  ERROR_CODES
} from './api.types';

export {
  LoginRequest,
  SignupRequest,
  RefreshTokenRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  OTPRequest,
  OTPVerificationRequest,
  AuthResponse,
  TokenPair,
  JWTPayload,
  PublicUser,
  AuthenticatedRequest
} from './auth.types';
// export * from './order.types';
// export * from './cart.types';
// export * from './payment.types';
// export * from './inventory.types';
// export * from './notification.types';