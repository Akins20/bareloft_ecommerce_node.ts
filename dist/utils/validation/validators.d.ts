/**
 * Custom validators for Nigerian e-commerce platform
 */
export declare class CustomValidators {
    /**
     * Validate Nigerian phone number
     */
    static isValidNigerianPhone(phone: string): boolean;
    /**
     * Validate Nigerian postal code
     */
    static isValidNigerianPostalCode(code: string): boolean;
    /**
     * Validate email address
     */
    static isValidEmail(email: string): boolean;
    /**
     * Validate product SKU
     */
    static isValidSKU(sku: string): boolean;
    /**
     * Validate order number
     */
    static isValidOrderNumber(orderNumber: string): boolean;
    /**
     * Validate price (Nigerian Naira)
     */
    static isValidPrice(price: number): boolean;
    /**
     * Validate quantity
     */
    static isValidQuantity(quantity: number): boolean;
    /**
     * Validate Nigerian state
     */
    static isValidNigerianState(state: string): boolean;
    /**
     * Validate UUID
     */
    static isValidUUID(uuid: string): boolean;
    /**
     * Validate password strength
     */
    static isStrongPassword(password: string): {
        isValid: boolean;
        errors: string[];
    };
    /**
     * Validate date range
     */
    static isValidDateRange(startDate: Date, endDate: Date): boolean;
    /**
     * Validate file size
     */
    static isValidFileSize(size: number, maxSize: number): boolean;
    /**
     * Validate file extension
     */
    static isValidFileExtension(filename: string, allowedExtensions: string[]): boolean;
    /**
     * Validate URL
     */
    static isValidURL(url: string): boolean;
    /**
     * Validate slug (URL-friendly string)
     */
    static isValidSlug(slug: string): boolean;
    /**
     * Validate hex color
     */
    static isValidHexColor(color: string): boolean;
    /**
     * Validate rating (1-5 stars)
     */
    static isValidRating(rating: number): boolean;
    /**
     * Validate discount percentage
     */
    static isValidDiscountPercentage(discount: number): boolean;
    /**
     * Validate inventory quantity
     */
    static isValidInventoryQuantity(quantity: number): boolean;
    /**
     * Validate weight (in kg)
     */
    static isValidWeight(weight: number): boolean;
    /**
     * Validate dimensions
     */
    static isValidDimensions(length: number, width: number, height: number): boolean;
    /**
     * Validate Nigerian bank account number
     */
    static isValidNigerianAccountNumber(accountNumber: string): boolean;
    /**
     * Validate BVN (Bank Verification Number)
     */
    static isValidBVN(bvn: string): boolean;
    /**
     * Validate age (minimum 13 years old)
     */
    static isValidAge(birthDate: Date): boolean;
    /**
     * Validate business hours
     */
    static isValidBusinessHours(time: string): boolean;
    /**
     * Validate credit card number (basic Luhn algorithm)
     */
    static isValidCreditCard(cardNumber: string): boolean;
}
export default CustomValidators;
//# sourceMappingURL=validators.d.ts.map