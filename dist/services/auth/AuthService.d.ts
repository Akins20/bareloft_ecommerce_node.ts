import { User, RequestOTPRequest, RequestOTPResponse, VerifyOTPRequest, SignupRequest, LoginRequest, AuthResponse, RefreshTokenRequest, RefreshTokenResponse } from "@/types";
export declare class AuthService {
    private userRepository;
    private otpRepository;
    private sessionRepository;
    private jwtService;
    private otpService;
    private smsService;
    constructor();
    /**
     * Request OTP for phone number verification
     * Implements rate limiting and Nigerian phone validation
     */
    requestOTP(data: RequestOTPRequest): Promise<RequestOTPResponse>;
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
    signup(data: SignupRequest): Promise<AuthResponse>;
    /**
     * User login with OTP verification
     */
    login(data: LoginRequest): Promise<AuthResponse>;
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
}
//# sourceMappingURL=AuthService.d.ts.map