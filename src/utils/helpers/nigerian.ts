// =============================================================================
// src/utils/helpers/nigerian.ts - Nigerian Market Utilities
// =============================================================================

import {
  NIGERIAN_STATES,
  NigerianState,
  NigerianPhoneNumber,
  NairaCurrency,
} from "../../types";

/**
 * Nigerian phone number utilities
 */
export class NigerianPhoneUtils {
  private static readonly COUNTRY_CODE = "+234";
  private static readonly PHONE_REGEX = /^(\+234|234|0)[789][01][0-9]{8}$/;

  // Network prefixes for major Nigerian carriers
  private static readonly NETWORK_PREFIXES = {
    MTN: [
      "0803",
      "0806",
      "0703",
      "0903",
      "0905",
      "0704",
      "0816",
      "0713",
      "0810",
      "0814",
      "0906",
    ],
    GLO: ["0805", "0807", "0811", "0815", "0905", "0915"],
    AIRTEL: ["0802", "0808", "0812", "0702", "0902", "0904", "0901", "0907"],
    "9MOBILE": ["0809", "0817", "0818", "0908", "0909"],
  };

  /**
   * Validate Nigerian phone number
   */
  static validate(phone: string): boolean {
    if (!phone || typeof phone !== "string") return false;
    return this.PHONE_REGEX.test(phone.trim());
  }

  /**
   * Format phone number to international format (+234XXXXXXXXXX)
   */
  static format(phone: string): string {
    if (!phone || typeof phone !== "string") return "";

    const cleaned = phone.replace(/\D/g, "");

    // Handle different input formats
    if (cleaned.startsWith("234") && cleaned.length === 13) {
      return `+${cleaned}`;
    }

    if (cleaned.startsWith("0") && cleaned.length === 11) {
      return `${this.COUNTRY_CODE}${cleaned.substring(1)}`;
    }

    if (cleaned.length === 10) {
      return `${this.COUNTRY_CODE}${cleaned}`;
    }

    return phone; // Return original if can't format
  }

  /**
   * Detect network provider
   */
  static detectNetwork(phone: string): string | null {
    const formatted = this.format(phone);
    if (!this.validate(formatted)) return null;

    const prefix = formatted.substring(4, 8); // Extract the 4-digit prefix after +234

    for (const [network, prefixes] of Object.entries(this.NETWORK_PREFIXES)) {
      if (prefixes.includes(`0${prefix}`)) {
        return network;
      }
    }

    return null;
  }

  /**
   * Parse phone number with full details
   */
  static parse(phone: string): NigerianPhoneNumber {
    const raw = phone;
    const formatted = this.format(phone);
    const isValid = this.validate(formatted);
    const network = isValid ? this.detectNetwork(formatted) : undefined;

    return {
      raw,
      formatted: isValid ? formatted : raw,
      network: network as any,
      isValid,
    };
  }

  /**
   * Mask phone number for privacy (e.g., +234803****567)
   */
  static mask(phone: string): string {
    const formatted = this.format(phone);
    if (!this.validate(formatted)) return phone;

    return formatted.replace(/(\+234\d{3})\d{4}(\d{3})/, "$1****$2");
  }

  /**
   * Generate OTP-friendly phone format (without spaces/dashes)
   */
  static toOTPFormat(phone: string): string {
    return this.format(phone).replace(/\D/g, "");
  }
}

/**
 * Nigerian currency (Naira) utilities
 */
export class NairaCurrencyUtils {
  private static readonly CURRENCY_CODE = "NGN";
  private static readonly CURRENCY_SYMBOL = "₦";

  /**
   * Format amount as Nigerian Naira
   */
  static format(
    amount: number,
    options?: {
      showSymbol?: boolean;
      decimalPlaces?: number;
      useGrouping?: boolean;
    }
  ): string {
    const {
      showSymbol = true,
      decimalPlaces = 2,
      useGrouping = true,
    } = options || {};

    const formatted = new Intl.NumberFormat("en-NG", {
      style: showSymbol ? "currency" : "decimal",
      currency: this.CURRENCY_CODE,
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
      useGrouping,
    }).format(amount);

    return formatted;
  }

  /**
   * Convert Naira to Kobo (for Paystack API)
   */
  static toKobo(naira: number): number {
    return Math.round(naira * 100);
  }

