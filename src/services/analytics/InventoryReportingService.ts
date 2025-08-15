import { BaseService } from "../BaseService";
import { InventoryAnalyticsService } from "./InventoryAnalyticsService";
import { ReportingService, ReportType, ReportRequest, GeneratedReport } from "./ReportingService";
import { CacheService } from "../cache/CacheService";
import { formatNairaAmount } from "../../utils/helpers/formatters";
import NIGERIAN_STATES from "../../utils/helpers/nigerian";

// Import types as any to avoid module not found errors
const ExcelJS = require('exceljs') as any;
const PDFDocument = require('pdfkit') as any;

export interface InventoryReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'overview' | 'turnover' | 'valuation' | 'performance' | 'seasonal' | 'compliance';
  nigerianCompliant: boolean;
  includesVAT: boolean; // Always false - VAT not applicable
  supportedFormats: ('excel' | 'pdf' | 'csv')[];
  estimatedGenerationTime: number; // in seconds
  requiredPermissions: string[];
}

export interface ScheduledReport {
  id: string;
  templateId: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  recipients: string[];
  parameters: Record<string, any>;
  isActive: boolean;
  nextRun: Date;
  lastRun?: Date;
  createdBy: string;
  createdAt: Date;
}

export interface ReportHistory {
  id: string;
  reportId: string;
  templateId: string;
  generatedAt: Date;
  generatedBy: string;
  fileSize: number;
  downloadCount: number;
  expiresAt: Date;
  status: 'completed' | 'failed' | 'expired';
}

export interface NigerianComplianceReport {
  reportId: string;
  complianceType: 'tax' | 'audit' | 'customs' | 'regulatory';
  period: { start: Date; end: Date };
  
  // VAT Compliance
  vatSummary: {
    totalVatableValue: number; // in kobo
    vatCollected: number; // in kobo (7.5%)
    vatRemittable: number; // in kobo
    exemptItems: number;
    zeroRatedItems: number;
  };

  // Import/Duty Compliance
  importSummary?: {
    totalImportValue: number; // in kobo
    customsDutyPaid: number; // in kobo
    importLicenses: string[];
    clearanceDocuments: string[];
  };

  // Inventory Valuation for Tax
  taxValuation: {
    openingStock: number; // in kobo
    purchases: number; // in kobo
    sales: number; // in kobo
    closingStock: number; // in kobo
    costOfGoodsSold: number; // in kobo
  };

  // Nigerian Accounting Standards
  accountingStandards: {
    inventoryMethod: 'FIFO' | 'LIFO' | 'Average Cost';
    depreciationMethod?: string;
    provisionsForObsolescence: number; // in kobo
  };
}

export interface ExportConfiguration {
  format: 'excel' | 'pdf' | 'csv';
  fileName: string;
  includeCharts: boolean;
  includeNigerianFormatting: boolean;
  includeVATDetails: boolean;
  includeComplianceNotes: boolean;
  watermark?: string;
  headerInfo: {
    companyName: string;
    address: string;
    taxId?: string;
    period: string;
  };
}

/**
 * Comprehensive Inventory Reporting Service
 * Handles report generation, scheduling, and Nigerian compliance
 */
export class InventoryReportingService extends BaseService {
  private inventoryAnalytics: InventoryAnalyticsService;
  private baseReportingService: ReportingService;
  private cache: CacheService;

  constructor(
    inventoryAnalyticsService: InventoryAnalyticsService,
    baseReportingService: ReportingService,
    cacheService: CacheService
  ) {
    super();
    this.inventoryAnalytics = inventoryAnalyticsService;
    this.baseReportingService = baseReportingService;
    this.cache = cacheService;
  }

