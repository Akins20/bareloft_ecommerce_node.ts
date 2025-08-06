import { NigerianPhoneNumber } from "../../types";
interface SMSData {
    to: string;
    message: string;
    template?: string;
    variables?: Record<string, any>;
}
export declare class SMSService {
    private apiKey;
    private senderId;
    private baseUrl;
    constructor();
    /**
     * Send SMS to Nigerian phone number
     */
    sendSMS(data: SMSData): Promise<boolean>;
    /**
     * Send OTP SMS
     */
    sendOTP(phoneNumber: NigerianPhoneNumber, code: string): Promise<boolean>;
    /**
     * Send welcome SMS
     */
    sendWelcomeSMS(phoneNumber: NigerianPhoneNumber, firstName: string): Promise<boolean>;
    /**
     * Send order confirmation SMS
     */
    sendOrderConfirmation(phoneNumber: NigerianPhoneNumber, orderNumber: string, totalAmount: number): Promise<boolean>;
    /**
     * Send order shipped SMS
     */
    sendOrderShipped(phoneNumber: NigerianPhoneNumber, orderNumber: string, trackingNumber?: string): Promise<boolean>;
    /**
     * Send order delivered SMS
     */
    sendOrderDelivered(phoneNumber: NigerianPhoneNumber, orderNumber: string): Promise<boolean>;
    /**
     * Send promotional SMS
     */
    sendPromotionalSMS(phoneNumber: NigerianPhoneNumber, title: string, message: string, ctaUrl?: string): Promise<boolean>;
    /**
     * Send bulk SMS to multiple recipients
     */
    sendBulkSMS(recipients: NigerianPhoneNumber[], message: string): Promise<{
        success: number;
        failed: number;
        results: any[];
    }>;
    /**
     * Check SMS delivery status (if supported by provider)
     */
    checkDeliveryStatus(messageId: string): Promise<{
        status: "pending" | "delivered" | "failed" | "unknown";
        deliveredAt?: Date;
    }>;
    /**
     * Get SMS sending statistics
     */
    getSMSStats(dateFrom: Date, dateTo: Date): Promise<{
        totalSent: number;
        totalDelivered: number;
        totalFailed: number;
        cost: number;
    }>;
    private sendViaSMSProvider;
    private isValidNigerianPhone;
    private processTemplate;
    private formatNaira;
    private delay;
    /**
     * Validate SMS message content
     */
    private validateMessage;
    /**
     * Format phone number to international format
     */
    private formatPhoneNumber;
}
export {};
//# sourceMappingURL=SMSService.d.ts.map