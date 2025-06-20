/**
 * 🔐 Authentication Middleware
 * Validates JWT tokens and sets user context
 * Nigerian market optimized with mobile-friendly error messages
 */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRepository } from "../../repositories/UserRepository";
import { SessionRepository } from "../../repositories/SessionRepository";
import { environment } from "../../config/environment";
import { logger } from "../../utils/logger/winston";
import { UserRole } from "../../types/user.types";

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
      return res.status(401).json({
        success: false,
        error: "AUTHENTICATION_REQUIRED",
        message: "Please log in to access this resource",
        code: "AUTH_001",
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "INVALID_TOKEN",
        message: "Authentication token is missing",
        code: "AUTH_002",
      });
    }

    // Verify JWT token
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, environment.JWT_SECRET) as JWTPayload;
    } catch (jwtError) {
      logger.warn("Invalid JWT token", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        path: req.path,
        error:
          jwtError instanceof Error ? jwtError.message : "Unknown JWT error",
      });

      if (jwtError instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          error: "TOKEN_EXPIRED",
          message: "Your session has expired. Please log in again",
          code: "AUTH_003",
        });
      }

      return res.status(401).json({
        success: false,
        error: "INVALID_TOKEN",
        message: "Invalid authentication token",
        code: "AUTH_004",
      });
    }

    // Validate token type
    if (decoded.type !== "access") {
      return res.status(401).json({
        success: false,
        error: "INVALID_TOKEN_TYPE",
        message: "Invalid token type for this request",
        code: "AUTH_005",
      });
    }

    // Check if session exists and is valid
    const sessionRepo = new SessionRepository();
    const session = await sessionRepo.findById(decoded.sessionId);

    if (!session || session.expiresAt < new Date()) {
      logger.warn("Invalid or expired session", {
        sessionId: decoded.sessionId,
        userId: decoded.userId,
        ip: req.ip,
      });

      return res.status(401).json({
        success: false,
        error: "SESSION_EXPIRED",
        message: "Your session has expired. Please log in again",
        code: "AUTH_006",
      });
    }

    // Get user details
    const userRepo = new UserRepository();
    const user = await userRepo.findById(decoded.userId);

    if (!user) {
      logger.error("User not found for valid token", {
        userId: decoded.userId,
        sessionId: decoded.sessionId,
      });

      return res.status(401).json({
        success: false,
        error: "USER_NOT_FOUND",
        message: "User account not found",
        code: "AUTH_007",
      });
    }

    // Check if user account is active
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        error: "ACCOUNT_NOT_VERIFIED",
        message: "Please verify your account to continue",
        code: "AUTH_008",
      });
    }

    // Set user context in request
    req.user = {
      id: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isVerified: user.isVerified,
      sessionId: session.id,
    };

    // Update session last activity
    await sessionRepo.updateLastActivity(session.id);

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
    return next();
  }

  // If token is provided, try to authenticate
  // But don't fail if authentication fails
  try {
    await authenticate(req, res, next);
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
