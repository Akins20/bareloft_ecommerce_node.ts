import axios from "axios";
import { config } from "../../config/environment";
import { smsConfig } from "../../config/sms";
import { SMSNotification, NigerianPhoneNumber } from "../../types";
import { AppError, HTTP_STATUS, ERROR_CODES } from "../../types/api.types";

// Interface for SMS sending (different from SMSNotification model)
interface SMSData {
  to: string;
  message: string;
  template?: string;
  variables?: Record<string, any>;
}

export class SMSService {
  private apiKey: string;
  private senderId: string;
  private baseUrl: string;
  private channel: string;
  private type: string;

  constructor() {
    this.apiKey = smsConfig.provider.apiKey;
    this.senderId = smsConfig.provider.senderId;
    this.baseUrl = smsConfig.provider.baseUrl;
    this.channel = smsConfig.provider.channel;
    this.type = smsConfig.provider.type;
  }

  /**
   * Send SMS to Nigerian phone number
   */
  async sendSMS(data: SMSData): Promise<boolean> {
    try {
      const { to, message, template, variables } = data;

      // Validate Nigerian phone number
      if (!this.isValidNigerianPhone(to)) {
        throw new AppError(
          "Invalid Nigerian phone number format",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT
        );
      }

      // Process template if provided
      const finalMessage =
        template && variables
          ? this.processTemplate(template, variables)
          : message;

      // In development, log SMS instead of sending
      if (config.nodeEnv === "development") {
        console.log(`📱 SMS to ${to}: ${finalMessage}`);
        return true;
      }

      // Send SMS via provider API
      const response = await this.sendViaSMSProvider(to, finalMessage);

      if (response.success) {
        console.log(`✅ SMS sent successfully to ${to}`);
        return true;
      } else {
        console.error(`❌ Failed to send SMS to ${to}:`, response.error);
        return false;
      }
    } catch (error) {
      console.error("Error sending SMS:", error);

      // In production, you might want to fail silently or use fallback
      if (config.nodeEnv === "production") {
        // Log error but don't throw - SMS failure shouldn't block authentication
        console.error("SMS service error:", error);
        return false;
      }

      throw new AppError(
        "Failed to send SMS",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.EXTERNAL_SERVICE_ERROR
      );
    }
  }

