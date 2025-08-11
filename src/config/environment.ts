import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Configuration interface
export interface Config {
  port: number;
  nodeEnv: "development" | "production" | "test";
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

// Validate required environment variables
const requiredEnvVars = [
  "DATABASE_URL",
  "REDIS_URL",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Create configuration object
export const config: Config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: (process.env.NODE_ENV as Config["nodeEnv"]) || "development",

  cors: {
    origin:
      process.env.CORS_ORIGIN?.split(",") ||
      "http://localhost:3001, http://localhost:3000",
    credentials: true,
  },

  database: {
    url: process.env.DATABASE_URL!,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || "10", 10),
  },

  redis: {
    url: process.env.REDIS_URL!,
    ttl: parseInt(process.env.REDIS_TTL || "3600", 10),
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || "",
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || "",
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || "",
  },

  upload: {
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
      apiKey: process.env.CLOUDINARY_API_KEY || "",
      apiSecret: process.env.CLOUDINARY_API_SECRET || "",
    },
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "5242880", 10), // 5MB
    allowedFormats: ["jpg", "jpeg", "png", "webp"],
  },

  email: {
    apiKey: process.env.SENDGRID_API_KEY || "",
    fromEmail: process.env.FROM_EMAIL || "noreply@bareloft.com",
    fromName: process.env.FROM_NAME || "Bareloft",
  },

  sms: {
    apiKey: process.env.SMS_API_KEY || "",
    senderId: process.env.SMS_SENDER_ID || "Bareloft",
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
    authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX || "5", 10),
  },
};

// Helper functions
export const isDevelopment = () => config.nodeEnv === "development";
export const isProduction = () => config.nodeEnv === "production";
export const isTest = () => config.nodeEnv === "test";
