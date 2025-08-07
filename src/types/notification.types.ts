export enum NotificationType {
  // Order Notifications
  ORDER_CONFIRMATION = "order_confirmation",
  ORDER_SHIPPED = "order_shipped",
  ORDER_DELIVERED = "order_delivered",
  ORDER_CANCELLED = "order_cancelled",
  ORDER_REFUNDED = "order_refunded",

  // Payment Notifications
  PAYMENT_SUCCESSFUL = "payment_successful",
  PAYMENT_FAILED = "payment_failed",
  PAYMENT_PENDING = "payment_pending",
  REFUND_PROCESSED = "refund_processed",

  // Account Notifications
  ACCOUNT_CREATED = "account_created",
  ACCOUNT_VERIFIED = "account_verified",
  PASSWORD_RESET = "password_reset",
  LOGIN_ALERT = "login_alert",

  // Inventory Notifications (Admin) - Enhanced Phase 2.2
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

  // Marketing Notifications
  WELCOME_SERIES = "welcome_series",
  ABANDONED_CART = "abandoned_cart",
  PRODUCT_BACK_IN_STOCK = "product_back_in_stock",
  NEWSLETTER = "newsletter",
  PROMOTIONAL = "promotional",

  // System Notifications
  SYSTEM_MAINTENANCE = "system_maintenance",
  SECURITY_ALERT = "security_alert",
  FEATURE_ANNOUNCEMENT = "feature_announcement",
}

export enum NotificationChannel {
  EMAIL = "email",
  SMS = "sms",
  PUSH = "push",
  IN_APP = "in_app",
  WHATSAPP = "whatsapp", // Future integration
}

export enum NotificationStatus {
  PENDING = "pending",
  QUEUED = "queued",
  SENT = "sent",
  DELIVERED = "delivered",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum NotificationPriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  URGENT = "urgent",
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  name: string;
  description: string;

  // Template Content
  subject?: string; // For email/push
  bodyTemplate: string;
  htmlTemplate?: string; // For email

  // Variables
  variables: string[]; // List of template variables

  // Configuration
  isActive: boolean;
  isDefault: boolean;
  priority: NotificationPriority;

  // Timing
  delayMinutes?: number;
  expiresAfterHours?: number;

  // Localization
  language: string;

  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId?: string;

  // Notification Details
  type: NotificationType;
  channel: NotificationChannel;
  templateId?: string;

  // Content
  subject?: string;
  message: string;
  htmlContent?: string;

  // Recipient
  recipient: {
    email?: string;
    phoneNumber?: string;
    pushToken?: string;
    name?: string;
  };

  // Status
  status: NotificationStatus;
  priority: NotificationPriority;

  // Delivery Details
  providerMessageId?: string;
  deliveredAt?: Date;
  readAt?: Date;
  clickedAt?: Date;

  // Error Information
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;

  // References
  orderId?: string;
  productId?: string;
  referenceType?: string;
  referenceId?: string;

  // Metadata
  metadata?: Record<string, any>;
  variables?: Record<string, any>;

  // Scheduling
  scheduledFor?: Date;
  expiresAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Request Types
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

// User Notification Preferences
export interface NotificationPreferences {
  id: string;
  userId: string;

  // Channel Preferences
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;

  // Type Preferences
  orderNotifications: boolean;
  paymentNotifications: boolean;
  marketingEmails: boolean;
  stockAlerts: boolean;
  newsletters: boolean;
  promotionalOffers: boolean;

  // Timing Preferences
  quietHoursStart?: string; // HH:MM format
  quietHoursEnd?: string;
  timezone: string;

  // Frequency Limits
  maxEmailsPerDay?: number;
  maxSmsPerDay?: number;

  createdAt: Date;
  updatedAt: Date;
}

// Email Specific Types
export interface EmailNotification {
  id: string;
  notificationId: string;

  // Email Details
  from: string;
  to: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  subject: string;

  // Content
  textBody: string;
  htmlBody?: string;
  attachments?: EmailAttachment[];

  // Tracking
  opened?: boolean;
  openedAt?: Date;
  clicked?: boolean;
  clickedAt?: Date;
  unsubscribed?: boolean;
  unsubscribedAt?: Date;

  // Provider Details
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

// SMS Specific Types
export interface SMSNotification {
  id: string;
  notificationId: string;

  // SMS Details
  from: string;
  to: string;
  message: string;

  // Delivery
  deliveredAt?: Date;
  deliveryStatus?: string;

  // Provider Details
  providerMessageId?: string;
  providerStatus?: string;
  cost?: number;

  createdAt: Date;
  updatedAt: Date;
}

// Push Notification Types
export interface PushNotification {
  id: string;
  notificationId: string;

  // Push Details
  title: string;
  body: string;
  icon?: string;
  badge?: number;
  sound?: string;

  // Targeting
  deviceToken: string;
  platform: "ios" | "android" | "web";

  // Data
  data?: Record<string, any>;

  // Delivery
  deliveredAt?: Date;
  clickedAt?: Date;

  // Provider Details
  providerMessageId?: string;
  providerResponse?: string;

  createdAt: Date;
  updatedAt: Date;
}

// Analytics Types
export interface NotificationAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;

  // Rates
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  unsubscribeRate: number;

  // By Channel
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

  // By Type
  byType: {
    type: NotificationType;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    conversionRate: number;
  }[];

  // Over Time
  overTime: {
    date: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  }[];

  // Failed Notifications
  failureReasons: {
    reason: string;
    count: number;
    percentage: number;
  }[];
}

// Campaign Types (for bulk notifications)
export interface NotificationCampaign {
  id: string;
  name: string;
  description: string;
  type: NotificationType;
  channel: NotificationChannel;

  // Targeting
  audienceFilter?: Record<string, any>;
  recipientCount: number;

  // Content
  templateId: string;
  variables?: Record<string, any>;

  // Scheduling
  scheduledFor?: Date;
  timezone: string;

  // Status
  status: "draft" | "scheduled" | "sending" | "completed" | "cancelled";

  // Results
  sentCount: number;
  deliveredCount: number;
  failedCount: number;

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  completedAt?: Date;
}