  /**
   * Get available report templates
   */
  async getReportTemplates(): Promise<InventoryReportTemplate[]> {
    return [
      {
        id: 'inventory-overview',
        name: 'Inventory Overview Report',
        description: 'Comprehensive inventory overview with Nigerian business context',
        type: 'overview',
        nigerianCompliant: true,
        includesVAT: true,
        supportedFormats: ['excel', 'pdf', 'csv'],
        estimatedGenerationTime: 30,
        requiredPermissions: ['inventory:read', 'reports:generate']
      },
      {
        id: 'inventory-turnover',
        name: 'Inventory Turnover Analysis',
        description: 'Detailed turnover analysis with seasonal patterns',
        type: 'turnover',
        nigerianCompliant: true,
        includesVAT: false,
        supportedFormats: ['excel', 'pdf'],
        estimatedGenerationTime: 45,
        requiredPermissions: ['inventory:read', 'analytics:read', 'reports:generate']
      },
      {
        id: 'inventory-valuation',
        name: 'Inventory Valuation Report',
        description: 'Complete inventory valuation with Nigerian tax compliance',
        type: 'valuation',
        nigerianCompliant: true,
        includesVAT: true,
        supportedFormats: ['excel', 'pdf'],
        estimatedGenerationTime: 60,
        requiredPermissions: ['inventory:read', 'financials:read', 'reports:generate']
      },
      {
        id: 'product-performance',
        name: 'Product Performance Report',
        description: 'Individual product performance metrics and recommendations',
        type: 'performance',
        nigerianCompliant: false,
        includesVAT: false,
        supportedFormats: ['excel', 'pdf', 'csv'],
        estimatedGenerationTime: 40,
        requiredPermissions: ['inventory:read', 'analytics:read', 'reports:generate']
      },
      {
        id: 'seasonal-demand',
        name: 'Seasonal Demand Analysis',
        description: 'Nigerian seasonal patterns and demand forecasting',
        type: 'seasonal',
        nigerianCompliant: true,
        includesVAT: false,
        supportedFormats: ['excel', 'pdf'],
        estimatedGenerationTime: 35,
        requiredPermissions: ['inventory:read', 'analytics:read', 'forecasting:read', 'reports:generate']
      },
      {
        id: 'tax-compliance',
        name: 'Nigerian Tax Compliance Report',
        description: 'Complete tax and regulatory compliance report',
        type: 'compliance',
        nigerianCompliant: true,
        includesVAT: true,
        supportedFormats: ['excel', 'pdf'],
        estimatedGenerationTime: 90,
        requiredPermissions: ['inventory:read', 'financials:read', 'compliance:read', 'reports:generate']
      }
    ];
  }

  /**
   * Generate inventory report
   */
  async generateInventoryReport(
    templateId: string,
    parameters: Record<string, any> = {},
    exportConfig: ExportConfiguration
  ): Promise<GeneratedReport> {
    try {
      const template = await this.getReportTemplate(templateId);
      if (!template) {
        throw new Error(`Report template ${templateId} not found`);
      }

      const reportId = crypto.randomUUID();
      const startTime = new Date();

      // Generate report data based on template type
      const reportData = await this.generateReportData(template, parameters);
      
      // Generate file buffer based on format
      const fileBuffer = await this.generateReportFile(reportData, template, exportConfig);
      
      // Create report record
      const report: GeneratedReport = {
        id: reportId,
        type: this.mapTemplateToReportType(template.type),
        format: exportConfig.format,
        filename: exportConfig.fileName || this.generateFileName(template, exportConfig.format),
        size: fileBuffer.length,
        downloadUrl: `/api/admin/inventory/reports/${reportId}/download`,
        generatedAt: startTime,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
        status: 'completed',
        metadata: {
          templateId,
          parameters,
          exportConfig,
          generationTime: Date.now() - startTime.getTime()
        }
      };

      // Store report in cache
      await this.cache.set(`inventory:report:${reportId}`, {
        ...report,
        buffer: fileBuffer
      }, { ttl: 48 * 60 * 60 }); // 48 hours

      return report;
    } catch (error) {
      this.handleError("Error generating inventory report", error);
      throw error;
    }
  }

  /**
   * Schedule recurring report
   */
  async scheduleReport(
    templateId: string,
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    recipients: string[],
    parameters: Record<string, any> = {},
    createdBy: string
  ): Promise<ScheduledReport> {
    try {
      const template = await this.getReportTemplate(templateId);
      if (!template) {
        throw new Error(`Report template ${templateId} not found`);
      }

      const scheduledReport: ScheduledReport = {
        id: crypto.randomUUID(),
        templateId,
        name: `Scheduled ${template.name}`,
        frequency,
        recipients,
        parameters,
        isActive: true,
        nextRun: this.calculateNextRun(frequency),
        createdBy,
        createdAt: new Date()
      };

      // Store scheduled report
      await this.cache.set(
        `inventory:scheduled:report:${scheduledReport.id}`,
        scheduledReport,
        { ttl: 365 * 24 * 60 * 60 } // 1 year
      );

      return scheduledReport;
    } catch (error) {
      this.handleError("Error scheduling inventory report", error);
      throw error;
    }
  }

