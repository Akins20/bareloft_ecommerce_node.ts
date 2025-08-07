/**
 * Customer Returns Controller
 * Handles customer-facing return request operations
 * Nigerian e-commerce platform optimized
 */

import { Request, Response } from 'express';
import { BaseController } from '../BaseController';
import { CustomerReturnsService } from '../../services/returns/CustomerReturnsService';
import { ReturnPolicyService } from '../../services/returns/ReturnPolicyService';
import { ReturnShippingService } from '../../services/returns/ReturnShippingService';
import { CustomerSupportService } from '../../services/support/CustomerSupportService';
import { NotificationService } from '../../services/notification/NotificationService';
import { 
  CreateReturnRequest, 
  ReturnListQuery,
  ReturnEligibilityCheck,
  ReturnStatus,
  ReturnReason 
} from '../../types/return.types';
import { createSuccessResponse, createErrorResponse } from '../../utils/response/responseHelpers';
import { HTTP_STATUS } from '../../constants/httpStatus';
import { logger } from '../../utils/logger/winston';

export class CustomerReturnsController extends BaseController {
  private customerReturnsService: CustomerReturnsService;
  private returnPolicyService: ReturnPolicyService;
  private returnShippingService: ReturnShippingService;
  private customerSupportService: CustomerSupportService;
  private notificationService: NotificationService;

  constructor() {
    super();
    this.customerReturnsService = new CustomerReturnsService();
    this.returnPolicyService = new ReturnPolicyService();
    this.returnShippingService = new ReturnShippingService();
    this.customerSupportService = new CustomerSupportService();
    this.notificationService = new NotificationService();
  }

  // ==================== RETURN REQUEST MANAGEMENT ====================

