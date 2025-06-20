import { BaseService } from "../BaseService";
import { PaymentChannel } from "../../types";
interface PaystackInitializeRequest {
    email: string;
    amount: number;
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
export declare class PaystackService extends BaseService {
    private client;
    private secretKey;
    constructor();
    /**
     * Initialize payment transaction
     */
    initializePayment(request: PaystackInitializeRequest): Promise<PaystackInitializeResponse>;
    /**
     * Verify payment transaction
     */
    verifyPayment(reference: string): Promise<PaystackVerifyResponse>;
    /**
     * List supported banks for bank transfer
     */
    getBanks(country?: string): Promise<Array<{
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
    }>>;
    /**
     * Resolve account number
     */
    resolveAccountNumber(accountNumber: string, bankCode: string): Promise<{
        account_number: string;
        account_name: string;
        bank_id: number;
    }>;
    /**
     * Create transfer recipient
     */
    createTransferRecipient(type: string, name: string, accountNumber: string, bankCode: string, currency?: string): Promise<{
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
    }>;
    /**
     * Initiate transfer (for refunds)
     */
    initiateTransfer(amount: number, recipientCode: string, reason?: string, reference?: string): Promise<{
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
    }>;
    /**
     * Validate webhook signature
     */
    validateWebhookSignature(payload: string, signature: string): boolean;
    /**
     * Parse webhook event
     */
    parseWebhookEvent(payload: string): PaystackWebhookEvent;
    /**
     * Get transaction charges/fees
     */
    calculateTransactionFees(amount: number): {
        paystackFee: number;
        total: number;
    };
    /**
     * Get supported payment channels
     */
    getSupportedChannels(): Array<{
        channel: PaymentChannel;
        name: string;
        description: string;
        available: boolean;
    }>;
    private handlePaystackError;
    private generateTransferReference;
}
export {};
//# sourceMappingURL=PaystackService.d.ts.map