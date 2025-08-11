import { Request, Response } from "express";
import { BaseController } from "../BaseController";
import { OTPService } from "../../services/auth/OTPService";
import {
  RequestOTPRequest,
  VerifyOTPRequest,
  OTPResponse,
} from "../../types/auth.types";
import { ApiResponse } from "../../types/api.types";

export class OTPController extends BaseController {
  private otpService: OTPService;

  constructor(otpService: OTPService) {
    super();
    this.otpService = otpService;
  }

  /**
   * Request OTP code
   * POST /api/v1/auth/otp/request
   */
  public requestOTP = async (req: Request, res: Response): Promise<void> => {
    try {
      const { phoneNumber, purpose }: RequestOTPRequest = req.body;

      // Validate input
      const validationErrors = this.validateOTPRequest({
        phoneNumber,
        purpose,
      });
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

      // Check rate limiting
      const canRequest = await this.otpService.checkRateLimit(phoneNumber);
      if (!canRequest) {
        this.sendError(
          res,
          "Too many OTP requests. Please wait before requesting again.",
          429,
          "RATE_LIMIT_EXCEEDED"
        );
        return;
      }

      const result = await this.otpService.generateAndSendOTP(
        phoneNumber,
        purpose || "login"
      );

      if (!result.success) {
        this.sendError(res, result.message, 400, "OTP_REQUEST_FAILED");
        return;
      }

      const response: ApiResponse<OTPResponse> = {
        success: true,
        message: "OTP sent successfully",
        data: {
          success: true,
          message: `OTP sent to ${this.maskPhoneNumber(phoneNumber)}`,
          expiresIn: result.expiresIn,
          canResendIn: result.canResendIn,
        },
      };

      // Log OTP request for audit
      this.logAction("OTP_REQUESTED", undefined, "OTP", undefined, {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        purpose,
      });

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Verify OTP code
   * POST /api/v1/auth/otp/verify
   */
  public verifyOTP = async (req: Request, res: Response): Promise<void> => {
    try {
      const { phoneNumber, code, purpose }: VerifyOTPRequest = req.body;

      // Validate input
      const validationErrors = this.validateVerifyOTPRequest({
        phoneNumber,
        code,
        purpose,
      });
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

      const result = await this.otpService.verifyOTP(
        phoneNumber,
        code,
        purpose || "login"
      );

      if (!result.success) {
        // Log failed verification attempt
        this.logAction("OTP_VERIFY_FAILED", undefined, "OTP", undefined, {
          phoneNumber: this.maskPhoneNumber(phoneNumber),
          purpose,
          reason: result.message,
        });

        this.sendError(res, result.message || "OTP verification failed", 400, "OTP_VERIFICATION_FAILED");
        return;
      }

      // Log successful verification
      this.logAction("OTP_VERIFIED", undefined, "OTP", undefined, {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        purpose,
      });

      const response: ApiResponse<{ verified: boolean; token?: string }> = {
        success: true,
        message: "OTP verified successfully",
        data: {
          verified: true,
          ...(result.token && { token: result.token }),
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Resend OTP code
   * POST /api/v1/auth/otp/resend
   */
  public resendOTP = async (req: Request, res: Response, next?: unknown): Promise<void> => {
    try {
      const { phoneNumber, email, purpose } = req.body;
      const contactMethod = phoneNumber || email;

      // Validate input - require either phone or email
      if (!contactMethod) {
        this.sendError(
          res,
          "Either phone number or email is required",
          400,
          "INVALID_INPUT"
        );
        return;
      }

      // Validate phone number format if provided
      if (phoneNumber && !this.isValidNigerianPhone(phoneNumber)) {
        this.sendError(
          res,
          "Invalid Nigerian phone number format",
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

      // Use the AuthService resend functionality instead of OTPService
      // since AuthService already supports both phone and email
      const authService = require('../../services/auth/AuthService').AuthService;
      const serviceContainer = require('../../config/serviceContainer').getServiceContainer();
      const authServiceInstance = serviceContainer.getService('authService');

      const result = await authServiceInstance.requestOTP({
        phoneNumber,
        email,
        purpose: purpose || "login"
      });

      this.logAction("OTP_RESENT", undefined, "OTP", undefined, {
        contactMethod: phoneNumber ? this.maskPhoneNumber(phoneNumber) : email,
        purpose,
      });

      const response: ApiResponse<OTPResponse> = {
        success: true,
        message: "OTP resent successfully",
        data: {
          success: true,
          message: `New OTP sent to ${phoneNumber ? this.maskPhoneNumber(phoneNumber) : email}`,
          expiresIn: result.data.expiresIn || 600,
          canResendIn: result.data.canResendIn || 60,
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Check OTP status
   * GET /api/v1/auth/otp/status/:phoneNumber
   */
  public getOTPStatus = async (req: Request, res: Response, next?: unknown): Promise<void> => {
    try {
      const { phoneNumber } = req.params;
      const { purpose } = req.query;

      if (!phoneNumber || !this.isValidNigerianPhone(phoneNumber)) {
        this.sendError(
          res,
          "Valid Nigerian phone number is required",
          400,
          "INVALID_PHONE"
        );
        return;
      }

      const status = await this.otpService.getOTPStatus(
        phoneNumber,
        purpose as string
      );

      const response: ApiResponse<any> = {
        success: true,
        message: "OTP status retrieved successfully",
        data: {
          ...status,
          phoneNumber: this.maskPhoneNumber(phoneNumber),
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get OTP attempts remaining
   * GET /api/v1/auth/otp/attempts/:phoneNumber
   */
  public getAttemptsRemaining = async (
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

      const attempts = await this.otpService.getRemainingAttempts(phoneNumber, "login");

      const response: ApiResponse<{
        attemptsRemaining: number;
        maxAttempts: number;
      }> = {
        success: true,
        message: "Attempts information retrieved successfully",
        data: { attemptsRemaining: attempts, maxAttempts: 3 },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Validate OTP request
   */
  private validateOTPRequest(data: RequestOTPRequest): string[] {
    const errors: string[] = [];

    if (!data.phoneNumber || data.phoneNumber.trim().length === 0) {
      errors.push("Phone number is required");
    } else if (!this.isValidNigerianPhone(data.phoneNumber)) {
      errors.push("Valid Nigerian phone number is required");
    }

    if (
      data.purpose &&
      !["LOGIN", "SIGNUP", "PASSWORD_RESET", "PHONE_VERIFICATION"].includes(
        data.purpose
      )
    ) {
      errors.push("Invalid OTP purpose");
    }

    return errors;
  }

  /**
   * Validate verify OTP request
   */
  private validateVerifyOTPRequest(data: VerifyOTPRequest): string[] {
    const errors: string[] = [];

    if (!data.phoneNumber || data.phoneNumber.trim().length === 0) {
      errors.push("Phone number is required");
    } else if (!this.isValidNigerianPhone(data.phoneNumber)) {
      errors.push("Valid Nigerian phone number is required");
    }

    if (!data.code || data.code.trim().length === 0) {
      errors.push("OTP code is required");
    } else if (!/^\d{6}$/.test(data.code)) {
      errors.push("OTP code must be 6 digits");
    }

    if (
      data.purpose &&
      !["LOGIN", "SIGNUP", "PASSWORD_RESET", "PHONE_VERIFICATION"].includes(
        data.purpose
      )
    ) {
      errors.push("Invalid OTP purpose");
    }

    return errors;
  }

  /**
   * Mask phone number for security
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length < 4) return "****";

    const cleaned = phoneNumber.replace(/\D/g, "");
    if (cleaned.length < 8) return "****";

    const lastFour = cleaned.slice(-4);
    const masked = "*".repeat(cleaned.length - 4) + lastFour;

    return masked;
  }

}
