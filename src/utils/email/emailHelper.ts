import nodemailer from "nodemailer";
import { config } from "../../config/environment";
import { logger } from "../logger/winston";
import fs from "fs/promises";
import path from "path";
import handlebars from "handlebars";

/**
 * Email service helper for Bareloft e-commerce platform
 */
export class EmailHelper {
  private static transporter: nodemailer.Transporter;
  private static templateCache = new Map<string, HandlebarsTemplateDelegate>();

  /**
   * Initialize email transporter
   */
  static async initialize(): Promise<void> {
    try {
      // Configure transporter based on email service
      if (config.email.apiKey.startsWith("SG.")) {
        // SendGrid configuration
        this.transporter = nodemailer.createTransport({
          service: "SendGrid",
          auth: {
            user: "apikey",
            pass: config.email.apiKey,
          },
        });
      } else {
        // Generic SMTP configuration
        this.transporter = nodemailer.createTransport({
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
      logger.info("Email service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize email service:", error);
      throw error;
    }
  }

  /**
   * Send email using template
   */
  static async sendTemplateEmail(options: {
    to: string | string[];
    template: string;
    subject: string;
    data: Record<string, any>;
    from?: string;
    replyTo?: string;
    attachments?: Array<{
      filename: string;
      content: Buffer | string;
      contentType?: string;
    }>;
  }): Promise<boolean> {
    try {
      const {
        to,
        template,
        subject,
        data,
        from = `${config.email.fromName} <${config.email.fromEmail}>`,
        replyTo,
        attachments,
      } = options;

      // Load and compile template
      const htmlContent = await this.renderTemplate(template, data);
      const textContent = this.stripHtml(htmlContent);

      // Prepare email options
      const mailOptions: nodemailer.SendMailOptions = {
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

      logger.info("Email sent successfully:", {
        messageId: info.messageId,
        to: mailOptions.to,
        subject: mailOptions.subject,
        template,
      });

      return true;
    } catch (error) {
      logger.error("Failed to send email:", {
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
  static async sendPlainEmail(options: {
    to: string | string[];
    subject: string;
    text: string;
    html?: string;
    from?: string;
    replyTo?: string;
  }): Promise<boolean> {
    try {
      const {
        to,
        subject,
        text,
        html,
        from = `${config.email.fromName} <${config.email.fromEmail}>`,
        replyTo,
      } = options;

      const mailOptions: nodemailer.SendMailOptions = {
        from,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
        text,
        html,
        replyTo,
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info("Plain email sent successfully:", {
        messageId: info.messageId,
        to: mailOptions.to,
        subject: mailOptions.subject,
      });

      return true;
    } catch (error) {
      logger.error("Failed to send plain email:", error);
      return false;
    }
  }

  /**
   * Send welcome email to new users
   */
  static async sendWelcomeEmail(
    userEmail: string,
    userData: {
      firstName: string;
      lastName: string;
      phoneNumber: string;
    }
  ): Promise<boolean> {
    return this.sendTemplateEmail({
      to: userEmail,
      template: "welcome",
      subject: "Welcome to Bareloft! 🎉",
      data: {
        ...userData,
        supportEmail: config.email.fromEmail,
        websiteUrl: process.env.FRONTEND_URL || "https://bareloft.com",
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Send order confirmation email
   */
  static async sendOrderConfirmationEmail(
    userEmail: string,
    orderData: {
      orderNumber: string;
      customerName: string;
      items: Array<{
        name: string;
        quantity: number;
        price: number;
        image?: string;
      }>;
      subtotal: number;
      taxAmount: number;
      shippingAmount: number;
      totalAmount: number;
      shippingAddress: any;
      estimatedDelivery?: Date;
    }
  ): Promise<boolean> {
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
        supportEmail: config.email.fromEmail,
      },
    });
  }

  /**
   * Send order shipped email
   */
  static async sendOrderShippedEmail(
    userEmail: string,
    orderData: {
      orderNumber: string;
      customerName: string;
      trackingNumber: string;
      estimatedDelivery: Date;
      shippingAddress: any;
    }
  ): Promise<boolean> {
    return this.sendTemplateEmail({
      to: userEmail,
      template: "orderShipped",
      subject: `Your Order ${orderData.orderNumber} Has Been Shipped! 🚚`,
      data: {
        ...orderData,
        formattedDeliveryDate: this.formatDate(orderData.estimatedDelivery),
        trackingUrl: `${process.env.FRONTEND_URL}/orders/${orderData.orderNumber}/tracking`,
        supportEmail: config.email.fromEmail,
      },
    });
  }

  /**
   * Send order delivered email
   */
  static async sendOrderDeliveredEmail(
    userEmail: string,
    orderData: {
      orderNumber: string;
      customerName: string;
      deliveredAt: Date;
    }
  ): Promise<boolean> {
    return this.sendTemplateEmail({
      to: userEmail,
      template: "orderDelivered",
      subject: `Order ${orderData.orderNumber} Delivered Successfully! ✅`,
      data: {
        ...orderData,
        formattedDeliveryDate: this.formatDate(orderData.deliveredAt),
        reviewUrl: `${process.env.FRONTEND_URL}/orders/${orderData.orderNumber}/review`,
        supportEmail: config.email.fromEmail,
      },
    });
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(
    userEmail: string,
    userData: {
      firstName: string;
      resetToken: string;
      expiresAt: Date;
    }
  ): Promise<boolean> {
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
        supportEmail: config.email.fromEmail,
      },
    });
  }

  /**
   * Send abandoned cart email
   */
  static async sendAbandonedCartEmail(
    userEmail: string,
    cartData: {
      customerName: string;
      items: Array<{
        name: string;
        price: number;
        image?: string;
      }>;
      cartTotal: number;
      abandonedAt: Date;
    }
  ): Promise<boolean> {
    return this.sendTemplateEmail({
      to: userEmail,
      template: "abandonedCart",
      subject: "Complete Your Purchase - Items Waiting! 🛒",
      data: {
        ...cartData,
        formattedCartTotal: this.formatCurrency(cartData.cartTotal),
        checkoutUrl: `${process.env.FRONTEND_URL}/cart`,
        hoursAbandoned: Math.floor(
          (Date.now() - cartData.abandonedAt.getTime()) / (1000 * 60 * 60)
        ),
      },
    });
  }

  /**
   * Send low stock alert email (for admins)
   */
  static async sendLowStockAlert(
    adminEmail: string,
    productData: {
      productName: string;
      sku: string;
      currentStock: number;
      lowStockThreshold: number;
    }
  ): Promise<boolean> {
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
  static async sendNewsletterEmail(
    subscribers: string[],
    newsletterData: {
      subject: string;
      title: string;
      content: string;
      featuredProducts?: Array<{
        name: string;
        price: number;
        image: string;
        url: string;
      }>;
    }
  ): Promise<boolean> {
    try {
      const results = await Promise.allSettled(
        subscribers.map((email) =>
          this.sendTemplateEmail({
            to: email,
            template: "newsletter",
            subject: newsletterData.subject,
            data: {
              ...newsletterData,
              unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(email)}`,
              websiteUrl: process.env.FRONTEND_URL,
            },
          })
        )
      );

      const successful = results.filter(
        (result) => result.status === "fulfilled"
      ).length;
      const failed = results.length - successful;

      logger.info("Newsletter sent:", {
        successful,
        failed,
        total: results.length,
      });

      return failed === 0;
    } catch (error) {
      logger.error("Failed to send newsletter:", error);
      return false;
    }
  }

  /**
   * Load and compile email template
   */
  private static async renderTemplate(
    templateName: string,
    data: Record<string, any>
  ): Promise<string> {
    try {
      // Check cache first
      let template = this.templateCache.get(templateName);

      if (!template) {
        // Load template from file
        const templatePath = path.join(
          __dirname,
          "templates",
          `${templateName}.html`
        );
        const templateContent = await fs.readFile(templatePath, "utf-8");

        // Compile template
        template = handlebars.compile(templateContent);

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
        supportEmail: config.email.fromEmail,
        logoUrl: `${process.env.FRONTEND_URL}/images/logo.png`,
      });
    } catch (error) {
      logger.error("Failed to render email template:", { templateName, error });
      throw new Error(`Template rendering failed: ${templateName}`);
    }
  }

  /**
   * Strip HTML tags from content
   */
  private static stripHtml(html: string): string {
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
  private static formatCurrency(amount: number): string {
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
  private static formatDate(
    date: Date,
    options: { includeTime?: boolean } = {}
  ): string {
    const formatOptions: Intl.DateTimeFormatOptions = {
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
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Bulk email validation
   */
  static validateEmailList(emails: string[]): {
    valid: string[];
    invalid: string[];
  } {
    const valid: string[] = [];
    const invalid: string[] = [];

    emails.forEach((email) => {
      if (this.isValidEmail(email)) {
        valid.push(email);
      } else {
        invalid.push(email);
      }
    });

    return { valid, invalid };
  }

  /**
   * Get email delivery status (for tracking)
   */
  static async getDeliveryStatus(messageId: string): Promise<{
    status: "delivered" | "bounced" | "complained" | "pending";
    timestamp?: Date;
    reason?: string;
  }> {
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
  static clearTemplateCache(): void {
    this.templateCache.clear();
    logger.info("Email template cache cleared");
  }

  /**
   * Test email configuration
   */
  static async testEmailConfiguration(): Promise<boolean> {
    try {
      await this.sendPlainEmail({
        to: config.email.fromEmail,
        subject: "Bareloft Email Service Test",
        text: "This is a test email to verify the email service configuration.",
        html: "<p>This is a test email to verify the email service configuration.</p>",
      });

      logger.info("Email configuration test successful");
      return true;
    } catch (error) {
      logger.error("Email configuration test failed:", error);
      return false;
    }
  }
}

export default EmailHelper;
