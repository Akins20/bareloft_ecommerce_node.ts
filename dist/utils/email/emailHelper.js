"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailHelper = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const environment_1 = require("../../config/environment");
const winston_1 = require("../logger/winston");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const handlebars_1 = __importDefault(require("handlebars"));
/**
 * Email service helper for Bareloft e-commerce platform
 */
class EmailHelper {
    static transporter;
    static templateCache = new Map();
    /**
     * Initialize email transporter
     */
    static async initialize() {
        try {
            // Configure transporter based on email service
            if (environment_1.config.email.apiKey.startsWith("SG.")) {
                // SendGrid configuration
                this.transporter = nodemailer_1.default.createTransport({
                    service: "SendGrid",
                    auth: {
                        user: "apikey",
                        pass: environment_1.config.email.apiKey,
                    },
                });
            }
            else {
                // Generic SMTP configuration
                this.transporter = nodemailer_1.default.createTransport({
                    host: process.env.SMTP_HOST || "smtp.gmail.com",
                    port: parseInt(process.env.SMTP_PORT || "587"),
                    secure: process.env.SMTP_SECURE === "true",
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    },
                });
            }
            // Verify transporter configuration
            await this.transporter.verify();
            winston_1.logger.info("Email service initialized successfully");
        }
        catch (error) {
            winston_1.logger.error("Failed to initialize email service:", error);
            throw error;
        }
    }
    /**
     * Send email using template
     */
    static async sendTemplateEmail(options) {
        try {
            const { to, template, subject, data, from = `${environment_1.config.email.fromName} <${environment_1.config.email.fromEmail}>`, replyTo, attachments, } = options;
            // Load and compile template
            const htmlContent = await this.renderTemplate(template, data);
            const textContent = this.stripHtml(htmlContent);
            // Prepare email options
            const mailOptions = {
                from,
                to: Array.isArray(to) ? to.join(", ") : to,
                subject,
                html: htmlContent,
                text: textContent,
                replyTo,
                attachments,
            };
            // Send email
            const info = await this.transporter.sendMail(mailOptions);
            winston_1.logger.info("Email sent successfully:", {
                messageId: info.messageId,
                to: mailOptions.to,
                subject: mailOptions.subject,
                template,
            });
            return true;
        }
        catch (error) {
            winston_1.logger.error("Failed to send email:", {
                error: error instanceof Error ? error.message : "Unknown error",
                template: options.template,
                to: options.to,
            });
            return false;
        }
    }
    /**
     * Send plain text email
     */
    static async sendPlainEmail(options) {
        try {
            const { to, subject, text, html, from = `${environment_1.config.email.fromName} <${environment_1.config.email.fromEmail}>`, replyTo, } = options;
            const mailOptions = {
                from,
                to: Array.isArray(to) ? to.join(", ") : to,
                subject,
                text,
                html,
                replyTo,
            };
            const info = await this.transporter.sendMail(mailOptions);
            winston_1.logger.info("Plain email sent successfully:", {
                messageId: info.messageId,
                to: mailOptions.to,
                subject: mailOptions.subject,
            });
            return true;
        }
        catch (error) {
            winston_1.logger.error("Failed to send plain email:", error);
            return false;
        }
    }
    /**
     * Send welcome email to new users
     */
    static async sendWelcomeEmail(userEmail, userData) {
        return this.sendTemplateEmail({
            to: userEmail,
            template: "welcome",
            subject: "Welcome to Bareloft! 🎉",
            data: {
                ...userData,
                supportEmail: environment_1.config.email.fromEmail,
                websiteUrl: process.env.FRONTEND_URL || "https://bareloft.com",
                year: new Date().getFullYear(),
            },
        });
    }
    /**
     * Send order confirmation email
     */
    static async sendOrderConfirmationEmail(userEmail, orderData) {
        return this.sendTemplateEmail({
            to: userEmail,
            template: "orderConfirmation",
            subject: `Order Confirmation - ${orderData.orderNumber}`,
            data: {
                ...orderData,
                formattedSubtotal: this.formatCurrency(orderData.subtotal),
                formattedTaxAmount: this.formatCurrency(orderData.taxAmount),
                formattedShippingAmount: this.formatCurrency(orderData.shippingAmount),
                formattedTotalAmount: this.formatCurrency(orderData.totalAmount),
                formattedItems: orderData.items.map((item) => ({
                    ...item,
                    formattedPrice: this.formatCurrency(item.price),
                    formattedTotal: this.formatCurrency(item.price * item.quantity),
                })),
                trackingUrl: `${process.env.FRONTEND_URL}/orders/${orderData.orderNumber}`,
                supportEmail: environment_1.config.email.fromEmail,
            },
        });
    }
    /**
     * Send order shipped email
     */
    static async sendOrderShippedEmail(userEmail, orderData) {
        return this.sendTemplateEmail({
            to: userEmail,
            template: "orderShipped",
            subject: `Your Order ${orderData.orderNumber} Has Been Shipped! 🚚`,
            data: {
                ...orderData,
                formattedDeliveryDate: this.formatDate(orderData.estimatedDelivery),
                trackingUrl: `${process.env.FRONTEND_URL}/orders/${orderData.orderNumber}/tracking`,
                supportEmail: environment_1.config.email.fromEmail,
            },
        });
    }
    /**
     * Send order delivered email
     */
    static async sendOrderDeliveredEmail(userEmail, orderData) {
        return this.sendTemplateEmail({
            to: userEmail,
            template: "orderDelivered",
            subject: `Order ${orderData.orderNumber} Delivered Successfully! ✅`,
            data: {
                ...orderData,
                formattedDeliveryDate: this.formatDate(orderData.deliveredAt),
                reviewUrl: `${process.env.FRONTEND_URL}/orders/${orderData.orderNumber}/review`,
                supportEmail: environment_1.config.email.fromEmail,
            },
        });
    }
    /**
     * Send password reset email
     */
    static async sendPasswordResetEmail(userEmail, userData) {
        return this.sendTemplateEmail({
            to: userEmail,
            template: "passwordReset",
            subject: "Reset Your Bareloft Password 🔐",
            data: {
                ...userData,
                resetUrl: `${process.env.FRONTEND_URL}/auth/reset-password?token=${userData.resetToken}`,
                formattedExpiryTime: this.formatDate(userData.expiresAt, {
                    includeTime: true,
                }),
                supportEmail: environment_1.config.email.fromEmail,
            },
        });
    }
    /**
     * Send abandoned cart email
     */
    static async sendAbandonedCartEmail(userEmail, cartData) {
        return this.sendTemplateEmail({
            to: userEmail,
            template: "abandonedCart",
            subject: "Complete Your Purchase - Items Waiting! 🛒",
            data: {
                ...cartData,
                formattedCartTotal: this.formatCurrency(cartData.cartTotal),
                checkoutUrl: `${process.env.FRONTEND_URL}/cart`,
                hoursAbandoned: Math.floor((Date.now() - cartData.abandonedAt.getTime()) / (1000 * 60 * 60)),
            },
        });
    }
    /**
     * Send low stock alert email (for admins)
     */
    static async sendLowStockAlert(adminEmail, productData) {
        return this.sendTemplateEmail({
            to: adminEmail,
            template: "lowStock",
            subject: `🔔 Low Stock Alert: ${productData.productName}`,
            data: {
                ...productData,
                dashboardUrl: `${process.env.ADMIN_URL}/inventory`,
                restockUrl: `${process.env.ADMIN_URL}/products/${productData.sku}/inventory`,
            },
        });
    }
    /**
     * Send newsletter email
     */
    static async sendNewsletterEmail(subscribers, newsletterData) {
        try {
            const results = await Promise.allSettled(subscribers.map((email) => this.sendTemplateEmail({
                to: email,
                template: "newsletter",
                subject: newsletterData.subject,
                data: {
                    ...newsletterData,
                    unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(email)}`,
                    websiteUrl: process.env.FRONTEND_URL,
                },
            })));
            const successful = results.filter((result) => result.status === "fulfilled").length;
            const failed = results.length - successful;
            winston_1.logger.info("Newsletter sent:", {
                successful,
                failed,
                total: results.length,
            });
            return failed === 0;
        }
        catch (error) {
            winston_1.logger.error("Failed to send newsletter:", error);
            return false;
        }
    }
    /**
     * Load and compile email template
     */
    static async renderTemplate(templateName, data) {
        try {
            // Check cache first
            let template = this.templateCache.get(templateName);
            if (!template) {
                // Load template from file
                const templatePath = path_1.default.join(__dirname, "templates", `${templateName}.html`);
                const templateContent = await promises_1.default.readFile(templatePath, "utf-8");
                // Compile template
                template = handlebars_1.default.compile(templateContent);
                // Cache compiled template
                this.templateCache.set(templateName, template);
            }
            // Render template with data
            return template({
                ...data,
                // Add global template variables
                currentYear: new Date().getFullYear(),
                companyName: "Bareloft",
                websiteUrl: process.env.FRONTEND_URL || "https://bareloft.com",
                supportEmail: environment_1.config.email.fromEmail,
                logoUrl: `${process.env.FRONTEND_URL}/images/logo.png`,
            });
        }
        catch (error) {
            winston_1.logger.error("Failed to render email template:", { templateName, error });
            throw new Error(`Template rendering failed: ${templateName}`);
        }
    }
    /**
     * Strip HTML tags from content
     */
    static stripHtml(html) {
        return html
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();
    }
    /**
     * Format currency for templates
     */
    static formatCurrency(amount) {
        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount);
    }
    /**
     * Format date for templates
     */
    static formatDate(date, options = {}) {
        const formatOptions = {
            timeZone: "Africa/Lagos",
            dateStyle: "long",
        };
        if (options.includeTime) {
            formatOptions.timeStyle = "short";
        }
        return new Intl.DateTimeFormat("en-NG", formatOptions).format(date);
    }
    /**
     * Validate email address
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    /**
     * Bulk email validation
     */
    static validateEmailList(emails) {
        const valid = [];
        const invalid = [];
        emails.forEach((email) => {
            if (this.isValidEmail(email)) {
                valid.push(email);
            }
            else {
                invalid.push(email);
            }
        });
        return { valid, invalid };
    }
    /**
     * Get email delivery status (for tracking)
     */
    static async getDeliveryStatus(messageId) {
        // This would integrate with your email service provider's API
        // For SendGrid, you'd use their Event Webhook or Stats API
        // For now, return a mock response
        return {
            status: "delivered",
            timestamp: new Date(),
        };
    }
    /**
     * Clean up template cache
     */
    static clearTemplateCache() {
        this.templateCache.clear();
        winston_1.logger.info("Email template cache cleared");
    }
    /**
     * Test email configuration
     */
    static async testEmailConfiguration() {
        try {
            await this.sendPlainEmail({
                to: environment_1.config.email.fromEmail,
                subject: "Bareloft Email Service Test",
                text: "This is a test email to verify the email service configuration.",
                html: "<p>This is a test email to verify the email service configuration.</p>",
            });
            winston_1.logger.info("Email configuration test successful");
            return true;
        }
        catch (error) {
            winston_1.logger.error("Email configuration test failed:", error);
            return false;
        }
    }
}
exports.EmailHelper = EmailHelper;
exports.default = EmailHelper;
//# sourceMappingURL=emailHelper.js.map