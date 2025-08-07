import { BaseAdminController } from "../BaseAdminController";
import { Request, Response } from "express";
import { HTTP_STATUS, ERROR_CODES, AppError } from "../../types";

// Type definitions
interface ShipmentRateRequest {
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  packageWeight: number;
  packageDimensions: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
  declaredValue: number;
  serviceType?: string;
}

interface CreateShipmentRequest {
  orderId: string;
  carrierId: string;
  serviceType: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  packageWeight: number;
  declaredValue: number;
}

interface BulkTrackingRequest {
  trackingNumbers: string[];
  includeEvents: boolean;
  includeDeliveryAttempts: boolean;
}

interface DeliverySchedule {
  shipmentId: string;
  scheduledDate: Date;
  timeWindow: string;
  driverName?: string;
  driverPhone?: string;
  vehicleInfo?: string;
  specialInstructions?: string;
}

// Helper functions
const createSuccessResponse = (data: any, message: string, metadata?: any) => ({
  success: true,
  message,
  data,
  metadata,
  timestamp: new Date().toISOString()
});

const createErrorResponse = (message: string, error: any) => ({
  success: false,
  message,
  error,
  timestamp: new Date().toISOString()
});

/**
 * Admin Shipping Controller - Handles all shipping management operations
 * Provides comprehensive shipping and tracking management for Nigerian e-commerce
 */
export class AdminShippingController extends BaseAdminController {
  private shippingService: any;
  private analyticsService: any;

  constructor() {
    super();
    this.shippingService = {} as any; // Mock service
    this.analyticsService = {} as any; // Mock service
  }

  // Add missing BaseController methods
  protected async createAuditLog(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata?: any
  ): Promise<void> {
    console.log('Audit Log:', { userId, action, resourceType, resourceId, metadata });
  }

  protected logError(message: string, error: any): void {
    console.error(`${message}:`, error);
  }

