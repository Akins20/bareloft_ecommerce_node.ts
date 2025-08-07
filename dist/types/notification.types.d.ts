export declare enum NotificationType {
    ORDER_CONFIRMATION = "order_confirmation",
    ORDER_SHIPPED = "order_shipped",
    ORDER_DELIVERED = "order_delivered",
    ORDER_CANCELLED = "order_cancelled",
    ORDER_REFUNDED = "order_refunded",
    PAYMENT_SUCCESSFUL = "payment_successful",
    PAYMENT_FAILED = "payment_failed",
    PAYMENT_PENDING = "payment_pending",
    REFUND_PROCESSED = "refund_processed",
    ACCOUNT_CREATED = "account_created",
    ACCOUNT_VERIFIED = "account_verified",
    PASSWORD_RESET = "password_reset",
    LOGIN_ALERT = "login_alert",
    LOW_STOCK_ALERT = "low_stock_alert",
    OUT_OF_STOCK_ALERT = "out_of_stock_alert",
    CRITICAL_STOCK_ALERT = "critical_stock_alert",
    RESTOCK_NEEDED = "restock_needed",
    REORDER_SUGGESTION = "reorder_suggestion",
    REORDER_APPROVED = "reorder_approved",
    REORDER_COMPLETED = "reorder_completed",
    SLOW_MOVING_ALERT = "slow_moving_alert",
    FAST_MOVING_ALERT = "fast_moving_alert",
    OVERSTOCK_ALERT = "overstock_alert",
    NEGATIVE_STOCK_ALERT = "negative_stock_alert",
    SUPPLIER_ALERT = "supplier_alert",
    WELCOME_SERIES = "welcome_series",
    ABANDONED_CART = "abandoned_cart",
    PRODUCT_BACK_IN_STOCK = "product_back_in_stock",
    NEWSLETTER = "newsletter",
    PROMOTIONAL = "promotional",
    SYSTEM_MAINTENANCE = "system_maintenance",
    SECURITY_ALERT = "security_alert",
    FEATURE_ANNOUNCEMENT = "feature_announcement"
}
export declare enum NotificationChannel {
    EMAIL = "email",
    SMS = "sms",
    PUSH = "push",
    IN_APP = "in_app",
    WHATSAPP = "whatsapp"
}
export declare enum NotificationStatus {
    PENDING = "pending",
    QUEUED = "queued",
    SENT = "sent",
    DELIVERED = "delivered",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export declare enum NotificationPriority {
    LOW = "low",
    NORMAL = "normal",
    HIGH = "high",
    URGENT = "urgent"
}
export interface NotificationTemplate {
    id: string;
    type: NotificationType;
    channel: NotificationChannel;
    name: string;
    description: string;
    subject?: string;
    bodyTemplate: string;
    htmlTemplate?: string;
    variables: string[];
    isActive: boolean;
    isDefault: boolean;
    priority: NotificationPriority;
    delayMinutes?: number;
    expiresAfterHours?: number;
    language: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Notification {
    id: string;
    userId?: string;
    type: NotificationType;
    channel: NotificationChannel;
    templateId?: string;
    subject?: string;
    message: string;
    htmlContent?: string;
    recipient: {
        email?: string;
        phoneNumber?: string;
        pushToken?: string;
        name?: string;
    };
    status: NotificationStatus;
    priority: NotificationPriority;
    providerMessageId?: string;
    deliveredAt?: Date;
    readAt?: Date;
    clickedAt?: Date;
    errorMessage?: string;
    retryCount: number;
    maxRetries: number;
    orderId?: string;
    productId?: string;
    referenceType?: string;
    referenceId?: string;
    metadata?: Record<string, any>;
    variables?: Record<string, any>;
    scheduledFor?: Date;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface SendNotificationRequest {
    type: NotificationType;
    channel: NotificationChannel;
    userId?: string;
    recipient: {
        email?: string;
        phoneNumber?: string;
        pushToken?: string;
        name?: string;
    };
    variables?: Record<string, any>;
    metadata?: Record<string, any>;
    scheduledFor?: Date;
    priority?: NotificationPriority;
}
export interface BulkNotificationRequest {
    type: NotificationType;
    channel: NotificationChannel;
    recipients: {
        userId?: string;
        email?: string;
        phoneNumber?: string;
        pushToken?: string;
        name?: string;
        variables?: Record<string, any>;
    }[];
    templateVariables?: Record<string, any>;
    scheduledFor?: Date;
    priority?: NotificationPriority;
}
export interface NotificationPreferencesRequest {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    marketingEmails: boolean;
    orderUpdates: boolean;
    stockAlerts: boolean;
    newsletters: boolean;
    promotions: boolean;
}
export interface NotificationPreferences {
    id: string;
    userId: string;
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    orderNotifications: boolean;
    paymentNotifications: boolean;
    marketingEmails: boolean;
    stockAlerts: boolean;
    newsletters: boolean;
    promotionalOffers: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    timezone: string;
    maxEmailsPerDay?: number;
    maxSmsPerDay?: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface EmailNotification {
    id: string;
    notificationId: string;
    from: string;
    to: string;
    cc?: string[];
    bcc?: string[];
    replyTo?: string;
    subject: string;
    textBody: string;
    htmlBody?: string;
    attachments?: EmailAttachment[];
    opened?: boolean;
    openedAt?: Date;
    clicked?: boolean;
    clickedAt?: Date;
    unsubscribed?: boolean;
    unsubscribedAt?: Date;
    providerMessageId?: string;
    providerStatus?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface EmailAttachment {
    filename: string;
    contentType: string;
    size: number;
    url?: string;
    content?: Buffer;
}
export interface SMSNotification {
    id: string;
    notificationId: string;
    from: string;
    to: string;
    message: string;
    deliveredAt?: Date;
    deliveryStatus?: string;
    providerMessageId?: string;
    providerStatus?: string;
    cost?: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface PushNotification {
    id: string;
    notificationId: string;
    title: string;
    body: string;
    icon?: string;
    badge?: number;
    sound?: string;
    deviceToken: string;
    platform: "ios" | "android" | "web";
    data?: Record<string, any>;
    deliveredAt?: Date;
    clickedAt?: Date;
    providerMessageId?: string;
    providerResponse?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface NotificationAnalytics {
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    unsubscribeRate: number;
    byChannel: {
        channel: NotificationChannel;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        deliveryRate: number;
        openRate: number;
        clickRate: number;
    }[];
    byType: {
        type: NotificationType;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        conversionRate: number;
    }[];
    overTime: {
        date: string;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
    }[];
    failureReasons: {
        reason: string;
        count: number;
        percentage: number;
    }[];
}
export interface NotificationCampaign {
    id: string;
    name: string;
    description: string;
    type: NotificationType;
    channel: NotificationChannel;
    audienceFilter?: Record<string, any>;
    recipientCount: number;
    templateId: string;
    variables?: Record<string, any>;
    scheduledFor?: Date;
    timezone: string;
    status: "draft" | "scheduled" | "sending" | "completed" | "cancelled";
    sentCount: number;
    deliveredCount: number;
    failedCount: number;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    sentAt?: Date;
    completedAt?: Date;
}
//# sourceMappingURL=notification.types.d.ts.map