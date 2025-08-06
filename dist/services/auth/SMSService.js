"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMSService = void 0;
const axios_1 = __importDefault(require("axios"));
const environment_1 = require("../../config/environment");
const api_types_1 = require("../../types/api.types");
class SMSService {
    apiKey;
    senderId;
    baseUrl;
    constructor() {
        this.apiKey = environment_1.config.sms.apiKey;
        this.senderId = environment_1.config.sms.senderId;
        // Using a generic SMS provider URL - replace with actual Nigerian SMS provider
        this.baseUrl = "https://api.sms-provider.com/v1";
    }
    /**
     * Send SMS to Nigerian phone number
     */
    async sendSMS(data) {
        try {
            const { to, message, template, variables } = data;
            // Validate Nigerian phone number
            if (!this.isValidNigerianPhone(to)) {
                throw new api_types_1.AppError("Invalid Nigerian phone number format", api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.INVALID_INPUT);
            }
            // Process template if provided
            const finalMessage = template && variables
                ? this.processTemplate(template, variables)
                : message;
            // In development, log SMS instead of sending
            if (environment_1.config.nodeEnv === "development") {
                console.log(`📱 SMS to ${to}: ${finalMessage}`);
                return true;
            }
            // Send SMS via provider API
            const response = await this.sendViaSMSProvider(to, finalMessage);
            if (response.success) {
                console.log(`✅ SMS sent successfully to ${to}`);
                return true;
            }
            else {
                console.error(`❌ Failed to send SMS to ${to}:`, response.error);
                return false;
            }
        }
        catch (error) {
            console.error("Error sending SMS:", error);
            // In production, you might want to fail silently or use fallback
            if (environment_1.config.nodeEnv === "production") {
                // Log error but don't throw - SMS failure shouldn't block authentication
                console.error("SMS service error:", error);
                return false;
            }
            throw new api_types_1.AppError("Failed to send SMS", api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.EXTERNAL_SERVICE_ERROR);
        }
    }
    /**
     * Send OTP SMS
     */
    async sendOTP(phoneNumber, code) {
        const message = `Your Bareloft verification code is: ${code}. Valid for 10 minutes. Do not share this code.`;
        return await this.sendSMS({
            to: phoneNumber,
            message,
        });
    }
    /**
     * Send welcome SMS
     */
    async sendWelcomeSMS(phoneNumber, firstName) {
        const message = `Welcome to Bareloft, ${firstName}! 🎉 Your account has been created successfully. Start shopping now and enjoy amazing deals!`;
        return await this.sendSMS({
            to: phoneNumber,
            message,
        });
    }
    /**
     * Send order confirmation SMS
     */
    async sendOrderConfirmation(phoneNumber, orderNumber, totalAmount) {
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
    async sendOrderShipped(phoneNumber, orderNumber, trackingNumber) {
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
    async sendOrderDelivered(phoneNumber, orderNumber) {
        const message = `Your order #${orderNumber} has been delivered! We hope you love your purchase. Please rate your experience in the app. Thank you for choosing Bareloft! 🌟`;
        return await this.sendSMS({
            to: phoneNumber,
            message,
        });
    }
    /**
     * Send promotional SMS
     */
    async sendPromotionalSMS(phoneNumber, title, message, ctaUrl) {
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
    async sendBulkSMS(recipients, message) {
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
                    }
                    else {
                        failedCount++;
                        return { phoneNumber, success: false, error: "Failed to send" };
                    }
                }
                catch (error) {
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
    async checkDeliveryStatus(messageId) {
        try {
            // Implementation depends on SMS provider
            // This is a placeholder implementation
            return { status: "unknown" };
        }
        catch (error) {
            console.error("Error checking SMS delivery status:", error);
            return { status: "unknown" };
        }
    }
    /**
     * Get SMS sending statistics
     */
    async getSMSStats(dateFrom, dateTo) {
        try {
            // Implementation depends on SMS provider API
            // This is a placeholder implementation
            return {
                totalSent: 0,
                totalDelivered: 0,
                totalFailed: 0,
                cost: 0,
            };
        }
        catch (error) {
            console.error("Error getting SMS statistics:", error);
            throw error;
        }
    }
    // Private helper methods
    async sendViaSMSProvider(to, message) {
        try {
            // Replace with actual SMS provider implementation
            // Example for a generic SMS provider:
            const payload = {
                to: to,
                message: message,
                sender: this.senderId,
            };
            const response = await axios_1.default.post(`${this.baseUrl}/send`, payload, {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json",
                },
                timeout: 10000, // 10 second timeout
            });
            if (response.data.success) {
                return {
                    success: true,
                    messageId: response.data.messageId,
                };
            }
            else {
                return {
                    success: false,
                    error: response.data.error || "Unknown error",
                };
            }
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                return {
                    success: false,
                    error: error.response?.data?.message || error.message,
                };
            }
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    isValidNigerianPhone(phone) {
        const nigerianPhoneRegex = /^(\+234)[789][01][0-9]{8}$/;
        return nigerianPhoneRegex.test(phone);
    }
    processTemplate(template, variables) {
        let message = template;
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            message = message.replace(new RegExp(placeholder, "g"), String(value));
        }
        return message;
    }
    formatNaira(amount) {
        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            minimumFractionDigits: 0,
        }).format(amount);
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Validate SMS message content
     */
    validateMessage(message) {
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
    formatPhoneNumber(phone) {
        // Remove all non-digit characters
        const digits = phone.replace(/\D/g, "");
        // Handle different Nigerian phone formats
        if (digits.startsWith("234")) {
            return `+${digits}`;
        }
        else if (digits.startsWith("0")) {
            return `+234${digits.substring(1)}`;
        }
        else if (digits.length === 10) {
            return `+234${digits}`;
        }
        return phone; // Return original if can't format
    }
}
exports.SMSService = SMSService;
//# sourceMappingURL=SMSService.js.map