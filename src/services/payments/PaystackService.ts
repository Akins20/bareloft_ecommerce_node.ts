import { BaseService } from "../BaseService";
import {
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
  PaymentChannel,
} from "../../types";
import axios, { AxiosInstance } from "axios";

interface PaystackInitializeRequest {
  email: string;
  amount: number; // in kobo
  reference: string;
  currency?: string;
  channels?: PaymentChannel[];
  callback_url?: string;
  metadata?: Record<string, any>;
}

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string | null;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: Record<string, any>;
    fees: number;
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string | null;
    };
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
      phone: string | null;
      metadata: Record<string, any>;
      risk_action: string;
    };
  };
}

interface PaystackWebhookEvent {
  event: string;
  data: any;
}

export class PaystackService extends BaseService {
  private client: AxiosInstance;
  private secretKey: string;

  constructor() {
    super();

    this.secretKey = process.env.PAYSTACK_SECRET_KEY || "";

    if (!this.secretKey) {
      throw new Error("PAYSTACK_SECRET_KEY environment variable is required");
    }

    this.client = axios.create({
      baseURL: "https://api.paystack.co",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 seconds
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handlePaystackError(error)
    );
  }

  /**
   * Initialize payment transaction
   */
  async initializePayment(
    request: PaystackInitializeRequest
  ): Promise<PaystackInitializeResponse> {
    try {
      // Validate amount (minimum 100 kobo = ₦1)
      if (request.amount < 100) {
        throw new AppError(
          "Minimum payment amount is ₦1",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const payload = {
        email: request.email,
        amount: request.amount,
        reference: request.reference,
        currency: request.currency || "NGN",
        channels: request.channels || ["card", "bank", "ussd", "bank_transfer"],
        callback_url: request.callback_url,
        metadata: {
          custom_fields: [
            {
              display_name: "Order Reference",
              variable_name: "order_reference",
              value: request.reference,
            },
          ],
          ...request.metadata,
        },
      };

      const response = await this.client.post<PaystackInitializeResponse>(
        "/transaction/initialize",
        payload
      );

      if (!response.data.status) {
        throw new AppError(
          response.data.message || "Payment initialization failed",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.PAYMENT_FAILED
        );
      }

      return response.data;
    } catch (error) {
      this.handleError("Error initializing Paystack payment", error);
      throw error;
    }
  }

  /**
   * Verify payment transaction
   */
  async verifyPayment(reference: string): Promise<PaystackVerifyResponse> {
    try {
      if (!reference) {
        throw new AppError(
          "Payment reference is required",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const response = await this.client.get<PaystackVerifyResponse>(
        `/transaction/verify/${reference}`
      );

      if (!response.data.status) {
        throw new AppError(
          response.data.message || "Payment verification failed",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.PAYMENT_FAILED
        );
      }

      return response.data;
    } catch (error) {
      this.handleError("Error verifying Paystack payment", error);
      throw error;
    }
  }

  /**
   * List supported banks for bank transfer
   */
  async getBanks(country: string = "nigeria"): Promise<
    Array<{
      id: number;
      name: string;
      slug: string;
      code: string;
      longcode: string;
      gateway: string | null;
      pay_with_bank: boolean;
      active: boolean;
      country: string;
      currency: string;
      type: string;
    }>
  > {
    try {
      const response = await this.client.get("/bank", {
        params: { country },
      });

      if (!response.data.status) {
        throw new AppError(
          "Failed to fetch banks",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.EXTERNAL_SERVICE_ERROR
        );
      }

      return response.data.data;
    } catch (error) {
      this.handleError("Error fetching banks from Paystack", error);
      throw error;
    }
  }

  /**
   * Resolve account number
   */
  async resolveAccountNumber(
    accountNumber: string,
    bankCode: string
  ): Promise<{
    account_number: string;
    account_name: string;
    bank_id: number;
  }> {
    try {
      const response = await this.client.get("/bank/resolve", {
        params: {
          account_number: accountNumber,
          bank_code: bankCode,
        },
      });

      if (!response.data.status) {
        throw new AppError(
          response.data.message || "Account resolution failed",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      return response.data.data;
    } catch (error) {
      this.handleError("Error resolving account number", error);
      throw error;
    }
  }

  /**
   * Create transfer recipient
   */
  async createTransferRecipient(
    type: string,
    name: string,
    accountNumber: string,
    bankCode: string,
    currency: string = "NGN"
  ): Promise<{
    active: boolean;
    createdAt: string;
    currency: string;
    domain: string;
    id: number;
    name: string;
    recipient_code: string;
    type: string;
    updatedAt: string;
    is_deleted: boolean;
    details: {
      authorization_code: null;
      account_number: string;
      account_name: string;
      bank_code: string;
      bank_name: string;
    };
  }> {
    try {
      const payload = {
        type,
        name,
        account_number: accountNumber,
        bank_code: bankCode,
        currency,
      };

      const response = await this.client.post("/transferrecipient", payload);

      if (!response.data.status) {
        throw new AppError(
          response.data.message || "Failed to create transfer recipient",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.EXTERNAL_SERVICE_ERROR
        );
      }

      return response.data.data;
    } catch (error) {
      this.handleError("Error creating transfer recipient", error);
      throw error;
    }
  }

  /**
   * Initiate transfer (for refunds)
   */
  async initiateTransfer(
    amount: number,
    recipientCode: string,
    reason: string = "Refund",
    reference?: string
  ): Promise<{
    amount: number;
    currency: string;
    domain: string;
    failures: null;
    id: number;
    integration: number;
    reason: string;
    reference: string;
    source: string;
    source_details: null;
    status: string;
    titan_code: null;
    transfer_code: string;
    transferred_at: null;
    updatedAt: string;
    createdAt: string;
  }> {
    try {
      const payload = {
        source: "balance",
        amount,
        recipient: recipientCode,
        reason,
        reference: reference || this.generateTransferReference(),
      };

      const response = await this.client.post("/transfer", payload);

      if (!response.data.status) {
        throw new AppError(
          response.data.message || "Transfer initiation failed",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.EXTERNAL_SERVICE_ERROR
        );
      }

      return response.data.data;
    } catch (error) {
      this.handleError("Error initiating transfer", error);
      throw error;
    }
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload: string, signature: string): boolean {
    try {
      const crypto = require("crypto");
      const hash = crypto
        .createHmac("sha512", this.secretKey)
        .update(payload, "utf-8")
        .digest("hex");

      return hash === signature;
    } catch (error) {
      this.handleError("Error validating webhook signature", error);
      return false;
    }
  }

  /**
   * Parse webhook event
   */
  parseWebhookEvent(payload: string): PaystackWebhookEvent {
    try {
      return JSON.parse(payload);
    } catch (error) {
      throw new AppError(
        "Invalid webhook payload",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }
  }

  /**
   * Get transaction charges/fees
   */
  calculateTransactionFees(amount: number): {
    paystackFee: number;
    total: number;
  } {
    // Paystack charges in Nigeria:
    // 1.5% + ₦100 for local cards
    // 3.9% + ₦100 for international cards
    // Using local card rate as default

    const feePercentage = 0.015; // 1.5%
    const fixedFee = 10000; // ₦100 in kobo

    let paystackFee = Math.round(amount * feePercentage) + fixedFee;

    // Fee cap of ₦2,000 (200,000 kobo)
    paystackFee = Math.min(paystackFee, 200000);

    return {
      paystackFee,
      total: amount + paystackFee,
    };
  }

  /**
   * Get supported payment channels
   */
  getSupportedChannels(): Array<{
    channel: PaymentChannel;
    name: string;
    description: string;
    available: boolean;
  }> {
    return [
      {
        channel: "card",
        name: "Debit/Credit Card",
        description: "Pay with Visa, Mastercard, or Verve",
        available: true,
      },
      {
        channel: "bank",
        name: "Bank",
        description: "Pay directly from your bank account",
        available: true,
      },
      {
        channel: "ussd",
        name: "USSD",
        description: "Pay using USSD codes",
        available: true,
      },
      {
        channel: "bank_transfer",
        name: "Bank Transfer",
        description: "Transfer to our account",
        available: true,
      },
      {
        channel: "qr",
        name: "QR Code",
        description: "Scan QR code to pay",
        available: true,
      },
    ];
  }

  // Private helper methods

  private handlePaystackError(error: any): never {
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.message || "Paystack API error";

      throw new AppError(message, status, ERROR_CODES.EXTERNAL_SERVICE_ERROR);
    } else if (error.request) {
      throw new AppError(
        "Network error connecting to Paystack",
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        ERROR_CODES.EXTERNAL_SERVICE_ERROR
      );
    } else {
      throw new AppError(
        "Unexpected error with payment service",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  private generateTransferReference(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `TRF_${timestamp}_${random}`.toUpperCase();
  }
}
