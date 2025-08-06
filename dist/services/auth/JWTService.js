"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTService = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const environment_1 = require("../../config/environment");
const api_types_1 = require("../../types/api.types");
class JWTService {
    accessTokenSecret;
    refreshTokenSecret;
    accessTokenExpiresIn;
    refreshTokenExpiresIn;
    constructor() {
        this.accessTokenSecret = environment_1.config.jwt.secret;
        this.refreshTokenSecret = environment_1.config.jwt.refreshSecret;
        this.accessTokenExpiresIn = environment_1.config.jwt.expiresIn;
        this.refreshTokenExpiresIn = environment_1.config.jwt.refreshExpiresIn;
    }
    /**
     * Generate access token
     */
    async generateAccessToken(payload) {
        try {
            return jwt.sign(payload, this.accessTokenSecret, {
                expiresIn: this.accessTokenExpiresIn,
                issuer: "bareloft-api",
                audience: "bareloft-client",
            });
        }
        catch (error) {
            console.error("Error generating access token:", error);
            throw new api_types_1.AppError("Failed to generate access token", api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    /**
     * Generate refresh token
     */
    async generateRefreshToken(payload) {
        try {
            return jwt.sign(payload, this.refreshTokenSecret, {
                expiresIn: this.refreshTokenExpiresIn,
                issuer: "bareloft-api",
                audience: "bareloft-client",
            });
        }
        catch (error) {
            console.error("Error generating refresh token:", error);
            throw new api_types_1.AppError("Failed to generate refresh token", api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    /**
     * Verify access token
     */
    async verifyAccessToken(token) {
        try {
            const payload = jwt.verify(token, this.accessTokenSecret, {
                issuer: "bareloft-api",
                audience: "bareloft-client",
            });
            return payload;
        }
        catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new api_types_1.AppError("Access token has expired", api_types_1.HTTP_STATUS.UNAUTHORIZED, api_types_1.ERROR_CODES.TOKEN_EXPIRED);
            }
            if (error instanceof jwt.JsonWebTokenError) {
                throw new api_types_1.AppError("Invalid access token", api_types_1.HTTP_STATUS.UNAUTHORIZED, api_types_1.ERROR_CODES.TOKEN_INVALID);
            }
            console.error("Error verifying access token:", error);
            throw new api_types_1.AppError("Failed to verify access token", api_types_1.HTTP_STATUS.UNAUTHORIZED, api_types_1.ERROR_CODES.TOKEN_INVALID);
        }
    }
    /**
     * Verify refresh token
     */
    async verifyRefreshToken(token) {
        try {
            const payload = jwt.verify(token, this.refreshTokenSecret, {
                issuer: "bareloft-api",
                audience: "bareloft-client",
            });
            return payload;
        }
        catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new api_types_1.AppError("Refresh token has expired", api_types_1.HTTP_STATUS.UNAUTHORIZED, api_types_1.ERROR_CODES.TOKEN_EXPIRED);
            }
            if (error instanceof jwt.JsonWebTokenError) {
                throw new api_types_1.AppError("Invalid refresh token", api_types_1.HTTP_STATUS.UNAUTHORIZED, api_types_1.ERROR_CODES.TOKEN_INVALID);
            }
            console.error("Error verifying refresh token:", error);
            throw new api_types_1.AppError("Failed to verify refresh token", api_types_1.HTTP_STATUS.UNAUTHORIZED, api_types_1.ERROR_CODES.TOKEN_INVALID);
        }
    }
    /**
     * Decode token without verification (for extracting payload)
     */
    decodeToken(token) {
        try {
            const payload = jwt.decode(token);
            if (!payload) {
                throw new Error("Invalid token format");
            }
            return payload;
        }
        catch (error) {
            throw new api_types_1.AppError("Invalid token format", api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.INVALID_INPUT);
        }
    }
    /**
     * Check if token is expired
     */
    isTokenExpired(token) {
        try {
            const payload = this.decodeToken(token);
            const currentTime = Math.floor(Date.now() / 1000);
            return payload.exp < currentTime;
        }
        catch (error) {
            return true;
        }
    }
    /**
     * Get token expiration time
     */
    getTokenExpiration(token) {
        try {
            const payload = this.decodeToken(token);
            return new Date(payload.exp * 1000);
        }
        catch (error) {
            throw new api_types_1.AppError("Invalid token format", api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.INVALID_INPUT);
        }
    }
    /**
     * Get access token expires in seconds
     */
    getAccessTokenExpiresIn() {
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
    getRefreshTokenExpiresIn() {
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
    async generateTokenPair(payload) {
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
    extractUserId(token) {
        try {
            const payload = this.decodeToken(token);
            return payload.userId;
        }
        catch (error) {
            throw new api_types_1.AppError("Invalid token format", api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.INVALID_INPUT);
        }
    }
    /**
     * Extract session ID from token
     */
    extractSessionId(token) {
        try {
            const payload = this.decodeToken(token);
            return payload.sessionId;
        }
        catch (error) {
            throw new api_types_1.AppError("Invalid token format", api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.INVALID_INPUT);
        }
    }
    /**
     * Validate token format without verification
     */
    isValidTokenFormat(token) {
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
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get token type from header
     */
    getTokenType(token) {
        try {
            const header = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());
            // You can add custom headers to distinguish token types
            if (header.typ === "JWT") {
                const payload = this.decodeToken(token);
                const currentTime = Math.floor(Date.now() / 1000);
                const timeToExpiry = payload.exp - currentTime;
                // If expires in less than 1 hour, likely an access token
                if (timeToExpiry < 3600) {
                    return "access";
                }
                else {
                    return "refresh";
                }
            }
            return "unknown";
        }
        catch (error) {
            return "unknown";
        }
    }
}
exports.JWTService = JWTService;
//# sourceMappingURL=JWTService.js.map