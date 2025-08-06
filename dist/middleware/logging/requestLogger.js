"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const winston_1 = require("../../utils/logger/winston");
const environment_1 = require("../../config/environment");
// 🔧 Generate unique request ID
const generateRequestId = () => {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
// 🌍 Detect Nigerian mobile networks and devices
const detectNigerianContext = (userAgent, ip) => {
    const isMobile = /Mobile|Android|iPhone|iPad|Windows Phone|Opera Mini/i.test(userAgent);
    // Common Nigerian mobile networks (based on IP ranges - simplified)
    const networkType = ip.startsWith("41.") || ip.startsWith("196.")
        ? "nigerian_mobile"
        : "unknown";
    let deviceType = "desktop";
    if (/Android/i.test(userAgent))
        deviceType = "android";
    else if (/iPhone|iPad/i.test(userAgent))
        deviceType = "ios";
    else if (isMobile)
        deviceType = "mobile_other";
    return { isMobile, networkType, deviceType };
};
// 🔧 Sanitize sensitive data from logs
const sanitizeForLogging = (data) => {
    if (!data || typeof data !== "object")
        return data;
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
    const recursiveSanitize = (obj) => {
        if (Array.isArray(obj)) {
            return obj.map(recursiveSanitize);
        }
        if (obj && typeof obj === "object") {
            for (const [key, value] of Object.entries(obj)) {
                const lowerKey = key.toLowerCase();
                if (sensitiveFields.some((field) => lowerKey.includes(field))) {
                    obj[key] = "[REDACTED]";
                }
                else if (typeof value === "object") {
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
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    // Add request ID to request object for tracking
    req.id = requestId;
    // Detect Nigerian context
    const userAgent = req.get("User-Agent") || "";
    const nigerianContext = detectNigerianContext(userAgent, req.ip || "unknown");
    // Capture original end method to log response
    const originalEnd = res.end;
    const originalWrite = res.write;
    let responseBody = "";
    let responseSent = false;
    // Override write method to capture response body (for errors)
    const self = res;
    res.write = function (chunk, encoding, cb) {
        if (chunk && self.statusCode >= 400) {
            responseBody += chunk.toString();
        }
        return originalWrite.call(self, chunk, encoding, cb);
    };
    // Override end method to log response
    const selfEnd = res;
    res.end = function (chunk, encoding, cb) {
        if (!responseSent) {
            responseSent = true;
            if (chunk && selfEnd.statusCode >= 400) {
                responseBody += chunk.toString();
            }
            const endTime = Date.now();
            const duration = endTime - startTime;
            const contentLength = res.get("Content-Length");
            // Determine log level based on status code
            let logLevel = "info";
            if (selfEnd.statusCode >= 400 && selfEnd.statusCode < 500)
                logLevel = "warn";
            if (selfEnd.statusCode >= 500)
                logLevel = "error";
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
                    statusCode: selfEnd.statusCode,
                    contentLength: contentLength ? parseInt(contentLength) : undefined,
                    headers: sanitizeForLogging({
                        "content-type": selfEnd.get("Content-Type"),
                        "cache-control": selfEnd.get("Cache-Control"),
                        etag: selfEnd.get("ETag"),
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
                    environment: environment_1.config.nodeEnv,
                    nodeVersion: process.version,
                },
            };
            // Add response body for errors (but limit size)
            if (selfEnd.statusCode >= 400 && responseBody) {
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
                    mobileOptimization: duration > 1000
                        ? "Consider mobile optimization"
                        : "Mobile-friendly response time",
                    dataUsage: contentLength
                        ? `${Math.round(parseInt(contentLength) / 1024)}KB`
                        : "Unknown",
                };
            }
            // Log the request
            winston_1.logger[logLevel]("HTTP Request", logData);
        }
        return originalEnd.call(selfEnd, chunk, encoding, cb);
    };
    // Log incoming request (minimal)
    winston_1.logger.info("Incoming request", {
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
exports.requestLogger = requestLogger;
//# sourceMappingURL=requestLogger.js.map