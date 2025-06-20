import { BaseService } from "../BaseService";
import { NigerianPhoneNumber } from "../../types";
import { smsConfig } from "../../config";
import axios from "axios";

export interface SendSMSRequest {
  to: NigerianPhoneNumber;
  message: string;
  from?: string;
}

export class SMSService extends BaseService {
  private apiKey: string;
  private senderId: string;
  private baseUrl: string;

  constructor() {
    super();
    this.apiKey = smsConfig.termii.apiKey;
    this.senderId = smsConfig.termii.senderId;
    this.baseUrl = "https://api.ng.termii.com/api";
  }

  /**
   * Send SMS using Termii (Popular Nigerian SMS provider)
   */
  async sendSMS(request: SendSMSRequest): Promise<string> {
    try {
      // Validate and format phone number
      const formattedPhone = this.formatNigerianPhone(request.to);

      if (!this.isValidNigerianPhone(formattedPhone)) {
        throw new Error("Invalid Nigerian phone number");
      }

      // Prepare SMS payload
      const payload = {
        to: formattedPhone,
        from: request.from || this.senderId,
        sms: request.message,
        type: "plain",
        api_key: this.apiKey,
        channel: "generic",
      };

      // Send SMS via Termii API
      const response = await axios.post(`${this.baseUrl}/sms/send`, payload, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10 seconds timeout
      });

      if (response.data && response.data.message_id) {
        return response.data.message_id;
      } else {
        throw new Error(response.data?.message || "SMS sending failed");
      }
    } catch (error) {
      this.handleError("Error sending SMS", error);
      throw error;
    }
  }

  /**
   * Send OTP SMS
   */
  async sendOTP(
    phoneNumber: NigerianPhoneNumber,
    otpCode: string
  ): Promise<string> {
    const message = `Your Bareloft verification code is: ${otpCode}. This code expires in 10 minutes. Do not share this code with anyone.`;

    return this.sendSMS({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send order update SMS
   */
  async sendOrderUpdate(
    phoneNumber: NigerianPhoneNumber,
    customerName: string,
    orderNumber: string,
    status: string
  ): Promise<string> {
    let message: string;

    switch (status.toLowerCase()) {
      case "confirmed":
        message = `Hi ${customerName}, your order ${orderNumber} has been confirmed. Thank you for shopping with Bareloft!`;
        break;
      case "shipped":
        message = `Hi ${customerName}, your order ${orderNumber} has been shipped and is on its way to you!`;
        break;
      case "delivered":
        message = `Hi ${customerName}, your order ${orderNumber} has been delivered. Thank you for choosing Bareloft!`;
        break;
      case "cancelled":
        message = `Hi ${customerName}, your order ${orderNumber} has been cancelled. Contact us if you need assistance.`;
        break;
      default:
        message = `Hi ${customerName}, your order ${orderNumber} status has been updated to: ${status}`;
    }

    return this.sendSMS({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send payment confirmation SMS
   */
  async sendPaymentConfirmation(
    phoneNumber: NigerianPhoneNumber,
    customerName: string,
    orderNumber: string,
    amount: number
  ): Promise<string> {
    const message = `Hi ${customerName}, your payment of ₦${amount.toLocaleString()} for order ${orderNumber} was successful. Thank you!`;

    return this.sendSMS({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send promotional SMS
   */
  async sendPromotion(
    phoneNumber: NigerianPhoneNumber,
    customerName: string,
    promoMessage: string
  ): Promise<string> {
    const message = `Hi ${customerName}, ${promoMessage} Shop now at Bareloft!`;

    return this.sendSMS({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send low stock alert to admin
   */
  async sendLowStockAlert(
    adminPhone: NigerianPhoneNumber,
    productName: string,
    currentStock: number
  ): Promise<string> {
    const message = `LOW STOCK ALERT: ${productName} is running low (${currentStock} remaining). Please restock soon.`;

    return this.sendSMS({
      to: adminPhone,
      message,
    });
  }

  /**
   * Get SMS delivery status
   */
  async getDeliveryStatus(messageId: string): Promise<string> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/sms/inbox?api_key=${this.apiKey}&message_id=${messageId}`,
        { timeout: 5000 }
      );

      return response.data?.status || "unknown";
    } catch (error) {
      this.handleError("Error getting SMS delivery status", error);
      return "unknown";
    }
  }

  /**
   * Check account balance
   */
  async getAccountBalance(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/get-balance?api_key=${this.apiKey}`,
        { timeout: 5000 }
      );

      return response.data?.balance || 0;
    } catch (error) {
      this.handleError("Error getting SMS account balance", error);
      return 0;
    }
  }

  // Private helper methods

  /**
   * Format Nigerian phone number to international format
   */
  private formatNigerianPhone(phone: string): string {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, "");

    // Handle different Nigerian phone formats
    if (cleaned.startsWith("234")) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith("0")) {
      return `+234${cleaned.substring(1)}`;
    } else if (cleaned.length === 10) {
      return `+234${cleaned}`;
    }

    return `+234${cleaned}`;
  }

  /**
   * Validate Nigerian phone number
   */
  private isValidNigerianPhone(phone: string): boolean {
    const nigerianPhoneRegex = /^\+234[789][01]\d{8}$/;
    return nigerianPhoneRegex.test(phone);
  }

  /**
   * Check if message length is within SMS limits
   */
  private isValidMessageLength(message: string): boolean {
    // Standard SMS is 160 characters
    // Allow up to 320 characters (2 SMS parts)
    return message.length <= 320;
  }

  /**
   * Split long messages into multiple parts
   */
  private splitMessage(message: string): string[] {
    const maxLength = 160;
    const parts: string[] = [];

    if (message.length <= maxLength) {
      return [message];
    }

    // Split by words to avoid breaking words
    const words = message.split(" ");
    let currentPart = "";

    for (const word of words) {
      if ((currentPart + " " + word).length <= maxLength) {
        currentPart += (currentPart ? " " : "") + word;
      } else {
        if (currentPart) {
          parts.push(currentPart);
        }
        currentPart = word;
      }
    }

    if (currentPart) {
      parts.push(currentPart);
    }

    return parts;
  }

  /**
   * Bulk SMS sending
   */
  async sendBulkSMS(requests: SendSMSRequest[]): Promise<{
    successful: number;
    failed: number;
    results: Array<{ phone: string; messageId?: string; error?: string }>;
  }> {
    const results = {
      successful: 0,
      failed: 0,
      results: [] as Array<{
        phone: string;
        messageId?: string;
        error?: string;
      }>,
    };

    for (const request of requests) {
      try {
        const messageId = await this.sendSMS(request);
        results.results.push({
          phone: request.to,
          messageId,
        });
        results.successful++;
      } catch (error) {
        results.results.push({
          phone: request.to,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Test SMS configuration
   */
  async testSMSConnection(): Promise<boolean> {
    try {
      const balance = await this.getAccountBalance();
      return balance >= 0; // If we can get balance, connection is working
    } catch (error) {
      this.handleError("SMS configuration test failed", error);
      return false;
    }
  }

  /**
   * Get SMS usage statistics
   */
  async getUsageStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalSent: number;
    totalCost: number;
    deliveredCount: number;
    failedCount: number;
  }> {
    try {
      // This would typically come from your database
      // For now, return placeholder stats
      return {
        totalSent: 0,
        totalCost: 0,
        deliveredCount: 0,
        failedCount: 0,
      };
    } catch (error) {
      this.handleError("Error getting SMS usage stats", error);
      return {
        totalSent: 0,
        totalCost: 0,
        deliveredCount: 0,
        failedCount: 0,
      };
    }
  }
}
