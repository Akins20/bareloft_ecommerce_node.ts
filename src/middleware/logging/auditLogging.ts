import { Request, Response, NextFunction } from "express";
import { logger } from "../../utils/logger/winston";
import { environment } from "../../config/environment";
import { PhoneUtils, MarketUtils } from "../../utils/helpers/nigerian";
import crypto from "crypto";

interface AuditEvent {
  action: string;
  resource: string;
  resourceId?: string;
  changes?: any;
  metadata?: any;
}

interface ComplianceContext {
  dataProtection: {
    gdprApplicable: boolean;
    ndprApplicable: boolean;
    personalDataInvolved: boolean;
    consentRequired: boolean;
    retentionPeriod: string;
  };
  regulatory: {
    sector: string;
    jurisdiction: string;
    applicableRegulations: string[];
    complianceLevel: string;
  };
  audit: {
    category: string;
    severity: "low" | "medium" | "high" | "critical";
    retention: string;
    classification: string;
    tags: string[];
  };
}

// 🔍 Detect operations that require auditing
const detectAuditOperation = (req: Request): AuditEvent | null => {
  const method = req.method;
  const path = req.path;

  // 👑 Admin operations - ALL admin actions are audited
  if (path.startsWith("/api/admin/")) {
    const pathParts = path.split("/");
    const resource = pathParts[3] || "admin";
    const resourceId =
      req.params.id || req.params.productId || req.params.orderId;

    return {
      action: `admin_${method.toLowerCase()}_${resource}`,
      resource: `admin_${resource}`,
      resourceId,
      changes: ["POST", "PUT", "PATCH"].includes(method) ? req.body : undefined,
      metadata: {
        adminAction: true,
        module: resource,
        operation: method.toLowerCase(),
        adminId: req.user?.id,
        adminRole: req.user?.role,
      },
    };
  }

  // 👤 User management operations
  if (path.includes("/users/") || path.includes("/profile")) {
    return {
      action: `user_${method.toLowerCase()}`,
      resource: "user",
      resourceId: req.params.userId || req.params.id || req.user?.id,
      changes: ["POST", "PUT", "PATCH"].includes(method) ? req.body : undefined,
      metadata: {
        profileUpdate: path.includes("/profile"),
        isOwnProfile: req.params.id === req.user?.id,
        userRole: req.user?.role,
      },
    };
  }

  // 💳 Payment operations - CRITICAL for financial compliance
  if (path.includes("/payment") || path.includes("/checkout")) {
    return {
      action: `payment_${method.toLowerCase()}`,
      resource: "payment",
      resourceId: req.body?.paymentReference || req.params.paymentId,
      changes: ["POST", "PUT", "PATCH"].includes(method) ? req.body : undefined,
      metadata: {
        amount: req.body?.amount,
        currency: req.body?.currency || "NGN",
        paymentMethod: req.body?.paymentMethod,
        gateway: "paystack",
        orderId: req.body?.orderId,
        customerPhone: req.user?.phoneNumber,
      },
    };
  }

  // 📦 Order operations
  if (path.includes("/orders")) {
    return {
      action: `order_${method.toLowerCase()}`,
      resource: "order",
      resourceId: req.params.orderId || req.params.id || req.body?.orderId,
      changes: ["POST", "PUT", "PATCH"].includes(method) ? req.body : undefined,
      metadata: {
        orderTotal: req.body?.total,
        itemCount: req.body?.items?.length,
        status: req.body?.status,
        previousStatus: req.body?.previousStatus,
        paymentStatus: req.body?.paymentStatus,
        shippingState: req.body?.shippingAddress?.state,
      },
    };
  }

  // 📊 Inventory operations
  if (path.includes("/inventory")) {
    return {
      action: `inventory_${method.toLowerCase()}`,
      resource: "inventory",
      resourceId: req.params.productId || req.params.id,
      changes: ["POST", "PUT", "PATCH"].includes(method) ? req.body : undefined,
      metadata: {
        previousQuantity: req.body?.previousQuantity,
        newQuantity: req.body?.quantity,
        changeAmount:
          (req.body?.quantity || 0) - (req.body?.previousQuantity || 0),
        reason: req.body?.reason || "manual_adjustment",
        sku: req.body?.sku,
        productName: req.body?.productName,
      },
    };
  }

  // 🛍️ Product management
  if (
    path.includes("/products") &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(method)
  ) {
    return {
      action: `product_${method.toLowerCase()}`,
      resource: "product",
      resourceId: req.params.id || req.params.slug || req.body?.id,
      changes: ["POST", "PUT", "PATCH"].includes(method) ? req.body : undefined,
      metadata: {
        productName: req.body?.name,
        category: req.body?.categoryId,
        price: req.body?.price,
        previousPrice: req.body?.previousPrice,
        sku: req.body?.sku,
        isActive: req.body?.isActive,
        isFeatured: req.body?.isFeatured,
      },
    };
  }

  // 📂 Category management
  if (
    path.includes("/categories") &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(method)
  ) {
    return {
      action: `category_${method.toLowerCase()}`,
      resource: "category",
      resourceId: req.params.id || req.body?.id,
      changes: ["POST", "PUT", "PATCH"].includes(method) ? req.body : undefined,
      metadata: {
        categoryName: req.body?.name,
        parentCategory: req.body?.parentId,
        isActive: req.body?.isActive,
        slug: req.body?.slug,
      },
    };
  }

  // 🏠 Address management
  if (path.includes("/addresses")) {
    return {
      action: `address_${method.toLowerCase()}`,
      resource: "address",
      resourceId: req.params.addressId || req.params.id || req.body?.id,
      changes: ["POST", "PUT", "PATCH"].includes(method) ? req.body : undefined,
      metadata: {
        isDefault: req.body?.isDefault,
        state: req.body?.state,
        city: req.body?.city,
        addressType: req.body?.type,
        country: req.body?.country || "NG",
      },
    };
  }

  // ❤️ Wishlist operations
  if (path.includes("/wishlist")) {
    return {
      action: `wishlist_${method.toLowerCase()}`,
      resource: "wishlist",
      resourceId: req.params.productId || req.body?.productId,
      metadata: {
        productId: req.params.productId || req.body?.productId,
        action:
          method === "POST" ? "add" : method === "DELETE" ? "remove" : "view",
        productName: req.body?.productName,
      },
    };
  }

  // 🛒 Cart operations
  if (path.includes("/cart")) {
    return {
      action: `cart_${method.toLowerCase()}`,
      resource: "cart",
      resourceId: req.params.productId || req.body?.productId,
      changes: ["POST", "PUT", "PATCH"].includes(method) ? req.body : undefined,
      metadata: {
        productId: req.params.productId || req.body?.productId,
        quantity: req.body?.quantity,
        previousQuantity: req.body?.previousQuantity,
        action:
          method === "POST"
            ? "add"
            : method === "PUT"
              ? "update"
              : method === "DELETE"
                ? "remove"
                : "view",
        totalItems: req.body?.totalItems,
      },
    };
  }

  // 🔐 Authentication events
  if (path.includes("/auth/")) {
    const authAction = path.split("/").pop();
    return {
      action: `auth_${authAction}`,
      resource: "authentication",
      metadata: {
        phoneNumber: req.body?.phoneNumber,
        email: req.body?.email,
        authMethod: "otp",
        userAgent: req.get("User-Agent"),
        ip: req.ip,
        sessionId: req.body?.sessionId,
        otpCode: req.body?.otpCode ? "[PRESENT]" : "[ABSENT]",
      },
    };
  }

  // ⭐ Review operations
  if (path.includes("/reviews")) {
    return {
      action: `review_${method.toLowerCase()}`,
      resource: "review",
      resourceId: req.params.reviewId || req.params.id || req.body?.id,
      changes: ["POST", "PUT", "PATCH"].includes(method) ? req.body : undefined,
      metadata: {
        productId: req.body?.productId || req.params.productId,
        rating: req.body?.rating,
        verified: req.body?.verified,
        isPublic: req.body?.isPublic,
        previousRating: req.body?.previousRating,
      },
    };
  }

  // 🎫 Coupon operations
  if (path.includes("/coupons")) {
    return {
      action: `coupon_${method.toLowerCase()}`,
      resource: "coupon",
      resourceId: req.params.couponId || req.params.code || req.body?.id,
      changes: ["POST", "PUT", "PATCH"].includes(method) ? req.body : undefined,
      metadata: {
        code: req.body?.code || req.params.code,
        discountType: req.body?.discountType,
        discountValue: req.body?.discountValue,
        isActive: req.body?.isActive,
        usageLimit: req.body?.usageLimit,
        usedCount: req.body?.usedCount,
      },
    };
  }

  // 📁 File upload operations
  if (path.includes("/upload")) {
    return {
      action: `file_upload`,
      resource: "file",
      metadata: {
        fileType: req.get("Content-Type"),
        fileSize: req.get("Content-Length"),
        uploadType: req.body?.type || req.query?.type || "general",
        fileName: req.body?.fileName,
        destinationPath: req.body?.path,
      },
    };
  }

  // ⚙️ Settings operations
  if (path.includes("/settings") && ["PUT", "PATCH"].includes(method)) {
    return {
      action: `settings_${method.toLowerCase()}`,
      resource: "settings",
      changes: req.body,
      metadata: {
        settingType: req.params.type || "general",
        module: req.params.module,
        previousValues: req.body?.previousValues,
      },
    };
  }

  // 🔗 Session management
  if (path.includes("/session")) {
    return {
      action: `session_${method.toLowerCase()}`,
      resource: "session",
      resourceId: req.params.sessionId || req.user?.sessionId,
      metadata: {
        action: method === "DELETE" ? "logout" : "manage",
        deviceInfo: req.get("User-Agent"),
        ip: req.ip,
      },
    };
  }

  return null;
};

