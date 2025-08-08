import { Request, Response } from 'express';

// Extend Request to include user property
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    phoneNumber: string;
    email?: string;
    firstName: string;
    lastName: string;
    role: 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';
    isVerified: boolean;
    sessionId?: string;
  };
}

import { BaseAdminController } from '../BaseAdminController';
import { ReturnsService } from '../../services/returns/ReturnsService';
import { RefundsService } from '../../services/returns/RefundsService';
import {
  createSuccessResponse,
  createErrorResponse,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
} from '../../types';

// Local type definitions to avoid conflicts with service types
enum ReturnStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED', 
  REJECTED = 'REJECTED',
  IN_TRANSIT = 'IN_TRANSIT',
  RECEIVED = 'RECEIVED',
  INSPECTED = 'INSPECTED', 
  PROCESSED = 'PROCESSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}
type ReturnReason = 'DEFECTIVE' | 'WRONG_ITEM' | 'NOT_AS_DESCRIBED' | 'DAMAGED' | 'SIZE_ISSUE' | 'QUALITY_ISSUE' | 'CHANGE_OF_MIND' | 'OTHER';
type ReturnCondition = 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED' | 'UNUSABLE';

interface ReturnListQuery {
  page?: number;
  limit?: number;
  status?: string[];
  reason?: ReturnReason[];
  customerId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  state?: string;
  priority?: string;
}

interface ApproveReturnRequest {
  approvalNotes?: string;
  pickupSchedule?: {
    estimatedDate: Date;
    timeSlot: string;
    instructions?: string;
  };
}

interface RejectReturnRequest {
  rejectionReason: string;
  detailedExplanation?: string;
}

interface InspectReturnRequest {
  items: {
    itemId: string;
    condition: ReturnCondition;
    conditionNotes?: string;
    restockable: boolean;
    restockLocation?: string;
    inspectionPhotos?: string[];
  }[];
  qualityCheckNotes?: string;
}

export class AdminReturnsController extends BaseAdminController {
  private returnsService: ReturnsService;
  private refundsService: RefundsService;

  constructor(
    returnsService?: ReturnsService,
    refundsService?: RefundsService
  ) {
    super();
    this.returnsService = returnsService || new ReturnsService();
    this.refundsService = refundsService || new RefundsService();
  }

