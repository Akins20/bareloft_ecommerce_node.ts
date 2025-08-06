"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateApiKey = exports.validateRefreshToken = exports.validateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const environment_1 = require("../../config/environment");
const SessionRepository_1 = require("../../repositories/SessionRepository");
const winston_1 = require("../../utils/logger/winston");
/**
 * 🔍 Advanced token validation middleware
 * Provides flexible token validation for different use cases
 */
const validateToken = (options = {}) => {
    const { required = true, allowRefreshToken = false, checkSession = true, skipExpiredCheck = false, } = options;
    return async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            // Handle missing token
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                if (required) {
                    res.status(401).json({
                        success: false,
                        error: "TOKEN_REQUIRED",
                        message: "Authentication token is required",
                        code: "TOKEN_001",
                    });
                    return;
                }
                return next();
            }
            const token = authHeader.substring(7);
            // Verify token structure and signature
            let decoded;
            try {
                decoded = jsonwebtoken_1.default.verify(token, environment_1.config.jwt.secret, {
                    ignoreExpiration: skipExpiredCheck,
                });
            }
            catch (jwtError) {
                const errorType = jwtError instanceof jsonwebtoken_1.default.TokenExpiredError ? "EXPIRED" : "INVALID";
                winston_1.logger.warn(`Token validation failed: ${errorType}`, {
                    ip: req.ip,
                    path: req.path,
                    error: jwtError instanceof Error ? jwtError.message : "Unknown error",
                });
                res.status(401).json({
                    success: false,
                    error: `TOKEN_${errorType}`,
                    message: errorType === "EXPIRED"
                        ? "Token has expired"
                        : "Invalid token format",
                    code: errorType === "EXPIRED" ? "TOKEN_002" : "TOKEN_003",
                });
                return;
            }
            // Validate token type
            if (!allowRefreshToken && decoded.type === "refresh") {
                res.status(401).json({
                    success: false,
                    error: "INVALID_TOKEN_TYPE",
                    message: "Refresh token cannot be used for API access",
                    code: "TOKEN_004",
                });
                return;
            }
            // Check session validity if required
            if (checkSession && decoded.sessionId) {
                const sessionRepo = new SessionRepository_1.SessionRepository();
                const session = await sessionRepo.findById(decoded.sessionId);
                if (!session || session.expiresAt < new Date()) {
                    res.status(401).json({
                        success: false,
                        error: "SESSION_INVALID",
                        message: "Session is no longer valid",
                        code: "TOKEN_005",
                    });
                    return;
                }
            }
            // Attach decoded token to request
            req.token = decoded;
            next();
        }
        catch (error) {
            winston_1.logger.error("Token validation middleware error", {
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
exports.validateToken = validateToken;
/**
 * 🔄 Refresh token validation middleware
 * Specifically for token refresh endpoints
 */
exports.validateRefreshToken = (0, exports.validateToken)({
    required: true,
    allowRefreshToken: true,
    checkSession: true,
    skipExpiredCheck: false,
});
/**
 * 📱 API key validation middleware
 * For mobile app or third-party integrations
 */
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers["x-api-key"];
    if (!apiKey) {
        res.status(401).json({
            success: false,
            error: "API_KEY_REQUIRED",
            message: "API key is required",
            code: "API_001",
        });
        return;
    }
    // Validate API key format and existence
    const validApiKeys = process.env.VALID_API_KEYS?.split(",") || [];
    if (!validApiKeys.includes(apiKey)) {
        winston_1.logger.warn("Invalid API key used", {
            apiKey: apiKey.substring(0, 8) + "...", // Log partial key for security
            ip: req.ip,
            path: req.path,
        });
        res.status(401).json({
            success: false,
            error: "INVALID_API_KEY",
            message: "Invalid API key",
            code: "API_002",
        });
        return;
    }
    // Set API key info in request
    req.apiKey = apiKey;
    next();
};
exports.validateApiKey = validateApiKey;
//# sourceMappingURL=validateToken.js.map