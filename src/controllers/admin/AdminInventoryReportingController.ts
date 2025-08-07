import { Request, Response } from "express";
import { BaseController } from "../BaseController";
import { InventoryReportingService, ExportConfiguration } from "../../services/analytics/InventoryReportingService";
import { InventoryAnalyticsService } from "../../services/analytics/InventoryAnalyticsService";
import { CacheService } from "../../services/cache/CacheService";

/**
 * Admin Inventory Reporting Controller
 * Handles report generation, scheduling, and exports with Nigerian compliance
 */
export class AdminInventoryReportingController extends BaseController {
  private reportingService: InventoryReportingService;
  private analyticsService: InventoryAnalyticsService;
  private cacheService: CacheService;

  constructor() {
    super();
    this.cacheService = new CacheService();
    this.analyticsService = new InventoryAnalyticsService(this.cacheService);
    this.reportingService = new InventoryReportingService(
      this.analyticsService,
      {} as any, // Base reporting service placeholder
      this.cacheService
    );
  }

  /**
   * Get available report templates
   * GET /api/admin/inventory/reports/templates
   */
  public getReportTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);

      this.logAction('get_report_templates', userId, 'admin_inventory_reports');

      const templates = await this.reportingService.getReportTemplates();

      this.sendSuccess(res, { templates }, 'Report templates retrieved successfully');
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Generate inventory report
   * POST /api/admin/inventory/reports/generate
   */
  public generateReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const {
        templateId,
        format = 'excel',
        includeCharts = true,
        includeNigerianFormatting = true,
        includeVATDetails = true,
        includeComplianceNotes = false,
        parameters = {},
        fileName,
        companyName = 'Bareloft E-commerce',
        companyAddress = 'Lagos, Nigeria',
        taxId
      } = req.body;

      // Validate required fields
      const validation = this.validateRequiredFields(req.body, ['templateId']);
      if (!validation.isValid) {
        this.sendError(res, "Missing required fields", 400, "VALIDATION_ERROR", validation.missingFields);
        return;
      }

      // Validate template exists
      const templates = await this.reportingService.getReportTemplates();
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        this.sendError(res, "Invalid template ID", 400, "INVALID_TEMPLATE");
        return;
      }

      // Validate format
      if (!['excel', 'pdf', 'csv'].includes(format)) {
        this.sendError(res, "Invalid export format", 400, "INVALID_FORMAT");
        return;
      }

      this.logAction('generate_inventory_report', userId, 'admin_inventory_reports', undefined, {
        templateId,
        format,
        parameters
      });

      // Prepare export configuration
      const exportConfig: ExportConfiguration = {
        format,
        fileName: fileName || `${template.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${format}`,
        includeCharts,
        includeNigerianFormatting,
        includeVATDetails,
        includeComplianceNotes,
        headerInfo: {
          companyName,
          address: companyAddress,
          taxId,
          period: parameters.period || `${new Date().toLocaleDateString()}`
        }
      };

      // Generate the report
      const report = await this.reportingService.generateInventoryReport(
        templateId,
        parameters,
        exportConfig
      );

      this.sendSuccess(res, {
        reportId: report.id,
        filename: report.filename,
        downloadUrl: report.downloadUrl,
        estimatedSize: report.size,
        generatedAt: report.generatedAt,
        expiresAt: report.expiresAt,
        status: report.status
      }, 'Report generated successfully', 201);

    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Download generated report
   * GET /api/admin/inventory/reports/:reportId/download
   */
  public downloadReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { reportId } = req.params;

      if (!reportId) {
        this.sendError(res, "Report ID is required", 400, "MISSING_REPORT_ID");
        return;
      }

      this.logAction('download_inventory_report', userId, 'admin_inventory_reports', reportId);

      const downloadData = await this.reportingService.downloadReport(reportId);

      // Set response headers for file download
      res.setHeader('Content-Type', downloadData.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${downloadData.filename}"`);
      res.setHeader('Content-Length', downloadData.buffer.length);

      // Send the file
      res.send(downloadData.buffer);

    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        this.sendError(res, "Report not found or expired", 404, "REPORT_NOT_FOUND");
      } else {
        this.handleError(error, req, res);
      }
    }
  };

  /**
   * Schedule recurring report
   * POST /api/admin/inventory/reports/schedule
   */
  public scheduleReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const {
        templateId,
        frequency,
        recipients = [],
        parameters = {},
        name
      } = req.body;

      // Validate required fields
      const validation = this.validateRequiredFields(req.body, ['templateId', 'frequency']);
      if (!validation.isValid) {
        this.sendError(res, "Missing required fields", 400, "VALIDATION_ERROR", validation.missingFields);
        return;
      }

      // Validate frequency
      const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
      if (!validFrequencies.includes(frequency)) {
        this.sendError(res, "Invalid frequency", 400, "INVALID_FREQUENCY", validFrequencies);
        return;
      }

      // Validate recipients
      if (recipients.length === 0) {
        this.sendError(res, "At least one recipient is required", 400, "NO_RECIPIENTS");
        return;
      }

      this.logAction('schedule_inventory_report', userId, 'admin_inventory_reports', undefined, {
        templateId,
        frequency,
        recipients: recipients.length
      });

      const scheduledReport = await this.reportingService.scheduleReport(
        templateId,
        frequency,
        recipients,
        parameters,
        userId
      );

      this.sendSuccess(res, {
        scheduleId: scheduledReport.id,
        name: scheduledReport.name,
        frequency: scheduledReport.frequency,
        nextRun: scheduledReport.nextRun,
        recipients: scheduledReport.recipients.length,
        isActive: scheduledReport.isActive
      }, 'Report scheduled successfully', 201);

    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get report generation history
   * GET /api/admin/inventory/reports/history
   */
  public getReportHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { limit = 50, offset = 0 } = req.query;

      this.logAction('get_report_history', userId, 'admin_inventory_reports', undefined, { limit, offset });

      const history = await this.reportingService.getReportHistory(
        parseInt(limit as string),
        userId
      );

      // Format the response
      const formattedHistory = history.map(record => ({
        id: record.id,
        reportId: record.reportId,
        templateId: record.templateId,
        generatedAt: record.generatedAt,
        generatedBy: record.generatedBy,
        fileSize: this.formatFileSize(record.fileSize),
        downloadCount: record.downloadCount,
        expiresAt: record.expiresAt,
        status: record.status,
        isExpired: new Date() > record.expiresAt
      }));

      this.sendSuccess(res, {
        history: formattedHistory,
        pagination: {
          total: history.length,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: history.length >= parseInt(limit as string)
        }
      }, 'Report history retrieved successfully');

    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Generate Nigerian compliance report
   * POST /api/admin/inventory/reports/compliance
   */
  public generateComplianceReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const {
        complianceType = 'tax',
        startDate,
        endDate,
        format = 'excel'
      } = req.body;

      // Validate compliance type
      const validTypes = ['tax', 'audit', 'customs', 'regulatory'];
      if (!validTypes.includes(complianceType)) {
        this.sendError(res, "Invalid compliance type", 400, "INVALID_COMPLIANCE_TYPE", validTypes);
        return;
      }

      // Set default dates if not provided
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getFullYear(), 0, 1); // Start of year

      this.logAction('generate_compliance_report', userId, 'admin_inventory_reports', undefined, {
        complianceType,
        period: { start, end }
      });

      const complianceReport = await this.reportingService.generateComplianceReport(
        complianceType,
        { start, end }
      );

      // Generate exportable report
      const exportConfig: ExportConfiguration = {
        format,
        fileName: `nigerian_compliance_${complianceType}_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.${format}`,
        includeCharts: false,
        includeNigerianFormatting: true,
        includeVATDetails: true,
        includeComplianceNotes: true,
        headerInfo: {
          companyName: 'Bareloft E-commerce',
          address: 'Lagos, Nigeria',
          period: `${start.toDateString()} - ${end.toDateString()}`
        }
      };

      const report = await this.reportingService.generateInventoryReport(
        'tax-compliance',
        { complianceType, startDate: start, endDate: end },
        exportConfig
      );

      this.sendSuccess(res, {
        complianceReport,
        downloadableReport: {
          reportId: report.id,
          downloadUrl: report.downloadUrl,
          filename: report.filename,
          expiresAt: report.expiresAt
        }
      }, 'Compliance report generated successfully');

    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get scheduled reports
   * GET /api/admin/inventory/reports/scheduled
   */
  public getScheduledReports = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);

      this.logAction('get_scheduled_reports', userId, 'admin_inventory_reports');

      // In a real implementation, this would query the database
      // For now, return mock scheduled reports
      const scheduledReports = [
        {
          id: 'sched_001',
          templateId: 'inventory-overview',
          name: 'Weekly Inventory Overview',
          frequency: 'weekly',
          recipients: ['admin@bareloft.com', 'manager@bareloft.com'],
          nextRun: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
          lastRun: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          isActive: true,
          createdAt: new Date('2024-01-01'),
          createdBy: userId
        },
        {
          id: 'sched_002',
          templateId: 'inventory-valuation',
          name: 'Monthly Valuation Report',
          frequency: 'monthly',
          recipients: ['finance@bareloft.com'],
          nextRun: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
          lastRun: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
          isActive: true,
          createdAt: new Date('2024-01-01'),
          createdBy: userId
        }
      ];

      this.sendSuccess(res, { scheduledReports }, 'Scheduled reports retrieved successfully');

    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Update scheduled report
   * PUT /api/admin/inventory/reports/scheduled/:scheduleId
   */
  public updateScheduledReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { scheduleId } = req.params;
      const { isActive, frequency, recipients } = req.body;

      if (!scheduleId) {
        this.sendError(res, "Schedule ID is required", 400, "MISSING_SCHEDULE_ID");
        return;
      }

      this.logAction('update_scheduled_report', userId, 'admin_inventory_reports', scheduleId, req.body);

      // In a real implementation, this would update the database record
      const updatedSchedule = {
        id: scheduleId,
        isActive: isActive !== undefined ? isActive : true,
        frequency: frequency || 'weekly',
        recipients: recipients || [],
        updatedAt: new Date(),
        updatedBy: userId
      };

      this.sendSuccess(res, { schedule: updatedSchedule }, 'Scheduled report updated successfully');

    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Delete scheduled report
   * DELETE /api/admin/inventory/reports/scheduled/:scheduleId
   */
  public deleteScheduledReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { scheduleId } = req.params;

      if (!scheduleId) {
        this.sendError(res, "Schedule ID is required", 400, "MISSING_SCHEDULE_ID");
        return;
      }

      this.logAction('delete_scheduled_report', userId, 'admin_inventory_reports', scheduleId);

      // In a real implementation, this would delete from the database
      // For now, just return success
      this.sendSuccess(res, { deletedScheduleId: scheduleId }, 'Scheduled report deleted successfully');

    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get report generation status
   * GET /api/admin/inventory/reports/:reportId/status
   */
  public getReportStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { reportId } = req.params;

      if (!reportId) {
        this.sendError(res, "Report ID is required", 400, "MISSING_REPORT_ID");
        return;
      }

      this.logAction('get_report_status', userId, 'admin_inventory_reports', reportId);

      // In a real implementation, this would check the actual report status
      const status = {
        reportId,
        status: 'completed',
        progress: 100,
        estimatedTimeRemaining: 0,
        generatedAt: new Date(),
        downloadUrl: `/api/admin/inventory/reports/${reportId}/download`,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000)
      };

      this.sendSuccess(res, status, 'Report status retrieved successfully');

    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get export formats and configurations
   * GET /api/admin/inventory/reports/export-options
   */
  public getExportOptions = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);

      this.logAction('get_export_options', userId, 'admin_inventory_reports');

      const exportOptions = {
        formats: [
          {
            type: 'excel',
            name: 'Microsoft Excel',
            extension: '.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            features: ['Charts', 'Multiple Sheets', 'Formulas', 'Styling']
          },
          {
            type: 'pdf',
            name: 'Portable Document Format',
            extension: '.pdf',
            mimeType: 'application/pdf',
            features: ['Print Ready', 'Watermarks', 'Professional Layout']
          },
          {
            type: 'csv',
            name: 'Comma Separated Values',
            extension: '.csv',
            mimeType: 'text/csv',
            features: ['Lightweight', 'Universal Compatibility']
          }
        ],
        nigerianOptions: {
          currency: 'NGN',
          vatRate: 7.5,
          timezone: 'Africa/Lagos',
          dateFormat: 'DD/MM/YYYY',
          numberFormat: '1,234.56'
        },
        complianceOptions: [
          'Nigerian VAT Compliance',
          'Import Duty Documentation',
          'Tax Authority Reporting',
          'Audit Trail Requirements'
        ]
      };

      this.sendSuccess(res, exportOptions, 'Export options retrieved successfully');

    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  // Private helper methods

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}