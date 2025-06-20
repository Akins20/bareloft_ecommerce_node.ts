import { NigerianState, NigerianPhoneNumber, NairaCurrency } from "../../types";
/**
 * Nigerian phone number utilities
 */
export declare class NigerianPhoneUtils {
    private static readonly COUNTRY_CODE;
    private static readonly PHONE_REGEX;
    private static readonly NETWORK_PREFIXES;
    /**
     * Validate Nigerian phone number
     */
    static validate(phone: string): boolean;
    /**
     * Format phone number to international format (+234XXXXXXXXXX)
     */
    static format(phone: string): string;
    /**
     * Detect network provider
     */
    static detectNetwork(phone: string): string | null;
    /**
     * Parse phone number with full details
     */
    static parse(phone: string): NigerianPhoneNumber;
    /**
     * Mask phone number for privacy (e.g., +234803****567)
     */
    static mask(phone: string): string;
    /**
     * Generate OTP-friendly phone format (without spaces/dashes)
     */
    static toOTPFormat(phone: string): string;
}
/**
 * Nigerian currency (Naira) utilities
 */
export declare class NairaCurrencyUtils {
    private static readonly CURRENCY_CODE;
    private static readonly CURRENCY_SYMBOL;
    /**
     * Format amount as Nigerian Naira
     */
    static format(amount: number, options?: {
        showSymbol?: boolean;
        decimalPlaces?: number;
        useGrouping?: boolean;
    }): string;
    /**
     * Convert Naira to Kobo (for Paystack API)
     */
    static toKobo(naira: number): number;
    /**
     * Convert Kobo to Naira (from Paystack API)
     */
    static fromKobo(kobo: number): number;
    /**
     * Parse currency string to number
     */
    static parse(currencyString: string): number;
    /**
     * Create currency object with formatted display
     */
    static create(amount: number): NairaCurrency;
    /**
     * Format for SMS (shorter format)
     */
    static formatForSMS(amount: number): string;
    /**
     * Validate amount is within Nigerian business limits
     */
    static validateAmount(amount: number): {
        isValid: boolean;
        error?: string;
    };
}
/**
 * Nigerian states and location utilities
 */
export declare class NigerianLocationUtils {
    /**
     * Validate Nigerian state
     */
    static validateState(state: string): boolean;
    /**
     * Get all Nigerian states
     */
    static getAllStates(): readonly NigerianState[];
    /**
     * Get states by geopolitical zone
     */
    static getStatesByZone(zone: "north-central" | "north-east" | "north-west" | "south-east" | "south-south" | "south-west"): NigerianState[];
    /**
     * Calculate shipping zone based on state
     */
    static getShippingZone(state: NigerianState): "lagos" | "south-west" | "north" | "south";
    /**
     * Get delivery time estimate based on state
     */
    static getDeliveryEstimate(state: NigerianState): {
        minDays: number;
        maxDays: number;
        description: string;
    };
    /**
     * Calculate shipping cost based on state and weight
     */
    static calculateShippingCost(state: NigerianState, weight: number, // in kg
    orderAmount: number): number;
}
/**
 * Nigerian business utilities
 */
export declare class NigerianBusinessUtils {
    /**
     * Format Nigerian business hours
     */
    static formatBusinessHours(): string;
    /**
     * Check if current time is within Nigerian business hours
     */
    static isBusinessHours(): boolean;
    /**
     * Get current Nigerian time
     */
    static getCurrentNigerianTime(): Date;
    /**
     * Format Nigerian date
     */
    static formatNigerianDate(date: Date, format?: "short" | "long"): string;
    /**
     * Check if date is a Nigerian public holiday
     */
    static isNigerianPublicHoliday(date: Date): boolean;
    /**
     * Calculate Nigerian business days between dates
     */
    static calculateBusinessDays(startDate: Date, endDate: Date): number;
}
/**
 * Nigerian business validation utilities
 */
export declare class NigerianValidationUtils {
    /**
     * Validate Nigerian Business Registration Number (RC Number)
     */
    static validateBusinessRegistrationNumber(rcNumber: string): boolean;
    /**
     * Validate Nigerian Tax Identification Number (TIN)
     */
    static validateTIN(tin: string): boolean;
    /**
     * Validate Nigerian postal code
     */
    static validatePostalCode(postalCode: string): boolean;
    /**
     * Validate Nigerian bank account number
     */
    static validateAccountNumber(accountNumber: string): boolean;
    /**
     * Validate Nigerian name (supports local names)
     */
    static validateNigerianName(name: string): boolean;
    /**
     * Validate Nigerian address format
     */
    static validateNigerianAddress(address: {
        addressLine1: string;
        city: string;
        state: string;
        postalCode?: string;
    }): {
        isValid: boolean;
        errors: string[];
    };
}
/**
 * Nigerian e-commerce specific utilities
 */
