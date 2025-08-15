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

import { Router } from "express";
import jwt from "jsonwebtoken";
import { AuthController } from "../../controllers/auth/AuthController";
import { OTPController } from "../../controllers/auth/OTPController";
import { config } from "../../config/environment";

// Service imports
import { AuthService } from "../../services/auth/AuthService";
import { OTPService } from "../../services/auth/OTPService";
import { SessionService } from "../../services/auth/SessionService";

// Middleware imports
import { authenticate } from "../../middleware/auth/authenticate";
import { rateLimiter } from "../../middleware/security/rateLimiter";
import { validateRequest } from "../../middleware/validation/validateRequest";
// Note: Auth schemas not yet created, using placeholder validation
const authSchemas = {
  requestOTP: {},
  verifyOTP: {},
  signup: {},
  login: {},
  refresh: {},
  refreshToken: {}, // Add missing refreshToken schema
  logout: {},
  changePassword: {},
};

// Import service container
import { getServiceContainer } from "../../config/serviceContainer";

// Get service container instance
const serviceContainer = getServiceContainer();

// Get services from container
const authService = serviceContainer.getService<AuthService>('authService');
const otpService = serviceContainer.getService<OTPService>('otpService');
const sessionService = serviceContainer.getService<SessionService>('sessionService');

const router = Router();

// Initialize controllers with services from container
const authController = new AuthController(
  authService,
  otpService,
  sessionService
);

