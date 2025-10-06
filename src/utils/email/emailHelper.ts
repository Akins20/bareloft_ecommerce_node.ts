import nodemailer from "nodemailer";
import { config } from "../../config/environment";
import { logger } from "../logger/winston";
import fs from "fs/promises";
import path from "path";

/**
 * Email service helper for Bareloft e-commerce platform using nodemailer
 * Uses plain HTML templates with simple variable substitution
 */
export class EmailHelper {
  private static transporter: nodemailer.Transporter;
  private static templateCache = new Map<string, string>();

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

      // Use explicit SMTP configuration for better production compatibility
      // Port 587 with STARTTLS is less likely to be blocked than port 465
      const isProduction = config.nodeEnv === 'production';
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: isProduction ? 587 : 465, // Use 587 (STARTTLS) in production, 465 (SSL) in dev
        secure: !isProduction, // true for 465 (SSL), false for 587 (STARTTLS)
        auth: {
          user: config.email.user,
          pass: config.email.password,
        },
        // Handle TLS unauthorized issues
        tls: {
          rejectUnauthorized: false
        },
        // Add connection timeout and socket timeout (in milliseconds)
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000, // 10 seconds
        socketTimeout: 10000, // 10 seconds
        // Enable debug output
        debug: config.nodeEnv === 'development',
        logger: config.nodeEnv === 'development',
        pool: false // Disable connection pooling for simpler debugging
      } as any); // Type assertion to avoid TypeScript issues with Gmail service
      console.log(`✅ Transporter created (${isProduction ? 'production' : 'development'} mode, port ${isProduction ? 587 : 465}):`, !!this.transporter);

      // Log what we're using for debugging
      if (!config.email.user || !config.email.password) {
        logger.warn("⚠️ Email credentials missing, but will still attempt to send emails");
      } else {
        logger.info("✅ Email service initialized with credentials");
      }

      // Try to verify if credentials are provided (with timeout)
      if (config.email.user && config.email.password) {
        // Don't await - verify in background to avoid blocking startup
        Promise.race([
          this.transporter.verify(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Verification timeout')), 3000))
        ])
          .then(() => {
            logger.info("✅ Email service verified successfully with nodemailer");
          })
          .catch((error) => {
            logger.warn("⚠️ Email verification failed/timeout, but will still attempt to send:", error.message);
          });
      }
    } catch (error) {
      logger.error("❌ Failed to initialize email service, creating fallback transporter:", error);
      // Create a basic transporter even if initialization fails
      const isProduction = config.nodeEnv === 'production';
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: isProduction ? 587 : 465,
        secure: !isProduction,
        auth: {
          user: config.email.user || 'fallback@gmail.com',
          pass: config.email.password || 'fallback-password',
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
        pool: false // Disable connection pooling for fallback
      } as any);
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

      logger.info(`📧 Preparing to send template email: ${template}`, {
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        template
      });

      // Load template and replace variables
      const templateContent = await this.getTemplate(template);
      const html = this.replaceVariables(templateContent, data);

      logger.info(`✅ Template loaded and variables replaced for: ${template}`);

      const result = await this.sendPlainEmail({
        to,
        subject,
        text: data.text || `Message from ${config.email.fromName}`,
        html,
        from,
        replyTo,
        attachments,
      });

      if (result) {
        logger.info(`✅ Template email sent successfully: ${template} to ${Array.isArray(to) ? to.join(', ') : to}`);
      } else {
        logger.error(`❌ Failed to send template email: ${template}`);
      }

      return result;
    } catch (error) {
      logger.error("Failed to send template email:", {
        template: options.template,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
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

      logger.info("📤 Sending email via nodemailer...", {
        to: mailOptions.to,
        subject: mailOptions.subject,
        from: mailOptions.from
      });

      // Add timeout to email sending (30 seconds)
      const sendEmailWithTimeout = Promise.race([
        this.transporter.sendMail(mailOptions),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Email sending timeout after 30 seconds')), 30000)
        )
      ]);

      const info = await sendEmailWithTimeout as any;

      logger.info("✅ Email sent successfully!", {
        messageId: info.messageId,
        to: mailOptions.to,
        subject: mailOptions.subject,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected
      });

      console.log("✅ Email delivered:", {
        to: mailOptions.to,
        subject: mailOptions.subject,
        messageId: info.messageId
      });

      return true;
    } catch (error) {
      logger.error("❌ Failed to send email:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        to: options.to,
        subject: options.subject
      });
      console.error("❌ Email error:", error);
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
   * Get email template and replace variables
   */
  private static async getTemplate(templateName: string): Promise<string> {
    const cacheKey = templateName;

    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!;
    }

    try {
      // Try .html extension first, fallback to .hbs
      let templatePath = path.join(
        __dirname,
        "..",
        "..",
        "templates",
        "email",
        `${templateName}.html`
      );

      try {
        const templateContent = await fs.readFile(templatePath, "utf-8");
        this.templateCache.set(cacheKey, templateContent);
        return templateContent;
      } catch {
        // Try .hbs extension as fallback
        templatePath = path.join(
          __dirname,
          "..",
          "..",
          "templates",
          "email",
          `${templateName}.hbs`
        );
        const templateContent = await fs.readFile(templatePath, "utf-8");
        this.templateCache.set(cacheKey, templateContent);
        return templateContent;
      }
    } catch (error) {
      logger.error(`Failed to load email template ${templateName}:`, error);

      // Return a basic template as fallback
      const fallbackTemplate = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333;">{{subject}}</h2>
            <div style="color: #555;">{{content}}</div>
          </div>
        </body>
        </html>
      `;

      this.templateCache.set(cacheKey, fallbackTemplate);
      return fallbackTemplate;
    }
  }

  /**
   * Replace template variables with actual values
   */
  private static replaceVariables(template: string, data: Record<string, any>): string {
    let result = template;

    // Replace all {{variable}} with actual values
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value ?? ''));
    }

    // Clean up any remaining unreplaced variables
    result = result.replace(/{{[^}]+}}/g, '');

    return result;
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