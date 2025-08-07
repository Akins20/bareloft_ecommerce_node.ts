import { BaseService } from "../BaseService";
import {
  ShippingCarrierModel,
  ShipmentModel,
  TrackingEventModel,
  ShippingRateModel,
  ShippingZoneModel,
} from "@/models";
import {
  ShipmentRateRequest,
  ShipmentRateResponse,
  CreateShipmentRequest,
  Shipment,
  TrackingResponse,
  ShippingLabel,
  ShippingCarrier,
  BulkTrackingRequest,
  DeliverySchedule,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
} from "@/types";
import { JumiaLogisticsService } from "./JumiaLogisticsService";
import { LocalCarrierService } from "./LocalCarrierService";
import { BaseCarrierService } from "./BaseCarrierService";

/**
 * Shipping Service - Main orchestrator for Nigerian shipping operations
 * Manages multiple carriers including Jumia Logistics and local carriers
 */
export class ShippingService extends BaseService {
  private carriers: Map<string, BaseCarrierService> = new Map();
  private defaultCarrier: string = 'jumia_logistics';

  constructor() {
    super();
    this.initializeCarriers();
  }

  /**
   * Get all available shipping carriers
   */
  async getAvailableCarriers(): Promise<ShippingCarrier[]> {
    try {
      return await ShippingCarrierModel.findMany({
        where: {
          status: 'ACTIVE',
        },
        orderBy: [
          { isDefault: 'desc' },
          { name: 'asc' }
        ]
      });
    } catch (error) {
      this.handleError('Error fetching carriers', error);
      throw error;
    }
  }

  /**
   * Calculate shipping rates from multiple carriers
   */
  async calculateShippingRates(
    request: ShipmentRateRequest,
    carrierIds?: string[]
  ): Promise<ShipmentRateResponse[]> {
    try {
      this.logInfo('Calculating shipping rates', { request, carrierIds });

      const availableCarriers = carrierIds 
        ? carrierIds 
        : Array.from(this.carriers.keys());

      const ratePromises = availableCarriers.map(async (carrierId) => {
        try {
          const carrier = this.carriers.get(carrierId);
          if (!carrier) {
            this.logWarn(`Carrier ${carrierId} not found`);
            return null;
          }

          return await carrier.calculateShippingRate(request);
        } catch (error: any) {
          this.logWarn(`Rate calculation failed for ${carrierId}`, error.message);
          return null;
        }
      });

      const results = await Promise.allSettled(ratePromises);
      const rates: ShipmentRateResponse[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          rates.push(result.value);
        }
      });

      if (rates.length === 0) {
        throw new AppError(
          'No carriers available for this delivery',
          HTTP_STATUS.SERVICE_UNAVAILABLE,
          ERROR_CODES.SERVICE_UNAVAILABLE
        );
      }

