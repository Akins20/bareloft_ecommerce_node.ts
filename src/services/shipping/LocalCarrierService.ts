import { BaseCarrierService } from "./BaseCarrierService";
import {
  ShipmentRateRequest,
  ShipmentRateResponse,
  CreateShipmentRequest,
  Shipment,
  TrackingResponse,
  ShippingLabel,
  ShipmentStatus,
  NigerianAddress,
  TrackingEvent,
} from "../../types";

/**
 * Local Carrier Service - Basic Nigerian local delivery service
 * Optimized for small-scale local deliveries within Nigerian cities
 * This represents a typical Nigerian logistics company with basic API integration
 */
export class LocalCarrierService extends BaseCarrierService {
  private readonly baseRates: { [key: string]: number };
  private readonly coverage: string[];
  private shipmentCounter: number = 1000;

  constructor(
    carrierName = "Swift Local Delivery",
    carrierCode = "SLD_NG",
    apiBaseUrl = "https://api.swiftlocal.ng",
    apiKey = "test_api_key_12345",
    testMode = true
  ) {
    super(carrierName, carrierCode, apiBaseUrl, apiKey, testMode);
    
    // Basic rate structure for Nigerian local delivery
    this.baseRates = {
      'lagos': 2500,      // Lagos metropolitan area
      'abuja': 3000,      // FCT Abuja
      'fct': 3000,        // FCT
      'kano': 2800,       // Kano metropolitan
      'ibadan': 2600,     // Ibadan (Oyo state)
      'port harcourt': 2900, // Rivers state
      'benin': 2700,      // Edo state
      'enugu': 2800,      // Enugu state
      'kaduna': 2800,     // Kaduna state
      'jos': 2900,        // Plateau state
    };

    // States/cities covered by this local carrier
    this.coverage = [
      'lagos', 'ogun', 'abuja', 'fct', 'oyo', 'osun', 
      'kano', 'kaduna', 'rivers', 'edo', 'enugu', 'plateau'
    ];
  }

  /**
   * Calculate shipping rate for local delivery
   */
  async calculateShippingRate(request: ShipmentRateRequest): Promise<ShipmentRateResponse> {
    try {
      console.log('🚛 [LOCAL CARRIER] Starting calculateShippingRate');
      this.logCarrierOperation('calculateShippingRate', request);

      // Validate coverage area
      if (!this.isCoverageArea(request.destinationState)) {
        throw new Error(`${this.carrierName} does not cover ${request.destinationState}`);
      }

      if (!this.validateNigerianAddress({
        firstName: 'Test',
        lastName: 'User',
        addressLine1: request.destinationCity,
        city: request.destinationCity,
        state: request.destinationState,
        phoneNumber: '+2348000000000',
        country: 'NG'
      } as NigerianAddress)) {
        throw new Error('Invalid Nigerian address for shipping calculation');
      }

      const baseRate = this.getBaseRate(request.destinationState, request.destinationCity);
      const weightSurcharge = this.calculateWeightSurcharge(request.packageWeight);
      const serviceSurcharge = this.getServiceSurcharge(request.serviceType || 'standard');
      
      let totalCost = baseRate + weightSurcharge + serviceSurcharge;
      
      // Apply Nigerian surcharges
      totalCost = this.applyNigerianSurcharges(
        totalCost, 
        request.destinationState, 
        request.serviceType || 'standard'
      );

      const deliveryDays = this.calculateDeliveryDays(
        request.originState,
        request.destinationState,
        request.serviceType || 'standard'
      );

      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(estimatedDelivery.getDate() + deliveryDays);

      const response = {
        carrierId: this.carrierCode.toLowerCase(),
        carrierName: this.carrierName,
        serviceType: request.serviceType || 'standard',
        cost: Math.round(totalCost * 100) / 100,
        currency: 'NGN',
        estimatedDays: deliveryDays,
        estimatedDelivery: this.adjustForNigerianHolidays(estimatedDelivery),
        transitTime: deliveryDays,
        deliveryTimeframe: `${deliveryDays} ${deliveryDays === 1 ? 'day' : 'days'}`,
        additionalFees: {
          fuelSurcharge: totalCost * 0.08, // 8% fuel surcharge
          insurance: request.declaredValue * 0.01, // 1% insurance
          vat: 0, // VAT not applicable
        },
      };

      console.log('✅ [LOCAL CARRIER] Rate response generated:', response.cost, 'NGN');
      return response;

    } catch (error: any) {
      console.log('❌ [LOCAL CARRIER] Error in calculateShippingRate:', error);
      this.handleCarrierError(error, 'rate calculation');
    }
  }

