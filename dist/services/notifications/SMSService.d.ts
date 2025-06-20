import { BaseService } from "../BaseService";
import { NigerianPhoneNumber } from "../../types";
export interface SendSMSRequest {
    to: NigerianPhoneNumber;
    message: string;
    from?: string;
}
export declare class SMSService extends BaseService {
    private apiKey;
    private senderId;
    private baseUrl;
    constructor();
    /**
     * Send SMS using Termii (Popular Nigerian SMS provider)
     */
    sendSMS(request: SendSMSRequest): Promise<string>;
    /**
     * Send OTP SMS
     */
    sendOTP(phoneNumber: NigerianPhoneNumber, otpCode: string): Promise<string>;
    /**
     * Send order update SMS
     */
    sendOrderUpdate(phoneNumber: NigerianPhoneNumber, customerName: string, orderNumber: string, status: string): Promise<string>;
    /**
     * Send payment confirmation SMS
     */
    sendPaymentConfirmation(phoneNumber: NigerianPhoneNumber, customerName: string, orderNumber: string, amount: number): Promise<string>;
    /**
     * Send promotional SMS
     */
    sendPromotion(phoneNumber: NigerianPhoneNumber, customerName: string, promoMessage: string): Promise<string>;
    /**
     * Send low stock alert to admin
     */
    sendLowStockAlert(adminPhone: NigerianPhoneNumber, productName: string, currentStock: number): Promise<string>;
    /**
     * Get SMS delivery status
     */
    getDeliveryStatus(messageId: string): Promise<string>;
    /**
     * Check account balance
     */
    getAccountBalance(): Promise<number>;
    /**
     * Format Nigerian phone number to international format
     */
    private formatNigerianPhone;
    /**
     * Validate Nigerian phone number
     */
    private isValidNigerianPhone;
    /**
     * Check if message length is within SMS limits
     */
    private isValidMessageLength;
    /**
     * Split long messages into multiple parts
     */
    private splitMessage;
    /**
     * Bulk SMS sending
     */
    sendBulkSMS(requests: SendSMSRequest[]): Promise<{
        successful: number;
        failed: number;
        results: Array<{
            phone: string;
            messageId?: string;
            error?: string;
        }>;
    }>;
    /**
     * Test SMS configuration
     */
    testSMSConnection(): Promise<boolean>;
    /**
     * Get SMS usage statistics
     */
    getUsageStats(startDate?: Date, endDate?: Date): Promise<{
        totalSent: number;
        totalCost: number;
        deliveredCount: number;
        failedCount: number;
    }>;
}
//# sourceMappingURL=SMSService.d.ts.map