  /**
   * Send OTP SMS
   */
  async sendOTP(
    phoneNumber: NigerianPhoneNumber,
    code: string,
    purpose: string = 'login'
  ): Promise<boolean> {
    // Use template from config based on purpose
    const template = smsConfig.templates.otp[purpose as keyof typeof smsConfig.templates.otp] || 
                    smsConfig.templates.otp.login;
    
    const message = template
      .replace('{code}', code)
      .replace('{minutes}', '10');

    return await this.sendSMS({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send welcome SMS
   */
  async sendWelcomeSMS(
    phoneNumber: NigerianPhoneNumber,
    firstName: string
  ): Promise<boolean> {
    const message = `Welcome to Bareloft, ${firstName}! 🎉 Your account has been created successfully. Start shopping now and enjoy amazing deals!`;

    return await this.sendSMS({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send order confirmation SMS
   */
  async sendOrderConfirmation(
    phoneNumber: NigerianPhoneNumber,
    orderNumber: string,
    totalAmount: number
  ): Promise<boolean> {
    const formattedAmount = this.formatNaira(totalAmount);
    const message = `Order confirmed! Order #${orderNumber} for ${formattedAmount} is being processed. You'll receive updates on delivery. Thank you for shopping with Bareloft!`;

    return await this.sendSMS({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send order shipped SMS
   */
  async sendOrderShipped(
    phoneNumber: NigerianPhoneNumber,
    orderNumber: string,
    trackingNumber?: string
  ): Promise<boolean> {
    let message = `Good news! Your order #${orderNumber} has been shipped and is on the way to you.`;

    if (trackingNumber) {
      message += ` Track with: ${trackingNumber}`;
    }

    message += ` Expected delivery: 2-5 business days.`;

    return await this.sendSMS({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send order delivered SMS
   */
  async sendOrderDelivered(
    phoneNumber: NigerianPhoneNumber,
    orderNumber: string
  ): Promise<boolean> {
    const message = `Your order #${orderNumber} has been delivered! We hope you love your purchase. Please rate your experience in the app. Thank you for choosing Bareloft! 🌟`;

    return await this.sendSMS({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send promotional SMS
   */
  async sendPromotionalSMS(
    phoneNumber: NigerianPhoneNumber,
    title: string,
    message: string,
    ctaUrl?: string
  ): Promise<boolean> {
    let finalMessage = `${title}\n\n${message}`;

    if (ctaUrl) {
      finalMessage += `\n\nShop now: ${ctaUrl}`;
    }

    finalMessage += "\n\nReply STOP to unsubscribe.";

    return await this.sendSMS({
      to: phoneNumber,
      message: finalMessage,
    });
  }

  /**
   * Send bulk SMS to multiple recipients
   */
  async sendBulkSMS(
    recipients: NigerianPhoneNumber[],
    message: string
  ): Promise<{ success: number; failed: number; results: any[] }> {
    const results = [];
    let successCount = 0;
    let failedCount = 0;

    // Process in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const batchPromises = batch.map(async (phoneNumber) => {
        try {
          const success = await this.sendSMS({ to: phoneNumber, message });
          if (success) {
            successCount++;
            return { phoneNumber, success: true };
          } else {
            failedCount++;
            return { phoneNumber, success: false, error: "Failed to send" };
          }
        } catch (error) {
          failedCount++;
          return {
            phoneNumber,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to respect rate limits
      if (i + batchSize < recipients.length) {
        await this.delay(1000); // 1 second delay
      }
    }

    return {
      success: successCount,
      failed: failedCount,
      results,
    };
  }

  /**
   * Check SMS delivery status (if supported by provider)
   */
  async checkDeliveryStatus(messageId: string): Promise<{
    status: "pending" | "delivered" | "failed" | "unknown";
    deliveredAt?: Date;
  }> {
    try {
      // Implementation depends on SMS provider
      // This is a placeholder implementation
      return { status: "unknown" };
    } catch (error) {
      console.error("Error checking SMS delivery status:", error);
      return { status: "unknown" };
    }
  }

  /**
   * Get SMS sending statistics
   */
  async getSMSStats(
    dateFrom: Date,
    dateTo: Date
  ): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    cost: number;
  }> {
    try {
      // Implementation depends on SMS provider API
      // This is a placeholder implementation
      return {
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        cost: 0,
      };
    } catch (error) {
      console.error("Error getting SMS statistics:", error);
      throw error;
    }
  }

  // Private helper methods
  private async sendViaSMSProvider(
    to: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Termii API format
      const payload = {
        to: to,
        from: this.senderId,
        sms: message,
        type: this.type,
        channel: this.channel,
        api_key: this.apiKey,
      };

      const response = await axios.post(`${this.baseUrl}/sms/send`, payload, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: smsConfig.settings.timeout,
      });

      // Termii returns different response structure
      if (response.data && (response.data.message_id || response.data.code === "ok")) {
        return {
          success: true,
          messageId: response.data.message_id,
        };
      } else {
        return {
          success: false,
          error: response.data?.message || "Failed to send SMS",
        };
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
        return {
          success: false,
          error: errorMessage,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private isValidNigerianPhone(phone: string): boolean {
    const nigerianPhoneRegex = /^(\+234)[789][01][0-9]{8}$/;
    return nigerianPhoneRegex.test(phone);
  }

  private processTemplate(
    template: string,
    variables: Record<string, any>
  ): string {
    let message = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      message = message.replace(new RegExp(placeholder, "g"), String(value));
    }

    return message;
  }

  private formatNaira(amount: number): string {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate SMS message content
   */
  private validateMessage(message: string): {
    isValid: boolean;
    error?: string;
  } {
    if (!message || message.trim().length === 0) {
      return { isValid: false, error: "Message cannot be empty" };
    }

    if (message.length > 1600) {
      return {
        isValid: false,
        error: "Message too long (max 1600 characters)",
      };
    }

    // Check for spam keywords (basic implementation)
    const spamKeywords = ["click here", "free money", "urgent", "winner"];
    const lowerMessage = message.toLowerCase();

    for (const keyword of spamKeywords) {
      if (lowerMessage.includes(keyword)) {
        return {
          isValid: false,
          error: `Message contains restricted keyword: ${keyword}`,
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Format phone number to international format
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, "");

    // Handle different Nigerian phone formats
    if (digits.startsWith("234")) {
      return `+${digits}`;
    } else if (digits.startsWith("0")) {
      return `+234${digits.substring(1)}`;
    } else if (digits.length === 10) {
      return `+234${digits}`;
    }

    return phone; // Return original if can't format
  }
}
