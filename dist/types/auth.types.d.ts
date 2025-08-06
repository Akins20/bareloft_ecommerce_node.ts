import { BaseEntity, NigerianPhoneNumber } from './common.types';
import { PublicUser } from './user.types';
import { Request } from 'express';
export { PublicUser };
export type UserRole = 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';
export type OTPPurpose = 'login' | 'signup' | 'password_reset' | 'phone_verification';
export interface OTPCode extends BaseEntity {
    phoneNumber: NigerianPhoneNumber;
    code: string;
    purpose: OTPPurpose;
    expiresAt: Date;
    isUsed: boolean;
    attempts: number;
    maxAttempts: number;
}
export interface OTPRequest {
    phoneNumber: NigerianPhoneNumber;
    purpose: OTPPurpose;
}
export interface RequestOTPRequest {
    phoneNumber: NigerianPhoneNumber;
    purpose: OTPPurpose;
}
export interface RequestOTPResponse {
    success: boolean;
    message: string;
    data: {
        phoneNumber: NigerianPhoneNumber;
        expiresIn: number;
        canRetryAt: Date;
    };
}
export interface OTPVerificationRequest {
    phoneNumber: NigerianPhoneNumber;
    code: string;
    purpose: OTPPurpose;
}
export interface VerifyOTPRequest {
    phoneNumber: NigerianPhoneNumber;
    code: string;
    purpose: OTPPurpose;
}
export interface SignupRequest {
    phoneNumber: NigerianPhoneNumber;
    firstName: string;
    lastName: string;
    email?: string;
    otpCode: string;
}
export interface LoginRequest {
    phoneNumber: NigerianPhoneNumber;
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
}
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export interface JWTPayload {
    userId: string;
    phoneNumber: NigerianPhoneNumber;
    role: UserRole;
    sessionId: string;
    iat: number;
    exp: number;
}
export interface ResetPasswordRequest {
    phoneNumber: NigerianPhoneNumber;
    otpCode: string;
    newPassword: string;
}
export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}
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
//# sourceMappingURL=auth.types.d.ts.map