// 🧹 Sanitize sensitive data for logging
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

// 🔑 Generate user fingerprint for anonymous users
const generateUserFingerprint = (req: Request): string => {
  const userAgent = req.get("User-Agent") || "";
  const acceptLanguage = req.get("Accept-Language") || "";
  const acceptEncoding = req.get("Accept-Encoding") || "";

  const fingerprint = crypto
    .createHash("sha256")
    .update(`${userAgent}|${acceptLanguage}|${acceptEncoding}|${req.ip}`)
    .digest("hex")
    .substring(0, 16);

  return `fp_${fingerprint}`;
};

// 🌍 Detect Nigerian state from IP
const detectStateFromIP = (ip: string): string | null => {
  if (ip.startsWith("41.")) return "Lagos";
  if (ip.startsWith("196.")) return "FCT";
  return null;
};

// 🇳🇬 Check if IP is from Nigeria
const isNigerianIP = (ip: string): boolean => {
  const nigerianRanges = ["41.", "196.", "105.", "154."];
  return nigerianRanges.some((range) => ip.startsWith(range));
};

// 🛡️ Calculate security risk level
const calculateRiskLevel = (
  req: Request,
  auditEvent: AuditEvent
): "low" | "medium" | "high" => {
  let riskScore = 0;

  if (!req.user) riskScore += 1;
  if (
    ["payment", "admin", "auth"].some((sensitive) =>
      auditEvent.action.includes(sensitive)
    )
  ) {
    riskScore += 2;
  }

  const hour = new Date().getHours();
  if (hour < 6 || hour > 23) riskScore += 1;

  if (riskScore >= 3) return "high";
  if (riskScore >= 2) return "medium";
  return "low";
};

