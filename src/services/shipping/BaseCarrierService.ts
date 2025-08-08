import { BaseService } from "../BaseService";
import {
  ShipmentRateRequest,
  ShipmentRateResponse,
  CreateShipmentRequest,
  Shipment,
  TrackingResponse,
  ShippingLabel,
  CarrierAPIResponse,
  NigerianAddress,
  PackageDimensions,
} from "../../types";
import { AppError, HTTP_STATUS, ERROR_CODES } from "../../types";

/**
 * Base Carrier Service - Abstract class for Nigerian shipping carriers
 * Provides common functionality for Jumia Logistics and local carriers
 */
export abstract class BaseCarrierService extends BaseService {
  protected carrierName: string;
  protected carrierCode: string;
  protected apiBaseUrl: string;
  protected apiKey: string;
  protected testMode: boolean;

  constructor(
    carrierName: string,
    carrierCode: string,
    apiBaseUrl: string,
    apiKey: string,
    testMode = true
  ) {
    super();
    this.carrierName = carrierName;
    this.carrierCode = carrierCode;
    this.apiBaseUrl = apiBaseUrl;
    this.apiKey = apiKey;
    this.testMode = testMode;
  }

  // Abstract methods that must be implemented by each carrier
  abstract calculateShippingRate(request: ShipmentRateRequest): Promise<ShipmentRateResponse>;
  abstract createShipment(request: CreateShipmentRequest): Promise<Shipment>;
  abstract trackShipment(trackingNumber: string): Promise<TrackingResponse>;
  abstract generateShippingLabel(shipmentId: string): Promise<ShippingLabel>;
  abstract cancelShipment(shipmentId: string): Promise<boolean>;

  // Common helper methods for Nigerian carriers

  /**
   * Validate Nigerian address for shipping
   */
  protected validateNigerianAddress(address: NigerianAddress): boolean {
    if (!address.state || !this.isValidNigerianState(address.state)) {
      return false;
    }

    if (!address.phoneNumber || !this.isValidNigerianPhone(address.phoneNumber)) {
      return false;
    }

    if (!address.city || address.city.trim().length < 2) {
      return false;
    }

    if (!address.addressLine1 || address.addressLine1.trim().length < 5) {
      return false;
    }

    return true;
  }

  /**
   * Check if state is a valid Nigerian state
   */
  protected isValidNigerianState(state: string): boolean {
    const nigerianStates = [
      'Lagos', 'Abuja', 'Kano', 'Rivers', 'Oyo', 'Kaduna', 'Ogun', 'Imo', 
      'Plateau', 'Akwa Ibom', 'Abia', 'Adamawa', 'Anambra', 'Bauchi', 
      'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 
      'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Jigawa', 'Kebbi', 'Kogi', 
      'Kwara', 'Nasarawa', 'Niger', 'Ondo', 'Osun', 'Sokoto', 'Taraba', 
      'Yobe', 'Zamfara', 'FCT'
    ];
    return nigerianStates.includes(state) || nigerianStates.includes(state.toLowerCase());
  }

  /**
   * Validate Nigerian phone number format
   */
  protected isValidNigerianPhone(phone: string): boolean {
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    // Nigerian phone formats: +234XXXXXXXXX, 234XXXXXXXXX, 0XXXXXXXXXX
    const nigerianPhoneRegex = /^(\+234|234|0)[789][01]\d{8}$/;
    return nigerianPhoneRegex.test(cleanPhone);
  }

  /**
   * Calculate delivery timeframe based on Nigerian logistics
   */
  protected calculateDeliveryDays(originState: string, destinationState: string, serviceType: string): number {
    const origin = originState.toLowerCase();
    const destination = destinationState.toLowerCase();

    // Same state delivery
    if (origin === destination) {
      return serviceType === 'express' ? 1 : 2;
    }

    // Major city pairs (Lagos-Abuja corridor)
    const majorCities = ['lagos', 'abuja', 'fct', 'kano', 'port harcourt', 'rivers'];
    if (majorCities.includes(origin) && majorCities.includes(destination)) {
      return serviceType === 'express' ? 2 : 3;
    }

    // Regional delivery (Southwest, Southeast, etc.)
    const stateRegions = this.getStateRegion(origin) === this.getStateRegion(destination);
    if (stateRegions) {
      return serviceType === 'express' ? 3 : 4;
    }

    // Cross-regional delivery
    return serviceType === 'express' ? 4 : 6;
  }

  /**
   * Get Nigerian state region for delivery calculation
   */
  protected getStateRegion(state: string): string {
    const stateRegions: { [region: string]: string[] } = {
      southwest: ['lagos', 'ogun', 'oyo', 'osun', 'ondo', 'ekiti'],
      southeast: ['abia', 'anambra', 'ebonyi', 'enugu', 'imo'],
      southsouth: ['rivers', 'bayelsa', 'delta', 'edo', 'cross river', 'akwa ibom'],
      northcentral: ['abuja', 'fct', 'kwara', 'kogi', 'nasarawa', 'niger', 'plateau', 'benue'],
      northeast: ['adamawa', 'bauchi', 'borno', 'gombe', 'taraba', 'yobe'],
      northwest: ['kaduna', 'kano', 'jigawa', 'kebbi', 'sokoto', 'zamfara', 'katsina']
    };

    for (const [region, states] of Object.entries(stateRegions)) {
      if (states.includes(state.toLowerCase())) {
        return region;
      }
    }
    return 'unknown';
  }

  /**
   * Calculate dimensional weight (Nigerian standard: 5000 cm³/kg)
   */
  protected calculateDimensionalWeight(dimensions: PackageDimensions): number {
    const volumetricWeight = (dimensions.length * dimensions.width * dimensions.height) / 5000;
    return Math.max(dimensions.weight, volumetricWeight);
  }

