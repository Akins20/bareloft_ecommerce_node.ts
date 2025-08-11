import { Request, Response } from "express";
import { BaseController } from "../BaseController";
import { AuthService } from "../../services/auth/AuthService";
import { OTPService } from "../../services/auth/OTPService";
import { SessionService } from "../../services/auth/SessionService";
import {
  LoginRequest,
  SignupRequest,
  RefreshTokenRequest,
  RequestOTPRequest,
  VerifyOTPRequest,
  AuthResponse,
  OTPResponse,
  LogoutRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  OTPPurpose,
} from "../../types/auth.types";
import { ApiResponse } from "../../types/api.types";
import { AuthenticatedRequest } from "../../types/auth.types";

export class AuthController extends BaseController {
  private authService: AuthService;
  private otpService: OTPService;
  private sessionService: SessionService;

  constructor(
    authService: AuthService,
    otpService: OTPService,
    sessionService: SessionService
  ) {
    super();
    this.authService = authService;
    this.otpService = otpService;
    this.sessionService = sessionService;
  }

  /**
   * User signup with OTP verification
   * POST /api/v1/auth/signup
   */
  public signup = async (req: Request, res: Response, next?: unknown): Promise<void> => {
    try {
      const signupData: SignupRequest = req.body;

      // Validate signup data
      const validationErrors = this.validateSignupRequest(signupData);
      if (validationErrors.length > 0) {
        this.sendError(
          res,
          "Validation failed",
          400,
          "VALIDATION_ERROR",
          validationErrors
        );
        return;
      }

      // Check if phone number is already registered (if provided)
      if (signupData.phoneNumber) {
        const existingUser = await this.authService.findUserByPhone(
          signupData.phoneNumber
        );
        if (existingUser) {
          this.sendError(
            res,
            "Phone number is already registered",
            409,
            "PHONE_EXISTS"
          );
          return;
        }
      }

      // Check if email is already registered (if provided)
      if (signupData.email) {
        const existingEmailUser = await this.authService.findUserByEmail(
          signupData.email
        );
        if (existingEmailUser) {
          this.sendError(
            res,
            "Email is already registered",
            409,
            "EMAIL_EXISTS"
          );
          return;
        }
      }

      // OTP verification is handled inside AuthService.signup method
      // No need for duplicate verification here

      // Create user account
      const result = await this.authService.signup(signupData);

      if (!result.success) {
        this.sendError(res, result.message, 400, "SIGNUP_FAILED");
        return;
      }

      // Log successful signup
      const signupLogData: any = {
        hasEmail: !!signupData.email,
      };
      
      if (signupData.phoneNumber) {
        signupLogData.phoneNumber = this.maskPhoneNumber(signupData.phoneNumber);
      }
      if (signupData.email) {
        signupLogData.email = this.maskEmail(signupData.email);
      }
      
      this.logAction("USER_SIGNUP", result.data.user.id, "USER", result.data.user.id, signupLogData);

      const response: ApiResponse<AuthResponse> = {
        success: true,
        message: "Account created successfully",
        data: {
          success: true,
          message: "Account created successfully",
          user: result.data.user,
          accessToken: result.data.accessToken,
          refreshToken: result.data.refreshToken,
          expiresIn: result.data.expiresIn,
        },
      };

      res.status(201).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * User login with OTP verification
   * POST /api/v1/auth/login
   */
  public login = async (req: Request, res: Response, next?: unknown): Promise<void> => {
    try {
      const loginData: LoginRequest = req.body;

      // Validate login data
      const validationErrors = this.validateLoginRequest(loginData);
      if (validationErrors.length > 0) {
        this.sendError(
          res,
          "Validation failed",
          400,
          "VALIDATION_ERROR",
          validationErrors
        );
        return;
      }

      // OTP verification is handled inside AuthService.login method
      // No need for duplicate verification here

      // Authenticate user
      const result = await this.authService.login(loginData);

      if (!result.success) {
        this.sendError(res, result.message, 401, "LOGIN_FAILED");
        return;
      }

      // Update last login
      await this.authService.updateLastLogin(result.data.user.id);

      // Log successful login
      const loginLogData: any = {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      };
      
      if (loginData.phoneNumber) {
        loginLogData.phoneNumber = this.maskPhoneNumber(loginData.phoneNumber);
      }
      if (loginData.email) {
        loginLogData.email = this.maskEmail(loginData.email);
      }
      
      this.logAction("USER_LOGIN", result.data.user.id, "USER", result.data.user.id, loginLogData);

      const response: ApiResponse<AuthResponse> = {
        success: true,
        message: "Login successful",
        data: {
          success: true,
          message: "Login successful",
          user: result.data.user,
          accessToken: result.data.accessToken,
          refreshToken: result.data.refreshToken,
          expiresIn: result.data.expiresIn,
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Request OTP for login or signup
   * POST /api/v1/auth/request-otp
   */
  public requestOTP = async (req: Request, res: Response, next?: unknown): Promise<void> => {
    try {
      const { phoneNumber, email, purpose }: RequestOTPRequest = req.body;

      // Validate that either phone number or email is provided
      if (!phoneNumber && !email) {
        this.sendError(
          res,
          "Either phone number or email is required",
          400,
          "MISSING_CONTACT_INFO"
        );
        return;
      }

      // Validate phone number format if provided
      if (phoneNumber && !this.isValidNigerianPhone(phoneNumber)) {
        this.sendError(
          res,
          "Invalid Nigerian phone number format. Use +234XXXXXXXXXX",
          400,
          "INVALID_PHONE"
        );
        return;
      }

      // Validate email format if provided
      if (email && !this.isValidEmail(email)) {
        this.sendError(
          res,
          "Invalid email address format",
          400,
          "INVALID_EMAIL"
        );
        return;
      }

      const validPurposes = ["login", "signup", "password_reset"];
      if (purpose && !validPurposes.includes(purpose)) {
        this.sendError(res, "Invalid OTP purpose", 400, "INVALID_PURPOSE");
        return;
      }

      // Check rate limiting using the contact method
      const rateLimitKey = phoneNumber || email;
      const canRequest = await this.otpService.checkRateLimit(rateLimitKey!);
      if (!canRequest) {
        this.sendError(
          res,
          "Too many OTP requests. Please wait before requesting again.",
          429,
          "RATE_LIMIT_EXCEEDED"
        );
        return;
      }

      // Normalize purpose for internal comparisons
      const normalizedPurpose = purpose?.toUpperCase() as OTPPurpose;

      // For signup, check if contact method doesn't already exist
      if (normalizedPurpose === "SIGNUP") {
        let existingUser;
        if (phoneNumber) {
          existingUser = await this.authService.findUserByPhone(phoneNumber);
          if (existingUser) {
            this.sendError(
              res,
              "Phone number is already registered. Use login instead.",
              409,
              "PHONE_EXISTS"
            );
            return;
          }
        } else if (email) {
          existingUser = await this.authService.findUserByEmail(email);
          if (existingUser) {
            this.sendError(
              res,
              "Email address is already registered. Use login instead.",
              409,
              "EMAIL_EXISTS"
            );
            return;
          }
        }
      }

      // For login, check if contact method exists
      if (normalizedPurpose === "LOGIN") {
        let existingUser;
        if (phoneNumber) {
          existingUser = await this.authService.findUserByPhone(phoneNumber);
          if (!existingUser) {
            this.sendError(
              res,
              "Phone number not registered. Please sign up first.",
              404,
              "PHONE_NOT_FOUND"
            );
            return;
          }
        } else if (email) {
          existingUser = await this.authService.findUserByEmail(email);
          if (!existingUser) {
            this.sendError(
              res,
              "Email address not registered. Please sign up first.",
              404,
              "EMAIL_NOT_FOUND"
            );
            return;
          }
        }
      }

      // Generate and send OTP using AuthService
      const result = await this.authService.requestOTP({
        phoneNumber,
        email,
        purpose: normalizedPurpose || "LOGIN"
      });

      if (!result.success) {
        this.sendError(res, result.message || "Failed to send OTP", 400, "OTP_REQUEST_FAILED");
        return;
      }

      // Log OTP request
      const logData: any = {
        purpose: purpose || "login",
      };
      
      if (phoneNumber) {
        logData.phoneNumber = this.maskPhoneNumber(phoneNumber);
      }
      if (email) {
        logData.email = this.maskEmail(email);
      }
      
      this.logAction("OTP_REQUESTED", undefined, "OTP", undefined, logData);

      const maskedContact = phoneNumber ? this.maskPhoneNumber(phoneNumber) : this.maskEmail(email!);
      const contactType = phoneNumber ? 'phone' : 'email';
      
      const response: ApiResponse<OTPResponse> = {
        success: true,
        message: `OTP sent to ${maskedContact}`,
        data: {
          success: true,
          message: `Verification code sent to your ${contactType}`,
          expiresIn: result.data?.expiresIn || 600,
          canResendIn: 60,
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Verify OTP (standalone verification)
   * POST /api/v1/auth/verify-otp
   */
  public verifyOTP = async (req: Request, res: Response, next?: unknown): Promise<void> => {
    try {
      const { phoneNumber, email, code, purpose }: VerifyOTPRequest = req.body;

      // Validate that either phone number or email is provided
      if (!phoneNumber && !email) {
        this.sendError(
          res,
          "Either phone number or email is required",
          400,
          "MISSING_CONTACT_INFO"
        );
        return;
      }

      // Validate phone number format if provided
      if (phoneNumber && !this.isValidNigerianPhone(phoneNumber)) {
        this.sendError(
          res,
          "Invalid Nigerian phone number format. Use +234XXXXXXXXXX",
          400,
          "INVALID_PHONE"
        );
        return;
      }

      // Validate email format if provided
      if (email && !this.isValidEmail(email)) {
        this.sendError(
          res,
          "Invalid email address format",
          400,
          "INVALID_EMAIL"
        );
        return;
      }

      if (!code || !/^\d{6}$/.test(code)) {
        this.sendError(
          res,
          "Valid 6-digit OTP code is required",
          400,
          "INVALID_CODE"
        );
        return;
      }

      // Verify OTP using AuthService
      const result = await this.authService.verifyOTP({
        phoneNumber,
        email,
        code,
        purpose: (purpose || "login").toUpperCase() as OTPPurpose
      });

      if (!result.isValid) {
        const verifyLogData: any = {
          purpose: purpose || "login",
          reason: "Invalid OTP code",
        };
        
        if (phoneNumber) {
          verifyLogData.phoneNumber = this.maskPhoneNumber(phoneNumber);
        }
        if (email) {
          verifyLogData.email = this.maskEmail(email);
        }
        
        this.logAction("OTP_VERIFY_FAILED", undefined, "OTP", undefined, verifyLogData);

        this.sendError(res, "Invalid or expired OTP code", 400, "OTP_VERIFICATION_FAILED");
        return;
      }

      // Log successful verification
      const verifiedLogData: any = {
        purpose: purpose || "login",
      };
      
      if (phoneNumber) {
        verifiedLogData.phoneNumber = this.maskPhoneNumber(phoneNumber);
      }
      if (email) {
        verifiedLogData.email = this.maskEmail(email);
      }
      
      this.logAction("OTP_VERIFIED", undefined, "OTP", undefined, verifiedLogData);

      const response: ApiResponse<{ verified: boolean }> = {
        success: true,
        message: "OTP verified successfully",
        data: { verified: true },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  public refreshToken = async (req: Request, res: Response, next?: unknown): Promise<void> => {
    try {
      const { refreshToken }: RefreshTokenRequest = req.body;

      if (!refreshToken) {
        this.sendError(
          res,
          "Refresh token is required",
          400,
          "MISSING_REFRESH_TOKEN"
        );
        return;
      }

      const result = await this.authService.refreshToken({ refreshToken });

      if (!result.success) {
        this.sendError(res, result.message, 401, "INVALID_REFRESH_TOKEN");
        return;
      }

      // Log token refresh
      this.logAction("TOKEN_REFRESHED", result.userId, "AUTH", undefined, {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      const response: ApiResponse<{ accessToken: string; expiresIn: number }> =
        {
          success: true,
          message: "Token refreshed successfully",
          data: {
            accessToken: result.accessToken,
            expiresIn: result.expiresIn,
          },
        };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * User logout
   * POST /api/v1/auth/logout
   */
  public logout = async (
req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { refreshToken, logoutAllDevices }: LogoutRequest = req.body;

      if (!userId) {
        this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
        return;
      }

      let result;
      if (logoutAllDevices) {
        result = await this.sessionService.invalidateAllUserSessions(userId);
      } else if (refreshToken) {
        result = await this.sessionService.invalidateSession(refreshToken);
      } else {
        // Logout current session using access token
        const accessToken = req.headers.authorization?.replace("Bearer ", "");
        if (accessToken) {
          result =
            await this.sessionService.invalidateSessionByAccessToken(
              accessToken
            );
        } else {
          this.sendError(res, "No session to logout", 400, "NO_SESSION");
          return;
        }
      }

      // Log logout
      this.logAction("USER_LOGOUT", userId, "AUTH", undefined, {
        logoutAllDevices: !!logoutAllDevices,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      const response: ApiResponse<{ sessionsInvalidated: number }> = {
        success: true,
        message: logoutAllDevices
          ? "Logged out from all devices"
          : "Logged out successfully",
        data: { sessionsInvalidated: typeof result === 'number' ? result : 1 },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get current user info
   * GET /api/v1/auth/me
   */
  public getCurrentUser = async (
req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);

      if (!userId) {
        this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
        return;
      }

      const user = await this.authService.getCurrentUser(userId);

      if (!user) {
        this.sendError(res, "User not found", 404, "USER_NOT_FOUND");
        return;
      }

      const response: ApiResponse<any> = {
        success: true,
        message: "Current user retrieved successfully",
        data: { user },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Check if phone number is available for registration
   * GET /api/v1/auth/check-phone/:phoneNumber
   */
  public checkPhoneAvailability = async (
req: Request, res: Response, next?: unknown  ): Promise<void> => {
    try {
      const { phoneNumber } = req.params;

      if (!phoneNumber || !this.isValidNigerianPhone(phoneNumber)) {
        this.sendError(
          res,
          "Valid Nigerian phone number is required",
          400,
          "INVALID_PHONE"
        );
        return;
      }

      const existingUser = await this.authService.findUserByPhone(phoneNumber);

      const response: ApiResponse<{ available: boolean; phoneNumber: string }> =
        {
          success: true,
          message: "Phone number availability checked",
          data: {
            available: !existingUser,
            phoneNumber: this.maskPhoneNumber(phoneNumber),
          },
        };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Validate signup request
   */
  private validateSignupRequest(data: SignupRequest): string[] {
    const errors: string[] = [];

    // Either phone number or email is required
    if (!data.phoneNumber && !data.email) {
      errors.push("Either phone number or email is required");
    }

    // Phone number validation (if provided)
    if (data.phoneNumber && !this.isValidNigerianPhone(data.phoneNumber)) {
      errors.push("Valid Nigerian phone number is required");
    }

    // Email validation (if provided)
    if (data.email && !this.isValidEmail(data.email)) {
      errors.push("Valid email address is required");
    }

    // Name validation
    if (!data.firstName || data.firstName.trim().length < 2) {
      errors.push("First name must be at least 2 characters long");
    }

    if (!data.lastName || data.lastName.trim().length < 2) {
      errors.push("Last name must be at least 2 characters long");
    }

    // OTP code validation
    if (!data.otpCode || !/^\d{6}$/.test(data.otpCode)) {
      errors.push("Valid 6-digit OTP code is required");
    }

    return errors;
  }

  /**
   * Validate login request
   */
  private validateLoginRequest(data: LoginRequest): string[] {
    const errors: string[] = [];

    // Either phone number or email is required
    if (!data.phoneNumber && !data.email) {
      errors.push("Either phone number or email is required");
    }

    // Phone number validation (if provided)
    if (data.phoneNumber && !this.isValidNigerianPhone(data.phoneNumber)) {
      errors.push("Valid Nigerian phone number is required");
    }

    // Email validation (if provided)
    if (data.email && !this.isValidEmail(data.email)) {
      errors.push("Valid email address is required");
    }

    // OTP code validation
    if (!data.otpCode || !/^\d{6}$/.test(data.otpCode)) {
      errors.push("Valid 6-digit OTP code is required");
    }

    return errors;
  }


  /**
   * Mask phone number for security/privacy
   */
  private maskPhoneNumber(phoneNumber?: string): string {
    if (!phoneNumber || phoneNumber.length < 4) return "****";

    const cleaned = phoneNumber.replace(/\D/g, "");
    if (cleaned.length < 8) return "****";

    const lastFour = cleaned.slice(-4);
    const masked = "*".repeat(cleaned.length - 4) + lastFour;

    return masked;
  }

  /**
   * Mask email for security/privacy
   */
  private maskEmail(email: string): string {
    if (!email || !email.includes('@')) return "****";

    const [username, domain] = email.split('@');
    if (username.length <= 2) {
      return `**@${domain}`;
    }
    
    const maskedUsername = username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1);
    return `${maskedUsername}@${domain}`;
  }
}