export declare class NigerianEcommerceUtils {
    /**
     * Generate Nigerian-friendly product SKU
     */
    static generateSKU(category: string, productName: string, variant?: string): string;
    /**
     * Generate Nigerian order number
     */
    static generateOrderNumber(): string;
    /**
     * Calculate Nigerian import duty for products
     */
    static calculateImportDuty(productCategory: "electronics" | "clothing" | "cosmetics" | "books" | "other", costPrice: number): number;
    /**
     * Get recommended payment methods for Nigerian customers
     */
    static getRecommendedPaymentMethods(orderAmount: number): {
        method: string;
        priority: number;
        description: string;
        available: boolean;
    }[];
    /**
     * Format Nigerian order tracking message
     */
    static formatTrackingMessage(orderNumber: string, status: string, location?: string): string;
    /**
     * Calculate estimated delivery date for Nigerian locations
     */
    static calculateDeliveryDate(state: NigerianState, shippedDate?: Date): {
        estimatedDate: Date;
        businessDays: number;
    };
    /**
     * Generate customer-friendly Nigerian tracking URL
     */
    static generateTrackingUrl(orderNumber: string): string;
    /**
     * Format Nigerian customer service message
     */
    static formatCustomerServiceMessage(customerName: string, issue: string, ticketNumber?: string): string;
    /**
     * Calculate Nigerian VAT (if applicable)
     */
    static calculateVAT(amount: number): number;
    /**
     * Check if product requires special handling in Nigeria
     */
    static requiresSpecialHandling(productCategory: string, productName: string): {
        requires: boolean;
        reason?: string;
        restrictions?: string[];
    };
    /**
     * Calculate Nigerian logistics cost
     */
    static calculateLogisticsCost(params: {
        weight: number;
        volume?: number;
        state: NigerianState;
        isFragile: boolean;
        isPerishable: boolean;
        serviceType: "standard" | "express" | "same_day";
    }): {
        cost: number;
        currency: "NGN";
        breakdown: {
            baseCost: number;
            weightSurcharge: number;
            stateSurcharge: number;
            serviceSurcharge: number;
            specialHandling: number;
        };
    };
    /**
     * Generate Nigerian compliant receipt/invoice
     */
    static generateReceiptData(orderData: {
        orderNumber: string;
        customerName: string;
        items: Array<{
            name: string;
            quantity: number;
            unitPrice: number;
            total: number;
        }>;
        subtotal: number;
        vat: number;
        total: number;
        paymentMethod: string;
    }): {
        receiptNumber: string;
        formattedReceipt: string;
        vatCalculation: {
            vatRate: number;
            vatAmount: number;
            isVatRegistered: boolean;
        };
    };
    /**
     * Validate Nigerian business compliance
     */
    static validateBusinessCompliance(productData: {
        category: string;
        hasNafdacNumber?: string;
        hasImportPermit?: boolean;
        isLocallyManufactured?: boolean;
    }): {
        isCompliant: boolean;
        requiredDocuments: string[];
        warnings: string[];
    };
}
/**
 * Nigerian marketplace utilities
 */
export declare class NigerianMarketplaceUtils {
    /**
     * Get popular search terms in Nigeria
     */
    static getPopularSearchTerms(): string[];
    /**
     * Get seasonal trending categories
     */
    static getSeasonalTrends(month: number): {
        trending: string[];
        seasonal: string[];
        events: string[];
    };
    /**
     * Calculate peak traffic times for Nigerian e-commerce
     */
    static getPeakTrafficTimes(): {
        dailyPeaks: Array<{
            hour: number;
            description: string;
        }>;
        weeklyPeaks: Array<{
            day: string;
            traffic: "high" | "medium" | "low";
        }>;
        monthlyPeaks: Array<{
            month: string;
            traffic: "high" | "medium" | "low";
        }>;
    };
    /**
     * Get Nigerian market insights
     */
    static getMarketInsights(): {
        topCategories: string[];
        preferredPaymentMethods: Array<{
            method: string;
            percentage: number;
        }>;
        shoppingBehaviors: string[];
        mobilePenetration: number;
    };
    /**
     * Generate Nigerian customer personas
     */
    static getCustomerPersonas(): Array<{
        name: string;
        ageRange: string;
        location: string;
        income: string;
        preferences: string[];
        paymentMethod: string;
        shoppingFrequency: string;
    }>;
    /**
     * Get Nigerian local language greetings
     */
    static getLocalGreetings(): Record<string, {
        greeting: string;
        response: string;
    }>;
    /**
     * Generate culturally appropriate product descriptions
     */
    static generateCulturalProductTags(category: string): string[];
}
/**
 * Export all Nigerian utilities as a single object for easy import
 */
export declare const NigerianUtils: {
    Phone: typeof NigerianPhoneUtils;
    Currency: typeof NairaCurrencyUtils;
    Location: typeof NigerianLocationUtils;
    Business: typeof NigerianBusinessUtils;
    Validation: typeof NigerianValidationUtils;
    Ecommerce: typeof NigerianEcommerceUtils;
    Marketplace: typeof NigerianMarketplaceUtils;
};
export default NigerianUtils;
//# sourceMappingURL=nigerian.d.ts.map