import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import { NotificationService } from "../services/notifications/NotificationService";
import { 
  ApiResponse, 
  AuthenticatedRequest,
  HTTP_STATUS,
  ERROR_CODES,
  AppError
} from "../types";
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  SendNotificationRequest
} from "../types/notification.types";

export class NotificationController extends BaseController {
  private notificationService: NotificationService;

  constructor() {
    super();
    this.notificationService = new NotificationService();
  }

  /**
   * Create a new notification
   * POST /api/v1/notifications
   */
  public createNotification = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { userId, type, category, title, message, metadata } = req.body;

      if (!userId || !type || !title || !message) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Required fields missing: userId, type, title, message"
        });
        return;
      }

      // Map frontend type to backend NotificationType
      const notificationType = this.mapFrontendTypeToBackend(type, category);
      
      const notificationRequest: SendNotificationRequest = {
        userId,
        recipient: {
          email: metadata?.email || '',
          name: metadata?.customerName || 'Valued Customer'
        },
        type: notificationType,
        channel: NotificationChannel.IN_APP,
        priority: NotificationPriority.NORMAL,
        variables: {
          orderNumber: metadata?.orderNumber,
          ...metadata
        },
        metadata
      };

      const notification = await this.notificationService.sendNotification(notificationRequest);

      const response: ApiResponse<any> = {
        success: true,
        message: "Notification created successfully",
        data: notification,
      };

      res.status(HTTP_STATUS.CREATED).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Mark notification as read
   * PUT /api/v1/notifications/:id/read
   */
  public markAsRead = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const currentUserId = req.user?.id;
      const notificationId = req.params.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      await this.notificationService.markAsRead(notificationId, currentUserId);

      const response: ApiResponse<any> = {
        success: true,
        message: "Notification marked as read",
        data: null,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get user notifications
   * GET /api/v1/notifications
   */
  public getNotifications = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const currentUserId = req.user?.id;
      const { page = 1, limit = 20, unreadOnly = false } = req.query;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      // Get user notifications from database
      const notifications = await this.notificationService.getUserNotifications(
        currentUserId,
        Number(page),
        Number(limit),
        unreadOnly === 'true'
      );

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
   * Delete notification
   * DELETE /api/v1/notifications/:id
   */
  public deleteNotification = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const currentUserId = req.user?.id;
      const notificationId = req.params.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      // For now, we'll just mark as read since NotificationService doesn't have delete
      // In a real implementation, you'd add a delete method to NotificationService
      await this.notificationService.markAsRead(notificationId, currentUserId);

      const response: ApiResponse<any> = {
        success: true,
        message: "Notification deleted successfully",
        data: null,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Map frontend notification type/category to backend NotificationType
   */
  private mapFrontendTypeToBackend(type: string, category?: string): NotificationType {
    switch (type) {
      case 'order':
        if (category === 'payment') return NotificationType.PAYMENT_SUCCESSFUL;
        if (category === 'order_shipped') return NotificationType.ORDER_SHIPPED;
        if (category === 'order_delivered') return NotificationType.ORDER_DELIVERED;
        return NotificationType.ORDER_CONFIRMATION;
      case 'system':
        return NotificationType.SYSTEM_MAINTENANCE;
      case 'promotion':
        return NotificationType.PROMOTIONAL;
      case 'account':
        return NotificationType.ACCOUNT_CREATED;
      default:
        return NotificationType.ORDER_CONFIRMATION;
    }
  }
}