  /**
   * Submit new return request
   */
  async submitReturnRequest(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.user!.id;
      const returnRequestData: CreateReturnRequest = req.body;

      logger.info('Customer return request submission', {
        customerId,
        orderId: returnRequestData.orderId,
        itemCount: returnRequestData.items.length,
        reason: returnRequestData.reason
      });

      // Check return eligibility
      const eligibility = await this.customerReturnsService.checkReturnEligibility({
        orderId: returnRequestData.orderId,
        items: returnRequestData.items.map(item => ({
          orderItemId: item.orderItemId,
          quantityToReturn: item.quantityToReturn
        }))
      }, customerId);

      if (!eligibility.isEligible) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          createErrorResponse(
            'RETURN_NOT_ELIGIBLE',
            eligibility.reason || 'This order is not eligible for return',
            { eligibility }
          )
        );
        return;
      }

      // Create return request
      const returnRequest = await this.customerReturnsService.createReturnRequest(
        returnRequestData,
        customerId
      );

      // Send notifications
      await this.notificationService.sendReturnRequestCreatedNotification(
        customerId,
        returnRequest
      );

      // Log successful creation
      logger.info('Return request created successfully', {
        customerId,
        returnRequestId: returnRequest.id,
        returnNumber: returnRequest.returnNumber
      });

      res.status(HTTP_STATUS.CREATED).json(
        createSuccessResponse(
          'Return request submitted successfully',
          {
            returnRequest,
            estimatedProcessingTime: '3-5 business days',
            nextSteps: [
              'Package items in original packaging',
              'Wait for pickup confirmation',
              'Track return status in your dashboard'
            ]
          }
        )
      );

    } catch (error) {
      logger.error('Error submitting return request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId: req.user?.id,
        requestBody: req.body
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'RETURN_REQUEST_FAILED',
          'Failed to submit return request. Please try again later.'
        )
      );
    }
  }

  /**
   * Get customer's return requests
   */
  async getMyReturns(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.user!.id;
      const query: ReturnListQuery = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        status: req.query.status ? [req.query.status as ReturnStatus] : undefined,
        reason: req.query.reason ? [req.query.reason as ReturnReason] : undefined,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        search: req.query.search as string,
        sortBy: (req.query.sortBy as any) || 'createdAt',
        sortOrder: (req.query.sortOrder as any) || 'desc'
      };

      const result = await this.customerReturnsService.getCustomerReturns(
        customerId,
        query
      );

      res.json(
        createSuccessResponse(
          'Returns retrieved successfully',
          {
            returns: result.returns,
            pagination: result.pagination,
            summary: result.summary
          }
        )
      );

    } catch (error) {
      logger.error('Error retrieving customer returns', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId: req.user?.id,
        query: req.query
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'RETURNS_RETRIEVAL_FAILED',
          'Failed to retrieve return requests. Please try again later.'
        )
      );
    }
  }

  /**
   * Get specific return details
   */
  async getReturnDetails(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.user!.id;
      const { returnId } = req.params;

      const returnRequest = await this.customerReturnsService.getReturnDetails(
        returnId,
        customerId
      );

      if (!returnRequest) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          createErrorResponse(
            'RETURN_NOT_FOUND',
            'Return request not found or you do not have permission to view it'
          )
        );
        return;
      }

      res.json(
        createSuccessResponse(
          'Return details retrieved successfully',
          { returnRequest }
        )
      );

    } catch (error) {
      logger.error('Error retrieving return details', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId: req.user?.id,
        returnId: req.params.returnId
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'RETURN_DETAILS_FAILED',
          'Failed to retrieve return details. Please try again later.'
        )
      );
    }
  }

  /**
   * Cancel pending return request
   */
  async cancelReturnRequest(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.user!.id;
      const { returnId } = req.params;
      const { reason } = req.body;

      const result = await this.customerReturnsService.cancelReturnRequest(
        returnId,
        customerId,
        reason
      );

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          createErrorResponse(
            'CANCEL_FAILED',
            result.message || 'Failed to cancel return request'
          )
        );
        return;
      }

      // Send notification
      await this.notificationService.sendReturnRequestCancelledNotification(
        customerId,
        result.returnRequest!
      );

      res.json(
        createSuccessResponse(
          'Return request cancelled successfully',
          { returnRequest: result.returnRequest }
        )
      );

    } catch (error) {
      logger.error('Error cancelling return request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId: req.user?.id,
        returnId: req.params.returnId
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'CANCEL_REQUEST_FAILED',
          'Failed to cancel return request. Please try again later.'
        )
      );
    }
  }

  /**
   * Upload return photos
   */
  async uploadReturnPhotos(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.user!.id;
      const { returnId } = req.params;
      const { description } = req.body;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          createErrorResponse(
            'NO_FILES_UPLOADED',
            'Please select at least one photo to upload'
          )
        );
        return;
      }

      const result = await this.customerReturnsService.uploadReturnPhotos(
        returnId,
        customerId,
        files,
        description
      );

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          createErrorResponse(
            'PHOTO_UPLOAD_FAILED',
            result.message || 'Failed to upload photos'
          )
        );
        return;
      }

      res.json(
        createSuccessResponse(
          'Photos uploaded successfully',
          { 
            returnRequest: result.returnRequest,
            uploadedPhotos: result.uploadedPhotos
          }
        )
      );

    } catch (error) {
      logger.error('Error uploading return photos', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId: req.user?.id,
        returnId: req.params.returnId
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'PHOTO_UPLOAD_ERROR',
          'Failed to upload photos. Please try again later.'
        )
      );
    }
  }

  /**
   * Check return eligibility for order
   */
  async checkReturnEligibility(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.user!.id;
      const { orderId } = req.params;
      const items = req.query.items ? JSON.parse(req.query.items as string) : undefined;

      const eligibilityCheck: ReturnEligibilityCheck = {
        orderId,
        items
      };

      const eligibility = await this.customerReturnsService.checkReturnEligibility(
        eligibilityCheck,
        customerId
      );

      res.json(
        createSuccessResponse(
          'Return eligibility checked successfully',
          { eligibility }
        )
      );

    } catch (error) {
      logger.error('Error checking return eligibility', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId: req.user?.id,
        orderId: req.params.orderId
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'ELIGIBILITY_CHECK_FAILED',
          'Failed to check return eligibility. Please try again later.'
        )
      );
    }
  }

  // ==================== DASHBOARD & ANALYTICS ====================

  /**
   * Get customer return dashboard
   */
  async getReturnDashboard(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.user!.id;
      const period = parseInt(req.query.period as string) || 90;

      const dashboard = await this.customerReturnsService.getCustomerReturnDashboard(
        customerId,
        period
      );

      res.json(
        createSuccessResponse(
          'Return dashboard retrieved successfully',
          { dashboard }
        )
      );

    } catch (error) {
      logger.error('Error retrieving return dashboard', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId: req.user?.id
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'DASHBOARD_FAILED',
          'Failed to retrieve return dashboard. Please try again later.'
        )
      );
    }
  }

  /**
   * Get return timeline
   */
  async getReturnTimeline(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.user!.id;
      const { returnId } = req.params;

      const timeline = await this.customerReturnsService.getReturnTimeline(
        returnId,
        customerId
      );

      if (!timeline) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          createErrorResponse(
            'RETURN_NOT_FOUND',
            'Return request not found or you do not have permission to view it'
          )
        );
        return;
      }

      res.json(
        createSuccessResponse(
          'Return timeline retrieved successfully',
          { timeline }
        )
      );

    } catch (error) {
      logger.error('Error retrieving return timeline', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId: req.user?.id,
        returnId: req.params.returnId
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'TIMELINE_FAILED',
          'Failed to retrieve return timeline. Please try again later.'
        )
      );
    }
  }

  /**
   * Get refund estimate
   */
  async getRefundEstimate(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.user!.id;
      const { returnId } = req.params;

      const estimate = await this.customerReturnsService.getRefundEstimate(
        returnId,
        customerId
      );

      if (!estimate) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          createErrorResponse(
            'RETURN_NOT_FOUND',
            'Return request not found or you do not have permission to view it'
          )
        );
        return;
      }

      res.json(
        createSuccessResponse(
          'Refund estimate retrieved successfully',
          { estimate }
        )
      );

    } catch (error) {
      logger.error('Error retrieving refund estimate', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId: req.user?.id,
        returnId: req.params.returnId
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'ESTIMATE_FAILED',
          'Failed to retrieve refund estimate. Please try again later.'
        )
      );
    }
  }

  // ==================== POLICY & INFORMATION ====================

  /**
   * Get return policy information
   */
  async getReturnPolicy(req: Request, res: Response): Promise<void> {
    try {
      const policy = await this.returnPolicyService.getReturnPolicy();

      res.json(
        createSuccessResponse(
          'Return policy retrieved successfully',
          { policy }
        )
      );

    } catch (error) {
      logger.error('Error retrieving return policy', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'POLICY_FAILED',
          'Failed to retrieve return policy. Please try again later.'
        )
      );
    }
  }

  /**
   * Get return FAQ
   */
  async getReturnFAQ(req: Request, res: Response): Promise<void> {
    try {
      const faq = await this.returnPolicyService.getReturnFAQ();

      res.json(
        createSuccessResponse(
          'Return FAQ retrieved successfully',
          { faq }
        )
      );

    } catch (error) {
      logger.error('Error retrieving return FAQ', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'FAQ_FAILED',
          'Failed to retrieve return FAQ. Please try again later.'
        )
      );
    }
  }

  /**
   * Get return reasons and descriptions
   */
  async getReturnReasons(req: Request, res: Response): Promise<void> {
    try {
      const reasons = await this.returnPolicyService.getReturnReasons();

      res.json(
        createSuccessResponse(
          'Return reasons retrieved successfully',
          { reasons }
        )
      );

    } catch (error) {
      logger.error('Error retrieving return reasons', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'REASONS_FAILED',
          'Failed to retrieve return reasons. Please try again later.'
        )
      );
    }
  }

  // ==================== SHIPPING & PICKUP ====================

  /**
   * Schedule return pickup
   */
  async scheduleReturnPickup(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.user!.id;
      const { returnId } = req.params;
      const { preferredDate, timeSlot, specialInstructions, contactPhone } = req.body;

      const result = await this.returnShippingService.schedulePickup(
        returnId,
        customerId,
        {
          preferredDate: new Date(preferredDate),
          timeSlot,
          specialInstructions,
          contactPhone
        }
      );

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          createErrorResponse(
            'PICKUP_SCHEDULING_FAILED',
            result.message || 'Failed to schedule pickup'
          )
        );
        return;
      }

      res.json(
        createSuccessResponse(
          'Pickup scheduled successfully',
          { 
            pickupSchedule: result.pickupSchedule,
            confirmationNumber: result.confirmationNumber
          }
        )
      );

    } catch (error) {
      logger.error('Error scheduling pickup', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId: req.user?.id,
        returnId: req.params.returnId
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'PICKUP_SCHEDULING_ERROR',
          'Failed to schedule pickup. Please try again later.'
        )
      );
    }
  }

  /**
   * Get pickup/drop-off locations
   */
  async getPickupLocations(req: Request, res: Response): Promise<void> {
    try {
      const { state, city } = req.query;

      const locations = await this.returnShippingService.getPickupLocations({
        state: state as string,
        city: city as string
      });

      res.json(
        createSuccessResponse(
          'Pickup locations retrieved successfully',
          { locations }
        )
      );

    } catch (error) {
      logger.error('Error retrieving pickup locations', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: req.query
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'LOCATIONS_FAILED',
          'Failed to retrieve pickup locations. Please try again later.'
        )
      );
    }
  }

  /**
   * Track return shipment
   */
  async trackReturnShipment(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.user!.id;
      const { returnId } = req.params;

      const tracking = await this.returnShippingService.trackReturnShipment(
        returnId,
        customerId
      );

      if (!tracking) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          createErrorResponse(
            'TRACKING_NOT_FOUND',
            'Tracking information not available for this return'
          )
        );
        return;
      }

      res.json(
        createSuccessResponse(
          'Return tracking retrieved successfully',
          { tracking }
        )
      );

    } catch (error) {
      logger.error('Error tracking return shipment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId: req.user?.id,
        returnId: req.params.returnId
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'TRACKING_FAILED',
          'Failed to retrieve tracking information. Please try again later.'
        )
      );
    }
  }

  /**
   * Get return shipping cost estimate
   */
  async getReturnShippingCost(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.user!.id;
      const { orderId } = req.params;
      const { returnMethod, pickupState } = req.query;

      const costEstimate = await this.returnShippingService.getShippingCostEstimate(
        orderId,
        customerId,
        {
          returnMethod: returnMethod as string,
          pickupState: pickupState as string
        }
      );

      res.json(
        createSuccessResponse(
          'Shipping cost estimate retrieved successfully',
          { costEstimate }
        )
      );

    } catch (error) {
      logger.error('Error retrieving shipping cost estimate', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId: req.user?.id,
        orderId: req.params.orderId
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'SHIPPING_COST_FAILED',
          'Failed to retrieve shipping cost estimate. Please try again later.'
        )
      );
    }
  }

  // ==================== CUSTOMER SUPPORT INTEGRATION ====================

  /**
   * Create support ticket for return issue
   */
  async createReturnSupportTicket(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.user!.id;
      const { returnId } = req.params;
      const { subject, description, priority, category } = req.body;

      const ticket = await this.customerSupportService.createReturnSupportTicket(
        returnId,
        customerId,
        {
          subject,
          description,
          priority: priority || 'medium',
          category: category || 'return_issue'
        }
      );

      res.status(HTTP_STATUS.CREATED).json(
        createSuccessResponse(
          'Support ticket created successfully',
          { ticket }
        )
      );

    } catch (error) {
      logger.error('Error creating return support ticket', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId: req.user?.id,
        returnId: req.params.returnId
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'TICKET_CREATION_FAILED',
          'Failed to create support ticket. Please try again later.'
        )
      );
    }
  }

  /**
   * Get AI-powered help suggestions
   */
  async getReturnHelpSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.user!.id;
      const { issue, returnId } = req.query;

      const suggestions = await this.customerSupportService.getReturnHelpSuggestions(
        issue as string,
        {
          customerId,
          returnId: returnId as string
        }
      );

      res.json(
        createSuccessResponse(
          'Help suggestions retrieved successfully',
          { suggestions }
        )
      );

    } catch (error) {
      logger.error('Error retrieving help suggestions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId: req.user?.id,
        query: req.query
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'SUGGESTIONS_FAILED',
          'Failed to retrieve help suggestions. Please try again later.'
        )
      );
    }
  }

  // ==================== ANALYTICS & INSIGHTS ====================

  /**
   * Get customer's personal return analytics
   */
  async getMyReturnAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.user!.id;
      const period = parseInt(req.query.period as string) || 365;

      const analytics = await this.customerReturnsService.getCustomerReturnAnalytics(
        customerId,
        period
      );

      res.json(
        createSuccessResponse(
          'Return analytics retrieved successfully',
          { analytics }
        )
      );

    } catch (error) {
      logger.error('Error retrieving return analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId: req.user?.id
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'ANALYTICS_FAILED',
          'Failed to retrieve return analytics. Please try again later.'
        )
      );
    }
  }

  /**
   * Get current processing time estimates
   */
  async getProcessingEstimates(req: Request, res: Response): Promise<void> {
    try {
      const { state, returnMethod } = req.query;

      const estimates = await this.customerReturnsService.getProcessingEstimates({
        state: state as string,
        returnMethod: returnMethod as string
      });

      res.json(
        createSuccessResponse(
          'Processing estimates retrieved successfully',
          { estimates }
        )
      );

    } catch (error) {
      logger.error('Error retrieving processing estimates', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'ESTIMATES_FAILED',
          'Failed to retrieve processing estimates. Please try again later.'
        )
      );
    }
  }

  /**
   * Get seasonal return information
   */
  async getSeasonalReturnInfo(req: Request, res: Response): Promise<void> {
    try {
      const seasonalInfo = await this.customerReturnsService.getSeasonalReturnInfo();

      res.json(
        createSuccessResponse(
          'Seasonal return information retrieved successfully',
          { seasonalInfo }
        )
      );

    } catch (error) {
      logger.error('Error retrieving seasonal return information', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'SEASONAL_INFO_FAILED',
          'Failed to retrieve seasonal return information. Please try again later.'
        )
      );
    }
  }
}