      // Sort by cost (ascending)
      return rates.sort((a, b) => a.cost - b.cost);

    } catch (error) {
      this.handleError('Error calculating shipping rates', error);
      throw error;
    }
  }

  /**
   * Create shipment with preferred carrier
   */
  async createShipment(
    request: CreateShipmentRequest,
    preferredCarrierId?: string
  ): Promise<Shipment> {
    try {
      this.logInfo('Creating shipment', { 
        orderId: request.orderId, 
        preferredCarrierId 
      });

      const carrierId = preferredCarrierId || this.defaultCarrier;
      const carrier = this.carriers.get(carrierId);

      if (!carrier) {
        throw new AppError(
          `Carrier ${carrierId} not available`,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Create shipment through carrier API
      const shipment = await carrier.createShipment(request);

      // Store shipment in database
      const savedShipment = await ShipmentModel.create({
        trackingNumber: shipment.trackingNumber,
        orderId: request.orderId,
        carrierId,
        serviceType: request.serviceType,
        status: shipment.status,
        originAddress: shipment.originAddress,
        destinationAddress: request.destinationAddress,
        packageWeight: request.packageWeight,
        packageDimensions: request.packageDimensions,
        declaredValue: request.declaredValue,
        shippingCost: shipment.shippingCost,
        insuranceCost: shipment.insuranceCost,
        estimatedDelivery: shipment.estimatedDelivery,
        specialInstructions: request.specialInstructions,
        customerNotes: request.customerNotes,
        labelUrl: shipment.labelUrl,
      });

      // Create initial tracking event
      await TrackingEventModel.create({
        shipmentId: savedShipment.id,
        status: shipment.status,
        description: 'Shipment created and assigned to carrier',
        isPublic: true,
      });

      return shipment;

    } catch (error) {
      this.handleError('Error creating shipment', error);
      throw error;
    }
  }

  /**
   * Track single shipment
   */
  async trackShipment(trackingNumber: string): Promise<TrackingResponse> {
    try {
      this.logInfo('Tracking shipment', { trackingNumber });

      // Find shipment in database
      const shipment = await ShipmentModel.findByTrackingNumber(trackingNumber, true);

      if (!shipment) {
        throw new AppError(
          'Shipment not found',
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Get carrier service
      const carrier = this.carriers.get(shipment.carrierId);
      if (!carrier) {
        // Fallback to database tracking if carrier unavailable
        return this.getTrackingFromDatabase(shipment);
      }

      try {
        // Get real-time tracking from carrier
        const trackingResponse = await carrier.trackShipment(trackingNumber);
        
        // Update local tracking if new events
        await this.updateTrackingEvents(shipment.id, trackingResponse.events);
        
        return trackingResponse;
      } catch (carrierError) {
        this.logWarn('Carrier tracking failed, using database fallback', carrierError);
        return this.getTrackingFromDatabase(shipment);
      }

    } catch (error) {
      this.handleError('Error tracking shipment', error);
      throw error;
    }
  }

  /**
   * Bulk track multiple shipments
   */
  async bulkTrackShipments(request: BulkTrackingRequest): Promise<TrackingResponse[]> {
    try {
      this.logInfo('Bulk tracking shipments', { 
        count: request.trackingNumbers.length 
      });

      const trackingPromises = request.trackingNumbers.map(async (trackingNumber) => {
        try {
          return await this.trackShipment(trackingNumber);
        } catch (error) {
          this.logWarn(`Bulk tracking failed for ${trackingNumber}`, error);
          return null;
        }
      });

      const results = await Promise.allSettled(trackingPromises);
      const trackingResponses: TrackingResponse[] = [];

      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          trackingResponses.push(result.value);
        }
      });

      return trackingResponses;

    } catch (error) {
      this.handleError('Error bulk tracking shipments', error);
      throw error;
    }
  }

  /**
   * Generate shipping label
   */
  async generateShippingLabel(shipmentId: string): Promise<ShippingLabel> {
    try {
      const shipment = await ShipmentModel.findUnique({
        where: { id: shipmentId },
        include: { carrier: true }
      });

      if (!shipment) {
        throw new AppError(
          'Shipment not found',
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      const carrier = this.carriers.get(shipment.carrierId);
      if (!carrier) {
        throw new AppError(
          'Carrier service not available',
          HTTP_STATUS.SERVICE_UNAVAILABLE,
          ERROR_CODES.SERVICE_UNAVAILABLE
        );
      }

      const label = await carrier.generateShippingLabel(shipmentId);

      // Update shipment with label URL
      await ShipmentModel.update({
        where: { id: shipmentId },
        data: { labelUrl: label.labelUrl }
      });

      return label;

    } catch (error) {
      this.handleError('Error generating shipping label', error);
      throw error;
    }
  }

  /**
   * Cancel shipment
   */
  async cancelShipment(shipmentId: string, reason: string): Promise<boolean> {
    try {
      const shipment = await ShipmentModel.findUnique({
        where: { id: shipmentId }
      });

      if (!shipment) {
        throw new AppError(
          'Shipment not found',
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      const carrier = this.carriers.get(shipment.carrierId);
      if (!carrier) {
        throw new AppError(
          'Carrier service not available',
          HTTP_STATUS.SERVICE_UNAVAILABLE,
          ERROR_CODES.SERVICE_UNAVAILABLE
        );
      }

      const cancelled = await carrier.cancelShipment(shipmentId);

      if (cancelled) {
        // Update shipment status
        await ShipmentModel.update({
          where: { id: shipmentId },
          data: { status: 'CANCELLED' }
        });

        // Create tracking event
        await TrackingEventModel.create({
          shipmentId,
          status: 'CANCELLED',
          description: `Shipment cancelled: ${reason}`,
          isPublic: true,
        });
      }

      return cancelled;

    } catch (error) {
      this.handleError('Error cancelling shipment', error);
      throw error;
    }
  }

  /**
   * Process carrier webhook updates
   */
  async processWebhookUpdate(carrierId: string, webhookData: any): Promise<void> {
    try {
      this.logInfo('Processing carrier webhook', { carrierId, webhookData });

      const shipment = await ShipmentModel.findByTrackingNumber(
        webhookData.trackingNumber
      );

      if (!shipment) {
        this.logWarn('Shipment not found for webhook update', {
          trackingNumber: webhookData.trackingNumber
        });
        return;
      }

      // Create tracking event from webhook data
      await TrackingEventModel.createWithShipmentUpdate(shipment.id, {
        status: webhookData.status,
        location: webhookData.location,
        description: webhookData.description,
        carrierEventCode: webhookData.eventCode,
        eventData: webhookData.additionalData,
        isPublic: true,
      });

      this.logInfo('Webhook update processed successfully', {
        shipmentId: shipment.id,
        trackingNumber: webhookData.trackingNumber,
        status: webhookData.status,
      });

    } catch (error) {
      this.handleError('Error processing webhook update', error);
      // Don't throw - webhook processing should be resilient
    }
  }

  /**
   * Get delayed shipments for monitoring
   */
  async getDelayedShipments(daysThreshold = 7): Promise<any[]> {
    try {
      return await ShipmentModel.findDelayedShipments(daysThreshold);
    } catch (error) {
      this.handleError('Error fetching delayed shipments', error);
      throw error;
    }
  }

  /**
   * Schedule delivery for specific time
   */
  async scheduleDelivery(
    shipmentId: string,
    schedule: DeliverySchedule
  ): Promise<boolean> {
    try {
      // Update shipment with delivery schedule
      await ShipmentModel.update({
        where: { id: shipmentId },
        data: {
          // Store schedule in metadata or separate table in production
          lastLocationUpdate: {
            scheduledDelivery: schedule
          }
        }
      });

      // Create tracking event
      await TrackingEventModel.create({
        shipmentId,
        status: 'IN_TRANSIT',
        description: `Delivery scheduled for ${schedule.scheduledDate.toDateString()} between ${schedule.timeWindow.start} - ${schedule.timeWindow.end}`,
        isPublic: true,
      });

      return true;

    } catch (error) {
      this.handleError('Error scheduling delivery', error);
      throw error;
    }
  }

  // Private helper methods

  private initializeCarriers(): void {
    try {
      // Initialize Jumia Logistics (primary carrier)
      const jumiaConfig = {
        apiKey: process.env.JUMIA_API_KEY || 'test_jumia_key',
        sellerId: process.env.JUMIA_SELLER_ID || 'test_seller_123',
        baseUrl: process.env.JUMIA_API_URL || 'https://api.jumia-logistics.com/v2',
        testMode: process.env.NODE_ENV !== 'production',
      };

      this.carriers.set('jumia_logistics', new JumiaLogisticsService(jumiaConfig));

      // Initialize Local Carrier (backup/supplementary)
      this.carriers.set('local_carrier', new LocalCarrierService(
        'Swift Local Delivery',
        'SLD_NG',
        'https://api.swiftlocal.ng',
        process.env.LOCAL_CARRIER_API_KEY || 'test_local_key',
        process.env.NODE_ENV !== 'production'
      ));

      this.logInfo('Carriers initialized successfully', {
        carriers: Array.from(this.carriers.keys()),
        defaultCarrier: this.defaultCarrier,
      });

    } catch (error) {
      this.logError('Error initializing carriers', error);
    }
  }

  private async getTrackingFromDatabase(shipment: any): Promise<TrackingResponse> {
    const events = await TrackingEventModel.getShipmentTimeline(shipment.id);

    return {
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      estimatedDelivery: shipment.estimatedDelivery,
      actualDelivery: shipment.actualDelivery,
      currentLocation: shipment.lastLocationUpdate?.location,
      progress: this.calculateProgress(shipment.status),
      events: events.map((event: any) => ({
        id: event.id,
        shipmentId: event.shipmentId,
        status: event.status,
        location: event.location,
        city: event.city,
        state: event.state,
        country: event.country || 'NG',
        description: event.description,
        carrierEventCode: event.carrierEventCode,
        eventData: event.eventData,
        isPublic: event.isPublic,
        createdAt: event.createdAt,
      })),
      deliveryAttempts: [],
    };
  }

  private calculateProgress(status: string): { 
    percentage: number; 
    currentStep: string; 
    nextStep?: string;
  } {
    const progressMap: { [key: string]: any } = {
      'PENDING': { percentage: 10, current: 'Order Processing', next: 'Pickup Scheduled' },
      'PICKED_UP': { percentage: 30, current: 'Package Collected', next: 'In Transit' },
      'IN_TRANSIT': { percentage: 60, current: 'In Transit', next: 'Out for Delivery' },
      'OUT_FOR_DELIVERY': { percentage: 85, current: 'Out for Delivery', next: 'Delivered' },
      'DELIVERED': { percentage: 100, current: 'Delivered', next: undefined },
      'CANCELLED': { percentage: 0, current: 'Cancelled', next: undefined },
    };

    const progress = progressMap[status] || progressMap['PENDING'];
    return {
      percentage: progress.percentage,
      currentStep: progress.current,
      nextStep: progress.next,
    };
  }

  private async updateTrackingEvents(shipmentId: string, events: any[]): Promise<void> {
    try {
      // Get existing events
      const existingEvents = await TrackingEventModel.findMany({
        where: { shipmentId },
        select: { carrierEventCode: true }
      });

      const existingCodes = new Set(
        existingEvents
          .map((e: any) => e.carrierEventCode)
          .filter(Boolean)
      );

      // Add new events only
      for (const event of events) {
        if (event.carrierEventCode && !existingCodes.has(event.carrierEventCode)) {
          await TrackingEventModel.create({
            shipmentId,
            status: event.status,
            location: event.location,
            city: event.city,
            state: event.state,
            country: event.country || 'NG',
            description: event.description,
            carrierEventCode: event.carrierEventCode,
            eventData: event.eventData,
            latitude: event.latitude,
            longitude: event.longitude,
            estimatedDelivery: event.estimatedDelivery,
            isPublic: event.isPublic,
          });
        }
      }
    } catch (error) {
      this.logWarn('Error updating tracking events', error);
    }
  }
}