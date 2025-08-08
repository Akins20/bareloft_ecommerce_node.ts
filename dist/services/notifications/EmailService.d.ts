import { BaseService } from "../BaseService";
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
export declare class EmailService extends BaseService {
    private transporter;
    constructor();
    /**
     * Initialize email transporter (Nodemailer)
     */
    private initializeTransporter;
    /**
     * Send email
     */
    sendEmail(request: SendEmailRequest): Promise<string>;
    /**
     * Send order confirmation email
     */
    sendOrderConfirmation(customerEmail: string, customerName: string, orderNumber: string, orderTotal: number, orderItems: any[]): Promise<string>;
    /**
     * Send order shipped email
     */
    sendOrderShipped(customerEmail: string, customerName: string, orderNumber: string, trackingNumber?: string): Promise<string>;
    /**
     * Send welcome email
     */
    sendWelcomeEmail(customerEmail: string, customerName: string): Promise<string>;
    /**
     * Send abandoned cart email
     */
    sendAbandonedCartEmail(customerEmail: string, customerName: string, cartItems: any[], cartTotal: number): Promise<string>;
    /**
     * Send password reset email
     */
    sendPasswordResetEmail(customerEmail: string, customerName: string, resetCode: string): Promise<string>;
    private generateHtmlContent;
    private generateOrderConfirmationHtml;
    private generateWelcomeEmailHtml;
    private generateAbandonedCartHtml;
    /**
     * Validate email address
     */
    private isValidEmail;
    /**
     * Test email configuration
     */
    testEmailConnection(): Promise<boolean>;
}
//# sourceMappingURL=EmailService.d.ts.map