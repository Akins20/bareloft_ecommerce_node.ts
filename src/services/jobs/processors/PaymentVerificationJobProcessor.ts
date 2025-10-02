/**
 * Payment Verification Job Processor
 * 
 * Automatically verifies payment status with Paystack and confirms orders.
 * Implements retry logic with exponential backoff: 1, 3, 5, 7, 11 minutes.
 * Max 10 attempts, after which the payment is marked as failed.
 * 
 * Triggers:
 * - Email notifications on successful payment confirmation
 * - Database updates for order and payment status
 * - User notifications (in-app/push) for authentication users
 * 
 * Author: Bareloft Development Team
 */

import { Job } from 'bull';
import { PaymentVerificationJobData, JobType, JobPriority, EmailJobType, NotificationJobType } from '../../../types/job.types';
import { PaymentStatus } from '../../../types/payment.types';
import { NotificationType, NotificationChannel, NotificationPriority } from '../../../types/notification.types';
import { PaymentService } from '../../payments/PaymentService';
import { OrderService } from '../../orders/OrderService';
import { JobService } from '../JobService';
import { NotificationService } from '../../notifications/NotificationService';
import { PaymentTransactionModel, OrderModel } from '../../../models';
import { logger } from '../../../utils/logger/winston';
import { AppError, HTTP_STATUS, ERROR_CODES } from '../../../types';
import { getServiceContainer } from '../../../config/serviceContainer';

export class PaymentVerificationJobProcessor {
  private paymentService: PaymentService;
  private orderService: OrderService;
  private jobService: JobService | null = null;
  private notificationService: NotificationService;

  // Retry intervals in minutes: 1, 3, 5, 7, 11
  private readonly RETRY_INTERVALS = [1, 3, 5, 7, 11];
  private readonly MAX_ATTEMPTS = 10;

  constructor() {
    // Get services from container (singleton)
    const serviceContainer = getServiceContainer();
    this.paymentService = serviceContainer.getService<PaymentService>('paymentService');
    this.orderService = serviceContainer.getService<OrderService>('orderService');
    this.notificationService = new NotificationService();

    logger.info('🔧 PaymentVerificationJobProcessor initialized', {
      processor: 'PaymentVerificationJobProcessor',
      retryIntervals: this.RETRY_INTERVALS,
      maxAttempts: this.MAX_ATTEMPTS
    });
  }

  /**
   * Get JobService instance
   */
  private async getJobService(): Promise<JobService> {
    if (!this.jobService) {
      this.jobService = new JobService();
      await this.jobService.initialize();
    }
    return this.jobService;
  }

  /**
   * Process payment verification job
   */
  async process(job: Job<PaymentVerificationJobData>): Promise<void> {
    const data = job.data;
    const startTime = Date.now();
    
    try {
      logger.info(`🔍 [CRON JOB] Starting payment verification`, {
        jobId: job.id,
        jobName: job.name,
        processor: 'PaymentVerificationJobProcessor',
        paymentReference: data.paymentReference,
        orderNumber: data.orderNumber,
        orderId: data.orderId,
        attempt: data.attemptNumber,
        maxAttempts: data.maxAttempts,
        userId: data.userId,
        email: data.email,
        amount: data.amount,
        currency: data.currency,
        startTime: new Date().toISOString()
      });

      // Check if we've exceeded max attempts
      if (data.attemptNumber >= this.MAX_ATTEMPTS) {
        await this.handleMaxAttemptsReached(data);
        return;
      }

      // Verify payment with Paystack
      const verificationResult = await this.paymentService.verifyPayment({
        reference: data.paymentReference
      });

      if (verificationResult.success) {
        const transaction = verificationResult.data;
        
        if (transaction.status === PaymentStatus.SUCCESS) {
          // Payment is successful - trigger confirmations
          await this.handleSuccessfulPayment(data, transaction, null);
          
          const duration = Date.now() - startTime;
          logger.info(`✅ [CRON JOB] Payment verification completed successfully`, {
            jobId: job.id,
            processor: 'PaymentVerificationJobProcessor',
            paymentReference: data.paymentReference,
            orderNumber: data.orderNumber,
            transactionStatus: transaction.status,
            duration: `${duration}ms`,
            completedAt: new Date().toISOString(),
            result: 'PAYMENT_CONFIRMED'
          });
        } else if (transaction.status === PaymentStatus.FAILED || 
                   transaction.status === PaymentStatus.CANCELLED || 
                   transaction.status === PaymentStatus.ABANDONED) {
          // Payment failed - mark as failed and notify
          await this.handleFailedPayment(data, transaction.status);
        } else {
          // Payment still pending - schedule retry
          await this.scheduleRetry(data);
        }
      } else {
        // Verification failed - might be temporary issue, schedule retry
        logger.warn(`⚠️ Payment verification failed, scheduling retry`, {
          paymentReference: data.paymentReference,
          error: verificationResult.message,
          attempt: data.attemptNumber
        });
        
        await this.scheduleRetry(data);
      }

    } catch (error) {
      logger.error(`❌ Payment verification job failed`, {
        jobId: job.id,
        paymentReference: data.paymentReference,
        error: error.message,
        attempt: data.attemptNumber
      });
      
      // Schedule retry for unexpected errors
      await this.scheduleRetry(data);
      throw error;
    }
  }

