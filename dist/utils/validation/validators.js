"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomValidators = void 0;
/**
 * Custom validators for Nigerian e-commerce platform
 */
class CustomValidators {
    /**
     * Validate Nigerian phone number
     */
    static isValidNigerianPhone(phone) {
        if (!phone)
            return false;
        const cleaned = phone.replace(/\D/g, "");
        // Check patterns: +234XXXXXXXXXX, 0XXXXXXXXXX, 234XXXXXXXXXX
        const patterns = [
            /^234[789][01][0-9]{8}$/, // 234XXXXXXXXXX
            /^0[789][01][0-9]{8}$/, // 0XXXXXXXXXX
        ];
        return patterns.some((pattern) => pattern.test(cleaned));
    }
    /**
     * Validate Nigerian postal code
     */
    static isValidNigerianPostalCode(code) {
        if (!code)
            return true; // Optional field
        return /^[0-9]{6}$/.test(code);
    }
    /**
     * Validate email address
     */
    static isValidEmail(email) {
        if (!email)
            return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.toLowerCase());
    }
    /**
     * Validate product SKU
     */
    static isValidSKU(sku) {
        if (!sku)
            return false;
        // Format: 3-6 letters + 6-12 digits
        return /^[A-Z]{3,6}[0-9]{6,12}$/.test(sku.toUpperCase());
    }
    /**
     * Validate order number
     */
    static isValidOrderNumber(orderNumber) {
        if (!orderNumber)
            return false;
        // Format: BL + 12 digits
        return /^BL[0-9]{12}$/.test(orderNumber.toUpperCase());
    }
    /**
     * Validate price (Nigerian Naira)
     */
    static isValidPrice(price) {
        return (typeof price === "number" &&
            price >= 1 && // Minimum ₦0.01
            price <= 100000000 && // Maximum ₦1,000,000
            Number.isFinite(price));
    }
    /**
     * Validate quantity
     */
    static isValidQuantity(quantity) {
        return Number.isInteger(quantity) && quantity > 0 && quantity <= 999;
    }
    /**
     * Validate Nigerian state
     */
    static isValidNigerianState(state) {
        const nigerianStates = [
            "Abia",
            "Adamawa",
            "Akwa Ibom",
            "Anambra",
            "Bauchi",
            "Bayelsa",
            "Benue",
            "Borno",
            "Cross River",
            "Delta",
            "Ebonyi",
            "Edo",
            "Ekiti",
            "Enugu",
            "Gombe",
            "Imo",
            "Jigawa",
            "Kaduna",
            "Kano",
            "Katsina",
            "Kebbi",
            "Kogi",
            "Kwara",
            "Lagos",
            "Nasarawa",
            "Niger",
            "Ogun",
            "Ondo",
            "Osun",
            "Oyo",
            "Plateau",
            "Rivers",
            "Sokoto",
            "Taraba",
            "Yobe",
            "Zamfara",
            "FCT",
        ];
        return nigerianStates.includes(state);
    }
    /**
     * Validate UUID
     */
    static isValidUUID(uuid) {
        if (!uuid)
            return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }
    /**
     * Validate password strength
     */
    static isStrongPassword(password) {
        const errors = [];
        if (!password) {
            errors.push("Password is required");
            return { isValid: false, errors };
        }
        if (password.length < 8) {
            errors.push("Password must be at least 8 characters long");
        }
        if (password.length > 128) {
            errors.push("Password must not exceed 128 characters");
        }
        if (!/[A-Z]/.test(password)) {
            errors.push("Password must contain at least one uppercase letter");
        }
        if (!/[a-z]/.test(password)) {
            errors.push("Password must contain at least one lowercase letter");
        }
        if (!/[0-9]/.test(password)) {
            errors.push("Password must contain at least one number");
        }
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push("Password must contain at least one special character");
        }
        // Check for common weak passwords
        const commonPasswords = [
            "password",
            "password123",
            "123456",
            "123456789",
            "qwerty",
            "abc123",
            "password1",
            "admin",
            "welcome",
        ];
        if (commonPasswords.includes(password.toLowerCase())) {
            errors.push("Password is too common");
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    /**
     * Validate date range
     */
    static isValidDateRange(startDate, endDate) {
        if (!startDate || !endDate)
            return false;
        return startDate <= endDate;
    }
    /**
     * Validate file size
     */
    static isValidFileSize(size, maxSize) {
        return typeof size === "number" && size > 0 && size <= maxSize;
    }
    /**
     * Validate file extension
     */
    static isValidFileExtension(filename, allowedExtensions) {
        if (!filename)
            return false;
        const extension = filename.split(".").pop()?.toLowerCase();
        return extension ? allowedExtensions.includes(extension) : false;
    }
    /**
     * Validate URL
     */
    static isValidURL(url) {
        if (!url)
            return false;
        try {
            new URL(url);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Validate slug (URL-friendly string)
     */
    static isValidSlug(slug) {
        if (!slug)
            return false;
        return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
    }
    /**
     * Validate hex color
     */
    static isValidHexColor(color) {
        if (!color)
            return false;
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
    }
    /**
     * Validate rating (1-5 stars)
     */
    static isValidRating(rating) {
        return Number.isInteger(rating) && rating >= 1 && rating <= 5;
    }
    /**
     * Validate discount percentage
     */
    static isValidDiscountPercentage(discount) {
        return (typeof discount === "number" &&
            discount >= 0 &&
            discount <= 100 &&
            Number.isFinite(discount));
    }
    /**
     * Validate inventory quantity
     */
    static isValidInventoryQuantity(quantity) {
        return Number.isInteger(quantity) && quantity >= 0;
    }
    /**
     * Validate weight (in kg)
     */
    static isValidWeight(weight) {
        return (typeof weight === "number" &&
            weight > 0 &&
            weight <= 1000 && // Max 1000kg
            Number.isFinite(weight));
    }
    /**
     * Validate dimensions
     */
    static isValidDimensions(length, width, height) {
        return [length, width, height].every((dim) => typeof dim === "number" &&
            dim > 0 &&
            dim <= 1000 && // Max 1000cm
            Number.isFinite(dim));
    }
    /**
     * Validate Nigerian bank account number
     */
    static isValidNigerianAccountNumber(accountNumber) {
        if (!accountNumber)
            return false;
        return /^[0-9]{10}$/.test(accountNumber);
    }
    /**
     * Validate BVN (Bank Verification Number)
     */
    static isValidBVN(bvn) {
        if (!bvn)
            return false;
        return /^[0-9]{11}$/.test(bvn);
    }
    /**
     * Validate age (minimum 13 years old)
     */
    static isValidAge(birthDate) {
        if (!birthDate)
            return false;
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            return age - 1 >= 13;
        }
        return age >= 13;
    }
    /**
     * Validate business hours
     */
    static isValidBusinessHours(time) {
        if (!time)
            return false;
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
    }
    /**
     * Validate credit card number (basic Luhn algorithm)
     */
    static isValidCreditCard(cardNumber) {
        if (!cardNumber)
            return false;
        const cleaned = cardNumber.replace(/\D/g, "");
        if (cleaned.length < 13 || cleaned.length > 19) {
            return false;
        }
        // Luhn algorithm
        let sum = 0;
        let isEven = false;
        for (let i = cleaned.length - 1; i >= 0; i--) {
            let digit = parseInt(cleaned.charAt(i));
            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            sum += digit;
            isEven = !isEven;
        }
        return sum % 10 === 0;
    }
}
exports.CustomValidators = CustomValidators;
exports.default = CustomValidators;
//# sourceMappingURL=validators.js.map