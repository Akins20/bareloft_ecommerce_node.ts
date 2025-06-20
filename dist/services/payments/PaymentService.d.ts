import { BaseService } from "../BaseService";
import { PaymentTransaction, InitializePaymentRequest, InitializePaymentResponse, VerifyPaymentRequest, VerifyPaymentResponse } from "../../types";
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
export declare class PaymentService extends BaseService {
    private paystackService;
    private notificationService;
    constructor(paystackService: PaystackService, notificationService: NotificationService);
    /**
     * Initialize payment for an order
     */
    initializePayment(request: InitializePaymentRequest): Promise<InitializePaymentResponse>;
    /**
     * Verify payment transaction
     */
    verifyPayment(request: VerifyPaymentRequest): Promise<VerifyPaymentResponse>;
    /**
     * Process webhook from payment provider
     */
    processWebhook(provider: string, event: string, data: any): Promise<void>;
    /**
     * Get payment transaction by ID
     */
    getTransaction(transactionId: string): Promise<PaymentTransaction>;
    /**
     * Get payment history for a user
     */
    getUserPayments(userId: string, page?: number, limit?: number): Promise<{
        transactions: PaymentTransaction[];
        pagination: any;
    }>;
    /**
     * Get payment analytics
     */
    getPaymentAnalytics(startDate?: Date, endDate?: Date): Promise<PaymentSummary>;
    private generatePaymentReference;
    private handleSuccessfulPayment;
    private handleFailedPayment;
    private sendPaymentConfirmation;
    private transformTransaction;
}
export {};
//# sourceMappingURL=PaymentService.d.ts.map