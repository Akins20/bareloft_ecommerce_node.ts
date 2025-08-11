import { BaseService } from "../BaseService";
import { UserRepository } from "../../repositories/UserRepository";
import { OTPRepository } from "../../repositories/OTPRepository";
import { SessionRepository } from "../../repositories/SessionRepository";
import { JWTService } from "./JWTService";
import { OTPService } from "./OTPService";
import { SMSService } from "./SMSService";
import { EmailHelper } from "../../utils/email/emailHelper";
import {
  User,
  RequestOTPRequest,
  VerifyOTPRequest,
  SignupRequest,
  LoginRequest,
  AuthResponse,
  RefreshTokenRequest,
  NigerianPhoneNumber,
  UserRole,
} from "../../types";
import { AppError, HTTP_STATUS, ERROR_CODES } from "../../types/api.types";
import { redisClient } from "../../config/redis";
import { CONSTANTS } from "../../types/common.types";
import { OTPPurpose, RefreshTokenResponse } from "../../types/auth.types";

export class AuthService extends BaseService {
  private userRepository: any;
  private otpRepository: any;
  private sessionRepository: any;
  private jwtService: any;
  private otpService: any;
  private smsService: any;

  constructor(
    userRepository?: any,
    otpRepository?: any,
    sessionRepository?: any,
    jwtService?: any,
    otpService?: any,
    smsService?: any
  ) {
    super();
    this.userRepository = userRepository || {};
    this.otpRepository = otpRepository || {};
    this.sessionRepository = sessionRepository || {};
    this.jwtService = jwtService || {};
    this.otpService = otpService || {};
    this.smsService = smsService || {};
  }

