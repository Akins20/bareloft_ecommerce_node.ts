"use strict";
/**
 * 🔐 Authentication Middleware
 * Validates JWT tokens and sets user context
 * Nigerian market optimized with mobile-friendly error messages
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthenticate = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const environment_1 = require("../../config/environment");
const winston_1 = require("../../utils/logger/winston");
const serviceContainer_1 = require("../../config/serviceContainer");
/**
 * 🔐 Main Authentication Middleware
 * Validates access tokens and sets user context
 */
const authenticate = async (req, res, next) => {
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
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, environment_1.config.jwt.secret);
        }
        catch (jwtError) {
            winston_1.logger.warn("Invalid JWT token", {
                ip: req.ip,
                userAgent: req.get("User-Agent"),
                path: req.path,
                error: jwtError instanceof Error ? jwtError.message : "Unknown JWT error",
            });
            if (jwtError instanceof jsonwebtoken_1.default.TokenExpiredError) {
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
        const serviceContainer = (0, serviceContainer_1.getServiceContainer)();
        const sessionRepo = serviceContainer.getService('sessionRepository');
        const session = await sessionRepo.findById(decoded.sessionId);
        if (!session || session.expiresAt < new Date()) {
            winston_1.logger.warn("Invalid or expired session", {
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
        const userRepo = serviceContainer.getService('userRepository');
        const user = await userRepo.findById(decoded.userId);
        if (!user) {
            winston_1.logger.error("User not found for valid token", {
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
        winston_1.logger.debug("User authenticated successfully", {
            userId: user.id,
            sessionId: session.id,
            path: req.path,
            method: req.method,
        });
        next();
    }
    catch (error) {
        winston_1.logger.error("Authentication middleware error", {
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
exports.authenticate = authenticate;
/**
 * 🔓 Optional Authentication Middleware
 * Sets user context if token is provided, but doesn't require it
 */
const optionalAuthenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    // If no token provided, continue without authentication
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        next();
        return;
    }
    // If token is provided, try to authenticate
    // But don't fail if authentication fails
    try {
        await (0, exports.authenticate)(req, res, (error) => {
            if (error) {
                // Log the error but continue without authentication
                winston_1.logger.warn("Optional authentication failed", {
                    error: error instanceof Error ? error.message : "Unknown error",
                    path: req.path,
                    ip: req.ip,
                });
            }
            next();
        });
    }
    catch (error) {
        // Log the error but continue without authentication
        winston_1.logger.warn("Optional authentication failed", {
            error: error instanceof Error ? error.message : "Unknown error",
            path: req.path,
            ip: req.ip,
        });
        next();
    }
};
exports.optionalAuthenticate = optionalAuthenticate;
//# sourceMappingURL=authenticate.js.map