  /**
   * Generate Nigerian compliance report
   */
  async generateComplianceReport(
    complianceType: 'tax' | 'audit' | 'customs' | 'regulatory',
    period: { start: Date; end: Date }
  ): Promise<NigerianComplianceReport> {
    try {
      const reportId = crypto.randomUUID();
      
      // Get inventory data for the period
      const [overview, valuation] = await Promise.all([
        this.inventoryAnalytics.getInventoryOverview(period.start, period.end),
        this.inventoryAnalytics.getInventoryValuation()
      ]);

      // Calculate VAT compliance
      const vatSummary = this.calculateVATSummary(overview, valuation);
      
      // Calculate import summary if applicable
      const importSummary = complianceType === 'customs' ? 
        this.calculateImportSummary(overview) : undefined;

      // Calculate tax valuation
      const taxValuation = this.calculateTaxValuation(valuation);

      const complianceReport: NigerianComplianceReport = {
        reportId,
        complianceType,
        period,
        vatSummary,
        importSummary,
        taxValuation,
        accountingStandards: {
          inventoryMethod: 'FIFO', // Default method
          provisionsForObsolescence: valuation.totalValuation.totalValue * 0.05 // 5% provision
        }
      };

      return complianceReport;
    } catch (error) {
      this.handleError("Error generating compliance report", error);
      throw error;
    }
  }

  /**
   * Get report generation history
   */
  async getReportHistory(
    limit: number = 50,
    userId?: string
  ): Promise<ReportHistory[]> {
    try {
      // In a real implementation, this would query from a database
      // For now, return mock history data
      const history: ReportHistory[] = [];
      
      for (let i = 0; i < Math.min(limit, 20); i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        history.push({
          id: crypto.randomUUID(),
          reportId: crypto.randomUUID(),
          templateId: 'inventory-overview',
          generatedAt: date,
          generatedBy: userId || 'system',
          fileSize: Math.floor(Math.random() * 5000000) + 1000000, // 1-6MB
          downloadCount: Math.floor(Math.random() * 10),
          expiresAt: new Date(date.getTime() + 48 * 60 * 60 * 1000),
          status: Math.random() > 0.1 ? 'completed' : 'failed'
        });
      }

      return history;
    } catch (error) {
      this.handleError("Error retrieving report history", error);
      throw error;
    }
  }

