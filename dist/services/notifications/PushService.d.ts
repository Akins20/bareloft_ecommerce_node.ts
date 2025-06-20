import { BaseService } from "../BaseService";
export interface SendPushRequest {
    userId: string;
    title: string;
    message: string;
    data?: Record<string, any>;
    imageUrl?: string;
    actionUrl?: string;
    badge?: number;
    sound?: string;
    priority?: "normal" | "high";
}
export interface SendPushToTokenRequest {
    deviceToken: string;
    title: string;
    message: string;
    data?: Record<string, any>;
    imageUrl?: string;
    actionUrl?: string;
}
export declare class PushService extends BaseService {
    private messaging;
    constructor();
    /**
     * Initialize Firebase Admin SDK
     */
    private initializeFirebase;
    /**
     * Send push notification to a user (by userId)
     */
    sendPush(request: SendPushRequest): Promise<string>;
    /**
     * Send push notification to specific device token
     */
    sendPushToToken(request: SendPushToTokenRequest): Promise<string>;
    /**
     * Send order confirmation push
     */
    sendOrderConfirmation(userId: string, customerName: string, orderNumber: string, totalAmount: number): Promise<string>;
    /**
     * Send order shipped push
     */
    sendOrderShipped(userId: string, customerName: string, orderNumber: string, trackingNumber?: string): Promise<string>;
    /**
     * Send order delivered push
     */
    sendOrderDelivered(userId: string, customerName: string, orderNumber: string): Promise<string>;
    /**
     * Send payment successful push
     */
    sendPaymentSuccessful(userId: string, customerName: string, orderNumber: string, amount: number): Promise<string>;
    /**
     * Send abandoned cart reminder
     */
    sendAbandonedCartReminder(userId: string, customerName: string, itemCount: number, cartTotal: number): Promise<string>;
    /**
     * Send product back in stock push
     */
    sendProductBackInStock(userId: string, customerName: string, productName: string, productId: string): Promise<string>;
    /**
     * Send promotional push
     */
    sendPromotion(userId: string, customerName: string, title: string, message: string, actionUrl?: string): Promise<string>;
    /**
     * Send bulk push notifications
     */
    sendBulkPush(requests: SendPushRequest[]): Promise<{
        successful: number;
        failed: number;
        results: Array<{
            userId: string;
            messageId?: string;
            error?: string;
        }>;
    }>;
    /**
     * Subscribe user to topic (for broadcast notifications)
     */
    subscribeToTopic(deviceTokens: string[], topic: string): Promise<void>;
    /**
     * Unsubscribe user from topic
     */
    unsubscribeFromTopic(deviceTokens: string[], topic: string): Promise<void>;
    /**
     * Send notification to topic (broadcast)
     */
    sendToTopic(topic: string, title: string, message: string, data?: Record<string, any>): Promise<string>;
    /**
     * Validate device token
     */
    validateDeviceToken(token: string): Promise<boolean>;
    /**
     * Get user's device tokens from database
     */
    private getUserDeviceTokens;
    /**
     * Clean up invalid device tokens
     */
    cleanupInvalidTokens(userId: string): Promise<number>;
    /**
     * Get push notification analytics
     */
    getPushAnalytics(startDate?: Date, endDate?: Date): Promise<{
        totalSent: number;
        totalDelivered: number;
        totalOpened: number;
        deliveryRate: number;
        openRate: number;
    }>;
}
//# sourceMappingURL=PushService.d.ts.map