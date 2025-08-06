"use strict";
/**
 * Authentication Routes
 *
 * Handles all user authentication endpoints including:
 * - User signup and login with OTP verification
 * - Token management (access/refresh)
 * - Phone number validation
 * - Session management
 *
 * All routes are prefixed with /api/v1/auth
 *
 * Security Features:
 * - OTP-based authentication (Nigerian phone numbers)
 * - JWT token management with refresh tokens
 * - Rate limiting for sensitive endpoints
 * - Input validation and sanitization
 *
 * Author: Bareloft Development Team
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthController_1 = require("../../controllers/auth/AuthController");
const OTPController_1 = require("../../controllers/auth/OTPController");
// Middleware imports
const authenticate_1 = require("../../middleware/auth/authenticate");
const rateLimiter_1 = __importDefault(require("../../middleware/security/rateLimiter"));
const validateRequest_1 = require("../../middleware/validation/validateRequest");
const authSchemas_1 = require("../../utils/validation/schemas/authSchemas");
// Services (with fallback for dependency injection)
let authService;
let otpService;
let sessionService;
try {
    authService = require("../../services/auth/AuthService").authService || {};
    otpService = require("../../services/auth/OTPService").otpService || {};
    sessionService = require("../../services/auth/SessionService").sessionService || {};
}
catch (error) {
    // Fallback services
    authService = {};
    otpService = {};
    sessionService = {};
}
const router = (0, express_1.Router)();
// Initialize controllers with fallback
let authController;
let otpController;
try {
    authController = new AuthController_1.AuthController(authService, otpService, sessionService);
    otpController = new OTPController_1.OTPController(otpService);
}
catch (error) {
    // Create fallback controllers
    authController = {
        signup: async (req, res) => {
            res.status(501).json({ success: false, message: "Auth service not initialized" });
        },
        login: async (req, res) => {
            res.status(501).json({ success: false, message: "Auth service not initialized" });
        },
        requestOTP: async (req, res) => {
            res.status(501).json({ success: false, message: "Auth service not initialized" });
        },
        verifyOTP: async (req, res) => {
            res.status(501).json({ success: false, message: "Auth service not initialized" });
        },
        refreshToken: async (req, res) => {
            res.status(501).json({ success: false, message: "Auth service not initialized" });
        },
        logout: async (req, res) => {
            res.status(501).json({ success: false, message: "Auth service not initialized" });
        },
        getCurrentUser: async (req, res) => {
            res.status(501).json({ success: false, message: "Auth service not initialized" });
        },
        checkPhoneAvailability: async (req, res) => {
            res.status(501).json({ success: false, message: "Auth service not initialized" });
        }
    };
    otpController = {
        resendOTP: async (req, res) => {
            res.status(501).json({ success: false, message: "OTP service not initialized" });
        },
        getOTPStatus: async (req, res) => {
            res.status(501).json({ success: false, message: "OTP service not initialized" });
        },
        getAttemptsRemaining: async (req, res) => {
            res.status(501).json({ success: false, message: "OTP service not initialized" });
        }
    };
}
/**
 * @route   POST /api/v1/auth/signup
 * @desc    Register new user account with OTP verification
 * @access  Public
 * @rateLimit 5 requests per minute
 *
 * @body {
 *   phoneNumber: string,     // Nigerian phone number (+234...)
 *   firstName: string,       // Min 2 characters
 *   lastName: string,        // Min 2 characters
 *   email?: string,          // Optional email address
 *   otpCode: string         // 6-digit OTP code
 * }
 *
 * @response {
 *   success: true,
 *   message: "Account created successfully",
 *   data: {
 *     user: User,
 *     accessToken: string,
 *     refreshToken: string,
 *     expiresIn: number
 *   }
 * }
 */
