import { BaseService } from "../BaseService";
import { NotificationModel } from "../../models";
import {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  SendNotificationRequest,
  BulkNotificationRequest,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
  PaginationMeta,
} from "../../types";
import { EmailService } from "./EmailService";
import { SMSService } from "./SMSService";
import { PushService } from "./PushService";

export class NotificationService extends BaseService {
  private emailService: EmailService;
  private smsService: SMSService;
  private pushService: PushService;

  constructor(
    emailService: EmailService,
    smsService: SMSService,
    pushService: PushService
  ) {
    super();
    this.emailService = emailService;
    this.smsService = smsService;
    this.pushService = pushService;
  }

  /**
   * Send a single notification
   */
  async sendNotification(
    request: SendNotificationRequest
  ): Promise<Notification> {
    try {
      // Create notification record
      const notification = await NotificationModel.create({
        data: {
          userId: request.userId,
          type: request.type,
          channel: request.channel,
          subject: this.generateSubject(request.type, request.variables),
          message: this.generateMessage(request.type, request.variables),
          recipientEmail: request.recipient.email,
          recipientPhone: request.recipient.phoneNumber,
          recipientName: request.recipient.name,
          status: "PENDING",
          priority: request.priority || "normal",
          variables: request.variables,
          metadata: request.metadata,
          scheduledFor: request.scheduledFor,
          maxRetries: 3,
          retryCount: 0,
        },
      });

      // Send immediately if not scheduled
      if (!request.scheduledFor || request.scheduledFor <= new Date()) {
        await this.processNotification(notification.id);
      }

      return this.transformNotification(notification);
    } catch (error) {
      this.handleError("Error sending notification", error);
      throw error;
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(request: BulkNotificationRequest): Promise<{
    successful: number;
    failed: number;
    notifications: Notification[];
  }> {
    try {
      const results = {
        successful: 0,
        failed: 0,
        notifications: [] as Notification[],
      };

      for (const recipient of request.recipients) {
        try {
          const notificationRequest: SendNotificationRequest = {
            type: request.type,
            channel: request.channel,
            userId: recipient.userId,
            recipient: {
              email: recipient.email,
              phoneNumber: recipient.phoneNumber,
              pushToken: recipient.pushToken,
              name: recipient.name,
            },
            variables: {
              ...request.templateVariables,
              ...recipient.variables,
            },
            scheduledFor: request.scheduledFor,
            priority: request.priority,
          };

          const notification = await this.sendNotification(notificationRequest);
          results.notifications.push(notification);
          results.successful++;
        } catch (error) {
          results.failed++;
        }
      }

      return results;
    } catch (error) {
      this.handleError("Error sending bulk notifications", error);
      throw error;
    }
  }

  /**
   * Process a notification (actually send it)
   */
  async processNotification(notificationId: string): Promise<void> {
    try {
      const notification = await NotificationModel.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        throw new AppError(
          "Notification not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      if (notification.status !== "PENDING") {
        return; // Already processed
      }

      // Update status to sending
      await NotificationModel.update({
        where: { id: notificationId },
        data: { status: "QUEUED" },
      });

      try {
        // Send based on channel
        let providerMessageId: string | undefined;

        switch (notification.channel) {
          case "EMAIL":
            if (notification.recipientEmail) {
              providerMessageId = await this.emailService.sendEmail({
                to: notification.recipientEmail,
                subject: notification.subject || "",
                message: notification.message,
                recipientName: notification.recipientName,
              });
            }
            break;

          case "SMS":
            if (notification.recipientPhone) {
              providerMessageId = await this.smsService.sendSMS({
                to: notification.recipientPhone,
                message: notification.message,
              });
            }
            break;

          case "PUSH":
            if (notification.userId) {
              providerMessageId = await this.pushService.sendPush({
                userId: notification.userId,
                title: notification.subject || "",
                message: notification.message,
                data: notification.metadata,
              });
            }
            break;

          default:
            throw new AppError(
              `Unsupported notification channel: ${notification.channel}`,
              HTTP_STATUS.BAD_REQUEST,
              ERROR_CODES.VALIDATION_ERROR
            );
        }

        // Update as sent
        await NotificationModel.update({
          where: { id: notificationId },
          data: {
            status: "SENT",
            providerMessageId,
            updatedAt: new Date(),
          },
        });
      } catch (error) {
        // Handle send failure
        const retryCount = notification.retryCount + 1;
        const shouldRetry = retryCount < notification.maxRetries;

        await NotificationModel.update({
          where: { id: notificationId },
          data: {
            status: shouldRetry ? "PENDING" : "FAILED",
            retryCount,
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
            updatedAt: new Date(),
          },
        });

        if (shouldRetry) {
          // Schedule retry (exponential backoff)
          const delayMinutes = Math.pow(2, retryCount) * 5; // 5, 10, 20 minutes
          setTimeout(
            () => {
              this.processNotification(notificationId);
            },
            delayMinutes * 60 * 1000
          );
        }

        throw error;
      }
    } catch (error) {
      this.handleError("Error processing notification", error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<{
    notifications: Notification[];
    pagination: PaginationMeta;
    unreadCount: number;
  }> {
    try {
      const where: any = { userId };

      if (unreadOnly) {
        where.readAt = null;
      }

      const [notifications, total, unreadCount] = await Promise.all([
        NotificationModel.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        NotificationModel.count({ where }),
        NotificationModel.count({
          where: { userId, readAt: null },
        }),
      ]);

      const pagination = this.createPagination(page, limit, total);

      return {
        notifications: notifications.map(this.transformNotification),
        pagination,
        unreadCount,
      };
    } catch (error) {
      this.handleError("Error fetching user notifications", error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const notification = await NotificationModel.findFirst({
        where: { id: notificationId, userId },
      });

      if (!notification) {
        throw new AppError(
          "Notification not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      await NotificationModel.update({
        where: { id: notificationId },
        data: {
          readAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.handleError("Error marking notification as read", error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await NotificationModel.updateMany({
        where: { userId, readAt: null },
        data: {
          readAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return result.count;
    } catch (error) {
      this.handleError("Error marking all notifications as read", error);
      throw error;
    }
  }

  /**
   * Get notification analytics
   */
  async getNotificationAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    deliveryRate: number;
    byChannel: Array<{
      channel: NotificationChannel;
      sent: number;
      delivered: number;
      failed: number;
      deliveryRate: number;
    }>;
    byType: Array<{
      type: NotificationType;
      sent: number;
      delivered: number;
      failed: number;
    }>;
  }> {
    try {
      const where: any = {};

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [totalSent, totalDelivered, totalFailed, byChannel, byType] =
        await Promise.all([
          NotificationModel.count({
            where: { ...where, status: { in: ["SENT", "DELIVERED"] } },
          }),
          NotificationModel.count({
            where: { ...where, status: "DELIVERED" },
          }),
          NotificationModel.count({
            where: { ...where, status: "FAILED" },
          }),
          this.getAnalyticsByChannel(where),
          this.getAnalyticsByType(where),
        ]);

      const deliveryRate =
        totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

      return {
        totalSent,
        totalDelivered,
        totalFailed,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        byChannel,
        byType,
      };
    } catch (error) {
      this.handleError("Error fetching notification analytics", error);
      throw error;
    }
  }

  /**
   * Process scheduled notifications (would be called by a cron job)
   */
  async processScheduledNotifications(): Promise<number> {
    try {
      const scheduledNotifications = await NotificationModel.findMany({
        where: {
          status: "PENDING",
          scheduledFor: { lte: new Date() },
        },
        take: 100, // Process in batches
      });

      let processed = 0;

      for (const notification of scheduledNotifications) {
        try {
          await this.processNotification(notification.id);
          processed++;
        } catch (error) {
          // Log error but continue processing others
          console.error(
            `Failed to process notification ${notification.id}:`,
            error
          );
        }
      }

      return processed;
    } catch (error) {
      this.handleError("Error processing scheduled notifications", error);
      throw error;
    }
  }

  // Private helper methods

  private generateSubject(
    type: NotificationType,
    variables?: Record<string, any>
  ): string {
    const templates: Record<NotificationType, string> = {
      ORDER_CONFIRMATION: "Order Confirmation - #{orderNumber}",
      ORDER_SHIPPED: "Your Order Has Been Shipped - #{orderNumber}",
      ORDER_DELIVERED: "Order Delivered - #{orderNumber}",
      ORDER_CANCELLED: "Order Cancelled - #{orderNumber}",
      ORDER_REFUNDED: "Refund Processed - #{orderNumber}",
      PAYMENT_SUCCESSFUL: "Payment Successful - #{orderNumber}",
      PAYMENT_FAILED: "Payment Failed - #{orderNumber}",
      PAYMENT_PENDING: "Payment Pending - #{orderNumber}",
      REFUND_PROCESSED: "Refund Processed - #{orderNumber}",
      ACCOUNT_CREATED: "Welcome to Bareloft!",
      ACCOUNT_VERIFIED: "Account Verified Successfully",
      PASSWORD_RESET: "Password Reset Request",
      LOGIN_ALERT: "New Login to Your Account",
      LOW_STOCK_ALERT: "Low Stock Alert - #{productName}",
      OUT_OF_STOCK_ALERT: "Out of Stock Alert - #{productName}",
      RESTOCK_NEEDED: "Restock Needed - #{productName}",
      WELCOME_SERIES: "Welcome to Bareloft - Get Started!",
      ABANDONED_CART: "You Left Something in Your Cart",
      PRODUCT_BACK_IN_STOCK: "#{productName} is Back in Stock!",
      NEWSLETTER: "Bareloft Newsletter - #{title}",
      PROMOTIONAL: "#{title} - Special Offer!",
      SYSTEM_MAINTENANCE: "Scheduled Maintenance Notice",
      SECURITY_ALERT: "Security Alert for Your Account",
      FEATURE_ANNOUNCEMENT: "New Feature: #{featureName}",
    };

    let subject = templates[type] || "Notification from Bareloft";

    // Replace variables
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        subject = subject.replace(`#{${key}}`, String(value));
      });
    }

    return subject;
  }

  private generateMessage(
    type: NotificationType,
    variables?: Record<string, any>
  ): string {
    const templates: Record<NotificationType, string> = {
      ORDER_CONFIRMATION:
        "Hi #{customerName}, your order #{orderNumber} has been confirmed. Total: ₦#{totalAmount}",
      ORDER_SHIPPED:
        "Hi #{customerName}, your order #{orderNumber} has been shipped. Tracking: #{trackingNumber}",
      ORDER_DELIVERED:
        "Hi #{customerName}, your order #{orderNumber} has been delivered. Thank you for shopping with us!",
      ORDER_CANCELLED:
        "Hi #{customerName}, your order #{orderNumber} has been cancelled.",
      ORDER_REFUNDED:
        "Hi #{customerName}, your refund for order #{orderNumber} has been processed.",
      PAYMENT_SUCCESSFUL:
        "Payment of ₦#{amount} for order #{orderNumber} was successful.",
      PAYMENT_FAILED:
        "Payment for order #{orderNumber} failed. Please try again.",
      PAYMENT_PENDING:
        "Payment for order #{orderNumber} is pending confirmation.",
      REFUND_PROCESSED: "Your refund of ₦#{refundAmount} has been processed.",
      ACCOUNT_CREATED:
        "Welcome to Bareloft! Your account has been created successfully.",
      ACCOUNT_VERIFIED: "Your Bareloft account has been verified.",
      PASSWORD_RESET: "Your password reset request has been processed.",
      LOGIN_ALERT: "New login detected on your account.",
      LOW_STOCK_ALERT:
        "Low stock alert: #{productName} - Current stock: #{currentStock}",
      OUT_OF_STOCK_ALERT: "Out of stock: #{productName}",
      RESTOCK_NEEDED: "Restock needed for #{productName}",
      WELCOME_SERIES: "Welcome to Bareloft! Start shopping today.",
      ABANDONED_CART:
        "You have items waiting in your cart. Complete your purchase now!",
      PRODUCT_BACK_IN_STOCK: "#{productName} is back in stock! Get yours now.",
      NEWSLETTER: "Check out our latest newsletter.",
      PROMOTIONAL: "Special offer just for you!",
      SYSTEM_MAINTENANCE: "System maintenance scheduled.",
      SECURITY_ALERT: "Security alert for your account.",
      FEATURE_ANNOUNCEMENT: "New feature available: #{featureName}",
    };

    let message =
      templates[type] || "You have a new notification from Bareloft.";

    // Replace variables
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        message = message.replace(`#{${key}}`, String(value));
      });
    }

    return message;
  }

  private async getAnalyticsByChannel(where: any): Promise<
    Array<{
      channel: NotificationChannel;
      sent: number;
      delivered: number;
      failed: number;
      deliveryRate: number;
    }>
  > {
    const channels: NotificationChannel[] = ["EMAIL", "SMS", "PUSH", "IN_APP"];
    const results = [];

    for (const channel of channels) {
      const [sent, delivered, failed] = await Promise.all([
        NotificationModel.count({
          where: { ...where, channel, status: { in: ["SENT", "DELIVERED"] } },
        }),
        NotificationModel.count({
          where: { ...where, channel, status: "DELIVERED" },
        }),
        NotificationModel.count({
          where: { ...where, channel, status: "FAILED" },
        }),
      ]);

      const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 0;

      results.push({
        channel,
        sent,
        delivered,
        failed,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
      });
    }

    return results;
  }

  private async getAnalyticsByType(where: any): Promise<
    Array<{
      type: NotificationType;
      sent: number;
      delivered: number;
      failed: number;
    }>
  > {
    // This would group by type - simplified for demo
    const types = await NotificationModel.groupBy({
      by: ["type"],
      where,
      _count: { id: true },
    });

    const results = [];
    for (const typeGroup of types) {
      const [sent, delivered, failed] = await Promise.all([
        NotificationModel.count({
          where: {
            ...where,
            type: typeGroup.type,
            status: { in: ["SENT", "DELIVERED"] },
          },
        }),
        NotificationModel.count({
          where: { ...where, type: typeGroup.type, status: "DELIVERED" },
        }),
        NotificationModel.count({
          where: { ...where, type: typeGroup.type, status: "FAILED" },
        }),
      ]);

      results.push({
        type: typeGroup.type as NotificationType,
        sent,
        delivered,
        failed,
      });
    }

    return results;
  }

  private transformNotification(notification: any): Notification {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      channel: notification.channel,
      templateId: notification.templateId,
      subject: notification.subject,
      message: notification.message,
      htmlContent: notification.htmlContent,
      recipient: {
        email: notification.recipientEmail,
        phoneNumber: notification.recipientPhone,
        name: notification.recipientName,
      },
      status: notification.status,
      priority: notification.priority,
      providerMessageId: notification.providerMessageId,
      deliveredAt: notification.deliveredAt,
      readAt: notification.readAt,
      clickedAt: notification.clickedAt,
      errorMessage: notification.errorMessage,
      retryCount: notification.retryCount,
      maxRetries: notification.maxRetries,
      orderId: notification.orderId,
      productId: notification.productId,
      referenceType: notification.referenceType,
      referenceId: notification.referenceId,
      metadata: notification.metadata,
      variables: notification.variables,
      scheduledFor: notification.scheduledFor,
      expiresAt: notification.expiresAt,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }
}
