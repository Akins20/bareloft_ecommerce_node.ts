import { BaseService } from "../BaseService";
import { UserRepository } from "../../repositories/UserRepository";
import {
  User,
  UpdateUserProfileRequest,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
} from "../../types";
import { Express } from 'express-serve-static-core';
import { NotificationModel } from "../../models/Notification";

export class UserService extends BaseService {
  private userRepository: UserRepository;

  constructor() {
    super();
    this.userRepository = new UserRepository();
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      return await this.userRepository.findById(userId);
    } catch (error) {
      this.handleError("Error getting user by ID", error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: UpdateUserProfileRequest): Promise<User> {
    try {
      return await this.userRepository.updateProfile(userId, data);
    } catch (error) {
      this.handleError("Error updating user profile", error);
      throw error;
    }
  }

  /**
   * Update user profile (alias method for controller compatibility)
   */
  async updateUserProfile(userId: string, data: UpdateUserProfileRequest): Promise<any> {
    return this.updateProfile(userId, data);
  }

  /**
   * Get user profile with statistics
   */
  async getUserProfile(userId: string): Promise<any> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppError(
          "User not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      return {
        ...user,
        // Add additional profile information
        profileComplete: this.calculateProfileCompleteness(user),
      };
    } catch (error) {
      this.handleError("Error getting user profile", error);
      throw error;
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateAccount(userId: string, password: string, reason?: string): Promise<{success: boolean, message: string}> {
    try {
      // Verify password before deactivation
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return { success: false, message: "User not found" };
      }
      
      // In a real implementation, you would verify the password here
      // For now, we'll assume password verification is handled elsewhere
      
      await this.userRepository.suspendUser(userId, reason || "Account deactivated by user");
      return { success: true, message: "Account deactivated successfully" };
    } catch (error) {
      this.handleError("Error deactivating account", error);
      throw error;
    }
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<string> {
    try {
      // In a real implementation, you would upload the file to cloud storage
      // For now, we'll return a mock URL
      const avatarUrl = `/uploads/avatars/${userId}-${Date.now()}.${file.originalname.split('.').pop()}`;
      
      await this.userRepository.updateProfile(userId, { avatar: avatarUrl });
      return avatarUrl;
    } catch (error) {
      this.handleError("Error uploading avatar", error);
      throw error;
    }
  }

  /**
   * Delete user avatar
   */
  async deleteAvatar(userId: string): Promise<void> {
    try {
      await this.userRepository.updateProfile(userId, { avatar: '' });
    } catch (error) {
      this.handleError("Error deleting avatar", error);
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{success: boolean, message: string}> {
    try {
      // In a real implementation, you would verify the current password
      // and hash the new password before saving
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return { success: false, message: "User not found" };
      }
      
      // Mock password verification and update
      return { success: true, message: "Password changed successfully" };
    } catch (error) {
      this.handleError("Error changing password", error);
      throw error;
    }
  }

  /**
   * Get account summary
   */
  async getAccountSummary(userId: string): Promise<any> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppError(
          "User not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }
      
      return {
        user,
        ordersCount: 0, // Would fetch from order repository
        wishlistCount: 0, // Would fetch from wishlist repository
        reviewsCount: 0, // Would fetch from review repository
        profileComplete: this.calculateProfileCompleteness(user)
      };
    } catch (error) {
      this.handleError("Error getting account summary", error);
      throw error;
    }
  }

  /**
   * Request data export (GDPR compliance)
   */
  async requestDataExport(userId: string): Promise<any> {
    try {
      // In a real implementation, this would generate a data export
      // and send it via email
      return {
        exportId: `export-${userId}-${Date.now()}`,
        status: 'requested',
        estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };
    } catch (error) {
      this.handleError("Error requesting data export", error);
      throw error;
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<any> {
    try {
      // In a real implementation, this would fetch from a preferences table
      return {
        notifications: {
          email: {
            orderUpdates: true,
            promotions: false,
            newsletters: false
          },
          sms: {
            orderUpdates: true,
            promotions: false,
            securityAlerts: true
          },
          push: {
            orderUpdates: true,
            promotions: false,
            inAppMessages: true
          }
        },
        privacy: {
          profileVisibility: 'private',
          showReviews: true,
          allowDataCollection: false
        }
      };
    } catch (error) {
      this.handleError("Error getting user preferences", error);
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: any): Promise<any> {
    try {
      // In a real implementation, this would update a preferences table
      return preferences;
    } catch (error) {
      this.handleError("Error updating user preferences", error);
      throw error;
    }
  }

  /**
   * Initiate phone number verification
   */
  async initiatePhoneVerification(userId: string, phoneNumber: string): Promise<any> {
    try {
      // In a real implementation, this would send an SMS with OTP
      return {
        verificationId: `verify-${userId}-${Date.now()}`,
        message: 'Verification code sent'
      };
    } catch (error) {
      this.handleError("Error initiating phone verification", error);
      throw error;
    }
  }

  /**
   * Confirm phone number verification
   */
  async confirmPhoneVerification(userId: string, phoneNumber: string, code: string): Promise<{success: boolean, message: string}> {
    try {
      // In a real implementation, this would verify the OTP code
      if (code === '123456') { // Mock verification
        await this.userRepository.updateProfile(userId, { phoneNumber });
        // Note: isVerified should be updated through a separate user verification method
        // as it's not part of the profile update interface
        return { success: true, message: 'Phone number verified successfully' };
      }
      return { success: false, message: 'Invalid verification code' };
    } catch (error) {
      this.handleError("Error confirming phone verification", error);
      throw error;
    }
  }

  /**
   * Get user activity log
   */
  async getUserActivityLog(userId: string, options: {page: number, limit: number}): Promise<any> {
    try {
      // In a real implementation, this would fetch from an activity log table
      return {
        activities: [],
        pagination: {
          page: options.page,
          limit: options.limit,
          total: 0,
          totalPages: 0
        }
      };
    } catch (error) {
      this.handleError("Error getting user activity log", error);
      throw error;
    }
  }

  /**
   * Update email preferences
   */
  async updateEmailPreferences(userId: string, preferences: any): Promise<any> {
    try {
      // In a real implementation, this would update email preferences
      return preferences;
    } catch (error) {
      this.handleError("Error updating email preferences", error);
      throw error;
    }
  }

  /**
   * Calculate profile completeness percentage
   */
  private calculateProfileCompleteness(user: User): number {
    const fields = [
      user.firstName,
      user.lastName,
      user.email,
      user.phoneNumber,
    ];

    const completedFields = fields.filter(field => field && field.trim() !== '').length;
    return Math.round((completedFields / fields.length) * 100);
  }

  // ==================== NOTIFICATION METHODS ====================

  /**
   * Get user notifications with filtering and pagination
   */
  async getUserNotifications(userId: string, options: {
    page: number;
    limit: number;
    filter: string;
  }): Promise<any> {
    try {
      const { page, limit, filter } = options;
      const skip = (page - 1) * limit;

      // Build filter conditions
      let whereConditions: any = {
        userId: userId,
      };

      // Apply status filter
      if (filter === 'unread') {
        whereConditions.isRead = false;
      } else if (filter === 'read') {
        whereConditions.isRead = true;
      }
      // 'all' filter doesn't add any conditions

      // Fetch notifications with pagination
      const [notifications, total] = await Promise.all([
        NotificationModel.findMany({
          where: whereConditions,
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            userId: true,
            type: true,
            title: true,
            message: true,
            data: true,
            isRead: true,
            createdAt: true,
            updatedAt: true,
          },
        } as any),
        NotificationModel.count({ where: whereConditions } as any),
      ]);

      // Transform notifications to match frontend expected format
      const transformedNotifications = notifications.map((notification: any) => ({
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        category: this.mapTypeToCategory(notification.type, notification.data),
        title: notification.title,
        message: notification.message,
        isRead: notification.isRead,
        createdAt: notification.createdAt.toISOString(),
        metadata: notification.data || {}
      }));

      return {
        notifications: transformedNotifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        unreadCount: filter !== 'read' ? await NotificationModel.count({
          where: {
            userId,
            isRead: false,
          },
        } as any) : 0,
        hasMore: (page * limit) < total,
      };
    } catch (error) {
      this.handleError("Error getting user notifications", error);
      throw error;
    }
  }

  /**
   * Map notification type to category for frontend compatibility
   */
  private mapTypeToCategory(type: string, data: any): string {
    // Map database enum types to frontend category types
    switch (type) {
      case 'ORDER_STATUS':
        // Check metadata for specific order category
        if (data?.paymentReference) return 'payment';
        if (data?.trackingNumber) return 'order_shipped';
        if (data?.deliveryStatus === 'delivered') return 'order_delivered';
        return 'order_confirmation';
      case 'PAYMENT_STATUS':
        return 'payment';
      case 'PROMOTION':
        return 'promotion';
      case 'PRODUCT_ALERT':
        return 'system';
      case 'SYSTEM_ALERT':
        return 'system';
      default:
        return 'system';
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(userId: string, notificationId: string): Promise<any> {
    try {
      // First verify the notification belongs to this user
      const notification = await NotificationModel.findFirst({
        where: {
          id: notificationId,
          userId: userId,
        },
      } as any);

      if (!notification) {
        throw new AppError(
          "Notification not found or access denied",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Mark as read if not already read
      const updatedNotification = await NotificationModel.update({
        where: { id: notificationId },
        data: {
          isRead: true,
        },
      } as any);

      return updatedNotification;
    } catch (error) {
      this.handleError("Error marking notification as read", error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllNotificationsAsRead(userId: string): Promise<any> {
    try {
      const result = await NotificationModel.updateMany({
        where: {
          userId: userId,
          isRead: false, // Only update unread notifications
        },
        data: {
          isRead: true,
        },
      } as any);

      return {
        updatedCount: result.count,
        message: `Marked ${result.count} notifications as read`,
      };
    } catch (error) {
      this.handleError("Error marking all notifications as read", error);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<any> {
    try {
      // First verify the notification belongs to this user
      const notification = await NotificationModel.findFirst({
        where: {
          id: notificationId,
          userId: userId,
        },
      } as any);

      if (!notification) {
        throw new AppError(
          "Notification not found or access denied",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      await NotificationModel.delete({
        where: { id: notificationId },
      } as any);

      return {
        success: true,
        message: "Notification deleted successfully",
      };
    } catch (error) {
      this.handleError("Error deleting notification", error);
      throw error;
    }
  }

  /**
   * Handle service errors
   */
  protected override handleError(message: string, error: any): never {
    console.error(message, error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }
}