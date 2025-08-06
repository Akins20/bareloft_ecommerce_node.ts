import { BaseService } from "../BaseService";
import { Notification, NotificationType, NotificationChannel, SendNotificationRequest, BulkNotificationRequest, PaginationMeta } from "../../types";
import { EmailService } from "./EmailService";
import { SMSService } from "./SMSService";
import { PushService } from "./PushService";
export declare class NotificationService extends BaseService {
    private emailService;
    private smsService;
    private pushService;
    constructor(emailService?: EmailService, smsService?: SMSService, pushService?: PushService);
    /**
     * Send a single notification
     */
    sendNotification(request: SendNotificationRequest): Promise<Notification>;
    /**
     * Send bulk notifications
     */
    sendBulkNotifications(request: BulkNotificationRequest): Promise<{
        successful: number;
        failed: number;
        notifications: Notification[];
    }>;
    /**
     * Process a notification (actually send it)
     */
    processNotification(notificationId: string): Promise<void>;
    /**
     * Get notifications for a user
     */
    getUserNotifications(userId: string, page?: number, limit?: number, unreadOnly?: boolean): Promise<{
        notifications: Notification[];
        pagination: PaginationMeta;
        unreadCount: number;
    }>;
    /**
     * Mark notification as read
     */
    markAsRead(notificationId: string, userId: string): Promise<void>;
    /**
     * Mark all notifications as read for a user
     */
    markAllAsRead(userId: string): Promise<number>;
    /**
     * Get notification analytics
     */
    getNotificationAnalytics(startDate?: Date, endDate?: Date): Promise<{
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
    }>;
    /**
     * Process scheduled notifications (would be called by a cron job)
     */
    processScheduledNotifications(): Promise<number>;
    private generateSubject;
    private generateMessage;
    private getAnalyticsByChannel;
    private getAnalyticsByType;
    private transformNotification;
}
//# sourceMappingURL=NotificationService.d.ts.map