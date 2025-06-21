/**
 * Email service helper for Bareloft e-commerce platform
 */
export declare class EmailHelper {
    private static transporter;
    private static templateCache;
    /**
     * Initialize email transporter
     */
    static initialize(): Promise<void>;
    /**
     * Send email using template
     */
    static sendTemplateEmail(options: {
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
    }): Promise<boolean>;
    /**
     * Send plain text email
     */
    static sendPlainEmail(options: {
        to: string | string[];
        subject: string;
        text: string;
        html?: string;
        from?: string;
        replyTo?: string;
    }): Promise<boolean>;
    /**
     * Send welcome email to new users
     */
    static sendWelcomeEmail(userEmail: string, userData: {
        firstName: string;
        lastName: string;
        phoneNumber: string;
    }): Promise<boolean>;
    /**
     * Send order confirmation email
     */
    static sendOrderConfirmationEmail(userEmail: string, orderData: {
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
    }): Promise<boolean>;
    /**
     * Send order shipped email
     */
    static sendOrderShippedEmail(userEmail: string, orderData: {
        orderNumber: string;
        customerName: string;
        trackingNumber: string;
        estimatedDelivery: Date;
        shippingAddress: any;
    }): Promise<boolean>;
    /**
     * Send order delivered email
     */
    static sendOrderDeliveredEmail(userEmail: string, orderData: {
        orderNumber: string;
        customerName: string;
        deliveredAt: Date;
    }): Promise<boolean>;
    /**
     * Send password reset email
     */
    static sendPasswordResetEmail(userEmail: string, userData: {
        firstName: string;
        resetToken: string;
        expiresAt: Date;
    }): Promise<boolean>;
    /**
     * Send abandoned cart email
     */
    static sendAbandonedCartEmail(userEmail: string, cartData: {
        customerName: string;
        items: Array<{
            name: string;
            price: number;
            image?: string;
        }>;
        cartTotal: number;
        abandonedAt: Date;
    }): Promise<boolean>;
    /**
     * Send low stock alert email (for admins)
     */
    static sendLowStockAlert(adminEmail: string, productData: {
        productName: string;
        sku: string;
        currentStock: number;
        lowStockThreshold: number;
    }): Promise<boolean>;
    /**
     * Send newsletter email
     */
    static sendNewsletterEmail(subscribers: string[], newsletterData: {
        subject: string;
        title: string;
        content: string;
        featuredProducts?: Array<{
            name: string;
            price: number;
            image: string;
            url: string;
        }>;
    }): Promise<boolean>;
    /**
     * Load and compile email template
     */
    private static renderTemplate;
    /**
     * Strip HTML tags from content
     */
    private static stripHtml;
    /**
     * Format currency for templates
     */
    private static formatCurrency;
    /**
     * Format date for templates
     */
    private static formatDate;
    /**
     * Validate email address
     */
    static isValidEmail(email: string): boolean;
    /**
     * Bulk email validation
     */
    static validateEmailList(emails: string[]): {
        valid: string[];
        invalid: string[];
    };
    /**
     * Get email delivery status (for tracking)
     */
    static getDeliveryStatus(messageId: string): Promise<{
        status: "delivered" | "bounced" | "complained" | "pending";
        timestamp?: Date;
        reason?: string;
    }>;
    /**
     * Clean up template cache
     */
    static clearTemplateCache(): void;
    /**
     * Test email configuration
     */
    static testEmailConfiguration(): Promise<boolean>;
}
export default EmailHelper;
//# sourceMappingURL=emailHelper.d.ts.map