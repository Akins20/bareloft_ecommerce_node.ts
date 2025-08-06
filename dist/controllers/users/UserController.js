"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const BaseController_1 = require("../BaseController");
class UserController extends BaseController_1.BaseController {
    userService;
    constructor(userService) {
        super();
        this.userService = userService;
    }
    /**
     * Get current user profile
     * GET /api/v1/users/profile
     */
    getProfile = async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            const profile = await this.userService.getUserProfile(userId);
            if (!profile) {
                res.status(404).json({
                    success: false,
                    message: "User profile not found",
                });
                return;
            }
            const response = {
                success: true,
                message: "User profile retrieved successfully",
                data: profile,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Update user profile
     * PUT /api/v1/users/profile
     */
    updateProfile = async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            const updateData = req.body;
            // Validate update data
            const validationErrors = this.validateUpdateProfileRequest(updateData);
            if (validationErrors.length > 0) {
                res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: validationErrors,
                });
                return;
            }
            const updatedProfile = await this.userService.updateUserProfile(userId, updateData);
            const response = {
                success: true,
                message: "Profile updated successfully",
                data: updatedProfile,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Upload profile avatar
     * POST /api/v1/users/profile/avatar
     */
    uploadAvatar = async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            if (!req.file) {
                res.status(400).json({
                    success: false,
                    message: "Avatar image file is required",
                });
                return;
            }
            const avatarUrl = await this.userService.uploadAvatar(userId, req.file);
            const response = {
                success: true,
                message: "Avatar uploaded successfully",
                data: { avatarUrl },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Delete profile avatar
     * DELETE /api/v1/users/profile/avatar
     */
    deleteAvatar = async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            await this.userService.deleteAvatar(userId);
            const response = {
                success: true,
                message: "Avatar deleted successfully",
                data: null,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Change user password
     * PUT /api/v1/users/password/change
     */
    changePassword = async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            const { currentPassword, newPassword } = req.body;
            // Validate password change request
            const validationErrors = this.validatePasswordChangeRequest({
                currentPassword,
                newPassword,
            });
            if (validationErrors.length > 0) {
                res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: validationErrors,
                });
                return;
            }
            const result = await this.userService.changePassword(userId, currentPassword, newPassword);
            if (!result.success) {
                res.status(400).json({
                    success: false,
                    message: result.message,
                });
                return;
            }
            const response = {
                success: true,
                message: "Password changed successfully",
                data: null,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get user account summary
     * GET /api/v1/users/account/summary
     */
    getAccountSummary = async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            const summary = await this.userService.getAccountSummary(userId);
            const response = {
                success: true,
                message: "Account summary retrieved successfully",
                data: summary,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Deactivate user account
     * PUT /api/v1/users/account/deactivate
     */
    deactivateAccount = async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            const { reason, password } = req.body;
            if (!password) {
                res.status(400).json({
                    success: false,
                    message: "Password confirmation is required for account deactivation",
                });
                return;
            }
            const result = await this.userService.deactivateAccount(userId, password, reason);
            if (!result.success) {
                res.status(400).json({
                    success: false,
                    message: result.message,
                });
                return;
            }
            const response = {
                success: true,
                message: "Account deactivated successfully",
                data: null,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Request account data export (GDPR compliance)
     * POST /api/v1/users/account/export
     */
    requestDataExport = async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            const result = await this.userService.requestDataExport(userId);
            const response = {
                success: true,
                message: "Data export request submitted successfully. You will receive an email when ready.",
                data: result,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get user preferences
     * GET /api/v1/users/preferences
     */
    getPreferences = async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            const preferences = await this.userService.getUserPreferences(userId);
            const response = {
                success: true,
                message: "User preferences retrieved successfully",
                data: preferences,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Update user preferences
     * PUT /api/v1/users/preferences
     */
    updatePreferences = async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            const preferences = req.body;
            const updatedPreferences = await this.userService.updateUserPreferences(userId, preferences);
            const response = {
                success: true,
                message: "User preferences updated successfully",
                data: updatedPreferences,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Verify user phone number
     * POST /api/v1/users/phone/verify
     */
    verifyPhoneNumber = async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            const { phoneNumber } = req.body;
            if (!phoneNumber) {
                res.status(400).json({
                    success: false,
                    message: "Phone number is required",
                });
                return;
            }
            // Validate Nigerian phone number format
            if (!this.isValidNigerianPhone(phoneNumber)) {
                res.status(400).json({
                    success: false,
                    message: "Invalid Nigerian phone number format",
                });
                return;
            }
            const result = await this.userService.initiatePhoneVerification(userId, phoneNumber);
            const response = {
                success: true,
                message: "Verification code sent to your phone number",
                data: result,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Confirm phone number verification
     * POST /api/v1/users/phone/confirm
     */
    confirmPhoneVerification = async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            const { phoneNumber, code } = req.body;
            if (!phoneNumber || !code) {
                res.status(400).json({
                    success: false,
                    message: "Phone number and verification code are required",
                });
                return;
            }
            const result = await this.userService.confirmPhoneVerification(userId, phoneNumber, code);
            if (!result.success) {
                res.status(400).json({
                    success: false,
                    message: result.message,
                });
                return;
            }
            const response = {
                success: true,
                message: "Phone number verified successfully",
                data: result,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get user activity log
     * GET /api/v1/users/activity
     */
    getActivityLog = async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            const page = parseInt(req.query.page) || 1;
            const limit = Math.min(parseInt(req.query.limit) || 20, 100);
            const activities = await this.userService.getUserActivityLog(userId, {
                page,
                limit,
            });
            const response = {
                success: true,
                message: "Activity log retrieved successfully",
                data: activities,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Update email preferences
     * PUT /api/v1/users/email/preferences
     */
    updateEmailPreferences = async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            const emailPreferences = req.body;
            const result = await this.userService.updateEmailPreferences(userId, emailPreferences);
            const response = {
                success: true,
                message: "Email preferences updated successfully",
                data: result,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Validate update profile request
     */
    validateUpdateProfileRequest(data) {
        const errors = [];
        if (data.firstName !== undefined &&
            (!data.firstName || data.firstName.trim().length < 2)) {
            errors.push("First name must be at least 2 characters long");
        }
        if (data.lastName !== undefined &&
            (!data.lastName || data.lastName.trim().length < 2)) {
            errors.push("Last name must be at least 2 characters long");
        }
        if (data.email !== undefined &&
            data.email &&
            !this.isValidEmail(data.email)) {
            errors.push("Invalid email format");
        }
        if (data.phoneNumber !== undefined &&
            data.phoneNumber &&
            !this.isValidNigerianPhone(data.phoneNumber)) {
            errors.push("Invalid Nigerian phone number format");
        }
        if (data.dateOfBirth !== undefined && data.dateOfBirth) {
            const birthDate = new Date(data.dateOfBirth);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            if (age < 13 || age > 120) {
                errors.push("Invalid date of birth");
            }
        }
        if (data.gender !== undefined &&
            data.gender &&
            !["male", "female", "other", "prefer_not_to_say"].includes(data.gender)) {
            errors.push("Invalid gender option");
        }
        return errors;
    }
    /**
     * Validate password change request
     */
    validatePasswordChangeRequest(data) {
        const errors = [];
        if (!data.currentPassword || data.currentPassword.length < 6) {
            errors.push("Current password is required");
        }
        if (!data.newPassword || data.newPassword.length < 8) {
            errors.push("New password must be at least 8 characters long");
        }
        if (data.newPassword &&
            !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.newPassword)) {
            errors.push("New password must contain at least one uppercase letter, one lowercase letter, and one number");
        }
        if (data.currentPassword === data.newPassword) {
            errors.push("New password must be different from current password");
        }
        return errors;
    }
}
exports.UserController = UserController;
//# sourceMappingURL=UserController.js.map