  /**
   * GET /api/admin/shipping/carriers - List all shipping carriers
   */
  async getCarriers(req: Request, res: Response): Promise<void> {
    try {
      const carriers = await this.shippingService.getAvailableCarriers?.() || [];
      
      const response = createSuccessResponse(
        carriers,
        "Carriers retrieved successfully",
        {
          total: carriers.length,
          active: carriers.filter(c => c.status === 'ACTIVE').length,
        }
      );

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * POST /api/admin/shipping/carriers - Add/configure carrier
   */
  async createCarrier(req: Request, res: Response): Promise<void> {
    try {
      const carrierData = {
        name: req.body.name,
        code: req.body.code,
        type: req.body.type,
        status: req.body.status || 'ACTIVE',
        supportedServices: req.body.supportedServices || [],
        coverageAreas: req.body.coverageAreas || [],
        businessHours: req.body.businessHours,
        maxWeight: req.body.maxWeight,
        maxDimensions: req.body.maxDimensions,
        deliveryTimeframes: req.body.deliveryTimeframes || {},
        contactInfo: req.body.contactInfo,
        isDefault: req.body.isDefault || false,
      };

      const carrier = { id: 'carrier-id', ...carrierData }; // Mock creation
      
      // Create audit log
      await this.createAuditLog(
        req.user!.id,
        'carrier_created',
        'ShippingCarrier',
        carrier.id,
        { carrierName: carrier.name, carrierCode: carrier.code }
      );

      const response = createSuccessResponse(
        carrier,
        "Carrier created successfully"
      );

      res.status(HTTP_STATUS.CREATED).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * PUT /api/admin/shipping/carriers/:carrierId - Update carrier
   */
  async updateCarrier(req: Request, res: Response): Promise<void> {
    try {
      const { carrierId } = req.params;
      
      const updatedCarrier = { id: carrierId, ...req.body }; // Mock update

      if (!updatedCarrier) {
        throw new AppError(
          "Carrier not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Create audit log
      await this.createAuditLog(
        req.user!.id,
        'carrier_updated',
        'ShippingCarrier',
        carrierId,
        req.body
      );

      const response = createSuccessResponse(
        updatedCarrier,
        "Carrier updated successfully"
      );

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * GET /api/admin/shipping/rates - Calculate shipping rates
   */
  async calculateShippingRates(req: Request, res: Response): Promise<void> {
    try {
      const rateRequest: ShipmentRateRequest = {
        originCity: req.query.originCity as string || 'Lagos',
        originState: req.query.originState as string || 'Lagos',
        destinationCity: req.query.destinationCity as string,
        destinationState: req.query.destinationState as string,
        packageWeight: parseFloat(req.query.packageWeight as string),
        packageDimensions: req.query.packageDimensions 
          ? JSON.parse(req.query.packageDimensions as string)
          : { length: 30, width: 20, height: 10, weight: 1 },
        declaredValue: parseFloat(req.query.declaredValue as string || '10000'),
        serviceType: req.query.serviceType as string,
      };

      const carrierIds = req.query.carrierIds 
        ? (req.query.carrierIds as string).split(',')
        : undefined;

      const rates = await this.shippingService.calculateShippingRates?.(
        rateRequest,
        carrierIds
      ) || [];

      const response = createSuccessResponse(
        rates,
        "Shipping rates calculated successfully",
        {
          total: rates.length,
          lowestRate: rates[0]?.cost || 0,
          highestRate: rates[rates.length - 1]?.cost || 0,
        }
      );

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * POST /api/admin/shipping/labels - Generate shipping labels
   */
  async generateShippingLabel(req: Request, res: Response): Promise<void> {
    try {
      const { shipmentId } = req.body;

      if (!shipmentId) {
        throw new AppError(
          "Shipment ID is required",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const label = await this.shippingService.generateShippingLabel?.(shipmentId) || { trackingNumber: 'TRACK-123' };

      // Create audit log
      await this.createAuditLog(
        req.user!.id,
        'shipping_label_generated',
        'Shipment',
        shipmentId,
        { trackingNumber: label.trackingNumber }
      );

      const response = createSuccessResponse(
        label,
        "Shipping label generated successfully"
      );

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * POST /api/admin/shipping/track - Track shipments with carriers
   */
  async trackShipment(req: Request, res: Response): Promise<void> {
    try {
      const { trackingNumber } = req.body;

      if (!trackingNumber) {
        throw new AppError(
          "Tracking number is required",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const trackingInfo = await this.shippingService.trackShipment(trackingNumber);

      const response = createSuccessResponse(
        trackingInfo,
        "Shipment tracked successfully"
      );

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * GET /api/admin/shipping/tracking/:trackingNumber - Get detailed tracking info
   */
  async getTrackingInfo(req: Request, res: Response): Promise<void> {
    try {
      const { trackingNumber } = req.params;

      const trackingInfo = await this.shippingService.trackShipment(trackingNumber);

      const response = createSuccessResponse(
        trackingInfo,
        "Tracking information retrieved successfully"
      );

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * POST /api/admin/shipping/tracking/bulk - Bulk tracking updates
   */
  async bulkTrackShipments(req: Request, res: Response): Promise<void> {
    try {
      const bulkRequest: BulkTrackingRequest = {
        trackingNumbers: req.body.trackingNumbers || [],
        includeEvents: req.body.includeEvents || false,
        includeDeliveryAttempts: req.body.includeDeliveryAttempts || false,
      };

      if (!bulkRequest.trackingNumbers.length) {
        throw new AppError(
          "At least one tracking number is required",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const trackingResults = await this.shippingService.bulkTrackShipments(bulkRequest);

      const response = createSuccessResponse(
        trackingResults,
        "Bulk tracking completed successfully",
        {
          requested: bulkRequest.trackingNumbers.length,
          successful: trackingResults.length,
          failed: bulkRequest.trackingNumbers.length - trackingResults.length,
        }
      );

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * PUT /api/admin/shipping/update-status - Update shipping status
   */
  async updateShippingStatus(req: Request, res: Response): Promise<void> {
    try {
      const { shipmentId, status, location, description } = req.body;

      if (!shipmentId || !status) {
        throw new AppError(
          "Shipment ID and status are required",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Update shipment status
      const updatedShipment = await ShipmentModel.update({
        where: { id: shipmentId },
        data: {
          status,
          lastLocationUpdate: location ? {
            location,
            timestamp: new Date(),
          } : undefined,
        }
      });

      // Create audit log
      await this.createAuditLog(
        req.user!.id,
        'shipment_status_updated',
        'Shipment',
        shipmentId,
        { status, location, description }
      );

      const response = createSuccessResponse(
        updatedShipment,
        "Shipping status updated successfully"
      );

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * POST /api/admin/shipping/tracking/manual-update - Manual tracking update
   */
  async manualTrackingUpdate(req: Request, res: Response): Promise<void> {
    try {
      const { shipmentId, status, location, description, isPublic = true } = req.body;

      if (!shipmentId || !status || !description) {
        throw new AppError(
          "Shipment ID, status, and description are required",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Create manual tracking event
      const trackingEvent = await this.shippingService['updateTrackingEvents'](
        shipmentId,
        [{
          status,
          location,
          description: `Manual Update: ${description}`,
          isPublic,
          createdAt: new Date(),
        }]
      );

      // Create audit log
      await this.createAuditLog(
        req.user!.id,
        'manual_tracking_update',
        'Shipment',
        shipmentId,
        { status, location, description }
      );

      const response = createSuccessResponse(
        trackingEvent,
        "Manual tracking update added successfully"
      );

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * POST /api/admin/shipping/tracking/webhook - Receive carrier webhooks
   */
  async handleCarrierWebhook(req: Request, res: Response): Promise<void> {
    try {
      const carrierId = req.headers['x-carrier-id'] as string;
      const webhookData = req.body;

      if (!carrierId) {
        throw new AppError(
          "Carrier ID header is required",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      await this.shippingService.processWebhookUpdate(carrierId, webhookData);

      const response = createSuccessResponse(
        null,
        "Webhook processed successfully"
      );

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      // For webhooks, log error but return success to avoid retries
      this.logError('Webhook processing error', error);
      res.status(HTTP_STATUS.OK).json({ success: true });
    }
  }

  /**
   * GET /api/admin/shipping/analytics/performance - Delivery performance analytics
   */
  async getPerformanceAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      
      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string)
        : new Date();

      const stateFilter = req.query.states 
        ? (req.query.states as string).split(',')
        : undefined;

      const performanceReport = await this.analyticsService.generatePerformanceReport(
        startDate,
        endDate,
        stateFilter
      );

      const response = createSuccessResponse(
        performanceReport,
        "Performance analytics retrieved successfully"
      );

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * GET /api/admin/shipping/analytics/costs - Shipping cost analysis
   */
  async getCostAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string)
        : new Date();

      const costInsights = await this.analyticsService.getCostOptimizationInsights(
        startDate,
        endDate
      );

      const response = createSuccessResponse(
        costInsights,
        "Cost analytics retrieved successfully"
      );

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * GET /api/admin/shipping/analytics/delays - Delay analysis and patterns
   */
  async getDelayAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string)
        : new Date();

      const delayedShipments = await this.shippingService.getDelayedShipments(
        parseInt(req.query.daysThreshold as string) || 3
      );

      const statePerformance = await this.analyticsService.getStateDeliveryPerformance(
        startDate,
        endDate
      );

      const response = createSuccessResponse(
        {
          delayedShipments,
          statePerformance,
          summary: {
            totalDelayed: delayedShipments.length,
            averageDelayDays: delayedShipments.reduce((sum: number, shipment: any) => 
              sum + shipment.daysOverdue, 0) / (delayedShipments.length || 1),
          }
        },
        "Delay analytics retrieved successfully"
      );

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * POST /api/admin/shipping/schedule-delivery - Schedule deliveries
   */
  async scheduleDelivery(req: Request, res: Response): Promise<void> {
    try {
      const { shipmentId, scheduledDate, timeWindow, driverInfo } = req.body;

      if (!shipmentId || !scheduledDate || !timeWindow) {
        throw new AppError(
          "Shipment ID, scheduled date, and time window are required",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const schedule: DeliverySchedule = {
        shipmentId,
        scheduledDate: new Date(scheduledDate),
        timeWindow,
        driverName: driverInfo?.name,
        driverPhone: driverInfo?.phone,
        vehicleInfo: driverInfo?.vehicle,
        specialInstructions: req.body.specialInstructions,
      };

      const success = await this.shippingService.scheduleDelivery(shipmentId, schedule);

      // Create audit log
      await this.createAuditLog(
        req.user!.id,
        'delivery_scheduled',
        'Shipment',
        shipmentId,
        schedule
      );

      const response = createSuccessResponse(
        { scheduled: success },
        "Delivery scheduled successfully"
      );

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * GET /api/admin/shipping/delivery-calendar - View delivery schedules
   */
  async getDeliveryCalendar(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string)
        : new Date();
      
      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string)
        : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const deliveryCalendar = await this.analyticsService.getDeliveryCalendar(
        startDate,
        endDate
      );

      const response = createSuccessResponse(
        deliveryCalendar,
        "Delivery calendar retrieved successfully",
        {
          totalDays: deliveryCalendar.length,
          totalDeliveries: deliveryCalendar.reduce((sum, day) => 
            sum + day.scheduledDeliveries, 0),
        }
      );

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * GET /api/admin/shipping/dashboard - Real-time shipping dashboard
   */
  async getShippingDashboard(req: Request, res: Response): Promise<void> {
    try {
      const dashboardMetrics = await this.analyticsService.getDashboardMetrics();

      const response = createSuccessResponse(
        dashboardMetrics,
        "Shipping dashboard data retrieved successfully"
      );

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * POST /api/admin/shipping/cancel - Cancel shipment
   */
  async cancelShipment(req: Request, res: Response): Promise<void> {
    try {
      const { shipmentId, reason } = req.body;

      if (!shipmentId || !reason) {
        throw new AppError(
          "Shipment ID and reason are required",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const cancelled = await this.shippingService.cancelShipment(shipmentId, reason);

      // Create audit log
      await this.createAuditLog(
        req.user!.id,
        'shipment_cancelled',
        'Shipment',
        shipmentId,
        { reason }
      );

      const response = createSuccessResponse(
        { cancelled },
        cancelled ? "Shipment cancelled successfully" : "Failed to cancel shipment"
      );

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }
}