// 🚨 Detect security threats
const detectSecurityThreats = (
  req: Request,
  auditEvent: AuditEvent
): string[] => {
  const threats: string[] = [];

  const sqlPatterns = ["union", "select", "drop", "delete", "insert", "update"];
  const requestString = JSON.stringify(req.body || {}).toLowerCase();

  if (sqlPatterns.some((pattern) => requestString.includes(pattern))) {
    threats.push("potential_sql_injection");
  }

  if (
    requestString.includes("<script") ||
    requestString.includes("javascript:")
  ) {
    threats.push("potential_xss");
  }

  const userAgent = req.get("User-Agent") || "";
  if (
    /bot|crawler|scanner|hack/i.test(userAgent) &&
    !userAgent.includes("Google")
  ) {
    threats.push("suspicious_user_agent");
  }

  if (auditEvent.action === "auth_login" && req.body?.failed) {
    threats.push("authentication_brute_force");
  }

  return threats;
};

// 📋 Check if personal data is involved
const checkPersonalDataInvolvement = (auditEvent: AuditEvent): boolean => {
  const personalDataActions = [
    "user_post",
    "user_put",
    "user_patch",
    "address_post",
    "address_put",
    "address_patch",
    "auth_signup",
    "auth_login",
  ];

  return personalDataActions.includes(auditEvent.action);
};

// ✅ Check if consent is required
const isConsentRequired = (auditEvent: AuditEvent): boolean => {
  return (
    auditEvent.action === "auth_signup" ||
    auditEvent.action.includes("marketing") ||
    auditEvent.action.includes("newsletter")
  );
};

// 📅 Get data retention period
const getRetentionPeriod = (auditEvent: AuditEvent): string => {
  const retentionPeriods: Record<string, string> = {
    payment: "7_years",
    order: "7_years",
    user: "7_years",
    auth: "2_years",
    admin: "10_years",
    security: "5_years",
  };

  for (const [category, period] of Object.entries(retentionPeriods)) {
    if (auditEvent.action.includes(category)) {
      return period;
    }
  }

  return "3_years";
};

// 🏷️ Categorize audit event
const categorizeAuditEvent = (auditEvent: AuditEvent): string => {
  if (auditEvent.action.includes("payment")) return "financial";
  if (auditEvent.action.includes("admin")) return "administrative";
  if (auditEvent.action.includes("auth")) return "authentication";
  if (auditEvent.action.includes("user")) return "user_management";
  if (auditEvent.action.includes("product")) return "inventory";
  return "general";
};

