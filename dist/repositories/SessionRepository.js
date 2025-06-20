"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
class SessionRepository extends BaseRepository_1.BaseRepository {
    modelName = "session";
    constructor(database) {
        super(database);
    }
    /**
     * Create new session
     */
    async createSession(sessionData) {
        try {
            return await this.model.create({
                data: {
                    userId: sessionData.userId,
                    sessionId: sessionData.sessionId,
                    accessToken: sessionData.accessToken,
                    refreshToken: sessionData.refreshToken,
                    expiresAt: sessionData.expiresAt,
                    deviceInfo: sessionData.deviceInfo,
                    isActive: true,
                },
            });
        }
        catch (error) {
            console.error("Error creating session:", error);
            throw error;
        }
    }
    /**
     * Find session by session ID
     */
    async findBySessionId(sessionId) {
        try {
            return await this.model.findUnique({
                where: { sessionId },
            });
        }
        catch (error) {
            console.error(`Error finding session by ID ${sessionId}:`, error);
            throw error;
        }
    }
    /**
     * Find active session by session ID
     */
    async findActiveSession(sessionId) {
        try {
            return await this.model.findFirst({
                where: {
                    sessionId,
                    isActive: true,
                    expiresAt: {
                        gt: new Date(),
                    },
                },
            });
        }
        catch (error) {
            console.error(`Error finding active session ${sessionId}:`, error);
            throw error;
        }
    }
    /**
     * Find all active sessions for a user
     */
    async findUserActiveSessions(userId) {
        try {
            return await this.model.findMany({
                where: {
                    userId,
                    isActive: true,
                    expiresAt: {
                        gt: new Date(),
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            });
        }
        catch (error) {
            console.error(`Error finding active sessions for user ${userId}:`, error);
            throw error;
        }
    }
    /**
     * Update session tokens
     */
    async updateTokens(sessionId, accessToken, refreshToken) {
        try {
            return await this.model.update({
                where: { id: sessionId },
                data: {
                    accessToken,
                    refreshToken,
                    updatedAt: new Date(),
                },
            });
        }
        catch (error) {
            console.error(`Error updating session tokens ${sessionId}:`, error);
            throw error;
        }
    }
    /**
     * Deactivate session (logout)
     */
    async deactivateSession(sessionId) {
        try {
            return await this.model.update({
                where: { sessionId },
                data: {
                    isActive: false,
                    updatedAt: new Date(),
                },
            });
        }
        catch (error) {
            console.error(`Error deactivating session ${sessionId}:`, error);
            throw error;
        }
    }
    /**
     * Deactivate all sessions for a user
     */
    async deactivateUserSessions(userId) {
        try {
            const result = await this.model.updateMany({
                where: {
                    userId,
                    isActive: true,
                },
                data: {
                    isActive: false,
                    updatedAt: new Date(),
                },
            });
            return result.count;
        }
        catch (error) {
            console.error(`Error deactivating sessions for user ${userId}:`, error);
            throw error;
        }
    }
    /**
     * Clean up expired sessions
     */
    async cleanupExpiredSessions() {
        try {
            const result = await this.model.deleteMany({
                where: {
                    OR: [
                        {
                            expiresAt: {
                                lt: new Date(),
                            },
                        },
                        {
                            isActive: false,
                            updatedAt: {
                                lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days old
                            },
                        },
                    ],
                },
            });
            console.log(`🧹 Cleaned up ${result.count} expired sessions`);
            return result.count;
        }
        catch (error) {
            console.error("Error cleaning up expired sessions:", error);
            throw error;
        }
    }
    /**
     * Get session statistics for user
     */
    async getUserSessionStats(userId) {
        try {
            const [totalSessions, activeSessions, expiredSessions, allSessions] = await Promise.all([
                this.model.count({ where: { userId } }),
                this.model.count({
                    where: {
                        userId,
                        isActive: true,
                        expiresAt: { gt: new Date() },
                    },
                }),
                this.model.count({
                    where: {
                        userId,
                        OR: [{ isActive: false }, { expiresAt: { lt: new Date() } }],
                    },
                }),
                this.model.findMany({
                    where: { userId },
                    orderBy: { createdAt: "desc" },
                    take: 10,
                }),
            ]);
            // Analyze device types
            const deviceTypes = {};
            allSessions.forEach((session) => {
                if (session.deviceInfo) {
                    const deviceInfo = session.deviceInfo;
                    const deviceType = deviceInfo.deviceType || "unknown";
                    deviceTypes[deviceType] = (deviceTypes[deviceType] || 0) + 1;
                }
            });
            return {
                totalSessions,
                activeSessions,
                expiredSessions,
                deviceTypes,
                recentSessions: allSessions,
            };
        }
        catch (error) {
            console.error(`Error getting session stats for user ${userId}:`, error);
            throw error;
        }
    }
    /**
     * Find sessions by device type
     */
    async findSessionsByDeviceType(deviceType, limit = 50) {
        try {
            return await this.model.findMany({
                where: {
                    isActive: true,
                    deviceInfo: {
                        path: ["deviceType"],
                        equals: deviceType,
                    },
                },
                orderBy: { createdAt: "desc" },
                take: limit,
            });
        }
        catch (error) {
            console.error(`Error finding sessions by device type ${deviceType}:`, error);
            throw error;
        }
    }
    /**
     * Get concurrent sessions count
     */
    async getConcurrentSessionsCount() {
        try {
            return await this.model.count({
                where: {
                    isActive: true,
                    expiresAt: {
                        gt: new Date(),
                    },
                },
            });
        }
        catch (error) {
            console.error("Error getting concurrent sessions count:", error);
            throw error;
        }
    }
    /**
     * Find sessions by IP address (for security monitoring)
     */
    async findSessionsByIP(ipAddress) {
        try {
            return await this.model.findMany({
                where: {
                    deviceInfo: {
                        path: ["ipAddress"],
                        equals: ipAddress,
                    },
                },
                orderBy: { createdAt: "desc" },
            });
        }
        catch (error) {
            console.error(`Error finding sessions by IP ${ipAddress}:`, error);
            throw error;
        }
    }
    /**
     * Get session analytics for admin dashboard
     */
    async getSessionAnalytics(dateFrom, dateTo) {
        try {
            const sessions = await this.model.findMany({
                where: {
                    createdAt: {
                        gte: dateFrom,
                        lte: dateTo,
                    },
                },
            });
            const activeSessions = sessions.filter((s) => s.isActive && s.expiresAt > new Date()).length;
            // Calculate average session duration
            const completedSessions = sessions.filter((s) => !s.isActive);
            const totalDuration = completedSessions.reduce((sum, session) => {
                const duration = session.updatedAt.getTime() - session.createdAt.getTime();
                return sum + duration;
            }, 0);
            const averageSessionDuration = completedSessions.length > 0
                ? totalDuration / completedSessions.length / 1000 / 60 // in minutes
                : 0;
            // Device type distribution
            const deviceTypeDistribution = {};
            const browserDistribution = {};
            const countryDistribution = {};
            sessions.forEach((session) => {
                if (session.deviceInfo) {
                    const deviceInfo = session.deviceInfo;
                    // Device type
                    const deviceType = deviceInfo.deviceType || "unknown";
                    deviceTypeDistribution[deviceType] =
                        (deviceTypeDistribution[deviceType] || 0) + 1;
                    // Browser
                    const browser = deviceInfo.browser || "unknown";
                    browserDistribution[browser] =
                        (browserDistribution[browser] || 0) + 1;
                    // Country
                    const country = deviceInfo.location?.country || "unknown";
                    countryDistribution[country] =
                        (countryDistribution[country] || 0) + 1;
                }
            });
            // Logins by hour
            const hourlyMap = new Map();
            sessions.forEach((session) => {
                const hour = session.createdAt.getHours();
                hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
            });
            const loginsByHour = Array.from({ length: 24 }, (_, hour) => ({
                hour,
                count: hourlyMap.get(hour) || 0,
            }));
            // Top countries
            const topCountries = Object.entries(countryDistribution)
                .map(([country, count]) => ({ country, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);
            return {
                totalSessions: sessions.length,
                activeSessions,
                averageSessionDuration: Math.round(averageSessionDuration),
                deviceTypeDistribution,
                browserDistribution,
                loginsByHour,
                topCountries,
            };
        }
        catch (error) {
            console.error("Error getting session analytics:", error);
            throw error;
        }
    }
    /**
     * Extend session expiration
     */
    async extendSession(sessionId, additionalHours = 24) {
        try {
            const newExpiresAt = new Date(Date.now() + additionalHours * 60 * 60 * 1000);
            return await this.model.update({
                where: { sessionId },
                data: {
                    expiresAt: newExpiresAt,
                    updatedAt: new Date(),
                },
            });
        }
        catch (error) {
            console.error(`Error extending session ${sessionId}:`, error);
            throw error;
        }
    }
    /**
     * Find suspicious sessions (for security monitoring)
     */
    async findSuspiciousSessions() {
        try {
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            // Sessions with multiple IP addresses for same user
            const multipleIPSessions = await this.db.$queryRaw `
        SELECT s1.* FROM sessions s1
        JOIN sessions s2 ON s1.user_id = s2.user_id AND s1.id != s2.id
        WHERE s1.device_info->>'ipAddress' != s2.device_info->>'ipAddress'
        AND s1.created_at > ${oneDayAgo}
        AND s1.is_active = true
      `;
            // Sessions with multiple device types for same user
            const multipleDeviceSessions = await this.db.$queryRaw `
        SELECT s1.* FROM sessions s1
        JOIN sessions s2 ON s1.user_id = s2.user_id AND s1.id != s2.id
        WHERE s1.device_info->>'deviceType' != s2.device_info->>'deviceType'
        AND s1.created_at > ${oneDayAgo}
        AND s1.is_active = true
      `;
            // Long-running sessions (active for more than a week)
            const longRunningSessions = await this.model.findMany({
                where: {
                    isActive: true,
                    createdAt: {
                        lt: oneWeekAgo,
                    },
                },
            });
            return {
                multipleIPs: multipleIPSessions,
                multipleDevices: multipleDeviceSessions,
                longRunning: longRunningSessions,
            };
        }
        catch (error) {
            console.error("Error finding suspicious sessions:", error);
            return {
                multipleIPs: [],
                multipleDevices: [],
                longRunning: [],
            };
        }
    }
}
exports.SessionRepository = SessionRepository;
//# sourceMappingURL=SessionRepository.js.map