export declare const smsConfig: {
    readonly provider: {
        readonly name: string;
        readonly apiKey: string;
        readonly baseUrl: string;
        readonly senderId: string;
        readonly channel: string;
        readonly type: string;
    };
    readonly settings: {
        readonly retryAttempts: 3;
        readonly retryDelay: 2000;
        readonly timeout: 30000;
        readonly enableDeliveryReports: true;
        readonly maxLength: 160;
        readonly encoding: "utf-8";
    };
    readonly templates: {
        readonly otp: {
            readonly login: "Your Bareloft login code is: {code}. Valid for {minutes} minutes.";
            readonly signup: "Welcome to Bareloft! Your verification code is: {code}. Valid for {minutes} minutes.";
            readonly passwordReset: "Your Bareloft password reset code is: {code}. Valid for {minutes} minutes.";
            readonly phoneVerification: "Verify your phone with code: {code}. Valid for {minutes} minutes.";
        };
        readonly notifications: {
            readonly orderConfirmed: "Order #{orderNumber} confirmed! Total: ₦{amount}. Track: {trackingUrl}";
            readonly orderShipped: "Order #{orderNumber} shipped via {carrier}. Track: {trackingNumber}";
            readonly orderDelivered: "Order #{orderNumber} delivered! Rate your experience: {ratingUrl}";
            readonly paymentReceived: "Payment of ₦{amount} received for order #{orderNumber}. Thank you!";
            readonly lowStock: "Alert: {productName} is low in stock ({quantity} remaining).";
        };
    };
    readonly networkPrefixes: {
        readonly MTN: readonly ["0803", "0806", "0703", "0903", "0905", "0704"];
        readonly GLO: readonly ["0805", "0807", "0811", "0905", "0915"];
        readonly AIRTEL: readonly ["0802", "0808", "0812", "0902", "0904", "0901"];
        readonly "9MOBILE": readonly ["0809", "0817", "0818", "0908", "0909"];
    };
};
//# sourceMappingURL=sms.d.ts.map