  /**
   * Convert Kobo to Naira (from Paystack API)
   */
  static fromKobo(kobo: number): number {
    return kobo / 100;
  }

  /**
   * Parse currency string to number
   */
  static parse(currencyString: string): number {
    // Remove currency symbol and whitespace, then parse
    const cleaned = currencyString
      .replace(/[₦,\s]/g, "")
      .replace(/[^\d.-]/g, "");

    return parseFloat(cleaned) || 0;
  }

  /**
   * Create currency object with formatted display
   */
  static create(amount: number): NairaCurrency {
    return {
      amount,
      formatted: this.format(amount),
      inKobo: this.toKobo(amount),
    };
  }

  /**
   * Format for SMS (shorter format)
   */
  static formatForSMS(amount: number): string {
    if (amount >= 1000000) {
      return `₦${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `₦${(amount / 1000).toFixed(1)}K`;
    }
    return this.format(amount, { decimalPlaces: 0 });
  }

  /**
   * Validate amount is within Nigerian business limits
   */
  static validateAmount(amount: number): {
    isValid: boolean;
    error?: string;
  } {
    if (amount < 100) {
      return {
        isValid: false,
        error: "Minimum amount is ₦100",
      };
    }

    if (amount > 10000000) {
      return {
        isValid: false,
        error: "Maximum amount is ₦10,000,000",
      };
    }

    return { isValid: true };
  }
}

/**
 * Nigerian states and location utilities
 */
export class NigerianLocationUtils {
  /**
   * Validate Nigerian state
   */
  static validateState(state: string): boolean {
    return NIGERIAN_STATES.includes(state as NigerianState);
  }

  /**
   * Get all Nigerian states
   */
  static getAllStates(): readonly NigerianState[] {
    return NIGERIAN_STATES;
  }

  /**
   * Get states by geopolitical zone
   */
  static getStatesByZone(
    zone:
      | "north-central"
      | "north-east"
      | "north-west"
      | "south-east"
      | "south-south"
      | "south-west"
  ): NigerianState[] {
    const zones: Record<string, NigerianState[]> = {
      "north-central": [
        "Benue",
        "FCT",
        "Kogi",
        "Kwara",
        "Nasarawa",
        "Niger",
        "Plateau",
      ],
      "north-east": ["Adamawa", "Bauchi", "Borno", "Gombe", "Taraba", "Yobe"],
      "north-west": [
        "Jigawa",
        "Kaduna",
        "Kano",
        "Katsina",
        "Kebbi",
        "Sokoto",
        "Zamfara",
      ],
      "south-east": ["Abia", "Anambra", "Ebonyi", "Enugu", "Imo"],
      "south-south": [
        "Akwa Ibom",
        "Bayelsa",
        "Cross River",
        "Delta",
        "Edo",
        "Rivers",
      ],
      "south-west": ["Ekiti", "Lagos", "Ogun", "Ondo", "Osun", "Oyo"],
    };

    return zones[zone] || [];
  }

  /**
   * Calculate shipping zone based on state
   */
  static getShippingZone(
    state: NigerianState
  ): "lagos" | "south-west" | "north" | "south" {
    if (state === "Lagos") return "lagos";

    const southWest = this.getStatesByZone("south-west");
    if (southWest.includes(state)) return "south-west";

    const northernZones = [
      ...this.getStatesByZone("north-central"),
      ...this.getStatesByZone("north-east"),
      ...this.getStatesByZone("north-west"),
    ];
    if (northernZones.includes(state)) return "north";

    return "south";
  }

  /**
   * Get delivery time estimate based on state
   */
  static getDeliveryEstimate(state: NigerianState): {
    minDays: number;
    maxDays: number;
    description: string;
  } {
    const zone = this.getShippingZone(state);

    switch (zone) {
      case "lagos":
        return {
          minDays: 1,
          maxDays: 2,
          description: "Same day or next day delivery",
        };
      case "south-west":
        return { minDays: 2, maxDays: 4, description: "2-4 business days" };
      case "south":
        return { minDays: 3, maxDays: 6, description: "3-6 business days" };
      case "north":
        return { minDays: 4, maxDays: 8, description: "4-8 business days" };
      default:
        return { minDays: 3, maxDays: 7, description: "3-7 business days" };
    }
  }

  /**
   * Calculate shipping cost based on state and weight
   */
  static calculateShippingCost(
    state: NigerianState,
    weight: number, // in kg
    orderAmount: number
  ): number {
    const zone = this.getShippingZone(state);

    // Free shipping threshold (₦50,000)
    if (orderAmount >= 50000) return 0;

    // Base rates by zone
    const baseRates: Record<string, number> = {
      lagos: 1500,
      "south-west": 2000,
      south: 2500,
      north: 3000,
    };

    const baseRate = baseRates[zone] || 2500;

    // Additional cost for heavy items (over 2kg)
    const weightSurcharge = weight > 2 ? (weight - 2) * 500 : 0;

    return baseRate + weightSurcharge;
  }
}

/**
 * Nigerian business utilities
 */
export class NigerianBusinessUtils {
  /**
   * Format Nigerian business hours
   */
  static formatBusinessHours(): string {
    return "Monday - Friday: 8:00 AM - 6:00 PM WAT, Saturday: 9:00 AM - 4:00 PM WAT";
  }

  /**
   * Check if current time is within Nigerian business hours
   */
  static isBusinessHours(): boolean {
    const now = new Date();
    const lagosTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Africa/Lagos" })
    );

    const day = lagosTime.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = lagosTime.getHours();

    // Monday to Friday: 8 AM - 6 PM
    if (day >= 1 && day <= 5) {
      return hour >= 8 && hour < 18;
    }

    // Saturday: 9 AM - 4 PM
    if (day === 6) {
      return hour >= 9 && hour < 16;
    }

    // Sunday: Closed
    return false;
  }

  /**
   * Get current Nigerian time
   */
  static getCurrentNigerianTime(): Date {
    return new Date(
      new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" })
    );
  }

  /**
   * Format Nigerian date
   */
  static formatNigerianDate(
    date: Date,
    format: "short" | "long" = "short"
  ): string {
    const options: Intl.DateTimeFormatOptions =
      format === "long"
        ? {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "Africa/Lagos",
          }
        : {
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "Africa/Lagos",
          };

    return date.toLocaleDateString("en-NG", options);
  }

  /**
   * Check if date is a Nigerian public holiday
   */
  static isNigerianPublicHoliday(date: Date): boolean {
    const month = date.getMonth() + 1; // JavaScript months are 0-indexed
    const day = date.getDate();

    // Fixed holidays
    const fixedHolidays = [
      { month: 1, day: 1 }, // New Year's Day
      { month: 10, day: 1 }, // Independence Day
      { month: 12, day: 25 }, // Christmas Day
      { month: 12, day: 26 }, // Boxing Day
      { month: 5, day: 1 }, // Workers' Day
      { month: 6, day: 12 }, // Democracy Day
    ];

    return fixedHolidays.some(
      (holiday) => holiday.month === month && holiday.day === day
    );
  }

  /**
   * Calculate Nigerian business days between dates
   */
  static calculateBusinessDays(startDate: Date, endDate: Date): number {
    let businessDays = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();

      // Monday to Friday (1-5) and not a holiday
      if (
        dayOfWeek >= 1 &&
        dayOfWeek <= 5 &&
        !this.isNigerianPublicHoliday(current)
      ) {
        businessDays++;
      }

      current.setDate(current.getDate() + 1);
    }

    return businessDays;
  }
}

/**
 * Nigerian business validation utilities
 */
export class NigerianValidationUtils {
  /**
   * Validate Nigerian Business Registration Number (RC Number)
   */
  static validateBusinessRegistrationNumber(rcNumber: string): boolean {
    // RC numbers are typically 6-7 digits
    const rcRegex = /^RC\d{6,7}$/i;
    return rcRegex.test(rcNumber.replace(/\s/g, ""));
  }

  /**
   * Validate Nigerian Tax Identification Number (TIN)
   */
  static validateTIN(tin: string): boolean {
    // Nigerian TIN is 11 digits
    const tinRegex = /^\d{11}$/;
    return tinRegex.test(tin.replace(/\s/g, ""));
  }

  /**
   * Validate Nigerian postal code
   */
  static validatePostalCode(postalCode: string): boolean {
    // Nigerian postal codes are 6 digits
    const postalRegex = /^\d{6}$/;
    return postalRegex.test(postalCode.replace(/\s/g, ""));
  }

  /**
   * Validate Nigerian bank account number
   */
  static validateAccountNumber(accountNumber: string): boolean {
    // Nigerian account numbers are typically 10 digits
    const accountRegex = /^\d{10}$/;
    return accountRegex.test(accountNumber.replace(/\s/g, ""));
  }

  /**
   * Validate Nigerian name (supports local names)
   */
  static validateNigerianName(name: string): boolean {
    // Allow letters, spaces, apostrophes, and common Nigerian name patterns
    const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]{2,50}$/;
    return nameRegex.test(name.trim());
  }

  /**
   * Validate Nigerian address format
   */
  static validateNigerianAddress(address: {
    addressLine1: string;
    city: string;
    state: string;
    postalCode?: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!address.addressLine1 || address.addressLine1.trim().length < 5) {
      errors.push("Address line 1 must be at least 5 characters");
    }

    if (!address.city || address.city.trim().length < 2) {
      errors.push("City is required");
    }

    if (!NigerianLocationUtils.validateState(address.state)) {
      errors.push("Invalid Nigerian state");
    }

    if (address.postalCode && !this.validatePostalCode(address.postalCode)) {
      errors.push("Invalid postal code format (6 digits required)");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Nigerian e-commerce specific utilities
 */
export class NigerianEcommerceUtils {
  /**
   * Generate Nigerian-friendly product SKU
   */
  static generateSKU(
    category: string,
    productName: string,
    variant?: string
  ): string {
    const categoryCode = category.substring(0, 3).toUpperCase();
    const nameCode = productName
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 6)
      .toUpperCase();
    const variantCode = variant ? variant.substring(0, 2).toUpperCase() : "";
    const timestamp = Date.now().toString().slice(-4);

    return `${categoryCode}-${nameCode}${variantCode}-${timestamp}`;
  }

  /**
   * Generate Nigerian order number
   */
  static generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");

    return `BL${year}${month}${day}${random}`;
  }

  /**
   * Calculate Nigerian import duty for products
   */
  static calculateImportDuty(
    productCategory:
      | "electronics"
      | "clothing"
      | "cosmetics"
      | "books"
      | "other",
    costPrice: number
  ): number {
    // Simplified Nigerian import duty rates
    const dutyRates: Record<string, number> = {
      electronics: 0.2, // 20%
      clothing: 0.2, // 20%
      cosmetics: 0.2, // 20%
      books: 0.0, // 0% (books are duty-free)
      other: 0.1, // 10%
    };

    const dutyRate = dutyRates[productCategory] || dutyRates.other;
    return costPrice * dutyRate as any;
  }

  /**
   * Get recommended payment methods for Nigerian customers
   */
  static getRecommendedPaymentMethods(orderAmount: number): {
    method: string;
    priority: number;
    description: string;
    available: boolean;
  }[] {
    return [
      {
        method: "card",
        priority: 1,
        description: "Debit/Credit Card",
        available: true,
      },
      {
        method: "bank_transfer",
        priority: 2,
        description: "Bank Transfer",
        available: orderAmount <= 1000000, // ₦1M limit
      },
      {
        method: "ussd",
        priority: 3,
        description: "USSD Code",
        available: orderAmount <= 100000, // ₦100K limit
      },
      {
        method: "mobile_money",
        priority: 4,
        description: "Mobile Money",
        available: orderAmount <= 50000, // ₦50K limit
      },
    ].filter((method) => method.available);
  }

  /**
   * Format Nigerian order tracking message
   */
  static formatTrackingMessage(
    orderNumber: string,
    status: string,
    location?: string
  ): string {
    const statusMessages: Record<string, string> = {
      pending: "Your order has been received and is being processed",
      confirmed: "Your order has been confirmed and is being prepared",
      shipped: `Your order has been shipped${location ? ` from ${location}` : ""}`,
      delivered: "Your order has been delivered successfully",
      cancelled: "Your order has been cancelled",
    };

    const message = statusMessages[status] || "Order status updated";
    return `Order ${orderNumber}: ${message}. Track at bareloft.com/track`;
  }

  /**
   * Calculate estimated delivery date for Nigerian locations
   */
  static calculateDeliveryDate(
    state: NigerianState,
    shippedDate: Date = new Date()
  ): { estimatedDate: Date; businessDays: number } {
    const estimate = NigerianLocationUtils.getDeliveryEstimate(state);
    const deliveryDate = new Date(shippedDate);

    // Add business days (excluding weekends and holidays)
    let businessDaysAdded = 0;
    while (businessDaysAdded < estimate.maxDays) {
      deliveryDate.setDate(deliveryDate.getDate() + 1);

      const dayOfWeek = deliveryDate.getDay();
      if (
        dayOfWeek >= 1 &&
        dayOfWeek <= 5 &&
        !NigerianBusinessUtils.isNigerianPublicHoliday(deliveryDate)
      ) {
        businessDaysAdded++;
      }
    }

    return {
      estimatedDate: deliveryDate,
      businessDays: estimate.maxDays,
    };
  }

  /**
   * Generate customer-friendly Nigerian tracking URL
   */
  static generateTrackingUrl(orderNumber: string): string {
    return `https://bareloft.com/track/${orderNumber}`;
  }

  /**
   * Format Nigerian customer service message
   */
  static formatCustomerServiceMessage(
    customerName: string,
    issue: string,
    ticketNumber?: string
  ): string {
    const greeting = NigerianBusinessUtils.isBusinessHours()
      ? "Hello"
      : "Thank you for contacting us";

    const ticket = ticketNumber ? ` (Ticket: ${ticketNumber})` : "";

    return `${greeting} ${customerName}, we've received your inquiry about ${issue}${ticket}. Our team will respond within 24 hours. For urgent matters, call +234-800-BARELOFT.`;
  }

  /**
   * Calculate Nigerian VAT (if applicable)
   */
  static calculateVAT(amount: number): number {
    // Nigeria VAT is 7.5% (as of 2024)
    const VAT_RATE = 0.075;
    return amount * VAT_RATE;
  }

  /**
   * Check if product requires special handling in Nigeria
   */
  static requiresSpecialHandling(
    productCategory: string,
    productName: string
  ): {
    requires: boolean;
    reason?: string;
    restrictions?: string[];
  } {
    const specialCategories: Record<string, any> = {
      electronics: {
        requires: true,
        reason: "Requires careful handling and anti-static packaging",
        restrictions: ["Fragile", "Keep dry", "Handle with care"],
      },
      cosmetics: {
        requires: true,
        reason: "Temperature sensitive and requires NAFDAC compliance",
        restrictions: [
          "Temperature controlled",
          "NAFDAC approved",
          "Expiry date check",
        ],
      },
      pharmaceuticals: {
        requires: true,
        reason: "Requires NAFDAC registration and controlled storage",
        restrictions: [
          "NAFDAC registered",
          "Temperature controlled",
          "Licensed pharmacy delivery",
        ],
      },
      food: {
        requires: true,
        reason: "Requires NAFDAC approval and temperature control",
        restrictions: [
          "NAFDAC approved",
          "Temperature controlled",
          "Expiry date monitoring",
        ],
      },
      beverages: {
        requires: true,
        reason: "Requires NAFDAC approval for beverages",
        restrictions: [
          "NAFDAC approved",
          "Temperature controlled",
          "No alcohol to minors",
        ],
      },
    };

    const category = specialCategories[productCategory.toLowerCase()];
    return category || { requires: false };
  }

  /**
   * Calculate Nigerian logistics cost
   */
  static calculateLogisticsCost(params: {
    weight: number; // in kg
    volume?: number; // in cubic meters
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
  } {
    const zone = NigerianLocationUtils.getShippingZone(params.state);

    // Base costs by zone
    const baseCosts: Record<string, number> = {
      lagos: 1000,
      "south-west": 1500,
      south: 2000,
      north: 2500,
    };

    // Service type multipliers
    const serviceMultipliers = {
      standard: 1.0,
      express: 1.5,
      same_day: 2.5,
    };

    const baseCost = baseCosts[zone] || 2000;
    const serviceMultiplier = serviceMultipliers[params.serviceType] || 1.0;

    // Calculate surcharges
    const weightSurcharge = params.weight > 2 ? (params.weight - 2) * 300 : 0;
    const stateSurcharge = zone === "north" ? 500 : 0;
    const serviceSurcharge = baseCost * serviceMultiplier - baseCost;

    let specialHandling = 0;
    if (params.isFragile) specialHandling += 500;
    if (params.isPerishable) specialHandling += 800;

    const totalCost =
      baseCost +
      weightSurcharge +
      stateSurcharge +
      serviceSurcharge +
      specialHandling;

    return {
      cost: totalCost,
      currency: "NGN",
      breakdown: {
        baseCost,
        weightSurcharge,
        stateSurcharge,
        serviceSurcharge,
        specialHandling,
      },
    };
  }

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
  } {
    const receiptNumber = `RCP-${orderData.orderNumber}`;
    const vatRate = 0.075; // 7.5% VAT
    const isVatRegistered = true; // Assume business is VAT registered

    const formattedReceipt = `
BARELOFT E-COMMERCE
Receipt #${receiptNumber}
Order #${orderData.orderNumber}
Customer: ${orderData.customerName}
Date: ${new Date().toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}

ITEMS:
${orderData.items
  .map(
    (item) =>
      `${item.name} x${item.quantity} @ ${NairaCurrencyUtils.format(item.unitPrice)} = ${NairaCurrencyUtils.format(item.total)}`
  )
  .join("\n")}

Subtotal: ${NairaCurrencyUtils.format(orderData.subtotal)}
VAT (7.5%): ${NairaCurrencyUtils.format(orderData.vat)}
TOTAL: ${NairaCurrencyUtils.format(orderData.total)}

Payment: ${orderData.paymentMethod}
Status: PAID

Thank you for shopping with Bareloft!
Support: +234-800-BARELOFT
    `.trim();

    return {
      receiptNumber,
      formattedReceipt,
      vatCalculation: {
        vatRate,
        vatAmount: orderData.vat,
        isVatRegistered,
      },
    };
  }

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
  } {
    const requiredDocuments: string[] = [];
    const warnings: string[] = [];
    let isCompliant = true;

    // Check NAFDAC requirements
    const nafdacRequiredCategories = [
      "food",
      "beverages",
      "cosmetics",
      "pharmaceuticals",
      "medical_devices",
      "chemicals",
    ];

    if (nafdacRequiredCategories.includes(productData.category.toLowerCase())) {
      if (!productData.hasNafdacNumber) {
        requiredDocuments.push("NAFDAC Registration Number");
        isCompliant = false;
      }
    }

    // Check import requirements
    if (!productData.isLocallyManufactured) {
      if (!productData.hasImportPermit) {
        requiredDocuments.push("Import Permit/License");
        warnings.push("Imported goods require proper documentation");
      }
    }

    // Additional compliance checks
    const restrictedCategories = ["alcohol", "tobacco", "firearms"];
    if (restrictedCategories.includes(productData.category.toLowerCase())) {
      requiredDocuments.push("Special License for Restricted Items");
      warnings.push("This category requires special licensing");
      isCompliant = false;
    }

    return {
      isCompliant,
      requiredDocuments,
      warnings,
    };
  }
}

