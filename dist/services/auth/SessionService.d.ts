import { BaseService } from "../BaseService";
import { SessionRepository } from "../../repositories/SessionRepository";
import { JWTService } from "./JWTService";
import { Session, DeviceInfo } from "../../types";
interface CreateSessionOptions {
    userId: string;
    deviceInfo?: DeviceInfo;
    ipAddress?: string;
    userAgent?: string;
}
interface SessionTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    sessionId: string;
}
interface SessionInfo extends Session {
    isExpired: boolean;
    timeUntilExpiry: number;
}
export declare class SessionService extends BaseService {
    private sessionRepository;
    private jwtService;
    private readonly ACCESS_TOKEN_EXPIRY;
    private readonly REFRESH_TOKEN_EXPIRY;
    private readonly MAX_SESSIONS_PER_USER;
    constructor(sessionRepository?: SessionRepository, jwtService?: JWTService);
    /**
     * Create new session for user
     */
    createSession(options: CreateSessionOptions): Promise<SessionTokens>;
    /**
     * Validate and get session by access token
     */
    validateAccessToken(accessToken: string): Promise<SessionInfo | null>;
    /**
     * Refresh session tokens
     */
    refreshSession(refreshToken: string): Promise<SessionTokens | null>;
    /**
     * Logout from specific session
     */
    logout(sessionId: string): Promise<boolean>;
    /**
     * Logout from all sessions (all devices)
     */
    logoutAllSessions(userId: string): Promise<number>;
    /**
     * Get user's active sessions
     */
    getUserActiveSessions(userId: string): Promise<SessionInfo[]>;
    /**
     * Get session analytics for user
     */
    getUserSessionAnalytics(userId: string): Promise<{
        security: {
            hasAlerts: boolean;
            alerts: {
                type: string;
                message: string;
                severity: "low" | "medium" | "high";
                data?: any;
            }[];
        };
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
    }>;
    /**
     * Admin: Get session analytics
     */
    getSessionAnalytics(dateFrom: Date, dateTo: Date): Promise<{
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
    }>;
    /**
     * Clean up expired sessions (maintenance task)
     */
    cleanupExpiredSessions(): Promise<{
        deletedCount: number;
    }>;
    /**
     * Validate session and get user info
     */
    validateSessionAndGetUser(accessToken: string): Promise<{
        session: SessionInfo;
        user: import("../../types").PublicUser;
    }>;
    /**
     * Extend session expiry
     */
    extendSession(sessionId: string, additionalMinutes?: number): Promise<Session>;
    /**
     * Check if user has reached session limit
     */
    checkSessionLimit(userId: string): Promise<{
        hasReachedLimit: boolean;
        activeSessionCount: number;
        maxSessions: number;
    }>;
    /**
     * Generate unique session ID
     */
    private generateSessionId;
    /**
     * Handle service errors
     */
    protected handleError(message: string, error: any): void;
    /**
     * Invalidate all user sessions
     */
    invalidateAllUserSessions(userId: string): Promise<number>;
    /**
     * Invalidate specific session
     */
    invalidateSession(sessionId: string): Promise<boolean>;
    /**
     * Invalidate session by access token
     */
    invalidateSessionByAccessToken(accessToken: string): Promise<boolean>;
}
export {};
//# sourceMappingURL=SessionService.d.ts.map