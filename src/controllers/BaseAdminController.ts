import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import { NigerianUtils } from "../utils/helpers/nigerian";
import { DataFormatters } from "../utils/helpers/formatters";
import { logger } from "../utils/logger/winston";

/**
 * Nigerian Admin Activity Types for audit logging
 */
export type AdminActivityType = 
  | 'user_management'
  | 'order_management' 
  | 'inventory_management'
  | 'financial_operations'
  | 'system_configuration'
  | 'security_operations'
  | 'content_management'
  | 'analytics_access'
  | 'bulk_operations'
  | 'data_export'
  | 'compliance_check';

/**
 * Admin Activity Severity Levels
 */
export type AdminActivitySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Admin Activity Log Entry
 */
export interface AdminActivityLog {
  id: string;
  adminId: string;
  adminName: string;
  adminRole: string;
  activity: AdminActivityType;
  action: string;
  description: string;
  severity: AdminActivitySeverity;
  resourceType: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, any>;
  timestamp: Date;
  nigerianTime: string;
  sessionId: string;
}

/**
 * Nigerian Currency Export Options
 */
export interface CurrencyExportOptions {
  format: 'naira' | 'kobo';
  includeSymbol: boolean;
  decimalPlaces: number;
}

/**
 * Data Export Configuration for Nigerian compliance
 */
export interface DataExportConfig {
  format: 'csv' | 'excel' | 'pdf';
  includeVAT: boolean;
  currency: CurrencyExportOptions;
  timezone: 'Africa/Lagos' | 'UTC';
  includeNigerianFields: boolean;
  complianceLevel: 'basic' | 'full' | 'nafdac';
}

/**
 * Bulk Operation Result
 */
export interface BulkOperationResult<T = any> {
  totalItems: number;
  successful: number;
  failed: number;
  results: Array<{
    id: string;
    success: boolean;
    data?: T;
    error?: string;
  }>;
  summary: {
    successRate: number;
    executionTimeMs: number;
    nigerianTime: string;
  };
}

/**
 * Admin Performance Metrics
 */
export interface AdminPerformanceMetrics {
  requestStartTime: number;
  databaseQueryCount: number;
  cacheHits: number;
  cacheMisses: number;
  memoryUsage: number;
  nigerianBusinessHours: boolean;
}

/**
 * Base Admin Controller with Nigerian E-commerce Features
 * 
 * This controller provides:
 * - Admin activity logging and audit trails
 * - Nigerian currency formatting and timezone handling
 * - Bulk operations support for admin tasks
 * - Data export capabilities with Nigerian compliance
 * - Performance monitoring for admin operations
 * - Nigerian business context (hours, holidays, etc.)
 */
export abstract class BaseAdminController extends BaseController {
  protected readonly nigerianTimezone = 'Africa/Lagos';
  protected performanceMetrics: AdminPerformanceMetrics;

  constructor() {
    super();
    this.initializePerformanceMetrics();
  }

  /**
   * Initialize performance metrics tracking
   */
  private initializePerformanceMetrics(): void {
    this.performanceMetrics = {
      requestStartTime: Date.now(),
      databaseQueryCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      memoryUsage: process.memoryUsage().heapUsed,
      nigerianBusinessHours: NigerianUtils.Business.isBusinessHours()
    };
  }

