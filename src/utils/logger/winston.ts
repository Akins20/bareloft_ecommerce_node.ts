// =============================================================================
// src/utils/logger/winston.ts - Logging System
// =============================================================================

import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

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
winston.addColors(customLevels.colors);

/**
 * Custom format for console output
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize({ all: true }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
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
  })
);

/**
 * Custom format for file output
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Create log directory if it doesn't exist
 */
const logDir = path.join(process.cwd(), "logs");

/**
 * Configure transports based on environment
 */
const transports: winston.transport[] = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.LOG_LEVEL || "info",
  })
);

// File transports (only in production or when LOG_TO_FILE is enabled)
if (
  process.env.NODE_ENV === "production" ||
  process.env.LOG_TO_FILE === "true"
) {
  // Error logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      level: "error",
      format: fileFormat,
      maxSize: "20m",
      maxFiles: "14d",
      auditFile: path.join(logDir, "error-audit.json"),
    })
  );

  // Combined logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, "combined-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      format: fileFormat,
      maxSize: "20m",
      maxFiles: "14d",
      auditFile: path.join(logDir, "combined-audit.json"),
    })
  );

  // HTTP access logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, "access-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      level: "http",
      format: fileFormat,
      maxSize: "20m",
      maxFiles: "30d",
      auditFile: path.join(logDir, "access-audit.json"),
    })
  );
}

/**
 * Create the main logger instance
 */
export const logger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.metadata({ fillExcept: ["message", "level", "timestamp"] })
  ),
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
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

/**
 * Nigerian-specific logging utilities
 */
export class NigerianLogger {
  /**
   * Log payment transaction (with naira formatting)
   */
  static logPayment(data: {
    orderId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    reference: string;
    status: string;
    userId?: string;
  }) {
    logger.info("Payment Transaction:", {
      ...data,
      formattedAmount: `₦${data.amount.toLocaleString("en-NG")}`,
      category: "payment",
      country: "NG",
    });
  }

  /**
   * Log SMS sending (for Nigerian numbers)
   */
  static logSMS(data: {
    to: string;
    message: string;
    provider: string;
    status: "sent" | "failed";
    cost?: number;
  }) {
    logger.info("SMS Sent:", {
      ...data,
      maskedNumber: data.to.replace(/(\+234\d{3})\d{4}(\d{3})/, "$1****$2"),
      category: "sms",
      country: "NG",
    });
  }

  /**
   * Log user authentication (with phone number masking)
   */
  static logAuth(data: {
    userId?: string;
    phoneNumber: string;
    action: "login" | "logout" | "signup" | "otp_request" | "otp_verify";
    success: boolean;
    ip?: string;
    userAgent?: string;
  }) {
    logger.info("Authentication Event:", {
      ...data,
      maskedPhone: data.phoneNumber.replace(
        /(\+234\d{3})\d{4}(\d{3})/,
        "$1****$2"
      ),
      category: "auth",
      country: "NG",
    });
  }

  /**
   * Log order events
   */
  static logOrder(data: {
    orderId: string;
    userId: string;
    action: "created" | "paid" | "shipped" | "delivered" | "cancelled";
    amount?: number;
    items?: number;
    shippingState?: string;
  }) {
    logger.info("Order Event:", {
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
  static logInventory(data: {
    productId: string;
    sku: string;
    action: "restock" | "sale" | "adjustment" | "reserved" | "unreserved";
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    reason?: string;
  }) {
    logger.info("Inventory Change:", {
      ...data,
      category: "inventory",
      country: "NG",
    });
  }
}

/**
 * Error logging with context
 */
export class ErrorLogger {
  /**
   * Log application errors with full context
   */
  static logError(
    error: Error,
    context?: {
      userId?: string;
      requestId?: string;
      endpoint?: string;
      method?: string;
      ip?: string;
      userAgent?: string;
      body?: any;
      params?: any;
      query?: any;
    }
  ) {
    logger.error("Application Error:", {
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
  static logDatabaseError(
    error: Error,
    context?: {
      operation: string;
      model: string;
      data?: any;
      where?: any;
    }
  ) {
    logger.error("Database Error:", {
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
  static logExternalApiError(
    error: Error,
    context: {
      service: string;
      endpoint: string;
      method: string;
      statusCode?: number;
      responseBody?: any;
      requestBody?: any;
    }
  ) {
    logger.error("External API Error:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
      category: "external_api",
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Performance monitoring
 */
export class PerformanceLogger {
  /**
   * Log slow database queries
   */
  static logSlowQuery(data: {
    query: string;
    duration: number;
    model: string;
    params?: any;
  }) {
    if (data.duration > 1000) {
      // Log queries taking more than 1 second
      logger.warn("Slow Database Query:", {
        ...data,
        category: "performance",
        threshold: "1000ms",
      });
    }
  }

  /**
   * Log slow API responses
   */
  static logSlowResponse(data: {
    endpoint: string;
    method: string;
    duration: number;
    statusCode: number;
    userId?: string;
  }) {
    if (data.duration > 3000) {
      // Log responses taking more than 3 seconds
      logger.warn("Slow API Response:", {
        ...data,
        category: "performance",
        threshold: "3000ms",
      });
    }
  }
}

/**
 * Security event logging
 */
export class SecurityLogger {
  /**
   * Log suspicious activities
   */
  static logSuspiciousActivity(data: {
    type:
      | "multiple_failed_logins"
      | "suspicious_payment"
      | "rate_limit_exceeded"
      | "invalid_token";
    userId?: string;
    ip: string;
    userAgent?: string;
    details?: any;
  }) {
    logger.warn("Suspicious Activity:", {
      ...data,
      category: "security",
      severity: "medium",
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log security breaches
   */
  static logSecurityBreach(data: {
    type: "data_breach" | "unauthorized_access" | "sql_injection_attempt";
    severity: "low" | "medium" | "high" | "critical";
    details: any;
    ip?: string;
    userAgent?: string;
  }) {
    logger.error("Security Breach:", {
      ...data,
      category: "security",
      alertRequired: true,
      timestamp: new Date().toISOString(),
    });
  }
}

export default logger;
