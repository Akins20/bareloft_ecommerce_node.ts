import { Request, Response, NextFunction } from "express";
import { logger } from "../../utils/logger/winston";
import { config } from "../../config/environment";

/**
 * 🧹 Sanitize sensitive data for logging
 */
const sanitizeForLogging = (data: any): any => {
  if (!data || typeof data !== "object") return data;

  const sensitiveFields = [
    "password",
    "token",
    "authorization",
    "cookie",
    "session",
    "secret",
    "key",
    "otp",
    "pin",
    "cvv",
    "cardNumber",
    "accountNumber",
  ];

  const sanitized = JSON.parse(JSON.stringify(data));

  const recursiveSanitize = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(recursiveSanitize);
    }

    if (obj && typeof obj === "object") {
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();

        if (sensitiveFields.some((field) => lowerKey.includes(field))) {
          obj[key] = "[REDACTED]";
        } else if (typeof value === "object") {
          obj[key] = recursiveSanitize(value);
        }
      }
    }

    return obj;
  };

  return recursiveSanitize(sanitized);
};

interface ErrorContext {
  severity: "low" | "medium" | "high" | "critical";
  category: "user" | "system" | "external" | "security";
  shouldAlert: boolean;
  tags: string[];
}

/**
 * 🎯 Classify error for appropriate handling
 */
const classifyError = (error: any, req: Request): ErrorContext => {
  const statusCode = error.statusCode || 500;
  const errorCode = error.errorCode || error.code;

  let severity: "low" | "medium" | "high" | "critical" = "medium";
  let category: "user" | "system" | "external" | "security" = "system";
  let shouldAlert = false;
  const tags: string[] = [];

  // User errors (4xx)
  if (statusCode >= 400 && statusCode < 500) {
    category = "user";
    severity = "low";

    if (statusCode === 401 || statusCode === 403) {
      category = "security";
      tags.push("auth");
    }

    if (statusCode === 429) {
      category = "security";
      severity = "medium";
      tags.push("rate-limit");
    }
  }

  // Server errors (5xx)
  if (statusCode >= 500) {
    category = "system";
    severity = "high";
    shouldAlert = true;
    tags.push("server-error");
  }

  // Database errors
  if (errorCode?.startsWith("P") || error.name?.includes("Prisma")) {
    category = "system";
    severity = "high";
    shouldAlert = true;
    tags.push("database");
  }

  // Payment errors
  if (
    errorCode === "PAYMENT_ERROR" ||
    error.message?.toLowerCase().includes("payment")
  ) {
    category = "external";
    severity = "critical";
    shouldAlert = true;
    tags.push("payment", "revenue-impact");
  }

  // External service errors
  if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
    category = "external";
    severity = "high";
    shouldAlert = true;
    tags.push("external-service");
  }

  // Security-related errors
  if (
    error.message?.toLowerCase().includes("xss") ||
    error.message?.toLowerCase().includes("injection") ||
    error.message?.toLowerCase().includes("csrf")
  ) {
    category = "security";
    severity = "critical";
    shouldAlert = true;
    tags.push("security-threat");
  }

  // Nigerian-specific context
  if (req.ip?.startsWith("41.") || req.ip?.startsWith("196.")) {
    tags.push("nigerian-user");
  }

  if (req.get("User-Agent")?.includes("Mobile")) {
    tags.push("mobile");
  }

  return { severity, category, shouldAlert, tags };
};

/**
 * 📧 Send alert for critical errors
 */
const sendErrorAlert = async (
  error: any,
  req: Request,
  context: ErrorContext
): Promise<void> => {
  if (!context.shouldAlert || config.nodeEnv !== "production") {
    return;
  }

  // This would integrate with your alerting system
  // Slack, PagerDuty, email, etc.
  logger.error("ALERT: Critical error occurred", {
    alert: true,
    severity: context.severity,
    category: context.category,
    tags: context.tags,
    error: {
      message: error.message,
      code: error.errorCode || error.code,
      statusCode: error.statusCode,
      stack: error.stack,
    },
    request: {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      userId: req.user?.id,
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * 🔍 Error logging middleware
 */
export const errorLogger = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const context = classifyError(error, req);

  // Build comprehensive error log
  const errorLog = {
    error: {
      message: error.message,
      name: error.name,
      code: error.errorCode || error.code,
      statusCode: error.statusCode || 500,
      stack: config.nodeEnv === "development" ? error.stack : undefined,
      details: error.details,
      isOperational: error.isOperational,
    },
    context: {
      ...context,
      requestId: (req as any).id,
      timestamp: new Date().toISOString(),
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      path: req.path,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      headers: sanitizeForLogging(req.headers),
      body: ["POST", "PUT", "PATCH"].includes(req.method)
        ? sanitizeForLogging(req.body)
        : undefined,
    },
    user: req.user
      ? {
          id: req.user.id,
          role: req.user.role,
          sessionId: req.user.sessionId,
        }
      : undefined,
    session: {
      duration: Date.now() - (req as any).startTime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    },
  };

  // Log at appropriate level
  switch (context.severity) {
    case "low":
      logger.warn("Application error", errorLog);
      break;
    case "medium":
      logger.error("Significant error", errorLog);
      break;
    case "high":
      logger.error("High severity error", errorLog);
      break;
    case "critical":
      logger.error("CRITICAL ERROR", errorLog);
      break;
  }

  // Send alerts for critical errors
  sendErrorAlert(error, req, context);

  next(error);
};
