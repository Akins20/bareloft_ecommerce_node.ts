/**
 * Optional Authentication Middleware
 * Supports both authenticated users and guest sessions
 * Used for cart operations that should work for both cases
 */

import { Request, Response, NextFunction } from "express";
import { JWTService } from "../../services/auth/JWTService";
import { AuthenticatedRequest } from "../../types/auth.types";
import { logger } from "../../utils/logger/winston";
import { randomUUID } from "crypto";

interface OptionalAuthRequest extends AuthenticatedRequest {
  sessionId?: string;
  isGuest?: boolean;
}

export const optionalAuth = async (
  req: OptionalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const sessionId = req.headers["x-session-id"] as string;

    // Try to authenticate if token is provided
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      
      try {
        const jwtService = new JWTService();
        const decoded = await jwtService.verifyAccessToken(token);
        
        if (decoded && decoded.userId) {
          req.user = {
            id: decoded.userId,
            userId: decoded.userId,
            phoneNumber: decoded.phoneNumber,
            firstName: "", // Will be populated from database if needed
            lastName: "", // Will be populated from database if needed
            role: decoded.role,
            isVerified: true, // If JWT is valid, user is verified
            sessionId: decoded.sessionId,
            createdAt: new Date()
          };
          req.isGuest = false;
          
          logger.info("Authenticated user access", {
            userId: decoded.userId,
            endpoint: req.path
          });
        }
      } catch (error) {
        // Token is invalid, but that's okay for optional auth
        logger.warn("Invalid token in optional auth", {
          error: error instanceof Error ? error.message : "Unknown error",
          endpoint: req.path
        });
      }
    }

    // Handle guest session
    if (!req.user) {
      // Use existing session ID if provided, otherwise generate new one
      if (sessionId) {
        req.sessionId = sessionId;
      } else {
        req.sessionId = `guest_${randomUUID()}`;
        // Always return session ID in response headers for client to store
        res.setHeader("X-Session-ID", req.sessionId);
      }
      req.isGuest = true;
      
      logger.info("Guest user access", {
        sessionId: req.sessionId,
        isNewSession: !sessionId,
        endpoint: req.path
      });
    }

    next();
  } catch (error) {
    logger.error("Error in optional auth middleware", {
      error: error instanceof Error ? error.message : "Unknown error",
      endpoint: req.path
    });
    
    // For optional auth, continue even on error
    req.sessionId = `guest_${randomUUID()}`;
    req.isGuest = true;
    next();
  }
};

export default optionalAuth;