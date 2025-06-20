"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentsConfig = void 0;
exports.paymentsConfig = {
    paystack: {
        secretKey: process.env.PAYSTACK_SECRET_KEY,
        publicKey: process.env.PAYSTACK_PUBLIC_KEY,
        webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
        baseUrl: process.env.PAYSTACK_BASE_URL || "https://api.paystack.co",
        currency: "NGN",
        supportedChannels: [
            "card",
            "bank",
            "ussd",
            "mobile_money",
            "bank_transfer",
        ],
        webhookTimeout: 30000, // 30 seconds
        verificationTimeout: 60000, // 1 minute
        defaultMetadata: {
            platform: "bareloft",
            version: "1.0.0",
        },
    },
    businessRules: {
        currency: "NGN",
        defaultCountry: "NG",
        freeShippingThreshold: parseInt(process.env.FREE_SHIPPING_THRESHOLD || "50000"), // ₦50,000
        taxRate: 0, // Nigeria doesn't have standard e-commerce tax yet
        maxOrderAmount: 10000000, // ₦10,000,000 (about $13,000 USD)
        minOrderAmount: 100, // ₦100
        refundProcessingDays: 7,
        disputeResolutionDays: 14,
    },
    // Nigerian payment method preferences
    paymentMethodPriority: ["card", "bank_transfer", "ussd", "mobile_money"],
    // Bank codes for Nigerian banks (for USSD)
    nigerianBanks: {
        access: "044",
        gtbank: "058",
        zenith: "057",
        uba: "033",
        fidelity: "070",
        fcmb: "214",
        union: "032",
        sterling: "232",
        polaris: "076",
        wema: "035",
    },
};
//# sourceMappingURL=payments.js.map