  /**
   * Create shipment with local carrier
   */
  async createShipment(request: CreateShipmentRequest): Promise<Shipment> {
    try {
      this.logCarrierOperation('createShipment', { orderId: request.orderId });

      if (!this.isCoverageArea(request.destinationAddress.state)) {
        throw new Error(`${this.carrierName} does not deliver to ${request.destinationAddress.state}`);
      }

      if (!this.validateNigerianAddress(request.destinationAddress)) {
        throw new Error('Invalid destination address for Nigerian delivery');
      }

      // Generate local tracking number
      const trackingNumber = this.generateLocalTrackingNumber();
      
      // Calculate shipping cost (simplified for basic carrier)
      const rateRequest: ShipmentRateRequest = {
        originCity: "Lagos", // Default origin
        originState: "Lagos",
        destinationCity: request.destinationAddress.city,
        destinationState: request.destinationAddress.state,
        packageWeight: request.packageWeight,
        packageDimensions: request.packageDimensions,
        declaredValue: request.declaredValue,
        serviceType: request.serviceType,
      };

      const rateResponse = await this.calculateShippingRate(rateRequest);
      
      const deliveryDays = this.calculateDeliveryDays(
        "Lagos",
        request.destinationAddress.state,
        request.serviceType
      );

      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(estimatedDelivery.getDate() + deliveryDays);

      // Simulate shipment creation (in real implementation, this would call carrier API)
      await this.simulateApiDelay();

      return {
        id: this.generateShipmentId(),
        trackingNumber,
        orderId: request.orderId,
        carrierId: this.carrierCode.toLowerCase(),
        serviceType: request.serviceType,
        status: ShipmentStatus.PENDING,
        originAddress: {
          firstName: "Bareloft",
          lastName: "Warehouse",
          company: "Bareloft Nigeria Ltd",
          addressLine1: "Plot 456, Ikorodu Industrial Estate",
          city: "Lagos",
          state: "Lagos",
          country: "NG",
          phoneNumber: "+234803000000",
        },
        destinationAddress: request.destinationAddress,
        packageWeight: request.packageWeight,
        packageDimensions: request.packageDimensions,
        declaredValue: request.declaredValue,
        shippingCost: rateResponse.cost,
        insuranceCost: request.insuranceRequired ? request.declaredValue * 0.01 : 0,
        estimatedDelivery: this.adjustForNigerianHolidays(estimatedDelivery),
        specialInstructions: request.specialInstructions,
        customerNotes: request.customerNotes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

    } catch (error: any) {
      this.handleCarrierError(error, 'shipment creation');
    }
  }

  /**
   * Track shipment (simulated for basic carrier)
   */
  async trackShipment(trackingNumber: string): Promise<TrackingResponse> {
    try {
      this.logCarrierOperation('trackShipment', { trackingNumber });

      // Simulate API call delay
      await this.simulateApiDelay();

      // Generate mock tracking data for demonstration
      const mockTrackingData = this.generateMockTrackingData(trackingNumber);

      return mockTrackingData;

    } catch (error: any) {
      this.handleCarrierError(error, 'shipment tracking');
    }
  }

  /**
   * Generate shipping label (basic implementation)
   */
  async generateShippingLabel(shipmentId: string): Promise<ShippingLabel> {
    try {
      this.logCarrierOperation('generateShippingLabel', { shipmentId });

      // Simulate API call
      await this.simulateApiDelay();

      const trackingNumber = `SLD${shipmentId.slice(-8)}`;

      return {
        trackingNumber,
        labelUrl: `https://labels.swiftlocal.ng/pdf/${trackingNumber}.pdf`,
        labelFormat: 'pdf',
        manifestNumber: `MAN${Date.now()}`,
        createdAt: new Date(),
      };

    } catch (error: any) {
      this.handleCarrierError(error, 'label generation');
    }
  }

  /**
   * Cancel shipment
   */
  async cancelShipment(shipmentId: string): Promise<boolean> {
    try {
      this.logCarrierOperation('cancelShipment', { shipmentId });

      // Simulate API call
      await this.simulateApiDelay();

      // Basic carriers usually allow cancellation within 24 hours
      return true;

    } catch (error: any) {
      this.handleCarrierError(error, 'shipment cancellation');
    }
  }

  // Private helper methods

  private isCoverageArea(state: string): boolean {
    return this.coverage.includes(state.toLowerCase());
  }

  private getBaseRate(state: string, city: string): number {
    const stateRate = this.baseRates[state.toLowerCase()];
    const cityRate = this.baseRates[city.toLowerCase()];
    
    // Use city-specific rate if available, otherwise use state rate
    return cityRate || stateRate || 3500; // Default rate for uncovered areas
  }

  private calculateWeightSurcharge(weight: number): number {
    // Basic weight surcharge: ₦200 per kg above 1kg
    return weight > 1 ? (weight - 1) * 200 : 0;
  }

  private getServiceSurcharge(serviceType: string): number {
    const surcharges = {
      'standard': 0,
      'express': 1000, // ₦1000 express surcharge
      'same-day': 2500, // ₦2500 same-day surcharge
    };
    
    return surcharges[serviceType as keyof typeof surcharges] || 0;
  }

  private generateLocalTrackingNumber(): string {
    const prefix = this.carrierCode.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const counter = (++this.shipmentCounter).toString().padStart(4, '0');
    return `${prefix}${timestamp}${counter}`;
  }

  private generateShipmentId(): string {
    return `shipment_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private async simulateApiDelay(): Promise<void> {
    // Simulate network delay typical of Nigerian infrastructure
    const delay = this.testMode ? 100 : Math.random() * 2000 + 500;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private generateMockTrackingData(trackingNumber: string): TrackingResponse {
    // Generate realistic mock tracking data for demonstration
    const statuses = [ShipmentStatus.PENDING, ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT];
    const currentStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    const mockEvents: TrackingEvent[] = [
      {
        id: 'evt_001',
        shipmentId: trackingNumber,
        status: ShipmentStatus.PENDING,
        location: 'Bareloft Warehouse',
        city: 'Lagos',
        state: 'Lagos',
        country: 'NG',
        description: 'Package received at origin facility',
        isPublic: true,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    ];

    if (currentStatus === ShipmentStatus.PICKED_UP || currentStatus === ShipmentStatus.IN_TRANSIT) {
      mockEvents.push({
        id: 'evt_002',
        shipmentId: trackingNumber,
        status: ShipmentStatus.PICKED_UP,
        location: 'Lagos Sorting Center',
        city: 'Lagos',
        state: 'Lagos',
        country: 'NG',
        description: 'Package picked up by delivery agent',
        isPublic: true,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      });
    }

    if (currentStatus === ShipmentStatus.IN_TRANSIT) {
      mockEvents.push({
        id: 'evt_003',
        shipmentId: trackingNumber,
        status: ShipmentStatus.IN_TRANSIT,
        location: 'En route to destination',
        city: 'Lagos',
        state: 'Lagos',
        country: 'NG',
        description: 'Package in transit to destination city',
        isPublic: true,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      });
    }

    return {
      trackingNumber,
      status: currentStatus,
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      currentLocation: mockEvents[mockEvents.length - 1].location,
      progress: {
        percentage: this.getStatusPercentage(currentStatus),
        currentStep: this.getStatusDescription(currentStatus),
        nextStep: this.getNextStep(currentStatus),
      },
      events: mockEvents,
      deliveryAttempts: [],
    };
  }

  private getStatusPercentage(status: ShipmentStatus): number {
    const percentages = {
      [ShipmentStatus.PENDING]: 10,
      [ShipmentStatus.PICKED_UP]: 30,
      [ShipmentStatus.IN_TRANSIT]: 60,
      [ShipmentStatus.OUT_FOR_DELIVERY]: 85,
      [ShipmentStatus.DELIVERED]: 100,
    };
    return percentages[status] || 0;
  }

  private getStatusDescription(status: ShipmentStatus): string {
    const descriptions = {
      [ShipmentStatus.PENDING]: 'Package Received',
      [ShipmentStatus.PICKED_UP]: 'Package Picked Up',
      [ShipmentStatus.IN_TRANSIT]: 'In Transit',
      [ShipmentStatus.OUT_FOR_DELIVERY]: 'Out for Delivery',
      [ShipmentStatus.DELIVERED]: 'Delivered',
    };
    return descriptions[status] || 'Unknown Status';
  }

  private getNextStep(status: ShipmentStatus): string | undefined {
    const nextSteps = {
      [ShipmentStatus.PENDING]: 'Pickup Scheduled',
      [ShipmentStatus.PICKED_UP]: 'In Transit',
      [ShipmentStatus.IN_TRANSIT]: 'Out for Delivery',
      [ShipmentStatus.OUT_FOR_DELIVERY]: 'Delivered',
      [ShipmentStatus.DELIVERED]: undefined,
    };
    return nextSteps[status];
  }
}