"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionService = void 0;
const BaseService_1 = require("../BaseService");
const SessionRepository_1 = require("../../repositories/SessionRepository");
const JWTService_1 = require("./JWTService");
const types_1 = require("../../types");
class SessionService extends BaseService_1.BaseService {
    sessionRepository;
    jwtService;
    ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes
    REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
    MAX_SESSIONS_PER_USER = 5;
    constructor(sessionRepository, jwtService) {
        super();
        this.sessionRepository = sessionRepository || new SessionRepository_1.SessionRepository();
        this.jwtService = jwtService || new JWTService_1.JWTService();
    }
    /**
     * Create new session for user
     */
    async createSession(options) {
        try {
            const { userId, deviceInfo, ipAddress, userAgent } = options;
            // Generate tokens
            const sessionId = this.generateSessionId();
            const accessToken = await this.jwtService.generateAccessToken({
                userId,
                sessionId,
            });
            const refreshToken = await this.jwtService.generateRefreshToken({
                userId,
                sessionId,
            });
            const expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_EXPIRY);
            // Create session in database
            const session = await this.sessionRepository.create({
                userId,
                sessionId,
                accessToken,
                refreshToken,
                expiresAt,
                deviceInfo,
                ipAddress,
                userAgent,
                isActive: true,
            });
            // Limit user sessions
            await this.sessionRepository.limitUserSessions(userId, this.MAX_SESSIONS_PER_USER);
            this.logger.info("Session created successfully", {
                userId,
                sessionId,
                deviceType: deviceInfo?.deviceType,
                ipAddress,
            });
            return {
                accessToken,
                refreshToken,
                expiresAt,
                sessionId,
            };
        }
        catch (error) {
            this.logger.error("Error creating session", { error, userId: options.userId });
            throw this.handleError(error, "Failed to create session");
        }
    }
    /**
     * Validate and get session by access token
     */
    async validateAccessToken(accessToken) {
        try {
            // Find session in database
            const session = await this.sessionRepository.findByAccessToken(accessToken);
            if (!session) {
                return null;
            }
            // Check if session is active and not expired
            const now = new Date();
            const isExpired = !session.isActive || session.expiresAt <= now;
            if (isExpired) {
                // Deactivate expired session
                await this.sessionRepository.deactivateSession(session.id);
                return null;
            }
            // Verify JWT token
            const tokenPayload = await this.jwtService.verifyAccessToken(accessToken);
            if (!tokenPayload || tokenPayload.sessionId !== session.sessionId) {
                return null;
            }
            // Update last used time
            await this.sessionRepository.updateLastUsed(session.id);
            const timeUntilExpiry = Math.max(0, session.expiresAt.getTime() - now.getTime()) / (1000 * 60);
            return {
                ...session,
                isExpired: false,
                timeUntilExpiry: Math.round(timeUntilExpiry),
            };
        }
        catch (error) {
            this.logger.error("Error validating access token", { error });
            return null;
        }
    }
    /**
     * Refresh session tokens
     */
    async refreshSession(refreshToken) {
        try {
            // Find session by refresh token
            const session = await this.sessionRepository.findByRefreshToken(refreshToken);
            if (!session) {
                throw new types_1.AppError("Invalid refresh token", types_1.HTTP_STATUS.UNAUTHORIZED, types_1.ERROR_CODES.INVALID_TOKEN);
            }
            // Check if session is still valid
            const now = new Date();
            if (!session.isActive || session.expiresAt <= now) {
                await this.sessionRepository.deactivateSession(session.id);
                throw new types_1.AppError("Session expired", types_1.HTTP_STATUS.UNAUTHORIZED, types_1.ERROR_CODES.SESSION_EXPIRED);
            }
            // Verify refresh token
            const tokenPayload = await this.jwtService.verifyRefreshToken(refreshToken);
            if (!tokenPayload || tokenPayload.sessionId !== session.sessionId) {
                throw new types_1.AppError("Invalid refresh token", types_1.HTTP_STATUS.UNAUTHORIZED, types_1.ERROR_CODES.INVALID_TOKEN);
            }
            // Generate new tokens
            const newAccessToken = await this.jwtService.generateAccessToken({
                userId: session.userId,
                sessionId: session.sessionId,
            });
            const newRefreshToken = await this.jwtService.generateRefreshToken({
                userId: session.userId,
                sessionId: session.sessionId,
            });
            // Update session with new tokens
            const updatedSession = await this.sessionRepository.updateTokens(session.id, newAccessToken, newRefreshToken);
            this.logger.info("Session refreshed successfully", {
                userId: session.userId,
                sessionId: session.sessionId,
            });
            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                expiresAt: updatedSession.expiresAt,
                sessionId: session.sessionId,
            };
        }
        catch (error) {
            this.logger.error("Error refreshing session", { error });
            throw this.handleError(error, "Failed to refresh session");
        }
    }
    /**
     * Logout from specific session
     */
    async logout(sessionId) {
        try {
            const result = await this.sessionRepository.deactivateSession(sessionId);
            if (result) {
                this.logger.info("User logged out successfully", { sessionId });
            }
            return result;
        }
        catch (error) {
            this.logger.error("Error during logout", { error, sessionId });
            return false;
        }
    }
    /**
     * Logout from all sessions (all devices)
     */
    async logoutAllSessions(userId) {
        try {
            const deactivatedCount = await this.sessionRepository.deactivateAllUserSessions(userId);
            this.logger.info("User logged out from all sessions", {
                userId,
                deactivatedCount,
            });
            return deactivatedCount;
        }
        catch (error) {
            this.logger.error("Error logging out all sessions", { error, userId });
            throw this.handleError(error, "Failed to logout from all sessions");
        }
    }
    /**
     * Get user's active sessions
     */
    async getUserActiveSessions(userId) {
        try {
            const sessions = await this.sessionRepository.findActiveSessionsByUserId(userId);
            const now = new Date();
            return sessions.map(session => {
                const timeUntilExpiry = Math.max(0, session.expiresAt.getTime() - now.getTime()) / (1000 * 60);
                return {
                    ...session,
                    isExpired: session.expiresAt <= now,
                    timeUntilExpiry: Math.round(timeUntilExpiry),
                };
            });
        }
        catch (error) {
            this.logger.error("Error getting user active sessions", { error, userId });
            throw this.handleError(error, "Failed to get active sessions");
        }
    }
    /**
     * Get session analytics for user
     */
    async getUserSessionAnalytics(userId) {
        try {
            const analytics = await this.sessionRepository.getUserSessionStats(userId);
            // Check for suspicious activity
            const suspiciousActivity = await this.sessionRepository.detectSuspiciousActivity(userId);
            return {
                ...analytics,
                security: suspiciousActivity,
            };
        }
        catch (error) {
            this.logger.error("Error getting user session analytics", { error, userId });
            throw this.handleError(error, "Failed to get session analytics");
        }
    }
    /**
     * Admin: Get session analytics
     */
    async getSessionAnalytics(dateFrom, dateTo) {
        try {
            return await this.sessionRepository.getSessionAnalytics(dateFrom, dateTo);
        }
        catch (error) {
            this.logger.error("Error getting session analytics", { error });
            throw this.handleError(error, "Failed to get session analytics");
        }
    }
    /**
     * Clean up expired sessions (maintenance task)
     */
    async cleanupExpiredSessions() {
        try {
            const result = await this.sessionRepository.cleanupExpiredSessions();
            this.logger.info("Expired sessions cleaned up", {
                deletedCount: result.deletedCount,
            });
            return result;
        }
        catch (error) {
            this.logger.error("Error cleaning up expired sessions", { error });
            throw this.handleError(error, "Failed to cleanup expired sessions");
        }
    }
    /**
     * Validate session and get user info
     */
    async validateSessionAndGetUser(accessToken) {
        try {
            const session = await this.validateAccessToken(accessToken);
            if (!session) {
                return null;
            }
            return {
                session,
                user: session.user,
            };
        }
        catch (error) {
            this.logger.error("Error validating session and getting user", { error });
            return null;
        }
    }
    /**
     * Extend session expiry
     */
    async extendSession(sessionId, additionalMinutes = 15) {
        try {
            const newExpiryDate = new Date(Date.now() + additionalMinutes * 60 * 1000);
            const session = await this.sessionRepository.refreshSession(sessionId, newExpiryDate);
            this.logger.info("Session extended", {
                sessionId,
                additionalMinutes,
                newExpiry: newExpiryDate,
            });
            return session;
        }
        catch (error) {
            this.logger.error("Error extending session", { error, sessionId });
            throw this.handleError(error, "Failed to extend session");
        }
    }
    /**
     * Check if user has reached session limit
     */
    async checkSessionLimit(userId) {
        try {
            const activeSessions = await this.sessionRepository.findActiveSessionsByUserId(userId);
            return {
                hasReachedLimit: activeSessions.length >= this.MAX_SESSIONS_PER_USER,
                activeSessionCount: activeSessions.length,
                maxSessions: this.MAX_SESSIONS_PER_USER,
            };
        }
        catch (error) {
            this.logger.error("Error checking session limit", { error, userId });
            throw this.handleError(error, "Failed to check session limit");
        }
    }
    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Handle service errors
     */
    handleError(error, message) {
        if (error instanceof types_1.AppError) {
            return error;
        }
        return new types_1.AppError(message, types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.SESSION_ERROR);
    }
    /**
     * Invalidate all user sessions
     */
    async invalidateAllUserSessions(userId) {
        return await this.logoutAllSessions(userId);
    }
    /**
     * Invalidate specific session
     */
    async invalidateSession(sessionId) {
        return await this.logout(sessionId);
    }
    /**
     * Invalidate session by access token
     */
    async invalidateSessionByAccessToken(accessToken) {
        try {
            const session = await this.sessionRepository.findByAccessToken(accessToken);
            if (!session) {
                return false;
            }
            return await this.logout(session.sessionId);
        }
        catch (error) {
            this.logger.error("Error invalidating session by access token", { error });
            return false;
        }
    }
}
exports.SessionService = SessionService;
//# sourceMappingURL=SessionService.js.map