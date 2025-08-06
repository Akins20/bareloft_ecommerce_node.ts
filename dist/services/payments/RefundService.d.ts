import { BaseService } from "../BaseService";
import { RefundRequest, Refund, RefundStatus, RefundResponse, PaginationMeta } from "../../types";
import { PaystackService } from "./PaystackService";
import { NotificationService } from "../notifications/NotificationService";
export declare class RefundService extends BaseService {
    private paystackService;
    private notificationService;
    private refunds;
    constructor(paystackService?: PaystackService, notificationService?: NotificationService);
    /**
     * Process a refund request
     */
    processRefund(request: RefundRequest): Promise<RefundResponse>;
    /**
     * Get refund status
     */
    getRefundStatus(refundId: string): Promise<Refund>;
    /**
     * Get refunds for a transaction
     */
    getTransactionRefunds(transactionId: string): Promise<Refund[]>;
    /**
     * Get refunds for an order
     */
    getOrderRefunds(orderId: string): Promise<Refund[]>;
    /**
     * Get all refunds with pagination
     */
    getAllRefunds(page?: number, limit?: number, status?: RefundStatus): Promise<{
        refunds: Refund[];
        pagination: PaginationMeta;
    }>;
    /**
     * Cancel a pending refund
     */
    cancelRefund(refundId: string, reason: string): Promise<Refund>;
    /**
     * Get refund analytics
     */
    getRefundAnalytics(startDate?: Date, endDate?: Date): Promise<{
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
        refundRate: number;
    }>;
    private createRefundRecord;
    private processRefundByMethod;
    private processCardRefund;
    private processBankRefund;
    private sendRefundNotification;
    private getRefundsByTransaction;
    private transformRefund;
    private generateId;
}
//# sourceMappingURL=RefundService.d.ts.map