import winston from "winston";
/**
 * Create the main logger instance
 */
export declare const logger: winston.Logger;
/**
 * Stream for Morgan HTTP logging
 */
export declare const httpLogStream: {
    write: (message: string) => void;
};
/**
 * Nigerian-specific logging utilities
 */
export declare class NigerianLogger {
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
    }): void;
    /**
     * Log SMS sending (for Nigerian numbers)
     */
    static logSMS(data: {
        to: string;
        message: string;
        provider: string;
        status: "sent" | "failed";
        cost?: number;
    }): void;
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
    }): void;
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
    }): void;
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
    }): void;
}
/**
 * Error logging with context
 */
export declare class ErrorLogger {
    /**
     * Log application errors with full context
     */
    static logError(error: Error, context?: {
        userId?: string;
        requestId?: string;
        endpoint?: string;
        method?: string;
        ip?: string;
        userAgent?: string;
        body?: any;
        params?: any;
        query?: any;
    }): void;
    /**
     * Log database errors
     */
    static logDatabaseError(error: Error, context?: {
        operation: string;
        model: string;
        data?: any;
        where?: any;
    }): void;
    /**
     * Log external API errors
     */
    static logExternalApiError(error: Error, context: {
        service: string;
        endpoint: string;
        method: string;
        statusCode?: number;
        responseBody?: any;
        requestBody?: any;
    }): void;
}
/**
 * Performance monitoring
 */
export declare class PerformanceLogger {
    /**
     * Log slow database queries
     */
    static logSlowQuery(data: {
        query: string;
        duration: number;
        model: string;
        params?: any;
    }): void;
    /**
     * Log slow API responses
     */
    static logSlowResponse(data: {
        endpoint: string;
        method: string;
        duration: number;
        statusCode: number;
        userId?: string;
    }): void;
}
/**
 * Security event logging
 */
export declare class SecurityLogger {
    /**
     * Log suspicious activities
     */
    static logSuspiciousActivity(data: {
        type: "multiple_failed_logins" | "suspicious_payment" | "rate_limit_exceeded" | "invalid_token";
        userId?: string;
        ip: string;
        userAgent?: string;
        details?: any;
    }): void;
    /**
     * Log security breaches
     */
    static logSecurityBreach(data: {
        type: "data_breach" | "unauthorized_access" | "sql_injection_attempt";
        severity: "low" | "medium" | "high" | "critical";
        details: any;
        ip?: string;
        userAgent?: string;
    }): void;
}
export default logger;
//# sourceMappingURL=winston.d.ts.map