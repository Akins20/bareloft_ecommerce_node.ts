import nodemailer from "nodemailer";
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
 * Email service helper for Bareloft e-commerce platform using nodemailer
 */
export class EmailHelper {
  private static transporter: nodemailer.Transporter;
  private static templateCache = new Map<string, HandlebarsTemplateDelegate>();

  /**
   * Initialize email transporter with nodemailer
   */
  static async initialize(): Promise<void> {
    try {
      // Debug log the email configuration
      console.log("🔍 Email config debug:", {
        user: config.email.user ? `${config.email.user.substring(0, 3)}***` : 'NOT SET',
        password: config.email.password ? `***${config.email.password.length} chars***` : 'NOT SET',
        fromEmail: config.email.fromEmail,
      });

      // Create nodemailer transporter with the available credentials
      console.log("🔧 Creating nodemailer transporter...");
      this.transporter = nodemailer.createTransport({
        service: 'gmail', // Use Gmail service
        auth: {
          user: config.email.user,
          pass: config.email.password,
        },
        // Handle TLS unauthorized issues
        tls: {
          rejectUnauthorized: false
        }
      });
      console.log("✅ Transporter created:", !!this.transporter);

      // Log what we're using for debugging
      if (!config.email.user || !config.email.password) {
        logger.warn("⚠️ Email credentials missing, but will still attempt to send emails");
      } else {
        logger.info("✅ Email service initialized with credentials");
      }

      // Try to verify if credentials are provided
      if (config.email.user && config.email.password) {
        try {
          await this.transporter.verify();
          logger.info("✅ Email service verified successfully with nodemailer");
        } catch (error) {
          logger.warn("⚠️ Email verification failed, but will still attempt to send:", error);
        }
      }
    } catch (error) {
      logger.error("❌ Failed to initialize email service, creating fallback transporter:", error);
      // Create a basic transporter even if initialization fails
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.email.user || 'fallback@gmail.com',
          pass: config.email.password || 'fallback-password',
        },
        tls: {
          rejectUnauthorized: false
        }
      });
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
        replyTo = config.email.replyTo,
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
        from = `${config.email.fromName} <${config.email.fromEmail}>`,
        replyTo = config.email.replyTo,
        attachments,
      } = options;

      const mailOptions: nodemailer.SendMailOptions = {
        from,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
        text,
        html,
        replyTo,
        attachments,
      };

      // Check if transporter is available
      if (!this.transporter) {
        logger.error("❌ Email transporter not initialized. Cannot send email.");
        console.log("🔍 Debug: Transporter status:", {
          transporterExists: !!this.transporter,
          configUser: !!config.email.user,
          configPassword: !!config.email.password,
        });
        throw new Error("Email service not properly initialized");
      }

      // Always attempt to send the email through nodemailer
      const info = await this.transporter.sendMail(mailOptions);

      logger.info("Email sent successfully:", {
        messageId: info.messageId,
        to: mailOptions.to,
        subject: mailOptions.subject,
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
      if (!this.transporter) {
        logger.info("Email service is in development mode");
        return true;
      }

      await this.transporter.verify();
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
      subject: "Test Email from Bareloft",
      text: "This is a test email to verify your email configuration is working correctly.",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Test Email from Bareloft</h2>
          <p>This is a test email to verify your email configuration is working correctly.</p>
          <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
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