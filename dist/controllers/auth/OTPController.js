"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTPController = void 0;
const BaseController_1 = require("../BaseController");
class OTPController extends BaseController_1.BaseController {
    otpService;
    constructor(otpService) {
        super();
        this.otpService = otpService;
    }
    /**
     * Request OTP code
     * POST /api/v1/auth/otp/request
     */
    requestOTP = async (req, res) => {
        try {
            const { phoneNumber, purpose } = req.body;
            // Validate input
            const validationErrors = this.validateOTPRequest({
                phoneNumber,
                purpose,
            });
            if (validationErrors.length > 0) {
                this.sendError(res, "Validation failed", 400, "VALIDATION_ERROR", validationErrors);
                return;
            }
            // Check rate limiting
            const canRequest = await this.otpService.checkRateLimit(phoneNumber);
            if (!canRequest) {
                this.sendError(res, "Too many OTP requests. Please wait before requesting again.", 429, "RATE_LIMIT_EXCEEDED");
                return;
            }
            const result = await this.otpService.generateAndSendOTP(phoneNumber, purpose || "login");
            if (!result.success) {
                this.sendError(res, result.message, 400, "OTP_REQUEST_FAILED");
                return;
            }
            const response = {
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
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Verify OTP code
     * POST /api/v1/auth/otp/verify
     */
    verifyOTP = async (req, res) => {
        try {
            const { phoneNumber, code, purpose } = req.body;
            // Validate input
            const validationErrors = this.validateVerifyOTPRequest({
                phoneNumber,
                code,
                purpose,
            });
            if (validationErrors.length > 0) {
                this.sendError(res, "Validation failed", 400, "VALIDATION_ERROR", validationErrors);
                return;
            }
            const result = await this.otpService.verifyOTP(phoneNumber, code, purpose || "login");
            if (!result.success) {
                // Log failed verification attempt
                this.logAction("OTP_VERIFY_FAILED", undefined, "OTP", undefined, {
                    phoneNumber: this.maskPhoneNumber(phoneNumber),
                    purpose,
                    reason: result.message,
                });
                this.sendError(res, result.message, 400, "OTP_VERIFICATION_FAILED");
                return;
            }
            // Log successful verification
            this.logAction("OTP_VERIFIED", undefined, "OTP", undefined, {
                phoneNumber: this.maskPhoneNumber(phoneNumber),
                purpose,
            });
            const response = {
                success: true,
                message: "OTP verified successfully",
                data: {
                    verified: true,
                    ...(result.token && { token: result.token }),
                },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Resend OTP code
     * POST /api/v1/auth/otp/resend
     */
    resendOTP = async (req, res) => {
        try {
            const { phoneNumber, purpose } = req.body;
            // Validate input
            if (!phoneNumber || !this.isValidNigerianPhone(phoneNumber)) {
                this.sendError(res, "Valid Nigerian phone number is required", 400, "INVALID_PHONE");
                return;
            }
            // Check if can resend
            const canResend = await this.otpService.canResendOTP(phoneNumber);
            if (!canResend.allowed) {
                this.sendError(res, canResend.message, 429, "RESEND_NOT_ALLOWED");
                return;
            }
            const result = await this.otpService.resendOTP(phoneNumber, purpose || "login");
            if (!result.success) {
                this.sendError(res, result.message, 400, "OTP_RESEND_FAILED");
                return;
            }
            this.logAction("OTP_RESENT", undefined, "OTP", undefined, {
                phoneNumber: this.maskPhoneNumber(phoneNumber),
                purpose,
            });
            const response = {
                success: true,
                message: "OTP resent successfully",
                data: {
                    success: true,
                    message: `New OTP sent to ${this.maskPhoneNumber(phoneNumber)}`,
                    expiresIn: result.expiresIn,
                    canResendIn: result.canResendIn,
                },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Check OTP status
     * GET /api/v1/auth/otp/status/:phoneNumber
     */
    getOTPStatus = async (req, res) => {
        try {
            const { phoneNumber } = req.params;
            const { purpose } = req.query;
            if (!phoneNumber || !this.isValidNigerianPhone(phoneNumber)) {
                this.sendError(res, "Valid Nigerian phone number is required", 400, "INVALID_PHONE");
                return;
            }
            const status = await this.otpService.getOTPStatus(phoneNumber, purpose);
            const response = {
                success: true,
                message: "OTP status retrieved successfully",
                data: {
                    ...status,
                    phoneNumber: this.maskPhoneNumber(phoneNumber),
                },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get OTP attempts remaining
     * GET /api/v1/auth/otp/attempts/:phoneNumber
     */
    getAttemptsRemaining = async (req, res) => {
        try {
            const { phoneNumber } = req.params;
            if (!phoneNumber || !this.isValidNigerianPhone(phoneNumber)) {
                this.sendError(res, "Valid Nigerian phone number is required", 400, "INVALID_PHONE");
                return;
            }
            const attempts = await this.otpService.getRemainingAttempts(phoneNumber);
            const response = {
                success: true,
                message: "Attempts information retrieved successfully",
                data: attempts,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Validate OTP request
     */
    validateOTPRequest(data) {
        const errors = [];
        if (!data.phoneNumber || data.phoneNumber.trim().length === 0) {
            errors.push("Phone number is required");
        }
        else if (!this.isValidNigerianPhone(data.phoneNumber)) {
            errors.push("Valid Nigerian phone number is required");
        }
        if (data.purpose &&
            !["login", "signup", "password_reset", "phone_verification"].includes(data.purpose)) {
            errors.push("Invalid OTP purpose");
        }
        return errors;
    }
    /**
     * Validate verify OTP request
     */
    validateVerifyOTPRequest(data) {
        const errors = [];
        if (!data.phoneNumber || data.phoneNumber.trim().length === 0) {
            errors.push("Phone number is required");
        }
        else if (!this.isValidNigerianPhone(data.phoneNumber)) {
            errors.push("Valid Nigerian phone number is required");
        }
        if (!data.code || data.code.trim().length === 0) {
            errors.push("OTP code is required");
        }
        else if (!/^\d{6}$/.test(data.code)) {
            errors.push("OTP code must be 6 digits");
        }
        if (data.purpose &&
            !["login", "signup", "password_reset", "phone_verification"].includes(data.purpose)) {
            errors.push("Invalid OTP purpose");
        }
        return errors;
    }
    /**
     * Mask phone number for security
     */
    maskPhoneNumber(phoneNumber) {
        if (phoneNumber.length < 4)
            return "****";
        const cleaned = phoneNumber.replace(/\D/g, "");
        if (cleaned.length < 8)
            return "****";
        const lastFour = cleaned.slice(-4);
        const masked = "*".repeat(cleaned.length - 4) + lastFour;
        return masked;
    }
}
exports.OTPController = OTPController;
//# sourceMappingURL=OTPController.js.map