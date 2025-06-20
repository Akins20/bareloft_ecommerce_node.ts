export declare const emailConfig: {
    readonly sendgrid: {
        readonly apiKey: string;
        readonly fromEmail: string;
        readonly fromName: string;
        readonly replyTo: string;
        readonly templateIds: {
            readonly welcome: string;
            readonly orderConfirmation: string;
            readonly orderShipped: string;
            readonly orderDelivered: string;
            readonly passwordReset: string;
            readonly lowStock: string;
            readonly newsletter: string;
        };
    };
    readonly defaultSettings: {
        readonly trackOpens: true;
        readonly trackClicks: true;
        readonly enableSandbox: boolean;
        readonly retryAttempts: 3;
        readonly retryDelay: 5000;
        readonly batchSize: 1000;
        readonly unsubscribeGroup: number;
    };
    readonly templates: {
        readonly baseUrl: string;
        readonly logoUrl: "https://res.cloudinary.com/bareloft/image/upload/v1/bareloft/logo.png";
        readonly supportEmail: "support@bareloft.com";
        readonly supportPhone: "+234-800-BARELOFT";
        readonly socialLinks: {
            readonly facebook: "https://facebook.com/bareloft";
            readonly instagram: "https://instagram.com/bareloft";
            readonly twitter: "https://twitter.com/bareloft";
        };
    };
};
//# sourceMappingURL=email.d.ts.map