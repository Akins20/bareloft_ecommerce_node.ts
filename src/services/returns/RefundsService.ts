import { BaseService } from '../BaseService';
import { RefundRepository } from '../../repositories/RefundRepository';
import { ReturnRepository } from '../../repositories/ReturnRepository';
import { OrderRepository } from '../../repositories/OrderRepository';
import { PaystackService } from '../payments/PaystackService';
import { NotificationService } from '../notifications/NotificationService';
import {
  Refund,
  RefundStatus,
  RefundMethod,
  ProcessRefundRequest,
  BulkRefundRequest,
  RefundListQuery,
  RefundResponse,
  RefundListResponse,
  BulkRefundResponse,
  RefundAnalytics,
  NigerianBankAccount,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
} from '../../types';
import { NIGERIAN_BANK_CODES } from '../../models/ReturnRequest';
import { redisClient } from '../../config/redis';

export class RefundsService extends BaseService {
  private refundRepository: RefundRepository;
  private returnRepository: ReturnRepository;
  private orderRepository: OrderRepository;
  private paystackService: PaystackService;
  private notificationService: NotificationService;

  // Nigerian banking integration settings
  private readonly MAX_REFUND_AMOUNT = 1000000; // ₦1M in kobo
  private readonly BANK_TRANSFER_FEE = 5000; // ₦50 in kobo
  private readonly WALLET_CREDIT_BONUS = 0.02; // 2% bonus for wallet credits

  constructor(
    refundRepository?: RefundRepository,
    returnRepository?: ReturnRepository,
    orderRepository?: OrderRepository,
    paystackService?: PaystackService,
    notificationService?: NotificationService
  ) {
    super();
    this.refundRepository = refundRepository || new RefundRepository();
    this.returnRepository = returnRepository || new ReturnRepository();
    this.orderRepository = orderRepository || new OrderRepository();
    this.paystackService = paystackService || {} as PaystackService;
    this.notificationService = notificationService || {} as NotificationService;
  }

