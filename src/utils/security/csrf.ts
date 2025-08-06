import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { redisClient } from "../../config/redis";
import { AuthenticatedRequest } from "../../types/auth.types";

/**
 * CSRF (Cross-Site Request Forgery) Protection Utility
 */
export class CSRFProtection {
  private static readonly TOKEN_LENGTH = 32;
  private static readonly SECRET_LENGTH = 128;
  private static readonly TOKEN_EXPIRY = 3600; // 1 hour in seconds
  private static readonly HEADER_NAME = "x-csrf-token";
  private static readonly COOKIE_NAME = "csrf-token";

  /**
   * Generate a CSRF token
   */
  static generateToken(): string {
    return crypto.randomBytes(this.TOKEN_LENGTH).toString("hex");
  }

  /**
   * Generate a CSRF secret
   */
  static generateSecret(): string {
    return crypto.randomBytes(this.SECRET_LENGTH).toString("hex");
  }

  /**
   * Create CSRF token hash using secret
   */
  static createTokenHash(token: string, secret: string): string {
    return crypto.createHmac("sha256", secret).update(token).digest("hex");
  }

  /**
   * Verify CSRF token against secret
   */
  static verifyToken(token: string, secret: string, hash: string): boolean {
    const expectedHash = this.createTokenHash(token, secret);
    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(expectedHash, "hex")
    );
  }

  /**
   * Store CSRF token in Redis with expiry
   */
  static async storeToken(
    sessionId: string,
    token: string,
    secret: string
  ): Promise<void> {
    const tokenHash = this.createTokenHash(token, secret);
    const key = `csrf:${sessionId}`;

    await redisClient.set(
      key,
      JSON.stringify({
        token,
        hash: tokenHash,
        secret,
        createdAt: new Date().toISOString(),
      }),
      this.TOKEN_EXPIRY
    );
  }

  /**
   * Retrieve and verify CSRF token from Redis
   */
  static async validateStoredToken(
    sessionId: string,
    providedToken: string
  ): Promise<boolean> {
    try {
      const key = `csrf:${sessionId}`;
      const stored = await redisClient.get<{
        token: string;
        hash: string;
        secret: string;
        createdAt: string;
      }>(key);

      if (!stored) {
        return false;
      }

      // Verify the token
      return this.verifyToken(providedToken, stored.secret, stored.hash);
    } catch (error) {
      console.error("CSRF token validation error:", error);
      return false;
    }
  }

  /**
   * Generate CSRF token for session
   */
  static async generateTokenForSession(sessionId: string): Promise<string> {
    const token = this.generateToken();
    const secret = this.generateSecret();

    await this.storeToken(sessionId, token, secret);

    return token;
  }

  /**
   * Invalidate CSRF token for session
   */
  static async invalidateToken(sessionId: string): Promise<void> {
    const key = `csrf:${sessionId}`;
    await redisClient.delete(key);
  }

  /**
   * Middleware for CSRF protection
   */
  static middleware(
    options: {
      ignoreMethods?: string[];
      headerName?: string;
      cookieName?: string;
      skipPaths?: string[];
    } = {}
  ) {
    const {
      ignoreMethods = ["GET", "HEAD", "OPTIONS"],
      headerName = this.HEADER_NAME,
      cookieName = this.COOKIE_NAME,
      skipPaths = [],
    } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Skip CSRF protection for certain methods
        if (ignoreMethods.includes(req.method.toUpperCase())) {
          return next();
        }

        // Skip CSRF protection for certain paths
        if (skipPaths.some((path) => req.path.startsWith(path))) {
          return next();
        }

        // Get session ID from request
        const sessionId =
          (req as AuthenticatedRequest).sessionId || (req.headers["x-session-id"] as string);

        if (!sessionId) {
          return res.status(403).json({
            success: false,
            message: "CSRF protection requires session",
            error: { code: "CSRF_NO_SESSION" },
          });
        }

        // Get CSRF token from header or body
        const token =
          (req.headers[headerName] as string) ||
          req.body._csrf ||
          (req.query._csrf as string);

        if (!token) {
          return res.status(403).json({
            success: false,
            message: "CSRF token missing",
            error: { code: "CSRF_TOKEN_MISSING" },
          });
        }

        // Validate token
        const isValid = await this.validateStoredToken(sessionId, token);

        if (!isValid) {
          return res.status(403).json({
            success: false,
            message: "Invalid CSRF token",
            error: { code: "CSRF_TOKEN_INVALID" },
          });
        }

        next();
      } catch (error) {
        console.error("CSRF middleware error:", error);
        res.status(500).json({
          success: false,
          message: "CSRF protection error",
          error: { code: "CSRF_INTERNAL_ERROR" },
        });
      }
    };
  }

  /**
   * Generate CSRF token endpoint
   */
  static async generateTokenEndpoint(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const sessionId =
        (req as AuthenticatedRequest).sessionId || (req.headers["x-session-id"] as string);

      if (!sessionId) {
        res.status(400).json({
          success: false,
          message: "Session required for CSRF token generation",
          error: { code: "CSRF_NO_SESSION" },
        });
        return;
      }

      const token = await this.generateTokenForSession(sessionId);

      res.json({
        success: true,
        message: "CSRF token generated",
        data: {
          token,
          headerName: this.HEADER_NAME,
          expiresIn: this.TOKEN_EXPIRY,
        },
      });
    } catch (error) {
      console.error("CSRF token generation error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate CSRF token",
        error: { code: "CSRF_GENERATION_ERROR" },
      });
    }
  }

  /**
   * Double Submit Cookie pattern implementation
   */
  static doubleSubmitCookieMiddleware(
    options: {
      cookieName?: string;
      secure?: boolean;
      sameSite?: "strict" | "lax" | "none";
    } = {}
  ) {
    const {
      cookieName = this.COOKIE_NAME,
      secure = process.env.NODE_ENV === "production",
      sameSite = "strict",
    } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // For safe methods, generate and set cookie
        if (["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase())) {
          const token = this.generateToken();

          res.cookie(cookieName, token, {
            httpOnly: false, // Must be accessible to JavaScript
            secure,
            sameSite,
            maxAge: this.TOKEN_EXPIRY * 1000,
          });

          return next();
        }

        // For unsafe methods, verify token
        const cookieToken = req.cookies[cookieName];
        const headerToken = req.headers[this.HEADER_NAME] as string;

        if (!cookieToken || !headerToken) {
          return res.status(403).json({
            success: false,
            message: "CSRF token required in both cookie and header",
            error: { code: "CSRF_DOUBLE_SUBMIT_MISSING" },
          });
        }

        if (cookieToken !== headerToken) {
          return res.status(403).json({
            success: false,
            message: "CSRF token mismatch",
            error: { code: "CSRF_DOUBLE_SUBMIT_MISMATCH" },
          });
        }

        next();
      } catch (error) {
        console.error("CSRF double submit middleware error:", error);
        res.status(500).json({
          success: false,
          message: "CSRF protection error",
          error: { code: "CSRF_INTERNAL_ERROR" },
        });
      }
    };
  }

  /**
   * Cleanup expired tokens (run periodically)
   */
  static async cleanupExpiredTokens(): Promise<void> {
    try {
      // This would typically be handled by Redis TTL automatically
      // But you can implement custom cleanup logic here if needed
      console.log("CSRF token cleanup completed");
    } catch (error) {
      console.error("CSRF token cleanup error:", error);
    }
  }
}

export default CSRFProtection;