/**
 * Nigerian marketplace utilities
 */
export class NigerianMarketplaceUtils {
  /**
   * Get popular search terms in Nigeria
   */
  static getPopularSearchTerms(): string[] {
    return [
      // Fashion & Beauty
      "ankara fabric",
      "lace fabric",
      "african wear",
      "gele",
      "aso ebi",
      "adire",
      "kente",
      "traditional wear",
      "skin care",
      "hair products",

      // Electronics
      "phone accessories",
      "laptop",
      "power bank",
      "earphones",
      "speaker",
      "generator",
      "solar panel",
      "inverter",
      "rechargeable fan",

      // Home & Kitchen
      "cooking gas",
      "blender",
      "rice cooker",
      "pressure pot",
      "thermos",
      "bed sheets",
      "curtains",
      "home decor",

      // Health & Wellness
      "malaria drugs",
      "vitamins",
      "first aid",
      "blood pressure monitor",
      "thermometer",
      "mosquito net",

      // Books & Education
      "waec past questions",
      "jamb past questions",
      "university textbooks",
      "primary school books",
      "study materials",
    ];
  }

  /**
   * Get seasonal trending categories
   */
  static getSeasonalTrends(month: number): {
    trending: string[];
    seasonal: string[];
    events: string[];
  } {
    const trends: Record<number, any> = {
      1: {
        // January
        trending: [
          "new year decorations",
          "fitness equipment",
          "school supplies",
        ],
        seasonal: ["back to school items", "health products"],
        events: ["new year celebration items"],
      },
      2: {
        // February
        trending: ["valentine gifts", "romantic items", "red clothing"],
        seasonal: ["dry season products", "dust masks"],
        events: ["valentine decorations"],
      },
      3: {
        // March
        trending: ["spring cleaning", "gardening tools", "fresh start items"],
        seasonal: ["dry season continues"],
        events: ["international women day items"],
      },
      4: {
        // April
        trending: ["easter items", "travel accessories", "outdoor gear"],
        seasonal: ["hot weather products", "cooling items"],
        events: ["easter decorations", "ramadan preparation"],
      },
      5: {
        // May
        trending: ["mothers day gifts", "democracy day items"],
        seasonal: ["rainy season preparation", "umbrellas", "raincoats"],
        events: ["democracy day merchandise"],
      },
      6: {
        // June
        trending: ["fathers day gifts", "children day items", "democracy day"],
        seasonal: ["rainy season gear", "waterproof items"],
        events: ["childrens day items", "democracy day items"],
      },
      7: {
        // July - September
        trending: ["back to school", "school uniforms", "notebooks"],
        seasonal: ["heavy rain gear", "generators"],
        events: ["new academic year preparation"],
      },
      10: {
        // October
        trending: ["independence day items", "green white green"],
        seasonal: ["post-rain cleaning", "dry weather prep"],
        events: ["independence day decorations", "halloween (limited)"],
      },
      11: {
        // November
        trending: ["black friday deals", "thanksgiving items"],
        seasonal: ["harmattan preparation", "moisturizers"],
        events: ["black friday sales preparation"],
      },
      12: {
        // December
        trending: ["christmas items", "new year prep", "party supplies"],
        seasonal: ["harmattan gear", "cold weather items"],
        events: ["christmas decorations", "new year items"],
      },
    };

    return (
      trends[month] || {
        trending: [],
        seasonal: [],
        events: [],
      }
    );
  }

