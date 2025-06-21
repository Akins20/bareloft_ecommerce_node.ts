"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMSHelper = void 0;
const axios_1 = __importDefault(require("axios"));
const environment_1 = require("../../config/environment");
const winston_1 = require("../logger/winston");
/**
 * Simple SMS helper for Nigerian market using Termii
 */
class SMSHelper {
    /**
     * Send SMS
     */
    static async sendSMS(phoneNumber, message) {
        try {
            // Format phone number
            const formattedPhone = this.formatPhoneNumber(phoneNumber);
            if (!formattedPhone) {
                winston_1.logger.error("Invalid phone number format:", phoneNumber);
                return false;
            }
            // Send via Termii (most popular Nigerian SMS provider)
            const response = await axios_1.default.post("https://termii.com/api/sms/send", {
                to: formattedPhone,
                from: environment_1.config.sms.senderId,
                sms: message,
                type: "plain",
                api_key: environment_1.config.sms.apiKey,
                channel: "generic",
            });
            if (response.data.code === "ok") {
                winston_1.logger.info("SMS sent successfully:", {
                    to: this.maskPhoneNumber(phoneNumber),
                    messageId: response.data.message_id,
                });
                return true;
            }
            else {
                winston_1.logger.error("SMS sending failed:", response.data.message);
                return false;
            }
        }
        catch (error) {
            winston_1.logger.error("SMS error:", error);
            return false;
        }
    }
    /**
     * Send OTP SMS
     */
    static async sendOTP(phoneNumber, otp) {
        const message = `Your Bareloft verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;
        return this.sendSMS(phoneNumber, message);
    }
    /**
     * Send order notification
     */
    static async sendOrderNotification(phoneNumber, orderNumber, status) {
        let message = "";
        switch (status) {
            case "confirmed":
                message = `Order ${orderNumber} confirmed! We're preparing your items for shipment.`;
                break;
            case "shipped":
                message = `Good news! Order ${orderNumber} has been shipped.`;
                break;
            case "delivered":
                message = `Order ${orderNumber} delivered successfully. Thank you for shopping with Bareloft!`;
                break;
            default:
                message = `Order ${orderNumber} status: ${status}`;
        }
        return this.sendSMS(phoneNumber, message);
    }
    /**
     * Send payment confirmation
     */
    static async sendPaymentConfirmation(phoneNumber, orderNumber, amount) {
        const formattedAmount = new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
        }).format(amount);
        const message = `Payment of ${formattedAmount} received for order ${orderNumber}. Thank you!`;
        return this.sendSMS(phoneNumber, message);
    }
    /**
     * Format Nigerian phone number
     */
    static formatPhoneNumber(phoneNumber) {
        if (!phoneNumber)
            return null;
        const cleaned = phoneNumber.replace(/\D/g, "");
        if (cleaned.startsWith("234") && cleaned.length === 13) {
            return cleaned;
        }
        else if (cleaned.startsWith("0") && cleaned.length === 11) {
            return `234${cleaned.substring(1)}`;
        }
        else if (cleaned.length === 10) {
            return `234${cleaned}`;
        }
        return null;
    }
    /**
     * Mask phone number for logging
     */
    static maskPhoneNumber(phoneNumber) {
        if (phoneNumber.length > 4) {
            return (phoneNumber.substring(0, 3) +
                "***" +
                phoneNumber.substring(phoneNumber.length - 2));
        }
        return "***";
    }
    /**
     * Validate Nigerian phone number
     */
    static isValidNigerianPhone(phoneNumber) {
        return this.formatPhoneNumber(phoneNumber) !== null;
    }
}
exports.SMSHelper = SMSHelper;
exports.default = SMSHelper;
//# sourceMappingURL=smsHelper.js.map