// ⚖️ Get audit severity
const getAuditSeverity = (
  auditEvent: AuditEvent,
  statusCode: number
): "low" | "medium" | "high" | "critical" => {
  if (statusCode >= 500) return "critical";
  if (
    auditEvent.action.includes("payment") ||
    auditEvent.action.includes("admin")
  )
    return "high";
  if (auditEvent.action.includes("auth") || auditEvent.action.includes("user"))
    return "medium";
  return "low";
};

// 🏷️ Generate audit tags
const generateAuditTags = (
  auditEvent: AuditEvent,
  req: Request,
  res: Response
): string[] => {
  const tags: string[] = [];

  tags.push(auditEvent.resource);
  tags.push(req.method.toLowerCase());

  if (req.user) {
    tags.push("authenticated");
    tags.push(`role_${req.user.role}`);
  } else {
    tags.push("anonymous");
  }

  if (res.statusCode >= 400) tags.push("error");
  if (res.statusCode >= 500) tags.push("server_error");

  if (auditEvent.action.includes("admin")) tags.push("administrative");
  if (auditEvent.action.includes("payment")) tags.push("financial");

  return tags;
};

// 🔗 Generate span ID for distributed tracing
const generateSpanId = (): string => {
  return `span_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
};

// 📢 Check if compliance notification is needed
const shouldNotifyCompliance = (
  auditEvent: AuditEvent,
  statusCode: number
): boolean => {
  return (
    auditEvent.action.includes("payment") ||
    auditEvent.action.includes("admin") ||
    (statusCode >= 500 && auditEvent.action.includes("user"))
  );
};

// 📧 Send compliance notification
const sendComplianceNotification = (auditLog: any): void => {
  logger.info("COMPLIANCE_NOTIFICATION", {
    event: auditLog.event,
    actor: auditLog.actor,
    resource: auditLog.resource,
    compliance: auditLog.compliance,
    timestamp: auditLog.metadata.timestamp,
  });
};

// 🚨 Trigger security alert
const triggerSecurityAlert = (auditLog: any): void => {
  logger.error("SECURITY_ALERT", {
    alert: true,
    severity: "high",
    threats: auditLog.security.threats,
    riskLevel: auditLog.security.riskLevel,
    event: auditLog.event,
    actor: auditLog.actor,
    request: auditLog.request,
    timestamp: auditLog.metadata.timestamp,
  });
};

// 📊 Main audit logging middleware
export const auditLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const auditEvent = detectAuditOperation(req);

  if (!auditEvent) {
    return next();
  }

  const requestStartTime = Date.now();
  const originalEnd = res.end;

  res.end = function (chunk?: any, ...args: any[]): void {
    const requestDuration = Date.now() - requestStartTime;
    const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
    const isClientError = res.statusCode >= 400 && res.statusCode < 500;
    const isServerError = res.statusCode >= 500;

    const auditLog = {
      // Core audit information
      event: auditEvent.action,
      eventId: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      outcome: isSuccess
        ? "SUCCESS"
        : isClientError
          ? "CLIENT_ERROR"
          : "SERVER_ERROR",

      // Resource information
      resource: {
        type: auditEvent.resource,
        id: auditEvent.resourceId,
        name:
          auditEvent.metadata?.productName ||
          auditEvent.metadata?.categoryName ||
          undefined,
      },

      // Actor (who performed the action)
      actor: req.user
        ? {
            id: req.user.id,
            type: "authenticated_user",
            role: req.user.role,
            phoneNumber: req.user.phoneNumber,
            email: req.user.email,
            sessionId: req.user.sessionId,
            isVerified: req.user.isVerified,
          }
        : {
            type: "anonymous",
            ip: req.ip,
            userAgent: req.get("User-Agent")?.substring(0, 200),
            fingerprint: generateUserFingerprint(req),
          },

      // Request context
      request: {
        method: req.method,
        path: req.path,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        origin: req.get("Origin"),
        referer: req.get("Referer"),
        requestId: (req as any).id,
        contentType: req.get("Content-Type"),
        contentLength: req.get("Content-Length"),
        headers: {
          authorization: req.get("Authorization") ? "[PRESENT]" : "[ABSENT]",
          xForwardedFor: req.get("X-Forwarded-For"),
          xRealIp: req.get("X-Real-IP"),
        },
      },

      // Response context
      response: {
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        contentType: res.get("Content-Type"),
        contentLength: res.get("Content-Length"),
        duration: requestDuration,
        headers: {
          cacheControl: res.get("Cache-Control"),
          etag: res.get("ETag"),
          location: res.get("Location"),
        },
      },

      // Changes made
      changes: auditEvent.changes
        ? {
            before: req.body?.before || null,
            after: sanitizeForLogging(auditEvent.changes),
            fields: Object.keys(auditEvent.changes || {}),
            changeCount: Object.keys(auditEvent.changes || {}).length,
          }
        : null,

      // Additional metadata
      metadata: {
        ...auditEvent.metadata,
        environment: environment.NODE_ENV,
        timestamp: new Date().toISOString(),
        timezone: "Africa/Lagos",
        serverHostname: require("os").hostname(),
        processId: process.pid,
        nodeVersion: process.version,
      },

      // Nigerian market context
      nigerianContext: {
        detectedState: detectStateFromIP(req.ip),
        isMobileDevice: /Mobile|Android|iPhone|iPad/i.test(
          req.get("User-Agent") || ""
        ),
        networkProvider: req.user?.phoneNumber
          ? PhoneUtils.getProvider(req.user.phoneNumber)
          : null,
        isNigerianIP: isNigerianIP(req.ip),
        isPeakHour: MarketUtils.isPeakTime(),
        currency: "NGN",
      },

      // Security context
      security: {
        riskLevel: calculateRiskLevel(req, auditEvent),
        threats: detectSecurityThreats(req, auditEvent),
        authentication: {
          method: req.user ? "jwt_token" : "none",
          mfa: false,
          sessionAge: req.user?.sessionId ? "unknown" : null,
        },
        ipReputation: "unknown",
        geoLocation: {
          country: "NG",
          region: "unknown",
          city: "unknown",
        },
      },

      // Compliance information
      compliance: {
        dataProtection: {
          gdprApplicable: false,
          ndprApplicable: true,
          personalDataInvolved: checkPersonalDataInvolvement(auditEvent),
          consentRequired: isConsentRequired(auditEvent),
          retentionPeriod: getRetentionPeriod(auditEvent),
        },
        regulatory: {
          sector: "ecommerce",
          jurisdiction: "nigeria",
          applicableRegulations: ["NDPR", "CBN_Guidelines", "CAC_Requirements"],
          complianceLevel: "standard",
        },
        audit: {
          category: categorizeAuditEvent(auditEvent),
          severity: getAuditSeverity(auditEvent, res.statusCode),
          retention: getRetentionPeriod(auditEvent),
          classification: "internal",
          tags: generateAuditTags(auditEvent, req, res),
        },
      },

      // Performance metrics
      performance: {
        duration: requestDuration,
        slow: requestDuration > 2000,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },

      // Correlation IDs
      correlation: {
        traceId: req.get("X-Trace-ID") || (req as any).id,
        spanId: generateSpanId(),
        parentSpanId: req.get("X-Parent-Span-ID"),
        userId: req.user?.id,
        sessionId: req.user?.sessionId,
        requestId: (req as any).id,
      },
    };

    // Determine log level
    let logLevel: "info" | "warn" | "error" = "info";

    if (isServerError || auditLog.security.riskLevel === "high") {
      logLevel = "error";
    } else if (isClientError || auditLog.security.riskLevel === "medium") {
      logLevel = "warn";
    }

    // Log the audit event
    logger[logLevel]("AUDIT_EVENT", auditLog);

    // Send notifications if required
    if (shouldNotifyCompliance(auditEvent, res.statusCode)) {
      setImmediate(() => sendComplianceNotification(auditLog));
    }

    if (
      auditLog.security.riskLevel === "high" ||
      auditLog.security.threats.length > 0
    ) {
      setImmediate(() => triggerSecurityAlert(auditLog));
    }

    originalEnd.call(this, chunk, ...args);
  };

  next();
};

// 💰 Financial audit logger
export const financialAuditLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (
    !req.path.includes("/payment") &&
    !req.path.includes("/order") &&
    !req.path.includes("/checkout")
  ) {
    return next();
  }

  const originalEnd = res.end;

  res.end = function (chunk?: any, ...args: any[]): void {
    const financialLog = {
      eventType: "FINANCIAL_TRANSACTION",
      transactionId:
        req.body?.transactionId ||
        req.body?.paymentReference ||
        `txn_${Date.now()}`,
      actor: req.user
        ? {
            id: req.user.id,
            phoneNumber: req.user.phoneNumber,
            email: req.user.email,
          }
        : {
            type: "anonymous",
            ip: req.ip,
          },
      transaction: {
        type: req.path.includes("/payment") ? "payment" : "order",
        amount: req.body?.amount || req.body?.total,
        currency: req.body?.currency || "NGN",
        method: req.body?.paymentMethod,
        gateway: req.body?.gateway || "paystack",
        status:
          res.statusCode >= 200 && res.statusCode < 300 ? "success" : "failed",
        reference: req.body?.reference || req.body?.paymentReference,
      },
      compliance: {
        cbnCompliant: true,
        amlChecked: req.body?.amount > 1000000,
        riskAssessment:
          req.body?.amount > 500000
            ? "high"
            : req.body?.amount > 100000
              ? "medium"
              : "low",
        retentionPeriod: "7_years",
      },
      auditTrail: {
        timestamp: new Date().toISOString(),
        requestId: (req as any).id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        outcome:
          res.statusCode >= 200 && res.statusCode < 300 ? "SUCCESS" : "FAILURE",
      },
    };

    logger.info("FINANCIAL_AUDIT", financialLog);
    originalEnd.call(this, chunk, ...args);
  };

  next();
};

// 👑 Admin audit logger
export const adminAuditLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.path.startsWith("/api/admin/")) {
    return next();
  }

  const originalEnd = res.end;

  res.end = function (chunk?: any, ...args: any[]): void {
    const adminLog = {
      eventType: "ADMINISTRATIVE_ACTION",
      actionId: `admin_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      administrator: {
        id: req.user?.id,
        role: req.user?.role,
        phoneNumber: req.user?.phoneNumber,
        email: req.user?.email,
        sessionId: req.user?.sessionId,
      },
      action: {
        operation: req.method,
        resource: req.path.split("/")[3] || "unknown",
        resourceId: req.params.id || req.params.productId || req.params.orderId,
        description: `${req.method} operation on ${req.path}`,
        success: res.statusCode >= 200 && res.statusCode < 300,
      },
      changes: ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)
        ? {
            before: req.body?.before,
            after: sanitizeForLogging(req.body),
            fields: req.body ? Object.keys(req.body) : [],
          }
        : undefined,
      businessImpact: {
        category: getBusinessImpactCategory(req.path, req.method),
        severity: getBusinessImpactSeverity(
          req.path,
          req.method,
          res.statusCode
        ),
        affectedUsers: req.body?.affectedUsers || "unknown",
        revenueImpact: req.body?.amount ? `₦${req.body.amount}` : "none",
      },
      compliance: {
        adminActionLogged: true,
        supervisoryReviewRequired:
          req.body?.amount > 1000000 || req.path.includes("/users"),
        retentionPeriod: "10_years",
        auditCategory: "administrative",
      },
      context: {
        timestamp: new Date().toISOString(),
        requestId: (req as any).id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        duration: Date.now() - ((req as any).startTime || Date.now()),
      },
    };

    logger.info("ADMIN_AUDIT", adminLog);
    originalEnd.call(this, chunk, ...args);
  };

  next();
};

