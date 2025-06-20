import { BaseService } from "../BaseService";
import { PaymentTransactionModel, OrderModel } from "../../models";
import {
  PaymentTransaction,
  PaymentStatus,
  PaymentChannel,
  InitializePaymentRequest,
  InitializePaymentResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
} from "../../types";
import { PaystackService } from "./PaystackService";
import { NotificationService } from "../notifications/NotificationService";

interface PaymentSummary {
  totalTransactions: number;
  totalVolume: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;
  averageAmount: number;
}

export class PaymentService extends BaseService {
  private paystackService: PaystackService;
  private notificationService: NotificationService;

  constructor(
    paystackService: PaystackService,
    notificationService: NotificationService
  ) {
    super();
    this.paystackService = paystackService;
    this.notificationService = notificationService;
  }

  /**
   * Initialize payment for an order
   */
  async initializePayment(
    request: InitializePaymentRequest
  ): Promise<InitializePaymentResponse> {
    try {
      // Get order details
      const order = await OrderModel.findUnique({
        where: { id: request.orderId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              phoneNumber: true,
              email: true,
            },
          },
        },
      });

      if (!order) {
        throw new AppError(
          "Order not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      if (order.paymentStatus === "PAID") {
        throw new AppError(
          "Order has already been paid",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Generate payment reference
      const reference = this.generatePaymentReference(order.orderNumber);

      // Create payment transaction record
      const transaction = await PaymentTransactionModel.create({
        data: {
          orderId: request.orderId,
          userId: order.userId,
          provider: "paystack",
          channel: request.channels?.[0] || "card",
          status: "pending",
          amount: Math.round(request.amount * 100), // Convert to kobo
          amountPaid: 0,
          fees: 0,
          currency: request.currency,
          reference,
          providerReference: reference,
          customer: {
            firstName: order.user.firstName,
            lastName: order.user.lastName,
            email: request.email,
            phoneNumber: order.user.phoneNumber,
          },
          metadata: request.metadata || {},
        },
      });

      // Initialize payment with Paystack
      const paystackResponse = await this.paystackService.initializePayment({
        email: request.email,
        amount: Math.round(request.amount * 100), // Convert to kobo
        reference,
        currency: request.currency,
        channels: request.channels,
        callback_url: request.callbackUrl,
        metadata: {
          orderId: request.orderId,
          orderNumber: order.orderNumber,
          ...request.metadata,
        },
      });

      // Update transaction with Paystack response
      await PaymentTransactionModel.update({
        where: { id: transaction.id },
        data: {
          providerReference: paystackResponse.data.reference,
        },
      });

      return {
        success: true,
        message: "Payment initialized successfully",
        data: {
          authorizationUrl: paystackResponse.data.authorization_url,
          accessCode: paystackResponse.data.access_code,
          reference: paystackResponse.data.reference,
        },
      };
    } catch (error) {
      this.handleError("Error initializing payment", error);
      throw error;
    }
  }

  /**
   * Verify payment transaction
   */
  async verifyPayment(
    request: VerifyPaymentRequest
  ): Promise<VerifyPaymentResponse> {
    try {
      // Find transaction by reference
      const transaction = await PaymentTransactionModel.findFirst({
        where: {
          OR: [
            { reference: request.reference },
            { providerReference: request.reference },
          ],
        },
        include: {
          order: {
            include: {
              user: true,
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

      // Verify with Paystack
      const paystackVerification = await this.paystackService.verifyPayment(
        transaction.providerReference
      );

      const paystackData = paystackVerification.data;
      const isSuccessful = paystackData.status === "success";

      // Update transaction
      const updatedTransaction = await PaymentTransactionModel.update({
        where: { id: transaction.id },
        data: {
          status: isSuccessful ? "success" : "failed",
          amountPaid: paystackData.amount || 0,
          fees: paystackData.fees || 0,
          authorization: paystackData.authorization,
          gateway: paystackData.gateway_response
            ? {
                message: paystackData.gateway_response,
                reference: paystackData.reference,
              }
            : undefined,
          paidAt: isSuccessful ? new Date(paystackData.paid_at) : undefined,
          updatedAt: new Date(),
        },
      });

      // Update order payment status
      if (isSuccessful) {
        await OrderModel.update({
          where: { id: transaction.orderId },
          data: {
            paymentStatus: "PAID",
            paymentReference: transaction.providerReference,
            paidAt: new Date(paystackData.paid_at),
            updatedAt: new Date(),
          },
        });

        // Send payment confirmation notification
        await this.sendPaymentConfirmation(transaction);
      }

      return {
        success: isSuccessful,
        message: isSuccessful
          ? "Payment verified successfully"
          : "Payment verification failed",
        data: this.transformTransaction(updatedTransaction),
      };
    } catch (error) {
      this.handleError("Error verifying payment", error);
      throw error;
    }
  }

  /**
   * Process webhook from payment provider
   */
  async processWebhook(
    provider: string,
    event: string,
    data: any
  ): Promise<void> {
    try {
      if (provider !== "paystack") {
        throw new AppError(
          "Unsupported payment provider",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      switch (event) {
        case "charge.success":
          await this.handleSuccessfulPayment(data);
          break;
        case "charge.failed":
          await this.handleFailedPayment(data);
          break;
        default:
          // Log unknown event but don't fail
          console.log(`Unknown webhook event: ${event}`);
      }
    } catch (error) {
      this.handleError("Error processing webhook", error);
      throw error;
    }
  }

  /**
   * Get payment transaction by ID
   */
  async getTransaction(transactionId: string): Promise<PaymentTransaction> {
    try {
      const transaction = await PaymentTransactionModel.findUnique({
        where: { id: transactionId },
        include: {
          order: {
            select: {
              orderNumber: true,
              totalAmount: true,
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

      return this.transformTransaction(transaction);
    } catch (error) {
      this.handleError("Error fetching transaction", error);
      throw error;
    }
  }

  /**
   * Get payment history for a user
   */
  async getUserPayments(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    transactions: PaymentTransaction[];
    pagination: any;
  }> {
    try {
      const [transactions, total] = await Promise.all([
        PaymentTransactionModel.findMany({
          where: { userId },
          include: {
            order: {
              select: {
                orderNumber: true,
                totalAmount: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        PaymentTransactionModel.count({ where: { userId } }),
      ]);

      const pagination = this.createPagination(page, limit, total);

      return {
        transactions: transactions.map(this.transformTransaction),
        pagination,
      };
    } catch (error) {
      this.handleError("Error fetching user payments", error);
      throw error;
    }
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<PaymentSummary> {
    try {
      const dateFilter: any = {};
      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.gte = startDate;
        if (endDate) dateFilter.createdAt.lte = endDate;
      }

      const [
        totalTransactions,
        successfulTransactions,
        failedTransactions,
        volumeResult,
      ] = await Promise.all([
        PaymentTransactionModel.count({ where: dateFilter }),
        PaymentTransactionModel.count({
          where: { ...dateFilter, status: "success" },
        }),
        PaymentTransactionModel.count({
          where: { ...dateFilter, status: "failed" },
        }),
        PaymentTransactionModel.aggregate({
          where: { ...dateFilter, status: "success" },
          _sum: { amountPaid: true },
          _avg: { amountPaid: true },
        }),
      ]);

      const totalVolume = Number(volumeResult._sum.amountPaid) || 0;
      const averageAmount = Number(volumeResult._avg.amountPaid) || 0;
      const successRate =
        totalTransactions > 0
          ? (successfulTransactions / totalTransactions) * 100
          : 0;

      return {
        totalTransactions,
        totalVolume: totalVolume / 100, // Convert from kobo to naira
        successfulTransactions,
        failedTransactions,
        successRate: Math.round(successRate * 100) / 100,
        averageAmount: averageAmount / 100, // Convert from kobo to naira
      };
    } catch (error) {
      this.handleError("Error fetching payment analytics", error);
      throw error;
    }
  }

  // Private helper methods

  private generatePaymentReference(orderNumber: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${orderNumber}_${timestamp}_${random}`.toUpperCase();
  }

  private async handleSuccessfulPayment(data: any): Promise<void> {
    const transaction = await PaymentTransactionModel.findFirst({
      where: { providerReference: data.reference },
    });

    if (transaction && transaction.status !== "success") {
      await PaymentTransactionModel.update({
        where: { id: transaction.id },
        data: {
          status: "success",
          amountPaid: data.amount,
          fees: data.fees || 0,
          paidAt: new Date(data.paid_at),
          authorization: data.authorization,
          gateway: data.gateway_response
            ? {
                message: data.gateway_response,
                reference: data.reference,
              }
            : undefined,
        },
      });

      // Update order
      await OrderModel.update({
        where: { id: transaction.orderId },
        data: {
          paymentStatus: "PAID",
          paymentReference: data.reference,
          paidAt: new Date(data.paid_at),
        },
      });

      // Send confirmation
      await this.sendPaymentConfirmation(transaction);
    }
  }

  private async handleFailedPayment(data: any): Promise<void> {
    const transaction = await PaymentTransactionModel.findFirst({
      where: { providerReference: data.reference },
    });

    if (transaction && transaction.status === "pending") {
      await PaymentTransactionModel.update({
        where: { id: transaction.id },
        data: {
          status: "failed",
          gateway: data.gateway_response
            ? {
                message: data.gateway_response,
                reference: data.reference,
              }
            : undefined,
        },
      });

      // Update order
      await OrderModel.update({
        where: { id: transaction.orderId },
        data: { paymentStatus: "FAILED" },
      });
    }
  }

  private async sendPaymentConfirmation(transaction: any): Promise<void> {
    const order = await OrderModel.findUnique({
      where: { id: transaction.orderId },
      include: { user: true },
    });

    if (order && order.user.email) {
      await this.notificationService.sendNotification({
        type: "PAYMENT_SUCCESSFUL",
        channel: "EMAIL",
        userId: order.userId,
        recipient: {
          email: order.user.email,
          name: `${order.user.firstName} ${order.user.lastName}`,
        },
        variables: {
          orderNumber: order.orderNumber,
          amount: (transaction.amountPaid / 100).toLocaleString(),
          paymentMethod: transaction.channel,
          customerName: order.user.firstName,
        },
      });
    }
  }

  private transformTransaction(transaction: any): PaymentTransaction {
    return {
      id: transaction.id,
      orderId: transaction.orderId,
      userId: transaction.userId,
      provider: transaction.provider,
      channel: transaction.channel as PaymentChannel,
      status: transaction.status as PaymentStatus,
      amount: transaction.amount,
      amountPaid: transaction.amountPaid,
      fees: transaction.fees,
      currency: transaction.currency,
      reference: transaction.reference,
      providerReference: transaction.providerReference,
      providerTransactionId: transaction.providerTransactionId,
      authorization: transaction.authorization,
      gateway: transaction.gateway,
      customer: transaction.customer,
      metadata: transaction.metadata,
      paidAt: transaction.paidAt,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }
}
