"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSRFProtection = void 0;
const crypto_1 = __importDefault(require("crypto"));
const redis_1 = require("../../config/redis");
/**
 * CSRF (Cross-Site Request Forgery) Protection Utility
 */
class CSRFProtection {
    static TOKEN_LENGTH = 32;
    static SECRET_LENGTH = 128;
    static TOKEN_EXPIRY = 3600; // 1 hour in seconds
    static HEADER_NAME = "x-csrf-token";
    static COOKIE_NAME = "csrf-token";
    /**
     * Generate a CSRF token
     */
    static generateToken() {
        return crypto_1.default.randomBytes(this.TOKEN_LENGTH).toString("hex");
    }
    /**
     * Generate a CSRF secret
     */
    static generateSecret() {
        return crypto_1.default.randomBytes(this.SECRET_LENGTH).toString("hex");
    }
    /**
     * Create CSRF token hash using secret
     */
    static createTokenHash(token, secret) {
        return crypto_1.default.createHmac("sha256", secret).update(token).digest("hex");
    }
    /**
     * Verify CSRF token against secret
     */
    static verifyToken(token, secret, hash) {
        const expectedHash = this.createTokenHash(token, secret);
        return crypto_1.default.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expectedHash, "hex"));
    }
    /**
     * Store CSRF token in Redis with expiry
     */
    static async storeToken(sessionId, token, secret) {
        const tokenHash = this.createTokenHash(token, secret);
        const key = `csrf:${sessionId}`;
        await redis_1.redisClient.set(key, JSON.stringify({
            token,
            hash: tokenHash,
            secret,
            createdAt: new Date().toISOString(),
        }), this.TOKEN_EXPIRY);
    }
    /**
     * Retrieve and verify CSRF token from Redis
     */
    static async validateStoredToken(sessionId, providedToken) {
        try {
            const key = `csrf:${sessionId}`;
            const stored = await redis_1.redisClient.get(key);
            if (!stored) {
                return false;
            }
            // Verify the token
            return this.verifyToken(providedToken, stored.secret, stored.hash);
        }
        catch (error) {
            console.error("CSRF token validation error:", error);
            return false;
        }
    }
    /**
     * Generate CSRF token for session
     */
    static async generateTokenForSession(sessionId) {
        const token = this.generateToken();
        const secret = this.generateSecret();
        await this.storeToken(sessionId, token, secret);
        return token;
    }
    /**
     * Invalidate CSRF token for session
     */
    static async invalidateToken(sessionId) {
        const key = `csrf:${sessionId}`;
        await redis_1.redisClient.delete(key);
    }
    /**
     * Middleware for CSRF protection
     */
    static middleware(options = {}) {
        const { ignoreMethods = ["GET", "HEAD", "OPTIONS"], headerName = this.HEADER_NAME, cookieName = this.COOKIE_NAME, skipPaths = [], } = options;
        return async (req, res, next) => {
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
                const sessionId = req.session?.id || req.headers["x-session-id"];
                if (!sessionId) {
                    return res.status(403).json({
                        success: false,
                        message: "CSRF protection requires session",
                        error: { code: "CSRF_NO_SESSION" },
                    });
                }
                // Get CSRF token from header or body
                const token = req.headers[headerName] ||
                    req.body._csrf ||
                    req.query._csrf;
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
            }
            catch (error) {
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
    static async generateTokenEndpoint(req, res) {
        try {
            const sessionId = req.session?.id || req.headers["x-session-id"];
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
        }
        catch (error) {
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
    static doubleSubmitCookieMiddleware(options = {}) {
        const { cookieName = this.COOKIE_NAME, secure = process.env.NODE_ENV === "production", sameSite = "strict", } = options;
        return async (req, res, next) => {
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
                const headerToken = req.headers[this.HEADER_NAME];
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
            }
            catch (error) {
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
    static async cleanupExpiredTokens() {
        try {
            // This would typically be handled by Redis TTL automatically
            // But you can implement custom cleanup logic here if needed
            console.log("CSRF token cleanup completed");
        }
        catch (error) {
            console.error("CSRF token cleanup error:", error);
        }
    }
}
exports.CSRFProtection = CSRFProtection;
exports.default = CSRFProtection;
//# sourceMappingURL=csrf.js.map