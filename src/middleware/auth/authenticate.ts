/**
 * 🔐 Authentication Middleware
 * Validates JWT tokens and sets user context
 * Nigerian market optimized with mobile-friendly error messages
 */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRepository } from "../../repositories/UserRepository";
import { SessionRepository } from "../../repositories/SessionRepository";
import { config } from "../../config/environment";
import { logger } from "../../utils/logger/winston";
import { UserRole } from "../../types/user.types";
import { getServiceContainer } from "../../config/serviceContainer";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phoneNumber: string;
        email?: string;
        firstName: string;
        lastName: string;
        role: UserRole;
        isVerified: boolean;
        sessionId?: string;
      };
    }
  }
}

interface JWTPayload {
  userId: string;
  sessionId: string;
  role: UserRole;
  type: "access" | "refresh";
  iat: number;
  exp: number;
}

/**
 * 🔐 Main Authentication Middleware
 * Validates access tokens and sets user context
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: "AUTHENTICATION_REQUIRED",
        message: "Please log in to access this resource",
        code: "AUTH_001",
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      res.status(401).json({
        success: false,
        error: "INVALID_TOKEN",
        message: "Authentication token is missing",
        code: "AUTH_002",
      });
      return;
    }

    // Verify JWT token
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
    } catch (jwtError) {
      logger.warn("Invalid JWT token", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        path: req.path,
        error:
          jwtError instanceof Error ? jwtError.message : "Unknown JWT error",
      });

      if (jwtError instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          error: "TOKEN_EXPIRED",
          message: "Your session has expired. Please log in again",
          code: "AUTH_003",
        });
        return;
      }

      res.status(401).json({
        success: false,
        error: "INVALID_TOKEN",
        message: "Invalid authentication token",
        code: "AUTH_004",
      });
      return;
    }

    // Validate token type
    if (decoded.type !== "access") {
      res.status(401).json({
        success: false,
        error: "INVALID_TOKEN_TYPE",
        message: "Invalid token type for this request",
        code: "AUTH_005",
      });
      return;
    }

    // Check if session exists and is valid
    const serviceContainer = getServiceContainer();
    const sessionRepo = serviceContainer.getService<SessionRepository>('sessionRepository');
    const session = await sessionRepo.findBySessionId(decoded.sessionId);

    if (!session || session.expiresAt < new Date()) {
      logger.warn("Invalid or expired session", {
        sessionId: decoded.sessionId,
        userId: decoded.userId,
        ip: req.ip,
      });

      res.status(401).json({
        success: false,
        error: "SESSION_EXPIRED",
        message: "Your session has expired. Please log in again",
        code: "AUTH_006",
      });
      return;
    }

    // Get user details
    const userRepo = serviceContainer.getService<UserRepository>('userRepository');
    const user = await userRepo.findById(decoded.userId);

    if (!user) {
      logger.error("User not found for valid token", {
        userId: decoded.userId,
        sessionId: decoded.sessionId,
      });

      res.status(401).json({
        success: false,
        error: "USER_NOT_FOUND",
        message: "User account not found",
        code: "AUTH_007",
      });
      return;
    }

    // Check if user account is active
    if (!user.isVerified) {
      res.status(401).json({
        success: false,
        error: "ACCOUNT_NOT_VERIFIED",
        message: "Please verify your account to continue",
        code: "AUTH_008",
      });
      return;
    }

    // Set user context in request
    req.user = {
      id: user.id,
      phoneNumber: user.phoneNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isVerified: user.isVerified,
      sessionId: session.id,
    };
    
    // Only include email if it exists
    if (user.email) {
      req.user.email = user.email;
    }

    // Update session last activity
    await sessionRepo.updateLastUsed(session.id);

    logger.debug("User authenticated successfully", {
      userId: user.id,
      sessionId: session.id,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    logger.error("Authentication middleware error", {
      error: error instanceof Error ? error.message : "Unknown error",
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    res.status(500).json({
      success: false,
      error: "AUTHENTICATION_ERROR",
      message: "Authentication service temporarily unavailable",
      code: "AUTH_500",
    });
  }
};

/**
 * 🔓 Optional Authentication Middleware
 * Sets user context if token is provided, but doesn't require it
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  // If no token provided, continue without authentication
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  // If token is provided, try to authenticate
  // But don't fail if authentication fails
  try {
    await authenticate(req, res, (error?: any) => {
      if (error) {
        // Log the error but continue without authentication
        logger.warn("Optional authentication failed", {
          error: error instanceof Error ? error.message : "Unknown error",
          path: req.path,
          ip: req.ip,
        });
      }
      next();
    });
  } catch (error) {
    // Log the error but continue without authentication
    logger.warn("Optional authentication failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      path: req.path,
      ip: req.ip,
    });
    next();
  }
};
