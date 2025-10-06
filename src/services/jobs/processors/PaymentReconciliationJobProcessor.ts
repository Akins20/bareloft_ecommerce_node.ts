/**
 * Payment Reconciliation Job Processor
 * 
 * Performs bulk payment reconciliation by comparing database orders with Paystack transactions.
 * Identifies and corrects payment status discrepancies to ensure data consistency.
 * 
 * Features:
 * - Batch processing of orders for efficiency
 * - Configurable time ranges and batch sizes
 * - Comprehensive discrepancy detection and correction
 * - Detailed audit logging with [RECONCILIATION] prefixes
 * - Automatic notifications for manual review cases
 * 
 * Reconciliation Types:
 * - Scheduled: Regular automated runs (every 30 minutes)
 * - Manual: Admin-triggered reconciliation 
 * - Emergency: Immediate reconciliation for critical issues
 * 
 * Author: Bareloft Development Team
 */

import { Job } from 'bull';
import { PaymentReconciliationJobData, JobType, JobPriority, EmailJobType } from '../../../types/job.types';
import { PaymentStatus } from '@prisma/client';
import { PaymentService } from '../../payments/PaymentService';
import { OrderService } from '../../orders/OrderService';
import { JobService } from '../JobService';
import { GlobalJobService } from '../../../utils/globalJobService';
import { NotificationService } from '../../notifications/NotificationService';
import { OrderModel, PaymentTransactionModel } from '../../../models';
import { logger } from '../../../utils/logger/winston';
import { NotificationType } from '../../../types/notification.types';
import { getServiceContainer } from '../../../config/serviceContainer';

interface ReconciliationSummary {
  totalProcessed: number;
  discrepanciesFound: number;
  successfulUpdates: number;
  failedUpdates: number;
  skipped: number;
  errors: string[];
}

interface PaymentDiscrepancy {
  orderId: string;
  orderNumber: string;
  databaseStatus: PaymentStatus;
  paystackStatus: PaymentStatus;
  amount: number;
  paymentReference: string;
  reason: string;
}

export class PaymentReconciliationJobProcessor {
  private paymentService: PaymentService;
  private orderService: OrderService;
  private notificationService: NotificationService;
  private jobService: JobService | null = null;

  constructor() {
    // Get services from container (singleton)
    const serviceContainer = getServiceContainer();
    this.paymentService = serviceContainer.getService<PaymentService>('paymentService');
    this.orderService = serviceContainer.getService<OrderService>('orderService');
    this.notificationService = new NotificationService();
    // JobService will be initialized on demand

    logger.info('🔧 PaymentReconciliationJobProcessor initialized');
  }

  /**
   * Get initialized JobService instance
   */
  private async getJobService(): Promise<JobService> {
    if (!this.jobService) {
      this.jobService = await GlobalJobService.getInstance();
    }
    return this.jobService;
  }

