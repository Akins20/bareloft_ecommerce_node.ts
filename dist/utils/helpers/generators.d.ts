/**
 * ID and code generation utilities for e-commerce operations
 */
export declare class IDGenerators {
    /**
     * Generate a secure random OTP code
     */
    static generateOTP(length?: number): string;
    /**
     * Generate order number with prefix
     */
    static generateOrderNumber(): string;
    /**
     * Generate unique product SKU
     */
    static generateSKU(categoryCode?: string, productName?: string): string;
    /**
     * Generate tracking number for orders
     */
    static generateTrackingNumber(): string;
    /**
     * Generate payment reference
     */
    static generatePaymentReference(): string;
    /**
     * Generate session ID
     */
    static generateSessionId(): string;
    /**
     * Generate API key
     */
    static generateApiKey(prefix?: string): string;
    /**
     * Generate coupon code
     */
    static generateCouponCode(options?: {
        length?: number;
        prefix?: string;
        includeNumbers?: boolean;
        excludeSimilar?: boolean;
    }): string;
    /**
     * Generate barcode/EAN
     */
    static generateBarcode(): string;
    /**
     * Generate customer code
     */
    static generateCustomerCode(): string;
    /**
     * Generate invoice number
     */
    static generateInvoiceNumber(): string;
    /**
     * Generate product slug from name
     */
    static generateSlug(text: string): string;
    /**
     * Generate unique filename for uploads
     */
    static generateFileName(originalName: string, options?: {
        preserveExtension?: boolean;
        addTimestamp?: boolean;
        maxLength?: number;
    }): string;
    /**
     * Generate password reset token
     */
    static generateResetToken(): {
        token: string;
        hashedToken: string;
        expiresAt: Date;
    };
    /**
     * Generate verification token
     */
    static generateVerificationToken(): string;
    /**
     * Generate webhook signature
     */
    static generateWebhookSignature(payload: string, secret: string): string;
    /**
     * Generate batch ID for bulk operations
     */
    static generateBatchId(operation?: string): string;
    /**
     * Generate transaction reference
     */
    static generateTransactionRef(): string;
    /**
     * Generate URL-safe random string
     */
    static generateUrlSafeString(length?: number): string;
    /**
     * Generate numeric ID
     */
    static generateNumericId(length?: number): string;
    /**
     * Validate generated codes (checksum validation)
     */
    static validateOrderNumber(orderNumber: string): boolean;
    static validateSKU(sku: string): boolean;
    static validateTrackingNumber(trackingNumber: string): boolean;
    static validateBarcode(barcode: string): boolean;
    /**
     * Generate unique ticket number
     * Format: TKT-YYYYMMDD-XXXXX
     */
    static generateTicketNumber(): string;
    /**
     * Generate unique agent number based on department
     * Format: [DEPT_CODE]-XXXXX
     */
    static generateAgentNumber(department: string): string;
    /**
     * Generate return request number
     * Format: RET-YYYYMMDD-XXXXX
     */
    static generateReturnNumber(): string;
    /**
     * Generate refund number
     * Format: REF-YYYYMMDD-XXXXX
     */
    static generateRefundNumber(): string;
    /**
     * Generate Nigerian-specific transaction reference
     */
    static generateNigerianTransactionRef(): string;
    /**
     * Generate knowledge base article ID
     * Format: KB-CATEGORY-XXXXX
     */
    static generateKnowledgeBaseId(category: string): string;
}
export default IDGenerators;
//# sourceMappingURL=generators.d.ts.map