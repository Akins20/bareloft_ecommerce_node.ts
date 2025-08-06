import { BaseService } from "../BaseService";
import { User, RequestOTPRequest, VerifyOTPRequest, SignupRequest, LoginRequest, RefreshTokenRequest, NigerianPhoneNumber } from "../../types";
import { RefreshTokenResponse } from "@/types/auth.types";
export declare class AuthService extends BaseService {
    private userRepository;
    private otpRepository;
    private sessionRepository;
    private jwtService;
    private otpService;
    private smsService;
    constructor(userRepository?: any, otpRepository?: any, sessionRepository?: any, jwtService?: any, otpService?: any, smsService?: any);
    /**
     * Request OTP for phone number verification
     * Implements rate limiting and Nigerian phone validation
     */
    requestOTP(data: RequestOTPRequest): Promise<any>;
    /**
     * Verify OTP code
     */
    verifyOTP(data: VerifyOTPRequest): Promise<{
        isValid: boolean;
        userId?: string;
    }>;
    /**
     * User signup with OTP verification
     */
    signup(data: SignupRequest): Promise<any>;
    /**
     * User login with OTP verification
     */
    login(data: LoginRequest): Promise<any>;
    /**
     * Refresh access token
     */
    refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse>;
    /**
     * Logout user
     */
    logout(sessionId: string): Promise<void>;
    /**
     * Validate access token and return user
     */
    validateToken(token: string): Promise<User>;
    private isValidNigerianPhone;
    private generateOTPMessage;
    private generateTokens;
    private createSession;
    private extractSessionIdFromToken;
    private generateSessionId;
    private sanitizeUser;
    /**
     * Find user by phone number
     */
    findUserByPhone(phoneNumber: NigerianPhoneNumber): Promise<User | null>;
    /**
     * Find user by email
     */
    findUserByEmail(email: string): Promise<User | null>;
    /**
     * Update user last login
     */
    updateLastLogin(userId: string): Promise<void>;
    /**
     * Find user by ID
     */
    findUserById(userId: string): Promise<User | null>;
    /**
     * Get current user (sanitized)
     */
    getCurrentUser(userId: string): Promise<any>;
}
//# sourceMappingURL=AuthService.d.ts.map