  /**
   * Request OTP for phone or email verification
   * Implements rate limiting and validation
   */
  async requestOTP(data: RequestOTPRequest): Promise<any> {
    try {
      const { phoneNumber, email, purpose } = data;
      const contactMethod = phoneNumber || email;
      
      if (!contactMethod) {
        throw new AppError(
          "Either phone number or email is required",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT
        );
      }

      // Convert purpose to uppercase for internal use
      const normalizedPurpose = this.normalizePurpose(purpose);

      // Validate contact method format
      if (phoneNumber && !this.isValidNigerianPhone(phoneNumber)) {
        throw new AppError(
          "Invalid Nigerian phone number format. Use +234XXXXXXXXXX",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT
        );
      }
      
      if (email && !EmailHelper.isValidEmail(email)) {
        throw new AppError(
          "Invalid email address format",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT
        );
      }

      // Check rate limiting
      const rateLimitKey = `otp_rate_limit:${contactMethod}`;
      const rateLimitResult = await redisClient.checkRateLimit(
        rateLimitKey,
        10, // Max 10 OTP requests
        CONSTANTS.OTP_RATE_LIMIT_MINUTES * 60 // per 15 minutes
      );

      if (!rateLimitResult.allowed) {
        const retryAfter = new Date(rateLimitResult.resetTime);
        throw new AppError(
          `Too many OTP requests. Try again after ${retryAfter.toLocaleTimeString()}`,
          HTTP_STATUS.TOO_MANY_REQUESTS,
          ERROR_CODES.RATE_LIMIT_EXCEEDED
        );
      }

      // For signup, check if user already exists
      if (normalizedPurpose === "SIGNUP") {
        const existingUser = phoneNumber 
          ? await this.userRepository.findByPhoneNumber(phoneNumber)
          : await this.userRepository.findByEmail(email!);
          
        if (existingUser) {
          const method = phoneNumber ? "Phone number" : "Email address";
          throw new AppError(
            `${method} already registered. Try logging in instead.`,
            HTTP_STATUS.CONFLICT,
            ERROR_CODES.RESOURCE_ALREADY_EXISTS
          );
        }
      }

      // For login, check if user exists
      if (normalizedPurpose === "LOGIN") {
        const user = phoneNumber 
          ? await this.userRepository.findByPhoneNumber(phoneNumber)
          : await this.userRepository.findByEmail(email!);
          
        if (!user) {
          const method = phoneNumber ? "Phone number" : "Email address";
          throw new AppError(
            `${method} not registered. Please sign up first.`,
            HTTP_STATUS.NOT_FOUND,
            ERROR_CODES.RESOURCE_NOT_FOUND
          );
        }

        if (!user.isActive) {
          throw new AppError(
            "Account has been deactivated. Contact support.",
            HTTP_STATUS.FORBIDDEN,
            ERROR_CODES.FORBIDDEN
          );
        }
      }

      // Generate OTP code
      const otpCode = this.otpService.generateOTP();
      const expiresAt = new Date(
        Date.now() + CONSTANTS.OTP_EXPIRY_MINUTES * 60 * 1000
      );

      // Invalidate any existing OTP for this contact method/purpose
      await this.otpRepository.invalidateExistingOTP(contactMethod, normalizedPurpose);

      // Store OTP in database
      await this.otpRepository.create({
        phoneNumber: phoneNumber || null,
        email: email || null,
        code: otpCode,
        purpose: normalizedPurpose,
        expiresAt,
        isUsed: false,
        attempts: 0,
        maxAttempts: CONSTANTS.MAX_OTP_ATTEMPTS,
      });

      // Send OTP via SMS or Email
      if (phoneNumber) {
        await this.smsService.sendOTP(phoneNumber, otpCode, normalizedPurpose.toLowerCase());
        console.log(`🔐 SMS OTP sent to ${phoneNumber}: ${otpCode} (DEV ONLY)`);
      } else if (email) {
        await this.sendEmailOTP(email, otpCode, normalizedPurpose);
        console.log(`📧 Email OTP sent to ${email}: ${otpCode} (DEV ONLY)`);
      }

      return {
        success: true,
        message: `OTP sent to ${phoneNumber || email}`,
        data: {
          phoneNumber,
          email,
          expiresIn: CONSTANTS.OTP_EXPIRY_MINUTES * 60,
          canRetryAt: new Date(rateLimitResult.resetTime),
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Error requesting OTP:", error);
      throw new AppError(
        "Failed to send OTP. Please try again.",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Verify OTP code for phone or email
   */
  async verifyOTP(
    data: VerifyOTPRequest
  ): Promise<{ isValid: boolean; userId?: string }> {
    try {
      const { phoneNumber, email, code, purpose } = data;
      const contactMethod = phoneNumber || email;
      const normalizedPurpose = this.normalizePurpose(purpose);

      // Find OTP record
      const otpRecord = await this.otpRepository.findValidOTP(
        contactMethod,
        normalizedPurpose
      );

      if (!otpRecord) {
        throw new AppError(
          "Invalid or expired OTP code",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT
        );
      }

      // Check if OTP is already used
      if (otpRecord.isUsed) {
        throw new AppError(
          "OTP code has already been used",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT
        );
      }

      // Check expiration
      if (new Date() > otpRecord.expiresAt) {
        throw new AppError(
          "OTP code has expired. Request a new one.",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT
        );
      }

      // Check attempt limit
      if (otpRecord.attempts >= otpRecord.maxAttempts) {
        throw new AppError(
          "Maximum OTP attempts exceeded. Request a new code.",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT
        );
      }

      // Verify code
      const isValidCode = await this.otpService.verifyOTPCode(
        otpRecord.code,
        code
      );

      if (!isValidCode) {
        // Increment attempts
        await this.otpRepository.incrementAttempts(otpRecord.id);

        const remainingAttempts =
          otpRecord.maxAttempts - (otpRecord.attempts + 1);
        throw new AppError(
          `Invalid OTP code. ${remainingAttempts} attempts remaining.`,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT
        );
      }

      // Mark OTP as used
      await this.otpRepository.markAsUsed(otpRecord.id);

      // For login, get user ID
      let userId: string | undefined;
      if (normalizedPurpose === "LOGIN") {
        const user = phoneNumber 
          ? await this.userRepository.findByPhoneNumber(phoneNumber)
          : await this.userRepository.findByEmail(email!);
        userId = user?.id;
      }

      return { isValid: true, userId };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Error verifying OTP:", error);
      throw new AppError(
        "Failed to verify OTP. Please try again.",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * User signup with OTP verification
   */
  async signup(data: SignupRequest): Promise<any> {
    try {
      const { phoneNumber, firstName, lastName, email, otpCode } = data;
      
      if (!phoneNumber && !email) {
        throw new AppError(
          "Either phone number or email is required for signup",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT
        );
      }

      // Verify OTP first
      const otpVerification = await this.verifyOTP({
        phoneNumber,
        email,
        code: otpCode,
        purpose: "SIGNUP",
      });

      if (!otpVerification.isValid) {
        throw new AppError(
          "Invalid OTP code",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT
        );
      }

      // Note: User existence was already validated during OTP request phase
      // The OTP verification confirms this is a valid signup attempt
      // No need for redundant existence checks here

      // Create user with proper contact method handling
      const user = await this.userRepository.createUser({
        phoneNumber: phoneNumber || null, // Only set if provided
        firstName,
        lastName,
        email: email || null, // Only set if provided  
        role: "CUSTOMER",
      });

      // Mark user as verified (OTP was verified)
      await this.userRepository.verifyUser(user.id);

      // Generate tokens
      const { accessToken, refreshToken } = await this.generateTokens(user);

      // Create session
      await this.createSession(user.id, accessToken, refreshToken);

      return {
        success: true,
        message: "Account created successfully",
        data: {
          user: this.sanitizeUser(user),
          accessToken,
          refreshToken,
          expiresIn: this.jwtService.getAccessTokenExpiresIn(),
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Error during signup:", error);
      throw new AppError(
        "Failed to create account. Please try again.",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * User login with OTP verification
   */
  async login(data: LoginRequest): Promise<any> {
    try {
      const { phoneNumber, email, otpCode } = data;
      
      if (!phoneNumber && !email) {
        throw new AppError(
          "Either phone number or email is required for login",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT
        );
      }

      // Verify OTP
      const otpVerification = await this.verifyOTP({
        phoneNumber,
        email,
        code: otpCode,
        purpose: "LOGIN",
      });

      if (!otpVerification.isValid || !otpVerification.userId) {
        throw new AppError(
          "Invalid OTP code",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT
        );
      }

      // Get user
      const user = await this.userRepository.findById(otpVerification.userId);
      if (!user) {
        throw new AppError(
          "User not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Check if user is active
      if (!user.isActive) {
        throw new AppError(
          "Account has been deactivated. Contact support.",
          HTTP_STATUS.FORBIDDEN,
          ERROR_CODES.FORBIDDEN
        );
      }

      // Update last login
      await this.userRepository.updateLastLogin(user.id);

      // Generate tokens
      const { accessToken, refreshToken } = await this.generateTokens(user);

      // Create session
      await this.createSession(user.id, accessToken, refreshToken);

      return {
        success: true,
        message: "Login successful",
        data: {
          user: this.sanitizeUser(user),
          accessToken,
          refreshToken,
          expiresIn: this.jwtService.getAccessTokenExpiresIn(),
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Error during login:", error);
      throw new AppError(
        "Failed to log in. Please try again.",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    try {
      const { refreshToken } = data;

      // Verify refresh token
      const payload = await this.jwtService.verifyRefreshToken(refreshToken);

      // Get session
      const session = await this.sessionRepository.findBySessionId(
        payload.sessionId
      );
      if (!session || !session.isActive) {
        throw new AppError(
          "Invalid session",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.UNAUTHORIZED
        );
      }

      // Check if refresh token matches
      if (session.refreshToken !== refreshToken) {
        throw new AppError(
          "Invalid refresh token",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.UNAUTHORIZED
        );
      }

      // Get user
      const user = await this.userRepository.findById(payload.userId);
      if (!user || !user.isActive) {
        throw new AppError(
          "User not found or inactive",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.UNAUTHORIZED
        );
      }

      // Generate new access token
      const newAccessToken = await this.jwtService.generateAccessToken({
        userId: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role,
        sessionId: session.sessionId,
        type: 'access'
      });

      // Update session with new access token
      await this.sessionRepository.updateTokens(
        session.id,
        newAccessToken,
        refreshToken
      );

      return {
        success: true,
        message: "Token refreshed successfully",
        accessToken: newAccessToken,
        expiresIn: this.jwtService.getAccessTokenExpiresIn(),
        userId: user.id,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Error refreshing token:", error);
      throw new AppError(
        "Failed to refresh token",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }
  }

  /**
   * Logout user
   */
  async logout(sessionId: string): Promise<void> {
    try {
      await this.sessionRepository.deactivateSession(sessionId);
    } catch (error) {
      console.error("Error during logout:", error);
      // Don't throw error on logout failure
    }
  }

  /**
   * Validate access token and return user
   */
  async validateToken(token: string): Promise<User> {
    try {
      const payload = await this.jwtService.verifyAccessToken(token);

      // Get session
      const session = await this.sessionRepository.findBySessionId(
        payload.sessionId
      );
      if (!session || !session.isActive) {
        throw new AppError(
          "Invalid session",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.TOKEN_INVALID
        );
      }

      // Get user
      const user = await this.userRepository.findById(payload.userId);
      if (!user || !user.isActive) {
        throw new AppError(
          "User not found or inactive",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.UNAUTHORIZED
        );
      }

      return user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        "Invalid token",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.TOKEN_INVALID
      );
    }
  }

  // Private helper methods
  private isValidNigerianPhone(phone: string): boolean {
    const nigerianPhoneRegex = /^(\+234)[789][01][0-9]{8}$/;
    return nigerianPhoneRegex.test(phone);
  }

  private normalizePurpose(purpose: string): OTPPurpose {
    const purposeMap: { [key: string]: OTPPurpose } = {
      'login': 'LOGIN',
      'signup': 'SIGNUP', 
      'password_reset': 'PASSWORD_RESET',
      'phone_verification': 'PHONE_VERIFICATION',
      'LOGIN': 'LOGIN',
      'SIGNUP': 'SIGNUP',
      'PASSWORD_RESET': 'PASSWORD_RESET',
      'PHONE_VERIFICATION': 'PHONE_VERIFICATION'
    };
    
    return purposeMap[purpose] || 'LOGIN';
  }

  private generateOTPMessage(code: string, purpose: OTPPurpose): string {
    const messages = {
      signup: `Welcome to Bareloft! Your verification code is: ${code}. Valid for 10 minutes.`,
      login: `Your Bareloft login code is: ${code}. Valid for 10 minutes.`,
      password_reset: `Your Bareloft password reset code is: ${code}. Valid for 10 minutes.`,
      phone_verification: `Your Bareloft verification code is: ${code}. Valid for 10 minutes.`,
    };
    return messages[purpose];
  }

  private async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const sessionId = this.generateSessionId();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.generateAccessToken({
        userId: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role,
        sessionId,
        type: 'access'
      }),
      this.jwtService.generateRefreshToken({
        userId: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role,
        sessionId,
        type: 'refresh'
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async createSession(
    userId: string,
    accessToken: string,
    refreshToken: string
  ): Promise<void> {
    const sessionId = this.extractSessionIdFromToken(accessToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.sessionRepository.create({
      userId,
      sessionId,
      accessToken,
      refreshToken,
      expiresAt,
      isActive: true,
    });
  }

  private extractSessionIdFromToken(token: string): string {
    const payload = this.jwtService.decodeToken(token);
    return payload.sessionId;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private sanitizeUser(user: User): any {
    const { ...sanitized } = user;
    return {
      id: sanitized.id,
      phoneNumber: sanitized.phoneNumber,
      email: sanitized.email,
      firstName: sanitized.firstName,
      lastName: sanitized.lastName,
      avatar: sanitized.avatar,
      role: sanitized.role,
      isVerified: sanitized.isVerified,
      createdAt: sanitized.createdAt,
    };
  }

  /**
   * Find user by phone number
   */
  async findUserByPhone(
    phoneNumber: NigerianPhoneNumber
  ): Promise<User | null> {
    return await this.userRepository.findByPhoneNumber(phoneNumber);
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findByEmail(email);
  }

  /**
   * Update user last login
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepository.updateLastLogin(userId);
  }

  /**
   * Find user by ID
   */
  async findUserById(userId: string): Promise<User | null> {
    return await this.userRepository.findById(userId);
  }

  /**
   * Send OTP via email
   */
  private async sendEmailOTP(email: string, otpCode: string, purpose: OTPPurpose): Promise<void> {
    try {
      const subject = this.getEmailOTPSubject(purpose);
      const html = this.getEmailOTPTemplate(otpCode, purpose);
      
      await EmailHelper.sendPlainEmail({
        to: email,
        subject,
        text: `Your Bareloft verification code is: ${otpCode}. Valid for 10 minutes.`,
        html,
      });
    } catch (error) {
      console.error("Failed to send email OTP:", error);
      throw new AppError(
        "Failed to send OTP email. Please try again.",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Get email subject for OTP based on purpose
   */
  private getEmailOTPSubject(purpose: OTPPurpose): string {
    const subjects = {
      SIGNUP: "🎉 Welcome to Bareloft - Your Verification Code",
      LOGIN: "🔐 Bareloft Login - Your Verification Code", 
      PASSWORD_RESET: "🔑 Bareloft Password Reset - Your Verification Code",
      PHONE_VERIFICATION: "📱 Bareloft Phone Verification - Your Verification Code",
    };
    return subjects[purpose] || "🔐 Bareloft - Your Verification Code";
  }

  /**
   * Get email HTML template for OTP
   */
  private getEmailOTPTemplate(otpCode: string, purpose: OTPPurpose): string {
    const purposeText = {
      SIGNUP: "complete your account registration",
      LOGIN: "sign in to your account",
      PASSWORD_RESET: "reset your password", 
      PHONE_VERIFICATION: "verify your phone number",
    };

    // Bareloft brand colors
    const colors = {
      primary: "#007cba",      // Bareloft blue
      primaryDark: "#005a8b",  // Darker blue
      neutral900: "#1a202c",   // Dark text
      neutral700: "#4a5568",   // Medium text
      neutral500: "#718096",   // Light text
      neutral200: "#e2e8f0",   // Light border
      neutral100: "#f7fafc",   // Light background
      success: "#38a169",      // Success green
    };

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bareloft Verification Code</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
            <!-- Header with brand colors -->
            <div style="background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 600; letter-spacing: 1px;">Bareloft</h1>
                <p style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin: 8px 0 0 0;">Nigerian E-commerce Platform</p>
            </div>
            
            <div style="padding: 40px 30px;">
                <div style="text-align: center; margin-bottom: 40px;">
                    <h2 style="color: ${colors.neutral900}; font-size: 24px; margin: 0 0 16px 0; font-weight: 600;">Your Verification Code</h2>
                    <p style="color: ${colors.neutral700}; font-size: 16px; line-height: 1.6; margin: 0;">
                        Use this code to ${purposeText[purpose] || "verify your account"}:
                    </p>
                </div>
                
                <!-- OTP Code with Bareloft branding -->
                <div style="text-align: center; margin: 40px 0;">
                    <div style="display: inline-block; background: linear-gradient(135deg, ${colors.neutral100} 0%, #ffffff 100%); border: 3px solid ${colors.primary}; border-radius: 16px; padding: 24px 32px; box-shadow: 0 2px 8px rgba(0, 124, 186, 0.15);">
                        <span style="font-size: 36px; font-weight: bold; color: ${colors.primary}; letter-spacing: 6px; font-family: 'Courier New', monospace;">${otpCode}</span>
                    </div>
                </div>
                
                <!-- Instructions -->
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="background-color: ${colors.neutral100}; border-left: 4px solid ${colors.success}; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <p style="color: ${colors.neutral700}; font-size: 14px; line-height: 1.6; margin: 0;">
                            <strong style="color: ${colors.neutral900};">⏰ This code will expire in 10 minutes</strong><br>
                            If you didn't request this code, please ignore this email.
                        </p>
                    </div>
                </div>
                
                <!-- Support section -->
                <div style="text-align: center; border-top: 1px solid ${colors.neutral200}; padding-top: 24px;">
                    <p style="color: ${colors.neutral500}; font-size: 13px; line-height: 1.5; margin: 0;">
                        Need help? Contact us at <a href="mailto:support@bareloft.com" style="color: ${colors.primary}; text-decoration: none;">support@bareloft.com</a>
                    </p>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: ${colors.neutral100}; padding: 24px; text-align: center; border-top: 1px solid ${colors.neutral200};">
                <p style="color: ${colors.neutral500}; font-size: 12px; margin: 0; line-height: 1.4;">
                    © 2025 Bareloft. All rights reserved.<br>
                    <span style="color: ${colors.neutral700};">🇳🇬 Proudly serving Nigerian e-commerce</span>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Get current user (sanitized)
   */
  async getCurrentUser(userId: string): Promise<any> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError(
        "User not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND
      );
    }
    return this.sanitizeUser(user);
  }
}