  /**
   * GET /api/admin/returns
   * List all return requests with filtering and pagination
   */
  async getReturnRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const query: ReturnListQuery = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        status: req.query.status ? (req.query.status as string).split(',') as ReturnStatus[] : undefined,
        reason: req.query.reason ? (req.query.reason as string).split(',') as ReturnReason[] : undefined,
        customerId: req.query.customerId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as 'createdAt' | 'status' | 'amount' | 'estimatedPickupDate',
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        state: req.query.state as string,
        priority: req.query.priority as 'high' | 'medium' | 'low',
      };

      const result = await this.returnsService.getReturnRequests(query as any);

      // Log admin activity
      this.logAdminActivity(req, 'analytics_access', 'view_returns', {
        description: 'Viewed return requests list with filters',
        severity: 'low',
        resourceType: 'returns',
        metadata: {
          filters: query,
          resultCount: (result as any)?.data?.length || (result as any)?.returns?.length || 0,
        },
      });

      this.sendAdminSuccess(res, result, 'Return requests retrieved successfully', 200, {
        activity: 'analytics_access',
        includeMetrics: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * GET /api/admin/returns/:returnId
   * Get detailed return request information
   */
  async getReturnRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { returnId } = req.params;

      const returnRequest = await this.returnsService.getReturnRequest(returnId);

      // Log admin activity
      this.logAdminActivity(req, 'analytics_access', 'view_return_details', {
        description: `Viewed return request details for ${returnId}`,
        severity: 'low',
        resourceType: 'return',
        resourceId: returnId,
        metadata: {
          returnId,
          returnNumber: returnRequest.returnNumber,
          customerId: returnRequest.customerId,
        },
      });

      this.sendAdminSuccess(res, { returnRequest }, 'Return request details retrieved successfully', 200, {
        activity: 'analytics_access',
        includeMetrics: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * PUT /api/admin/returns/:returnId/status
   * Update return request status
   */
  async updateReturnStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { returnId } = req.params;
      const { status, adminNotes, estimatedPickupDate, returnTrackingNumber } = req.body;
      const adminId = req.user?.id;

      if (!Object.values(ReturnStatus).includes(status)) {
        throw new AppError(
          'Invalid return status',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const returnRequest = await this.returnsService.getReturnRequest(returnId);

      // Update status based on the requested status
      let updatedReturn;
      switch (status) {
        case ReturnStatus.APPROVED:
          updatedReturn = await this.returnsService.approveReturnRequest(
            returnId,
            {
              returnId,
              adminId: adminId!,
              approvalNotes: adminNotes,
            } as any,
            adminId!
          );
          break;

        case ReturnStatus.REJECTED:
          updatedReturn = await this.returnsService.rejectReturnRequest(
            returnId,
            {
              returnId,
              adminId: adminId!,
              rejectionReason: adminNotes || 'No reason provided',
            } as any,
            adminId!
          );
          break;

        case ReturnStatus.COMPLETED:
          updatedReturn = await this.returnsService.completeReturnRequest(
            returnId,
            adminId!,
            adminNotes
          );
          break;

        default:
          throw new AppError(
            'Status update not supported through this endpoint',
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR
          );
      }

      // Log admin activity
      this.logAdminActivity(req, 'order_management', 'update_return_status', {
        description: `Updated return ${returnId} status from ${returnRequest.status} to ${status}`,
        severity: 'medium',
        resourceType: 'return',
        resourceId: returnId,
        metadata: {
          returnId,
          returnNumber: returnRequest.returnNumber,
          oldStatus: returnRequest.status,
          newStatus: status,
          adminNotes,
        },
      });

      this.sendAdminSuccess(res, updatedReturn, 'Return status updated successfully', 200, {
        activity: 'order_management',
        includeMetrics: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * POST /api/admin/returns/:returnId/approve
   * Approve return request
   */
  async approveReturn(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { returnId } = req.params;
      const {
        approvalNotes,
        estimatedPickupDate,
        timeSlot,
        instructions,
        refundPreApproval,
      } = req.body;
      const adminId = req.user?.id;

      const approvalData: ApproveReturnRequest = {
        approvalNotes,
        pickupSchedule: estimatedPickupDate ? {
          estimatedDate: new Date(estimatedPickupDate),
          timeSlot: timeSlot || 'morning',
          instructions,
        } : undefined,
      };

      const result = await this.returnsService.approveReturnRequest(
        returnId,
        approvalData as any,
        adminId!
      );

      // Log admin activity
      this.logAdminActivity(req, 'order_management', 'approve_return', {
        description: `Approved return request ${returnId}`,
        severity: 'high',
        resourceType: 'return',
        resourceId: returnId,
        metadata: {
          returnId,
          returnNumber: (result as any).data?.returnNumber || (result as any).returnNumber || 'N/A',
          approvalNotes,
          estimatedPickupDate,
        },
      });

      this.sendAdminSuccess(res, result, 'Return request approved successfully', 200, {
        activity: 'order_management',
        includeMetrics: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * POST /api/admin/returns/:returnId/reject
   * Reject return request
   */
  async rejectReturn(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { returnId } = req.params;
      const { rejectionReason, detailedExplanation, alternativeOptions } = req.body;
      const adminId = req.user?.id;

      if (!rejectionReason) {
        throw new AppError(
          'Rejection reason is required',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const rejectionData: RejectReturnRequest = {
        rejectionReason,
      };

      const result = await this.returnsService.rejectReturnRequest(
        returnId,
        rejectionData as any,
        adminId!
      );

      // Log admin activity
      this.logAdminActivity(req, 'order_management', 'reject_return', {
        description: `Rejected return request ${returnId}`,
        severity: 'high',
        resourceType: 'return',
        resourceId: returnId,
        metadata: {
          returnId,
          returnNumber: (result as any).data?.returnNumber || (result as any).returnNumber || 'N/A',
          rejectionReason,
          detailedExplanation,
        },
      });

      this.sendAdminSuccess(res, result, 'Return request rejected', 200, {
        activity: 'order_management',
        includeMetrics: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * POST /api/admin/returns/:returnId/inspect
   * Inspect returned items and update condition
   */
  async inspectReturn(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { returnId } = req.params;
      const {
        items,
        qualityCheckNotes,
        inspectorName,
        recommendRefundAmount,
      } = req.body;
      const adminId = req.user?.id;

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new AppError(
          'Inspection items are required',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Validate inspection items
      for (const item of items) {
        if (!item.returnItemId || !item.condition) {
          throw new AppError(
            'Return item ID and condition are required for all items',
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR
          );
        }

        const validConditions = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED', 'UNUSABLE'];
        if (!validConditions.includes(item.condition)) {
          throw new AppError(
            `Invalid condition: ${item.condition}`,
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR
          );
        }
      }

      const inspectionData = {
        returnId,
        inspectorId: adminId!,
        items: items.map((item: any) => ({
          itemId: item.returnItemId,
          condition: item.condition,
          conditionNotes: item.conditionNotes,
          inspectionPhotos: item.inspectionPhotos,
          restockable: item.restockable ?? (item.condition === 'NEW'),
          restockLocation: item.restockLocation,
        })),
      };

      const result = await this.returnsService.inspectReturnedItems(
        returnId,
        inspectionData as any,
        adminId!
      );

      // Log admin activity
      this.logAdminActivity(req, 'order_management', 'inspect_return', {
        description: `Inspected returned items for return ${returnId}`,
        severity: 'medium',
        resourceType: 'return',
        resourceId: returnId,
        metadata: {
          returnId,
          returnNumber: (result as any).data?.returnNumber || (result as any).returnNumber || 'N/A',
          inspectedItems: items.length,
          inspectorName,
          recommendRefundAmount,
        },
      });

      this.sendAdminSuccess(res, result, 'Return inspection completed successfully', 200, {
        activity: 'order_management',
        includeMetrics: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * POST /api/admin/returns/:returnId/complete
   * Complete return request processing
   */
  async completeReturn(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { returnId } = req.params;
      const { completionNotes } = req.body;
      const adminId = req.user?.id;

      const result = await this.returnsService.completeReturnRequest(
        returnId,
        adminId!,
        completionNotes
      );

      // Log admin activity
      this.logAdminActivity(req, 'order_management', 'complete_return', {
        description: `Completed return request ${returnId}`,
        severity: 'medium',
        resourceType: 'return',
        resourceId: returnId,
        metadata: {
          returnId,
          returnNumber: (result as any).data?.returnNumber || (result as any).returnNumber || 'N/A',
          completionNotes,
        },
      });

      this.sendAdminSuccess(res, result, 'Return request completed successfully', 200, {
        activity: 'order_management',
        includeMetrics: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * GET /api/admin/returns/analytics
   * Get returns analytics and insights
   */
  async getReturnAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        startDate,
        endDate,
        state,
      } = req.query;

      const analytics = await this.returnsService.getReturnAnalytics({
        startDate: startDate as string,
        endDate: endDate as string,
        state: state as string,
      });

      // Log admin activity
      this.logAdminActivity(req, 'analytics_access', 'view_return_analytics', {
        description: 'Viewed return analytics',
        severity: 'low',
        resourceType: 'analytics',
        metadata: {
          period: { startDate, endDate },
          state,
        },
      });

      this.sendAdminSuccess(res, analytics, 'Return analytics retrieved successfully', 200, {
        activity: 'analytics_access',
        includeMetrics: true,
        includeCurrencyInfo: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * GET /api/admin/returns/dashboard
   * Get return management dashboard data
   */
  async getReturnDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { period = '30' } = req.query;
      const days = parseInt(period as string, 10);
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get returns for the period
      const returnsResult = await this.returnsService.getReturnRequests({
        startDate: startDate,
        endDate: endDate,
        page: 1,
        limit: 1000, // Get all for statistics
      } as any) as any;

      // Get recent pending returns
      const pendingReturns = await this.returnsService.getReturnRequests({
        status: [ReturnStatus.PENDING],
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      } as any) as any;

      // Calculate quick stats
      const returns = returnsResult.data?.returns || [];
      const totalReturns = returns.length;
      const pendingCount = returns.filter((r: any) => r.status === ReturnStatus.PENDING).length;
      const approvedCount = returns.filter((r: any) => r.status === ReturnStatus.APPROVED).length;
      const completedCount = returns.filter((r: any) => r.status === ReturnStatus.COMPLETED).length;

      // Returns by reason
      const reasonStats = returns.reduce((acc: any, ret: any) => {
        acc[ret.reason] = (acc[ret.reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const returnsByReason = Object.entries(reasonStats)
        .map(([reason, count]) => ({
          reason,
          count: count as number,
          percentage: totalReturns > 0 ? ((count as number) / totalReturns) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // Daily returns for chart
      const dailyReturns = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayReturns = returns.filter((ret: any) => 
          new Date(ret.createdAt).toISOString().split('T')[0] === dateStr
        );

        dailyReturns.push({
          date: dateStr,
          count: dayReturns.length,
          value: dayReturns.reduce((sum: number, ret: any) => sum + (ret.totalAmount || 0), 0) / 100,
        });
      }

      const dashboardData = {
        summary: {
          totalReturns,
          pendingReturns: pendingCount,
          approvedReturns: approvedCount,
          completedReturns: completedCount,
          totalReturnValue: returnsResult.data?.summary?.totalReturnValue || 0,
        },
        trends: {
          dailyReturns,
          returnsByReason,
        },
        recentPendingReturns: (pendingReturns.data?.returns || []).slice(0, 5),
        alerts: [
          ...(pendingCount > 10 ? [{
            type: 'warning',
            message: `${pendingCount} return requests awaiting review`,
            action: 'Review pending returns',
          }] : []),
          ...((returnsByReason[0]?.count || 0) > totalReturns * 0.3 ? [{
            type: 'info',
            message: `High number of returns due to ${returnsByReason[0]?.reason}`,
            action: 'Investigate product quality issues',
          }] : []),
        ],
      };

      // Log admin activity
      this.logAdminActivity(req, 'analytics_access', 'view_return_dashboard', {
        description: `Viewed return dashboard for ${days} days`,
        severity: 'low',
        resourceType: 'dashboard',
        metadata: {
          period: days,
          totalReturns,
          pendingCount,
        },
      });

      this.sendAdminSuccess(res, dashboardData, 'Return dashboard data retrieved successfully', 200, {
        activity: 'analytics_access',
        includeMetrics: true,
        includeCurrencyInfo: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * POST /api/admin/returns/bulk-update
   * Bulk update return statuses
   */
  async bulkUpdateReturns(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { returnIds, action, data } = req.body;
      const adminId = req.user?.id;

      if (!returnIds || !Array.isArray(returnIds) || returnIds.length === 0) {
        throw new AppError(
          'Return IDs are required',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      if (!action) {
        throw new AppError(
          'Action is required',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const results = [];
      const failures = [];

      for (const returnId of returnIds) {
        try {
          let result;
          
          switch (action) {
            case 'approve':
              result = await this.returnsService.approveReturnRequest(
                returnId,
                {
                  approvalNotes: data?.notes || 'Bulk approval',
                } as any,
                adminId!
              );
              break;

            case 'reject':
              result = await this.returnsService.rejectReturnRequest(
                returnId,
                {
                  rejectionReason: data?.reason || 'Bulk rejection',
                } as any,
                adminId!
              );
              break;

            default:
              throw new AppError(
                `Unsupported bulk action: ${action}`,
                HTTP_STATUS.BAD_REQUEST,
                ERROR_CODES.VALIDATION_ERROR
              );
          }

          results.push({
            returnId,
            success: true,
            result: result.data || result,
          });
        } catch (error) {
          failures.push({
            returnId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Log admin activity
      this.logAdminActivity(req, 'bulk_operations', 'bulk_update_returns', {
        description: `Bulk ${action} on ${returnIds.length} returns`,
        severity: 'high',
        resourceType: 'returns',
        metadata: {
          action,
          returnIds,
          successCount: results.length,
          failureCount: failures.length,
        },
      });

      this.sendAdminSuccess(res, {
        successful: results,
        failed: failures,
        summary: {
          total: returnIds.length,
          successful: results.length,
          failed: failures.length,
        }
      }, `Bulk ${action} completed. ${results.length} successful, ${failures.length} failed.`, 200, {
        activity: 'bulk_operations',
        includeMetrics: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * GET /api/admin/returns/export
   * Export returns data
   */
  async exportReturns(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        format = 'csv',
        startDate,
        endDate,
        status,
        reason,
      } = req.query;

      // Get all returns matching criteria
      const returnsResult = await this.returnsService.getReturnRequests({
        startDate: startDate as string,
        endDate: endDate as string,
        status: status ? (status as string).split(',') as any : undefined,
        reason: reason ? (reason as string).split(',') as any : undefined,
        page: 1,
        limit: 10000, // Large limit for export
      } as any) as any;

      // Format data for export
      const returns = returnsResult.data?.returns || [];
      const exportData = returns.map((ret: any) => ({
        'Return Number': ret.returnNumber,
        'Order Number': ret.order?.orderNumber,
        'Customer': `${ret.customer?.firstName} ${ret.customer?.lastName}`,
        'Email': ret.customer?.email,
        'Phone': ret.customer?.phoneNumber,
        'Status': ret.status,
        'Reason': ret.reason,
        'Amount': (ret.totalAmount / 100).toFixed(2),
        'Created Date': ret.createdAt.toISOString(),
        'Updated Date': ret.updatedAt.toISOString(),
        'Description': ret.description,
        'Admin Notes': ret.adminNotes,
      }));

      // Log admin activity
      this.logAdminActivity(req, 'data_export', 'export_returns', {
        description: `Exported ${exportData.length} return records`,
        severity: 'medium',
        resourceType: 'returns',
        metadata: {
          format,
          recordCount: exportData.length,
          filters: { startDate, endDate, status, reason },
        },
      });

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="returns-export.csv"');
        
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
        this.sendAdminSuccess(res, exportData, 'Returns data exported successfully', 200, {
          activity: 'data_export',
          includeMetrics: true
        });
      }
    } catch (error) {
      this.handleError(error, req, res);
    }
  }
}