  /**
   * Process payment reconciliation job
   */
  async process(job: Job<PaymentReconciliationJobData>): Promise<void> {
    const data = job.data;
    const startTime = Date.now();
    
    const summary: ReconciliationSummary = {
      totalProcessed: 0,
      discrepanciesFound: 0,
      successfulUpdates: 0,
      failedUpdates: 0,
      skipped: 0,
      errors: []
    };

    try {
      logger.info(`🔍 [RECONCILIATION] Starting payment reconciliation`, {
        jobId: job.id,
        processor: 'PaymentReconciliationJobProcessor',
        type: data.reconciliationType,
        timeRangeHours: data.timeRangeHours,
        batchSize: data.batchSize,
        onlyUnconfirmed: data.onlyUnconfirmed,
        startTime: new Date().toISOString()
      });

      // Get orders to reconcile
      const orders = await this.getOrdersForReconciliation(data);
      summary.totalProcessed = orders.length;

      if (orders.length === 0) {
        logger.info(`✅ [RECONCILIATION] No orders found for reconciliation`, {
          jobId: job.id,
          timeRangeHours: data.timeRangeHours,
          onlyUnconfirmed: data.onlyUnconfirmed
        });
        return;
      }

      logger.info(`📊 [RECONCILIATION] Found ${orders.length} orders to reconcile`);

      // Process orders in batches
      const batches = this.chunkArray(orders, data.batchSize);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        logger.info(`🔄 [RECONCILIATION] Processing batch ${i + 1}/${batches.length} (${batch.length} orders)`);
        
        await this.processBatch(batch, summary);
        
        // Small delay between batches to avoid overwhelming Paystack API
        if (i < batches.length - 1) {
          await this.sleep(1000); // 1 second delay
        }
      }

      // Log final summary
      const duration = Date.now() - startTime;
      logger.info(`✅ [RECONCILIATION] Payment reconciliation completed`, {
        jobId: job.id,
        processor: 'PaymentReconciliationJobProcessor',
        duration: `${duration}ms`,
        summary,
        completedAt: new Date().toISOString()
      });

      // Send admin notification if discrepancies found
      if (summary.discrepanciesFound > 0) {
        await this.sendAdminNotification(data, summary);
      }

    } catch (error) {
      logger.error(`❌ [RECONCILIATION] Payment reconciliation failed`, {
        jobId: job.id,
        error: error.message,
        summary
      });
      throw error;
    }
  }

  /**
   * Get orders for reconciliation based on criteria
   */
  private async getOrdersForReconciliation(data: PaymentReconciliationJobData): Promise<any[]> {
    // Create time threshold with broader range to handle timezone differences
    const timeThreshold = new Date();
    timeThreshold.setHours(timeThreshold.getHours() - data.timeRangeHours);
    
    // Add buffer for timezone differences (convert to local timezone for Nigeria UTC+1)
    const bufferHours = 6; // Add 6 hour buffer to account for timezone differences
    const extendedTimeThreshold = new Date(timeThreshold.getTime() - (bufferHours * 60 * 60 * 1000));

    try {
      logger.info(`🕐 [RECONCILIATION] Time threshold calculation`, {
        requestedHours: data.timeRangeHours,
        originalThreshold: timeThreshold.toISOString(),
        extendedThreshold: extendedTimeThreshold.toISOString(),
        bufferHours: bufferHours
      });

      const whereClause: any = {
        createdAt: {
          gte: extendedTimeThreshold // Use extended threshold to catch timezone differences
        },
        OR: [
          // CRITICAL: Only reconcile orders that are in uncertain states
          // This prevents re-processing already completed/failed orders
          {
            // Orders with PENDING/PROCESSING status (need verification)
            paymentStatus: {
              in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING]
            }
          },
          // Orders that have orderNumber as paymentReference (needs proper Paystack ref)
          {
            paymentReference: {
              not: null,
              startsWith: 'BL' // Bareloft order numbers start with 'BL'
            },
            paymentStatus: {
              in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING, PaymentStatus.COMPLETED]
            }
          },
          // Orders with null paymentReference but in active payment states
          {
            paymentReference: null,
            paymentStatus: {
              in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING]
            }
          }
        ]
      };

      // If only checking unconfirmed orders, further restrict the status filter
      if (data.onlyUnconfirmed) {
        // Override the OR clause to ONLY check unconfirmed orders
        whereClause.paymentStatus = {
          in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING]
        };
      }

      // CRITICAL: Exclude orders that were recently updated (within last 10 minutes)
      // This prevents hammering the same orders repeatedly when cron runs every 15 min
      const recentUpdateThreshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      whereClause.updatedAt = {
        lt: recentUpdateThreshold // Only process orders NOT updated in last 10 minutes
      };

      const orders = await OrderModel.findMany({
        where: whereClause,
        select: {
          id: true,
          orderNumber: true,
          paymentReference: true,
          paymentStatus: true,
          status: true,
          total: true,
          currency: true,
          userId: true,
          user: {
            select: {
              email: true
            }
          },
          createdAt: true,
          updatedAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      logger.info(`📋 [RECONCILIATION] Retrieved ${orders.length} orders for reconciliation`, {
        timeRangeHours: data.timeRangeHours,
        onlyUnconfirmed: data.onlyUnconfirmed,
        oldestOrder: orders.length > 0 ? orders[orders.length - 1].createdAt : null
      });

      // Log detailed info about each order found
      if (orders.length > 0) {
        logger.info(`🔍 [RECONCILIATION] Orders found for processing:`, {
          orders: orders.map(order => ({
            id: order.id,
            orderNumber: order.orderNumber,
            paymentReference: order.paymentReference,
            paymentStatus: order.paymentStatus,
            status: order.status,
            total: order.total,
            currency: order.currency,
            userId: order.userId,
            userEmail: order.user?.email,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt
          }))
        });
      } else {
        logger.info(`ℹ️ [RECONCILIATION] No orders found matching criteria`, {
          whereClause: JSON.stringify(whereClause, null, 2),
          extendedTimeThreshold: extendedTimeThreshold.toISOString()
        });
        
        // Let's also check if there are ANY orders in the database (for debugging)
        try {
          const totalOrdersCount = await OrderModel.count();
          const recentOrdersCount = await OrderModel.count({
            where: {
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
              }
            }
          });
          
          logger.info(`📊 [RECONCILIATION] Database order counts for debugging`, {
            totalOrdersInDb: totalOrdersCount,
            ordersLast24Hours: recentOrdersCount
          });
          
          // Sample a few recent orders to understand the data format
          const sampleOrders = await OrderModel.findMany({
            take: 3,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              orderNumber: true,
              paymentReference: true,
              paymentStatus: true,
              status: true,
              createdAt: true,
              updatedAt: true
            }
          });
          
          logger.info(`🔍 [RECONCILIATION] Sample recent orders from database`, {
            sampleOrders: sampleOrders
          });
          
        } catch (debugError) {
          logger.error(`❌ [RECONCILIATION] Failed to get debug order counts`, {
            error: debugError.message
          });
        }
      }

      return orders;

    } catch (error) {
      logger.error(`❌ [RECONCILIATION] Failed to retrieve orders`, {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Process a batch of orders for reconciliation
   */
  private async processBatch(orders: any[], summary: ReconciliationSummary): Promise<void> {
    for (const order of orders) {
      try {
        logger.info(`🔍 [RECONCILIATION] Processing order:`, {
          id: order.id,
          orderNumber: order.orderNumber,
          paymentReference: order.paymentReference,
          paymentStatus: order.paymentStatus,
          status: order.status,
          total: `${order.total} ${order.currency}`,
          userId: order.userId,
          userEmail: order.user?.email,
          createdAt: order.createdAt
        });

        const discrepancy = await this.checkOrderPaymentStatus(order);
        
        if (discrepancy) {
          summary.discrepanciesFound++;
          logger.warn(`⚠️ [RECONCILIATION] Payment discrepancy found`, {
            orderId: order.id,
            orderNumber: order.orderNumber,
            discrepancy
          });

          // Attempt to correct the discrepancy
          const corrected = await this.correctPaymentDiscrepancy(order, discrepancy);
          
          if (corrected) {
            summary.successfulUpdates++;
            logger.info(`✅ [RECONCILIATION] Successfully corrected payment status`, {
              orderId: order.id,
              orderNumber: order.orderNumber,
              oldStatus: discrepancy.databaseStatus,
              newStatus: discrepancy.paystackStatus
            });
          } else {
            summary.failedUpdates++;
            summary.errors.push(`Failed to update order ${order.orderNumber}: ${discrepancy.reason}`);
          }
        } else {
          // No discrepancy found - statuses match
          summary.skipped++;
          logger.debug(`✓ [RECONCILIATION] Order status consistent`, {
            orderId: order.id,
            orderNumber: order.orderNumber,
            status: order.paymentStatus
          });
        }

      } catch (error) {
        summary.failedUpdates++;
        summary.errors.push(`Error processing order ${order.orderNumber}: ${error.message}`);
        
        logger.error(`❌ [RECONCILIATION] Failed to process order`, {
          orderId: order.id,
          orderNumber: order.orderNumber,
          error: error.message
        });
      }
    }
  }

  /**
   * Check if order payment status matches Paystack status
   */
  private async checkOrderPaymentStatus(order: any): Promise<PaymentDiscrepancy | null> {
    try {
      logger.info(`🔍 [RECONCILIATION] Verifying payment with Paystack`, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentReference: order.paymentReference,
        currentPaymentStatus: order.paymentStatus
      });

      console.log(`\n🔍 ===== PAYSTACK VERIFICATION START =====`);
      console.log(`📝 Order Details:`, {
        id: order.id,
        orderNumber: order.orderNumber,
        paymentReference: order.paymentReference,
        paymentStatus: order.paymentStatus,
        total: order.total,
        currency: order.currency,
        createdAt: order.createdAt
      });

      let verificationResult: any = null;

      // Strategy 1: If we have a paymentReference, try to verify it directly
      if (order.paymentReference) {
        try {
          console.log(`\n📞 STRATEGY 1: Direct verification with paymentReference`);
          console.log(`🔗 PaymentReference: ${order.paymentReference}`);
          
          verificationResult = await this.paymentService.verifyPayment({
            reference: order.paymentReference
          });
          
          console.log(`📊 Direct Verification Result:`, JSON.stringify(verificationResult, null, 2));
          
          logger.info(`📞 [RECONCILIATION] Direct verification with paymentReference successful`, {
            orderId: order.id,
            paymentReference: order.paymentReference,
            success: verificationResult.success
          });
        } catch (error) {
          console.log(`❌ Direct verification failed:`, error.message);
          logger.warn(`⚠️ [RECONCILIATION] Direct verification failed, trying orderNumber search`, {
            orderId: order.id,
            paymentReference: order.paymentReference,
            error: error.message
          });
        }
      } else {
        console.log(`⚠️ No paymentReference found, skipping direct verification`);
      }

      // Strategy 2: If no paymentReference OR direct verification failed, search by orderNumber in metadata
      if (!verificationResult || !verificationResult.success) {
        try {
          console.log(`\n📞 STRATEGY 2: Search by orderNumber in Paystack metadata`);
          console.log(`🔍 OrderNumber: ${order.orderNumber}`);
          
          const paystackTransaction = await this.paymentService.findTransactionByOrderNumber(order.orderNumber);
          
          console.log(`📊 OrderNumber Search Result:`, JSON.stringify(paystackTransaction, null, 2));
          
          if (paystackTransaction && paystackTransaction.data) {
            verificationResult = {
              success: true,
              message: "Transaction found by orderNumber in metadata",
              data: paystackTransaction.data
            };
            
            console.log(`✅ Found transaction in Paystack metadata:`, {
              reference: paystackTransaction.data.reference,
              status: paystackTransaction.data.status,
              amount: paystackTransaction.data.amount,
              metadata: paystackTransaction.data.metadata
            });
            
            logger.info(`📞 [RECONCILIATION] Found transaction by orderNumber in Paystack metadata`, {
              orderId: order.id,
              orderNumber: order.orderNumber,
              paystackReference: paystackTransaction.data.reference,
              paystackStatus: paystackTransaction.data.status
            });
          } else {
            console.log(`❌ No transaction found in Paystack for orderNumber: ${order.orderNumber}`);
            logger.warn(`⚠️ [RECONCILIATION] No transaction found in Paystack for orderNumber`, {
              orderId: order.id,
              orderNumber: order.orderNumber
            });
          }
        } catch (error) {
          console.log(`❌ Error searching by orderNumber:`, error.message);
          logger.error(`❌ [RECONCILIATION] Error searching by orderNumber`, {
            orderId: order.id,
            orderNumber: order.orderNumber,
            error: error.message
          });
        }
      }

      // If still no result, try direct verification with orderNumber as reference (fallback)
      if (!verificationResult || !verificationResult.success) {
        try {
          console.log(`\n📞 STRATEGY 3: Fallback verification using orderNumber as reference`);
          console.log(`🔗 Using orderNumber as reference: ${order.orderNumber}`);
          
          verificationResult = await this.paymentService.verifyPayment({
            reference: order.orderNumber
          });
          
          console.log(`📊 Fallback Verification Result:`, JSON.stringify(verificationResult, null, 2));
          
          logger.info(`📞 [RECONCILIATION] Fallback verification with orderNumber successful`, {
            orderId: order.id,
            orderNumber: order.orderNumber,
            success: verificationResult.success
          });
        } catch (error) {
          console.log(`❌ Fallback verification failed:`, error.message);
          logger.warn(`⚠️ [RECONCILIATION] All verification strategies failed`, {
            orderId: order.id,
            orderNumber: order.orderNumber,
            paymentReference: order.paymentReference,
            error: error.message
          });
        }
      }

      console.log(`\n📊 ===== FINAL VERIFICATION RESULT =====`);
      console.log(`✅ Success: ${verificationResult?.success || false}`);
      console.log(`💬 Message: ${verificationResult?.message || 'No message'}`);
      console.log(`📄 Has Data: ${!!verificationResult?.data}`);
      
      if (verificationResult?.data) {
        console.log(`\n🔍 PAYSTACK TRANSACTION DATA:`, JSON.stringify(verificationResult.data, null, 2));
      } else {
        console.log(`⚠️ NO PAYSTACK DATA AVAILABLE`);
      }
      
      logger.info(`📞 [RECONCILIATION] Paystack verification result`, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentReference: order.paymentReference,
        success: verificationResult?.success || false,
        message: verificationResult?.message || 'No result',
        hasData: !!verificationResult?.data
      });

      if (!verificationResult || !verificationResult.success) {
        // IMPORTANT: Don't mark orders as failed if we simply can't find the transaction
        // This prevents false negatives where paid orders get marked as failed
        console.log(`\n⚠️ ===== NO PAYSTACK TRANSACTION FOUND =====`);
        console.log(`📝 Keeping order status unchanged: ${order.paymentStatus}`);
        console.log(`💭 Reason: Transaction not found in Paystack - may be paid through other means or timing issue`);
        console.log(`✅ ===== PAYSTACK VERIFICATION END =====\n`);
        
        logger.info(`ℹ️ [RECONCILIATION] No Paystack transaction found, keeping order status unchanged`, {
          orderId: order.id,
          orderNumber: order.orderNumber,
          currentStatus: order.paymentStatus,
          reason: "Transaction not found in Paystack - may be paid through other means or timing issue"
        });
        
        return null; // No discrepancy to report - keep current status
      }

      const paystackTransaction = verificationResult.data;
      const paystackStatus = this.mapPaystackStatusToInternal(paystackTransaction.status);
      
      console.log(`\n🔄 ===== STATUS COMPARISON =====`);
      console.log(`🗄️ Database Status: ${order.paymentStatus}`);
      console.log(`🌐 Paystack Raw Status: ${paystackTransaction.status}`);
      console.log(`🔄 Paystack Mapped Status: ${paystackStatus}`);
      console.log(`💰 Paystack Amount: ${paystackTransaction.amount} (kobo)`);
      console.log(`💳 Order Amount: ${order.total} ${order.currency}`);
      console.log(`✅ Status Match: ${order.paymentStatus === paystackStatus}`);
      console.log(`🎯 Customer: ${paystackTransaction.customer?.email || 'N/A'}`);
      console.log(`🔗 Payment Reference: ${paystackTransaction.reference}`);
      console.log(`📅 Paid At: ${paystackTransaction.paid_at || 'N/A'}`);
      
      logger.info(`📊 [RECONCILIATION] Status comparison`, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        databaseStatus: order.paymentStatus,
        paystackRawStatus: paystackTransaction.status,
        paystackMappedStatus: paystackStatus,
        paystackAmount: paystackTransaction.amount,
        orderAmount: order.total,
        statusMatch: order.paymentStatus === paystackStatus
      });
      
      // Compare statuses
      if (order.paymentStatus !== paystackStatus) {
        console.log(`\n❗ ===== DISCREPANCY FOUND =====`);
        console.log(`🔴 Status Mismatch Detected!`);
        console.log(`🗄️ Database: ${order.paymentStatus}`);
        console.log(`🌐 Paystack: ${paystackStatus}`);
        console.log(`💰 Amount: ${order.total} ${order.currency}`);
        console.log(`✅ ===== PAYSTACK VERIFICATION END =====\n`);
        
        return {
          orderId: order.id,
          orderNumber: order.orderNumber,
          databaseStatus: order.paymentStatus,
          paystackStatus,
          amount: order.total,
          paymentReference: order.paymentReference,
          reason: `Status mismatch: DB shows ${order.paymentStatus}, Paystack shows ${paystackStatus}`
        };
      }

      console.log(`\n✅ ===== NO DISCREPANCY =====`);
      console.log(`🎉 Statuses match perfectly!`);
      console.log(`📊 Status: ${order.paymentStatus}`);
      console.log(`✅ ===== PAYSTACK VERIFICATION END =====\n`);

      logger.info(`✅ [RECONCILIATION] No discrepancy found - statuses match`, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus
      });

      return null; // No discrepancy

    } catch (error) {
      // DON'T return a discrepancy for verification errors
      // This prevents incorrectly marking paid orders as failed
      logger.error(`❌ [RECONCILIATION] Error during payment verification`, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        error: error.message
      });

      // Return null to skip this order instead of marking it as failed
      return null;
    }
  }

  /**
   * Correct payment discrepancy by updating database
   */
  private async correctPaymentDiscrepancy(order: any, discrepancy: PaymentDiscrepancy): Promise<boolean> {
    try {
      // Only correct if Paystack status is definitive
      const definitiveStatuses: PaymentStatus[] = [PaymentStatus.COMPLETED, PaymentStatus.FAILED, PaymentStatus.CANCELLED];
      if (!definitiveStatuses.includes(discrepancy.paystackStatus)) {
        logger.warn(`🚫 [RECONCILIATION] Skipping correction for ambiguous status`, {
          orderNumber: order.orderNumber,
          paystackStatus: discrepancy.paystackStatus
        });
        return false;
      }

      const newPaymentStatus = discrepancy.paystackStatus as PaymentStatus;
      const failedStatuses: PaymentStatus[] = [PaymentStatus.FAILED, PaymentStatus.CANCELLED];
      const newOrderStatus = newPaymentStatus === PaymentStatus.COMPLETED ? 'CONFIRMED' : 
                            failedStatuses.includes(newPaymentStatus) ? 'CANCELLED' : 
                            order.status;

      logger.info(`🔄 [RECONCILIATION] Updating order in database`, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        changes: {
          paymentStatus: `${order.paymentStatus} → ${newPaymentStatus}`,
          orderStatus: `${order.status} → ${newOrderStatus}`
        }
      });

      // Update order in database
      const updateResult = await OrderModel.update({
        where: { id: order.id },
        data: {
          paymentStatus: newPaymentStatus,
          status: newOrderStatus,
          updatedAt: new Date()
        }
      });

      logger.info(`✅ [RECONCILIATION] Database update completed successfully`, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        updateResult: updateResult ? 'Success' : 'No rows affected',
        newPaymentStatus: newPaymentStatus,
        newOrderStatus: newOrderStatus
      });

      // Update the paymentReference if we found it from Paystack
      if (discrepancy.paystackStatus === PaymentStatus.COMPLETED && !order.paymentReference) {
        try {
          // If we found the transaction via metadata search, update the paymentReference
          const paystackTransaction = discrepancy.reason.includes('metadata') ?
            await this.paymentService.findTransactionByOrderNumber(order.orderNumber) : null;

          if (paystackTransaction?.data?.reference) {
            await OrderModel.update({
              where: { id: order.id },
              data: {
                paymentReference: paystackTransaction.data.reference
              }
            });

            logger.info(`✅ [RECONCILIATION] Updated missing paymentReference`, {
              orderId: order.id,
              orderNumber: order.orderNumber,
              paymentReference: paystackTransaction.data.reference
            });
          }
        } catch (error) {
          logger.warn(`⚠️ [RECONCILIATION] Failed to update paymentReference`, {
            orderId: order.id,
            error: error.message
          });
        }
      }

      // CRITICAL FIX: Only send notifications if status ACTUALLY changed
      // Check if the old status was different from new status
      const statusActuallyChanged = order.paymentStatus !== newPaymentStatus;

      if (statusActuallyChanged) {
        logger.info(`🔔 [RECONCILIATION] Status changed, sending notifications`, {
          orderId: order.id,
          orderNumber: order.orderNumber,
          oldStatus: order.paymentStatus,
          newStatus: newPaymentStatus
        });

        // Send appropriate notifications for status changes
        await this.sendReconciliationNotifications(order, discrepancy, newPaymentStatus, newOrderStatus);
      } else {
        logger.info(`⏭️ [RECONCILIATION] Status unchanged, skipping notification`, {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: newPaymentStatus,
          reason: 'Already processed - preventing duplicate emails'
        });
      }

      return true;

    } catch (error) {
      logger.error(`❌ [RECONCILIATION] Failed to correct discrepancy`, {
        orderNumber: order.orderNumber,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Send notifications after successful reconciliation update
   */
  private async sendReconciliationNotifications(
    order: any, 
    discrepancy: PaymentDiscrepancy, 
    newPaymentStatus: PaymentStatus, 
    newOrderStatus: string
  ): Promise<void> {
    try {
      const userEmail = order.user?.email;
      const customerName = order.user ? 
        `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() || 'Valued Customer' : 
        'Valued Customer';

      if (!userEmail) {
        logger.warn(`⚠️ [RECONCILIATION] No email found for order, skipping notifications`, {
          orderNumber: order.orderNumber,
          userId: order.userId
        });
        return;
      }

      // Send appropriate notification based on new status
      if (newPaymentStatus === PaymentStatus.COMPLETED) {
        // Payment confirmed - send confirmation email
        const jobService = await this.getJobService();
        await jobService.addEmailJob({
          emailType: EmailJobType.PAYMENT_CONFIRMATION,
          recipients: [userEmail],
          subject: `Payment Confirmed - Order #${order.orderNumber}`,
          template: 'payment-confirmation',
          templateData: {
            orderNumber: order.orderNumber,
            amount: order.total,
            currency: order.currency,
            paymentReference: discrepancy.paymentReference,
            customerName: customerName,
            reconciliationUpdate: true,
            orderStatus: newOrderStatus
          },
          priority: JobPriority.HIGH
        });

        logger.info(`📧 [RECONCILIATION] Scheduled payment confirmation email`, {
          orderNumber: order.orderNumber,
          email: userEmail,
          customerName: customerName
        });

        // Also create database notification for user
        try {
          await this.notificationService.sendNotification({
            type: NotificationType.PAYMENT_SUCCESSFUL,
            channel: 'EMAIL' as any,
            userId: order.userId,
            recipient: {
              email: userEmail,
              name: customerName
            },
            variables: {
              orderNumber: order.orderNumber,
              amount: (order.total / 100).toLocaleString(),
              orderStatus: newOrderStatus,
              reconciliationUpdate: true
            },
            metadata: {
              orderId: order.id,
              reconciliationType: 'payment_confirmation'
            }
          });

          logger.info(`📱 [RECONCILIATION] Created database notification for user`, {
            orderNumber: order.orderNumber,
            userId: order.userId
          });
        } catch (dbNotificationError) {
          logger.warn(`⚠️ [RECONCILIATION] Failed to create database notification`, {
            orderNumber: order.orderNumber,
            userId: order.userId,
            error: dbNotificationError.message
          });
        }

      } else if (newPaymentStatus === PaymentStatus.FAILED) {
        // Payment failed - send failure notification
        const jobService = await this.getJobService();
        await jobService.addEmailJob({
          emailType: EmailJobType.MARKETING, // Using as general notification
          recipients: [userEmail],
          subject: `Payment Issue - Order #${order.orderNumber}`,
          template: 'payment-failed',
          templateData: {
            orderNumber: order.orderNumber,
            amount: order.total,
            currency: order.currency,
            customerName: customerName,
            reason: discrepancy.reason,
            supportEmail: process.env.SUPPORT_EMAIL || 'support@bareloft.com'
          },
          priority: JobPriority.HIGH
        });

        logger.info(`📧 [RECONCILIATION] Scheduled payment failure email`, {
          orderNumber: order.orderNumber,
          email: userEmail,
          reason: discrepancy.reason
        });

      } else if (newPaymentStatus === PaymentStatus.CANCELLED) {
        // Payment cancelled - send cancellation notification
        const jobService = await this.getJobService();
        await jobService.addEmailJob({
          emailType: EmailJobType.MARKETING, // Using as general notification
          recipients: [userEmail],
          subject: `Order Cancelled - Order #${order.orderNumber}`,
          template: 'order-cancelled',
          templateData: {
            orderNumber: order.orderNumber,
            amount: order.total,
            currency: order.currency,
            customerName: customerName,
            reason: 'Payment was cancelled',
            supportEmail: process.env.SUPPORT_EMAIL || 'support@bareloft.com'
          },
          priority: JobPriority.MEDIUM
        });

        logger.info(`📧 [RECONCILIATION] Scheduled order cancellation email`, {
          orderNumber: order.orderNumber,
          email: userEmail
        });
      }

      // Also send internal notification to admin for status changes
      if (process.env.ADMIN_EMAIL) {
        const jobService = await this.getJobService();
        await jobService.addEmailJob({
          emailType: EmailJobType.MARKETING, // Using as admin notification
          recipients: [process.env.ADMIN_EMAIL],
          subject: `Order Status Updated - #${order.orderNumber} (${discrepancy.databaseStatus} → ${newPaymentStatus})`,
          template: 'admin-order-update',
          templateData: {
            orderNumber: order.orderNumber,
            orderId: order.id,
            customerName: customerName,
            customerEmail: userEmail,
            oldPaymentStatus: discrepancy.databaseStatus,
            newPaymentStatus: newPaymentStatus,
            oldOrderStatus: order.status,
            newOrderStatus: newOrderStatus,
            amount: order.total,
            currency: order.currency,
            updateReason: discrepancy.reason,
            updatedAt: new Date().toISOString()
          },
          priority: JobPriority.LOW
        });

        logger.info(`📧 [RECONCILIATION] Scheduled admin notification email`, {
          orderNumber: order.orderNumber,
          statusChange: `${discrepancy.databaseStatus} → ${newPaymentStatus}`
        });
      }

    } catch (error) {
      logger.error(`❌ [RECONCILIATION] Failed to send notifications`, {
        orderNumber: order.orderNumber,
        error: error.message
      });
    }
  }

  /**
   * Send admin notification with reconciliation summary
   */
  private async sendAdminNotification(
    data: PaymentReconciliationJobData, 
    summary: ReconciliationSummary
  ): Promise<void> {
    try {
      const jobService = await this.getJobService();
      await jobService.addEmailJob({
        emailType: EmailJobType.MARKETING, // Using as admin notification
        recipients: [process.env.ADMIN_EMAIL || 'admin@bareloft.com'],
        subject: `Payment Reconciliation Report - ${summary.discrepanciesFound} Discrepancies Found`,
        template: 'admin-reconciliation-report',
        templateData: {
          reconciliationType: data.reconciliationType,
          timeRangeHours: data.timeRangeHours,
          summary,
          timestamp: new Date().toISOString(),
          errors: summary.errors.slice(0, 10) // Limit to first 10 errors
        },
        priority: JobPriority.HIGH
      });

      logger.info(`📧 [RECONCILIATION] Scheduled admin notification`, {
        discrepancies: summary.discrepanciesFound,
        successfulUpdates: summary.successfulUpdates
      });

    } catch (error) {
      logger.error(`❌ [RECONCILIATION] Failed to send admin notification`, {
        error: error.message
      });
    }
  }

  /**
   * Map Paystack status to internal payment status
   */
  private mapPaystackStatusToInternal(paystackStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'success': PaymentStatus.COMPLETED,
      'failed': PaymentStatus.FAILED,
      'cancelled': PaymentStatus.CANCELLED,
      'abandoned': PaymentStatus.CANCELLED, // Map abandoned to cancelled
      'pending': PaymentStatus.PENDING,
      'processing': PaymentStatus.PROCESSING
    };

    return statusMap[paystackStatus.toLowerCase()] || PaymentStatus.PENDING;
  }

  /**
   * Utility function to split array into chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Utility function for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}