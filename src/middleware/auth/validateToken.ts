import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { environment } from "../../config/environment";
import { SessionRepository } from "../../repositories/SessionRepository";
import { logger } from "../../utils/logger/winston";

interface TokenValidationOptions {
  required?: boolean;
  allowRefreshToken?: boolean;
  checkSession?: boolean;
  skipExpiredCheck?: boolean;
}

/**
 * 🔍 Advanced token validation middleware
 * Provides flexible token validation for different use cases
 */
export const validateToken = (options: TokenValidationOptions = {}) => {
  const {
    required = true,
    allowRefreshToken = false,
    checkSession = true,
    skipExpiredCheck = false,
  } = options;

  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      // Handle missing token
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        if (required) {
          return res.status(401).json({
            success: false,
            error: "TOKEN_REQUIRED",
            message: "Authentication token is required",
            code: "TOKEN_001",
          });
        }
        return next();
      }

      const token = authHeader.substring(7);

      // Verify token structure and signature
      let decoded: any;
      try {
        decoded = jwt.verify(token, environment.JWT_SECRET, {
          ignoreExpiration: skipExpiredCheck,
        });
      } catch (jwtError) {
        const errorType =
          jwtError instanceof jwt.TokenExpiredError ? "EXPIRED" : "INVALID";

        logger.warn(`Token validation failed: ${errorType}`, {
          ip: req.ip,
          path: req.path,
          error: jwtError instanceof Error ? jwtError.message : "Unknown error",
        });

        return res.status(401).json({
          success: false,
          error: `TOKEN_${errorType}`,
          message:
            errorType === "EXPIRED"
              ? "Token has expired"
              : "Invalid token format",
          code: errorType === "EXPIRED" ? "TOKEN_002" : "TOKEN_003",
        });
      }

      // Validate token type
      if (!allowRefreshToken && decoded.type === "refresh") {
        return res.status(401).json({
          success: false,
          error: "INVALID_TOKEN_TYPE",
          message: "Refresh token cannot be used for API access",
          code: "TOKEN_004",
        });
      }

      // Check session validity if required
      if (checkSession && decoded.sessionId) {
        const sessionRepo = new SessionRepository();
        const session = await sessionRepo.findById(decoded.sessionId);

        if (!session || session.expiresAt < new Date()) {
          return res.status(401).json({
            success: false,
            error: "SESSION_INVALID",
            message: "Session is no longer valid",
            code: "TOKEN_005",
          });
        }
      }

      // Attach decoded token to request
      req.token = decoded;
      next();
    } catch (error) {
      logger.error("Token validation middleware error", {
        error: error instanceof Error ? error.message : "Unknown error",
        path: req.path,
        ip: req.ip,
      });

      res.status(500).json({
        success: false,
        error: "TOKEN_VALIDATION_ERROR",
        message: "Token validation service unavailable",
        code: "TOKEN_500",
      });
    }
  };
};

/**
 * 🔄 Refresh token validation middleware
 * Specifically for token refresh endpoints
 */
export const validateRefreshToken = validateToken({
  required: true,
  allowRefreshToken: true,
  checkSession: true,
  skipExpiredCheck: false,
});

/**
 * 📱 API key validation middleware
 * For mobile app or third-party integrations
 */
export const validateApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: "API_KEY_REQUIRED",
      message: "API key is required",
      code: "API_001",
    });
  }

  // Validate API key format and existence
  const validApiKeys = environment.VALID_API_KEYS?.split(",") || [];

  if (!validApiKeys.includes(apiKey)) {
    logger.warn("Invalid API key used", {
      apiKey: apiKey.substring(0, 8) + "...", // Log partial key for security
      ip: req.ip,
      path: req.path,
    });

    return res.status(401).json({
      success: false,
      error: "INVALID_API_KEY",
      message: "Invalid API key",
      code: "API_002",
    });
  }

  // Set API key info in request
  req.apiKey = apiKey;
  next();
};

// Extend Request type for token and API key
declare global {
  namespace Express {
    interface Request {
      token?: any;
      apiKey?: string;
    }
  }
}
