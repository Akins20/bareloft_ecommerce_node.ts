import { Request, Response } from "express";
import { BaseController } from "../BaseController";
import { PaymentService } from "../../services/payments/PaymentService";
import { PaystackService } from "../../services/payments/PaystackService";
import {
  InitializePaymentRequest,
  VerifyPaymentRequest,
  PaymentChannel,
  ApiResponse,
} from "../../types";
import { AuthenticatedRequest } from "../../types/auth.types";
import crypto from "crypto";

export class PaymentController extends BaseController {
  private paymentService: PaymentService;
  private paystackService: PaystackService;

  constructor(paymentService: PaymentService, paystackService: PaystackService) {
    super();
    this.paymentService = paymentService;
    this.paystackService = paystackService;
  }

  /**
   * Initialize payment for an order
   * POST /api/v1/payments/initialize
   */
  public initializePayment = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      const {
        orderId,
        amount,
        currency = "NGN",
        channels,
        callbackUrl,
        metadata = {},
      } = req.body;

      // Get user email from token or request
      const email = req.user?.email || req.body.email;

      if (!email) {
        res.status(400).json({
          success: false,
          message: "User email is required for payment initialization",
        });
        return;
      }

      // Validate required fields
      const validationErrors = this.validateInitializePaymentRequest({
        orderId,
        amount,
        email,
        currency,
      });