  /**
   * Calculate peak traffic times for Nigerian e-commerce
   */
  static getPeakTrafficTimes(): {
    dailyPeaks: Array<{ hour: number; description: string }>;
    weeklyPeaks: Array<{ day: string; traffic: "high" | "medium" | "low" }>;
    monthlyPeaks: Array<{ month: string; traffic: "high" | "medium" | "low" }>;
  } {
    return {
      dailyPeaks: [
        { hour: 8, description: "Morning commute browsing" },
        { hour: 12, description: "Lunch break shopping" },
        { hour: 18, description: "Evening shopping peak" },
        { hour: 21, description: "Night browsing peak" },
      ],
      weeklyPeaks: [
        { day: "Monday", traffic: "medium" },
        { day: "Tuesday", traffic: "medium" },
        { day: "Wednesday", traffic: "medium" },
        { day: "Thursday", traffic: "high" },
        { day: "Friday", traffic: "high" },
        { day: "Saturday", traffic: "high" },
        { day: "Sunday", traffic: "low" },
      ],
      monthlyPeaks: [
        { month: "January", traffic: "medium" },
        { month: "February", traffic: "medium" },
        { month: "March", traffic: "medium" },
        { month: "April", traffic: "high" },
        { month: "May", traffic: "medium" },
        { month: "June", traffic: "medium" },
        { month: "July", traffic: "high" },
        { month: "August", traffic: "high" },
        { month: "September", traffic: "high" },
        { month: "October", traffic: "medium" },
        { month: "November", traffic: "high" },
        { month: "December", traffic: "high" },
      ],
    };
  }

