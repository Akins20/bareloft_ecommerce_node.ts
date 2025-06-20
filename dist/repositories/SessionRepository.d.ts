import { BaseRepository } from "./BaseRepository";
import { Session, DeviceInfo } from "@/types";
import { PrismaClient } from "@prisma/client";
export declare class SessionRepository extends BaseRepository<Session> {
    protected modelName: string;
    constructor(database?: PrismaClient);
    /**
     * Create new session
     */
    createSession(sessionData: {
        userId: string;
        sessionId: string;
        accessToken: string;
        refreshToken: string;
        expiresAt: Date;
        deviceInfo?: DeviceInfo;
    }): Promise<Session>;
    /**
     * Find session by session ID
     */
    findBySessionId(sessionId: string): Promise<Session | null>;
    /**
     * Find active session by session ID
     */
    findActiveSession(sessionId: string): Promise<Session | null>;
    /**
     * Find all active sessions for a user
     */
    findUserActiveSessions(userId: string): Promise<Session[]>;
    /**
     * Update session tokens
     */
    updateTokens(sessionId: string, accessToken: string, refreshToken: string): Promise<Session>;
    /**
     * Deactivate session (logout)
     */
    deactivateSession(sessionId: string): Promise<Session>;
    /**
     * Deactivate all sessions for a user
     */
    deactivateUserSessions(userId: string): Promise<number>;
    /**
     * Clean up expired sessions
     */
    cleanupExpiredSessions(): Promise<number>;
    /**
     * Get session statistics for user
     */
    getUserSessionStats(userId: string): Promise<{
        totalSessions: number;
        activeSessions: number;
        expiredSessions: number;
        deviceTypes: Record<string, number>;
        recentSessions: Session[];
    }>;
    /**
     * Find sessions by device type
     */
    findSessionsByDeviceType(deviceType: "mobile" | "desktop" | "tablet", limit?: number): Promise<Session[]>;
    /**
     * Get concurrent sessions count
     */
    getConcurrentSessionsCount(): Promise<number>;
    /**
     * Find sessions by IP address (for security monitoring)
     */
    findSessionsByIP(ipAddress: string): Promise<Session[]>;
    /**
     * Get session analytics for admin dashboard
     */
    getSessionAnalytics(dateFrom: Date, dateTo: Date): Promise<{
        totalSessions: number;
        activeSessions: number;
        averageSessionDuration: number;
        deviceTypeDistribution: Record<string, number>;
        browserDistribution: Record<string, number>;
        loginsByHour: {
            hour: number;
            count: number;
        }[];
        topCountries: {
            country: string;
            count: number;
        }[];
    }>;
    /**
     * Extend session expiration
     */
    extendSession(sessionId: string, additionalHours?: number): Promise<Session>;
    /**
     * Find suspicious sessions (for security monitoring)
     */
    findSuspiciousSessions(): Promise<{
        multipleIPs: Session[];
        multipleDevices: Session[];
        longRunning: Session[];
    }>;
}
//# sourceMappingURL=SessionRepository.d.ts.map