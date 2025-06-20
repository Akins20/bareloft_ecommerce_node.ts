import { BaseService } from "../BaseService";
import { EmailNotification } from "../../types";
import nodemailer from "nodemailer";
import { emailConfig } from "../../config";

export interface SendEmailRequest {
  to: string;
  subject: string;
  message: string;
  htmlContent?: string;
  recipientName?: string;
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content?: Buffer;
  path?: string;
  contentType?: string;
}

export class EmailService extends BaseService {
  private transporter: nodemailer.Transporter;

  constructor() {
    super();
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter (SendGrid/SMTP)
   */
  private initializeTransporter(): void {
    if (emailConfig.provider === "sendgrid") {
      this.transporter = nodemailer.createTransporter({
        service: "SendGrid",
        auth: {
          user: "apikey",
          pass: emailConfig.sendgrid.apiKey,
        },
      });
    } else {
      // SMTP fallback
      this.transporter = nodemailer.createTransporter({
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port,
        secure: emailConfig.smtp.secure,
        auth: {
          user: emailConfig.smtp.user,
          pass: emailConfig.smtp.password,
        },
      });
    }
  }

  /**
   * Send email
   */
  async sendEmail(request: SendEmailRequest): Promise<string> {
    try {
      const mailOptions = {
        from: request.from || emailConfig.defaultFrom,
        to: request.to,
        subject: request.subject,
        text: request.message,
        html:
          request.htmlContent ||
          this.generateHtmlContent(request.message, request.recipientName),
        replyTo: request.replyTo,
        attachments: request.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);

      return result.messageId;
    } catch (error) {
      this.handleError("Error sending email", error);
      throw error;
    }
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(
    customerEmail: string,
    customerName: string,
    orderNumber: string,
    orderTotal: number,
    orderItems: any[]
  ): Promise<string> {
    const subject = `Order Confirmation - ${orderNumber}`;
    const message = `Hi ${customerName}, your order ${orderNumber} has been confirmed. Total: ₦${orderTotal.toLocaleString()}`;

    const htmlContent = this.generateOrderConfirmationHtml({
      customerName,
      orderNumber,
      orderTotal,
      orderItems,
    });

    return this.sendEmail({
      to: customerEmail,
      subject,
      message,
      htmlContent,
      recipientName: customerName,
    });
  }

  /**
   * Send order shipped email
   */
  async sendOrderShipped(
    customerEmail: string,
    customerName: string,
    orderNumber: string,
    trackingNumber?: string
  ): Promise<string> {
    const subject = `Your Order Has Been Shipped - ${orderNumber}`;
    const message = `Hi ${customerName}, your order ${orderNumber} has been shipped.${
      trackingNumber ? ` Tracking: ${trackingNumber}` : ""
    }`;

    return this.sendEmail({
      to: customerEmail,
      subject,
      message,
      recipientName: customerName,
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(
    customerEmail: string,
    customerName: string
  ): Promise<string> {
    const subject = "Welcome to Bareloft! 🛍️";
    const message = `Hi ${customerName}, welcome to Bareloft! Start exploring our amazing products.`;

    const htmlContent = this.generateWelcomeEmailHtml(customerName);

    return this.sendEmail({
      to: customerEmail,
      subject,
      message,
      htmlContent,
      recipientName: customerName,
    });
  }

  /**
   * Send abandoned cart email
   */
  async sendAbandonedCartEmail(
    customerEmail: string,
    customerName: string,
    cartItems: any[],
    cartTotal: number
  ): Promise<string> {
    const subject = "You Left Something in Your Cart 🛒";
    const message = `Hi ${customerName}, you have ${cartItems.length} items waiting in your cart. Complete your purchase now!`;

    const htmlContent = this.generateAbandonedCartHtml({
      customerName,
      cartItems,
      cartTotal,
    });

    return this.sendEmail({
      to: customerEmail,
      subject,
      message,
      htmlContent,
      recipientName: customerName,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    customerEmail: string,
    customerName: string,
    resetCode: string
  ): Promise<string> {
    const subject = "Password Reset Request";
    const message = `Hi ${customerName}, your password reset code is: ${resetCode}. This code expires in 10 minutes.`;

    return this.sendEmail({
      to: customerEmail,
      subject,
      message,
      recipientName: customerName,
    });
  }

  // Private HTML template generators

  private generateHtmlContent(message: string, recipientName?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bareloft</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2D5CFF; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; }
          .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
          .button { background: #2D5CFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bareloft</h1>
          </div>
          <div class="content">
            ${recipientName ? `<p>Hi ${recipientName},</p>` : ""}
            <p>${message}</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Bareloft. All rights reserved.</p>
            <p>Lagos, Nigeria</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateOrderConfirmationHtml(data: {
    customerName: string;
    orderNumber: string;
    orderTotal: number;
    orderItems: any[];
  }): string {
    const itemsHtml = data.orderItems
      .map(
        (item) => `
      <tr>
        <td>${item.productName}</td>
        <td>${item.quantity}</td>
        <td>₦${item.unitPrice.toLocaleString()}</td>
        <td>₦${item.totalPrice.toLocaleString()}</td>
      </tr>
    `
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: #2D5CFF; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background: #f5f5f5; }
          .total { font-weight: bold; font-size: 18px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmation</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            <p>Thank you for your order! Here are the details:</p>
            
            <h3>Order Number: ${data.orderNumber}</h3>
            
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <p class="total">Total: ₦${data.orderTotal.toLocaleString()}</p>
            
            <p>We'll send you another email when your order ships.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateWelcomeEmailHtml(customerName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Bareloft</title>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #2D5CFF, #1E40AF); color: white; padding: 40px 20px; text-align: center; }
          .content { padding: 40px 30px; }
          .button { background: #2D5CFF; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; }
          .features { display: flex; gap: 20px; margin: 30px 0; }
          .feature { flex: 1; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛍️ Welcome to Bareloft!</h1>
            <p>Your journey to amazing products starts here</p>
          </div>
          <div class="content">
            <p>Hi ${customerName},</p>
            <p>Welcome to Bareloft! We're excited to have you join our community of happy shoppers.</p>
            
            <div class="features">
              <div class="feature">
                <h4>🚚 Fast Delivery</h4>
                <p>Quick delivery across Nigeria</p>
              </div>
              <div class="feature">
                <h4>💯 Quality Products</h4>
                <p>Only the best for our customers</p>
              </div>
              <div class="feature">
                <h4>🔒 Secure Shopping</h4>
                <p>Safe and secure payments</p>
              </div>
            </div>
            
            <a href="${process.env.FRONTEND_URL}/products" class="button">Start Shopping Now</a>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateAbandonedCartHtml(data: {
    customerName: string;
    cartItems: any[];
    cartTotal: number;
  }): string {
    const itemsHtml = data.cartItems
      .slice(0, 3)
      .map(
        (item) => `
      <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
        <h4 style="margin: 0;">${item.productName}</h4>
        <p>Quantity: ${item.quantity} | Price: ₦${item.unitPrice.toLocaleString()}</p>
      </div>
    `
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Complete Your Purchase</title>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: #FF6B6B; color: white; padding: 30px 20px; text-align: center; }
          .content { padding: 30px; }
          .button { background: #2D5CFF; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; }
          .urgent { background: #FFF3CD; border: 1px solid #FFEAA7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛒 Don't Miss Out!</h1>
            <p>Your cart is waiting for you</p>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            <p>You left some amazing items in your cart. Complete your purchase before they're gone!</p>
            
            <div class="urgent">
              <strong>⏰ Limited Time:</strong> Items in your cart are in high demand!
            </div>
            
            <h3>Your Cart Items:</h3>
            ${itemsHtml}
            ${data.cartItems.length > 3 ? `<p>...and ${data.cartItems.length - 3} more items</p>` : ""}
            
            <p><strong>Cart Total: ₦${data.cartTotal.toLocaleString()}</strong></p>
            
            <a href="${process.env.FRONTEND_URL}/cart" class="button">Complete Your Purchase</a>
            
            <p>Need help? Our customer support team is here for you!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Validate email address
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Test email configuration
   */
  async testEmailConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.handleError("Email configuration test failed", error);
      return false;
    }
  }
}
