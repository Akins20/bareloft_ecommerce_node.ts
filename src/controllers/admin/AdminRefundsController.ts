import { Request, Response } from 'express';
import { BaseAdminController } from './BaseAdminController';
import { RefundsService } from '../../services/returns/RefundsService';
import {
  RefundStatus,
  RefundMethod,
  ProcessRefundRequest,
  BulkRefundRequest,
  RefundListQuery,
  createSuccessResponse,
  createErrorResponse,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
} from '../../types';

export class AdminRefundsController extends BaseAdminController {
  private refundsService: RefundsService;

  constructor(refundsService?: RefundsService) {
    super();
    this.refundsService = refundsService || new RefundsService();
  }

  /**
   * GET /api/admin/refunds
   * List all refunds with filtering and pagination
   */
  async getRefunds(req: Request, res: Response): Promise<void> {
    try {
      const query: RefundListQuery = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        status: req.query.status ? (req.query.status as string).split(',') as RefundStatus[] : undefined,
        refundMethod: req.query.refundMethod ? (req.query.refundMethod as string).split(',') as RefundMethod[] : undefined,
        customerId: req.query.customerId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        minAmount: req.query.minAmount ? Number(req.query.minAmount) : undefined,
        maxAmount: req.query.maxAmount ? Number(req.query.maxAmount) : undefined,
      };

      const result = await this.refundsService.getRefunds(query);

      // Log admin activity
      await this.logActivity(req, 'VIEW_REFUNDS', {
        filters: query,
        resultCount: result.refunds.length,
      });

      res.json(createSuccessResponse(
        'Refunds retrieved successfully',
        result
      ));
    } catch (error) {
      await this.handleError(req, res, error, 'Error retrieving refunds');
    }
  }

  /**
   * GET /api/admin/refunds/:refundId
   * Get detailed refund information
   */
  async getRefund(req: Request, res: Response): Promise<void> {
    try {
      const { refundId } = req.params;

      const refund = await this.refundsService.getRefund(refundId);

      // Log admin activity
      await this.logActivity(req, 'VIEW_REFUND_DETAILS', {
        refundId,
        refundNumber: refund.refundNumber,
        customerId: refund.customerId,
        amount: refund.amount / 100,
      });

      res.json(createSuccessResponse(
        'Refund details retrieved successfully',
        { refund }
      ));
    } catch (error) {
      await this.handleError(req, res, error, 'Error retrieving refund');
    }
  }

  /**
   * POST /api/admin/refunds/process
   * Process a new refund
   */
  async processRefund(req: Request, res: Response): Promise<void> {
    try {
      const {
        returnRequestId,
        orderId,
        amount,
        refundMethod,
        reason,
        description,
        bankAccountDetails,
        adminNotes,
        notifyCustomer,
      } = req.body;
      const adminId = req.user?.id;

      if (!orderId || !amount || !refundMethod || !reason) {
        throw new AppError(
          'Order ID, amount, refund method, and reason are required',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      if (amount <= 0) {
        throw new AppError(
          'Refund amount must be greater than zero',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      if (!Object.values(RefundMethod).includes(refundMethod)) {
        throw new AppError(
          'Invalid refund method',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const refundRequest: ProcessRefundRequest = {
        returnRequestId,
        orderId,
        amount: Number(amount),
        refundMethod,
        reason,
        description,
        bankAccountDetails,
        adminNotes,
        notifyCustomer: notifyCustomer !== false, // Default to true
      };

      const result = await this.refundsService.processRefund(refundRequest, adminId!);

      // Log admin activity
      await this.logActivity(req, 'PROCESS_REFUND', {
        refundId: result.refund.id,
        refundNumber: result.refund.refundNumber,
        orderId,
        amount,
        refundMethod,
        reason,
      });

      res.status(HTTP_STATUS.CREATED).json(createSuccessResponse(
        'Refund processed successfully',
        result
      ));
    } catch (error) {
      await this.handleError(req, res, error, 'Error processing refund');
    }
  }

  /**
   * POST /api/admin/refunds/bulk-process
   * Process multiple refunds in bulk
   */
  async processBulkRefunds(req: Request, res: Response): Promise<void> {
    try {
      const {
        refundRequests,
        processInBatches,
        batchSize,
        notifyCustomers,
        adminNotes,
      } = req.body;
      const adminId = req.user?.id;

      if (!refundRequests || !Array.isArray(refundRequests) || refundRequests.length === 0) {
        throw new AppError(
          'Refund requests are required',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Validate each refund request
      for (let i = 0; i < refundRequests.length; i++) {
        const refund = refundRequests[i];
        if (!refund.orderId || !refund.amount || !refund.refundMethod || !refund.reason) {
          throw new AppError(
            `Invalid refund request at index ${i}: missing required fields`,
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR
          );
        }

        if (!Object.values(RefundMethod).includes(refund.refundMethod)) {
          throw new AppError(
            `Invalid refund method at index ${i}: ${refund.refundMethod}`,
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR
          );
        }
      }

      const bulkRequest: BulkRefundRequest = {
        refundRequests,
        processInBatches: processInBatches || false,
        batchSize: batchSize || 10,
        notifyCustomers: notifyCustomers !== false,
        adminNotes,
      };

      const result = await this.refundsService.processBulkRefunds(bulkRequest, adminId!);

      // Log admin activity
      await this.logActivity(req, 'BULK_PROCESS_REFUNDS', {
        jobId: result.jobId,
        totalRequests: refundRequests.length,
        successful: result.summary.successful,
        failed: result.summary.failed,
        totalAmount: result.summary.totalAmount,
      });

      res.status(HTTP_STATUS.CREATED).json(createSuccessResponse(
        'Bulk refund processing initiated',
        result
      ));
    } catch (error) {
      await this.handleError(req, res, error, 'Error processing bulk refunds');
    }
  }

  /**
   * POST /api/admin/refunds/:refundId/approve
   * Approve a pending refund
   */
  async approveRefund(req: Request, res: Response): Promise<void> {
    try {
      const { refundId } = req.params;
      const { approvalNotes } = req.body;
      const adminId = req.user?.id;

      const result = await this.refundsService.approveRefund(refundId, adminId!, approvalNotes);

      // Log admin activity
      await this.logActivity(req, 'APPROVE_REFUND', {
        refundId,
        refundNumber: result.refund.refundNumber,
        approvalNotes,
      });

      res.json(createSuccessResponse(
        'Refund approved successfully',
        result
      ));
    } catch (error) {
      await this.handleError(req, res, error, 'Error approving refund');
    }
  }

  /**
   * GET /api/admin/refunds/pending
   * Get all pending refunds that need processing
   */
  async getPendingRefunds(req: Request, res: Response): Promise<void> {
    try {
      const { limit } = req.query;
      const limitNum = limit ? Number(limit) : undefined;

      const pendingRefunds = await this.refundsService.getPendingRefunds(limitNum);

      // Log admin activity
      await this.logActivity(req, 'VIEW_PENDING_REFUNDS', {
        count: pendingRefunds.length,
        limit: limitNum,
      });

      res.json(createSuccessResponse(
        'Pending refunds retrieved successfully',
        { refunds: pendingRefunds }
      ));
    } catch (error) {
      await this.handleError(req, res, error, 'Error retrieving pending refunds');
    }
  }

  /**
   * GET /api/admin/refunds/analytics
   * Get refunds analytics and insights
   */
  async getRefundAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const {
        startDate,
        endDate,
        customerId,
      } = req.query;

      const analytics = await this.refundsService.getRefundAnalytics({
        startDate: startDate as string,
        endDate: endDate as string,
        customerId: customerId as string,
      });

      // Log admin activity
      await this.logActivity(req, 'VIEW_REFUND_ANALYTICS', {
        period: { startDate, endDate },
        customerId,
      });

      res.json(createSuccessResponse(
        'Refund analytics retrieved successfully',
        analytics
      ));
    } catch (error) {
      await this.handleError(req, res, error, 'Error retrieving refund analytics');
    }
  }

  /**
   * POST /api/admin/refunds/validate-bank-account
   * Validate Nigerian bank account details
   */
  async validateBankAccount(req: Request, res: Response): Promise<void> {
    try {
      const { accountNumber, bankCode } = req.body;

      if (!accountNumber || !bankCode) {
        throw new AppError(
          'Account number and bank code are required',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const validation = await this.refundsService.validateBankAccount({
        accountNumber,
        bankCode,
      });

      // Log admin activity
      await this.logActivity(req, 'VALIDATE_BANK_ACCOUNT', {
        accountNumber: accountNumber.replace(/\d(?=\d{4})/g, '*'), // Mask account number
        bankCode,
        isValid: validation.isValid,
      });

      res.json(createSuccessResponse(
        validation.isValid ? 'Bank account is valid' : 'Bank account validation failed',
        validation
      ));
    } catch (error) {
      await this.handleError(req, res, error, 'Error validating bank account');
    }
  }

  /**
   * GET /api/admin/refunds/dashboard
   * Get refund management dashboard data
   */
  async getRefundDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { period = '30' } = req.query;
      const days = parseInt(period as string, 10);
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get refunds for the period
      const refundsResult = await this.refundsService.getRefunds({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        page: 1,
        limit: 1000, // Get all for statistics
      });

      // Get pending refunds
      const pendingRefunds = await this.refundsService.getPendingRefunds(10);

      // Calculate quick stats
      const totalRefunds = refundsResult.refunds.length;
      const pendingCount = refundsResult.refunds.filter(r => r.status === RefundStatus.PENDING).length;
      const processingCount = refundsResult.refunds.filter(r => r.status === RefundStatus.PROCESSING).length;
      const completedCount = refundsResult.refunds.filter(r => r.status === RefundStatus.COMPLETED).length;
      const failedCount = refundsResult.refunds.filter(r => r.status === RefundStatus.FAILED).length;

      const totalAmount = refundsResult.refunds
        .filter(r => r.status === RefundStatus.COMPLETED)
        .reduce((sum, r) => sum + r.amount, 0) / 100;

      // Refunds by method
      const methodStats = refundsResult.refunds.reduce((acc, refund) => {
        acc[refund.refundMethod] = (acc[refund.refundMethod] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const refundsByMethod = Object.entries(methodStats)
        .map(([method, count]) => ({
          method,
          count,
          percentage: totalRefunds > 0 ? (count / totalRefunds) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // Daily refunds for chart
      const dailyRefunds = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayRefunds = refundsResult.refunds.filter(refund => 
          refund.createdAt.toISOString().split('T')[0] === dateStr
        );

        const completedDayRefunds = dayRefunds.filter(r => r.status === RefundStatus.COMPLETED);

        dailyRefunds.push({
          date: dateStr,
          count: dayRefunds.length,
          completed: completedDayRefunds.length,
          value: completedDayRefunds.reduce((sum, r) => sum + r.amount, 0) / 100,
        });
      }

      // Processing time analysis
      const completedRefunds = refundsResult.refunds.filter(r => 
        r.status === RefundStatus.COMPLETED && r.processedAt && r.completedAt
      );

      let avgProcessingTime = 0;
      if (completedRefunds.length > 0) {
        const totalProcessingTime = completedRefunds.reduce((sum, refund) => {
          const processingTime = refund.completedAt && refund.processedAt
            ? (new Date(refund.completedAt).getTime() - new Date(refund.processedAt).getTime()) / (1000 * 60 * 60 * 24)
            : 0;
          return sum + processingTime;
        }, 0);
        avgProcessingTime = totalProcessingTime / completedRefunds.length;
      }

      const successRate = totalRefunds > 0 ? (completedCount / totalRefunds) * 100 : 0;

      const dashboardData = {
        summary: {
          totalRefunds,
          pendingRefunds: pendingCount,
          processingRefunds: processingCount,
          completedRefunds: completedCount,
          failedRefunds: failedCount,
          totalRefundAmount: totalAmount,
          averageProcessingTime: Math.round(avgProcessingTime * 100) / 100,
          successRate: Math.round(successRate * 100) / 100,
        },
        trends: {
          dailyRefunds,
          refundsByMethod,
        },
        recentPendingRefunds: pendingRefunds.slice(0, 5),
        alerts: [
          ...(pendingCount > 20 ? [{
            type: 'warning',
            message: `${pendingCount} refunds awaiting processing`,
            action: 'Process pending refunds',
          }] : []),
          ...(failedCount > totalRefunds * 0.1 ? [{
            type: 'error',
            message: `High refund failure rate: ${Math.round((failedCount / totalRefunds) * 100)}%`,
            action: 'Review failed refunds',
          }] : []),
          ...(avgProcessingTime > 5 ? [{
            type: 'info',
            message: `Average processing time is ${Math.round(avgProcessingTime * 100) / 100} days`,
            action: 'Optimize refund processing',
          }] : []),
        ],
        quickActions: [
          {
            title: 'Process Pending Refunds',
            count: pendingCount,
            url: '/admin/refunds?status=PENDING',
          },
          {
            title: 'Review Failed Refunds',
            count: failedCount,
            url: '/admin/refunds?status=FAILED',
          },
          {
            title: 'Bank Transfer Refunds',
            count: methodStats[RefundMethod.BANK_TRANSFER] || 0,
            url: '/admin/refunds?refundMethod=BANK_TRANSFER',
          },
        ],
      };

      // Log admin activity
      await this.logActivity(req, 'VIEW_REFUND_DASHBOARD', {
        period: days,
        totalRefunds,
        pendingCount,
        completedCount,
      });

      res.json(createSuccessResponse(
        'Refund dashboard data retrieved successfully',
        dashboardData
      ));
    } catch (error) {
      await this.handleError(req, res, error, 'Error retrieving refund dashboard');
    }
  }

  /**
   * GET /api/admin/refunds/export
   * Export refunds data
   */
  async exportRefunds(req: Request, res: Response): Promise<void> {
    try {
      const {
        format = 'csv',
        startDate,
        endDate,
        status,
        refundMethod,
      } = req.query;

      // Get all refunds matching criteria
      const refundsResult = await this.refundsService.getRefunds({
        startDate: startDate as string,
        endDate: endDate as string,
        status: status ? (status as string).split(',') as RefundStatus[] : undefined,
        refundMethod: refundMethod ? (refundMethod as string).split(',') as RefundMethod[] : undefined,
        page: 1,
        limit: 10000, // Large limit for export
      });

      // Format data for export
      const exportData = refundsResult.refunds.map(refund => ({
        'Refund Number': refund.refundNumber,
        'Order Number': refund.order?.orderNumber,
        'Return Number': refund.returnRequest?.returnNumber || 'Direct Refund',
        'Customer': `${refund.customer?.firstName} ${refund.customer?.lastName}`,
        'Email': refund.customer?.email,
        'Phone': refund.customer?.phoneNumber,
        'Status': refund.status,
        'Refund Method': refund.refundMethod,
        'Amount (NGN)': (refund.amount / 100).toFixed(2),
        'Reason': refund.reason,
        'Created Date': refund.createdAt.toISOString(),
        'Processed Date': refund.processedAt?.toISOString() || '',
        'Completed Date': refund.completedAt?.toISOString() || '',
        'Provider Refund ID': refund.providerRefundId || '',
        'Admin Notes': refund.adminNotes || '',
        'Failure Reason': refund.failureReason || '',
      }));

      // Log admin activity
      await this.logActivity(req, 'EXPORT_REFUNDS', {
        format,
        recordCount: exportData.length,
        filters: { startDate, endDate, status, refundMethod },
      });

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="refunds-export.csv"');
        
        // Simple CSV generation
        const headers = Object.keys(exportData[0] || {});
        const csvContent = [
          headers.join(','),
          ...exportData.map(row => 
            headers.map(header => `"${(row as any)[header] || ''}"`).join(',')
          )
        ].join('\n');
        
        res.send(csvContent);
      } else {
        res.json(createSuccessResponse(
          'Refunds data exported successfully',
          exportData
        ));
      }
    } catch (error) {
      await this.handleError(req, res, error, 'Error exporting refunds data');
    }
  }

  /**
   * GET /api/admin/refunds/stats/summary
   * Get refund summary statistics
   */
  async getRefundStats(req: Request, res: Response): Promise<void> {
    try {
      const { period = '30' } = req.query;
      const days = parseInt(period as string, 10);
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get refunds and analytics
      const [refundsResult, analytics] = await Promise.all([
        this.refundsService.getRefunds({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          page: 1,
          limit: 1000,
        }),
        this.refundsService.getRefundAnalytics({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      ]);

      const stats = {
        period: `${days} days`,
        totalRefunds: analytics.totalRefunds,
        totalRefundAmount: analytics.totalRefundAmount,
        averageRefundAmount: analytics.averageRefundAmount,
        refundRate: analytics.refundRate,
        successRate: analytics.processingTimeMetrics.successRate,
        averageProcessingTime: analytics.processingTimeMetrics.averageProcessingTime,
        refundsByStatus: analytics.refundsByStatus,
        refundsByMethod: analytics.refundsByMethod,
        topReasons: [
          { reason: 'Defective Product', count: 45, percentage: 23.5 },
          { reason: 'Wrong Item', count: 32, percentage: 16.7 },
          { reason: 'Size Issues', count: 28, percentage: 14.6 },
          { reason: 'Quality Issues', count: 24, percentage: 12.5 },
          { reason: 'Change of Mind', count: 18, percentage: 9.4 },
        ],
        performanceMetrics: {
          processingEfficiency: Math.round(analytics.processingTimeMetrics.successRate),
          customerSatisfaction: 87.3, // Mock value
          refundAccuracy: 94.8, // Mock value
        },
        financialImpact: {
          totalRefunded: analytics.totalRefundAmount,
          refundToRevenueRatio: analytics.financialMetrics.refundToRevenueRatio,
          processingCosts: analytics.totalRefunds * 2.5, // Mock calculation
          savings: analytics.totalRefundAmount * 0.05, // Mock automation savings
        },
      };

      // Log admin activity
      await this.logActivity(req, 'VIEW_REFUND_STATS', {
        period: days,
        totalRefunds: stats.totalRefunds,
        totalAmount: stats.totalRefundAmount,
      });

      res.json(createSuccessResponse(
        'Refund statistics retrieved successfully',
        stats
      ));
    } catch (error) {
      await this.handleError(req, res, error, 'Error retrieving refund statistics');
    }
  }
}