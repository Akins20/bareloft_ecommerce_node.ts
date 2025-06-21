"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTest = exports.isProduction = exports.isDevelopment = exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// Validate required environment variables
const requiredEnvVars = [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET'
];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}
// Create configuration object
exports.config = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3001',
        credentials: true
    },
    database: {
        url: process.env.DATABASE_URL,
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10)
    },
    redis: {
        url: process.env.REDIS_URL,
        ttl: parseInt(process.env.REDIS_TTL || '3600', 10)
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },
    paystack: {
        secretKey: process.env.PAYSTACK_SECRET_KEY || '',
        publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
        webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || ''
    },
    upload: {
        cloudinary: {
            cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
            apiKey: process.env.CLOUDINARY_API_KEY || '',
            apiSecret: process.env.CLOUDINARY_API_SECRET || ''
        },
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp']
    },
    email: {
        apiKey: process.env.SENDGRID_API_KEY || '',
        fromEmail: process.env.FROM_EMAIL || 'noreply@bareloft.com',
        fromName: process.env.FROM_NAME || 'Bareloft'
    },
    sms: {
        apiKey: process.env.SMS_API_KEY || '',
        senderId: process.env.SMS_SENDER_ID || 'Bareloft'
    },
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
        authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5', 10)
    }
};
// Helper functions
const isDevelopment = () => exports.config.nodeEnv === 'development';
exports.isDevelopment = isDevelopment;
const isProduction = () => exports.config.nodeEnv === 'production';
exports.isProduction = isProduction;
const isTest = () => exports.config.nodeEnv === 'test';
exports.isTest = isTest;
//# sourceMappingURL=environment.js.map