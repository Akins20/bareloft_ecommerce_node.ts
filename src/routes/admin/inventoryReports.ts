import { Router } from "express";
import { AdminInventoryReportingController } from "../../controllers/admin/AdminInventoryReportingController";
import { authenticate } from "../../middleware/auth/authenticate";
import { authorize } from "../../middleware/auth/authorize";
import { rateLimiter } from "../../middleware/security/rateLimiter";
import { cacheMiddleware } from "../../middleware/cache/cacheMiddleware";

const router = Router();
const reportingController = new AdminInventoryReportingController();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize(["ADMIN", "SUPER_ADMIN"]));

// Apply rate limiting for admin reporting endpoints
router.use(rateLimiter.admin);

// ========================
// REPORT TEMPLATES AND OPTIONS
// ========================

/**
 * @route   GET /api/admin/inventory/reports/templates
 * @desc    Get available inventory report templates
 * @access  Admin, Super Admin
 * 
 * Returns:
 * - List of available report templates
 * - Template metadata (Nigerian compliance, VAT inclusion, supported formats)
 * - Estimated generation times and required permissions
 */
router.get("/templates",
  cacheMiddleware({ ttl: 60 * 60 }), // 1 hour cache
  reportingController.getReportTemplates
);

/**
 * @route   GET /api/admin/inventory/reports/export-options
 * @desc    Get available export formats and configuration options
 * @access  Admin, Super Admin
 * 
 * Returns:
 * - Supported export formats (Excel, PDF, CSV)
 * - Nigerian business formatting options
 * - Compliance and VAT configuration options
 */
router.get("/export-options",
  cacheMiddleware({ ttl: 2 * 60 * 60 }), // 2 hours cache
  reportingController.getExportOptions
);

// ========================
// REPORT GENERATION
// ========================

/**
 * @route   POST /api/admin/inventory/reports/generate
 * @desc    Generate a new inventory report
 * @access  Admin, Super Admin
 * @body    templateId - Report template ID (required)
 * @body    format - Export format: excel, pdf, csv (default: excel)
 * @body    includeCharts - Include charts in report (default: true)
 * @body    includeNigerianFormatting - Include Nigerian business formatting (default: true)
 * @body    includeVATDetails - Include VAT calculations and details (default: true)
 * @body    includeComplianceNotes - Include regulatory compliance notes (default: false)
 * @body    parameters - Report-specific parameters (dates, filters, etc.)
 * @body    fileName - Custom filename (optional)
 * @body    companyName - Company name for report header (default: "Bareloft E-commerce")
 * @body    companyAddress - Company address (default: "Lagos, Nigeria")
 * @body    taxId - Nigerian tax identification number (optional)
 * 
 * Returns:
 * - Report generation details and download information
 */
router.post("/generate", reportingController.generateReport);

/**
 * @route   GET /api/admin/inventory/reports/:reportId/status
 * @desc    Get report generation status
 * @access  Admin, Super Admin
 * @param   reportId - Generated report ID
 * 
 * Returns:
 * - Report generation progress and status
 * - Download availability and expiration details
 */
router.get("/:reportId/status", reportingController.getReportStatus);

/**
 * @route   GET /api/admin/inventory/reports/:reportId/download
 * @desc    Download generated report file
 * @access  Admin, Super Admin
 * @param   reportId - Generated report ID
 * 
 * Returns:
 * - Report file as attachment download
 * - Proper content type and filename headers
 */
router.get("/:reportId/download", reportingController.downloadReport);

// ========================
// SCHEDULED REPORTS
// ========================

/**
 * @route   POST /api/admin/inventory/reports/schedule
 * @desc    Schedule recurring inventory report generation
 * @access  Admin, Super Admin
 * @body    templateId - Report template ID (required)
 * @body    frequency - Report frequency: daily, weekly, monthly, quarterly, yearly (required)
 * @body    recipients - Email addresses for report delivery (required, array)
 * @body    parameters - Report generation parameters (optional)
 * @body    name - Custom name for scheduled report (optional)
 * 
 * Returns:
 * - Scheduled report details and next run time
 */
router.post("/schedule", reportingController.scheduleReport);

/**
 * @route   GET /api/admin/inventory/reports/scheduled
 * @desc    Get list of scheduled reports
 * @access  Admin, Super Admin
 * 
 * Returns:
 * - List of active and inactive scheduled reports
 * - Next run times and recipient information
 */
router.get("/scheduled", reportingController.getScheduledReports);

/**
 * @route   PUT /api/admin/inventory/reports/scheduled/:scheduleId
 * @desc    Update scheduled report configuration
 * @access  Admin, Super Admin
 * @param   scheduleId - Scheduled report ID
 * @body    isActive - Enable/disable the scheduled report (optional)
 * @body    frequency - Update report frequency (optional)
 * @body    recipients - Update recipient list (optional)
 * 
 * Returns:
 * - Updated schedule configuration
 */
router.put("/scheduled/:scheduleId", reportingController.updateScheduledReport);

/**
 * @route   DELETE /api/admin/inventory/reports/scheduled/:scheduleId
 * @desc    Delete scheduled report
 * @access  Admin, Super Admin
 * @param   scheduleId - Scheduled report ID
 * 
 * Returns:
 * - Confirmation of deletion
 */
router.delete("/scheduled/:scheduleId", reportingController.deleteScheduledReport);

// ========================
// REPORT HISTORY AND COMPLIANCE
// ========================

/**
 * @route   GET /api/admin/inventory/reports/history
 * @desc    Get report generation history
 * @access  Admin, Super Admin
 * @query   limit - Number of records to return (default: 50, max: 200)
 * @query   offset - Number of records to skip (default: 0)
 * 
 * Returns:
 * - Historical report generation records
 * - Download statistics and expiration status
 */
router.get("/history", reportingController.getReportHistory);

/**
 * @route   POST /api/admin/inventory/reports/compliance
 * @desc    Generate Nigerian compliance report for tax and regulatory authorities
 * @access  Admin, Super Admin
 * @body    complianceType - Type of compliance: tax, audit, customs, regulatory (default: tax)
 * @body    startDate - Report period start date (default: start of current year)
 * @body    endDate - Report period end date (default: current date)
 * @body    format - Export format: excel, pdf (default: excel)
 * 
 * Returns:
 * - Compliance report data and downloadable report file
 * - VAT calculations, import summaries, and tax valuations
 */
router.post("/compliance", reportingController.generateComplianceReport);

// ========================
// SPECIALIZED REPORTS
// ========================

/**
 * @route   POST /api/admin/inventory/reports/custom
 * @desc    Generate custom report with advanced filters and parameters
 * @access  Admin, Super Admin
 * @body    reportType - Custom report type
 * @body    filters - Advanced filtering options
 * @body    groupBy - Data grouping preferences
 * @body    metrics - Specific metrics to include
 * @body    format - Export format
 * 
 * Returns:
 * - Custom report based on specified parameters
 */
router.post("/custom", reportingController.generateReport);

/**
 * @route   GET /api/admin/inventory/reports/templates/:templateId/preview
 * @desc    Get preview of report template with sample data
 * @access  Admin, Super Admin
 * @param   templateId - Report template ID
 * 
 * Returns:
 * - Preview of report structure and sample data
 * - Template configuration and available options
 */
router.get("/templates/:templateId/preview", (req, res) => {
  // Placeholder for template preview functionality
  res.json({
    success: true,
    message: "Template preview feature coming soon",
    data: {
      templateId: req.params.templateId,
      preview: "Sample report preview would be displayed here"
    }
  });
});

export default router;