import { Resend } from "resend";
import { config } from "../../config/environment";
import { logger } from "../logger/winston";
import fs from "fs/promises";
import path from "path";
import handlebars from "handlebars";

// Register Handlebars helpers
handlebars.registerHelper('lte', function(a: any, b: any) {
  return a <= b;
});

handlebars.registerHelper('eq', function(a: any, b: any) {
  return a === b;
});

/**
 * Email service helper for Bareloft e-commerce platform using Resend API
 */
export class EmailHelper {
  private static resend: Resend;
  private static templateCache = new Map<string, HandlebarsTemplateDelegate>();

  /**
   * Initialize email service with Resend API
   */
  static async initialize(): Promise<void> {
    try {
      // Debug log the email configuration
      console.log("🔍 Email config debug:", {
        apiKey: config.email.resendApiKey ? `${config.email.resendApiKey.substring(0, 6)}***` : 'NOT SET',
        fromEmail: config.email.fromEmail,
        fromName: config.email.fromName,
      });

      // Initialize Resend with API key
      console.log("🔧 Creating Resend client...");
      this.resend = new Resend(config.email.resendApiKey);
      console.log("✅ Resend client created:", !!this.resend);

      if (!config.email.resendApiKey) {
        logger.warn("⚠️ Resend API key missing, email functionality will not work");
      } else {
        logger.info("✅ Email service initialized with Resend API");
      }
    } catch (error) {
      logger.error("❌ Failed to initialize email service:", error);
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
        from,
        replyTo,
        attachments,
      } = options;

      // Load and compile template
      const compiledTemplate = await this.getTemplate(template);
      const html = compiledTemplate(data);

      return await this.sendPlainEmail({
        to,
        subject,
        text: data.text || `Message from ${config.email.fromName}`,
        html,
        from,
        replyTo,
        attachments,
      });
    } catch (error) {
      logger.error("Failed to send template email:", error);
      return false;
    }
  }

  /**
   * Send plain email without template
   */
  static async sendPlainEmail(options: {
    to: string | string[];
    subject: string;
    text: string;
    html?: string;
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
        subject,
        text,
        html,
        from,
        replyTo,
        attachments,
      } = options;

      // Check if Resend client is available
      if (!this.resend) {
        logger.error("❌ Resend client not initialized. Cannot send email.");
        throw new Error("Email service not properly initialized");
      }

      // Prepare from address
      const fromAddress = from || `${config.email.fromName} <${config.email.fromEmail}>`;

      // Convert attachments to Resend format if provided
      const resendAttachments = attachments?.map(att => ({
        filename: att.filename,
        content: Buffer.isBuffer(att.content)
          ? att.content
          : Buffer.from(att.content),
      }));

      // Send email using Resend API
      const result = await this.resend.emails.send({
        from: fromAddress,
        to: Array.isArray(to) ? to : [to],
        subject,
        text,
        html: html || text,
        reply_to: replyTo || config.email.replyTo,
        attachments: resendAttachments,
      });

      logger.info("Email sent successfully:", {
        id: result.data?.id,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
      });

      return true;
    } catch (error) {
      logger.error("Failed to send email:", error);
      return false;
    }
  }

  /**
   * Send bulk emails
   */
  static async sendBulkEmails(emails: Array<{
    to: string;
    subject: string;
    text: string;
    html?: string;
    from?: string;
    replyTo?: string;
  }>): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const email of emails) {
      try {
        const success = await this.sendPlainEmail(email);
        if (success) {
          sent++;
        } else {
          failed++;
        }

        // Add small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        logger.error(`Failed to send bulk email to ${email.to}:`, error);
      }
    }

    logger.info(`Bulk email completed: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  }

  /**
   * Get and compile email template
   */
  private static async getTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
    const cacheKey = templateName;

    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!;
    }

    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "..",
        "templates",
        "email",
        `${templateName}.hbs`
      );

      const templateContent = await fs.readFile(templatePath, "utf-8");
      const compiledTemplate = handlebars.compile(templateContent);

      this.templateCache.set(cacheKey, compiledTemplate);
      return compiledTemplate;
    } catch (error) {
      logger.error(`Failed to load email template ${templateName}:`, error);

      // Return a basic template as fallback
      const fallbackTemplate = handlebars.compile(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>{{subject}}</h2>
          <div>{{{content}}}</div>
        </div>
      `);

      this.templateCache.set(cacheKey, fallbackTemplate);
      return fallbackTemplate;
    }
  }

  /**
   * Clear template cache
   */
  static clearTemplateCache(): void {
    this.templateCache.clear();
    logger.info("Email template cache cleared");
  }

  /**
   * Test email configuration
   */
  static async testConfiguration(): Promise<boolean> {
    try {
      if (!this.resend) {
        logger.warn("Email service not initialized");
        return false;
      }

      if (!config.email.resendApiKey) {
        logger.warn("Resend API key not configured");
        return false;
      }

      logger.info("✅ Email configuration test passed");
      return true;
    } catch (error) {
      logger.error("❌ Email configuration test failed:", error);
      return false;
    }
  }

  /**
   * Send test email
   */
  static async sendTestEmail(to: string): Promise<boolean> {
    return await this.sendPlainEmail({
      to,
      subject: "Test Email from Bareloft - Resend API",
      text: "This is a test email to verify your Resend email configuration is working correctly.",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Test Email from Bareloft</h2>
          <p>This is a test email to verify your <strong>Resend</strong> email configuration is working correctly.</p>
          <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 11px;">Powered by Resend API</p>
        </div>
      `,
    });
  }

  /**
   * Validate email address format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export default EmailHelper;
