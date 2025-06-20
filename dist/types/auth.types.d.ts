import { BaseEntity, NigerianPhoneNumber } from './common.types';
import { PublicUser } from './user.types';
export type UserRole = 'customer' | 'admin' | 'super_admin';
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
export interface Session extends BaseEntity {
    userId: string;
    sessionId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    deviceInfo?: {
        userAgent?: string;
        ipAddress?: string;
        deviceType?: 'mobile' | 'desktop' | 'tablet';
    };
    isActive: boolean;
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
    data: {
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
    accessToken: string;
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