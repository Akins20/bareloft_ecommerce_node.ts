import { BaseService } from "../BaseService";
import { SessionRepository } from "../../repositories/SessionRepository";
import { JWTService } from "./JWTService";
import {
  Session,
  DeviceInfo,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
} from "../../types";

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
  timeUntilExpiry: number; // in minutes
}

export class SessionService extends BaseService {
  private sessionRepository: SessionRepository;
  private jwtService: JWTService;
  private readonly ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes
  private readonly REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly MAX_SESSIONS_PER_USER = 5;

  constructor(
    sessionRepository?: SessionRepository,
    jwtService?: JWTService
  ) {
    super();
    this.sessionRepository = sessionRepository || new SessionRepository();
    this.jwtService = jwtService || new JWTService();
  }

  /**
   * Create new session for user
   */
  async createSession(options: CreateSessionOptions): Promise<SessionTokens> {
    try {
      const { userId, deviceInfo, ipAddress, userAgent } = options;

      // Generate tokens
      const sessionId = this.generateSessionId();
      const accessToken = await this.jwtService.generateAccessToken({
        userId,
        sessionId,
      } as any);
      const refreshToken = await this.jwtService.generateRefreshToken({
        userId,
        sessionId,
      } as any);

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
      await this.sessionRepository.limitUserSessions(
        userId,
        this.MAX_SESSIONS_PER_USER
      );

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
    } catch (error) {
      this.logger.error("Error creating session", { error, userId: options.userId });
      this.handleError("Failed to create session", error);
    }
  }