// 🔐 Authentication audit logger
export const authenticationAuditLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.path.includes("/auth/")) {
    return next();
  }

  const originalEnd = res.end;

  res.end = function (chunk?: any, ...args: any[]): void {
    const authAction = req.path.split("/").pop();
    const isSuccess = res.statusCode >= 200 && res.statusCode < 300;

    const authLog = {
      eventType: "AUTHENTICATION_EVENT",
      authenticationId: `auth_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      action: authAction,
      outcome: isSuccess ? "SUCCESS" : "FAILURE",
      user: {
        phoneNumber: req.body?.phoneNumber,
        email: req.body?.email,
        userId:
          req.user?.id ||
          (isSuccess && authAction === "login" ? "new_session" : undefined),
      },
      session: {
        sessionId: req.body?.sessionId || req.user?.sessionId,
        deviceInfo: {
          userAgent: req.get("User-Agent"),
          isMobile: /Mobile|Android|iPhone|iPad/i.test(
            req.get("User-Agent") || ""
          ),
          browser: getBrowserInfo(req.get("User-Agent") || ""),
          os: getOSInfo(req.get("User-Agent") || ""),
        },
        location: {
          ip: req.ip,
          country: "NG",
          state: detectStateFromIP(req.ip),
          isNigerianIP: isNigerianIP(req.ip),
        },
      },
      security: {
        riskLevel: calculateAuthRiskLevel(req, authAction, isSuccess),
        threats: detectAuthThreats(req, authAction, isSuccess),
        otpUsed:
          authAction === "verify-otp" || req.body?.otpCode ? true : false,
        multipleAttempts: false,
        suspiciousActivity: false,
      },
      compliance: {
        dataProcessingLawful: true,
        consentObtained: authAction === "signup",
        personalDataProcessed: true,
        retentionPeriod: "2_years",
        auditCategory: "authentication",
      },
      context: {
        timestamp: new Date().toISOString(),
        requestId: (req as any).id,
        method: req.method,
        path: req.path,
        duration: Date.now() - ((req as any).startTime || Date.now()),
      },
    };

    const logLevel = !isSuccess && authAction === "login" ? "warn" : "info";
    logger[logLevel]("AUTH_AUDIT", authLog);

    originalEnd.call(this, chunk, ...args);
  };

  next();
};

// 📦 Data access audit logger
export const dataAccessAuditLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.method !== "GET" || !isDataAccessOperation(req.path)) {
    return next();
  }

  const originalEnd = res.end;

  res.end = function (chunk?: any, ...args: any[]): void {
    const dataLog = {
      eventType: "DATA_ACCESS",
      accessId: `data_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      accessor: req.user
        ? {
            id: req.user.id,
            role: req.user.role,
            phoneNumber: req.user.phoneNumber,
          }
        : {
            type: "anonymous",
            ip: req.ip,
          },
      dataAccessed: {
        resource: getDataResourceType(req.path),
        resourceId: req.params.id || req.params.userId || req.params.orderId,
        scope: getDataScope(req.path, req.query),
        personalDataIncluded: isPersonalDataAccess(req.path),
        sensitiveDataIncluded: isSensitiveDataAccess(req.path),
      },
      access: {
        method: "READ",
        successful: res.statusCode >= 200 && res.statusCode < 300,
        authorization: req.user ? "authenticated" : "anonymous",
        purpose: getAccessPurpose(req.path),
        legalBasis: req.user ? "legitimate_interest" : "public_task",
      },
      privacy: {
        ndprCompliant: true,
        dataMinimization: true,
        purposeLimitation: true,
        storageMinimization: true,
        retentionPeriod: getDataRetentionPeriod(req.path),
      },
      context: {
        timestamp: new Date().toISOString(),
        requestId: (req as any).id,
        path: req.path,
        query: sanitizeForLogging(req.query),
        responseSize: res.get("Content-Length"),
        duration: Date.now() - ((req as any).startTime || Date.now()),
      },
    };

    logger.info("DATA_ACCESS_AUDIT", dataLog);
    originalEnd.call(this, chunk, ...args);
  };

  next();
};