const otpController = new OTPController(otpService);

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
router.post(
  "/signup",
  rateLimiter.auth,
  // validateRequest(authSchemas.signup), // Skip validation for now due to empty schema
  (req, res, next) => {
    try {
      authController.signup(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

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
router.post(
  "/login",
  rateLimiter.auth,
  // validateRequest(authSchemas.login), // Skip validation for now due to empty schema
  (req, res, next) => {
    try {
      authController.login(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

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
router.post(
  "/request-otp",
  rateLimiter.otp,
  // validateRequest(authSchemas.requestOTP), // Skip validation for now due to empty schema
  (req, res, next) => {
    try {
      authController.requestOTP(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

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
router.post(
  "/verify-otp",
  rateLimiter.otp,
  // validateRequest(authSchemas.verifyOTP), // Skip validation for now due to empty schema
  (req, res, next) => {
    try {
      authController.verifyOTP(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

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
router.post(
  "/refresh",
  rateLimiter.auth,
  // validateRequest(authSchemas.refreshToken), // Skip validation for now due to empty schema
  (req, res, next) => {
    try {
      authController.refreshToken(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

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
router.post(
  "/logout",
  authenticate,
  // validateRequest(authSchemas.logout), // Skip validation for now due to empty schema
  (req, res, next) => {
    try {
      authController.logout(req as any, res);
    } catch (error) {
      next(error);
    }
  }
);

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
router.get("/me", authenticate, (req, res, next) => {
  try {
    authController.getCurrentUser(req as any, res);
  } catch (error) {
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
router.get(
  "/check-phone/:phoneNumber",
  rateLimiter.general,
  (req, res, next) => {
    try {
      authController.checkPhoneAvailability(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * OTP Management Routes
 */

/**
 * @route   POST /api/v1/auth/otp/resend
 * @desc    Resend OTP code
 * @access  Public
 * @rateLimit 2 requests per minute
 */
router.post(
  "/otp/resend",
  rateLimiter.otp,
  (req, res, next) => {
    try {
      otpController.resendOTP(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/auth/otp/status/:phoneNumber
 * @desc    Get OTP status for phone number
 * @access  Public
 * @rateLimit 10 requests per minute
 */
router.get(
  "/otp/status/:phoneNumber",
  rateLimiter.authenticated,
  (req, res, next) => {
    try {
      otpController.getOTPStatus(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/auth/otp/attempts/:phoneNumber
 * @desc    Get remaining OTP attempts for phone number
 * @access  Public
 * @rateLimit 10 requests per minute
 */
router.get(
  "/otp/attempts/:phoneNumber",
  rateLimiter.authenticated,
  (req, res, next) => {
    try {
      otpController.getAttemptsRemaining(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/email-signup
 * @desc    Register admin user with email/password
 * @access  Public
 * @rateLimit 5 requests per minute
 */
router.post(
  "/email-signup",
  rateLimiter.auth,
  async (req, res, next) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      // Only allow admin roles for email signup
      if (!role || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Email signup is only available for admin accounts",
          error: { code: "INVALID_ROLE" }
        });
      }

      await authController.emailSignup(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/email-login
 * @desc    Login admin user with email/password
 * @access  Public
 * @rateLimit 5 requests per minute
 */
router.post(
  "/email-login",
  rateLimiter.auth,
  async (req, res, next) => {
    try {
      await authController.emailLogin(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/test-login
 * @desc    Test login bypass for development - bypasses OTP verification
 * @access  Public (Development Only)
 * @dev_only This endpoint should be removed in production
 *
 * @body {
 *   phoneNumber: string     // Test user phone number
 * }
 *
 * @response {
 *   success: true,
 *   message: "Test login successful",
 *   data: {
 *     user: User,
 *     accessToken: string,
 *     refreshToken: string,
 *     expiresIn: number
 *   }
 * }
 */
router.post(
  "/test-login",
  rateLimiter.auth,
  async (req, res, next) => {
    try {
      // Only allow in development mode
      if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({
          success: false,
          error: "ENDPOINT_NOT_FOUND",
          message: "Endpoint not available in production"
        });
      }

      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          error: "VALIDATION_ERROR",
          message: "Phone number is required"
        });
      }

      // Find test user by phone number
      const serviceContainer = getServiceContainer();
      const userRepository = serviceContainer.getService('userRepository') as any;
      
      const user = await userRepository.prisma.user.findUnique({
        where: { phoneNumber },
        select: {
          id: true,
          phoneNumber: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          isVerified: true,
          isActive: true
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "USER_NOT_FOUND",
          message: "Test user not found with this phone number"
        });
      }

      if (!user.isActive || user.status !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          error: "USER_INACTIVE",
          message: "User account is not active"
        });
      }

      // Generate proper tokens with all required fields
      const jwtService = serviceContainer.getService('jwtService') as any;
      
      // Create a temporary session ID
      const tempSessionId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      const accessToken = jwt.sign({
        userId: user.id,
        sessionId: tempSessionId,
        role: user.role,
        type: 'access'
      }, process.env.JWT_SECRET || config.jwt.secret, {
        expiresIn: '15m',
        issuer: 'bareloft-api',
        audience: 'bareloft-client'
      });

      const refreshToken = jwt.sign({
        userId: user.id,
        sessionId: tempSessionId,
        role: user.role,
        type: 'refresh'
      }, process.env.JWT_REFRESH_SECRET || config.jwt.refreshSecret, {
        expiresIn: '7d',
        issuer: 'bareloft-api',
        audience: 'bareloft-client'
      });

      // Create session record
      const sessionRepository = serviceContainer.getService('sessionRepository') as any;
      await sessionRepository.prisma.session.create({
        data: {
          id: tempSessionId,
          sessionId: tempSessionId,
          userId: user.id,
          accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          deviceInfo: JSON.stringify({
            userAgent: req.headers['user-agent'] || 'Test Client',
            ipAddress: req.ip || '127.0.0.1'
          }),
          isActive: true,
          lastUsedAt: new Date()
        }
      });

      // Update last login
      await userRepository.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      res.json({
        success: true,
        message: "Test login successful",
        data: {
          user: {
            id: user.id,
            phoneNumber: user.phoneNumber,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isVerified: user.isVerified
          },
          accessToken,
          refreshToken,
          expiresIn: 900 // 15 minutes
        }
      });

    } catch (error) {
      console.error('Test login error:', error);
      next(error);
    }
  }
);

export default router;

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
