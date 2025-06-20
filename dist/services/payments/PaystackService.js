"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaystackService = void 0;
const BaseService_1 = require("../BaseService");
const types_1 = require("../../types");
const axios_1 = __importDefault(require("axios"));
class PaystackService extends BaseService_1.BaseService {
    client;
    secretKey;
    constructor() {
        super();
        this.secretKey = process.env.PAYSTACK_SECRET_KEY || "";
        if (!this.secretKey) {
            throw new Error("PAYSTACK_SECRET_KEY environment variable is required");
        }
        this.client = axios_1.default.create({
            baseURL: "https://api.paystack.co",
            headers: {
                Authorization: `Bearer ${this.secretKey}`,
                "Content-Type": "application/json",
            },
            timeout: 30000, // 30 seconds
        });
        // Add response interceptor for error handling
        this.client.interceptors.response.use((response) => response, (error) => this.handlePaystackError(error));
    }
    /**
     * Initialize payment transaction
     */
    async initializePayment(request) {
        try {
            // Validate amount (minimum 100 kobo = ₦1)
            if (request.amount < 100) {
                throw new types_1.AppError("Minimum payment amount is ₦1", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
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
            const response = await this.client.post("/transaction/initialize", payload);
            if (!response.data.status) {
                throw new types_1.AppError(response.data.message || "Payment initialization failed", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.PAYMENT_FAILED);
            }
            return response.data;
        }
        catch (error) {
            this.handleError("Error initializing Paystack payment", error);
            throw error;
        }
    }
    /**
     * Verify payment transaction
     */
    async verifyPayment(reference) {
        try {
            if (!reference) {
                throw new types_1.AppError("Payment reference is required", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
            }
            const response = await this.client.get(`/transaction/verify/${reference}`);
            if (!response.data.status) {
                throw new types_1.AppError(response.data.message || "Payment verification failed", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.PAYMENT_FAILED);
            }
            return response.data;
        }
        catch (error) {
            this.handleError("Error verifying Paystack payment", error);
            throw error;
        }
    }
    /**
     * List supported banks for bank transfer
     */
    async getBanks(country = "nigeria") {
        try {
            const response = await this.client.get("/bank", {
                params: { country },
            });
            if (!response.data.status) {
                throw new types_1.AppError("Failed to fetch banks", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.EXTERNAL_SERVICE_ERROR);
            }
            return response.data.data;
        }
        catch (error) {
            this.handleError("Error fetching banks from Paystack", error);
            throw error;
        }
    }
    /**
     * Resolve account number
     */
    async resolveAccountNumber(accountNumber, bankCode) {
        try {
            const response = await this.client.get("/bank/resolve", {
                params: {
                    account_number: accountNumber,
                    bank_code: bankCode,
                },
            });
            if (!response.data.status) {
                throw new types_1.AppError(response.data.message || "Account resolution failed", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
            }
            return response.data.data;
        }
        catch (error) {
            this.handleError("Error resolving account number", error);
            throw error;
        }
    }
    /**
     * Create transfer recipient
     */
    async createTransferRecipient(type, name, accountNumber, bankCode, currency = "NGN") {
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
                throw new types_1.AppError(response.data.message || "Failed to create transfer recipient", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.EXTERNAL_SERVICE_ERROR);
            }
            return response.data.data;
        }
        catch (error) {
            this.handleError("Error creating transfer recipient", error);
            throw error;
        }
    }
    /**
     * Initiate transfer (for refunds)
     */
    async initiateTransfer(amount, recipientCode, reason = "Refund", reference) {
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
                throw new types_1.AppError(response.data.message || "Transfer initiation failed", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.EXTERNAL_SERVICE_ERROR);
            }
            return response.data.data;
        }
        catch (error) {
            this.handleError("Error initiating transfer", error);
            throw error;
        }
    }
    /**
     * Validate webhook signature
     */
    validateWebhookSignature(payload, signature) {
        try {
            const crypto = require("crypto");
            const hash = crypto
                .createHmac("sha512", this.secretKey)
                .update(payload, "utf-8")
                .digest("hex");
            return hash === signature;
        }
        catch (error) {
            this.handleError("Error validating webhook signature", error);
            return false;
        }
    }
    /**
     * Parse webhook event
     */
    parseWebhookEvent(payload) {
        try {
            return JSON.parse(payload);
        }
        catch (error) {
            throw new types_1.AppError("Invalid webhook payload", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
        }
    }
    /**
     * Get transaction charges/fees
     */
    calculateTransactionFees(amount) {
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
    getSupportedChannels() {
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
    handlePaystackError(error) {
        if (error.response) {
            const { status, data } = error.response;
            const message = data?.message || "Paystack API error";
            throw new types_1.AppError(message, status, types_1.ERROR_CODES.EXTERNAL_SERVICE_ERROR);
        }
        else if (error.request) {
            throw new types_1.AppError("Network error connecting to Paystack", types_1.HTTP_STATUS.SERVICE_UNAVAILABLE, types_1.ERROR_CODES.EXTERNAL_SERVICE_ERROR);
        }
        else {
            throw new types_1.AppError("Unexpected error with payment service", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    generateTransferReference() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `TRF_${timestamp}_${random}`.toUpperCase();
    }
}
exports.PaystackService = PaystackService;
//# sourceMappingURL=PaystackService.js.map