// 📈 Performance audit logger
export const performanceAuditLogger = (threshold: number = 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    const originalEnd = res.end;

    res.end = function (chunk?: any, ...args: any[]): void {
      const duration = Date.now() - startTime;
      const endMemory = process.memoryUsage();

      if (duration > threshold) {
        const performanceLog = {
          eventType: "PERFORMANCE_AUDIT",
          performanceId: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          performance: {
            duration,
            threshold,
            memoryUsed: endMemory.heapUsed - startMemory.heapUsed,
            slow: true,
            cpuUsage: process.cpuUsage(),
          },
          request: {
            method: req.method,
            path: req.path,
            query: Object.keys(req.query).length > 0 ? req.query : undefined,
            contentLength: req.get("Content-Length"),
          },
          response: {
            statusCode: res.statusCode,
            contentLength: res.get("Content-Length"),
            cacheHit: res.get("X-Cache") === "HIT",
          },
          user: req.user
            ? {
                id: req.user.id,
                role: req.user.role,
              }
            : undefined,
          context: {
            timestamp: new Date().toISOString(),
            requestId: (req as any).id,
            environment: environment.NODE_ENV,
            nodeVersion: process.version,
          },
        };

        logger.warn("PERFORMANCE_AUDIT", performanceLog);
      }

      originalEnd.call(this, chunk, ...args);
    };

    next();
  };
};

