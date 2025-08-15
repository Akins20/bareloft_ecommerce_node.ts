import { BaseEntity, NigerianPhoneNumber } from './common.types';
import { PublicUser } from './user.types';
import { Request } from 'express';

// Re-export PublicUser for convenience
export { PublicUser };

// User roles
export type UserRole = 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';

// OTP purposes
export type OTPPurpose = 'LOGIN' | 'SIGNUP' | 'PASSWORD_RESET' | 'PHONE_VERIFICATION';

// Authentication interfaces
export interface OTPCode extends BaseEntity {
  phoneNumber?: NigerianPhoneNumber;
  email?: string;
  code: string; // 6-digit code
  purpose: OTPPurpose;
  expiresAt: Date;
  isUsed: boolean;
  attempts: number;
  maxAttempts: number;
}

// export interface Session extends BaseEntity {
//   ipAddress: any;
//   lastUsedAt: boolean;
//   userId: string;
//   sessionId: string;
//   accessToken: string;
//   refreshToken: string;
//   expiresAt: Date;
//   deviceInfo?: {
//     userAgent?: string;
//     ipAddress?: string;
//     deviceType?: 'mobile' | 'desktop' | 'tablet';
//   };
//   isActive: boolean;
// }

// Authentication request/response types
export interface OTPRequest {
  phoneNumber?: NigerianPhoneNumber;
  email?: string;
  purpose: OTPPurpose;
}

export interface RequestOTPRequest {
  phoneNumber?: NigerianPhoneNumber;
  email?: string;
  purpose: OTPPurpose | string; // Allow both uppercase and lowercase for API flexibility
}

export interface RequestOTPResponse {
  success: boolean;
  message: string;
  data: {
    phoneNumber?: NigerianPhoneNumber;
    email?: string;
    expiresIn: number; // seconds
    canRetryAt: Date;
  };
}

export interface OTPVerificationRequest {
  phoneNumber?: NigerianPhoneNumber;
  email?: string;
  code: string;
  purpose: OTPPurpose;
}

export interface VerifyOTPRequest {
  phoneNumber?: NigerianPhoneNumber;
  email?: string;
  code: string;
  purpose: OTPPurpose;
}

export interface SignupRequest {
  phoneNumber?: NigerianPhoneNumber;
  email?: string;
  firstName: string;
  lastName: string;
  otpCode: string;
}

export interface LoginRequest {
  phoneNumber?: NigerianPhoneNumber;
  email?: string;
  otpCode: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  data?: {
    user: PublicUser;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  accessToken: string;
  expiresIn: number;
  userId: string;
}

export interface OTPResponse {
  success: boolean;
  message: string;
  data?: any;
  expiresIn?: number;
  canResendIn?: number;
}

export interface LogoutRequest {
  refreshToken?: string;
  logoutAllDevices?: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: PublicUser;
  userId?: string;
  sessionId?: string;
  token?: string; // For sliding session middleware
}

// Token pair interface
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// JWT payload interface
export interface JWTPayload {
  userId: string;
  phoneNumber?: NigerianPhoneNumber;
  email?: string;
  role: UserRole;
  sessionId: string;
  iat: number;
  exp: number;
}

// Password reset types (for future implementation)
export interface ResetPasswordRequest {
  phoneNumber?: NigerianPhoneNumber;
  email?: string;
  otpCode: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Device info interface
export interface DeviceInfo {
  userAgent?: string;
  ipAddress?: string;
  deviceType?: 'mobile' | 'desktop' | 'tablet';
  browser?: string;
  os?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
}