  /**
   * Process a refund request
   */
  async processRefund(
    request: ProcessRefundRequest,
    adminId: string
  ): Promise<RefundResponse> {
    try {
      // Validate refund request
      await this.validateRefundRequest(request);

      // Get order details
      const order = await this.orderRepository.findById?.(request.orderId);
      if (!order) {
        throw new AppError(
          'Order not found',
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Check if total refunded amount would exceed order total
      const existingRefunds = await this.refundRepository.findByOrderId(request.orderId);
      const totalRefunded = existingRefunds
        .filter((r) => r.status === RefundStatus.COMPLETED)
        .reduce((sum, r) => sum + r.amount, 0);

      const requestedAmountKobo = request.amount * 100; // Convert to kobo

      if (totalRefunded + requestedAmountKobo > order.total * 100) {
        throw new AppError(
          'Refund amount would exceed order total',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Generate refund number
      const refundNumber = await this.generateRefundNumber();

      // Create refund record
      const refund = await this.refundRepository.createRefund({
        refundNumber,
        returnRequestId: request.returnRequestId,
        orderId: request.orderId,
        customerId: order.userId,
        refundMethod: request.refundMethod,
        amount: requestedAmountKobo,
        reason: request.reason,
        description: request.description,
        bankAccountDetails: request.bankAccountDetails,
        adminNotes: request.adminNotes,
        processedBy: adminId,
      });

      // Process refund based on method
      const processedRefund = await this.executeRefund(refund);

      // Update order status if fully refunded
      const newTotalRefunded = totalRefunded + requestedAmountKobo;
      if (newTotalRefunded >= order.total * 100) {
        await this.orderRepository.update?.(order.id, {
          status: 'REFUNDED',
          paymentStatus: 'REFUNDED',
        });
      }

      // Add timeline event if associated with return request
      if (request.returnRequestId) {
        await this.returnRepository.addTimelineEvent(request.returnRequestId, {
          type: 'REFUND_PROCESSED',
          title: 'Refund Processed',
          description: `Refund of ₦${request.amount.toLocaleString()} has been processed`,
          data: {
            refundId: processedRefund.id,
            refundNumber: processedRefund.refundNumber,
            refundMethod: request.refundMethod,
            amount: request.amount,
          },
          createdBy: adminId,
          createdByName: 'Admin',
        });
      }

      // Send notification to customer
      if (request.notifyCustomer !== false) {
        await this.sendRefundNotification(processedRefund, 'refund_processed');
      }

      const estimatedCompletion = this.getEstimatedCompletionTime(request.refundMethod);

      return {
        success: true,
        message: 'Refund processed successfully',
        refund: processedRefund,
        estimatedCompletionTime: estimatedCompletion,
      };
    } catch (error) {
      this.handleError('Error processing refund', error);
      throw error;
    }
  }

  /**
   * Process multiple refunds in bulk
   */
  async processBulkRefunds(
    request: BulkRefundRequest,
    adminId: string
  ): Promise<BulkRefundResponse> {
    try {
      const processedRefunds: Refund[] = [];
      const failedRefunds: Array<{
        returnRequestId?: string;
        orderId: string;
        error: string;
      }> = [];

      let totalAmount = 0;
      const batchSize = request.batchSize || 10;

      // Process refunds in batches if requested
      if (request.processInBatches) {
        for (let i = 0; i < request.refundRequests.length; i += batchSize) {
          const batch = request.refundRequests.slice(i, i + batchSize);
          
          for (const refundRequest of batch) {
            try {
              const processedRefund = await this.processRefund(
                {
                  ...refundRequest,
                  adminNotes: request.adminNotes,
                  notifyCustomer: request.notifyCustomers,
                },
                adminId
              );
              
              processedRefunds.push(processedRefund.refund);
              totalAmount += refundRequest.amount;
              
              // Add small delay between refunds to avoid rate limits
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
              failedRefunds.push({
                returnRequestId: refundRequest.returnRequestId,
                orderId: refundRequest.orderId,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }
          
          // Longer delay between batches
          if (i + batchSize < request.refundRequests.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } else {
        // Process all refunds simultaneously
        const results = await Promise.allSettled(
          request.refundRequests.map(async (refundRequest) => {
            const processedRefund = await this.processRefund(
              {
                ...refundRequest,
                adminNotes: request.adminNotes,
                notifyCustomer: request.notifyCustomers,
              },
              adminId
            );
            return processedRefund.refund;
          })
        );

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            processedRefunds.push(result.value);
            totalAmount += request.refundRequests[index].amount;
          } else {
            failedRefunds.push({
              returnRequestId: request.refundRequests[index].returnRequestId,
              orderId: request.refundRequests[index].orderId,
              error: result.reason?.message || 'Unknown error',
            });
          }
        });
      }

      // Create bulk job record for tracking
      const jobId = await this.createBulkRefundJob({
        totalRequests: request.refundRequests.length,
        processedRefunds: processedRefunds.length,
        failedRefunds: failedRefunds.length,
        totalAmount,
        adminId,
      });

      return {
        success: true,
        message: `Bulk refund processing completed. ${processedRefunds.length} successful, ${failedRefunds.length} failed.`,
        jobId,
        processedRefunds,
        failedRefunds,
        summary: {
          total: request.refundRequests.length,
          successful: processedRefunds.length,
          failed: failedRefunds.length,
          totalAmount,
        },
      };
    } catch (error) {
      this.handleError('Error processing bulk refunds', error);
      throw error;
    }
  }

  /**
   * Get refund details
   */
  async getRefund(refundId: string): Promise<Refund> {
    try {
      const refund = await this.refundRepository.findById(refundId);

      if (!refund) {
        throw new AppError(
          'Refund not found',
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      return refund;
    } catch (error) {
      this.handleError('Error fetching refund', error);
      throw error;
    }
  }

  /**
   * Get refunds with filtering and pagination
   */
  async getRefunds(query: RefundListQuery): Promise<RefundListResponse> {
    try {
      const filters = {
        status: query.status,
        refundMethod: query.refundMethod,
        customerId: query.customerId,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        search: query.search,
        minAmount: query.minAmount,
        maxAmount: query.maxAmount,
      };

      const options = {
        page: query.page || 1,
        limit: query.limit || 20,
        sortBy: query.sortBy || 'createdAt',
        sortOrder: query.sortOrder || 'desc' as 'desc',
      };

      const result = await this.refundRepository.findMany(filters, options);

      // Calculate summary statistics
      const summary = {
        totalRefunds: result.pagination.totalItems,
        pendingRefunds: result.data.filter((r) => r.status === RefundStatus.PENDING).length,
        completedRefunds: result.data.filter((r) => r.status === RefundStatus.COMPLETED).length,
        totalRefundAmount: result.data.reduce((sum, r) => sum + r.amount, 0) / 100, // Convert from kobo
      };

      return {
        success: true,
        message: 'Refunds retrieved successfully',
        refunds: result.data,
        pagination: result.pagination,
        summary,
      };
    } catch (error) {
      this.handleError('Error fetching refunds', error);
      throw error;
    }
  }

  /**
   * Get pending refunds for processing
   */
  async getPendingRefunds(limit?: number): Promise<Refund[]> {
    try {
      return await this.refundRepository.findPendingRefunds(limit);
    } catch (error) {
      this.handleError('Error fetching pending refunds', error);
      throw error;
    }
  }

  /**
   * Get refund analytics
   */
  async getRefundAnalytics(
    filters: {
      startDate?: string;
      endDate?: string;
      customerId?: string;
    }
  ): Promise<RefundAnalytics> {
    try {
      const analyticsFilters = {
        startDate: filters.startDate ? new Date(filters.startDate) : undefined,
        endDate: filters.endDate ? new Date(filters.endDate) : undefined,
        customerId: filters.customerId,
      };

      const analytics = await this.refundRepository.getRefundAnalytics(analyticsFilters);

      // Calculate refund rate (would need total orders in production)
      const refundRate = 3.8; // Mock value

      return {
        totalRefunds: analytics.totalRefunds,
        totalRefundAmount: analytics.totalRefundAmount,
        averageRefundAmount: analytics.averageRefundAmount,
        refundRate,
        refundsByStatus: analytics.refundsByStatus.map((item) => ({
          status: item.status as RefundStatus,
          count: item.count,
          percentage: analytics.totalRefunds > 0 ? (item.count / analytics.totalRefunds) * 100 : 0,
          totalAmount: item.totalAmount,
        })),
        refundsByMethod: analytics.refundsByMethod.map((item) => ({
          method: item.method as RefundMethod,
          count: item.count,
          percentage: analytics.totalRefunds > 0 ? (item.count / analytics.totalRefunds) * 100 : 0,
          totalAmount: item.totalAmount,
          averageProcessingTime: this.getAverageProcessingTime(item.method as RefundMethod),
        })),
        refundsByReason: [], // Would be populated from actual data
        processingTimeMetrics: {
          averageProcessingTime: analytics.averageProcessingTime,
          medianProcessingTime: analytics.averageProcessingTime * 0.8, // Mock
          successRate: analytics.successRate,
        },
        financialMetrics: {
          totalRefunded: analytics.totalRefundAmount,
          refundGrowthRate: 12.5, // Mock value
          refundToRevenueRatio: 2.1, // Mock value
        },
        geographicalBreakdown: [], // Would be populated from actual data
      };
    } catch (error) {
      this.handleError('Error fetching refund analytics', error);
      throw error;
    }
  }

  /**
   * Validate Nigerian bank account details
   */
  async validateBankAccount(accountDetails: {
    accountNumber: string;
    bankCode: string;
  }): Promise<{
    isValid: boolean;
    accountName?: string;
    error?: string;
  }> {
    try {
      // Validate bank code
      if (!NIGERIAN_BANK_CODES[accountDetails.bankCode]) {
        return {
          isValid: false,
          error: 'Invalid bank code',
        };
      }

      // Validate account number format (10 digits for most Nigerian banks)
      if (!/^\d{10}$/.test(accountDetails.accountNumber)) {
        return {
          isValid: false,
          error: 'Account number must be 10 digits',
        };
      }

      // In production, this would call bank verification API (e.g., Paystack's account resolution)
      // For now, return mock validation
      return {
        isValid: true,
        accountName: 'Mock Account Name',
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Bank account validation failed',
      };
    }
  }

  /**
   * Approve pending refund
   */
  async approveRefund(refundId: string, adminId: string, approvalNotes?: string): Promise<RefundResponse> {
    try {
      const refund = await this.getRefund(refundId);

      if (refund.status !== RefundStatus.PENDING) {
        throw new AppError(
          'Only pending refunds can be approved',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const updatedRefund = await this.refundRepository.updateRefund(refundId, {
        status: RefundStatus.APPROVED,
        approvedBy: adminId,
        adminNotes: approvalNotes,
        processedAt: new Date(),
      });

      // Send notification
      await this.sendRefundNotification(updatedRefund, 'refund_approved');

      return {
        success: true,
        message: 'Refund approved successfully',
        refund: updatedRefund,
      };
    } catch (error) {
      this.handleError('Error approving refund', error);
      throw error;
    }
  }

  // Private helper methods

  private async executeRefund(refund: Refund): Promise<Refund> {
    try {
      switch (refund.refundMethod) {
        case RefundMethod.ORIGINAL_PAYMENT:
          return await this.processOriginalPaymentRefund(refund);
        
        case RefundMethod.BANK_TRANSFER:
          return await this.processBankTransferRefund(refund);
        
        case RefundMethod.WALLET_CREDIT:
          return await this.processWalletCreditRefund(refund);
        
        case RefundMethod.STORE_CREDIT:
          return await this.processStoreCreditRefund(refund);
        
        default:
          throw new AppError(
            'Unsupported refund method',
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR
          );
      }
    } catch (error) {
      // Mark refund as failed
      await this.refundRepository.updateRefund(refund.id, {
        status: RefundStatus.FAILED,
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async processOriginalPaymentRefund(refund: Refund): Promise<Refund> {
    // In production, this would call Paystack's refund API
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update refund with provider details
      const updatedRefund = await this.refundRepository.updateRefund(refund.id, {
        status: RefundStatus.PROCESSING,
        providerRefundId: `pstk_refund_${Date.now()}`,
        providerReference: `ref_${Date.now()}`,
        processedAt: new Date(),
      });

      // Simulate completion after delay (in production, this would be handled by webhooks)
      setTimeout(async () => {
        await this.refundRepository.updateRefund(refund.id, {
          status: RefundStatus.COMPLETED,
          completedAt: new Date(),
        });
      }, 5000);

      return updatedRefund;
    } catch (error) {
      throw new AppError(
        'Original payment refund failed',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.EXTERNAL_SERVICE_ERROR
      );
    }
  }

  private async processBankTransferRefund(refund: Refund): Promise<Refund> {
    try {
      if (!refund.bankAccountDetails) {
        throw new AppError(
          'Bank account details required for bank transfer refund',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Validate bank account
      const validation = await this.validateBankAccount({
        accountNumber: refund.bankAccountDetails.accountNumber,
        bankCode: refund.bankAccountDetails.bankCode,
      });

      if (!validation.isValid) {
        throw new AppError(
          validation.error || 'Invalid bank account details',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Deduct transfer fee from refund amount
      const transferAmount = refund.amount - this.BANK_TRANSFER_FEE;
      
      if (transferAmount <= 0) {
        throw new AppError(
          'Refund amount too small for bank transfer (minimum after fees: ₦50)',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // In production, create transfer recipient and initiate transfer
      await new Promise(resolve => setTimeout(resolve, 2000));

      return await this.refundRepository.updateRefund(refund.id, {
        status: RefundStatus.PROCESSING,
        processedAt: new Date(),
      });
    } catch (error) {
      throw new AppError(
        'Bank transfer refund failed',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.EXTERNAL_SERVICE_ERROR
      );
    }
  }

  private async processWalletCreditRefund(refund: Refund): Promise<Refund> {
    try {
      // Add bonus for wallet credits
      const bonusAmount = Math.floor(refund.amount * this.WALLET_CREDIT_BONUS);
      const totalCreditAmount = refund.amount + bonusAmount;

      // In production, credit user's wallet
      await new Promise(resolve => setTimeout(resolve, 500));

      return await this.refundRepository.updateRefund(refund.id, {
        status: RefundStatus.COMPLETED,
        processedAt: new Date(),
        completedAt: new Date(),
        metadata: {
          originalAmount: refund.amount,
          bonusAmount,
          totalCreditAmount,
        },
      });
    } catch (error) {
      throw new AppError(
        'Wallet credit refund failed',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.EXTERNAL_SERVICE_ERROR
      );
    }
  }

  private async processStoreCreditRefund(refund: Refund): Promise<Refund> {
    try {
      // In production, create store credit voucher
      await new Promise(resolve => setTimeout(resolve, 500));

      const voucherCode = `SC${Date.now()}`;

      return await this.refundRepository.updateRefund(refund.id, {
        status: RefundStatus.COMPLETED,
        processedAt: new Date(),
        completedAt: new Date(),
        metadata: {
          voucherCode,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
      });
    } catch (error) {
      throw new AppError(
        'Store credit refund failed',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.EXTERNAL_SERVICE_ERROR
      );
    }
  }

  private async validateRefundRequest(request: ProcessRefundRequest): Promise<void> {
    if (request.amount <= 0) {
      throw new AppError(
        'Refund amount must be greater than zero',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (request.amount * 100 > this.MAX_REFUND_AMOUNT) {
      throw new AppError(
        `Refund amount exceeds maximum limit of ₦${this.MAX_REFUND_AMOUNT / 100}`,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (request.refundMethod === RefundMethod.BANK_TRANSFER && !request.bankAccountDetails) {
      throw new AppError(
        'Bank account details required for bank transfer refunds',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }
  }

  private async generateRefundNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');

    const dateKey = `${year}${month}${day}`;
    const sequenceKey = `refund_sequence:${dateKey}`;

    let sequence = 1;
    try {
      sequence = await redisClient.increment(sequenceKey, 1);
      await redisClient.expire(sequenceKey, 24 * 60 * 60);
    } catch (error) {
      sequence = Math.floor(Math.random() * 999) + 1;
    }

    return `REF${year}${month}${day}${sequence.toString().padStart(3, '0')}`;
  }

  private getEstimatedCompletionTime(refundMethod: RefundMethod): string {
    switch (refundMethod) {
      case RefundMethod.ORIGINAL_PAYMENT:
        return '3-5 business days';
      case RefundMethod.BANK_TRANSFER:
        return '1-2 business days';
      case RefundMethod.WALLET_CREDIT:
        return 'Immediate';
      case RefundMethod.STORE_CREDIT:
        return 'Immediate';
      default:
        return '3-5 business days';
    }
  }

  private getAverageProcessingTime(refundMethod: RefundMethod): number {
    switch (refundMethod) {
      case RefundMethod.ORIGINAL_PAYMENT:
        return 4.2; // days
      case RefundMethod.BANK_TRANSFER:
        return 1.5; // days
      case RefundMethod.WALLET_CREDIT:
        return 0.1; // days
      case RefundMethod.STORE_CREDIT:
        return 0.1; // days
      default:
        return 3.0; // days
    }
  }

  private async createBulkRefundJob(data: {
    totalRequests: number;
    processedRefunds: number;
    failedRefunds: number;
    totalAmount: number;
    adminId: string;
  }): Promise<string> {
    const jobId = `bulk_refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // In production, store in database
    const jobData = {
      id: jobId,
      type: 'BULK_REFUND',
      ...data,
      createdAt: new Date(),
    };

    // Store in Redis for now
    try {
      await redisClient.set(`bulk_job:${jobId}`, jobData, 7 * 24 * 60 * 60); // 7 days
    } catch (error) {
      console.error('Failed to create bulk job record:', error);
    }

    return jobId;
  }

  private async sendRefundNotification(
    refund: Refund,
    type: 'refund_processed' | 'refund_approved' | 'refund_completed' | 'refund_failed'
  ): Promise<void> {
    // In production, send actual notifications
    console.log(`Sending ${type} notification for refund ${refund.refundNumber}`);
  }

  /**
   * Handle service errors
   */
  protected handleError(message: string, error: any): never {
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