router.post("/signup", typeof rateLimiter_1.default === 'function' ? (0, rateLimiter_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 attempts per minute
    message: "Too many signup attempts, please try again later",
}) : (req, res, next) => next(), (0, validateRequest_1.validateRequest)(authSchemas_1.authSchemas.signup), (req, res, next) => {
    try {
        authController.signup(req, res, next);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   POST /api/v1/auth/login
 * @desc    User login with OTP verification
 * @access  Public
 * @rateLimit 5 requests per minute
 *
 * @body {
 *   phoneNumber: string,     // Nigerian phone number
 *   otpCode: string         // 6-digit OTP code
 * }
 *
 * @response {
 *   success: true,
 *   message: "Login successful",
 *   data: {
 *     user: User,
 *     accessToken: string,
 *     refreshToken: string,
 *     expiresIn: number
 *   }
 * }
 */
router.post("/login", typeof rateLimiter_1.default === 'function' ? (0, rateLimiter_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 attempts per minute
    message: "Too many login attempts, please try again later",
}) : (req, res, next) => next(), (0, validateRequest_1.validateRequest)(authSchemas_1.authSchemas.login), (req, res, next) => {
    try {
        authController.login(req, res, next);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   POST /api/v1/auth/request-otp
 * @desc    Request OTP code for login/signup
 * @access  Public
 * @rateLimit 3 requests per minute
 *
 * @body {
 *   phoneNumber: string,     // Nigerian phone number
 *   purpose?: string        // 'login' | 'signup' | 'password_reset'
 * }
 *
 * @response {
 *   success: true,
 *   message: "OTP sent to ****1234",
 *   data: {
 *     success: true,
 *     message: "Verification code sent to your phone",
 *     expiresIn: 600,
 *     canResendIn: 60
 *   }
 * }
 */
router.post("/request-otp", typeof rateLimiter_1.default === 'function' ? (0, rateLimiter_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 3, // 3 requests per minute
    message: "Too many OTP requests, please wait before requesting again",
}) : (req, res, next) => next(), (0, validateRequest_1.validateRequest)(authSchemas_1.authSchemas.requestOTP), (req, res, next) => {
    try {
        authController.requestOTP(req, res, next);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   POST /api/v1/auth/verify-otp
 * @desc    Verify OTP code (standalone verification)
 * @access  Public
 * @rateLimit 5 requests per minute
 *
 * @body {
 *   phoneNumber: string,     // Nigerian phone number
 *   code: string,           // 6-digit OTP code
 *   purpose?: string        // 'login' | 'signup' | 'password_reset'
 * }
 *
 * @response {
 *   success: true,
 *   message: "OTP verified successfully",
 *   data: {
 *     verified: true
 *   }
 * }
 */
router.post("/verify-otp", typeof rateLimiter_1.default === 'function' ? (0, rateLimiter_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 attempts per minute
    message: "Too many OTP verification attempts",
}) : (req, res, next) => next(), (0, validateRequest_1.validateRequest)(authSchemas_1.authSchemas.verifyOTP), (req, res, next) => {
    try {
        authController.verifyOTP(req, res, next);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 * @rateLimit 10 requests per minute
 *
 * @body {
 *   refreshToken: string     // Valid refresh token
 * }
 *
 * @response {
 *   success: true,
 *   message: "Token refreshed successfully",
 *   data: {
 *     accessToken: string,
 *     expiresIn: number
 *   }
 * }
 */
router.post("/refresh", typeof rateLimiter_1.default === 'function' ? (0, rateLimiter_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: "Too many token refresh attempts",
}) : (req, res, next) => next(), (0, validateRequest_1.validateRequest)(authSchemas_1.authSchemas.refreshToken), (req, res, next) => {
    try {
        authController.refreshToken(req, res, next);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   POST /api/v1/auth/logout
 * @desc    User logout (invalidate session)
 * @access  Private
 *
 * @headers {
 *   Authorization: "Bearer <accessToken>"
 * }
 *
 * @body {
 *   refreshToken?: string,   // Optional refresh token
 *   logoutAllDevices?: boolean // Logout from all devices
 * }
 *
 * @response {
 *   success: true,
 *   message: "Logged out successfully",
 *   data: {
 *     sessionsInvalidated: number
 *   }
 * }
 */
router.post("/logout", authenticate_1.authenticate, (0, validateRequest_1.validateRequest)(authSchemas_1.authSchemas.logout), (req, res, next) => {
    try {
        authController.logout(req, res, next);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user information
 * @access  Private
 *
 * @headers {
 *   Authorization: "Bearer <accessToken>"
 * }
 *
 * @response {
 *   success: true,
 *   message: "Current user retrieved successfully",
 *   data: {
 *     user: {
 *       id: string,
 *       phoneNumber: string,
 *       firstName: string,
 *       lastName: string,
 *       email?: string,
 *       avatar?: string,
 *       role: string,
 *       isVerified: boolean,
 *       createdAt: string,
 *       lastLoginAt?: string
 *     }
 *   }
 * }
 */
router.get("/me", authenticate_1.authenticate, (req, res, next) => {
    try {
        authController.getCurrentUser(req, res, next);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/auth/check-phone/:phoneNumber
 * @desc    Check if phone number is available for registration
 * @access  Public
 * @rateLimit 20 requests per minute
 *
 * @params {
 *   phoneNumber: string      // Nigerian phone number to check
 * }
 *
 * @response {
 *   success: true,
 *   message: "Phone number availability checked",
 *   data: {
 *     available: boolean,
 *     phoneNumber: string    // Masked phone number
 *   }
 * }
 */
router.get("/check-phone/:phoneNumber", typeof rateLimiter_1.default === 'function' ? (0, rateLimiter_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
    message: "Too many phone check requests",
}) : (req, res, next) => next(), (req, res, next) => {
    try {
        authController.checkPhoneAvailability(req, res, next);
    }
    catch (error) {
        next(error);
    }
});
/**
 * OTP Management Routes
 */
/**
 * @route   POST /api/v1/auth/otp/resend
 * @desc    Resend OTP code
 * @access  Public
 * @rateLimit 2 requests per minute
 */
router.post("/otp/resend", typeof rateLimiter_1.default === 'function' ? (0, rateLimiter_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 2, // 2 requests per minute
    message: "Too many OTP resend requests",
}) : (req, res, next) => next(), (req, res, next) => {
    try {
        otpController.resendOTP(req, res, next);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/auth/otp/status/:phoneNumber
 * @desc    Get OTP status for phone number
 * @access  Public
 * @rateLimit 10 requests per minute
 */
router.get("/otp/status/:phoneNumber", typeof rateLimiter_1.default === 'function' ? (0, rateLimiter_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
}) : (req, res, next) => next(), (req, res, next) => {
    try {
        otpController.getOTPStatus(req, res, next);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/auth/otp/attempts/:phoneNumber
 * @desc    Get remaining OTP attempts for phone number
 * @access  Public
 * @rateLimit 10 requests per minute
 */
router.get("/otp/attempts/:phoneNumber", typeof rateLimiter_1.default === 'function' ? (0, rateLimiter_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
}) : (req, res, next) => next(), (req, res, next) => {
    try {
        otpController.getAttemptsRemaining(req, res, next);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
/**
 * Authentication Flow Documentation
 *
 * ## User Registration Flow:
 * 1. POST /request-otp (purpose: 'signup')
 * 2. User receives SMS with 6-digit code
 * 3. POST /signup with user details + OTP code
 * 4. User receives access & refresh tokens
 *
 * ## User Login Flow:
 * 1. POST /request-otp (purpose: 'login')
 * 2. User receives SMS with 6-digit code
 * 3. POST /login with phone + OTP code
 * 4. User receives access & refresh tokens
 *
 * ## Token Management:
 * - Access tokens expire in 15 minutes
 * - Refresh tokens expire in 7 days
 * - Use POST /refresh to get new access token
 * - Include "Authorization: Bearer <token>" in requests
 *
 * ## Security Features:
 * - Nigerian phone number validation (+234 format)
 * - OTP codes expire in 10 minutes
 * - Maximum 3 OTP verification attempts
 * - Rate limiting on all authentication endpoints
 * - Session management with device tracking
 *
 * ## Error Codes:
 * - PHONE_EXISTS: Phone number already registered
 * - PHONE_NOT_FOUND: Phone number not registered
 * - INVALID_OTP: OTP code is invalid or expired
 * - RATE_LIMIT_EXCEEDED: Too many requests
 * - UNAUTHORIZED: Invalid or expired token
 * - VALIDATION_ERROR: Request validation failed
 */
//# sourceMappingURL=auth.js.map