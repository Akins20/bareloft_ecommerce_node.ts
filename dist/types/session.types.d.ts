import { BaseEntity, NigerianPhoneNumber } from './common.types';
import { PublicUser } from './user.types';
import { DeviceInfo } from './auth.types';
export interface Session extends BaseEntity {
    userId: string;
    sessionId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    deviceInfo?: DeviceInfo;
    ipAddress?: string;
    userAgent?: string;
    isActive: boolean;
    lastUsedAt: Date;
    user?: PublicUser;
}
export interface SessionInfo extends Session {
    isExpired: boolean;
    timeUntilExpiry: number;
    isCurrent?: boolean;
}
export interface CreateSessionData {
    userId: string;
    sessionId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    deviceInfo?: DeviceInfo;
    ipAddress?: string;
    userAgent?: string;
    isActive: boolean;
}
export interface UpdateSessionData {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
    isActive?: boolean;
    lastUsedAt?: Date;
    deviceInfo?: DeviceInfo;
    ipAddress?: string;
    userAgent?: string;
}
export interface SessionTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    sessionId: string;
}
export interface CreateSessionOptions {
    userId: string;
    deviceInfo?: DeviceInfo;
    ipAddress?: string;
    userAgent?: string;
}
export interface SessionValidationResult {
    isValid: boolean;
    session?: SessionInfo;
    user?: PublicUser;
    error?: string;
}
export interface UserSessionStats {
    totalSessions: number;
    activeSessions: number;
    recentLogins: Date[];
    deviceTypes: {
        type: string;
        count: number;
    }[];
    ipAddresses: {
        ip: string;
        count: number;
        lastUsed: Date;
    }[];
}
export interface SessionAnalytics {
    totalSessions: number;
    activeSessions: number;
    averageSessionDuration: number;
    sessionsByDevice: {
        device: string;
        count: number;
    }[];
    sessionsByDay: {
        date: string;
        sessions: number;
    }[];
    topIpAddresses: {
        ip: string;
        sessions: number;
    }[];
}
export type SecurityAlertType = 'multiple_ips' | 'rapid_sessions' | 'multiple_devices' | 'suspicious_location';
export type SecuritySeverity = 'low' | 'medium' | 'high';
export interface SecurityAlert {
    type: SecurityAlertType;
    message: string;
    severity: SecuritySeverity;
    data?: Record<string, any>;
    detectedAt: Date;
}
export interface SuspiciousActivityResult {
    hasAlerts: boolean;
    alerts: SecurityAlert[];
    riskScore: number;
    recommendations: string[];
}
export interface SessionLimitCheck {
    hasReachedLimit: boolean;
    activeSessionCount: number;
    maxSessions: number;
    oldestSessions?: SessionInfo[];
}
export interface SessionCleanupResult {
    deletedCount: number;
    deletedExpired: number;
    deletedInactive: number;
    processedAt: Date;
}
export interface LogoutRequest {
    sessionId?: string;
}
export interface LogoutResponse {
    success: boolean;
    message: string;
    data: {
        sessionId: string;
        loggedOutAt: Date;
    };
}
export interface LogoutAllSessionsResponse {
    success: boolean;
    message: string;
    data: {
        deactivatedSessions: number;
        userId: string;
        loggedOutAt: Date;
    };
}
export interface ActiveSessionsResponse {
    success: boolean;
    message: string;
    data: {
        sessions: SessionInfo[];
        totalSessions: number;
        currentSessionId: string;
    };
}
export interface SessionAnalyticsResponse {
    success: boolean;
    message: string;
    data: UserSessionStats & {
        security: SuspiciousActivityResult;
    };
}
export interface ExtendSessionRequest {
    sessionId?: string;
    additionalMinutes?: number;
}
export interface ExtendSessionResponse {
    success: boolean;
    message: string;
    data: {
        sessionId: string;
        expiresAt: Date;
        extendedBy: number;
        newExpiryMinutes: number;
    };
}
export interface SessionStatusResponse {
    success: boolean;
    message: string;
    data: {
        sessionId: string;
        userId: string;
        sessionLimit: SessionLimitCheck;
        currentTime: Date;
        timeUntilExpiry: number;
        isExpired: boolean;
    };
}
export interface SessionValidationResponse {
    success: boolean;
    message: string;
    data: {
        sessionId: string;
        userId: string;
        isExpired: boolean;
        timeUntilExpiry: number;
        lastUsedAt: Date;
        deviceInfo?: DeviceInfo;
    };
}
export interface SessionAnalyticsQuery {
    dateFrom?: string;
    dateTo?: string;
    userId?: string;
    deviceType?: string;
    includeInactive?: boolean;
}
export interface AdminSessionAnalyticsResponse {
    success: boolean;
    message: string;
    data: SessionAnalytics & {
        dateRange: {
            from: Date;
            to: Date;
        };
        filters?: Record<string, any>;
    };
}
export interface SessionCleanupResponse {
    success: boolean;
    message: string;
    data: SessionCleanupResult;
}
export type SessionEventType = 'session_created' | 'session_refreshed' | 'session_extended' | 'session_expired' | 'session_terminated' | 'suspicious_activity_detected' | 'session_limit_exceeded';
export interface SessionEvent {
    type: SessionEventType;
    sessionId: string;
    userId: string;
    timestamp: Date;
    metadata: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}
export interface SessionConfig {
    accessTokenExpiry: number;
    refreshTokenExpiry: number;
    maxSessionsPerUser: number;
    cleanupInterval: number;
    suspiciousActivityThresholds: {
        maxIPsPerDay: number;
        maxSessionsPerHour: number;
        maxDeviceTypes: number;
    };
    securitySettings: {
        requireFreshLoginForSensitive: boolean;
        autoExtendOnActivity: boolean;
        logoutOnSuspiciousActivity: boolean;
    };
}
export interface SessionAuthenticatedRequest extends Request {
    user?: {
        id: string;
        sessionId: string;
        phoneNumber: NigerianPhoneNumber;
        role: string;
        [key: string]: any;
    };
    session?: SessionInfo;
}
export interface SessionRepository {
    create(data: CreateSessionData): Promise<Session>;
    findBySessionId(sessionId: string): Promise<Session | null>;
    findByAccessToken(accessToken: string): Promise<Session | null>;
    findByRefreshToken(refreshToken: string): Promise<Session | null>;
    findActiveSessionsByUserId(userId: string): Promise<Session[]>;
    updateTokens(sessionId: string, accessToken: string, refreshToken: string): Promise<Session>;
    updateLastUsed(sessionId: string): Promise<Session>;
    deactivateSession(sessionId: string): Promise<boolean>;
    deactivateAllUserSessions(userId: string): Promise<number>;
    cleanupExpiredSessions(): Promise<SessionCleanupResult>;
    limitUserSessions(userId: string, maxSessions: number): Promise<number>;
    getUserSessionStats(userId: string): Promise<UserSessionStats>;
    getSessionAnalytics(dateFrom: Date, dateTo: Date): Promise<SessionAnalytics>;
    detectSuspiciousActivity(userId: string): Promise<SuspiciousActivityResult>;
}
//# sourceMappingURL=session.types.d.ts.map