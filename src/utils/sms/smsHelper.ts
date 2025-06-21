import axios from "axios";
import { config } from "../../config/environment";
import { logger } from "../logger/winston";

/**
 * Simple SMS helper for Nigerian market using Termii
 */
export class SMSHelper {
  /**
   * Send SMS
   */
  static async sendSMS(phoneNumber: string, message: string): Promise<boolean> {
    try {
      // Format phone number
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      if (!formattedPhone) {
        logger.error("Invalid phone number format:", phoneNumber);
        return false;
      }

      // Send via Termii (most popular Nigerian SMS provider)
      const response = await axios.post("https://termii.com/api/sms/send", {
        to: formattedPhone,
        from: config.sms.senderId,
        sms: message,
        type: "plain",
        api_key: config.sms.apiKey,
        channel: "generic",
      });

      if (response.data.code === "ok") {
        logger.info("SMS sent successfully:", {
          to: this.maskPhoneNumber(phoneNumber),
          messageId: response.data.message_id,
        });
        return true;
      } else {
        logger.error("SMS sending failed:", response.data.message);
        return false;
      }
    } catch (error) {
      logger.error("SMS error:", error);
      return false;
    }
  }

  /**
   * Send OTP SMS
   */
  static async sendOTP(phoneNumber: string, otp: string): Promise<boolean> {
    const message = `Your Bareloft verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;
    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send order notification
   */
  static async sendOrderNotification(
    phoneNumber: string,
    orderNumber: string,
    status: string
  ): Promise<boolean> {
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
  static async sendPaymentConfirmation(
    phoneNumber: string,
    orderNumber: string,
    amount: number
  ): Promise<boolean> {
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
  private static formatPhoneNumber(phoneNumber: string): string | null {
    if (!phoneNumber) return null;

    const cleaned = phoneNumber.replace(/\D/g, "");

    if (cleaned.startsWith("234") && cleaned.length === 13) {
      return cleaned;
    } else if (cleaned.startsWith("0") && cleaned.length === 11) {
      return `234${cleaned.substring(1)}`;
    } else if (cleaned.length === 10) {
      return `234${cleaned}`;
    }

    return null;
  }

  /**
   * Mask phone number for logging
   */
  private static maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length > 4) {
      return (
        phoneNumber.substring(0, 3) +
        "***" +
        phoneNumber.substring(phoneNumber.length - 2)
      );
    }
    return "***";
  }

  /**
   * Validate Nigerian phone number
   */
  static isValidNigerianPhone(phoneNumber: string): boolean {
    return this.formatPhoneNumber(phoneNumber) !== null;
  }
}

export default SMSHelper;
