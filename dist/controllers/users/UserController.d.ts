import { Response } from "express";
import { BaseController } from "../BaseController";
import { UserService } from "../../services/users/UserService";
import { AuthenticatedRequest } from "../../types/auth.types";
export declare class UserController extends BaseController {
    private userService;
    constructor(userService: UserService);
    /**
     * Get current user profile
     * GET /api/v1/users/profile
     */
    getProfile: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Update user profile
     * PUT /api/v1/users/profile
     */
    updateProfile: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Upload profile avatar
     * POST /api/v1/users/profile/avatar
     */
    uploadAvatar: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Delete profile avatar
     * DELETE /api/v1/users/profile/avatar
     */
    deleteAvatar: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Change user password
     * PUT /api/v1/users/password/change
     */
    changePassword: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Get user account summary
     * GET /api/v1/users/account/summary
     */
    getAccountSummary: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Deactivate user account
     * PUT /api/v1/users/account/deactivate
     */
    deactivateAccount: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Request account data export (GDPR compliance)
     * POST /api/v1/users/account/export
     */
    requestDataExport: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Get user preferences
     * GET /api/v1/users/preferences
     */
    getPreferences: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Update user preferences
     * PUT /api/v1/users/preferences
     */
    updatePreferences: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Verify user phone number
     * POST /api/v1/users/phone/verify
     */
    verifyPhoneNumber: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Confirm phone number verification
     * POST /api/v1/users/phone/confirm
     */
    confirmPhoneVerification: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Get user activity log
     * GET /api/v1/users/activity
     */
    getActivityLog: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Update email preferences
     * PUT /api/v1/users/email/preferences
     */
    updateEmailPreferences: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Validate update profile request
     */
    private validateUpdateProfileRequest;
    /**
     * Validate password change request
     */
    private validatePasswordChangeRequest;
    /**
     * Validate email format
     */
    private isValidEmail;
    /**
     * Validate Nigerian phone number format
     */
    private isValidNigerianPhoneNumber;
}
//# sourceMappingURL=UserController.d.ts.map