  /**
   * Validate and get session by access token
   */
  async validateAccessToken(accessToken: string): Promise<SessionInfo | null> {
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
    } catch (error) {
      this.logger.error("Error validating access token", { error });
      return null;
    }
  }

  /**
   * Refresh session tokens
   */
  async refreshSession(refreshToken: string): Promise<SessionTokens | null> {
    try {
      // Find session by refresh token
      const session = await this.sessionRepository.findByRefreshToken(refreshToken);
      
      if (!session) {
        throw new AppError(
          "Invalid refresh token",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.INVALID_TOKEN
        );
      }

      // Check if session is still valid
      const now = new Date();
      if (!session.isActive || session.expiresAt <= now) {
        await this.sessionRepository.deactivateSession(session.id);
        throw new AppError(
          "Session expired",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.SESSION_EXPIRED
        );
      }

      // Verify refresh token
      const tokenPayload = await this.jwtService.verifyRefreshToken(refreshToken);
      if (!tokenPayload || tokenPayload.sessionId !== session.sessionId) {
        throw new AppError(
          "Invalid refresh token",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.INVALID_TOKEN
        );
      }

      // Generate new tokens
      const newAccessToken = await this.jwtService.generateAccessToken({
        userId: session.userId,
        sessionId: session.sessionId,
      } as any);
      const newRefreshToken = await this.jwtService.generateRefreshToken({
        userId: session.userId,
        sessionId: session.sessionId,
      } as any);

      // Update session with new tokens
      const updatedSession = await this.sessionRepository.updateTokens(
        session.id,
        newAccessToken,
        newRefreshToken
      );

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
    } catch (error) {
      this.logger.error("Error refreshing session", { error });
      this.handleError("Failed to refresh session", error);
    }
  }

  /**
   * Logout from specific session
   */
  async logout(sessionId: string): Promise<boolean> {
    try {
      const result = await this.sessionRepository.deactivateSession(sessionId);
      
      if (result) {
        this.logger.info("User logged out successfully", { sessionId });
      }
      
      return result;
    } catch (error) {
      this.logger.error("Error during logout", { error, sessionId });
      return false;
    }
  }

  /**
   * Logout from all sessions (all devices)
   */
  async logoutAllSessions(userId: string): Promise<number> {
    try {
      const deactivatedCount = await this.sessionRepository.deactivateAllUserSessions(userId);
      
      this.logger.info("User logged out from all sessions", {
        userId,
        deactivatedCount,
      });
      
      return deactivatedCount;
    } catch (error) {
      this.logger.error("Error logging out all sessions", { error, userId });
      this.handleError("Failed to logout from all sessions", error);
    }
  }

  /**
   * Get user's active sessions
   */
  async getUserActiveSessions(userId: string): Promise<SessionInfo[]> {
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
    } catch (error) {
      this.logger.error("Error getting user active sessions", { error, userId });
      this.handleError("Failed to get active sessions", error);
    }
  }

  /**
   * Get session analytics for user
   */
  async getUserSessionAnalytics(userId: string) {
    try {
      const analytics = await this.sessionRepository.getUserSessionStats(userId);
      
      // Check for suspicious activity
      const suspiciousActivity = await this.sessionRepository.detectSuspiciousActivity(userId);
      
      return {
        ...analytics,
        security: suspiciousActivity,
      };
    } catch (error) {
      this.logger.error("Error getting user session analytics", { error, userId });
      this.handleError("Failed to get session analytics", error);
    }
  }

  /**
   * Admin: Get session analytics
   */
  async getSessionAnalytics(dateFrom: Date, dateTo: Date) {
    try {
      return await this.sessionRepository.getSessionAnalytics(dateFrom, dateTo);
    } catch (error) {
      this.logger.error("Error getting session analytics", { error });
      this.handleError("Failed to get session analytics", error);
    }
  }

  /**
   * Clean up expired sessions (maintenance task)
   */
  async cleanupExpiredSessions(): Promise<{ deletedCount: number }> {
    try {
      const result = await this.sessionRepository.cleanupExpiredSessions();
      
      this.logger.info("Expired sessions cleaned up", {
        deletedCount: result.deletedCount,
      });
      
      return result;
    } catch (error) {
      this.logger.error("Error cleaning up expired sessions", { error });
      this.handleError("Failed to cleanup expired sessions", error);
    }
  }

  /**
   * Validate session and get user info
   */
  async validateSessionAndGetUser(accessToken: string) {
    try {
      const session = await this.validateAccessToken(accessToken);
      
      if (!session) {
        return null;
      }

      return {
        session,
        user: session.user,
      };
    } catch (error) {
      this.logger.error("Error validating session and getting user", { error });
      return null;
    }
  }

  /**
   * Extend session expiry
   */
  async extendSession(sessionId: string, additionalMinutes: number = 15): Promise<Session> {
    try {
      const newExpiryDate = new Date(Date.now() + additionalMinutes * 60 * 1000);
      
      const session = await this.sessionRepository.refreshSession(sessionId, newExpiryDate);
      
      this.logger.info("Session extended", {
        sessionId,
        additionalMinutes,
        newExpiry: newExpiryDate,
      });
      
      return session;
    } catch (error) {
      this.logger.error("Error extending session", { error, sessionId });
      this.handleError("Failed to extend session", error);
    }
  }

  /**
   * Check if user has reached session limit
   */
  async checkSessionLimit(userId: string): Promise<{
    hasReachedLimit: boolean;
    activeSessionCount: number;
    maxSessions: number;
  }> {
    try {
      const activeSessions = await this.sessionRepository.findActiveSessionsByUserId(userId);
      
      return {
        hasReachedLimit: activeSessions.length >= this.MAX_SESSIONS_PER_USER,
        activeSessionCount: activeSessions.length,
        maxSessions: this.MAX_SESSIONS_PER_USER,
      };
    } catch (error) {
      this.logger.error("Error checking session limit", { error, userId });
      this.handleError("Failed to check session limit", error);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle service errors
   */
  protected handleError(message: string, error: any): never {
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError(
      message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.SESSION_ERROR
    );
  }

  /**
   * Invalidate all user sessions
   */
  async invalidateAllUserSessions(userId: string): Promise<number> {
    return await this.logoutAllSessions(userId);
  }

  /**
   * Invalidate specific session
   */
  async invalidateSession(sessionId: string): Promise<boolean> {
    return await this.logout(sessionId);
  }

  /**
   * Invalidate session by access token
   */
  async invalidateSessionByAccessToken(accessToken: string): Promise<boolean> {
    try {
      const session = await this.sessionRepository.findByAccessToken(accessToken);
      if (!session) {
        return false;
      }
      return await this.logout(session.sessionId);
    } catch (error) {
      this.logger.error("Error invalidating session by access token", { error });
      return false;
    }
  }
}