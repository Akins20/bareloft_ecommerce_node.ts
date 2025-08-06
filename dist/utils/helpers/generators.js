"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IDGenerators = void 0;
const crypto_1 = __importDefault(require("crypto"));
const nanoid_1 = require("nanoid");
/**
 * ID and code generation utilities for e-commerce operations
 */
class IDGenerators {
    /**
     * Generate a secure random OTP code
     */
    static generateOTP(length = 6) {
        const digits = "0123456789";
        let otp = "";
        for (let i = 0; i < length; i++) {
            otp += digits[crypto_1.default.randomInt(0, digits.length)];
        }
        return otp;
    }
    /**
     * Generate order number with prefix
     */
    static generateOrderNumber() {
        const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
        const random = crypto_1.default.randomInt(1000, 9999); // 4-digit random number
        return `BL${timestamp}${random}`;
    }
    /**
     * Generate unique product SKU
     */
    static generateSKU(categoryCode = "GEN", productName) {
        const timestamp = Date.now().toString().slice(-6); // Last 6 digits
        const random = crypto_1.default.randomInt(100, 999); // 3-digit random
        let sku = categoryCode.toUpperCase().substring(0, 3);
        // Add product initials if provided
        if (productName) {
            const initials = productName
                .split(" ")
                .map((word) => word.charAt(0))
                .join("")
                .toUpperCase()
                .substring(0, 3);
            sku += initials;
        }
        sku += timestamp + random;
        return sku;
    }
    /**
     * Generate tracking number for orders
     */
    static generateTrackingNumber() {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const nanoid = (0, nanoid_1.customAlphabet)(alphabet, 12);
        return `BL${nanoid()}`;
    }
    /**
     * Generate payment reference
     */
    static generatePaymentReference() {
        const timestamp = Date.now().toString();
        const random = crypto_1.default.randomBytes(4).toString("hex").toUpperCase();
        return `BL_PAY_${timestamp}_${random}`;
    }
    /**
     * Generate session ID
     */
    static generateSessionId() {
        return crypto_1.default.randomBytes(32).toString("hex");
    }
    /**
     * Generate API key
     */
    static generateApiKey(prefix = "bl") {
        const timestamp = Date.now().toString(36);
        const random = crypto_1.default.randomBytes(16).toString("hex");
        return `${prefix}_${timestamp}_${random}`;
    }
    /**
     * Generate coupon code
     */
    static generateCouponCode(options = {}) {
        const { length = 8, prefix = "", includeNumbers = true, excludeSimilar = true, } = options;
        let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        if (includeNumbers) {
            chars += "0123456789";
        }
        if (excludeSimilar) {
            // Remove similar looking characters
            chars = chars.replace(/[0O1IL]/g, "");
        }
        const nanoid = (0, nanoid_1.customAlphabet)(chars, length);
        const code = nanoid();
        return prefix ? `${prefix.toUpperCase()}${code}` : code;
    }
    /**
     * Generate barcode/EAN
     */
    static generateBarcode() {
        // Generate 13-digit EAN-13 barcode
        let barcode = "";
        // First 12 digits (country code + manufacturer + product)
        for (let i = 0; i < 12; i++) {
            barcode += crypto_1.default.randomInt(0, 10).toString();
        }
        // Calculate check digit
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            const digit = parseInt(barcode[i] || "0");
            sum += i % 2 === 0 ? digit : digit * 3;
        }
        const checkDigit = (10 - (sum % 10)) % 10;
        barcode += checkDigit.toString();
        return barcode;
    }
    /**
     * Generate customer code
     */
    static generateCustomerCode() {
        const timestamp = Date.now().toString().slice(-6);
        const random = crypto_1.default.randomInt(100, 999);
        return `CUS${timestamp}${random}`;
    }
    /**
     * Generate invoice number
     */
    static generateInvoiceNumber() {
        const year = new Date().getFullYear().toString().slice(-2);
        const month = (new Date().getMonth() + 1).toString().padStart(2, "0");
        const random = crypto_1.default.randomInt(10000, 99999);
        return `INV${year}${month}${random}`;
    }
    /**
     * Generate product slug from name
     */
    static generateSlug(text) {
        if (!text)
            return "";
        let slug = text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "") // Remove special characters
            .replace(/\s+/g, "-") // Replace spaces with hyphens
            .replace(/-+/g, "-") // Replace multiple hyphens with single
            .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
        // Ensure uniqueness by adding timestamp if needed
        if (slug.length < 3) {
            slug += `-${Date.now().toString().slice(-6)}`;
        }
        return slug;
    }
    /**
     * Generate unique filename for uploads
     */
    static generateFileName(originalName, options = {}) {
        const { preserveExtension = true, addTimestamp = true, maxLength = 100, } = options;
        let filename = originalName;
        let extension = "";
        if (preserveExtension) {
            const lastDot = filename.lastIndexOf(".");
            if (lastDot > 0) {
                extension = filename.substring(lastDot);
                filename = filename.substring(0, lastDot);
            }
        }
        // Clean filename
        filename = filename
            .replace(/[^a-zA-Z0-9\-_]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_|_$/g, "");
        // Add timestamp
        if (addTimestamp) {
            const timestamp = Date.now().toString();
            filename += `_${timestamp}`;
        }
        // Add random string for uniqueness
        const random = crypto_1.default.randomBytes(4).toString("hex");
        filename += `_${random}`;
        // Combine with extension
        const fullFilename = filename + extension;
        // Truncate if too long
        if (fullFilename.length > maxLength) {
            const availableLength = maxLength - extension.length - 1;
            filename = filename.substring(0, availableLength);
        }
        return filename + extension;
    }
    /**
     * Generate password reset token
     */
    static generateResetToken() {
        const token = crypto_1.default.randomBytes(32).toString("hex");
        const hashedToken = crypto_1.default.createHash("sha256").update(token).digest("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        return {
            token,
            hashedToken,
            expiresAt,
        };
    }
    /**
     * Generate verification token
     */
    static generateVerificationToken() {
        return crypto_1.default.randomBytes(20).toString("hex");
    }
    /**
     * Generate webhook signature
     */
    static generateWebhookSignature(payload, secret) {
        return crypto_1.default.createHmac("sha256", secret).update(payload).digest("hex");
    }
    /**
     * Generate batch ID for bulk operations
     */
    static generateBatchId(operation = "batch") {
        const timestamp = Date.now().toString();
        const random = crypto_1.default.randomBytes(4).toString("hex");
        return `${operation.toUpperCase()}_${timestamp}_${random}`;
    }
    /**
     * Generate transaction reference
     */
    static generateTransactionRef() {
        const timestamp = Date.now().toString();
        const random = crypto_1.default.randomBytes(6).toString("hex").toUpperCase();
        return `TXN_${timestamp}_${random}`;
    }
    /**
     * Generate URL-safe random string
     */
    static generateUrlSafeString(length = 16) {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
        const nanoid = (0, nanoid_1.customAlphabet)(alphabet, length);
        return nanoid();
    }
    /**
     * Generate numeric ID
     */
    static generateNumericId(length = 8) {
        const digits = "0123456789";
        let id = "";
        // Ensure first digit is not 0
        id += digits[crypto_1.default.randomInt(1, digits.length)];
        // Generate remaining digits
        for (let i = 1; i < length; i++) {
            id += digits[crypto_1.default.randomInt(0, digits.length)];
        }
        return id;
    }
    /**
     * Validate generated codes (checksum validation)
     */
    static validateOrderNumber(orderNumber) {
        return /^BL\d{12}$/.test(orderNumber);
    }
    static validateSKU(sku) {
        return /^[A-Z]{3,6}\d{9}$/.test(sku);
    }
    static validateTrackingNumber(trackingNumber) {
        return /^BL[A-Z0-9]{12}$/.test(trackingNumber);
    }
    static validateBarcode(barcode) {
        if (!/^\d{13}$/.test(barcode))
            return false;
        // Validate EAN-13 check digit
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            const digit = parseInt(barcode[i] || "0");
            sum += i % 2 === 0 ? digit : digit * 3;
        }
        const checkDigit = (10 - (sum % 10)) % 10;
        return checkDigit === parseInt(barcode[12] || "0");
    }
}
exports.IDGenerators = IDGenerators;
exports.default = IDGenerators;
//# sourceMappingURL=generators.js.map