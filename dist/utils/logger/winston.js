"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityLogger = exports.PerformanceLogger = exports.ErrorLogger = exports.NigerianLogger = exports.httpLogStream = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const path_1 = __importDefault(require("path"));
/**
 * Custom log levels for our application
 */
const customLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        debug: 4,
    },
    colors: {
        error: "red",
        warn: "yellow",
        info: "green",
        http: "magenta",
        debug: "blue",
    },
};
/**
 * Add colors to Winston
 */
winston_1.default.addColors(customLevels.colors);
/**
 * Custom format for console output
 */
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston_1.default.format.colorize({ all: true }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} ${level}: ${message}`;
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
        log += ` ${JSON.stringify(meta, null, 2)}`;
    }
    // Add stack trace for errors
    if (stack) {
        log += `\n${stack}`;
    }
    return log;
}));
/**
 * Custom format for file output
 */
const fileFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
/**
 * Create log directory if it doesn't exist
 */
const logDir = path_1.default.join(process.cwd(), "logs");
/**
 * Configure transports based on environment
 */
const transports = [];
// Console transport (always enabled)
transports.push(new winston_1.default.transports.Console({
    format: consoleFormat,
    level: process.env.LOG_LEVEL || "info",
}));
// File transports (only in production or when LOG_TO_FILE is enabled)
if (process.env.NODE_ENV === "production" ||
    process.env.LOG_TO_FILE === "true") {
    // Error logs
    transports.push(new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(logDir, "error-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        level: "error",
        format: fileFormat,
        maxSize: "20m",
        maxFiles: "14d",
        auditFile: path_1.default.join(logDir, "error-audit.json"),
    }));
    // Combined logs
    transports.push(new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(logDir, "combined-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        format: fileFormat,
        maxSize: "20m",
        maxFiles: "14d",
        auditFile: path_1.default.join(logDir, "combined-audit.json"),
    }));
    // HTTP access logs
    transports.push(new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(logDir, "access-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        level: "http",
        format: fileFormat,
        maxSize: "20m",
        maxFiles: "30d",
        auditFile: path_1.default.join(logDir, "access-audit.json"),
    }));
}
/**
 * Create the main logger instance
 */
exports.logger = winston_1.default.createLogger({
    levels: customLevels.levels,
    level: process.env.LOG_LEVEL || "info",
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.metadata({ fillExcept: ["message", "level", "timestamp"] })),
    defaultMeta: {
        service: "bareloft-api",
        version: process.env.npm_package_version || "1.0.0",
        environment: process.env.NODE_ENV || "development",
    },
    transports,
    exitOnError: false,
});
/**
 * Stream for Morgan HTTP logging
 */
exports.httpLogStream = {
    write: (message) => {
        exports.logger.http(message.trim());
    },
};
/**
 * Nigerian-specific logging utilities
 */
class NigerianLogger {
    /**
     * Log payment transaction (with naira formatting)
     */
    static logPayment(data) {
        exports.logger.info("Payment Transaction:", {
            ...data,
            formattedAmount: `₦${data.amount.toLocaleString("en-NG")}`,
            category: "payment",
            country: "NG",
        });
    }
    /**
     * Log SMS sending (for Nigerian numbers)
     */
    static logSMS(data) {
        exports.logger.info("SMS Sent:", {
            ...data,
            maskedNumber: data.to.replace(/(\+234\d{3})\d{4}(\d{3})/, "$1****$2"),
            category: "sms",
            country: "NG",
        });
    }
    /**
     * Log user authentication (with phone number masking)
     */
    static logAuth(data) {
        exports.logger.info("Authentication Event:", {
            ...data,
            maskedPhone: data.phoneNumber.replace(/(\+234\d{3})\d{4}(\d{3})/, "$1****$2"),
            category: "auth",
            country: "NG",
        });
    }
    /**
     * Log order events
     */
    static logOrder(data) {
        exports.logger.info("Order Event:", {
            ...data,
            formattedAmount: data.amount
                ? `₦${data.amount.toLocaleString("en-NG")}`
                : undefined,
            category: "order",
            country: "NG",
        });
    }
    /**
     * Log inventory changes
     */
    static logInventory(data) {
        exports.logger.info("Inventory Change:", {
            ...data,
            category: "inventory",
            country: "NG",
        });
    }
}
exports.NigerianLogger = NigerianLogger;
/**
 * Error logging with context
 */
class ErrorLogger {
    /**
     * Log application errors with full context
     */
    static logError(error, context) {
        exports.logger.error("Application Error:", {
            name: error.name,
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString(),
        });
    }
    /**
     * Log database errors
     */
    static logDatabaseError(error, context) {
        exports.logger.error("Database Error:", {
            name: error.name,
            message: error.message,
            stack: error.stack,
            context,
            category: "database",
            timestamp: new Date().toISOString(),
        });
    }
    /**
     * Log external API errors
     */
    static logExternalApiError(error, context) {
        exports.logger.error("External API Error:", {
            name: error.name,
            message: error.message,
            stack: error.stack,
            context,
            category: "external_api",
            timestamp: new Date().toISOString(),
        });
    }
}
exports.ErrorLogger = ErrorLogger;
/**
 * Performance monitoring
 */
class PerformanceLogger {
    /**
     * Log slow database queries
     */
    static logSlowQuery(data) {
        if (data.duration > 1000) {
            // Log queries taking more than 1 second
            exports.logger.warn("Slow Database Query:", {
                ...data,
                category: "performance",
                threshold: "1000ms",
            });
        }
    }
    /**
     * Log slow API responses
     */
    static logSlowResponse(data) {
        if (data.duration > 3000) {
            // Log responses taking more than 3 seconds
            exports.logger.warn("Slow API Response:", {
                ...data,
                category: "performance",
                threshold: "3000ms",
            });
        }
    }
}
exports.PerformanceLogger = PerformanceLogger;
/**
 * Security event logging
 */
class SecurityLogger {
    /**
     * Log suspicious activities
     */
    static logSuspiciousActivity(data) {
        exports.logger.warn("Suspicious Activity:", {
            ...data,
            category: "security",
            severity: "medium",
            timestamp: new Date().toISOString(),
        });
    }
    /**
     * Log security breaches
     */
    static logSecurityBreach(data) {
        exports.logger.error("Security Breach:", {
            ...data,
            category: "security",
            alertRequired: true,
            timestamp: new Date().toISOString(),
        });
    }
}
exports.SecurityLogger = SecurityLogger;
exports.default = exports.logger;
//# sourceMappingURL=winston.js.map