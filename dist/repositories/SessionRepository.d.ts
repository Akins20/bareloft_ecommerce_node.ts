import { PrismaClient } from "@prisma/client";
import { BaseRepository } from "./BaseRepository";
import { Session, DeviceInfo } from "../types";
interface CreateSessionData {
    userId: string;
    sessionId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    deviceInfo?: DeviceInfo;
    ipAddress?: string;
    userAgent?: string;
    isActive: boolean;
    lastUsedAt?: Date;
}
interface UpdateSessionData {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
    isActive?: boolean;
    lastUsedAt?: Date;
    deviceInfo?: DeviceInfo;
    ipAddress?: string;
    userAgent?: string;
}
export declare class SessionRepository extends BaseRepository<Session, CreateSessionData, UpdateSessionData> {
    constructor(prisma?: PrismaClient);
    /**
     * Create new session
     */
    create(data: CreateSessionData): Promise<Session>;
    /**
     * Find session by session ID
     */
    findBySessionId(sessionId: string): Promise<Session | null>;
    /**
     * Find session by access token
     */
    findByAccessToken(accessToken: string): Promise<Session | null>;
    /**
     * Find session by refresh token
     */
    findByRefreshToken(refreshToken: string): Promise<Session | null>;
    /**
     * Get all active sessions for a user
     */
    findActiveSessionsByUserId(userId: string): Promise<Session[]>;
    /**
     * Update session tokens
     */
    updateTokens(sessionId: string, accessToken: string, refreshToken: string): Promise<Session>;
    /**
     * Update session last used time
     */
    updateLastUsed(sessionId: string): Promise<Session>;
    /**
     * Deactivate session (logout)
     */
    deactivateSession(sessionId: string): Promise<boolean>;
    /**
     * Deactivate all user sessions (logout from all devices)
     */
    deactivateAllUserSessions(userId: string): Promise<number>;
    /**
     * Deactivate session by access token
     */
    deactivateByAccessToken(accessToken: string): Promise<boolean>;
    /**
     * Clean up expired sessions (maintenance task)
     */
    cleanupExpiredSessions(): Promise<{
        deletedCount: number;
    }>;
    /**
     * Limit user sessions (keep only N most recent)
     */
    limitUserSessions(userId: string, maxSessions?: number): Promise<number>;
    /**
     * Get session analytics for user
     */
    getUserSessionStats(userId: string): Promise<{
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
     * Get admin session analytics
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
     * Check for suspicious session activity
     */
    detectSuspiciousActivity(userId: string): Promise<{
        hasAlerts: boolean;
        alerts: {
            type: string;
            message: string;
            severity: "low" | "medium" | "high";
            data?: any;
        }[];
    }>;
    /**
     * Refresh session expiry
     */
    refreshSession(sessionId: string, newExpiryDate: Date): Promise<Session>;
}
export {};
//# sourceMappingURL=SessionRepository.d.ts.map