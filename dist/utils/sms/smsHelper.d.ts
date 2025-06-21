/**
 * Simple SMS helper for Nigerian market using Termii
 */
export declare class SMSHelper {
    /**
     * Send SMS
     */
    static sendSMS(phoneNumber: string, message: string): Promise<boolean>;
    /**
     * Send OTP SMS
     */
    static sendOTP(phoneNumber: string, otp: string): Promise<boolean>;
    /**
     * Send order notification
     */
    static sendOrderNotification(phoneNumber: string, orderNumber: string, status: string): Promise<boolean>;
    /**
     * Send payment confirmation
     */
    static sendPaymentConfirmation(phoneNumber: string, orderNumber: string, amount: number): Promise<boolean>;
    /**
     * Format Nigerian phone number
     */
    private static formatPhoneNumber;
    /**
     * Mask phone number for logging
     */
    private static maskPhoneNumber;
    /**
     * Validate Nigerian phone number
     */
    static isValidNigerianPhone(phoneNumber: string): boolean;
}
export default SMSHelper;
//# sourceMappingURL=smsHelper.d.ts.map