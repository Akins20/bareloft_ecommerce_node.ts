import { BaseService } from "../BaseService";
import { JumiaLogisticsService } from "./JumiaLogisticsService";
import { LocalCarrierService } from "./LocalCarrierService";
import { BaseCarrierService } from "./BaseCarrierService";
import { PrismaClient } from "@prisma/client";

// Local type definitions to match existing interface expectations
interface ShipmentRateRequest {
  originAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  destinationAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  packageWeight: number;
  packageDimensions: {
    length: number;
    width: number;
    height: number;
  };
  declaredValue?: number;
  serviceType?: string;
}

interface ShipmentRateResponse {
  carrierId: string;
  carrierName: string;
  serviceType: string;
  cost: number;
  currency: string;
  estimatedDelivery: Date;
  deliveryTimeframe: string;
  transitTime?: number;
  notes?: string;
}

interface CreateShipmentRequest {
  orderId: string;
  carrierId?: string;
  destinationAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  packageWeight: number;
  packageDimensions: {
    length: number;
    width: number;
    height: number;
  };
  declaredValue: number;
  serviceType: string;
  specialInstructions?: string;
  customerNotes?: string;
}

interface Shipment {
  id: string;
  trackingNumber: string;
  orderId: string;
  carrierId: string;
  serviceType: string;
  status: string;
  originAddress: any;
  destinationAddress: any;
  packageWeight: number;
  packageDimensions: any;
  declaredValue: number;
  shippingCost: number;
  insuranceCost?: number;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  specialInstructions?: string;
  customerNotes?: string;
  labelUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TrackingResponse {
  trackingNumber: string;
  status: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  currentLocation?: string;
  progress: {
    percentage: number;
    currentStep: string;
    nextStep?: string;
  };
  events: any[];
  deliveryAttempts?: any[];
}

interface ShippingLabel {
  id?: string;
  shipmentId?: string;
  labelUrl: string;
  format?: string;
  dimensions?: string;
  createdAt?: Date;
}

interface ShippingCarrier {
  id: string;
  name: string;
  code: string;
  status: string;
  type: string;
  isDefault: boolean;
  baseUrl: string;
  supportedServices: string[];
  coverageAreas: string[];
  businessHours: any;
  deliveryTimeframes: any;
  contactInfo: any;
  createdAt: Date;
  updatedAt: Date;
}

interface BulkTrackingRequest {
  trackingNumbers: string[];
}

interface DeliverySchedule {
  scheduledDate: Date;
  timeSlot?: string;
  specialInstructions?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};

const ERROR_CODES = {
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

/**
 * Shipping Service - Main orchestrator for Nigerian shipping operations
 * Manages multiple carriers including Jumia Logistics and local carriers
 */
export class ShippingService extends BaseService {
  protected db: PrismaClient;
  private carriers: Map<string, BaseCarrierService> = new Map();
  private defaultCarrier: string = 'jumia_logistics';

  constructor() {
    super();
    this.db = new PrismaClient();
    this.initializeCarriers();
  }

  // Helper method to create success response
  protected createSuccessResponse<T>(data: T, message: string, statusCode: number = HTTP_STATUS.OK): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    };
  }

  // Mock logging methods
  private logInfo(message: string, data?: any) {
    console.log(`[INFO] ${message}`, data);
  }

  private logWarn(message: string, data?: any) {
    console.warn(`[WARN] ${message}`, data);
  }

  private logError(message: string, data?: any) {
    console.error(`[ERROR] ${message}`, data);
  }

