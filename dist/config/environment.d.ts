export interface Config {
    port: number;
    nodeEnv: 'development' | 'production' | 'test';
    cors: {
        origin: string | string[];
        credentials: boolean;
    };
    database: {
        url: string;
        maxConnections: number;
    };
    redis: {
        url: string;
        ttl: number;
    };
    jwt: {
        secret: string;
        refreshSecret: string;
        expiresIn: string;
        refreshExpiresIn: string;
    };
    paystack: {
        secretKey: string;
        publicKey: string;
        webhookSecret: string;
    };
    upload: {
        cloudinary: {
            cloudName: string;
            apiKey: string;
            apiSecret: string;
        };
        maxFileSize: number;
        allowedFormats: string[];
    };
    email: {
        apiKey: string;
        fromEmail: string;
        fromName: string;
    };
    sms: {
        apiKey: string;
        senderId: string;
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
        authMaxRequests: number;
    };
}
export declare const config: Config;
export declare const isDevelopment: () => boolean;
export declare const isProduction: () => boolean;
export declare const isTest: () => boolean;
//# sourceMappingURL=environment.d.ts.map