"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const UserRepository_1 = require("@/repositories/UserRepository");
const OTPRepository_1 = require("@/repositories/OTPRepository");
const SessionRepository_1 = require("@/repositories/SessionRepository");
const JWTService_1 = require("./JWTService");
const OTPService_1 = require("./OTPService");
const SMSService_1 = require("./SMSService");
const api_types_1 = require("@/types/api.types");
const redis_1 = require("@/config/redis");
const common_types_1 = require("@/types/common.types");
class AuthService {
    userRepository;
    otpRepository;
    sessionRepository;
    jwtService;
    otpService;
    smsService;
    constructor() {
        this.userRepository = new UserRepository_1.UserRepository();
        this.otpRepository = new OTPRepository_1.OTPRepository();
        this.sessionRepository = new SessionRepository_1.SessionRepository();
        this.jwtService = new JWTService_1.JWTService();
        this.otpService = new OTPService_1.OTPService();
        this.smsService = new SMSService_1.SMSService();
    }
    /**
     * Request OTP for phone number verification
     * Implements rate limiting and Nigerian phone validation
     */
    async requestOTP(data) {
        try {
            const { phoneNumber, purpose } = data;
            // Validate Nigerian phone number format
            if (!this.isValidNigerianPhone(phoneNumber)) {
                throw new api_types_1.AppError("Invalid Nigerian phone number format. Use +234XXXXXXXXXX", api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.INVALID_INPUT);
            }
            // Check rate limiting
            const rateLimitKey = `otp_rate_limit:${phoneNumber}`;
            const rateLimitResult = await redis_1.redisClient.checkRateLimit(rateLimitKey, 3, // Max 3 OTP requests
            common_types_1.CONSTANTS.OTP_RATE_LIMIT_MINUTES * 60 // per 15 minutes
            );
            if (!rateLimitResult.allowed) {
                const retryAfter = new Date(rateLimitResult.resetTime);
                throw new api_types_1.AppError(`Too many OTP requests. Try again after ${retryAfter.toLocaleTimeString()}`, api_types_1.HTTP_STATUS.TOO_MANY_REQUESTS, api_types_1.ERROR_CODES.RATE_LIMIT_EXCEEDED);
            }
            // For signup, check if user already exists
            if (purpose === "signup") {
                const existingUser = await this.userRepository.findByPhoneNumber(phoneNumber);
                if (existingUser) {
                    throw new api_types_1.AppError("Phone number already registered. Try logging in instead.", api_types_1.HTTP_STATUS.CONFLICT, api_types_1.ERROR_CODES.RESOURCE_ALREADY_EXISTS);
                }
            }
            // For login, check if user exists
            if (purpose === "login") {
                const user = await this.userRepository.findByPhoneNumber(phoneNumber);
                if (!user) {
                    throw new api_types_1.AppError("Phone number not registered. Please sign up first.", api_types_1.HTTP_STATUS.NOT_FOUND, api_types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
                }
                if (!user.isActive) {
                    throw new api_types_1.AppError("Account has been deactivated. Contact support.", api_types_1.HTTP_STATUS.FORBIDDEN, api_types_1.ERROR_CODES.FORBIDDEN);
                }
            }
            // Generate OTP code
            const otpCode = this.otpService.generateOTP();
            const expiresAt = new Date(Date.now() + common_types_1.CONSTANTS.OTP_EXPIRY_MINUTES * 60 * 1000);
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
                maxAttempts: common_types_1.CONSTANTS.MAX_OTP_ATTEMPTS,
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
                    expiresIn: common_types_1.CONSTANTS.OTP_EXPIRY_MINUTES * 60,
                    canRetryAt: new Date(rateLimitResult.resetTime),
                },
            };
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            console.error("Error requesting OTP:", error);
            throw new api_types_1.AppError("Failed to send OTP. Please try again.", api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    /**
     * Verify OTP code
     */
    async verifyOTP(data) {
        try {
            const { phoneNumber, code, purpose } = data;
            // Find OTP record
            const otpRecord = await this.otpRepository.findValidOTP(phoneNumber, purpose);
            if (!otpRecord) {
                throw new api_types_1.AppError("Invalid or expired OTP code", api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.INVALID_INPUT);
            }
            // Check if OTP is already used
            if (otpRecord.isUsed) {
                throw new api_types_1.AppError("OTP code has already been used", api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.INVALID_INPUT);
            }
            // Check expiration
            if (new Date() > otpRecord.expiresAt) {
                throw new api_types_1.AppError("OTP code has expired. Request a new one.", api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.INVALID_INPUT);
            }
            // Check attempt limit
            if (otpRecord.attempts >= otpRecord.maxAttempts) {
                throw new api_types_1.AppError("Maximum OTP attempts exceeded. Request a new code.", api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.INVALID_INPUT);
            }
            // Verify code
            const isValidCode = await this.otpService.verifyOTPCode(otpRecord.code, code);
            if (!isValidCode) {
                // Increment attempts
                await this.otpRepository.incrementAttempts(otpRecord.id);
                const remainingAttempts = otpRecord.maxAttempts - (otpRecord.attempts + 1);
                throw new api_types_1.AppError(`Invalid OTP code. ${remainingAttempts} attempts remaining.`, api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.INVALID_INPUT);
            }
            // Mark OTP as used
            await this.otpRepository.markAsUsed(otpRecord.id);
            // For login, get user ID
            let userId;
            if (purpose === "login") {
                const user = await this.userRepository.findByPhoneNumber(phoneNumber);
                userId = user?.id;
            }
            return { isValid: true, userId };
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            console.error("Error verifying OTP:", error);
            throw new api_types_1.AppError("Failed to verify OTP. Please try again.", api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    /**
     * User signup with OTP verification
     */
    async signup(data) {
        try {
            const { phoneNumber, firstName, lastName, email, otpCode } = data;
            // Verify OTP first
            const otpVerification = await this.verifyOTP({
                phoneNumber,
                code: otpCode,
                purpose: "signup",
            });
            if (!otpVerification.isValid) {
                throw new api_types_1.AppError("Invalid OTP code", api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.INVALID_INPUT);
            }
            // Check if user already exists (double-check)
            const existingUser = await this.userRepository.findByPhoneNumber(phoneNumber);
            if (existingUser) {
                throw new api_types_1.AppError("User already exists", api_types_1.HTTP_STATUS.CONFLICT, api_types_1.ERROR_CODES.RESOURCE_ALREADY_EXISTS);
            }
            // Check email uniqueness if provided
            if (email) {
                const emailExists = await this.userRepository.emailExists(email);
                if (emailExists) {
                    throw new api_types_1.AppError("Email address already registered", api_types_1.HTTP_STATUS.CONFLICT, api_types_1.ERROR_CODES.RESOURCE_ALREADY_EXISTS);
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
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            console.error("Error during signup:", error);
            throw new api_types_1.AppError("Failed to create account. Please try again.", api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    /**
     * User login with OTP verification
     */
    async login(data) {
        try {
            const { phoneNumber, otpCode } = data;
            // Verify OTP
            const otpVerification = await this.verifyOTP({
                phoneNumber,
                code: otpCode,
                purpose: "login",
            });
            if (!otpVerification.isValid || !otpVerification.userId) {
                throw new api_types_1.AppError("Invalid OTP code", api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.INVALID_INPUT);
            }
            // Get user
            const user = await this.userRepository.findById(otpVerification.userId);
            if (!user) {
                throw new api_types_1.AppError("User not found", api_types_1.HTTP_STATUS.NOT_FOUND, api_types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            // Check if user is active
            if (!user.isActive) {
                throw new api_types_1.AppError("Account has been deactivated. Contact support.", api_types_1.HTTP_STATUS.FORBIDDEN, api_types_1.ERROR_CODES.FORBIDDEN);
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
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            console.error("Error during login:", error);
            throw new api_types_1.AppError("Failed to log in. Please try again.", api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    /**
     * Refresh access token
     */
    async refreshToken(data) {
        try {
            const { refreshToken } = data;
            // Verify refresh token
            const payload = await this.jwtService.verifyRefreshToken(refreshToken);
            // Get session
            const session = await this.sessionRepository.findBySessionId(payload.sessionId);
            if (!session || !session.isActive) {
                throw new api_types_1.AppError("Invalid session", api_types_1.HTTP_STATUS.UNAUTHORIZED, api_types_1.ERROR_CODES.UNAUTHORIZED);
            }
            // Check if refresh token matches
            if (session.refreshToken !== refreshToken) {
                throw new api_types_1.AppError("Invalid refresh token", api_types_1.HTTP_STATUS.UNAUTHORIZED, api_types_1.ERROR_CODES.UNAUTHORIZED);
            }
            // Get user
            const user = await this.userRepository.findById(payload.userId);
            if (!user || !user.isActive) {
                throw new api_types_1.AppError("User not found or inactive", api_types_1.HTTP_STATUS.UNAUTHORIZED, api_types_1.ERROR_CODES.UNAUTHORIZED);
            }
            // Generate new access token
            const newAccessToken = await this.jwtService.generateAccessToken({
                userId: user.id,
                phoneNumber: user.phoneNumber,
                role: user.role,
                sessionId: session.sessionId,
            });
            // Update session with new access token
            await this.sessionRepository.updateTokens(session.id, newAccessToken, refreshToken);
            return {
                success: true,
                message: "Token refreshed successfully",
                accessToken: newAccessToken,
                expiresIn: this.jwtService.getAccessTokenExpiresIn(),
                userId: user.id,
            };
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            console.error("Error refreshing token:", error);
            throw new api_types_1.AppError("Failed to refresh token", api_types_1.HTTP_STATUS.UNAUTHORIZED, api_types_1.ERROR_CODES.UNAUTHORIZED);
        }
    }
    /**
     * Logout user
     */
    async logout(sessionId) {
        try {
            await this.sessionRepository.deactivateSession(sessionId);
        }
        catch (error) {
            console.error("Error during logout:", error);
            // Don't throw error on logout failure
        }
    }
    /**
     * Validate access token and return user
     */
    async validateToken(token) {
        try {
            const payload = await this.jwtService.verifyAccessToken(token);
            // Get session
            const session = await this.sessionRepository.findBySessionId(payload.sessionId);
            if (!session || !session.isActive) {
                throw new api_types_1.AppError("Invalid session", api_types_1.HTTP_STATUS.UNAUTHORIZED, api_types_1.ERROR_CODES.TOKEN_INVALID);
            }
            // Get user
            const user = await this.userRepository.findById(payload.userId);
            if (!user || !user.isActive) {
                throw new api_types_1.AppError("User not found or inactive", api_types_1.HTTP_STATUS.UNAUTHORIZED, api_types_1.ERROR_CODES.UNAUTHORIZED);
            }
            return user;
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            throw new api_types_1.AppError("Invalid token", api_types_1.HTTP_STATUS.UNAUTHORIZED, api_types_1.ERROR_CODES.TOKEN_INVALID);
        }
    }
    // Private helper methods
    isValidNigerianPhone(phone) {
        const nigerianPhoneRegex = /^(\+234)[789][01][0-9]{8}$/;
        return nigerianPhoneRegex.test(phone);
    }
    generateOTPMessage(code, purpose) {
        const messages = {
            signup: `Welcome to Bareloft! Your verification code is: ${code}. Valid for 10 minutes.`,
            login: `Your Bareloft login code is: ${code}. Valid for 10 minutes.`,
            password_reset: `Your Bareloft password reset code is: ${code}. Valid for 10 minutes.`,
            phone_verification: `Your Bareloft verification code is: ${code}. Valid for 10 minutes.`,
        };
        return messages[purpose];
    }
    async generateTokens(user) {
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
    async createSession(userId, accessToken, refreshToken) {
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
    extractSessionIdFromToken(token) {
        const payload = this.jwtService.decodeToken(token);
        return payload.sessionId;
    }
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    }
    sanitizeUser(user) {
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
    async findUserByPhone(phoneNumber) {
        return await this.userRepository.findByPhoneNumber(phoneNumber);
    }
    /**
     * Find user by email
     */
    async findUserByEmail(email) {
        return await this.userRepository.findByEmail(email);
    }
    /**
     * Update user last login
     */
    async updateLastLogin(userId) {
        await this.userRepository.updateLastLogin(userId);
    }
    /**
     * Find user by ID
     */
    async findUserById(userId) {
        return await this.userRepository.findById(userId);
    }
    /**
     * Get current user (sanitized)
     */
    async getCurrentUser(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new api_types_1.AppError("User not found", api_types_1.HTTP_STATUS.NOT_FOUND, api_types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
        }
        return this.sanitizeUser(user);
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=AuthService.js.map