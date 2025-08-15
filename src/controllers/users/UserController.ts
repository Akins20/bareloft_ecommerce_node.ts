import { Request, Response } from "express";
import { BaseController } from "../BaseController";
import { UserService } from "../../services/users/UserService";
import {
  UpdateUserProfileRequest,
  ChangePasswordRequest,
  UserProfileResponse,
} from "../../types/user.types";
import { ApiResponse } from "../../types/api.types";
import { AuthenticatedRequest } from "../../types/auth.types";

export class UserController extends BaseController {
  private userService: UserService;

  constructor(userService: UserService) {
    super();
    this.userService = userService;
  }

  /**
   * Get current user profile
   * GET /api/v1/users/profile
   */
  public getProfile = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
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

      const response: ApiResponse<UserProfileResponse> = {
        success: true,
        message: "User profile retrieved successfully",
        data: profile,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Update user profile
   * PUT /api/v1/users/profile
   */
  public updateProfile = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      const updateData: UpdateUserProfileRequest = req.body;

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

      const updatedProfile = await this.userService.updateUserProfile(
        userId,
        updateData
      );

      const response: ApiResponse<UserProfileResponse> = {
        success: true,
        message: "Profile updated successfully",
        data: updatedProfile,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Upload profile avatar
   * POST /api/v1/users/profile/avatar
   */
  public uploadAvatar = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
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

      const response: ApiResponse<{ avatarUrl: string }> = {
        success: true,
        message: "Avatar uploaded successfully",
        data: { avatarUrl },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Delete profile avatar
   * DELETE /api/v1/users/profile/avatar
   */
  public deleteAvatar = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
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

      const response: ApiResponse<null> = {
        success: true,
        message: "Avatar deleted successfully",
        data: null,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Change user password
   * PUT /api/v1/users/password/change
   */
  public changePassword = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      const { currentPassword, newPassword }: ChangePasswordRequest = req.body;

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

      const result = await this.userService.changePassword(
        userId,
        currentPassword,
        newPassword
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message,
        });
        return;
      }

      const response: ApiResponse<null> = {
        success: true,
        message: "Password changed successfully",
        data: null,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get user account summary
   * GET /api/v1/users/account/summary
   */
  public getAccountSummary = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
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

      const response: ApiResponse<any> = {
        success: true,
        message: "Account summary retrieved successfully",
        data: summary,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Deactivate user account
   * PUT /api/v1/users/account/deactivate
   */
  public deactivateAccount = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
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

      const result = await this.userService.deactivateAccount(
        userId,
        password,
        reason
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message,
        });
        return;
      }

      const response: ApiResponse<null> = {
        success: true,
        message: "Account deactivated successfully",
        data: null,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Request account data export (GDPR compliance)
   * POST /api/v1/users/account/export
   */
  public requestDataExport = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
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

      const response: ApiResponse<any> = {
        success: true,
        message:
          "Data export request submitted successfully. You will receive an email when ready.",
        data: result,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get user preferences
   * GET /api/v1/users/preferences
   */
  public getPreferences = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
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

      const response: ApiResponse<any> = {
        success: true,
        message: "User preferences retrieved successfully",
        data: preferences,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Update user preferences
   * PUT /api/v1/users/preferences
   */
  public updatePreferences = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
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

      const updatedPreferences = await this.userService.updateUserPreferences(
        userId,
        preferences
      );

      const response: ApiResponse<any> = {
        success: true,
        message: "User preferences updated successfully",
        data: updatedPreferences,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Verify user phone number
   * POST /api/v1/users/phone/verify
   */
  public verifyPhoneNumber = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
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

      const result = await this.userService.initiatePhoneVerification(
        userId,
        phoneNumber
      );

      const response: ApiResponse<any> = {
        success: true,
        message: "Verification code sent to your phone number",
        data: result,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Confirm phone number verification
   * POST /api/v1/users/phone/confirm
   */
  public confirmPhoneVerification = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
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

      const result = await this.userService.confirmPhoneVerification(
        userId,
        phoneNumber,
        code
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message,
        });
        return;
      }

      const response: ApiResponse<any> = {
        success: true,
        message: "Phone number verified successfully",
        data: result,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get user activity log
   * GET /api/v1/users/activity
   */
  public getActivityLog = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      const activities = await this.userService.getUserActivityLog(userId, {
        page,
        limit,
      });

      const response: ApiResponse<any> = {
        success: true,
        message: "Activity log retrieved successfully",
        data: activities,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Update email preferences
   * PUT /api/v1/users/email/preferences
   */
  public updateEmailPreferences = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
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

      const result = await this.userService.updateEmailPreferences(
        userId,
        emailPreferences
      );

      const response: ApiResponse<any> = {
        success: true,
        message: "Email preferences updated successfully",
        data: result,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Validate update profile request
   */
  private validateUpdateProfileRequest(
    data: UpdateUserProfileRequest
  ): string[] {
    const errors: string[] = [];

    if (
      data.firstName !== undefined &&
      (!data.firstName || data.firstName.trim().length < 2)
    ) {
      errors.push("First name must be at least 2 characters long");
    }

    if (
      data.lastName !== undefined &&
      (!data.lastName || data.lastName.trim().length < 2)
    ) {
      errors.push("Last name must be at least 2 characters long");
    }

    if (
      data.email !== undefined &&
      data.email &&
      !this.isValidEmail(data.email)
    ) {
      errors.push("Invalid email format");
    }

    if (
      data.phoneNumber !== undefined &&
      data.phoneNumber &&
      !this.isValidNigerianPhone(data.phoneNumber)
    ) {
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

    if (
      data.gender !== undefined &&
      data.gender &&
      !["male", "female", "other", "prefer_not_to_say"].includes(data.gender)
    ) {
      errors.push("Invalid gender option");
    }

    return errors;
  }

  /**
   * Validate password change request
   */
  private validatePasswordChangeRequest(data: ChangePasswordRequest): string[] {
    const errors: string[] = [];

    if (!data.currentPassword || data.currentPassword.length < 6) {
      errors.push("Current password is required");
    }

    if (!data.newPassword || data.newPassword.length < 8) {
      errors.push("New password must be at least 8 characters long");
    }

    if (
      data.newPassword &&
      !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.newPassword)
    ) {
      errors.push(
        "New password must contain at least one uppercase letter, one lowercase letter, and one number"
      );
    }

    if (data.currentPassword === data.newPassword) {
      errors.push("New password must be different from current password");
    }

    return errors;
  }

  // ==================== NOTIFICATION METHODS ====================

  /**
   * Get user notifications
   * GET /api/v1/users/:userId/notifications
   */
  public getNotifications = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const currentUserId = req.user?.id;
      const requestedUserId = req.params.userId;

      if (!currentUserId) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      // Users can only access their own notifications
      if (currentUserId !== requestedUserId) {
        res.status(403).json({
          success: false,
          message: "Access denied. You can only view your own notifications.",
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const filter = req.query.filter as string || 'all';

      const notifications = await this.userService.getUserNotifications(currentUserId, {
        page,
        limit,
        filter,
      });

      const response: ApiResponse<any> = {
        success: true,
        message: "Notifications retrieved successfully",
        data: notifications,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Mark notification as read
   * PUT /api/v1/users/:userId/notifications/:notificationId/read
   */
  public markNotificationAsRead = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const currentUserId = req.user?.id;
      const requestedUserId = req.params.userId;
      const notificationId = req.params.notificationId;

      if (!currentUserId) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      // Users can only access their own notifications
      if (currentUserId !== requestedUserId) {
        res.status(403).json({
          success: false,
          message: "Access denied. You can only modify your own notifications.",
        });
        return;
      }

      const result = await this.userService.markNotificationAsRead(currentUserId, notificationId);

      const response: ApiResponse<any> = {
        success: true,
        message: "Notification marked as read",
        data: result,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Mark all notifications as read
   * PUT /api/v1/users/:userId/notifications/read-all
   */
  public markAllNotificationsAsRead = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const currentUserId = req.user?.id;
      const requestedUserId = req.params.userId;

      if (!currentUserId) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      // Users can only access their own notifications
      if (currentUserId !== requestedUserId) {
        res.status(403).json({
          success: false,
          message: "Access denied. You can only modify your own notifications.",
        });
        return;
      }

      const result = await this.userService.markAllNotificationsAsRead(currentUserId);

      const response: ApiResponse<any> = {
        success: true,
        message: "All notifications marked as read",
        data: result,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Delete notification
   * DELETE /api/v1/users/:userId/notifications/:notificationId
   */
  public deleteNotification = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const currentUserId = req.user?.id;
      const requestedUserId = req.params.userId;
      const notificationId = req.params.notificationId;

      if (!currentUserId) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      // Users can only access their own notifications
      if (currentUserId !== requestedUserId) {
        res.status(403).json({
          success: false,
          message: "Access denied. You can only delete your own notifications.",
        });
        return;
      }

      const result = await this.userService.deleteNotification(currentUserId, notificationId);

      const response: ApiResponse<any> = {
        success: true,
        message: "Notification deleted successfully",
        data: result,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

}
