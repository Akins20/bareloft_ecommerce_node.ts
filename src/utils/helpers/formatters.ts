import { PaginationMeta } from "../../types/common.types";

/**
 * Data formatting utilities for consistent API responses
 */
export class DataFormatters {
  /**
   * Format currency amounts to Naira
   */
  static formatCurrency(
    amount: number,
    options: {
      showSymbol?: boolean;
      precision?: number;
      locale?: string;
    } = {}
  ): string {
    const { showSymbol = true, precision = 2, locale = "en-NG" } = options;

    if (isNaN(amount) || amount < 0) {
      return showSymbol ? "₦0.00" : "0.00";
    }

    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(amount);

    return showSymbol ? `₦${formatted}` : formatted;
  }

  /**
   * Format price for Paystack (convert to kobo)
   */
  static formatPriceForPaystack(nairaAmount: number): number {
    if (isNaN(nairaAmount) || nairaAmount < 0) {
      return 0;
    }
    // Convert Naira to kobo (multiply by 100)
    return Math.round(nairaAmount * 100);
  }

  /**
   * Format price from Paystack (convert from kobo)
   */
  static formatPriceFromPaystack(koboAmount: number): number {
    if (isNaN(koboAmount) || koboAmount < 0) {
      return 0;
    }
    // Convert kobo to Naira (divide by 100)
    return Math.round((koboAmount / 100) * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Format phone number for display
   */
  static formatPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) return "";

    // Remove all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, "");

    // Format based on length
    if (cleaned.startsWith("234") && cleaned.length === 13) {
      // +234 XXX XXX XXXX
      return `+234 ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)} ${cleaned.substring(9)}`;
    } else if (cleaned.startsWith("0") && cleaned.length === 11) {
      // 0XXX XXX XXXX
      return `${cleaned.substring(0, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7)}`;
    }

    return phoneNumber; // Return original if format not recognized
  }

  /**
   * Format date for Nigerian timezone
   */
  static formatDate(
    date: Date | string,
    options: {
      includeTime?: boolean;
      format?: "short" | "medium" | "long" | "full";
      timezone?: string;
    } = {}
  ): string {
    const {
      includeTime = false,
      format = "medium",
      timezone = "Africa/Lagos",
    } = options;

    if (!date) return "";

    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return "";
    }