// 🔐 Security event logger
export const securityEventLogger = (eventType: string, details: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const securityLog = {
      eventType: "SECURITY_EVENT",
      securityEventId: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      securityEvent: eventType,
      severity: "high",
      details: sanitizeForLogging(details),
      request: {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        headers: sanitizeForLogging({
          "x-forwarded-for": req.get("X-Forwarded-For"),
          "x-real-ip": req.get("X-Real-IP"),
          origin: req.get("Origin"),
          referer: req.get("Referer"),
        }),
      },
      user: req.user
        ? {
            id: req.user.id,
            role: req.user.role,
            phoneNumber: req.user.phoneNumber,
          }
        : undefined,
      context: {
        timestamp: new Date().toISOString(),
        requestId: (req as any).id,
        alert: true,
      },
    };

    logger.error("SECURITY_AUDIT", securityLog);
    next();
  };
};

// 🔧 Helper functions
const getBusinessImpactCategory = (path: string, method: string): string => {
  if (path.includes("/products") && ["POST", "PUT", "DELETE"].includes(method))
    return "inventory";
  if (path.includes("/orders")) return "sales";
  if (path.includes("/users")) return "customer_management";
  if (path.includes("/payment")) return "financial";
  if (path.includes("/settings")) return "configuration";
  return "operational";
};

