import { Request, Response } from "express";
import { BaseController } from "../BaseController";
import { AuthService } from "../../services/auth/AuthService";
import { OTPService } from "../../services/auth/OTPService";
import { SessionService } from "../../services/auth/SessionService";
import { AuthenticatedRequest } from "../../types/auth.types";
export declare class AuthController extends BaseController {
    private authService;
    private otpService;
    private sessionService;
    constructor(authService: AuthService, otpService: OTPService, sessionService: SessionService);
    /**
     * User signup with OTP verification
     * POST /api/v1/auth/signup
     */
    signup: (req: Request, res: Response) => Promise<void>;
    /**
     * User login with OTP verification
     * POST /api/v1/auth/login
     */
    login: (req: Request, res: Response) => Promise<void>;
    /**
     * Request OTP for login or signup
     * POST /api/v1/auth/request-otp
     */
    requestOTP: (req: Request, res: Response) => Promise<void>;
    /**
     * Verify OTP (standalone verification)
     * POST /api/v1/auth/verify-otp
     */
    verifyOTP: (req: Request, res: Response) => Promise<void>;
    /**
     * Refresh access token
     * POST /api/v1/auth/refresh
     */
    refreshToken: (req: Request, res: Response) => Promise<void>;
    /**
     * User logout
     * POST /api/v1/auth/logout
     */
    logout: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Get current user info
     * GET /api/v1/auth/me
     */
    getCurrentUser: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Check if phone number is available for registration
     * GET /api/v1/auth/check-phone/:phoneNumber
     */
    checkPhoneAvailability: (req: Request, res: Response) => Promise<void>;
    /**
     * Validate signup request
     */
    private validateSignupRequest;
    /**
     * Validate login request
     */
    private validateLoginRequest;
    /**
     * Mask phone number for security/privacy
     */
    private maskPhoneNumber;
}
//# sourceMappingURL=AuthController.d.ts.map