import jwt from "jsonwebtoken";
import { config } from "../../config/environment";
import { JWTPayload } from "../../types";
import { AppError, HTTP_STATUS, ERROR_CODES } from "../../types/api.types";

export class JWTService {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiresIn: string;
  private refreshTokenExpiresIn: string;

  constructor() {
    this.accessTokenSecret = config.jwt.secret;
    this.refreshTokenSecret = config.jwt.refreshSecret;
    this.accessTokenExpiresIn = config.jwt.expiresIn;
    this.refreshTokenExpiresIn = config.jwt.refreshExpiresIn;
  }

  /**
   * Generate access token
   */
  async generateAccessToken(
    payload: Omit<JWTPayload, "iat" | "exp">
  ): Promise<string> {
    try {
      return jwt.sign(payload, this.accessTokenSecret, {
        expiresIn: this.accessTokenExpiresIn,
        issuer: "bareloft-api",
        audience: "bareloft-client",
      });
    } catch (error) {
      console.error("Error generating access token:", error);
      throw new AppError(
        "Failed to generate access token",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Generate refresh token
   */
  async generateRefreshToken(
    payload: Omit<JWTPayload, "iat" | "exp">
  ): Promise<string> {
    try {
      return jwt.sign(payload, this.refreshTokenSecret, {
        expiresIn: this.refreshTokenExpiresIn,
        issuer: "bareloft-api",
        audience: "bareloft-client",
      });
    } catch (error) {
      console.error("Error generating refresh token:", error);
      throw new AppError(
        "Failed to generate refresh token",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret, {
        issuer: "bareloft-api",
        audience: "bareloft-client",
      }) as JWTPayload;

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError(
          "Access token has expired",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.TOKEN_EXPIRED
        );
      }

      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError(
          "Invalid access token",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.TOKEN_INVALID
        );
      }

      console.error("Error verifying access token:", error);
      throw new AppError(
        "Failed to verify access token",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.TOKEN_INVALID
      );
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token: string): Promise<JWTPayload> {
    try {
      const payload = jwt.verify(token, this.refreshTokenSecret, {
        issuer: "bareloft-api",
        audience: "bareloft-client",
      }) as JWTPayload;

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError(
          "Refresh token has expired",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.TOKEN_EXPIRED
        );
      }

      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError(
          "Invalid refresh token",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.TOKEN_INVALID
        );
      }

      console.error("Error verifying refresh token:", error);
      throw new AppError(
        "Failed to verify refresh token",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.TOKEN_INVALID
      );
    }
  }

  /**
   * Decode token without verification (for extracting payload)
   */
  decodeToken(token: string): JWTPayload {
    try {
      const payload = jwt.decode(token) as JWTPayload;
      if (!payload) {
        throw new Error("Invalid token format");
      }
      return payload;
    } catch (error) {
      throw new AppError(
        "Invalid token format",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    try {
      const payload = this.decodeToken(token);
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): Date {
    try {
      const payload = this.decodeToken(token);
      return new Date(payload.exp * 1000);
    } catch (error) {
      throw new AppError(
        "Invalid token format",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }
  }

  /**
   * Get access token expires in seconds
   */
  getAccessTokenExpiresIn(): number {
    // Convert duration string to seconds
    const duration = this.accessTokenExpiresIn;
    if (duration.endsWith("m")) {
      return parseInt(duration.slice(0, -1)) * 60;
    }
    if (duration.endsWith("h")) {
      return parseInt(duration.slice(0, -1)) * 3600;
    }
    if (duration.endsWith("d")) {
      return parseInt(duration.slice(0, -1)) * 86400;
    }
    return parseInt(duration); // Assume seconds
  }

  /**
   * Get refresh token expires in seconds
   */
  getRefreshTokenExpiresIn(): number {
    const duration = this.refreshTokenExpiresIn;
    if (duration.endsWith("d")) {
      return parseInt(duration.slice(0, -1)) * 86400;
    }
    if (duration.endsWith("h")) {
      return parseInt(duration.slice(0, -1)) * 3600;
    }
    if (duration.endsWith("m")) {
      return parseInt(duration.slice(0, -1)) * 60;
    }
    return parseInt(duration); // Assume seconds
  }

  /**
   * Generate token pair (access + refresh)
   */
  async generateTokenPair(payload: Omit<JWTPayload, "iat" | "exp">): Promise<{
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresIn: number;
    refreshTokenExpiresIn: number;
  }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(payload),
    ]);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: this.getAccessTokenExpiresIn(),
      refreshTokenExpiresIn: this.getRefreshTokenExpiresIn(),
    };
  }

  /**
   * Extract user ID from token
   */
  extractUserId(token: string): string {
    try {
      const payload = this.decodeToken(token);
      return payload.userId;
    } catch (error) {
      throw new AppError(
        "Invalid token format",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }
  }

  /**
   * Extract session ID from token
   */
  extractSessionId(token: string): string {
    try {
      const payload = this.decodeToken(token);
      return payload.sessionId;
    } catch (error) {
      throw new AppError(
        "Invalid token format",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }
  }

  /**
   * Validate token format without verification
   */
  isValidTokenFormat(token: string): boolean {
    try {
      // JWT should have 3 parts separated by dots
      const parts = token.split(".");
      if (parts.length !== 3) {
        return false;
      }

      // Try to decode header and payload
      JSON.parse(Buffer.from(parts[0], "base64url").toString());
      JSON.parse(Buffer.from(parts[1], "base64url").toString());

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get token type from header
   */
  getTokenType(token: string): "access" | "refresh" | "unknown" {
    try {
      const header = JSON.parse(
        Buffer.from(token.split(".")[0], "base64url").toString()
      );

      // You can add custom headers to distinguish token types
      if (header.typ === "JWT") {
        const payload = this.decodeToken(token);
        const currentTime = Math.floor(Date.now() / 1000);
        const timeToExpiry = payload.exp - currentTime;

        // If expires in less than 1 hour, likely an access token
        if (timeToExpiry < 3600) {
          return "access";
        } else {
          return "refresh";
        }
      }

      return "unknown";
    } catch (error) {
      return "unknown";
    }
  }
}
