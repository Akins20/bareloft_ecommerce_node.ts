import { BaseCarrierService } from "./BaseCarrierService";
import {
  ShipmentRateRequest,
  ShipmentRateResponse,
  CreateShipmentRequest,
  Shipment,
  TrackingResponse,
  ShippingLabel,
  ShipmentStatus,
  JumiaLogisticsConfig,
  NigerianAddress,
} from "@/types";
import axios, { AxiosInstance } from "axios";

/**
 * Jumia Logistics Service - Integration with Jumia's delivery network
 * Optimized for Nigerian e-commerce deliveries with extensive coverage
 */
export class JumiaLogisticsService extends BaseCarrierService {
  private httpClient: AxiosInstance;
  private sellerId: string;

  constructor(config: JumiaLogisticsConfig) {
    super(
      "Jumia Logistics",
      "JUMIA_NG",
      config.baseUrl,
      config.apiKey,
      config.testMode
    );
    
    this.sellerId = config.sellerId;
    this.httpClient = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-Seller-ID': this.sellerId,
        'X-API-Version': 'v2',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Calculate shipping rate using Jumia's rate API
   */
  async calculateShippingRate(request: ShipmentRateRequest): Promise<ShipmentRateResponse> {
    try {
      this.logCarrierOperation('calculateShippingRate', request);

      if (!this.validateNigerianAddress({
        ...request,
        firstName: 'Test',
        lastName: 'User',
        addressLine1: request.destinationCity,
        phoneNumber: '+2348000000000',
        country: 'NG'
      } as NigerianAddress)) {
        throw new Error('Invalid Nigerian address for shipping calculation');
      }

      // Jumia Logistics uses zone-based pricing
      const zoneCode = this.getJumiaZoneCode(request.destinationState);
      const serviceType = request.serviceType || 'standard';
      
      const payload = {
        origin: {
          city: request.originCity,
          state: request.originState,
        },
        destination: {
          city: request.destinationCity,
          state: request.destinationState,
          zone: zoneCode,
        },
        package: {
          weight: request.packageWeight,
          dimensions: request.packageDimensions,
          value: request.declaredValue,
        },
        service_type: serviceType,
        seller_id: this.sellerId,
      };

      const response = await this.httpClient.post('/shipping/calculate-rate', payload);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Rate calculation failed');
      }

      const rateData = response.data.data;
      const deliveryDays = this.calculateDeliveryDays(
        request.originState,
        request.destinationState,
        serviceType
      );

      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(estimatedDelivery.getDate() + deliveryDays);

      return {
        carrierId: 'jumia_logistics',
        carrierName: 'Jumia Logistics',
        serviceType,
        cost: rateData.total_amount,
        currency: 'NGN',
        estimatedDays: deliveryDays,
        estimatedDelivery: this.adjustForNigerianHolidays(estimatedDelivery),
        additionalFees: {
          fuelSurcharge: rateData.fuel_surcharge || 0,
          insurance: rateData.insurance_fee || 0,
          vat: rateData.vat_amount || 0,
        },
      };

    } catch (error) {
      this.handleCarrierError(error, 'rate calculation');
    }
  }

