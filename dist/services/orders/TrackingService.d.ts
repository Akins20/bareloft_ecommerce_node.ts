import { BaseService } from "../BaseService";
import { OrderStatus } from "../../types";
interface TrackingInfo {
    orderId: string;
    orderNumber: string;
    status: OrderStatus;
    trackingNumber?: string;
    estimatedDelivery?: Date;
    currentLocation?: string;
    timeline: Array<{
        status: OrderStatus;
        description: string;
        timestamp: Date;
        location?: string;
    }>;
    deliveryProgress: {
        percentage: number;
        currentStep: string;
        nextStep?: string;
    };
}
interface DeliveryUpdate {
    trackingNumber: string;
    status: OrderStatus;
    location: string;
    description: string;
    timestamp: Date;
    updatedBy: string;
}
export declare class TrackingService extends BaseService {
    private cacheService;
    constructor(cacheService?: any);
    /**
     * Track order by order number or tracking number
     */
    trackOrder(identifier: string): Promise<TrackingInfo>;
    /**
     * Track multiple orders for a user
     */
    trackUserOrders(userId: string): Promise<TrackingInfo[]>;
    /**
     * Update delivery status (for logistics partners)
     */
    updateDeliveryStatus(update: DeliveryUpdate): Promise<void>;
    /**
     * Get estimated delivery time
     */
    getEstimatedDelivery(orderId: string, shippingState: string): Promise<{
        estimatedDate: Date;
        estimatedDays: number;
        deliveryWindow: string;
    }>;
    /**
     * Check for delayed orders
     */
    getDelayedOrders(): Promise<Array<{
        orderId: string;
        orderNumber: string;
        customerName: string;
        trackingNumber?: string;
        estimatedDelivery: Date;
        daysOverdue: number;
        status: OrderStatus;
    }>>;
    /**
     * Generate tracking URL for external tracking
     */
    generateTrackingUrl(trackingNumber: string): string;
    private getOrderTimeline;
    private calculateDeliveryProgress;
    private getCurrentLocation;
    private getDeliveryDays;
    private getDeliveryWindow;
    private shouldUpdateOrderStatus;
    private extractLocationFromDescription;
    private clearTrackingCache;
}
export {};
//# sourceMappingURL=TrackingService.d.ts.map