  /**
   * Handle successful payment confirmation
   */
  private async handleSuccessfulPayment(
    data: PaymentVerificationJobData, 
    transaction: any, 
    order: any
  ): Promise<void> {
    try {
      // Update order status to confirmed
      await OrderModel.update({
        where: { id: data.orderId },
        data: {
          status: 'CONFIRMED',
          paymentStatus: 'COMPLETED',
          paymentReference: data.paymentReference,
          updatedAt: new Date(),
        }
      });

      // Send payment confirmation email
      const jobService = await this.getJobService();
      const jobSvc = await this.getJobService();
      await jobSvc.addEmailJob({
        emailType: EmailJobType.PAYMENT_CONFIRMATION,
        recipients: [data.email],
        subject: `Payment Confirmed - Order #${data.orderNumber}`,
        template: 'payment-confirmation',
        templateData: {
          orderNumber: data.orderNumber,
          amount: data.amount,
          currency: data.currency,
          paymentReference: data.paymentReference,
          customerName: order?.user?.firstName ? 
            `${order.user.firstName} ${order.user.lastName}` : 
            'Valued Customer'
        },
        priority: JobPriority.HIGH
      });

      // Send in-app notification if user is authenticated
      if (data.userId) {
        await jobService.addNotificationJob({
          notificationType: NotificationJobType.IN_APP,
          recipients: [data.userId],
          title: 'Payment Confirmed',
          message: `Your payment for order #${data.orderNumber} has been confirmed. Total: ₦${(data.amount / 100).toLocaleString()}`,
          data: {
            orderId: data.orderId,
            orderNumber: data.orderNumber,
            type: 'payment_confirmation'
          },
          channels: ['in_app'],
          priority: JobPriority.HIGH
        });

        // Send notification through NotificationService
        try {
          await this.notificationService.sendNotification({
            userId: data.userId,
            recipient: {
              email: data.email,
              name: 'Valued Customer'
            },
            type: NotificationType.PAYMENT_SUCCESSFUL,
            channel: NotificationChannel.IN_APP,
            priority: NotificationPriority.HIGH,
            variables: {
              orderNumber: data.orderNumber,
              amount: (data.amount / 100).toLocaleString(),
              currency: data.currency,
              paymentReference: data.paymentReference
            },
            metadata: {
              orderId: data.orderId,
              paymentReference: data.paymentReference,
              amount: data.amount
            }
          });

          logger.info('✅ Payment success notification sent via NotificationService', {
            userId: data.userId,
            orderNumber: data.orderNumber,
            paymentReference: data.paymentReference
          });
        } catch (notificationError) {
          logger.error('❌ Failed to send payment success notification via NotificationService', {
            userId: data.userId,
            orderNumber: data.orderNumber,
            error: notificationError.message
          });
          // Don't throw - notification failure shouldn't break payment confirmation
        }
      }

      // Note: Timeline event creation would be handled by order status update hooks

      logger.info(`📧 Payment confirmation notifications scheduled`, {
        orderNumber: data.orderNumber,
        email: data.email,
        userId: data.userId
      });

    } catch (error) {
      logger.error(`❌ Failed to handle successful payment`, {
        orderNumber: data.orderNumber,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Handle failed payment
   */
  private async handleFailedPayment(
    data: PaymentVerificationJobData, 
    status: string
  ): Promise<void> {
    try {
      // Update order status to cancelled
      await OrderModel.update({
        where: { id: data.orderId },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'FAILED',
          paymentReference: data.paymentReference,
          updatedAt: new Date(),
        }
      });

      // Send payment failed email
      const failedJobSvc = await this.getJobService();
      await failedJobSvc.addEmailJob({
        emailType: EmailJobType.ORDER_UPDATE,
        recipients: [data.email],
        subject: `Payment Failed - Order #${data.orderNumber}`,
        template: 'order-update',
        templateData: {
          orderNumber: data.orderNumber,
          status: 'Payment Failed',
          message: `Unfortunately, your payment could not be processed. Status: ${status}`,
          customerName: 'Valued Customer'
        },
        priority: JobPriority.HIGH
      });

      // Send in-app notification if user is authenticated
      if (data.userId) {
        await failedJobSvc.addNotificationJob({
          notificationType: NotificationJobType.IN_APP,
          recipients: [data.userId],
          title: 'Payment Failed',
          message: `Payment for order #${data.orderNumber} could not be processed. Please try again or contact support.`,
          data: {
            orderId: data.orderId,
            orderNumber: data.orderNumber,
            type: 'payment_failed'
          },
          channels: ['in_app'],
          priority: JobPriority.HIGH
        });

        // Send notification through NotificationService
        try {
          await this.notificationService.sendNotification({
            userId: data.userId,
            recipient: {
              email: data.email,
              name: 'Valued Customer'
            },
            type: NotificationType.PAYMENT_FAILED,
            channel: NotificationChannel.IN_APP,
            priority: NotificationPriority.HIGH,
            variables: {
              orderNumber: data.orderNumber,
              paymentStatus: status,
              supportEmail: 'support@bareloft.com'
            },
            metadata: {
              orderId: data.orderId,
              paymentReference: data.paymentReference,
              failureReason: status
            }
          });

          logger.info('✅ Payment failure notification sent via NotificationService', {
            userId: data.userId,
            orderNumber: data.orderNumber,
            paymentReference: data.paymentReference,
            status
          });
        } catch (notificationError) {
          logger.error('❌ Failed to send payment failure notification via NotificationService', {
            userId: data.userId,
            orderNumber: data.orderNumber,
            error: notificationError.message
          });
          // Don't throw - notification failure shouldn't break payment processing
        }
      }

      logger.info(`💔 Payment failed notifications scheduled`, {
        orderNumber: data.orderNumber,
        status,
        email: data.email
      });

    } catch (error) {
      logger.error(`❌ Failed to handle failed payment`, {
        orderNumber: data.orderNumber,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Schedule retry with exponential backoff
   */
  private async scheduleRetry(data: PaymentVerificationJobData): Promise<void> {
    const nextAttempt = data.attemptNumber + 1;
    
    if (nextAttempt >= this.MAX_ATTEMPTS) {
      await this.handleMaxAttemptsReached(data);
      return;
    }

    // Get delay from retry intervals array or default to 15 minutes for later attempts
    const delayMinutes = this.RETRY_INTERVALS[nextAttempt - 1] || 15;
    const delayMs = delayMinutes * 60 * 1000;

    // Schedule next verification attempt
    const jobServiceInstance = await this.getJobService();
      await jobServiceInstance.addPaymentVerificationJob({
      ...data,
      attemptNumber: nextAttempt,
      priority: JobPriority.MEDIUM,
    }, JobPriority.MEDIUM, { delay: delayMs });

    logger.info(`⏰ Payment verification retry scheduled`, {
      paymentReference: data.paymentReference,
      nextAttempt,
      delayMinutes,
      maxAttempts: this.MAX_ATTEMPTS
    });
  }

  /**
   * Handle case where max attempts have been reached
   */
  private async handleMaxAttemptsReached(data: PaymentVerificationJobData): Promise<void> {
    try {
      // Mark order as verification timeout
      await OrderModel.update({
        where: { id: data.orderId },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'FAILED',
          paymentReference: data.paymentReference,
          updatedAt: new Date(),
        }
      });

      // Send timeout notification email
      const timeoutJobSvc = await this.getJobService();
      await timeoutJobSvc.addEmailJob({
        emailType: EmailJobType.ORDER_UPDATE,
        recipients: [data.email],
        subject: `Payment Verification Timeout - Order #${data.orderNumber}`,
        template: 'order-update',
        templateData: {
          orderNumber: data.orderNumber,
          status: 'Payment Verification Timeout',
          message: 'We were unable to verify your payment automatically. Our support team has been notified and will contact you shortly.',
          customerName: 'Valued Customer'
        },
        priority: JobPriority.HIGH
      });

      // Send admin notification for manual review
      await timeoutJobSvc.addEmailJob({
        emailType: EmailJobType.MARKETING, // Using as admin notification
        recipients: [process.env.ADMIN_EMAIL || 'admin@bareloft.com'],
        subject: `Payment Verification Timeout - Order #${data.orderNumber}`,
        template: 'admin-notification',
        templateData: {
          subject: `Payment Verification Timeout - Order #${data.orderNumber}`,
          orderNumber: data.orderNumber,
          paymentReference: data.paymentReference,
          customerEmail: data.email,
          amount: data.amount,
          attempts: this.MAX_ATTEMPTS
        },
        priority: JobPriority.CRITICAL
      });

      logger.error(`⏰ Payment verification timeout after ${this.MAX_ATTEMPTS} attempts`, {
        orderNumber: data.orderNumber,
        paymentReference: data.paymentReference,
        email: data.email
      });

    } catch (error) {
      logger.error(`❌ Failed to handle max attempts reached`, {
        orderNumber: data.orderNumber,
        error: error.message
      });
      throw error;
    }
  }

}