  /**
   * Log admin activity with comprehensive Nigerian context
   */
  protected logAdminActivity(
    req: Request,
    activity: AdminActivityType,
    action: string,
    options: {
      description?: string;
      severity?: AdminActivitySeverity;
      resourceType?: string;
      resourceId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): void {
    const admin = (req as any).user;
    const {
      description = action,
      severity = 'medium',
      resourceType = 'unknown',
      resourceId,
      metadata = {}
    } = options;

    const adminLog: AdminActivityLog = {
      id: `admin_log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      adminId: admin?.id || 'unknown',
      adminName: `${admin?.firstName || 'Unknown'} ${admin?.lastName || 'Admin'}`,
      adminRole: admin?.role || 'UNKNOWN',
      activity,
      action,
      description,
      severity,
      resourceType,
      resourceId,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      metadata: {
        ...metadata,
        nigerianBusinessHours: NigerianUtils.Business.isBusinessHours(),
        performanceMetrics: this.performanceMetrics,
        requestUrl: req.originalUrl,
        requestMethod: req.method
      },
      timestamp: new Date(),
      nigerianTime: NigerianUtils.Business.formatNigerianDate(new Date(), 'long'),
      sessionId: admin?.sessionId || 'unknown'
    };

    // Log with structured format for audit purposes
    logger.warn('Admin Activity', {
      ...adminLog,
      level: 'ADMIN_AUDIT',
      compliance: 'NIGERIAN_ECOMMERCE'
    });

    // Additional logging for critical activities
    if (severity === 'critical') {
      logger.error('Critical Admin Activity', {
        ...adminLog,
        alert: true,
        requiresReview: true
      });
    }
  }

  /**
   * Enhanced admin authorization check with Nigerian business context
   */
  protected requireAdminAuth(
    req: Request,
    res: Response,
    minimumRole: 'admin' | 'super_admin' = 'admin'
  ): boolean {
    const user = (req as any).user;

    if (!user) {
      this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
      return false;
    }

    if (!this.hasRole(req, minimumRole)) {
      this.logAdminActivity(req, 'security_operations', 'unauthorized_access', {
        severity: 'high',
        description: `Attempted access with insufficient role: ${user.role}`,
        resourceType: 'admin_endpoint',
        metadata: { requiredRole: minimumRole, userRole: user.role }
      });

      this.sendError(res, "Insufficient admin privileges", 403, "FORBIDDEN");
      return false;
    }

    // Check if admin is active during Nigerian business hours for sensitive operations
    const isBusinessHours = NigerianUtils.Business.isBusinessHours();
    if (!isBusinessHours && minimumRole === 'super_admin') {
      this.logAdminActivity(req, 'security_operations', 'off_hours_super_admin_access', {
        severity: 'medium',
        description: 'Super admin access during non-business hours',
        resourceType: 'admin_endpoint'
      });
    }

    return true;
  }

  /**
   * Format Nigerian currency for admin displays
   */
  protected formatAdminCurrency(
    amount: number,
    options: {
      format?: 'display' | 'export' | 'sms';
      showKobo?: boolean;
      precision?: number;
    } = {}
  ): string {
    const { format = 'display', showKobo = false, precision = 2 } = options;

    if (showKobo) {
      const koboAmount = NigerianUtils.Currency.toKobo(amount);
      return format === 'sms' 
        ? NigerianUtils.Currency.formatForSMS(amount)
        : `${NigerianUtils.Currency.format(amount)} (₦${koboAmount.toLocaleString()} kobo)`;
    }

    return format === 'sms' 
      ? NigerianUtils.Currency.formatForSMS(amount)
      : NigerianUtils.Currency.format(amount, { decimalPlaces: precision });
  }

  /**
   * Format admin response with Nigerian context
   */
  protected sendAdminSuccess<T>(
    res: Response,
    data: T,
    message: string = "Admin operation successful",
    statusCode: number = 200,
    adminContext: {
      activity?: AdminActivityType;
      includeMetrics?: boolean;
      includeCurrencyInfo?: boolean;
    } = {}
  ): void {
    const { activity, includeMetrics = false, includeCurrencyInfo = false } = adminContext;

    const response: any = {
      success: true,
      message,
      data,
      admin: {
        timestamp: new Date().toISOString(),
        nigerianTime: NigerianUtils.Business.formatNigerianDate(new Date(), 'long'),
        businessHours: NigerianUtils.Business.isBusinessHours(),
        timezone: this.nigerianTimezone
      }
    };

    if (includeMetrics) {
      response.admin.performance = {
        executionTime: Date.now() - this.performanceMetrics.requestStartTime,
        memoryUsage: process.memoryUsage().heapUsed,
        databaseQueries: this.performanceMetrics.databaseQueryCount
      };
    }

    if (includeCurrencyInfo && typeof data === 'object' && data !== null) {
      response.admin.currency = {
        primary: 'NGN',
        symbol: '₦',
        koboConversion: 'amount * 100',
        vatRate: '7.5%'
      };
    }

    if (activity) {
      response.admin.activity = activity;
    }

    res.status(statusCode).json(response);
  }

  /**
   * Handle bulk operations with Nigerian compliance
   */
  protected async processBulkOperation<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    options: {
      batchSize?: number;
      validateNigerianCompliance?: boolean;
      logActivity?: boolean;
      activityType?: AdminActivityType;
    } = {}
  ): Promise<BulkOperationResult<R>> {
    const startTime = Date.now();
    const {
      batchSize = 50,
      validateNigerianCompliance = true,
      logActivity = true,
      activityType = 'bulk_operations'
    } = options;

    const results: BulkOperationResult<R>['results'] = [];
    let successful = 0;
    let failed = 0;

    // Process in batches for better performance
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      for (let j = 0; j < batch.length; j++) {
        const item = batch[j];
        const globalIndex = i + j;
        
        try {
          // Nigerian compliance check if enabled
          if (validateNigerianCompliance && this.isComplianceRequired(item)) {
            const complianceCheck = this.validateNigerianCompliance(item);
            if (!complianceCheck.isValid) {
              throw new Error(`Compliance failure: ${complianceCheck.errors.join(', ')}`);
            }
          }

          const result = await processor(item, globalIndex);
          results.push({
            id: this.getItemId(item, globalIndex),
            success: true,
            data: result
          });
          successful++;
        } catch (error) {
          results.push({
            id: this.getItemId(item, globalIndex),
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          failed++;
        }
      }

      // Small delay between batches to prevent overwhelming the system
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    const executionTime = Date.now() - startTime;
    const successRate = (successful / items.length) * 100;

    const bulkResult: BulkOperationResult<R> = {
      totalItems: items.length,
      successful,
      failed,
      results,
      summary: {
        successRate: Math.round(successRate * 100) / 100,
        executionTimeMs: executionTime,
        nigerianTime: NigerianUtils.Business.formatNigerianDate(new Date(), 'long')
      }
    };

    // Log bulk operation
    if (logActivity) {
      logger.info('Bulk Operation Completed', {
        type: activityType,
        ...bulkResult.summary,
        totalItems: items.length,
        nigerianBusinessHours: NigerianUtils.Business.isBusinessHours()
      });
    }

    return bulkResult;
  }

  /**
   * Export data with Nigerian compliance
   */
  protected async exportData<T>(
    data: T[],
    config: DataExportConfig,
    filename: string
  ): Promise<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
    metadata: {
      recordCount: number;
      exportTime: string;
      nigerianTime: string;
      compliance: string[];
    };
  }> {
    const exportTime = new Date();
    const nigerianTime = NigerianUtils.Business.formatNigerianDate(exportTime, 'long');
    
    // Apply Nigerian formatting to monetary values
    const formattedData = data.map(item => {
      const formatted = { ...item };
      
      // Format currency fields
      Object.keys(formatted).forEach(key => {
        if (this.isCurrencyField(key, formatted[key])) {
          const amount = formatted[key] as number;
          if (config.currency.format === 'kobo') {
            formatted[key] = NigerianUtils.Currency.toKobo(amount);
          } else {
            formatted[key] = config.currency.includeSymbol 
              ? NigerianUtils.Currency.format(amount, { decimalPlaces: config.currency.decimalPlaces })
              : amount.toFixed(config.currency.decimalPlaces);
          }
        }
      });

      // Add Nigerian specific fields if required
      if (config.includeNigerianFields) {
        (formatted as any).exportedAt = nigerianTime;
        (formatted as any).timezone = config.timezone;
        if (config.includeVAT && this.isCurrencyField('amount', formatted)) {
          const formattedWithAmount = formatted as any;
          if (formattedWithAmount.amount && typeof formattedWithAmount.amount === 'number') {
            formattedWithAmount.vatAmount = NigerianUtils.Ecommerce.calculateVAT(formattedWithAmount.amount);
          }
        }
      }

      return formatted;
    });

    const compliance: string[] = ['NIGERIAN_ECOMMERCE'];
    if (config.includeVAT) compliance.push('VAT_COMPLIANT');
    if (config.complianceLevel === 'nafdac') compliance.push('NAFDAC_READY');
    if (config.timezone === 'Africa/Lagos') compliance.push('NIGERIAN_TIMEZONE');

    // For now, return a simple CSV format (actual implementation would generate proper Excel/PDF)
    let csvContent = '';
    
    if (formattedData.length > 0) {
      // Headers
      const headers = Object.keys(formattedData[0]);
      csvContent = headers.join(',') + '\n';
      
      // Data rows
      formattedData.forEach(item => {
        const values = headers.map(header => {
          const value = (item as any)[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : String(value || '');
        });
        csvContent += values.join(',') + '\n';
      });
    }

    return {
      buffer: Buffer.from(csvContent, 'utf8'),
      filename: `${filename}_${exportTime.toISOString().split('T')[0]}.csv`,
      mimeType: 'text/csv',
      metadata: {
        recordCount: data.length,
        exportTime: exportTime.toISOString(),
        nigerianTime,
        compliance
      }
    };
  }

  /**
   * Calculate Nigerian business metrics for admin dashboards
   */
  protected calculateNigerianBusinessMetrics(data: {
    revenue: number[];
    orders: number[];
    customers: number[];
    period: 'daily' | 'weekly' | 'monthly';
  }): {
    totals: {
      revenue: string;
      orders: number;
      customers: number;
    };
    growth: {
      revenue: number;
      orders: number;
      customers: number;
    };
    nigerianContext: {
      vatTotal: string;
      averageOrderValue: string;
      businessDaysActive: number;
      peakShoppingHours: boolean;
    };
  } {
    const totalRevenue = data.revenue.reduce((sum, val) => sum + val, 0);
    const totalOrders = data.orders.reduce((sum, val) => sum + val, 0);
    const totalCustomers = data.customers.reduce((sum, val) => sum + val, 0);

    // Calculate growth rates
    const midPoint = Math.floor(data.revenue.length / 2);
    const firstHalf = data.revenue.slice(0, midPoint).reduce((sum, val) => sum + val, 0);
    const secondHalf = data.revenue.slice(midPoint).reduce((sum, val) => sum + val, 0);
    const revenueGrowth = firstHalf === 0 ? 0 : ((secondHalf - firstHalf) / firstHalf) * 100;

    // Nigerian specific calculations
    const vatTotal = NigerianUtils.Ecommerce.calculateVAT(totalRevenue);
    const averageOrderValue = totalOrders === 0 ? 0 : totalRevenue / totalOrders;
    
    // Business days calculation based on period
    const now = new Date();
    const startDate = new Date();
    if (data.period === 'daily') {
      startDate.setDate(now.getDate() - data.revenue.length);
    } else if (data.period === 'weekly') {
      startDate.setDate(now.getDate() - (data.revenue.length * 7));
    } else {
      startDate.setMonth(now.getMonth() - data.revenue.length);
    }
    
    const businessDaysActive = NigerianUtils.Business.calculateBusinessDays(startDate, now);

    return {
      totals: {
        revenue: this.formatAdminCurrency(totalRevenue),
        orders: totalOrders,
        customers: totalCustomers
      },
      growth: {
        revenue: Math.round(revenueGrowth * 100) / 100,
        orders: 0, // Simplified - would calculate similar to revenue
        customers: 0 // Simplified - would calculate similar to revenue
      },
      nigerianContext: {
        vatTotal: this.formatAdminCurrency(vatTotal),
        averageOrderValue: this.formatAdminCurrency(averageOrderValue),
        businessDaysActive,
        peakShoppingHours: this.isPeakShoppingTime()
      }
    };
  }

  /**
   * Validate phone numbers in bulk operations
   */
  protected validateNigerianPhoneNumbers(phoneNumbers: string[]): {
    valid: string[];
    invalid: string[];
    formatted: string[];
  } {
    const valid: string[] = [];
    const invalid: string[] = [];
    const formatted: string[] = [];

    phoneNumbers.forEach(phone => {
      const isValid = NigerianUtils.Phone.validate(phone);
      if (isValid) {
        const formattedPhone = NigerianUtils.Phone.format(phone);
        valid.push(phone);
        formatted.push(formattedPhone);
      } else {
        invalid.push(phone);
      }
    });

    return { valid, invalid, formatted };
  }

  /**
   * Generate admin activity summary
   */
  protected generateAdminActivitySummary(
    activities: AdminActivityLog[],
    period: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): {
    totalActivities: number;
    byType: Record<AdminActivityType, number>;
    bySeverity: Record<AdminActivitySeverity, number>;
    topAdmins: Array<{ adminName: string; count: number }>;
    nigerianTimeDistribution: {
      businessHours: number;
      afterHours: number;
    };
  } {
    const byType = activities.reduce((acc, activity) => {
      acc[activity.activity] = (acc[activity.activity] || 0) + 1;
      return acc;
    }, {} as Record<AdminActivityType, number>);

    const bySeverity = activities.reduce((acc, activity) => {
      acc[activity.severity] = (acc[activity.severity] || 0) + 1;
      return acc;
    }, {} as Record<AdminActivitySeverity, number>);

    const adminCounts = activities.reduce((acc, activity) => {
      acc[activity.adminName] = (acc[activity.adminName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topAdmins = Object.entries(adminCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([adminName, count]) => ({ adminName, count }));

    const timeDistribution = activities.reduce((acc, activity) => {
      const isBusinessHours = activity.metadata.nigerianBusinessHours;
      if (isBusinessHours) {
        acc.businessHours++;
      } else {
        acc.afterHours++;
      }
      return acc;
    }, { businessHours: 0, afterHours: 0 });

    return {
      totalActivities: activities.length,
      byType,
      bySeverity,
      topAdmins,
      nigerianTimeDistribution: timeDistribution
    };
  }

  // Helper methods

  private getItemId(item: any, index: number): string {
    return item?.id || item?.uuid || `item_${index}`;
  }

  private isComplianceRequired(item: any): boolean {
    // Check if item requires Nigerian compliance validation
    return item && (
      item.category === 'food' ||
      item.category === 'pharmaceuticals' ||
      item.category === 'cosmetics' ||
      (item.amount && typeof item.amount === 'number' && item.amount > 1000000) // Large transactions
    );
  }

  private validateNigerianCompliance(item: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic compliance checks
    if (item.category === 'food' || item.category === 'pharmaceuticals') {
      if (!item.nafdacNumber) {
        errors.push('NAFDAC registration number required');
      }
    }

    if (item.amount && typeof item.amount === 'number' && item.amount > 10000000) { // 10M Naira
      errors.push('Amount exceeds maximum transaction limit');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isCurrencyField(key: string, value: any): boolean {
    const currencyFields = ['amount', 'price', 'cost', 'total', 'revenue', 'value', 'fee'];
    return currencyFields.some(field => key.toLowerCase().includes(field)) && 
           typeof value === 'number';
  }

  protected isPeakShoppingTime(): boolean {
    const now = new Date();
    const lagosTime = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Lagos" }));
    const hour = lagosTime.getHours();

    // Peak shopping hours: 12-14 (lunch), 18-21 (evening)
    return (hour >= 12 && hour <= 14) || (hour >= 18 && hour <= 21);
  }
}