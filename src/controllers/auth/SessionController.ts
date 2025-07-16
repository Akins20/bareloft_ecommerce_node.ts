import { Request, Response } from "express";
import { BaseController } from "../BaseController";
import { SessionService } from "../../services/auth/SessionService";
import {
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
  ApiResponse,
  DeviceInfo,
  AuthenticatedRequest,
} from "../../types";

interface RefreshTokenRequest {
  refreshToken: string;
}

interface LogoutRequest {
  sessionId?: string;
}

interface ExtendSessionRequest {
  sessionId: string;
  additionalMinutes?: number;
}

interface SessionAnalyticsQuery {
  dateFrom?: string;
  dateTo?: string;
}

export class SessionController extends BaseController {
  private sessionService: SessionService;

  constructor(sessionService?: SessionService) {
    super();
    this.sessionService = sessionService || new SessionService();
  }

  /**
   * @route POST /api/v1/auth/refresh
   * @desc Refresh access token using refresh token
   * @access Public
   */
  public refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken }: RefreshTokenRequest = req.body;

      if (!refreshToken) {
        throw new AppError(
          "Refresh token is required",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const result = await this.sessionService.refreshSession(refreshToken);

      if (!result) {
        throw new AppError(
          "Invalid or expired refresh token",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.INVALID_TOKEN
        );
      }

      const response: ApiResponse = {
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

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * @route POST /api/v1/auth/logout
   * @desc Logout from current session
   * @access Private
   */
  public logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { sessionId: requestSessionId }: LogoutRequest = req.body;
      const sessionId = requestSessionId || req.user?.sessionId;

      if (!sessionId) {
        throw new AppError(
          "Session ID is required",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const result = await this.sessionService.logout(sessionId);

      const response: ApiResponse = {
        success: true,
        message: result ? "Logged out successfully" : "Session was already inactive",
        data: { sessionId },
      };

      this.logger.info("User logged out", {
        userId: req.user?.userId,
        sessionId,
        ip: req.ip,
      });

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * @route POST /api/v1/auth/logout-all
   * @desc Logout from all sessions (all devices)
   * @access Private
   */
  public logoutAllSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?.userId) {
        throw new AppError(
          "User not authenticated",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.NOT_AUTHENTICATED
        );
      }

      const deactivatedCount = await this.sessionService.logoutAllSessions(req.user.userId);

      const response: ApiResponse = {
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

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * @route GET /api/v1/auth/sessions
   * @desc Get user's active sessions
   * @access Private
   */
  public getActiveSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?.userId) {
        throw new AppError(
          "User not authenticated",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.NOT_AUTHENTICATED
        );
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
        isCurrent: session.sessionId === req.user.sessionId,
      }));

      const response: ApiResponse = {
        success: true,
        message: "Active sessions retrieved successfully",
        data: {
          sessions: safeSessions,
          totalSessions: safeSessions.length,
        },
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * @route GET /api/v1/auth/session-analytics
   * @desc Get user's session analytics and security info
   * @access Private
   */
  public getUserSessionAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?.userId) {
        throw new AppError(
          "User not authenticated",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.NOT_AUTHENTICATED
        );
      }

      const analytics = await this.sessionService.getUserSessionAnalytics(req.user.userId);

      const response: ApiResponse = {
        success: true,
        message: "Session analytics retrieved successfully",
        data: analytics,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * @route POST /api/v1/auth/extend-session
   * @desc Extend current session expiry
   * @access Private
   */
  public extendSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { sessionId: requestSessionId, additionalMinutes = 15 }: ExtendSessionRequest = req.body;
      const sessionId = requestSessionId || req.user?.sessionId;

      if (!sessionId) {
        throw new AppError(
          "Session ID is required",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Validate additional minutes (max 120 minutes = 2 hours)
      if (additionalMinutes < 1 || additionalMinutes > 120) {
        throw new AppError(
          "Additional minutes must be between 1 and 120",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const session = await this.sessionService.extendSession(sessionId, additionalMinutes);

      const response: ApiResponse = {
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

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * @route GET /api/v1/auth/session-status
   * @desc Get current session status and info
   * @access Private
   */
  public getSessionStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?.userId || !req.user?.sessionId) {
        throw new AppError(
          "User not authenticated",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.NOT_AUTHENTICATED
        );
      }

      // Get session limit info
      const sessionLimit = await this.sessionService.checkSessionLimit(req.user.userId);

      const response: ApiResponse = {
        success: true,
        message: "Session status retrieved successfully",
        data: {
          sessionId: req.user.sessionId,
          userId: req.user.userId,
          sessionLimit,
          currentTime: new Date(),
        },
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * @route DELETE /api/v1/auth/sessions/:sessionId
   * @desc Logout from specific session
   * @access Private
   */
  public logoutSpecificSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        throw new AppError(
          "Session ID is required",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const result = await this.sessionService.logout(sessionId);

      const response: ApiResponse = {
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

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * @route POST /api/v1/auth/validate-session
   * @desc Validate current session (health check)
   * @access Private
   */
  public validateSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader?.startsWith('Bearer ')) {
        throw new AppError(
          "Authorization header required",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.NOT_AUTHENTICATED
        );
      }

      const token = authHeader.substring(7);
      const sessionInfo = await this.sessionService.validateAccessToken(token);

      if (!sessionInfo) {
        throw new AppError(
          "Invalid or expired session",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.INVALID_TOKEN
        );
      }

      const response: ApiResponse = {
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

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  // ========== ADMIN ENDPOINTS ==========

  /**
   * @route GET /api/admin/sessions/analytics
   * @desc Get session analytics for admin dashboard
   * @access Admin
   */
  public getAdminSessionAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { dateFrom, dateTo }: SessionAnalyticsQuery = req.query;

      // Default to last 30 days if not provided
      const defaultDateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const defaultDateTo = new Date();

      const parsedDateFrom = dateFrom ? new Date(dateFrom) : defaultDateFrom;
      const parsedDateTo = dateTo ? new Date(dateTo) : defaultDateTo;

      // Validate dates
      if (isNaN(parsedDateFrom.getTime()) || isNaN(parsedDateTo.getTime())) {
        throw new AppError(
          "Invalid date format",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      if (parsedDateFrom >= parsedDateTo) {
        throw new AppError(
          "Date 'from' must be before date 'to'",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const analytics = await this.sessionService.getSessionAnalytics(
        parsedDateFrom,
        parsedDateTo
      );

      const response: ApiResponse = {
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

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * @route POST /api/admin/sessions/cleanup
   * @desc Clean up expired sessions (maintenance)
   * @access Admin
   */
  public cleanupExpiredSessions = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.sessionService.cleanupExpiredSessions();

      const response: ApiResponse = {
        success: true,
        message: `Cleaned up ${result.deletedCount} expired sessions`,
        data: result,
      };

      this.logger.info("Expired sessions cleanup completed", {
        deletedCount: result.deletedCount,
        adminId: (req as any).user?.id,
      });

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };
}