  /**
   * Get all available shipping carriers
   */
  async getAvailableCarriers(): Promise<ShippingCarrier[]> {
    try {
      // Mock implementation - replace with actual database call
      const mockCarriers: ShippingCarrier[] = [
        {
          id: 'jumia_logistics',
          name: 'Jumia Logistics',
          code: 'JL',
          status: 'ACTIVE' as any,
          type: 'THIRD_PARTY' as any,
          isDefault: true,
          baseUrl: 'https://api.jumia.com',
          supportedServices: ['STANDARD', 'EXPRESS'],
          coverageAreas: ['Lagos', 'FCT', 'Rivers'],
          businessHours: {
            weekdays: { start: '09:00', end: '18:00' },
            saturday: { start: '09:00', end: '15:00' },
            sunday: { start: '10:00', end: '16:00' }
          },
          deliveryTimeframes: { 
            standard: 3,
            express: 1,
            sameDay: false
          } as any,
          contactInfo: { phone: '+2348000000000', email: 'support@jumia.com' },
          createdAt: new Date(),
          updatedAt: new Date()
        } as ShippingCarrier
      ];
      return mockCarriers;
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
      console.log('🚚 [SHIPPING SERVICE] Starting calculateShippingRates');
      this.logInfo('Calculating shipping rates', { request, carrierIds });

      const availableCarriers = carrierIds 
        ? carrierIds 
        : Array.from(this.carriers.keys());
      
      console.log('🚛 [SHIPPING SERVICE] Available carriers:', availableCarriers);
      console.log('📦 [SHIPPING SERVICE] Carriers map size:', this.carriers.size);

      const ratePromises = availableCarriers.map(async (carrierId) => {
        try {
          console.log(`🔍 [SHIPPING SERVICE] Processing carrier: ${carrierId}`);
          const carrier = this.carriers.get(carrierId);
          if (!carrier) {
            console.log(`❌ [SHIPPING SERVICE] Carrier ${carrierId} not found`);
            this.logWarn(`Carrier ${carrierId} not found`);
            return null;
          }

          // Map internal request to carrier expected format
          const carrierRequest = {
            ...request,
            originCity: request.originAddress.city,
            originState: request.originAddress.state,
            destinationCity: request.destinationAddress.city,
            destinationState: request.destinationAddress.state,
          };

          console.log(`🔄 [SHIPPING SERVICE] Calling ${carrierId}.calculateShippingRate`);
          const response = await carrier.calculateShippingRate(carrierRequest as any);
          console.log(`✅ [SHIPPING SERVICE] ${carrierId} response:`, response);
          
          // Ensure response has required deliveryTimeframe
          return {
            ...response,
            deliveryTimeframe: (response as any).deliveryTimeframe || `${(response as any).transitTime || 3} days`,
          };
        } catch (error: any) {
          console.log(`❌ [SHIPPING SERVICE] Rate calculation failed for ${carrierId}:`, error.message);
          this.logWarn(`Rate calculation failed for ${carrierId}`, error.message);
          return null;
        }
      });

      console.log('⏳ [SHIPPING SERVICE] Waiting for all rate promises...');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Rate calculation timeout after 10 seconds')), 10000)
      );
      
      const results = await Promise.race([
        Promise.allSettled(ratePromises),
        timeoutPromise
      ]) as PromiseSettledResult<ShipmentRateResponse | null>[];
      
      console.log('✅ [SHIPPING SERVICE] All rate promises settled, results:', results.length);
      const rates: ShipmentRateResponse[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          rates.push(result.value);
        }
      });

      if (rates.length === 0) {
        throw new AppError(
          'No carriers available for this delivery',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INTERNAL_ERROR
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
      const carrierRequest = {
        ...request,
        carrierId: carrierId,
      };
      const shipment = await carrier.createShipment(carrierRequest as any);

      // Store shipment in database (mock implementation)
      const savedShipment = {
        id: `ship_${Date.now()}`,
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
      };

      // Create initial tracking event (mock implementation)
      console.log('Creating initial tracking event for shipment:', savedShipment.id);

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

      // Find shipment in database (mock implementation)
      const shipment = {
        id: `ship_${trackingNumber}`,
        trackingNumber,
        carrierId: 'jumia_logistics',
        status: 'IN_TRANSIT',
        estimatedDelivery: new Date(),
        actualDelivery: null,
        lastLocationUpdate: { location: 'Lagos, Nigeria' },
      };

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
      // Find shipment in database (mock implementation)
      const shipment = {
        id: shipmentId,
        carrierId: 'jumia_logistics',
        trackingNumber: `TRK${Date.now()}`,
      };

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
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INTERNAL_ERROR
        );
      }

      const carrierLabel = await carrier.generateShippingLabel(shipmentId);

      // Update shipment with label URL (mock implementation)
      console.log('Updating shipment label URL for:', shipmentId);

      // Ensure label has the required properties
      const label: ShippingLabel = {
        ...carrierLabel,
        id: (carrierLabel as any).id || `lbl_${Date.now()}`,
        shipmentId: (carrierLabel as any).shipmentId || shipmentId,
        format: (carrierLabel as any).format || 'PDF',
        dimensions: (carrierLabel as any).dimensions || '4x6',
        createdAt: (carrierLabel as any).createdAt || new Date(),
      };

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
      // Find shipment in database (mock implementation)
      const shipment = {
        id: shipmentId,
        carrierId: 'jumia_logistics',
        status: 'PENDING',
      };

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
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INTERNAL_ERROR
        );
      }

      const cancelled = await carrier.cancelShipment(shipmentId);

      if (cancelled) {
        // Update shipment status (mock implementation)
        console.log(`Shipment ${shipmentId} cancelled: ${reason}`);
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

      // Find shipment by tracking number (mock implementation)
      const shipment = {
        id: `ship_${webhookData.trackingNumber}`,
        trackingNumber: webhookData.trackingNumber,
      };

      if (!shipment) {
        this.logWarn('Shipment not found for webhook update', {
          trackingNumber: webhookData.trackingNumber
        });
        return;
      }

      // Create tracking event from webhook data (mock implementation)
      console.log('Creating tracking event from webhook for:', shipment.id);

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
      // Mock implementation for delayed shipments
      return [];
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
      // Update shipment with delivery schedule (mock implementation)
      console.log(`Delivery scheduled for ${shipmentId} on ${schedule.scheduledDate.toDateString()}`);

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
    // Mock tracking events
    const events = [
      {
        id: 'evt_1',
        shipmentId: shipment.id,
        status: 'IN_TRANSIT',
        location: 'Lagos, Nigeria',
        city: 'Lagos',
        state: 'Lagos',
        country: 'NG',
        description: 'Package in transit',
        carrierEventCode: 'IN_TRANSIT',
        eventData: {},
        isPublic: true,
        createdAt: new Date(),
      }
    ];

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
      // Get existing events (mock implementation)
      const existingEvents: any[] = [];

      const existingCodes = new Set(
        existingEvents
          .map((e: any) => e.carrierEventCode)
          .filter(Boolean)
      );

      // Add new events only
      for (const event of events) {
        if (event.carrierEventCode && !existingCodes.has(event.carrierEventCode)) {
          // Create tracking event (mock implementation)
          console.log('Creating tracking event:', event.status, event.description);
        }
      }
    } catch (error) {
      this.logWarn('Error updating tracking events', error);
    }
  }

  /**
   * Handle service errors
   */
  protected handleError(message: string, error: any): never {
    console.error(message, error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }
}