  /**
   * Create shipment with Jumia Logistics
   */
  async createShipment(request: CreateShipmentRequest): Promise<Shipment> {
    try {
      this.logCarrierOperation('createShipment', { orderId: request.orderId });

      if (!this.validateNigerianAddress(request.destinationAddress)) {
        throw new Error('Invalid destination address for Nigerian delivery');
      }

      const trackingNumber = this.generateJumiaTrackingNumber();
      const zoneCode = this.getJumiaZoneCode(request.destinationAddress.state);

      const payload = {
        order_reference: request.orderId,
        service_type: request.serviceType,
        seller_id: this.sellerId,
        pickup_location: {
          name: "Bareloft Warehouse",
          address: "Plot 123, Ikorodu Road, Lagos",
          city: "Lagos",
          state: "Lagos",
          phone: "+234800000000",
          contact_person: "Warehouse Manager",
        },
        delivery_location: {
          recipient_name: `${request.destinationAddress.firstName} ${request.destinationAddress.lastName}`,
          recipient_phone: request.destinationAddress.phoneNumber,
          address: request.destinationAddress.addressLine1,
          address_2: request.destinationAddress.addressLine2 || '',
          city: request.destinationAddress.city,
          state: request.destinationAddress.state,
          landmark: request.destinationAddress.landmarkInstructions || '',
          zone_code: zoneCode,
        },
        package_details: {
          weight: request.packageWeight,
          dimensions: request.packageDimensions,
          declared_value: request.declaredValue,
          description: "E-commerce package",
          fragile: false,
        },
        delivery_instructions: request.specialInstructions || request.customerNotes || '',
        insurance_required: request.insuranceRequired || false,
      };

      const response = await this.httpClient.post('/shipments/create', payload);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Shipment creation failed');
      }

      const shipmentData = response.data.data;
      const estimatedDelivery = new Date(shipmentData.estimated_delivery_date);

      return {
        id: shipmentData.shipment_id,
        trackingNumber: shipmentData.tracking_number || trackingNumber,
        orderId: request.orderId,
        carrierId: 'jumia_logistics',
        serviceType: request.serviceType,
        status: ShipmentStatus.PENDING,
        originAddress: {
          firstName: "Bareloft",
          lastName: "Warehouse",
          company: "Bareloft Ltd",
          addressLine1: "Plot 123, Ikorodu Road",
          city: "Lagos",
          state: "Lagos",
          country: "NG",
          phoneNumber: "+234800000000",
        },
        destinationAddress: request.destinationAddress,
        packageWeight: request.packageWeight,
        packageDimensions: request.packageDimensions,
        declaredValue: request.declaredValue,
        shippingCost: shipmentData.shipping_cost,
        insuranceCost: shipmentData.insurance_cost,
        estimatedDelivery: this.adjustForNigerianHolidays(estimatedDelivery),
        specialInstructions: request.specialInstructions,
        customerNotes: request.customerNotes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

    } catch (error) {
      this.handleCarrierError(error, 'shipment creation');
    }
  }

