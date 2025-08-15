/**
 * Background Job System Types
 * 
 * Defines all job types, priorities, and data structures for the Bull Queue system.
 * Supports email processing, notifications, analytics, caching, and maintenance tasks.
 * 
 * Author: Bareloft Development Team
 */

// Job Types - categorizes different kinds of background work
export enum JobType {
  // High Priority - Process immediately
  EMAIL = 'email',
  NOTIFICATION = 'notification',
  OTP = 'otp',
  
  // Medium Priority - Process within minutes
  ANALYTICS = 'analytics',
  CACHE_UPDATE = 'cache_update',
  PAYMENT_VERIFICATION = 'payment_verification',
  PAYMENT_RECONCILIATION = 'payment_reconciliation',
  
  // Low Priority - Process within hours
  MAINTENANCE = 'maintenance',
  REPORTING = 'reporting',
  CLEANUP = 'cleanup'
}

// Job Priority Levels - determines processing order
export enum JobPriority {
  CRITICAL = 0,   // OTP emails, payment confirmations
  HIGH = 1,       // Welcome emails, order confirmations
  MEDIUM = 5,     // Notifications, analytics updates
  LOW = 10,       // Reports, maintenance tasks
  BATCH = 20      // Bulk operations, cleanup
}

// Email Job Subtypes
export enum EmailJobType {
  WELCOME = 'welcome',
  OTP_VERIFICATION = 'otp_verification',
  ORDER_CONFIRMATION = 'order_confirmation',
  ORDER_UPDATE = 'order_update',
  PAYMENT_CONFIRMATION = 'payment_confirmation',
  NEWSLETTER = 'newsletter',
  MARKETING = 'marketing'
}

// Notification Job Subtypes
export enum NotificationJobType {
  IN_APP = 'in_app',
  PUSH = 'push',
  SMS = 'sms'
}

// Analytics Job Subtypes
export enum AnalyticsJobType {
  USER_ACTIVITY = 'user_activity',
  PRODUCT_VIEW = 'product_view',
  PURCHASE_EVENT = 'purchase_event',
  SEARCH_ANALYTICS = 'search_analytics'
}

// Base Job Data Interface
export interface BaseJobData {
  jobId?: string;
  type: JobType;
  priority: JobPriority;
  userId?: string;
  sessionId?: string;
  createdAt: Date;
  scheduledFor?: Date;
  maxAttempts?: number;
  retryDelay?: number;
  metadata?: Record<string, any>;
}

// Email Job Data
export interface EmailJobData extends BaseJobData {
  type: JobType.EMAIL;
  emailType: EmailJobType;
  recipients: string[];
  subject: string;
  template: string;
  templateData: Record<string, any>;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
    contentType?: string;
  }>;
}

// Notification Job Data  
export interface NotificationJobData extends BaseJobData {
  type: JobType.NOTIFICATION;
  notificationType: NotificationJobType;
  recipients: string[];
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: ('in_app' | 'push' | 'sms')[];
}

// Analytics Job Data
export interface AnalyticsJobData extends BaseJobData {
  type: JobType.ANALYTICS;
  analyticsType: AnalyticsJobType;
  eventData: Record<string, any>;
  aggregationLevel?: 'user' | 'product' | 'category' | 'global';
}

// Cache Update Job Data
export interface CacheJobData extends BaseJobData {
  type: JobType.CACHE_UPDATE;
  cacheKeys: string[];
  operation: 'refresh' | 'invalidate' | 'preload';
  data?: Record<string, any>;
}

// Maintenance Job Data
export interface MaintenanceJobData extends BaseJobData {
  type: JobType.MAINTENANCE;
  task: 'session_cleanup' | 'log_rotation' | 'temp_file_cleanup' | 'db_optimization';
  parameters?: Record<string, any>;
}

// Payment Verification Job Data
export interface PaymentVerificationJobData extends BaseJobData {
  type: JobType.PAYMENT_VERIFICATION;
  paymentReference: string;
  orderId: string;
  orderNumber: string;
  attemptNumber: number;
  maxAttempts: number;
  userId?: string;
  email: string;
  amount: number;
  currency: string;
}

// Payment Reconciliation Job Data
export interface PaymentReconciliationJobData extends BaseJobData {
  type: JobType.PAYMENT_RECONCILIATION;
  reconciliationType: 'scheduled' | 'manual' | 'emergency';
  timeRangeHours: number; // How far back to check (e.g., 24 hours)
  batchSize: number; // Orders to process per batch
  onlyUnconfirmed: boolean; // Only check orders with payment status PENDING
}

// Union type for all job data
export type JobData = 
  | EmailJobData 
  | NotificationJobData 
  | AnalyticsJobData 
  | CacheJobData 
  | MaintenanceJobData
  | PaymentVerificationJobData
  | PaymentReconciliationJobData;

// Job Status
export enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active', 
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  STUCK = 'stuck'
}

// Job Result Interface
export interface JobResult {
  success: boolean;
  result?: any;
  error?: string;
  duration?: number;
  processedAt: Date;
  metadata?: Record<string, any>;
}

// Job Queue Options (compatible with Bull's JobOptions)
export interface QueueOptions {
  removeOnComplete?: number;
  removeOnFail?: number;
  attempts?: number;
  backoff?: 'fixed' | 'exponential' | { type: 'fixed' | 'exponential'; delay?: number };
  delay?: number;
  timeout?: number;
  priority?: number;
  repeat?: {
    cron?: string;
    every?: number;
    limit?: number;
  };
}

// Job Queue Statistics
export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  totalProcessed: number;
  processingRate: number; // jobs per minute
  avgProcessingTime: number; // milliseconds
}

// Bulk Job Operation
export interface BulkJobData {
  name: string;
  data: JobData;
  options?: QueueOptions;
}

// Job Event Types for monitoring
export type JobEventType = 
  | 'waiting'
  | 'active'
  | 'completed' 
  | 'failed'
  | 'progress'
  | 'removed'
  | 'stalled';

// Job Event Data
export interface JobEvent {
  jobId: string;
  event: JobEventType;
  data?: any;
  timestamp: Date;
  queueName: string;
}

// Email Template Data Interfaces
export interface WelcomeEmailData {
  firstName: string;
  email: string;
  shopUrl: string;
  supportEmail: string;
  privacyUrl: string;
  termsUrl: string;
}

export interface OrderConfirmationEmailData {
  orderNumber: string;
  customerName: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  shippingAddress: string;
  estimatedDelivery: string;
}

export interface OTPEmailData {
  firstName: string;
  otpCode: string;
  expiresIn: number; // minutes
  purpose: 'signup' | 'login' | 'password_reset';
}

// Job Queue Configuration
export interface JobQueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  queues: {
    [K in JobType]: {
      concurrency: number;
      defaultJobOptions: QueueOptions;
    };
  };
  monitoring: {
    enabled: boolean;
    port?: number;
    path?: string;
  };
}