      if (validationErrors.length > 0) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationErrors,
        });
        return;
      }

      // Initialize payment
      const result = await this.paymentService.initializePayment({
        orderId,
        amount,
        email,
        currency,
        channels: this.validatePaymentChannels(channels),
        callbackUrl: callbackUrl || `${process.env.FRONTEND_URL}/payment/callback`,
        metadata: {
          userId,
          ...metadata,
        },
      });

      res.status(201).json(result);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Verify payment transaction
   * POST /api/v1/payments/verify
   */
  public verifyPayment = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { reference } = req.body;

      if (!reference) {
        res.status(400).json({
          success: false,
          message: "Payment reference is required",
        });
        return;
      }

      const result = await this.paymentService.verifyPayment({ reference });

      res.json(result);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get payment transaction details
   * GET /api/v1/payments/:transactionId
   */
  public getTransaction = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { transactionId } = req.params;

      if (!transactionId) {
        res.status(400).json({
          success: false,
          message: "Transaction ID is required",
        });
        return;
      }

      const transaction = await this.paymentService.getTransaction(transactionId);

      const response: ApiResponse<{ transaction: typeof transaction }> = {
        success: true,
        message: "Transaction retrieved successfully",
        data: { transaction },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get user's payment history
   * GET /api/v1/payments/history
   */
  public getPaymentHistory = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      const { page = 1, limit = 10 } = req.query;

      const result = await this.paymentService.getUserPayments(
        userId,
        parseInt(page as string),
        Math.min(parseInt(limit as string), 50) // Max 50 per page
      );

      const response: ApiResponse<typeof result> = {
        success: true,
        message: "Payment history retrieved successfully",
        data: result,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get supported payment channels
   * GET /api/v1/payments/channels
   */
  public getPaymentChannels = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const channels = this.paystackService.getSupportedChannels();

      const response: ApiResponse<{ channels: typeof channels }> = {
        success: true,
        message: "Payment channels retrieved successfully",
        data: { channels },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get Nigerian banks for bank transfer
   * GET /api/v1/payments/banks
   */
  public getBanks = async (req: Request, res: Response): Promise<void> => {
    try {
      const banks = await this.paystackService.getBanks("nigeria");

      const response: ApiResponse<{ banks: typeof banks }> = {
        success: true,
        message: "Nigerian banks retrieved successfully",
        data: { banks },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Resolve bank account details
   * POST /api/v1/payments/resolve-account
   */
  public resolveAccount = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { accountNumber, bankCode } = req.body;

      if (!accountNumber || !bankCode) {
        res.status(400).json({
          success: false,
          message: "Account number and bank code are required",
        });
        return;
      }

      // Validate Nigerian account number format
      if (!/^\d{10}$/.test(accountNumber)) {
        res.status(400).json({
          success: false,
          message: "Invalid account number format (must be 10 digits)",
        });
        return;
      }

      const accountDetails = await this.paystackService.resolveAccountNumber(
        accountNumber,
        bankCode
      );

      const response: ApiResponse<{ account: typeof accountDetails }> = {
        success: true,
        message: "Account resolved successfully",
        data: { account: accountDetails },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Calculate payment fees
   * POST /api/v1/payments/calculate-fees
   */
  public calculateFees = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { amount } = req.body;

      if (!amount || typeof amount !== "number" || amount < 100) {
        res.status(400).json({
          success: false,
          message: "Valid amount is required (minimum ₦1.00)",
        });
        return;
      }

      const amountInKobo = Math.round(amount * 100);
      const feeCalculation = this.paystackService.calculateTransactionFees(amountInKobo);

      const response: ApiResponse<{
        amount: number;
        fees: number;
        total: number;
        currency: string;
      }> = {
        success: true,
        message: "Payment fees calculated successfully",
        data: {
          amount: amountInKobo / 100,
          fees: feeCalculation.paystackFee / 100,
          total: feeCalculation.total / 100,
          currency: "NGN",
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Handle Paystack webhook
   * POST /api/v1/payments/webhook/paystack
   */
  public handlePaystackWebhook = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const signature = req.headers["x-paystack-signature"] as string;
      const payload = (req as any).rawBody || JSON.stringify(req.body);

      if (!signature) {
        res.status(400).json({
          success: false,
          message: "Missing webhook signature",
        });
        return;
      }

      // Validate webhook signature
      const isValid = this.paystackService.validateWebhookSignature(
        payload,
        signature
      );

      if (!isValid) {
        res.status(401).json({
          success: false,
          message: "Invalid webhook signature",
        });
        return;
      }

      // Parse webhook event
      const event = this.paystackService.parseWebhookEvent(payload);

      // Process webhook
      await this.paymentService.processWebhook("paystack", event.event, event.data);

      // Log successful webhook processing
      console.log(`✅ Paystack webhook processed: ${event.event}`, {
        reference: event.data?.reference,
        status: event.data?.status,
        amount: event.data?.amount,
      });

      res.status(200).json({
        success: true,
        message: "Webhook processed successfully",
      });
    } catch (error) {
      console.error("❌ Webhook processing error:", error);
      
      // Don't expose internal errors to webhook caller
      res.status(500).json({
        success: false,
        message: "Webhook processing failed",
      });
    }
  };

  /**
   * Get payment analytics (Admin only)
   * GET /api/v1/payments/analytics
   */
  public getPaymentAnalytics = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { startDate, endDate } = req.query;

      let start: Date | undefined;
      let end: Date | undefined;

      if (startDate) {
        start = new Date(startDate as string);
        if (isNaN(start.getTime())) {
          res.status(400).json({
            success: false,
            message: "Invalid start date format",
          });
          return;
        }
      }

      if (endDate) {
        end = new Date(endDate as string);
        if (isNaN(end.getTime())) {
          res.status(400).json({
            success: false,
            message: "Invalid end date format",
          });
          return;
        }
      }

      const analytics = await this.paymentService.getPaymentAnalytics(start, end);

      const response: ApiResponse<typeof analytics> = {
        success: true,
        message: "Payment analytics retrieved successfully",
        data: analytics,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  // Private validation methods

  private validateInitializePaymentRequest(data: any): string[] {
    const errors: string[] = [];

    if (!data.orderId || typeof data.orderId !== "string") {
      errors.push("Valid order ID is required");
    }

    if (!data.amount || typeof data.amount !== "number" || data.amount < 1) {
      errors.push("Valid amount is required (minimum ₦1.00)");
    }

    if (!data.email || typeof data.email !== "string" || !this.isValidEmail(data.email)) {
      errors.push("Valid email address is required");
    }

    if (data.currency && !["NGN"].includes(data.currency)) {
      errors.push("Only NGN currency is supported");
    }

    return errors;
  }

  private validatePaymentChannels(channels: any): PaymentChannel[] {
    const validChannels: PaymentChannel[] = ["card", "bank", "ussd", "bank_transfer", "qr"] as any[];
    
    if (!channels || !Array.isArray(channels)) {
      return validChannels; // Return all channels if none specified
    }

    const filtered = channels.filter((channel: any) =>
      validChannels.includes(channel)
    );

    return filtered.length > 0 ? filtered : validChannels;
  }

  protected isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}