  /**
   * Get Nigerian market insights
   */
  static getMarketInsights(): {
    topCategories: string[];
    preferredPaymentMethods: Array<{ method: string; percentage: number }>;
    shoppingBehaviors: string[];
    mobilePenetration: number;
  } {
    return {
      topCategories: [
        "Fashion & Beauty",
        "Electronics",
        "Home & Kitchen",
        "Health & Wellness",
        "Books & Education",
        "Phones & Accessories",
        "Baby & Kids",
        "Sports & Outdoors",
      ],
      preferredPaymentMethods: [
        { method: "Bank Transfer", percentage: 35 },
        { method: "Debit Card", percentage: 30 },
        { method: "Cash on Delivery", percentage: 20 },
        { method: "USSD", percentage: 10 },
        { method: "Mobile Money", percentage: 5 },
      ],
      shoppingBehaviors: [
        "Price-sensitive customers",
        "Mobile-first shopping experience",
        "Brand loyalty for trusted sellers",
        "Word-of-mouth recommendations important",
        "Cash on delivery preference",
        "Quality over quantity mindset",
      ],
      mobilePenetration: 85, // 85% of users shop via mobile
    };
  }

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
  }> {
    return [
      {
        name: "Young Professional",
        ageRange: "25-35",
        location: "Lagos, Abuja, Port Harcourt",
        income: "₦150,000 - ₦500,000/month",
        preferences: ["Electronics", "Fashion", "Health & Beauty"],
        paymentMethod: "Debit Card, Bank Transfer",
        shoppingFrequency: "Weekly",
      },
      {
        name: "Middle-Class Family",
        ageRange: "30-45",
        location: "Major cities",
        income: "₦200,000 - ₦800,000/month",
        preferences: ["Home & Kitchen", "Baby & Kids", "Electronics"],
        paymentMethod: "Bank Transfer, Cash on Delivery",
        shoppingFrequency: "Bi-weekly",
      },
      {
        name: "University Student",
        ageRange: "18-25",
        location: "University towns",
        income: "₦30,000 - ₦100,000/month",
        preferences: ["Books", "Fashion", "Phone Accessories"],
        paymentMethod: "USSD, Mobile Money",
        shoppingFrequency: "Monthly",
      },
      {
        name: "Small Business Owner",
        ageRange: "35-50",
        location: "Commercial areas",
        income: "₦300,000 - ₦1,000,000/month",
        preferences: ["Business supplies", "Electronics", "Wholesale items"],
        paymentMethod: "Bank Transfer",
        shoppingFrequency: "As needed",
      },
    ];
  }

  /**
   * Get Nigerian local language greetings
   */
  static getLocalGreetings(): Record<
    string,
    { greeting: string; response: string }
  > {
    return {
      hausa: {
        greeting: "Sannu da zuwa (Welcome)",
        response: "Na gode (Thank you)",
      },
      yoruba: {
        greeting: "Ẹ ku aabo (Welcome)",
        response: "A dupe (Thank you)",
      },
      igbo: {
        greeting: "Nno (Welcome)",
        response: "Dalu (Thank you)",
      },
      pidgin: {
        greeting: "Welcome o!",
        response: "Thank you!",
      },
    };
  }

  /**
   * Generate culturally appropriate product descriptions
   */
  static generateCulturalProductTags(category: string): string[] {
    const culturalTags: Record<string, string[]> = {
      fashion: [
        "African print",
        "Ankara style",
        "Traditional wear",
        "Aso ebi ready",
        "Lagos fashion",
        "Nigerian made",
        "Cultural wear",
        "Festival ready",
      ],
      beauty: [
        "For melanin skin",
        "African hair friendly",
        "Natural ingredients",
        "Suitable for Nigerian climate",
        "Dermatologist tested",
        "NAFDAC approved",
      ],
      electronics: [
        "Stable light compatible",
        "Surge protection",
        "Tropical climate rated",
        "Power efficient",
        "Nigerian plug compatible",
        "Warranty in Nigeria",
      ],
      food: [
        "Nigerian spices",
        "Local taste",
        "African cuisine",
        "Traditional recipe",
        "NAFDAC certified",
        "Freshly imported",
        "Halal certified",
      ],
      home: [
        "Tropical climate suitable",
        "Nigerian home friendly",
        "Space efficient",
        "Mosquito protection",
        "Easy maintenance",
        "Local warranty",
      ],
    };

    return (
      culturalTags[category.toLowerCase()] || [
        "Quality assured",
        "Customer tested",
        "Nigerian approved",
      ]
    );
  }
}

/**
 * Export all Nigerian utilities as a single object for easy import
 */
export const NigerianUtils = {
  Phone: NigerianPhoneUtils,
  Currency: NairaCurrencyUtils,
  Location: NigerianLocationUtils,
  Business: NigerianBusinessUtils,
  Validation: NigerianValidationUtils,
  Ecommerce: NigerianEcommerceUtils,
  Marketplace: NigerianMarketplaceUtils,
};

export default NigerianUtils;
