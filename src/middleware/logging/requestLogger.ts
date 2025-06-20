import { Request, Response, NextFunction } from "express";
import { logger } from "../../utils/logger/winston";
import { environment } from "../../config/environment";
import { PhoneUtils, MarketUtils } from "../../utils/helpers/nigerian";
import crypto from "crypto";

// 🔧 Generate unique request ID
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// 🌍 Detect Nigerian mobile networks and devices
const detectNigerianContext = (
  userAgent: string,
  ip: string
): {
  isMobile: boolean;
  networkType: string;
  deviceType: string;
} => {
  const isMobile = /Mobile|Android|iPhone|iPad|Windows Phone|Opera Mini/i.test(
    userAgent
  );

  // Common Nigerian mobile networks (based on IP ranges - simplified)
  const networkType =
    ip.startsWith("41.") || ip.startsWith("196.")
      ? "nigerian_mobile"
      : "unknown";

  let deviceType = "desktop";
  if (/Android/i.test(userAgent)) deviceType = "android";
  else if (/iPhone|iPad/i.test(userAgent)) deviceType = "ios";
  else if (isMobile) deviceType = "mobile_other";

  return { isMobile, networkType, deviceType };
};

// 🔧 Sanitize sensitive data from logs
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

/**
 * 📊 Request logging middleware
 * Logs incoming requests with comprehensive context
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const requestId = generateRequestId();

  // Add request ID to request object for tracking
  (req as any).id = requestId;

  // Detect Nigerian context
  const userAgent = req.get("User-Agent") || "";
  const nigerianContext = detectNigerianContext(userAgent, req.ip);

  // Capture original end method to log response
  const originalEnd = res.end;
  const originalWrite = res.write;

  let responseBody = "";
  let responseSent = false;

  // Override write method to capture response body (for errors)
  res.write = function (chunk: any, ...args: any[]): boolean {
    if (chunk && res.statusCode >= 400) {
      responseBody += chunk.toString();
    }
    return originalWrite.call(this, chunk, ...args);
  };

  // Override end method to log response
  res.end = function (chunk?: any, ...args: any[]): void {
    if (!responseSent) {
      responseSent = true;

      if (chunk && res.statusCode >= 400) {
        responseBody += chunk.toString();
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const contentLength = res.get("Content-Length");

      // Determine log level based on status code
      let logLevel: "info" | "warn" | "error" = "info";
      if (res.statusCode >= 400 && res.statusCode < 500) logLevel = "warn";
      if (res.statusCode >= 500) logLevel = "error";

      // Build log data
      const logData = {
        requestId,
        request: {
          method: req.method,
          url: req.originalUrl,
          path: req.path,
          query: sanitizeForLogging(req.query),
          headers: sanitizeForLogging({
            "user-agent": req.get("User-Agent"),
            accept: req.get("Accept"),
            "content-type": req.get("Content-Type"),
            origin: req.get("Origin"),
            referer: req.get("Referer"),
            "x-forwarded-for": req.get("X-Forwarded-For"),
          }),
          ip: req.ip,
          protocol: req.protocol,
          httpVersion: req.httpVersion,
        },
        response: {
          statusCode: res.statusCode,
          contentLength: contentLength ? parseInt(contentLength) : undefined,
          headers: sanitizeForLogging({
            "content-type": res.get("Content-Type"),
            "cache-control": res.get("Cache-Control"),
            etag: res.get("ETag"),
          }),
        },
        timing: {
          duration,
          timestamp: new Date().toISOString(),
          startTime,
          endTime,
        },
        user: req.user
          ? {
              id: req.user.id,
              role: req.user.role,
              sessionId: req.user.sessionId,
            }
          : undefined,
        context: {
          ...nigerianContext,
          environment: environment.NODE_ENV,
          nodeVersion: process.version,
        },
      };

      // Add response body for errors (but limit size)
      if (res.statusCode >= 400 && responseBody) {
        logData.response.body = responseBody.substring(0, 1000); // Limit to 1KB
      }

      // Add request body for POST/PUT/PATCH (sanitized)
      if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
        logData.request.body = sanitizeForLogging(req.body);
      }

      // Log performance warnings
      if (duration > 2000) {
        logData.performance = {
          slow: true,
          threshold: 2000,
          warning: "Request exceeded performance threshold",
        };
      }

      // Nigerian-specific insights
      if (nigerianContext.isMobile) {
        logData.insights = {
          mobileOptimization:
            duration > 1000
              ? "Consider mobile optimization"
              : "Mobile-friendly response time",
          dataUsage: contentLength
            ? `${Math.round(parseInt(contentLength) / 1024)}KB`
            : "Unknown",
        };
      }

      // Log the request
      logger[logLevel]("HTTP Request", logData);
    }

    originalEnd.call(this, chunk, ...args);
  };

  // Log incoming request (minimal)
  logger.info("Incoming request", {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: userAgent.substring(0, 100), // Truncate long user agents
    userId: req.user?.id,
    timestamp: new Date().toISOString(),
  });

  next();
};
