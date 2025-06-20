"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorLogger = void 0;
const winston_1 = require("../../utils/logger/winston");
const environment_1 = require("../../config/environment");
/**
 * 🎯 Classify error for appropriate handling
 */
const classifyError = (error, req) => {
    const statusCode = error.statusCode || 500;
    const errorCode = error.errorCode || error.code;
    let severity = "medium";
    let category = "system";
    let shouldAlert = false;
    const tags = [];
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
    if (errorCode === "PAYMENT_ERROR" ||
        error.message?.toLowerCase().includes("payment")) {
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
    if (error.message?.toLowerCase().includes("xss") ||
        error.message?.toLowerCase().includes("injection") ||
        error.message?.toLowerCase().includes("csrf")) {
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
const sendErrorAlert = async (error, req, context) => {
    if (!context.shouldAlert || environment_1.environment.NODE_ENV !== "production") {
        return;
    }
    // This would integrate with your alerting system
    // Slack, PagerDuty, email, etc.
    winston_1.logger.error("ALERT: Critical error occurred", {
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
const errorLogger = (error, req, res, next) => {
    const context = classifyError(error, req);
    // Build comprehensive error log
    const errorLog = {
        error: {
            message: error.message,
            name: error.name,
            code: error.errorCode || error.code,
            statusCode: error.statusCode || 500,
            stack: environment_1.environment.NODE_ENV === "development" ? error.stack : undefined,
            details: error.details,
            isOperational: error.isOperational,
        },
        context: {
            ...context,
            requestId: req.id,
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
            duration: Date.now() - req.startTime,
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
        },
    };
    // Log at appropriate level
    switch (context.severity) {
        case "low":
            winston_1.logger.warn("Application error", errorLog);
            break;
        case "medium":
            winston_1.logger.error("Significant error", errorLog);
            break;
        case "high":
            winston_1.logger.error("High severity error", errorLog);
            break;
        case "critical":
            winston_1.logger.error("CRITICAL ERROR", errorLog);
            break;
    }
    // Send alerts for critical errors
    sendErrorAlert(error, req, context);
    next(error);
};
exports.errorLogger = errorLogger;
//# sourceMappingURL=errorLogging.js.map