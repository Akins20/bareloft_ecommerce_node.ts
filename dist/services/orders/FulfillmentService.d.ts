import { BaseService } from "../BaseService";
import { Order } from "../../types";
interface ShippingLabel {
    orderId: string;
    trackingNumber: string;
    shippingMethod: string;
    recipientName: string;
    recipientAddress: string;
    recipientPhone: string;
    weight?: number;
    dimensions?: {
        length: number;
        width: number;
        height: number;
    };
}
export declare class FulfillmentService extends BaseService {
    private reservationService;
    private stockService;
    private notificationService;
    constructor(reservationService?: any, stockService?: any, notificationService?: any);
    /**
     * Confirm order and convert reservations to actual stock reduction
     */
    confirmOrder(orderId: string, confirmedBy: string): Promise<Order>;
    /**
     * Start processing order
     */
    startProcessing(orderId: string, processedBy: string): Promise<Order>;
    /**
     * Ship order with tracking information
     */
    shipOrder(orderId: string, trackingNumber: string, estimatedDelivery: Date, shippedBy: string, notes?: string): Promise<Order>;
    /**
     * Mark order as delivered
     */
    deliverOrder(orderId: string, deliveredBy: string, notes?: string): Promise<Order>;
    /**
     * Process return/refund
     */
    processReturn(orderId: string, returnReason: string, refundAmount: number, processedBy: string): Promise<Order>;
    /**
     * Generate shipping label
     */
    generateShippingLabel(orderId: string): Promise<ShippingLabel>;
    /**
     * Get fulfillment queue (orders ready for processing)
     */
    getFulfillmentQueue(): Promise<Array<{
        orderId: string;
        orderNumber: string;
        customerName: string;
        totalAmount: number;
        itemCount: number;
        createdAt: Date;
        priority: "high" | "normal" | "low";
    }>>;
    private validateOrderStatus;
    private createTimelineEvent;
    private getUpdatedOrder;
    private calculateEstimatedDelivery;
    private sendShippingNotification;
    private sendDeliveryNotification;
    private calculateTotalWeight;
    private calculatePackageDimensions;
    private formatAddress;
    private calculatePriority;
    private transformOrder;
}
export {};
//# sourceMappingURL=FulfillmentService.d.ts.map