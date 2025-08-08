import { PaginationMeta } from "../../types/common.types";
/**
 * Data formatting utilities for consistent API responses
 */
export declare class DataFormatters {
    /**
     * Format currency amounts to Naira
     */
    static formatCurrency(amount: number, options?: {
        showSymbol?: boolean;
        precision?: number;
        locale?: string;
    }): string;
    /**
     * Format price for Paystack (convert to kobo)
     */
    static formatPriceForPaystack(nairaAmount: number): number;
    /**
     * Format price from Paystack (convert from kobo)
     */
    static formatPriceFromPaystack(koboAmount: number): number;
    /**
     * Format phone number for display
     */
    static formatPhoneNumber(phoneNumber: string): string;
    /**
     * Format date for Nigerian timezone
     */
    static formatDate(date: Date | string, options?: {
        includeTime?: boolean;
        format?: "short" | "medium" | "long" | "full";
        timezone?: string;
    }): string;
    /**
     * Format relative time (e.g., "2 hours ago")
     */
    static formatRelativeTime(date: Date | string): string;
    /**
     * Format file size
     */
    static formatFileSize(bytes: number): string;
    /**
     * Format pagination metadata
     */
    static formatPaginationMeta(totalItems: number, currentPage: number, itemsPerPage: number): PaginationMeta;
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
    }): string;
    /**
     * Format order number
     */
    static formatOrderNumber(orderNumber: string): string;
    /**
     * Format product SKU
     */
    static formatSKU(sku: string): string;
    /**
     * Format percentage
     */
    static formatPercentage(value: number, options?: {
        precision?: number;
        showSign?: boolean;
    }): string;
    /**
     * Format inventory status
     */
    static formatInventoryStatus(quantity: number, lowStockThreshold?: number): {
        status: "in_stock" | "low_stock" | "out_of_stock";
        label: string;
        color: "green" | "yellow" | "red";
    };
    /**
     * Format weight
     */
    static formatWeight(weightInKg: number): string;
    /**
     * Format dimensions
     */
    static formatDimensions(dimensions: {
        length?: number;
        width?: number;
        height?: number;
        unit?: string;
    }): string;
    /**
     * Format rating
     */
    static formatRating(rating: number, maxRating?: number): string;
    /**
     * Format discount percentage
     */
    static formatDiscountPercentage(originalPrice: number, salePrice: number): string;
    /**
     * Truncate text with ellipsis
     */
    static truncateText(text: string, maxLength: number): string;
    /**
     * Format API response
     */
    static formatApiResponse<T>(data: T, message?: string, meta?: any): {
        success: boolean;
        message: string;
        data: T;
        meta: {
            timestamp: string;
            [key: string]: any;
        };
    };
    /**
     * Format error response
     */
    static formatErrorResponse(message: string, code: string, details?: string | string[]): {
        success: boolean;
        message: string;
        error: {
            code: string;
            details?: string | string[];
        };
        meta: {
            timestamp: string;
        };
    };
}
/**
 * Report generation utilities
 */
export declare class ReportFormatters {
    /**
     * Generate CSV report from data array
     */
    static generateCSVReport(data: Record<string, any>[]): string;
    /**
     * Generate PDF report buffer (mock implementation)
     * In production, this would use a library like puppeteer or jsPDF
     */
    static generatePDFReport(data: Record<string, any>[], title: string): Promise<Buffer>;
    /**
     * Generate Excel-compatible CSV with proper headers
     */
    static generateExcelCSV(data: Record<string, any>[], sheetName?: string): string;
    /**
     * Format data for export with Nigerian specific formatting
     */
    static formatForNigerianExport(data: Record<string, any>[]): Record<string, any>[];
}
/**
 * Convenience functions for common formatting tasks
 */
export declare const formatNaira: (amount: number) => string;
export declare const formatNairaAmount: (amount: number) => string;
export declare const formatNigerianPhoneNumber: (phone: string) => string;
export declare const calculateVAT: (amount: number) => number;
export declare const generateCSVReport: typeof ReportFormatters.generateCSVReport;
export declare const generatePDFReport: typeof ReportFormatters.generatePDFReport;
export default formatNairaAmount;
//# sourceMappingURL=formatters.d.ts.map