  /**
   * Track shipment using Jumia's tracking API
   */
  async trackShipment(trackingNumber: string): Promise<TrackingResponse> {
    try {
      this.logCarrierOperation('trackShipment', { trackingNumber });

      const response = await this.httpClient.get(`/shipments/track/${trackingNumber}`, {
        params: { seller_id: this.sellerId }
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Tracking failed');
      }

      const trackingData = response.data.data;
      const status = this.mapJumiaStatusToShipmentStatus(trackingData.status);

      return {
        trackingNumber,
        status,
        estimatedDelivery: trackingData.estimated_delivery ? new Date(trackingData.estimated_delivery) : undefined,
        actualDelivery: trackingData.delivered_at ? new Date(trackingData.delivered_at) : undefined,
        currentLocation: trackingData.current_location?.description,
        progress: this.calculateTrackingProgress(status),
        events: trackingData.events?.map((event: any) => ({
          id: event.id,
          shipmentId: trackingData.shipment_id,
          status: this.mapJumiaStatusToShipmentStatus(event.status),
          location: event.location?.description,
          city: event.location?.city,
          state: event.location?.state,
          country: 'NG',
          description: event.description,
          carrierEventCode: event.event_code,
          eventData: event.metadata,
          isPublic: true,
          createdAt: new Date(event.timestamp),
        })) || [],
        deliveryAttempts: trackingData.delivery_attempts || [],
      };

    } catch (error) {
      this.handleCarrierError(error, 'shipment tracking');
    }
  }

  /**
   * Generate shipping label from Jumia
   */
  async generateShippingLabel(shipmentId: string): Promise<ShippingLabel> {
    try {
      this.logCarrierOperation('generateShippingLabel', { shipmentId });

      const response = await this.httpClient.post(`/shipments/${shipmentId}/label`, {
        seller_id: this.sellerId,
        format: 'pdf',
        size: 'A4',
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Label generation failed');
      }

      const labelData = response.data.data;

      return {
        trackingNumber: labelData.tracking_number,
        labelUrl: labelData.label_url,
        labelFormat: 'pdf',
        manifestNumber: labelData.manifest_number,
        createdAt: new Date(),
      };

    } catch (error) {
      this.handleCarrierError(error, 'label generation');
    }
  }

  /**
   * Cancel shipment with Jumia
   */
  async cancelShipment(shipmentId: string): Promise<boolean> {
    try {
      this.logCarrierOperation('cancelShipment', { shipmentId });

      const response = await this.httpClient.post(`/shipments/${shipmentId}/cancel`, {
        seller_id: this.sellerId,
        reason: 'Customer request',
      });

      return response.data.success === true;

    } catch (error) {
      this.handleCarrierError(error, 'shipment cancellation');
    }
  }

  // Private helper methods

  private setupInterceptors(): void {
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.logError('Jumia Logistics authentication failed', {
            sellerId: this.sellerId,
            testMode: this.testMode,
          });
        }
        return Promise.reject(error);
      }
    );
  }

  private generateJumiaTrackingNumber(): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `JUM${timestamp}${random}`;
  }

  private getJumiaZoneCode(state: string): string {
    // Jumia's zone mapping for Nigerian states
    const zoneMapping: { [key: string]: string } = {
      // Zone 1: Lagos Metropolitan
      'lagos': 'LMZ',
      
      // Zone 2: Southwest
      'ogun': 'SWZ', 'oyo': 'SWZ', 'osun': 'SWZ', 'ondo': 'SWZ', 'ekiti': 'SWZ',
      
      // Zone 3: North Central
      'abuja': 'NCZ', 'fct': 'NCZ', 'kwara': 'NCZ', 'kogi': 'NCZ', 'nasarawa': 'NCZ',
      'niger': 'NCZ', 'plateau': 'NCZ', 'benue': 'NCZ',
      
      // Zone 4: Southeast
      'abia': 'SEZ', 'anambra': 'SEZ', 'ebonyi': 'SEZ', 'enugu': 'SEZ', 'imo': 'SEZ',
      
      // Zone 5: South South
      'rivers': 'SSZ', 'bayelsa': 'SSZ', 'delta': 'SSZ', 'edo': 'SSZ',
      'cross river': 'SSZ', 'akwa ibom': 'SSZ',
      
      // Zone 6: Northeast
      'adamawa': 'NEZ', 'bauchi': 'NEZ', 'borno': 'NEZ', 'gombe': 'NEZ',
      'taraba': 'NEZ', 'yobe': 'NEZ',
      
      // Zone 7: Northwest
      'kaduna': 'NWZ', 'kano': 'NWZ', 'jigawa': 'NWZ', 'kebbi': 'NWZ',
      'sokoto': 'NWZ', 'zamfara': 'NWZ', 'katsina': 'NWZ',
    };

    return zoneMapping[state.toLowerCase()] || 'OTH'; // Other/Unknown
  }

  private mapJumiaStatusToShipmentStatus(jumiaStatus: string): ShipmentStatus {
    const statusMapping: { [key: string]: ShipmentStatus } = {
      'created': ShipmentStatus.PENDING,
      'pickup_scheduled': ShipmentStatus.PENDING,
      'picked_up': ShipmentStatus.PICKED_UP,
      'in_transit': ShipmentStatus.IN_TRANSIT,
      'out_for_delivery': ShipmentStatus.OUT_FOR_DELIVERY,
      'delivered': ShipmentStatus.DELIVERED,
      'delivery_failed': ShipmentStatus.FAILED_DELIVERY,
      'returned': ShipmentStatus.RETURNED,
      'cancelled': ShipmentStatus.CANCELLED,
    };

    return statusMapping[jumiaStatus.toLowerCase()] || ShipmentStatus.PENDING;
  }

  private calculateTrackingProgress(status: ShipmentStatus): { 
    percentage: number; 
    currentStep: string; 
    nextStep?: string;
  } {
    const progressMapping = {
      [ShipmentStatus.PENDING]: {
        percentage: 10,
        currentStep: 'Order Processing',
        nextStep: 'Pickup Scheduled',
      },
      [ShipmentStatus.PICKED_UP]: {
        percentage: 30,
        currentStep: 'Package Collected',
        nextStep: 'In Transit',
      },
      [ShipmentStatus.IN_TRANSIT]: {
        percentage: 60,
        currentStep: 'In Transit',
        nextStep: 'Out for Delivery',
      },
      [ShipmentStatus.OUT_FOR_DELIVERY]: {
        percentage: 85,
        currentStep: 'Out for Delivery',
        nextStep: 'Delivered',
      },
      [ShipmentStatus.DELIVERED]: {
        percentage: 100,
        currentStep: 'Delivered',
        nextStep: undefined,
      },
      [ShipmentStatus.FAILED_DELIVERY]: {
        percentage: 75,
        currentStep: 'Delivery Failed',
        nextStep: 'Retry Delivery',
      },
      [ShipmentStatus.RETURNED]: {
        percentage: 90,
        currentStep: 'Returned to Sender',
        nextStep: undefined,
      },
      [ShipmentStatus.CANCELLED]: {
        percentage: 0,
        currentStep: 'Cancelled',
        nextStep: undefined,
      },
    };

    return progressMapping[status] || progressMapping[ShipmentStatus.PENDING];
  }
}