    const formatOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      dateStyle: format,
    };

    if (includeTime) {
      formatOptions.timeStyle = "short";
    }

    return new Intl.DateTimeFormat("en-NG", formatOptions).format(dateObj);
  }

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  static formatRelativeTime(date: Date | string): string {
    if (!date) return "";

    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return "";
    }

    const now = new Date();
    const diffInSeconds = Math.floor(
      (now.getTime() - dateObj.getTime()) / 1000
    );

    // Define time intervals in seconds
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
    };

    // If less than a minute
    if (diffInSeconds < 60) {
      return "Just now";
    }

    // Find the appropriate interval
    for (const [unit, seconds] of Object.entries(intervals)) {
      const interval = Math.floor(diffInSeconds / seconds);

      if (interval >= 1) {
        return `${interval} ${unit}${interval !== 1 ? "s" : ""} ago`;
      }
    }

    return "Just now";
  }

  /**
   * Format file size
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Format pagination metadata
   */
  static formatPaginationMeta(
    totalItems: number,
    currentPage: number,
    itemsPerPage: number
  ): PaginationMeta {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };
  }

  /**
   * Format Nigerian address
   */
  static formatAddress(address: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode?: string;
    country?: string;
  }): string {
    const parts = [
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.state,
      address.postalCode,
      address.country || "Nigeria",
    ].filter(Boolean);

    return parts.join(", ");
  }

  /**
   * Format order number
   */
  static formatOrderNumber(orderNumber: string): string {
    if (!orderNumber) return "";

    // Ensure it starts with prefix
    if (!orderNumber.startsWith("BL")) {
      return `BL${orderNumber}`;
    }

    return orderNumber.toUpperCase();
  }

  /**
   * Format product SKU
   */
  static formatSKU(sku: string): string {
    if (!sku) return "";

    return sku.toUpperCase().replace(/[^A-Z0-9\-_]/g, "");
  }

  /**
   * Format percentage
   */
  static formatPercentage(
    value: number,
    options: {
      precision?: number;
      showSign?: boolean;
    } = {}
  ): string {
    const { precision = 1, showSign = false } = options;

    if (isNaN(value)) return "0%";

    const formatted = value.toFixed(precision);
    const sign = showSign && value > 0 ? "+" : "";

    return `${sign}${formatted}%`;
  }

  /**
   * Format inventory status
   */
  static formatInventoryStatus(
    quantity: number,
    lowStockThreshold: number = 10
  ): {
    status: "in_stock" | "low_stock" | "out_of_stock";
    label: string;
    color: "green" | "yellow" | "red";
  } {
    if (quantity <= 0) {
      return {
        status: "out_of_stock",
        label: "Out of Stock",
        color: "red",
      };
    } else if (quantity <= lowStockThreshold) {
      return {
        status: "low_stock",
        label: `Low Stock (${quantity} left)`,
        color: "yellow",
      };
    } else {
      return {
        status: "in_stock",
        label: `In Stock (${quantity})`,
        color: "green",
      };
    }
  }

  /**
   * Format weight
   */
  static formatWeight(weightInKg: number): string {
    if (isNaN(weightInKg) || weightInKg <= 0) {
      return "0 kg";
    }

    if (weightInKg < 1) {
      return `${Math.round(weightInKg * 1000)}g`;
    }

    return `${weightInKg.toFixed(1)}kg`;
  }

  /**
   * Format dimensions
   */
  static formatDimensions(dimensions: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  }): string {
    const { length, width, height, unit = "cm" } = dimensions;

    if (!length || !width || !height) {
      return "Not specified";
    }

    return `${length} × ${width} × ${height} ${unit}`;
  }

  /**
   * Format rating
   */
  static formatRating(rating: number, maxRating: number = 5): string {
    if (isNaN(rating) || rating < 0) {
      return "0.0";
    }

    const clampedRating = Math.min(rating, maxRating);
    return clampedRating.toFixed(1);
  }

  /**
   * Format discount percentage
   */
  static formatDiscountPercentage(
    originalPrice: number,
    salePrice: number
  ): string {
    if (originalPrice <= 0 || salePrice <= 0 || salePrice >= originalPrice) {
      return "";
    }

    const discount = ((originalPrice - salePrice) / originalPrice) * 100;
    return `${Math.round(discount)}% OFF`;
  }

  /**
   * Truncate text with ellipsis
   */
  static truncateText(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) {
      return text;
    }

    return text.substring(0, maxLength - 3) + "...";
  }

  /**
   * Format API response
   */
  static formatApiResponse<T>(
    data: T,
    message: string = "Success",
    meta?: any
  ): {
    success: boolean;
    message: string;
    data: T;
    meta: {
      timestamp: string;
      [key: string]: any;
    };
  } {
    return {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }

  /**
   * Format error response
   */
  static formatErrorResponse(
    message: string,
    code: string,
    details?: string | string[]
  ): {
    success: boolean;
    message: string;
    error: {
      code: string;
      details?: string | string[];
    };
    meta: {
      timestamp: string;
    };
  } {
    return {
      success: false,
      message,
      error: {
        code,
        ...(details && { details }),
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Report generation utilities
 */
export class ReportFormatters {
  /**
   * Generate CSV report from data array
   */
  static generateCSVReport(data: Record<string, any>[]): string {
    if (!data || data.length === 0) {
      return '';
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Create CSV header row
    const csvHeaders = headers.join(',');
    
    // Create CSV data rows
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        
        // Handle special cases
        if (value === null || value === undefined) {
          return '';
        }
        
        // Escape commas and quotes in values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        
        return String(value);
      }).join(',');
    });
    
    return [csvHeaders, ...csvRows].join('\n');
  }

  /**
   * Generate PDF report buffer (mock implementation)
   * In production, this would use a library like puppeteer or jsPDF
   */
  static async generatePDFReport(data: Record<string, any>[], title: string): Promise<Buffer> {
    // Mock PDF generation - in production, use a proper PDF library
    const csvContent = this.generateCSVReport(data);
    const pdfContent = `
PDF REPORT: ${title}
Generated: ${new Date().toLocaleDateString('en-NG')}
==========================================

${csvContent}

==========================================
Total Records: ${data.length}
Report generated by Bareloft E-commerce Admin System
    `.trim();
    
    return Buffer.from(pdfContent, 'utf-8');
  }

  /**
   * Generate Excel-compatible CSV with proper headers
   */
  static generateExcelCSV(data: Record<string, any>[], sheetName: string = 'Report'): string {
    if (!data || data.length === 0) {
      return '';
    }

    // Add BOM for proper UTF-8 encoding in Excel
    const BOM = '\uFEFF';
    const csvContent = this.generateCSVReport(data);
    
    return BOM + csvContent;
  }

  /**
   * Format data for export with Nigerian specific formatting
   */
  static formatForNigerianExport(data: Record<string, any>[]): Record<string, any>[] {
    return data.map(row => {
      const formattedRow: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(row)) {
        // Format currency values
        if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('price') || key.toLowerCase().includes('cost')) {
          if (typeof value === 'number') {
            formattedRow[key] = DataFormatters.formatCurrency(value);
          } else {
            formattedRow[key] = value;
          }
        }
        // Format phone numbers
        else if (key.toLowerCase().includes('phone')) {
          formattedRow[key] = typeof value === 'string' ? DataFormatters.formatPhoneNumber(value) : value;
        }
        // Format dates
        else if (value instanceof Date || (typeof value === 'string' && key.toLowerCase().includes('date'))) {
          formattedRow[key] = DataFormatters.formatDate(value, { includeTime: true });
        }
        else {
          formattedRow[key] = value;
        }
      }
      
      return formattedRow;
    });
  }
}

/**
 * Convenience functions for common formatting tasks
 */
export const formatNaira = (amount: number): string => DataFormatters.formatCurrency(amount);
export const formatNairaAmount = (amount: number): string => DataFormatters.formatCurrency(amount);
export const formatNigerianPhoneNumber = (phone: string): string => DataFormatters.formatPhoneNumber(phone);
export const calculateVAT = (amount: number): number => Math.round(amount * 0.075 * 100) / 100; // 7.5% VAT
export const generateCSVReport = ReportFormatters.generateCSVReport;
export const generatePDFReport = ReportFormatters.generatePDFReport;

// Default export for specific function imports
export default formatNairaAmount;
