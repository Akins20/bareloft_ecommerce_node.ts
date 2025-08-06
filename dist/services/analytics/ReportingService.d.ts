import { BaseService } from "../BaseService";
import { AnalyticsService } from "./AnalyticsService";
import { CacheService } from "../cache/CacheService";
export interface ReportRequest {
    type: ReportType;
    startDate: Date;
    endDate: Date;
    format: 'excel' | 'pdf' | 'csv' | 'json';
    filters?: Record<string, any>;
    options?: Record<string, any>;
}
export type ReportType = 'sales_summary' | 'sales_detailed' | 'customer_analysis' | 'product_performance' | 'inventory_report' | 'financial_summary' | 'order_report' | 'marketing_performance' | 'operational_metrics';
export interface GeneratedReport {
    id: string;
    type: ReportType;
    format: string;
    filename: string;
    size: number;
    downloadUrl: string;
    generatedAt: Date;
    expiresAt: Date;
    status: 'generating' | 'completed' | 'failed';
    metadata: Record<string, any>;
}
export interface SalesSummaryData {
    period: {
        start: Date;
        end: Date;
    };
    totals: {
        revenue: number;
        orders: number;
        customers: number;
        averageOrderValue: number;
        conversionRate: number;
    };
    trends: {
        revenueGrowth: number;
        orderGrowth: number;
        customerGrowth: number;
    };
    topProducts: Array<{
        id: string;
        name: string;
        revenue: number;
        quantity: number;
        margin: number;
    }>;
    topCategories: Array<{
        id: string;
        name: string;
        revenue: number;
        orders: number;
    }>;
    dailyBreakdown: Array<{
        date: string;
        revenue: number;
        orders: number;
        customers: number;
    }>;
}
export interface ProductPerformanceData {
    summary: {
        totalProducts: number;
        activeProducts: number;
        bestPerformers: number;
        underPerformers: number;
    };
    products: Array<{
        id: string;
        name: string;
        sku: string;
        category: string;
        revenue: number;
        quantitySold: number;
        averageRating: number;
        stockLevel: number;
        margin: number;
        performance: 'excellent' | 'good' | 'average' | 'poor';
    }>;
    categories: Array<{
        id: string;
        name: string;
        productCount: number;
        totalRevenue: number;
        averageMargin: number;
    }>;
}
export interface InventoryReportData {
    summary: {
        totalValue: number;
        totalProducts: number;
        lowStockItems: number;
        outOfStockItems: number;
        turnoverRate: number;
    };
    items: Array<{
        productId: string;
        productName: string;
        sku: string;
        currentStock: number;
        reservedStock: number;
        availableStock: number;
        reorderLevel: number;
        averageCost: number;
        totalValue: number;
        status: 'in_stock' | 'low_stock' | 'out_of_stock';
        lastMovement: Date;
    }>;
    movements: Array<{
        date: Date;
        productName: string;
        type: string;
        quantity: number;
        reason: string;
        cost: number;
    }>;
}
export declare class ReportingService extends BaseService {
    private analytics;
    private cache;
    constructor(analyticsService?: AnalyticsService, cacheService?: CacheService);
    /**
     * Generate report
     */
    generateReport(request: ReportRequest): Promise<GeneratedReport>;
    /**
     * Get report status
     */
    getReportStatus(reportId: string): Promise<GeneratedReport | null>;
    /**
     * Generate sales summary report
     */
    generateSalesSummaryReport(startDate: Date, endDate: Date, format?: 'excel' | 'pdf'): Promise<Buffer>;
    /**
     * Generate product performance report
     */
    generateProductPerformanceReport(startDate: Date, endDate: Date, format?: 'excel' | 'pdf'): Promise<Buffer>;
    /**
     * Generate inventory report
     */
    generateInventoryReport(format?: 'excel' | 'pdf'): Promise<Buffer>;
    /**
     * Generate custom report based on filters
     */
    generateCustomReport(type: ReportType, startDate: Date, endDate: Date, filters?: Record<string, any>, format?: 'excel' | 'pdf' | 'csv'): Promise<Buffer>;
    private getSalesSummaryData;
    private getProductPerformanceData;
    private getInventoryReportData;
    private generateSalesSummaryExcel;
    private generateSalesSummaryPDF;
    private generateProductPerformanceExcel;
    private generateProductPerformancePDF;
    private generateInventoryExcel;
    private generateInventoryPDF;
    private generateReportAsync;
    private generateFilename;
}
//# sourceMappingURL=ReportingService.d.ts.map