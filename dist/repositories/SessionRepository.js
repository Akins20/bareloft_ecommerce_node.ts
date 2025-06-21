"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionRepository = void 0;
const client_1 = require("@prisma/client");
const BaseRepository_1 = require("./BaseRepository");
const types_1 = require("../types");
class SessionRepository extends BaseRepository_1.BaseRepository {
    constructor(prisma) {
        super(prisma || new client_1.PrismaClient(), "Session");
    }
    /**
     * Create new session
     */
    async create(data) {
        try {
            return await super.create({
                ...data,
                lastUsedAt: new Date(),
            });
        }
        catch (error) {
            throw new types_1.AppError("Error creating session", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Find session by session ID
     */
    async findBySessionId(sessionId) {
        try {
            return await this.findFirst({ sessionId }, {
                user: {
                    select: {
                        id: true,
                        phoneNumber: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        isActive: true,
                    },
                },
            });
        }
        catch (error) {
            throw new types_1.AppError("Error finding session by session ID", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Find session by access token
     */
    async findByAccessToken(accessToken) {
        try {
            return await this.findFirst({ accessToken, isActive: true }, {
                user: {
                    select: {
                        id: true,
                        phoneNumber: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        isActive: true,
                    },
                },
            });
        }
        catch (error) {
            throw new types_1.AppError("Error finding session by access token", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Find session by refresh token
     */
    async findByRefreshToken(refreshToken) {
        try {
            return await this.findFirst({ refreshToken, isActive: true }, {
                user: {
                    select: {
                        id: true,
                        phoneNumber: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        isActive: true,
                    },
                },
            });
        }
        catch (error) {
            throw new types_1.AppError("Error finding session by refresh token", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Get all active sessions for a user
     */
    async findActiveSessionsByUserId(userId) {
        try {
            const result = await this.findMany({
                userId,
                isActive: true,
                expiresAt: {
                    gt: new Date(),
                },
            }, {
                orderBy: { lastUsedAt: "desc" },
            });
            return result.data;
        }
        catch (error) {
            throw new types_1.AppError("Error finding active sessions", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Update session tokens
     */
    async updateTokens(sessionId, accessToken, refreshToken) {
        try {
            return await this.update(sessionId, {
                accessToken,
                refreshToken,
                lastUsedAt: new Date(),
            });
        }
        catch (error) {
            throw new types_1.AppError("Error updating session tokens", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Update session last used time
     */
    async updateLastUsed(sessionId) {
        try {
            return await this.update(sessionId, {
                lastUsedAt: new Date(),
            });
        }
        catch (error) {
            throw new types_1.AppError("Error updating session last used time", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Deactivate session (logout)
     */
    async deactivateSession(sessionId) {
        try {
            await this.update(sessionId, {
                isActive: false,
            });
            return true;
        }
        catch (error) {
            // Don't throw error on logout failure - just log it
            console.error("Error deactivating session:", error);
            return false;
        }
    }
    /**
     * Deactivate all user sessions (logout from all devices)
     */
    async deactivateAllUserSessions(userId) {
        try {
            const result = await this.updateMany({
                userId,
                isActive: true,
            }, {
                isActive: false,
            });
            return result.count;
        }
        catch (error) {
            throw new types_1.AppError("Error deactivating all user sessions", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Deactivate session by access token
     */
    async deactivateByAccessToken(accessToken) {
        try {
            const session = await this.findByAccessToken(accessToken);
            if (!session) {
                return false;
            }
            await this.update(session.id, {
                isActive: false,
            });
            return true;
        }
        catch (error) {
            console.error("Error deactivating session by access token:", error);
            return false;
        }
    }
    /**
     * Clean up expired sessions (maintenance task)
     */
    async cleanupExpiredSessions() {
        try {
            const result = await this.deleteMany({
                OR: [
                    {
                        expiresAt: {
                            lt: new Date(),
                        },
                    },
                    {
                        isActive: false,
                        updatedAt: {
                            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days old
                        },
                    },
                ],
            });
            return { deletedCount: result.count };
        }
        catch (error) {
            throw new types_1.AppError("Error cleaning up expired sessions", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Limit user sessions (keep only N most recent)
     */
    async limitUserSessions(userId, maxSessions = 5) {
        try {
            return await this.transaction(async (prisma) => {
                // Get all active sessions for user, ordered by last used
                const sessions = await prisma.session.findMany({
                    where: {
                        userId,
                        isActive: true,
                    },
                    orderBy: { lastUsedAt: "desc" },
                });
                // If under limit, no action needed
                if (sessions.length <= maxSessions) {
                    return 0;
                }
                // Deactivate oldest sessions
                const sessionsToDeactivate = sessions.slice(maxSessions);
                const sessionIds = sessionsToDeactivate.map((s) => s.id);
                const result = await prisma.session.updateMany({
                    where: {
                        id: {
                            in: sessionIds,
                        },
                    },
                    data: {
                        isActive: false,
                    },
                });
                return result.count;
            });
        }
        catch (error) {
            throw new types_1.AppError("Error limiting user sessions", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Get session analytics for user
     */
    async getUserSessionStats(userId) {
        try {
            const [sessions, recentSessions] = await Promise.all([
                this.findMany({ userId }, {
                    orderBy: { createdAt: "desc" },
                    pagination: { page: 1, limit: 100 },
                }),
                this.findMany({
                    userId,
                    createdAt: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days
                    },
                }, {
                    orderBy: { createdAt: "desc" },
                }),
            ]);
            const activeSessions = sessions.data.filter((s) => s.isActive && s.expiresAt > new Date()).length;
            const recentLogins = recentSessions.data
                .slice(0, 10)
                .map((s) => s.createdAt);
            // Aggregate device types
            const deviceTypes = recentSessions.data.reduce((acc, session) => {
                const deviceType = session.deviceInfo?.deviceType || "unknown";
                const existing = acc.find((d) => d.type === deviceType);
                if (existing) {
                    existing.count++;
                }
                else {
                    acc.push({ type: deviceType, count: 1 });
                }
                return acc;
            }, []);
            // Aggregate IP addresses
            const ipMap = new Map();
            recentSessions.data.forEach((session) => {
                if (session.ipAddress) {
                    const existing = ipMap.get(session.ipAddress);
                    if (existing) {
                        existing.count++;
                        if (session.lastUsedAt && session.lastUsedAt > existing.lastUsed) {
                            existing.lastUsed = session.lastUsedAt;
                        }
                    }
                    else {
                        ipMap.set(session.ipAddress, {
                            ip: session.ipAddress,
                            count: 1,
                            lastUsed: session.lastUsedAt || session.createdAt,
                        });
                    }
                }
            });
            const ipAddresses = Array.from(ipMap.values()).sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
            return {
                totalSessions: sessions.data.length,
                activeSessions,
                recentLogins,
                deviceTypes: deviceTypes.sort((a, b) => b.count - a.count),
                ipAddresses: ipAddresses.slice(0, 10),
            };
        }
        catch (error) {
            throw new types_1.AppError("Error getting user session statistics", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Get admin session analytics
     */
    async getSessionAnalytics(dateFrom, dateTo) {
        try {
            const where = {
                createdAt: {
                    gte: dateFrom,
                    lte: dateTo,
                },
            };
            const [totalSessions, activeSessions, allSessions] = await Promise.all([
                this.count(where),
                this.count({
                    ...where,
                    isActive: true,
                    expiresAt: { gt: new Date() },
                }),
                this.findMany(where, {
                    pagination: { page: 1, limit: 10000 },
                }),
            ]);
            // Calculate average session duration
            const completedSessions = allSessions.data.filter((s) => !s.isActive && s.lastUsedAt);
            const totalDuration = completedSessions.reduce((sum, session) => {
                const duration = (session.lastUsedAt?.getTime() || 0) - session.createdAt.getTime();
                return sum + Math.max(0, duration);
            }, 0);
            const averageSessionDuration = completedSessions.length > 0
                ? totalDuration / completedSessions.length / (1000 * 60) // minutes
                : 0;
            // Group by device type
            const deviceMap = new Map();
            allSessions.data.forEach((session) => {
                const device = session.deviceInfo?.deviceType || "unknown";
                deviceMap.set(device, (deviceMap.get(device) || 0) + 1);
            });
            const sessionsByDevice = Array.from(deviceMap.entries()).map(([device, count]) => ({ device, count }));
            // Group by day
            const dayMap = new Map();
            allSessions.data.forEach((session) => {
                const date = session.createdAt.toISOString().split("T")[0];
                dayMap.set(date, (dayMap.get(date) || 0) + 1);
            });
            const sessionsByDay = Array.from(dayMap.entries())
                .map(([date, sessions]) => ({ date, sessions }))
                .sort((a, b) => a.date.localeCompare(b.date));
            // Top IP addresses
            const ipMap = new Map();
            allSessions.data.forEach((session) => {
                if (session.ipAddress) {
                    ipMap.set(session.ipAddress, (ipMap.get(session.ipAddress) || 0) + 1);
                }
            });
            const topIpAddresses = Array.from(ipMap.entries())
                .map(([ip, sessions]) => ({ ip, sessions }))
                .sort((a, b) => b.sessions - a.sessions)
                .slice(0, 10);
            return {
                totalSessions,
                activeSessions,
                averageSessionDuration: Number(averageSessionDuration.toFixed(2)),
                sessionsByDevice,
                sessionsByDay,
                topIpAddresses,
            };
        }
        catch (error) {
            throw new types_1.AppError("Error getting session analytics", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Check for suspicious session activity
     */
    async detectSuspiciousActivity(userId) {
        try {
            const alerts = [];
            const recentSessions = await this.findMany({
                userId,
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours
                },
            }, {
                orderBy: { createdAt: "desc" },
            });
            // Check for multiple IP addresses
            const uniqueIPs = new Set(recentSessions.data.map((s) => s.ipAddress).filter((ip) => ip));
            if (uniqueIPs.size > 3) {
                alerts.push({
                    type: "multiple_ips",
                    message: `Login from ${uniqueIPs.size} different IP addresses in 24 hours`,
                    severity: "medium",
                    data: { ipCount: uniqueIPs.size },
                });
            }
            // Check for rapid session creation
            const sessionCount = recentSessions.data.length;
            if (sessionCount > 10) {
                alerts.push({
                    type: "rapid_sessions",
                    message: `${sessionCount} sessions created in 24 hours`,
                    severity: "high",
                    data: { sessionCount },
                });
            }
            // Check for unusual device types
            const deviceTypes = recentSessions.data.map((s) => s.deviceInfo?.deviceType);
            const uniqueDevices = new Set(deviceTypes.filter((d) => d));
            if (uniqueDevices.size > 2) {
                alerts.push({
                    type: "multiple_devices",
                    message: `Login from ${uniqueDevices.size} different device types`,
                    severity: "low",
                    data: { deviceTypes: Array.from(uniqueDevices) },
                });
            }
            return {
                hasAlerts: alerts.length > 0,
                alerts,
            };
        }
        catch (error) {
            throw new types_1.AppError("Error detecting suspicious activity", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Refresh session expiry
     */
    async refreshSession(sessionId, newExpiryDate) {
        try {
            return await this.update(sessionId, {
                expiresAt: newExpiryDate,
                lastUsedAt: new Date(),
            });
        }
        catch (error) {
            throw new types_1.AppError("Error refreshing session", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
}
exports.SessionRepository = SessionRepository;
//# sourceMappingURL=SessionRepository.js.map