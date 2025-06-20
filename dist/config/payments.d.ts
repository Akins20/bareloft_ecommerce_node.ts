export declare const paymentsConfig: {
    readonly paystack: {
        readonly secretKey: string;
        readonly publicKey: string;
        readonly webhookSecret: string;
        readonly baseUrl: string;
        readonly currency: "NGN";
        readonly supportedChannels: readonly ["card", "bank", "ussd", "mobile_money", "bank_transfer"];
        readonly webhookTimeout: 30000;
        readonly verificationTimeout: 60000;
        readonly defaultMetadata: {
            readonly platform: "bareloft";
            readonly version: "1.0.0";
        };
    };
    readonly businessRules: {
        readonly currency: "NGN";
        readonly defaultCountry: "NG";
        readonly freeShippingThreshold: number;
        readonly taxRate: 0;
        readonly maxOrderAmount: 10000000;
        readonly minOrderAmount: 100;
        readonly refundProcessingDays: 7;
        readonly disputeResolutionDays: 14;
    };
    readonly paymentMethodPriority: readonly ["card", "bank_transfer", "ussd", "mobile_money"];
    readonly nigerianBanks: {
        readonly access: "044";
        readonly gtbank: "058";
        readonly zenith: "057";
        readonly uba: "033";
        readonly fidelity: "070";
        readonly fcmb: "214";
        readonly union: "032";
        readonly sterling: "232";
        readonly polaris: "076";
        readonly wema: "035";
    };
};
//# sourceMappingURL=payments.d.ts.map