  /**
   * Apply Nigerian shipping surcharges
   */
  protected applyNigerianSurcharges(baseRate: number, state: string, serviceType: string): number {
    let finalRate = baseRate;

    // Remote area surcharge for certain states
    const remoteStates = ['borno', 'yobe', 'taraba', 'adamawa', 'gombe', 'bauchi'];
    if (remoteStates.includes(state.toLowerCase())) {
      finalRate *= 1.15; // 15% surcharge
    }

    // Express service surcharge
    if (serviceType === 'express') {
      finalRate *= 1.5; // 50% surcharge for express
    } else if (serviceType === 'same-day') {
      finalRate *= 2.0; // 100% surcharge for same-day
    }

    // Fuel surcharge (common in Nigerian logistics)
    finalRate *= 1.08; // 8% fuel surcharge

    return Math.round(finalRate * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Check if delivery is possible during Nigerian business hours
   */
  protected isBusinessHoursDelivery(deliveryTime: Date): boolean {
    const hour = deliveryTime.getHours();
    const day = deliveryTime.getDay();

    // Monday to Friday: 8 AM - 6 PM
    // Saturday: 9 AM - 4 PM
    // Sunday: No delivery
    
    if (day === 0) return false; // Sunday

    if (day >= 1 && day <= 5) {
      return hour >= 8 && hour <= 18;
    }

    if (day === 6) {
      return hour >= 9 && hour <= 16;
    }

    return false;
  }

  /**
   * Adjust delivery date for Nigerian holidays and weekends
   */
  protected adjustForNigerianHolidays(deliveryDate: Date): Date {
    const adjustedDate = new Date(deliveryDate);

    // Skip weekends
    while (adjustedDate.getDay() === 0 || adjustedDate.getDay() === 6) {
      adjustedDate.setDate(adjustedDate.getDate() + 1);
    }

    // Check for Nigerian public holidays (simplified - in production, use a proper holiday calendar)
    const nigerianHolidays = [
      '01-01', // New Year's Day
      '10-01', // Independence Day
      '12-25', // Christmas Day
      '12-26', // Boxing Day
    ];

    const dateString = `${(adjustedDate.getMonth() + 1).toString().padStart(2, '0')}-${adjustedDate.getDate().toString().padStart(2, '0')}`;
    if (nigerianHolidays.includes(dateString)) {
      adjustedDate.setDate(adjustedDate.getDate() + 1);
      return this.adjustForNigerianHolidays(adjustedDate); // Recursive check
    }

    return adjustedDate;
  }

  /**
   * Handle carrier API errors with Nigerian context
   */
  protected handleCarrierError(error: any, operation: string): never {
    let errorMessage = `${this.carrierName} ${operation} failed`;
    let errorCode = ERROR_CODES.EXTERNAL_SERVICE_ERROR;
    let statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;

    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          errorMessage = `${this.carrierName} authentication failed. Please check API credentials.`;
          errorCode = ERROR_CODES.EXTERNAL_SERVICE_ERROR;
          statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
          break;
        case 400:
          errorMessage = `Invalid request to ${this.carrierName}: ${data?.message || 'Bad request'}`;
          errorCode = ERROR_CODES.EXTERNAL_SERVICE_ERROR;
          statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
          break;
        case 404:
          errorMessage = `${this.carrierName} resource not found: ${data?.message || 'Not found'}`;
          errorCode = ERROR_CODES.EXTERNAL_SERVICE_ERROR;
          statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
          break;
        case 429:
          errorMessage = `${this.carrierName} API rate limit exceeded. Please try again later.`;
          errorCode = ERROR_CODES.EXTERNAL_SERVICE_ERROR;
          statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
          break;
        case 500:
        case 502:
        case 503:
          errorMessage = `${this.carrierName} service temporarily unavailable. Nigerian logistics networks may experience delays.`;
          break;
        default:
          errorMessage = `${this.carrierName} API error (${status}): ${data?.message || 'Unknown error'}`;
      }
    } else if (error.code) {
      switch (error.code) {
        case 'ECONNREFUSED':
        case 'ENOTFOUND':
          errorMessage = `Cannot connect to ${this.carrierName} API. Network issues common in Nigerian infrastructure.`;
          break;
        case 'ETIMEDOUT':
          errorMessage = `${this.carrierName} API timeout. Nigerian network latency may be affecting service.`;
          break;
        default:
          errorMessage = `Network error connecting to ${this.carrierName}: ${error.message}`;
      }
    }

    this.logger.error(`${this.carrierName} API Error`, {
      operation,
      error: error.message,
      response: error.response?.data,
      carrierCode: this.carrierCode,
      testMode: this.testMode,
    });

    throw new AppError(errorMessage, statusCode, errorCode);
  }

  /**
   * Create standardized carrier API response
   */
  protected createCarrierResponse<T>(
    success: boolean,
    data?: T,
    error?: { code: string; message: string; details?: any },
    metadata?: any
  ): CarrierAPIResponse<T> {
    return {
      success,
      data,
      error,
      metadata: {
        requestId: this.generateRequestId(),
        timestamp: new Date(),
        carrierResponseTime: metadata?.responseTime || 0,
        ...metadata,
      },
    };
  }

  /**
   * Generate unique request ID for tracking
   */
  protected generateRequestId(): string {
    return `${this.carrierCode}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Log carrier operation with Nigerian context
   */
  protected logCarrierOperation(operation: string, data: any): void {
    this.logger.info(`${this.carrierName} Operation`, {
      operation,
      carrierCode: this.carrierCode,
      testMode: this.testMode,
      data: this.testMode ? data : '[REDACTED]', // Don't log sensitive data in production
      timestamp: new Date().toISOString(),
    });
  }
}