  /**
   * Download report file
   */
  async downloadReport(reportId: string): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    try {
      const cachedReport = await this.cache.get(`inventory:report:${reportId}`);
      if (!cachedReport) {
        throw new Error('Report not found or expired');
      }

      const report = cachedReport as any;
      const contentTypes = {
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pdf: 'application/pdf',
        csv: 'text/csv'
      };

      return {
        buffer: report.buffer,
        filename: report.filename,
        contentType: contentTypes[report.format as keyof typeof contentTypes] || 'application/octet-stream'
      };
    } catch (error) {
      this.handleError("Error downloading report", error);
      throw error;
    }
  }

  // Private helper methods

  private async getReportTemplate(templateId: string): Promise<InventoryReportTemplate | undefined> {
    const templates = await this.getReportTemplates();
    return templates.find(t => t.id === templateId);
  }

  private async generateReportData(template: InventoryReportTemplate, parameters: Record<string, any>): Promise<any> {
    const { startDate, endDate, categoryId } = parameters;

    switch (template.type) {
      case 'overview':
        return await this.inventoryAnalytics.getInventoryOverview(
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined
        );
      
      case 'turnover':
        return await this.inventoryAnalytics.getInventoryTurnover(
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined
        );
      
      case 'valuation':
        return await this.inventoryAnalytics.getInventoryValuation();
      
      case 'performance':
        return await this.inventoryAnalytics.getProductPerformanceMetrics(
          parameters.productId,
          parameters.limit || 100
        );
      
      case 'seasonal':
        return await this.inventoryAnalytics.getSeasonalDemandAnalysis();
      
      case 'compliance':
        return await this.generateComplianceReport(
          parameters.complianceType || 'tax',
          {
            start: startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            end: endDate ? new Date(endDate) : new Date()
          }
        );
      
      default:
        throw new Error(`Unsupported template type: ${template.type}`);
    }
  }

  private async generateReportFile(
    data: any,
    template: InventoryReportTemplate,
    config: ExportConfiguration
  ): Promise<Buffer> {
    switch (config.format) {
      case 'excel':
        return await this.generateExcelReport(data, template, config);
      case 'pdf':
        return await this.generatePDFReport(data, template, config);
      case 'csv':
        return await this.generateCSVReport(data, template, config);
      default:
        throw new Error(`Unsupported export format: ${config.format}`);
    }
  }

  private async generateExcelReport(data: any, template: InventoryReportTemplate, config: ExportConfiguration): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    workbook.creator = 'Bareloft E-commerce';
    workbook.created = new Date();
    workbook.company = config.headerInfo.companyName;

    switch (template.type) {
      case 'overview':
        await this.generateOverviewExcel(workbook, data, config);
        break;
      case 'turnover':
        await this.generateOverviewExcel(workbook, data, config);
        break;
      case 'valuation':
        await this.generateValuationExcel(workbook, data, config);
        break;
      case 'performance':
        await this.generatePerformanceExcel(workbook, data, config);
        break;
      case 'seasonal':
        await this.generateSeasonalExcel(workbook, data, config);
        break;
    }

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  private async generatePDFReport(data: any, template: InventoryReportTemplate, config: ExportConfiguration): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      this.addPDFHeader(doc, config);

      // Content based on template type
      switch (template.type) {
        case 'overview':
          this.addOverviewPDFContent(doc, data, config);
          break;
        case 'valuation':
          this.addValuationPDFContent(doc, data, config);
          break;
        // Add other template types as needed
      }

      // Footer
      this.addPDFFooter(doc, config);

      doc.end();
    });
  }

  private async generateCSVReport(data: any, template: InventoryReportTemplate, config: ExportConfiguration): Promise<Buffer> {
    // Simple CSV generation - would be expanded based on template type
    let csvContent = '';
    
    switch (template.type) {
      case 'overview':
        csvContent = this.generateOverviewCSV(data);
        break;
      case 'performance':
        csvContent = this.generatePerformanceCSV(data);
        break;
      // Add other template types as needed
    }

    return Buffer.from(csvContent, 'utf-8');
  }

  // Excel generation helpers
  private async generateOverviewExcel(workbook: any, data: any, config: ExportConfiguration): Promise<void> {
    const worksheet = workbook.addWorksheet('Inventory Overview');
    
    // Title
    worksheet.addRow([config.headerInfo.companyName]);
    worksheet.addRow(['Inventory Overview Report']);
    worksheet.addRow([`Period: ${config.headerInfo.period}`]);
    worksheet.addRow([]);

    // Summary section
    worksheet.addRow(['SUMMARY METRICS']);
    worksheet.addRow(['Total Products', data.summary.totalProducts]);
    worksheet.addRow(['Active Products', data.summary.activeProducts]);
    worksheet.addRow(['Total Stock Value', formatNairaAmount(data.summary.totalStockValue)]);
    worksheet.addRow(['Stock Turnover Rate', data.summary.stockTurnoverRate]);
    worksheet.addRow(['Days of Inventory', data.summary.daysOfInventoryOnHand]);
    worksheet.addRow([]);

    // Stock distribution
    worksheet.addRow(['STOCK DISTRIBUTION']);
    worksheet.addRow(['Status', 'Count', 'Value', 'Percentage']);
    Object.entries(data.stockDistribution).forEach(([status, dist]: [string, any]) => {
      worksheet.addRow([status.toUpperCase(), dist.count, formatNairaAmount(dist.value), `${dist.percentage}%`]);
    });
    worksheet.addRow([]);

    // Category breakdown
    worksheet.addRow(['CATEGORY BREAKDOWN']);
    worksheet.addRow(['Category', 'Products', 'Stock Value', 'Turnover Rate', 'Performance']);
    data.categoryBreakdown.forEach((category: any) => {
      worksheet.addRow([
        category.categoryName,
        category.productCount,
        formatNairaAmount(category.stockValue),
        category.turnoverRate,
        category.performanceRating
      ]);
    });

    // Nigerian business metrics
    if (config.includeNigerianFormatting) {
      worksheet.addRow([]);
      worksheet.addRow(['NIGERIAN BUSINESS METRICS']);
      worksheet.addRow(['Import vs Local']);
      worksheet.addRow(['Type', 'Count', 'Value', 'Percentage']);
      worksheet.addRow([
        'Local Products',
        data.businessMetrics.importVsLocalRatio.local.count,
        formatNairaAmount(data.businessMetrics.importVsLocalRatio.local.value),
        `${data.businessMetrics.importVsLocalRatio.local.percentage}%`
      ]);
      worksheet.addRow([
        'Imported Products',
        data.businessMetrics.importVsLocalRatio.imported.count,
        formatNairaAmount(data.businessMetrics.importVsLocalRatio.imported.value),
        `${data.businessMetrics.importVsLocalRatio.imported.percentage}%`
      ]);
    }

    // VAT details if required
    if (config.includeVATDetails) {
      worksheet.addRow([]);
      worksheet.addRow(['VAT SUMMARY']);
      worksheet.addRow(['Total VAT Collected', formatNairaAmount(data.businessMetrics.vatImpact.totalVatCollected)]);
      worksheet.addRow(['Average VAT per Product', formatNairaAmount(data.businessMetrics.vatImpact.averageVatPerProduct)]);
      worksheet.addRow(['Vatable Products', data.businessMetrics.vatImpact.vatableProducts]);
    }

    // Style the worksheet
    this.styleExcelWorksheet(worksheet);
  }

  private async generateValuationExcel(workbook: any, data: any, config: ExportConfiguration): Promise<void> {
    const worksheet = workbook.addWorksheet('Inventory Valuation');
    
    // Title and header
    worksheet.addRow([config.headerInfo.companyName]);
    worksheet.addRow(['Inventory Valuation Report']);
    worksheet.addRow([`Period: ${config.headerInfo.period}`]);
    worksheet.addRow([]);

    // Total valuation
    worksheet.addRow(['TOTAL VALUATION']);
    worksheet.addRow(['Total Value', formatNairaAmount(data.totalValuation.totalValue)]);
    worksheet.addRow(['Total Quantity', data.totalValuation.totalQuantity]);
    worksheet.addRow(['Average Unit Cost', formatNairaAmount(data.totalValuation.averageUnitCost)]);
    worksheet.addRow([]);

    // Valuation methods comparison
    worksheet.addRow(['VALUATION METHODS COMPARISON']);
    worksheet.addRow(['Method', 'Value', 'Profit/Loss']);
    Object.entries(data.methodComparison).forEach(([method, values]: [string, any]) => {
      worksheet.addRow([
        method.toUpperCase(),
        formatNairaAmount(values.value),
        values.profit ? formatNairaAmount(values.profit) : (values.appreciation ? formatNairaAmount(values.appreciation) : 'N/A')
      ]);
    });

    this.styleExcelWorksheet(worksheet);
  }

  private async generatePerformanceExcel(workbook: any, data: any, config: ExportConfiguration): Promise<void> {
    const worksheet = workbook.addWorksheet('Product Performance');
    
    // Headers
    worksheet.addRow([config.headerInfo.companyName]);
    worksheet.addRow(['Product Performance Report']);
    worksheet.addRow([`Generated: ${new Date().toLocaleDateString()}`]);
    worksheet.addRow([]);

    // Column headers
    const headers = [
      'Product Name', 'SKU', 'Category', 'Current Stock', 'Total Sales',
      'Revenue', 'Profit Margin (%)', 'Turnover Rate', 'Performance Rating'
    ];
    worksheet.addRow(headers);

    // Data rows
    data.forEach((product: any) => {
      worksheet.addRow([
        product.productName,
        product.sku,
        product.categoryName,
        product.stockMetrics.currentStock,
        product.salesMetrics.totalSales,
        formatNairaAmount(product.salesMetrics.totalRevenue),
        product.financialMetrics.margin,
        product.operationalMetrics.turnoverRate,
        product.rating.overall
      ]);
    });

    this.styleExcelWorksheet(worksheet);
  }

  private async generateSeasonalExcel(workbook: any, data: any, config: ExportConfiguration): Promise<void> {
    const worksheet = workbook.addWorksheet('Seasonal Analysis');
    
    worksheet.addRow([config.headerInfo.companyName]);
    worksheet.addRow(['Seasonal Demand Analysis']);
    worksheet.addRow([]);

    // Festive seasons
    worksheet.addRow(['FESTIVE SEASONS IMPACT']);
    worksheet.addRow(['Season', 'Demand Multiplier', 'Peak Weeks']);
    Object.entries(data.pattern.festiveSeasons).forEach(([season, details]: [string, any]) => {
      worksheet.addRow([season, details.demandMultiplier, details.peakWeeks.join(', ')]);
    });
    worksheet.addRow([]);

    // Business cycles
    worksheet.addRow(['BUSINESS CYCLES']);
    worksheet.addRow(['Cycle Type', 'Multiplier', 'Timing']);
    worksheet.addRow(['Salary Weeks', data.pattern.businessCycles.salaryWeeks.demandMultiplier, 'Weekly cycle']);
    worksheet.addRow(['Month End', data.pattern.businessCycles.monthEnd.demandMultiplier, 'Last few days of month']);
    worksheet.addRow(['Quarter End', data.pattern.businessCycles.quarterEnd.demandMultiplier, 'End of quarters']);

    this.styleExcelWorksheet(worksheet);
  }

  // PDF generation helpers
  private addPDFHeader(doc: any, config: ExportConfiguration): void {
    doc.fontSize(20).text(config.headerInfo.companyName, { align: 'center' });
    doc.fontSize(16).text('Inventory Analytics Report', { align: 'center' });
    doc.fontSize(12).text(`Period: ${config.headerInfo.period}`, { align: 'center' });
    
    if (config.headerInfo.address) {
      doc.fontSize(10).text(config.headerInfo.address, { align: 'center' });
    }
    
    if (config.headerInfo.taxId) {
      doc.text(`Tax ID: ${config.headerInfo.taxId}`, { align: 'center' });
    }
    
    doc.moveDown(2);
  }

  private addOverviewPDFContent(doc: any, data: any, config: ExportConfiguration): void {
    doc.fontSize(14).text('Summary Metrics', { underline: true });
    doc.fontSize(12);
    doc.text(`Total Products: ${data.summary.totalProducts}`);
    doc.text(`Active Products: ${data.summary.activeProducts}`);
    doc.text(`Total Stock Value: ${formatNairaAmount(data.summary.totalStockValue)}`);
    doc.text(`Stock Turnover Rate: ${data.summary.stockTurnoverRate}`);
    doc.moveDown();

    if (config.includeVATDetails) {
      doc.fontSize(14).text('VAT Summary', { underline: true });
      doc.fontSize(12);
      doc.text(`Total VAT Collected: ${formatNairaAmount(data.businessMetrics.vatImpact.totalVatCollected)}`);
      // VAT rate line removed - not applicable
      doc.moveDown();
    }
  }

  private addValuationPDFContent(doc: any, data: any, config: ExportConfiguration): void {
    doc.fontSize(14).text('Inventory Valuation', { underline: true });
    doc.fontSize(12);
    doc.text(`Total Value: ${formatNairaAmount(data.totalValuation.totalValue)}`);
    doc.text(`Total Quantity: ${data.totalValuation.totalQuantity.toLocaleString()}`);
    doc.text(`Average Unit Cost: ${formatNairaAmount(data.totalValuation.averageUnitCost)}`);
    doc.moveDown();
  }

  private addPDFFooter(doc: any, config: ExportConfiguration): void {
    const pageHeight = doc.page.height;
    doc.fontSize(8)
       .text(`Generated on ${new Date().toLocaleDateString()} by Bareloft E-commerce System`, 
             50, pageHeight - 50, { align: 'center' });
    
    if (config.watermark) {
      doc.fontSize(50)
         .fillColor('#f0f0f0')
         .text(config.watermark, 0, pageHeight / 2, { 
           align: 'center',
           rotate: 45,
           opacity: 0.1
         });
    }
  }

  // CSV generation helpers
  private generateOverviewCSV(data: any): string {
    let csv = 'Inventory Overview Report\n\n';
    
    csv += 'Summary Metrics\n';
    csv += 'Metric,Value\n';
    csv += `Total Products,${data.summary.totalProducts}\n`;
    csv += `Active Products,${data.summary.activeProducts}\n`;
    csv += `Total Stock Value,${data.summary.totalStockValue / 100}\n`; // Convert from kobo
    csv += `Stock Turnover Rate,${data.summary.stockTurnoverRate}\n\n`;

    csv += 'Stock Distribution\n';
    csv += 'Status,Count,Value,Percentage\n';
    Object.entries(data.stockDistribution).forEach(([status, dist]: [string, any]) => {
      csv += `${status},${dist.count},${dist.value / 100},${dist.percentage}%\n`;
    });

    return csv;
  }

  private generatePerformanceCSV(data: any): string {
    let csv = 'Product Performance Report\n\n';
    csv += 'Product Name,SKU,Category,Current Stock,Total Sales,Revenue (NGN),Profit Margin (%),Rating\n';
    
    data.forEach((product: any) => {
      csv += `${product.productName},${product.sku},${product.categoryName},${product.stockMetrics.currentStock},${product.salesMetrics.totalSales},${product.salesMetrics.totalRevenue / 100},${product.financialMetrics.margin},${product.rating.overall}\n`;
    });

    return csv;
  }

  // Utility methods
  private styleExcelWorksheet(worksheet: any): void {
    // Set column widths
    worksheet.columns = worksheet.columns.map(() => ({ width: 20 }));
    
    // Style header rows
    worksheet.getRow(1).font = { bold: true, size: 16 };
    worksheet.getRow(2).font = { bold: true, size: 14 };
    
    // Add borders to data tables (simplified)
    worksheet.eachRow({ includeEmpty: false }, (row: any, rowNumber: number) => {
      row.eachCell({ includeEmpty: false }, (cell: any) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
  }

  private mapTemplateToReportType(templateType: string): ReportType {
    const mapping: Record<string, ReportType> = {
      'overview': 'inventory_report',
      'turnover': 'inventory_report',
      'valuation': 'financial_summary',
      'performance': 'product_performance',
      'seasonal': 'marketing_performance',
      'compliance': 'operational_metrics'
    };
    return mapping[templateType] || 'inventory_report';
  }

  private generateFileName(template: InventoryReportTemplate, format: string): string {
    const date = new Date().toISOString().split('T')[0];
    const sanitizedName = template.name.replace(/\s+/g, '_').toLowerCase();
    return `${sanitizedName}_${date}.${format}`;
  }

  private calculateNextRun(frequency: string): Date {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      case 'quarterly':
        return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
      case 'yearly':
        return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  private calculateVATSummary(overview: any, valuation: any): any {
    const vatRate = 0; // VAT not applicable
    const totalValue = valuation.totalValuation.totalValue;
    
    return {
      totalVatableValue: Math.round(totalValue * 0.9), // Assume 90% is VATable
      vatCollected: Math.round(totalValue * 0.9 * vatRate),
      vatRemittable: Math.round(totalValue * 0.9 * vatRate),
      exemptItems: Math.round(overview.summary.totalProducts * 0.05), // 5% exempt
      zeroRatedItems: Math.round(overview.summary.totalProducts * 0.05) // 5% zero-rated
    };
  }

  private calculateImportSummary(overview: any): any {
    const importedValue = overview.businessMetrics.importVsLocalRatio.imported.value;
    
    return {
      totalImportValue: importedValue,
      customsDutyPaid: Math.round(importedValue * 0.15), // Assume 15% average duty
      importLicenses: ['IL001', 'IL002', 'IL003'],
      clearanceDocuments: ['CD001', 'CD002', 'CD003']
    };
  }

  private calculateTaxValuation(valuation: any): any {
    const totalValue = valuation.totalValuation.totalValue;
    
    return {
      openingStock: Math.round(totalValue * 0.8),
      purchases: Math.round(totalValue * 0.3),
      sales: Math.round(totalValue * 0.5),
      closingStock: totalValue,
      costOfGoodsSold: Math.round(totalValue * 0.4)
    };
  }
}