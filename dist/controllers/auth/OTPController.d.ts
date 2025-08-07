import { Request, Response } from "express";
import { BaseController } from "../BaseController";
import { OTPService } from "../../services/auth/OTPService";
export declare class OTPController extends BaseController {
    private otpService;
    constructor(otpService: OTPService);
    /**
     * Request OTP code
     * POST /api/v1/auth/otp/request
     */
    requestOTP: (req: Request, res: Response) => Promise<void>;
    /**
     * Verify OTP code
     * POST /api/v1/auth/otp/verify
     */
    verifyOTP: (req: Request, res: Response) => Promise<void>;
    /**
     * Resend OTP code
     * POST /api/v1/auth/otp/resend
     */
    resendOTP: (req: Request, res: Response, next?: unknown) => Promise<void>;
    /**
     * Check OTP status
     * GET /api/v1/auth/otp/status/:phoneNumber
     */
    getOTPStatus: (req: Request, res: Response, next?: unknown) => Promise<void>;
    /**
     * Get OTP attempts remaining
     * GET /api/v1/auth/otp/attempts/:phoneNumber
     */
    getAttemptsRemaining: (req: Request, res: Response, next?: unknown) => Promise<void>;
    /**
     * Validate OTP request
     */
    private validateOTPRequest;
    /**
     * Validate verify OTP request
     */
    private validateVerifyOTPRequest;
    /**
     * Mask phone number for security
     */
    private maskPhoneNumber;
}
//# sourceMappingURL=OTPController.d.ts.map