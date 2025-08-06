import { BaseService } from "../BaseService";
import { UserRepository } from "../../repositories/UserRepository";
import { OTPRepository } from "../../repositories/OTPRepository";
import { SessionRepository } from "../../repositories/SessionRepository";
import { JWTService } from "./JWTService";
import { OTPService } from "./OTPService";
import { SMSService } from "./SMSService";
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
import { OTPPurpose, RefreshTokenResponse } from "@/types/auth.types";

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
   * Request OTP for phone number verification
   * Implements rate limiting and Nigerian phone validation
   */
  async requestOTP(data: RequestOTPRequest): Promise<any> {
    try {
      const { phoneNumber, purpose } = data;

      // Validate Nigerian phone number format
      if (!this.isValidNigerianPhone(phoneNumber)) {
        throw new AppError(
          "Invalid Nigerian phone number format. Use +234XXXXXXXXXX",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT
        );
      }

      // Check rate limiting
      const rateLimitKey = `otp_rate_limit:${phoneNumber}`;
      const rateLimitResult = await redisClient.checkRateLimit(
        rateLimitKey,
        3, // Max 3 OTP requests
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
      if (purpose === "signup") {
        const existingUser =
          await this.userRepository.findByPhoneNumber(phoneNumber);
        if (existingUser) {
          throw new AppError(
            "Phone number already registered. Try logging in instead.",
            HTTP_STATUS.CONFLICT,
            ERROR_CODES.RESOURCE_ALREADY_EXISTS
          );
        }
      }

      // For login, check if user exists
      if (purpose === "login") {
        const user = await this.userRepository.findByPhoneNumber(phoneNumber);
        if (!user) {
          throw new AppError(
            "Phone number not registered. Please sign up first.",
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

      // Invalidate any existing OTP for this phone/purpose
      await this.otpRepository.invalidateExistingOTP(phoneNumber, purpose);

      // Store OTP in database
      await this.otpRepository.create({
        phoneNumber,
        code: otpCode,
        purpose,
        expiresAt,
        isUsed: false,
        attempts: 0,
        maxAttempts: CONSTANTS.MAX_OTP_ATTEMPTS,
      });

      // Send SMS (in production, replace with actual SMS service)
      const smsMessage = this.generateOTPMessage(otpCode, purpose);
      await this.smsService.sendSMS({
        to: phoneNumber,
        message: smsMessage,
      });

      console.log(`🔐 OTP sent to ${phoneNumber}: ${otpCode} (DEV ONLY)`);

      return {
        success: true,
        message: `OTP sent to ${phoneNumber}`,
        data: {
          phoneNumber,
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
   * Verify OTP code
   */
  async verifyOTP(
    data: VerifyOTPRequest
  ): Promise<{ isValid: boolean; userId?: string }> {
    try {
      const { phoneNumber, code, purpose } = data;

      // Find OTP record
      const otpRecord = await this.otpRepository.findValidOTP(
        phoneNumber,
        purpose
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
      if (purpose === "login") {
        const user = await this.userRepository.findByPhoneNumber(phoneNumber);
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

      // Verify OTP first
      const otpVerification = await this.verifyOTP({
        phoneNumber,
        code: otpCode,
        purpose: "signup",
      });

      if (!otpVerification.isValid) {
        throw new AppError(
          "Invalid OTP code",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT
        );
      }

      // Check if user already exists (double-check)
      const existingUser =
        await this.userRepository.findByPhoneNumber(phoneNumber);
      if (existingUser) {
        throw new AppError(
          "User already exists",
          HTTP_STATUS.CONFLICT,
          ERROR_CODES.RESOURCE_ALREADY_EXISTS
        );
      }

      // Check email uniqueness if provided
      if (email) {
        const emailExists = await this.userRepository.emailExists(email);
        if (emailExists) {
          throw new AppError(
            "Email address already registered",
            HTTP_STATUS.CONFLICT,
            ERROR_CODES.RESOURCE_ALREADY_EXISTS
          );
        }
      }

      // Create user
      const user = await this.userRepository.createUser({
        phoneNumber,
        firstName,
        lastName,
        email,
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
      const { phoneNumber, otpCode } = data;

      // Verify OTP
      const otpVerification = await this.verifyOTP({
        phoneNumber,
        code: otpCode,
        purpose: "login",
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
      }),
      this.jwtService.generateRefreshToken({
        userId: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role,
        sessionId,
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
