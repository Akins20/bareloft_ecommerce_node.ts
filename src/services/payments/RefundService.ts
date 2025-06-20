import { BaseService } from "../BaseService";
import { PaymentTransactionModel, OrderModel } from "../../models";
import {
  RefundRequest,
  Refund,
  RefundStatus,
  RefundResponse,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
  PaginationMeta,
} from "../../types";
import { PaystackService } from "./PaystackService";
import { NotificationService } from "../notifications/NotificationService";

interface RefundRecord {
  id: string;
  transactionId: string;
  orderId: string;
  status: RefundStatus;
  amount: number;
  currency: string;
  reason: string;
  providerRefundId?: string;
  providerReference?: string;
  processedAt?: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class RefundService extends BaseService {
  private paystackService: PaystackService;
  private notificationService: NotificationService;
  private refunds: Map<string, RefundRecord> = new Map(); // In-memory store for demo

  constructor(
    paystackService: PaystackService,
    notificationService: NotificationService
  ) {
    super();
    this.paystackService = paystackService;
    this.notificationService = notificationService;
  }

  /**
   * Process a refund request
   */
  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    try {
      // Get transaction details
      const transaction = await PaymentTransactionModel.findUnique({
        where: { id: request.transactionId },
        include: {
          order: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
      });

      if (!transaction) {
        throw new AppError(
          "Transaction not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      if (transaction.status !== "success") {
        throw new AppError(
          "Only successful transactions can be refunded",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Validate refund amount
      const refundAmount = request.amount || transaction.amountPaid;
      if (refundAmount > transaction.amountPaid) {
        throw new AppError(
          "Refund amount cannot exceed paid amount",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Check if already refunded
      const existingRefunds = this.getRefundsByTransaction(
        request.transactionId
      );
      const totalRefunded = existingRefunds
        .filter((r) => r.status === "COMPLETED")
        .reduce((sum, r) => sum + r.amount, 0);

      if (totalRefunded + refundAmount > transaction.amountPaid) {
        throw new AppError(
          "Total refund amount would exceed paid amount",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Create refund record
      const refund = this.createRefundRecord({
        transactionId: request.transactionId,
        orderId: transaction.orderId,
        amount: refundAmount,
        reason: request.reason,
        metadata: request.metadata,
        createdBy: "system", // In production, this would be the admin user ID
      });

      // Process refund based on payment method
      await this.processRefundByMethod(refund, transaction);

      // Update order status if full refund
      if (refundAmount === transaction.amountPaid) {
        await OrderModel.update({
          where: { id: transaction.orderId },
          data: {
            status: "REFUNDED",
            paymentStatus: "REFUNDED",
            updatedAt: new Date(),
          },
        });
      }

      // Send refund notification
      await this.sendRefundNotification(refund, transaction);

      return {
        success: true,
        message: "Refund processed successfully",
        refund: this.transformRefund(refund),
      };
    } catch (error) {
      this.handleError("Error processing refund", error);
      throw error;
    }
  }

  /**
   * Get refund status
   */
  async getRefundStatus(refundId: string): Promise<Refund> {
    try {
      const refund = this.refunds.get(refundId);

      if (!refund) {
        throw new AppError(
          "Refund not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      return this.transformRefund(refund);
    } catch (error) {
      this.handleError("Error fetching refund status", error);
      throw error;
    }
  }

  /**
   * Get refunds for a transaction
   */
  async getTransactionRefunds(transactionId: string): Promise<Refund[]> {
    try {
      const refunds = this.getRefundsByTransaction(transactionId);
      return refunds.map(this.transformRefund);
    } catch (error) {
      this.handleError("Error fetching transaction refunds", error);
      throw error;
    }
  }

  /**
   * Get refunds for an order
   */
  async getOrderRefunds(orderId: string): Promise<Refund[]> {
    try {
      const refunds = Array.from(this.refunds.values()).filter(
        (r) => r.orderId === orderId
      );
      return refunds.map(this.transformRefund);
    } catch (error) {
      this.handleError("Error fetching order refunds", error);
      throw error;
    }
  }

  /**
   * Get all refunds with pagination
   */
  async getAllRefunds(
    page: number = 1,
    limit: number = 20,
    status?: RefundStatus
  ): Promise<{
    refunds: Refund[];
    pagination: PaginationMeta;
  }> {
    try {
      let allRefunds = Array.from(this.refunds.values());

      if (status) {
        allRefunds = allRefunds.filter((r) => r.status === status);
      }

      // Sort by creation date (newest first)
      allRefunds.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const total = allRefunds.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedRefunds = allRefunds.slice(startIndex, endIndex);

      const pagination = this.createPagination(page, limit, total);

      return {
        refunds: paginatedRefunds.map(this.transformRefund),
        pagination,
      };
    } catch (error) {
      this.handleError("Error fetching refunds", error);
      throw error;
    }
  }

  /**
   * Cancel a pending refund
   */
  async cancelRefund(refundId: string, reason: string): Promise<Refund> {
    try {
      const refund = this.refunds.get(refundId);

      if (!refund) {
        throw new AppError(
          "Refund not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      if (refund.status !== "PENDING") {
        throw new AppError(
          "Only pending refunds can be cancelled",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Update refund status
      refund.status = "CANCELLED";
      refund.failureReason = reason;
      refund.updatedAt = new Date();

      this.refunds.set(refundId, refund);

      return this.transformRefund(refund);
    } catch (error) {
      this.handleError("Error cancelling refund", error);
      throw error;
    }
  }

  /**
   * Get refund analytics
   */
  async getRefundAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalRefunds: number;
    totalRefundAmount: number;
    completedRefunds: number;
    pendingRefunds: number;
    failedRefunds: number;
    refundsByReason: Array<{
      reason: string;
      count: number;
      totalAmount: number;
    }>;
    averageRefundAmount: number;
    refundRate: number; // Percentage of transactions refunded
  }> {
    try {
      let refunds = Array.from(this.refunds.values());

      // Apply date filter
      if (startDate || endDate) {
        refunds = refunds.filter((refund) => {
          const refundDate = refund.createdAt;
          if (startDate && refundDate < startDate) return false;
          if (endDate && refundDate > endDate) return false;
          return true;
        });
      }

      const totalRefunds = refunds.length;
      const totalRefundAmount = refunds
        .filter((r) => r.status === "COMPLETED")
        .reduce((sum, r) => sum + r.amount, 0);

      const completedRefunds = refunds.filter(
        (r) => r.status === "COMPLETED"
      ).length;
      const pendingRefunds = refunds.filter(
        (r) => r.status === "PENDING"
      ).length;
      const failedRefunds = refunds.filter((r) => r.status === "FAILED").length;

      // Group by reason
      const reasonMap = new Map<
        string,
        { count: number; totalAmount: number }
      >();
      refunds.forEach((refund) => {
        const existing = reasonMap.get(refund.reason) || {
          count: 0,
          totalAmount: 0,
        };
        existing.count++;
        if (refund.status === "COMPLETED") {
          existing.totalAmount += refund.amount;
        }
        reasonMap.set(refund.reason, existing);
      });

      const refundsByReason = Array.from(reasonMap.entries()).map(
        ([reason, data]) => ({
          reason,
          count: data.count,
          totalAmount: data.totalAmount,
        })
      );

      const averageRefundAmount =
        completedRefunds > 0 ? totalRefundAmount / completedRefunds : 0;

      // Calculate refund rate (simplified - would need transaction count in production)
      const refundRate =
        totalRefunds > 0 ? (completedRefunds / totalRefunds) * 100 : 0;

      return {
        totalRefunds,
        totalRefundAmount: totalRefundAmount / 100, // Convert from kobo to naira
        completedRefunds,
        pendingRefunds,
        failedRefunds,
        refundsByReason: refundsByReason.map((r) => ({
          ...r,
          totalAmount: r.totalAmount / 100, // Convert from kobo to naira
        })),
        averageRefundAmount: averageRefundAmount / 100, // Convert from kobo to naira
        refundRate: Math.round(refundRate * 100) / 100,
      };
    } catch (error) {
      this.handleError("Error fetching refund analytics", error);
      throw error;
    }
  }

  // Private helper methods

  private createRefundRecord(data: {
    transactionId: string;
    orderId: string;
    amount: number;
    reason: string;
    metadata?: Record<string, any>;
    createdBy: string;
  }): RefundRecord {
    const refund: RefundRecord = {
      id: this.generateId(),
      transactionId: data.transactionId,
      orderId: data.orderId,
      status: "PENDING",
      amount: data.amount,
      currency: "NGN",
      reason: data.reason,
      metadata: data.metadata,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.refunds.set(refund.id, refund);
    return refund;
  }

  private async processRefundByMethod(
    refund: RefundRecord,
    transaction: any
  ): Promise<void> {
    try {
      // For card payments, we can use Paystack's refund API
      if (transaction.channel === "card") {
        await this.processCardRefund(refund, transaction);
      } else {
        // For bank transfers, USSD, etc., we need to initiate a transfer
        await this.processBankRefund(refund, transaction);
      }
    } catch (error) {
      // Mark refund as failed
      refund.status = "FAILED";
      refund.failureReason =
        error instanceof Error ? error.message : "Unknown error";
      refund.updatedAt = new Date();
      this.refunds.set(refund.id, refund);
      throw error;
    }
  }

  private async processCardRefund(
    refund: RefundRecord,
    transaction: any
  ): Promise<void> {
    // In production, this would call Paystack's refund API
    // For now, we'll simulate the process

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate successful refund
      refund.status = "COMPLETED";
      refund.processedAt = new Date();
      refund.providerRefundId = `pstk_refund_${Date.now()}`;
      refund.providerReference = `ref_${Date.now()}`;
      refund.updatedAt = new Date();

      this.refunds.set(refund.id, refund);
    } catch (error) {
      throw new AppError(
        "Card refund processing failed",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.EXTERNAL_SERVICE_ERROR
      );
    }
  }

  private async processBankRefund(
    refund: RefundRecord,
    transaction: any
  ): Promise<void> {
    try {
      // For bank refunds, we would need bank account details
      // This would typically involve creating a transfer recipient and initiating transfer

      // Simulate the process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      refund.status = "PROCESSING"; // Bank transfers take longer
      refund.updatedAt = new Date();
      this.refunds.set(refund.id, refund);

      // Simulate completion after some time
      setTimeout(() => {
        refund.status = "COMPLETED";
        refund.processedAt = new Date();
        refund.updatedAt = new Date();
        this.refunds.set(refund.id, refund);
      }, 5000);
    } catch (error) {
      throw new AppError(
        "Bank refund processing failed",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.EXTERNAL_SERVICE_ERROR
      );
    }
  }

  private async sendRefundNotification(
    refund: RefundRecord,
    transaction: any
  ): Promise<void> {
    const order = transaction.order;
    const user = order.user;

    if (user.email) {
      await this.notificationService.sendNotification({
        type: "REFUND_PROCESSED",
        channel: "EMAIL",
        userId: order.userId,
        recipient: {
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
        },
        variables: {
          orderNumber: order.orderNumber,
          refundAmount: (refund.amount / 100).toLocaleString(),
          refundReason: refund.reason,
          customerName: user.firstName,
          processingTime: "3-5 business days",
        },
      });
    }
  }

  private getRefundsByTransaction(transactionId: string): RefundRecord[] {
    return Array.from(this.refunds.values()).filter(
      (r) => r.transactionId === transactionId
    );
  }

  private transformRefund(refund: RefundRecord): Refund {
    return {
      id: refund.id,
      transactionId: refund.transactionId,
      orderId: refund.orderId,
      status: refund.status,
      amount: refund.amount,
      currency: refund.currency,
      reason: refund.reason,
      providerRefundId: refund.providerRefundId,
      providerReference: refund.providerReference,
      processedAt: refund.processedAt,
      failureReason: refund.failureReason,
      metadata: refund.metadata,
      createdBy: refund.createdBy,
      createdAt: refund.createdAt,
      updatedAt: refund.updatedAt,
    };
  }

  private generateId(): string {
    return `refund_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}
