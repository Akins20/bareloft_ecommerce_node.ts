/**
 * Sliding Session Middleware
 * 
 * Implements activity-based session extension for improved user experience:
 * - Extends token expiry when user is active
 * - No new tokens needed - just updates expiry in database
 * - Prevents frequent logouts during active browsing
 * - Maintains security by logging out inactive users
 * 
 * Author: Bareloft Development Team
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../../config/environment';
import { getServiceContainer } from '../../config/serviceContainer';
import { SessionService } from '../../services/auth/SessionService';
import { JWTService } from '../../services/auth/JWTService';
import { AuthenticatedRequest } from '../../types/auth.types';

// Sliding session configuration
export const SLIDING_SESSION_CONFIG = {
  // Extend token if it expires within this threshold
  EXTENSION_THRESHOLD: 24 * 60 * 60, // 1 day in seconds

  // Add this much time when extending
  EXTENSION_PERIOD: 3 * 24 * 60 * 60, // 3 days in seconds

  // Maximum inactive time before forced logout
  MAX_INACTIVE_DAYS: 7,

  // Only check/update every N requests to reduce DB calls
  CHECK_FREQUENCY: 50, // Check every 50th request per user (reduced from 10)
} as const;

// Track request counts per user (in-memory cache)
const userRequestCounts = new Map<string, number>();

/**
 * Sliding Session Middleware
 * 
 * This middleware runs AFTER authentication and:
 * 1. Checks if the token needs extension (< 1 day remaining)
 * 2. Extends session in database without issuing new token
 * 3. Updates user's last activity timestamp
 * 4. Implements request frequency optimization
 */
export const slidingSessionMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Skip if user is not authenticated
    if (!req.user?.id || !req.token) {
      return next();
    }

    const userId = req.user.id;
    const sessionId = req.user.sessionId;

    // Implement request frequency check to reduce database calls
    const currentCount = userRequestCounts.get(userId) || 0;
    const newCount = currentCount + 1;
    userRequestCounts.set(userId, newCount);

    // Only perform extension check every Nth request
    if (newCount % SLIDING_SESSION_CONFIG.CHECK_FREQUENCY !== 0) {
      return next();
    }

    // Get services
    const serviceContainer = getServiceContainer();
    const jwtService = serviceContainer.getService<JWTService>('jwtService');
    const sessionService = serviceContainer.getService<SessionService>('sessionService');

    // Decode token to get expiry
    const tokenPayload = jwtService.decodeToken(req.token);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = tokenPayload.exp - currentTime;

    // Check if token needs extension
    const shouldExtend = timeUntilExpiry < SLIDING_SESSION_CONFIG.EXTENSION_THRESHOLD;

    if (shouldExtend) {
      // Calculate new expiry time
      const newExpiryTime = new Date(
        Date.now() + (SLIDING_SESSION_CONFIG.EXTENSION_PERIOD * 1000)
      );

      // Extend session in database (no new token needed)
      await sessionService.extendSession(sessionId, newExpiryTime);

      // Log the extension for monitoring
      console.log(`🔄 Session extended for user ${userId}: ${timeUntilExpiry}s remaining -> +${SLIDING_SESSION_CONFIG.EXTENSION_PERIOD}s`);
    }

    // Update last activity timestamp (for inactive user cleanup)
    // Fire and forget - don't wait for this to complete
    sessionService.updateLastActivity(sessionId).catch(err => {
      console.error('Failed to update last activity:', err);
    });

    next();

  } catch (error) {
    // Don't break the request if sliding session fails
    console.error('❌ Sliding session middleware error:', error);
    next();
  }
};

/**
 * Cleanup inactive sessions (run via CRON job)
 * This should be called periodically to clean up old sessions
 */
export const cleanupInactiveSessions = async (): Promise<void> => {
  try {
    const serviceContainer = getServiceContainer();
    const sessionService = serviceContainer.getService<SessionService>('sessionService');

    const cutoffDate = new Date(
      Date.now() - (SLIDING_SESSION_CONFIG.MAX_INACTIVE_DAYS * 24 * 60 * 60 * 1000)
    );

    const cleanedCount = await sessionService.cleanupInactiveSessions(cutoffDate);
    
    console.log(`🧹 Cleaned up ${cleanedCount} inactive sessions older than ${SLIDING_SESSION_CONFIG.MAX_INACTIVE_DAYS} days`);

  } catch (error) {
    console.error('❌ Error cleaning up inactive sessions:', error);
  }
};

/**
 * Get sliding session statistics (for monitoring)
 */
export const getSlidingSessionStats = (): {
  activeUsers: number;
  totalRequests: number;
  config: typeof SLIDING_SESSION_CONFIG;
} => {
  const totalRequests = Array.from(userRequestCounts.values()).reduce((sum, count) => sum + count, 0);
  
  return {
    activeUsers: userRequestCounts.size,
    totalRequests,
    config: SLIDING_SESSION_CONFIG,
  };
};

/**
 * Clear request count cache (call periodically to prevent memory leaks)
 */
export const clearRequestCountCache = (): void => {
  userRequestCounts.clear();
  console.log('🧹 Cleared sliding session request count cache');
};