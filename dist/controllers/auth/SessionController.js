"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionController = void 0;
const BaseController_1 = require("../BaseController");
const SessionService_1 = require("../../services/auth/SessionService");
const types_1 = require("../../types");
class SessionController extends BaseController_1.BaseController {
    sessionService;
    constructor(sessionService) {
        super();
        this.sessionService = sessionService || new SessionService_1.SessionService();
    }
    /**
     * @route POST /api/v1/auth/refresh
     * @desc Refresh access token using refresh token
     * @access Public
     */
    refreshToken = async (req, res) => {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                throw new types_1.AppError("Refresh token is required", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
            }
            const result = await this.sessionService.refreshSession(refreshToken);
            if (!result) {
                throw new types_1.AppError("Invalid or expired refresh token", types_1.HTTP_STATUS.UNAUTHORIZED, types_1.ERROR_CODES.INVALID_TOKEN);
            }
            const response = {
                success: true,
                message: "Token refreshed successfully",
                data: {
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken,
                    expiresAt: result.expiresAt,
                    sessionId: result.sessionId,
                },
            };
            this.logger.info("Token refreshed successfully", {
                sessionId: result.sessionId,
                ip: req.ip,
            });
            res.status(types_1.HTTP_STATUS.OK).json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * @route POST /api/v1/auth/logout
     * @desc Logout from current session
     * @access Private
     */
    logout = async (req, res) => {
        try {
            const { sessionId: requestSessionId } = req.body;
            const sessionId = requestSessionId || req.user?.sessionId;
            if (!sessionId) {
                throw new types_1.AppError("Session ID is required", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
            }
            const result = await this.sessionService.logout(sessionId);
            const response = {
                success: true,
                message: result ? "Logged out successfully" : "Session was already inactive",
                data: { sessionId },
            };
            this.logger.info("User logged out", {
                userId: req.user?.userId,
                sessionId,
                ip: req.ip,
            });
            res.status(types_1.HTTP_STATUS.OK).json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * @route POST /api/v1/auth/logout-all
     * @desc Logout from all sessions (all devices)
     * @access Private
     */
    logoutAllSessions = async (req, res) => {
        try {
            if (!req.user?.userId) {
                throw new types_1.AppError("User not authenticated", types_1.HTTP_STATUS.UNAUTHORIZED, types_1.ERROR_CODES.NOT_AUTHENTICATED);
            }
            const deactivatedCount = await this.sessionService.logoutAllSessions(req.user.userId);
            const response = {
                success: true,
                message: `Logged out from ${deactivatedCount} sessions`,
                data: {
                    deactivatedSessions: deactivatedCount,
                    userId: req.user.userId,
                },
            };
            this.logger.info("User logged out from all sessions", {
                userId: req.user.userId,
                deactivatedCount,
                ip: req.ip,
            });
            res.status(types_1.HTTP_STATUS.OK).json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * @route GET /api/v1/auth/sessions
     * @desc Get user's active sessions
     * @access Private
     */
    getActiveSessions = async (req, res) => {
        try {
            if (!req.user?.userId) {
                throw new types_1.AppError("User not authenticated", types_1.HTTP_STATUS.UNAUTHORIZED, types_1.ERROR_CODES.NOT_AUTHENTICATED);
            }
            const sessions = await this.sessionService.getUserActiveSessions(req.user.userId);
            // Don't expose sensitive information like tokens
            const safeSessions = sessions.map(session => ({
                id: session.id,
                sessionId: session.sessionId,
                deviceInfo: session.deviceInfo,
                ipAddress: session.ipAddress,
                userAgent: session.userAgent,
                isActive: session.isActive,
                isExpired: session.isExpired,
                timeUntilExpiry: session.timeUntilExpiry,
                lastUsedAt: session.lastUsedAt,
                createdAt: session.createdAt,
                isCurrent: session.sessionId === req.user?.sessionId,
            }));
            const response = {
                success: true,
                message: "Active sessions retrieved successfully",
                data: {
                    sessions: safeSessions,
                    totalSessions: safeSessions.length,
                },
            };
            res.status(types_1.HTTP_STATUS.OK).json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * @route GET /api/v1/auth/session-analytics
     * @desc Get user's session analytics and security info
     * @access Private
     */
    getUserSessionAnalytics = async (req, res) => {
        try {
            if (!req.user?.userId) {
                throw new types_1.AppError("User not authenticated", types_1.HTTP_STATUS.UNAUTHORIZED, types_1.ERROR_CODES.NOT_AUTHENTICATED);
            }
            const analytics = await this.sessionService.getUserSessionAnalytics(req.user.userId);
            const response = {
                success: true,
                message: "Session analytics retrieved successfully",
                data: analytics,
            };
            res.status(types_1.HTTP_STATUS.OK).json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * @route POST /api/v1/auth/extend-session
     * @desc Extend current session expiry
     * @access Private
     */
    extendSession = async (req, res) => {
        try {
            const { sessionId: requestSessionId, additionalMinutes = 15 } = req.body;
            const sessionId = requestSessionId || req.user?.sessionId;
            if (!sessionId) {
                throw new types_1.AppError("Session ID is required", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
            }
            // Validate additional minutes (max 120 minutes = 2 hours)
            if (additionalMinutes < 1 || additionalMinutes > 120) {
                throw new types_1.AppError("Additional minutes must be between 1 and 120", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
            }
            const session = await this.sessionService.extendSession(sessionId, additionalMinutes);
            const response = {
                success: true,
                message: `Session extended by ${additionalMinutes} minutes`,
                data: {
                    sessionId: session.sessionId,
                    expiresAt: session.expiresAt,
                    extendedBy: additionalMinutes,
                },
            };
            this.logger.info("Session extended", {
                userId: req.user?.userId,
                sessionId,
                additionalMinutes,
                ip: req.ip,
            });
            res.status(types_1.HTTP_STATUS.OK).json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * @route GET /api/v1/auth/session-status
     * @desc Get current session status and info
     * @access Private
     */
    getSessionStatus = async (req, res) => {
        try {
            if (!req.user?.userId || !req.user?.sessionId) {
                throw new types_1.AppError("User not authenticated", types_1.HTTP_STATUS.UNAUTHORIZED, types_1.ERROR_CODES.NOT_AUTHENTICATED);
            }
            // Get session limit info
            const sessionLimit = await this.sessionService.checkSessionLimit(req.user.userId);
            const response = {
                success: true,
                message: "Session status retrieved successfully",
                data: {
                    sessionId: req.user.sessionId,
                    userId: req.user.userId,
                    sessionLimit,
                    currentTime: new Date(),
                },
            };
            res.status(types_1.HTTP_STATUS.OK).json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * @route DELETE /api/v1/auth/sessions/:sessionId
     * @desc Logout from specific session
     * @access Private
     */
    logoutSpecificSession = async (req, res) => {
        try {
            const { sessionId } = req.params;
            if (!sessionId) {
                throw new types_1.AppError("Session ID is required", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
            }
            const result = await this.sessionService.logout(sessionId);
            const response = {
                success: true,
                message: result ? "Session terminated successfully" : "Session was already inactive",
                data: { sessionId },
            };
            this.logger.info("Specific session terminated", {
                userId: req.user?.userId,
                targetSessionId: sessionId,
                currentSessionId: req.user?.sessionId,
                ip: req.ip,
            });
            res.status(types_1.HTTP_STATUS.OK).json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * @route POST /api/v1/auth/validate-session
     * @desc Validate current session (health check)
     * @access Private
     */
    validateSession = async (req, res) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader?.startsWith('Bearer ')) {
                throw new types_1.AppError("Authorization header required", types_1.HTTP_STATUS.UNAUTHORIZED, types_1.ERROR_CODES.NOT_AUTHENTICATED);
            }
            const token = authHeader.substring(7);
            const sessionInfo = await this.sessionService.validateAccessToken(token);
            if (!sessionInfo) {
                throw new types_1.AppError("Invalid or expired session", types_1.HTTP_STATUS.UNAUTHORIZED, types_1.ERROR_CODES.INVALID_TOKEN);
            }
            const response = {
                success: true,
                message: "Session is valid",
                data: {
                    sessionId: sessionInfo.sessionId,
                    userId: sessionInfo.userId,
                    isExpired: sessionInfo.isExpired,
                    timeUntilExpiry: sessionInfo.timeUntilExpiry,
                    lastUsedAt: sessionInfo.lastUsedAt,
                },
            };
            res.status(types_1.HTTP_STATUS.OK).json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    // ========== ADMIN ENDPOINTS ==========
    /**
     * @route GET /api/admin/sessions/analytics
     * @desc Get session analytics for admin dashboard
     * @access Admin
     */
    getAdminSessionAnalytics = async (req, res) => {
        try {
            const { dateFrom, dateTo } = req.query;
            // Default to last 30 days if not provided
            const defaultDateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const defaultDateTo = new Date();
            const parsedDateFrom = dateFrom ? new Date(dateFrom) : defaultDateFrom;
            const parsedDateTo = dateTo ? new Date(dateTo) : defaultDateTo;
            // Validate dates
            if (isNaN(parsedDateFrom.getTime()) || isNaN(parsedDateTo.getTime())) {
                throw new types_1.AppError("Invalid date format", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
            }
            if (parsedDateFrom >= parsedDateTo) {
                throw new types_1.AppError("Date 'from' must be before date 'to'", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
            }
            const analytics = await this.sessionService.getSessionAnalytics(parsedDateFrom, parsedDateTo);
            const response = {
                success: true,
                message: "Session analytics retrieved successfully",
                data: {
                    ...analytics,
                    dateRange: {
                        from: parsedDateFrom,
                        to: parsedDateTo,
                    },
                },
            };
            res.status(types_1.HTTP_STATUS.OK).json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * @route POST /api/admin/sessions/cleanup
     * @desc Clean up expired sessions (maintenance)
     * @access Admin
     */
    cleanupExpiredSessions = async (req, res) => {
        try {
            const result = await this.sessionService.cleanupExpiredSessions();
            const response = {
                success: true,
                message: `Cleaned up ${result.deletedCount} expired sessions`,
                data: result,
            };
            this.logger.info("Expired sessions cleanup completed", {
                deletedCount: result.deletedCount,
                adminId: req.user?.id,
            });
            res.status(types_1.HTTP_STATUS.OK).json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
}
exports.SessionController = SessionController;
//# sourceMappingURL=SessionController.js.map