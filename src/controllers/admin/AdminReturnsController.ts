import { Request, Response } from 'express';
import { BaseAdminController } from './BaseAdminController';
import { ReturnsService } from '../../services/returns/ReturnsService';
import { RefundsService } from '../../services/returns/RefundsService';
import {
  ReturnStatus,
  ReturnReason,
  ReturnCondition,
  ApproveReturnRequest,
  RejectReturnRequest,
  InspectReturnRequest,
  ReturnListQuery,
  createSuccessResponse,
  createErrorResponse,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
} from '../../types';

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
  async getReturnRequests(req: Request, res: Response): Promise<void> {
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
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        state: req.query.state as string,
        priority: req.query.priority as 'high' | 'medium' | 'low',
      };

      const result = await this.returnsService.getReturnRequests(query);

      // Log admin activity
      await this.logActivity(req, 'VIEW_RETURNS', {
        filters: query,
        resultCount: result.returns.length,
      });

      res.json(createSuccessResponse(
        'Return requests retrieved successfully',
        result
      ));
    } catch (error) {
      await this.handleError(req, res, error, 'Error retrieving return requests');
    }
  }

  /**
   * GET /api/admin/returns/:returnId
   * Get detailed return request information
   */
  async getReturnRequest(req: Request, res: Response): Promise<void> {
    try {
      const { returnId } = req.params;

      const returnRequest = await this.returnsService.getReturnRequest(returnId);

      // Log admin activity
      await this.logActivity(req, 'VIEW_RETURN_DETAILS', {
        returnId,
        returnNumber: returnRequest.returnNumber,
        customerId: returnRequest.customerId,
      });

      res.json(createSuccessResponse(
        'Return request details retrieved successfully',
        { returnRequest }
      ));
    } catch (error) {
      await this.handleError(req, res, error, 'Error retrieving return request');
    }
  }

  /**
   * PUT /api/admin/returns/:returnId/status
   * Update return request status
   */
  async updateReturnStatus(req: Request, res: Response): Promise<void> {
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
              returnRequestId: returnId,
              approvalNotes: adminNotes,
              pickupSchedule: estimatedPickupDate ? {
                estimatedDate: new Date(estimatedPickupDate),
                timeSlot: 'morning',
              } : undefined,
            },
            adminId!
          );
          break;

        case ReturnStatus.REJECTED:
          updatedReturn = await this.returnsService.rejectReturnRequest(
            returnId,
            {
              returnRequestId: returnId,
              rejectionReason: adminNotes || 'No reason provided',
            },
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
      await this.logActivity(req, 'UPDATE_RETURN_STATUS', {
        returnId,
        returnNumber: returnRequest.returnNumber,
        oldStatus: returnRequest.status,
        newStatus: status,
        adminNotes,
      });

      res.json(createSuccessResponse(
        'Return status updated successfully',
        updatedReturn
      ));
    } catch (error) {
      await this.handleError(req, res, error, 'Error updating return status');
    }
  }

  /**
   * POST /api/admin/returns/:returnId/approve
   * Approve return request
   */
  async approveReturn(req: Request, res: Response): Promise<void> {
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
        returnRequestId: returnId,
        approvalNotes,
        pickupSchedule: estimatedPickupDate ? {
          estimatedDate: new Date(estimatedPickupDate),
          timeSlot: timeSlot || 'morning',
          instructions,
        } : undefined,
        refundPreApproval,
      };

      const result = await this.returnsService.approveReturnRequest(
        returnId,
        approvalData,
        adminId!
      );

      // Log admin activity
      await this.logActivity(req, 'APPROVE_RETURN', {
        returnId,
        returnNumber: result.returnRequest.returnNumber,
        approvalNotes,
        estimatedPickupDate,
      });

      res.json(createSuccessResponse(
        'Return request approved successfully',
        result
      ));
    } catch (error) {
      await this.handleError(req, res, error, 'Error approving return request');
    }
  }

  /**
   * POST /api/admin/returns/:returnId/reject
   * Reject return request
   */
  async rejectReturn(req: Request, res: Response): Promise<void> {
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
        returnRequestId: returnId,
        rejectionReason,
        detailedExplanation,
        alternativeOptions,
      };

      const result = await this.returnsService.rejectReturnRequest(
        returnId,
        rejectionData,
        adminId!
      );

      // Log admin activity
      await this.logActivity(req, 'REJECT_RETURN', {
        returnId,
        returnNumber: result.returnRequest.returnNumber,
        rejectionReason,
        detailedExplanation,
      });

      res.json(createSuccessResponse(
        'Return request rejected',
        result
      ));
    } catch (error) {
      await this.handleError(req, res, error, 'Error rejecting return request');
    }
  }

  /**
   * POST /api/admin/returns/:returnId/inspect
   * Inspect returned items and update condition
   */
  async inspectReturn(req: Request, res: Response): Promise<void> {
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

        if (!Object.values(ReturnCondition).includes(item.condition)) {
          throw new AppError(
            `Invalid condition: ${item.condition}`,
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR
          );
        }
      }

      const inspectionData: InspectReturnRequest = {
        returnRequestId: returnId,
        items: items.map((item: any) => ({
          returnItemId: item.returnItemId,
          condition: item.condition,
          conditionNotes: item.conditionNotes,
          inspectionPhotos: item.inspectionPhotos,
          restockable: item.restockable ?? (item.condition === ReturnCondition.SELLABLE),
          restockLocation: item.restockLocation,
        })),
        qualityCheckNotes,
        inspectorName: inspectorName || req.user?.firstName,
        recommendRefundAmount,
      };

      const result = await this.returnsService.inspectReturnedItems(
        returnId,
        inspectionData,
        adminId!
      );

      // Log admin activity
      await this.logActivity(req, 'INSPECT_RETURN', {
        returnId,
        returnNumber: result.returnRequest.returnNumber,
        inspectedItems: items.length,
        inspectorName,
        recommendRefundAmount,
      });

      res.json(createSuccessResponse(
        'Return inspection completed successfully',
        result
      ));
    } catch (error) {
      await this.handleError(req, res, error, 'Error inspecting return');
    }
  }

  /**
   * POST /api/admin/returns/:returnId/complete
   * Complete return request processing
   */
  async completeReturn(req: Request, res: Response): Promise<void> {
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
      await this.logActivity(req, 'COMPLETE_RETURN', {
        returnId,
        returnNumber: result.returnRequest.returnNumber,
        completionNotes,
      });

      res.json(createSuccessResponse(
        'Return request completed successfully',
        result
      ));
    } catch (error) {
      await this.handleError(req, res, error, 'Error completing return request');
    }
  }

  /**
   * GET /api/admin/returns/analytics
   * Get returns analytics and insights
   */
  async getReturnAnalytics(req: Request, res: Response): Promise<void> {
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
      await this.logActivity(req, 'VIEW_RETURN_ANALYTICS', {
        period: { startDate, endDate },
        state,
      });

      res.json(createSuccessResponse(
        'Return analytics retrieved successfully',
        analytics
      ));
    } catch (error) {
      await this.handleError(req, res, error, 'Error retrieving return analytics');
    }
  }

  /**
   * GET /api/admin/returns/dashboard
   * Get return management dashboard data
   */
  async getReturnDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { period = '30' } = req.query;
      const days = parseInt(period as string, 10);
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get returns for the period
      const returnsResult = await this.returnsService.getReturnRequests({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        page: 1,
        limit: 1000, // Get all for statistics
      });

      // Get recent pending returns
      const pendingReturns = await this.returnsService.getReturnRequests({
        status: [ReturnStatus.PENDING],
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      // Calculate quick stats
      const totalReturns = returnsResult.returns.length;
      const pendingCount = returnsResult.returns.filter(r => r.status === ReturnStatus.PENDING).length;
      const approvedCount = returnsResult.returns.filter(r => r.status === ReturnStatus.APPROVED).length;
      const completedCount = returnsResult.returns.filter(r => r.status === ReturnStatus.COMPLETED).length;

      // Returns by reason
      const reasonStats = returnsResult.returns.reduce((acc, ret) => {
        acc[ret.reason] = (acc[ret.reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const returnsByReason = Object.entries(reasonStats)
        .map(([reason, count]) => ({
          reason,
          count,
          percentage: totalReturns > 0 ? (count / totalReturns) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // Daily returns for chart
      const dailyReturns = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayReturns = returnsResult.returns.filter(ret => 
          ret.createdAt.toISOString().split('T')[0] === dateStr
        );

        dailyReturns.push({
          date: dateStr,
          count: dayReturns.length,
          value: dayReturns.reduce((sum, ret) => sum + ret.totalAmount, 0) / 100,
        });
      }

      const dashboardData = {
        summary: {
          totalReturns,
          pendingReturns: pendingCount,
          approvedReturns: approvedCount,
          completedReturns: completedCount,
          totalReturnValue: returnsResult.summary?.totalReturnValue || 0,
        },
        trends: {
          dailyReturns,
          returnsByReason,
        },
        recentPendingReturns: pendingReturns.returns.slice(0, 5),
        alerts: [
          ...(pendingCount > 10 ? [{
            type: 'warning',
            message: `${pendingCount} return requests awaiting review`,
            action: 'Review pending returns',
          }] : []),
          ...(returnsByReason[0]?.count > totalReturns * 0.3 ? [{
            type: 'info',
            message: `High number of returns due to ${returnsByReason[0]?.reason}`,
            action: 'Investigate product quality issues',
          }] : []),
        ],
      };

      // Log admin activity
      await this.logActivity(req, 'VIEW_RETURN_DASHBOARD', {
        period: days,
        totalReturns,
        pendingCount,
      });

      res.json(createSuccessResponse(
        'Return dashboard data retrieved successfully',
        dashboardData
      ));
    } catch (error) {
      await this.handleError(req, res, error, 'Error retrieving return dashboard');
    }
  }

  /**
   * POST /api/admin/returns/bulk-update
   * Bulk update return statuses
   */
  async bulkUpdateReturns(req: Request, res: Response): Promise<void> {
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
                  returnRequestId: returnId,
                  approvalNotes: data?.notes || 'Bulk approval',
                },
                adminId!
              );
              break;

            case 'reject':
              result = await this.returnsService.rejectReturnRequest(
                returnId,
                {
                  returnRequestId: returnId,
                  rejectionReason: data?.reason || 'Bulk rejection',
                },
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
            result: result.returnRequest,
          });
        } catch (error) {
          failures.push({
            returnId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Log admin activity
      await this.logActivity(req, 'BULK_UPDATE_RETURNS', {
        action,
        returnIds,
        successCount: results.length,
        failureCount: failures.length,
      });

      res.json(createSuccessResponse(
        `Bulk ${action} completed. ${results.length} successful, ${failures.length} failed.`,
        {
          successful: results,
          failed: failures,
          summary: {
            total: returnIds.length,
            successful: results.length,
            failed: failures.length,
          },
        }
      ));
    } catch (error) {
      await this.handleError(req, res, error, 'Error performing bulk update');
    }
  }

  /**
   * GET /api/admin/returns/export
   * Export returns data
   */
  async exportReturns(req: Request, res: Response): Promise<void> {
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
        status: status ? (status as string).split(',') as ReturnStatus[] : undefined,
        reason: reason ? (reason as string).split(',') as ReturnReason[] : undefined,
        page: 1,
        limit: 10000, // Large limit for export
      });

      // Format data for export
      const exportData = returnsResult.returns.map(ret => ({
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
      await this.logActivity(req, 'EXPORT_RETURNS', {
        format,
        recordCount: exportData.length,
        filters: { startDate, endDate, status, reason },
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
        res.json(createSuccessResponse(
          'Returns data exported successfully',
          exportData
        ));
      }
    } catch (error) {
      await this.handleError(req, res, error, 'Error exporting returns data');
    }
  }
}