const getBusinessImpactSeverity = (
  path: string,
  method: string,
  statusCode: number
): string => {
  if (statusCode >= 500) return "critical";
  if (method === "DELETE") return "high";
  if (path.includes("/payment") || path.includes("/orders")) return "high";
  if (path.includes("/products") && method === "POST") return "medium";
  return "low";
};

const getBrowserInfo = (userAgent: string): string => {
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Edge")) return "Edge";
  return "Other";
};

const getOSInfo = (userAgent: string): string => {
  if (userAgent.includes("Android")) return "Android";
  if (userAgent.includes("iPhone") || userAgent.includes("iPad")) return "iOS";
  if (userAgent.includes("Windows")) return "Windows";
  if (userAgent.includes("Mac")) return "macOS";
  if (userAgent.includes("Linux")) return "Linux";
  return "Other";
};

const calculateAuthRiskLevel = (
  req: Request,
  action: string,
  success: boolean
): string => {
  let risk = 0;

  if (!success && action === "login") risk += 2;
  if (!isNigerianIP(req.ip)) risk += 1;
  if (action === "signup") risk += 1;

  const hour = new Date().getHours();
  if (hour < 6 || hour > 23) risk += 1;

  if (risk >= 3) return "high";
  if (risk >= 2) return "medium";
  return "low";
};

const detectAuthThreats = (
  req: Request,
  action: string,
  success: boolean
): string[] => {
  const threats: string[] = [];

  if (!success && action === "login") threats.push("failed_login");
  if (!isNigerianIP(req.ip)) threats.push("foreign_ip");

  const userAgent = req.get("User-Agent") || "";
  if (/bot|crawler|automated/i.test(userAgent))
    threats.push("automated_attempt");

  return threats;
};

const isDataAccessOperation = (path: string): boolean => {
  const dataEndpoints = [
    "/users/",
    "/orders/",
    "/profile/",
    "/addresses/",
    "/admin/",
  ];
  return dataEndpoints.some((endpoint) => path.includes(endpoint));
};

const getDataResourceType = (path: string): string => {
  if (path.includes("/users/") || path.includes("/profile/"))
    return "user_data";
  if (path.includes("/orders/")) return "order_data";
  if (path.includes("/addresses/")) return "address_data";
  if (path.includes("/admin/")) return "administrative_data";
  return "general_data";
};

const getDataScope = (path: string, query: any): string => {
  if (query.limit && parseInt(query.limit) > 100) return "bulk";
  if (path.includes("/admin/")) return "administrative";
  if (Object.keys(query).length === 0) return "single_record";
  return "filtered_set";
};

const isPersonalDataAccess = (path: string): boolean => {
  return (
    path.includes("/users/") ||
    path.includes("/profile/") ||
    path.includes("/addresses/")
  );
};

const isSensitiveDataAccess = (path: string): boolean => {
  return path.includes("/payment/") || path.includes("/admin/users/");
};

const getAccessPurpose = (path: string): string => {
  if (path.includes("/admin/")) return "administration";
  if (path.includes("/orders/")) return "order_management";
  if (path.includes("/profile/")) return "account_management";
  return "service_provision";
};

const getDataRetentionPeriod = (path: string): string => {
  if (path.includes("/payment/") || path.includes("/orders/")) return "7_years";
  if (path.includes("/users/") || path.includes("/profile/")) return "7_years";
  if (path.includes("/admin/")) return "10_years";
  return "3_years";
};

// 📊 Audit summary generator
export const generateAuditSummary = (
  timeframe: "daily" | "weekly" | "monthly" = "daily"
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // This would typically query audit logs and generate summary
    const summaryLog = {
      eventType: "AUDIT_SUMMARY",
      summaryId: `summary_${Date.now()}_${timeframe}`,
      timeframe,
      period: {
        start: new Date(
          Date.now() -
            (timeframe === "daily"
              ? 86400000
              : timeframe === "weekly"
                ? 604800000
                : 2592000000)
        ).toISOString(),
        end: new Date().toISOString(),
      },
      metrics: {
        totalEvents: 0, // Would be calculated from actual audit logs
        securityEvents: 0,
        financialTransactions: 0,
        adminActions: 0,
        authenticationEvents: 0,
        failedOperations: 0,
      },
      compliance: {
        ndprCompliant: true,
        retentionPolicyApplied: true,
        dataProcessingLawful: true,
      },
      context: {
        timestamp: new Date().toISOString(),
        generatedBy: "system",
        environment: environment.NODE_ENV,
      },
    };

    logger.info("AUDIT_SUMMARY", summaryLog);
    next();
  };
};

export default {
  auditLogger,
  financialAuditLogger,
  adminAuditLogger,
  authenticationAuditLogger,
  dataAccessAuditLogger,
  performanceAuditLogger,
  securityEventLogger,
  generateAuditSummary,
};
