import { BaseController } from "../BaseController";
import { Request, Response } from "express";
import { HTTP_STATUS, ERROR_CODES, createSuccessResponse, createErrorResponse } from "../../types";
import { ShippingService } from "../../services/shipping/ShippingService";
import { body, query, validationResult } from "express-validator";

// Type definitions for customer shipping requests
interface CustomerShippingRateRequest {
  originCity?: string;
  originState?: string;
  destinationCity: string;
  destinationState: string;
  packageWeight: number;
  packageDimensions?: {
    length: number;
    width: number;
    height: number;
  };
  declaredValue: number;
  serviceType?: string;
}

interface ShippingRateResponse {
  carrierId: string;
  carrierName: string;
  serviceType: string;
  cost: number;
  currency: string;
  estimatedDays: number;
  estimatedDelivery: string;
  additionalFees?: {
    fuelSurcharge: number;
    insurance: number;
    vat: number;
  };
}

/**
 * Customer Shipping Controller
 * Handles public shipping-related operations for customers
 */
export class ShippingController extends BaseController {
  private shippingService: ShippingService;

  constructor() {
    super();
    this.shippingService = new ShippingService();
  }

  /**
   * Get available shipping rates for package
   */
  public getRates = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🚚 [SHIPPING CONTROLLER] Starting getRates request');
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ [SHIPPING CONTROLLER] Validation failed:', errors.array());
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          createErrorResponse(
            'Validation failed',
            ERROR_CODES.VALIDATION_ERROR,
            errors.array().map(err => err.msg).join(', ')
          )
        );
        return;
      }

      const {
        originCity = "Lagos",
        originState = "Lagos",
        destinationCity,
        destinationState,
        packageWeight,
        packageDimensions,
        declaredValue,
        serviceType
      } = req.body as CustomerShippingRateRequest;

      console.log('📊 [SHIPPING CONTROLLER] Request parameters:', {
        originCity,
        originState,
        destinationCity,
        destinationState,
        packageWeight,
        packageDimensions,
        declaredValue,
        serviceType
      });

      // Format request for shipping service
      const shippingRequest = {
        originAddress: {
          street: "",
          city: originCity,
          state: originState,
          postalCode: "",
          country: "Nigeria"
        },
        destinationAddress: {
          street: "",
          city: destinationCity,
          state: destinationState,
          postalCode: "",
          country: "Nigeria"
        },
        originCity,
        originState,
        destinationCity,
        destinationState,
        packageWeight,
        packageDimensions: packageDimensions || {
          length: 30,
          width: 25,
          height: 15
        },
        declaredValue,
        serviceType
      };

      // Get rates from shipping service
      console.log('🔄 [SHIPPING CONTROLLER] Calling shippingService.calculateShippingRates');
      const rates = await this.shippingService.calculateShippingRates(shippingRequest);
      console.log('✅ [SHIPPING CONTROLLER] Received rates from service:', rates?.length || 0, 'rates');

      // Format response for customer API
      const formattedRates: ShippingRateResponse[] = rates.map(rate => ({
        carrierId: rate.carrierId,
        carrierName: rate.carrierName,
        serviceType: rate.serviceType,
        cost: rate.cost,
        currency: rate.currency,
        estimatedDays: rate.transitTime || this.calculateEstimatedDays(rate.estimatedDelivery),
        estimatedDelivery: rate.estimatedDelivery.toISOString(),
        additionalFees: this.calculateAdditionalFees(rate.cost)
      }));

      res.status(HTTP_STATUS.OK).json(
        createSuccessResponse(
          formattedRates,
          'Shipping rates calculated successfully'
        )
      );
    } catch (error) {
      console.error('Error calculating shipping rates:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'Failed to calculate shipping rates',
          ERROR_CODES.INTERNAL_ERROR,
          error instanceof Error ? error.message : 'Unknown error'
        )
      );
    }
  };

  /**
   * Get available shipping carriers
   */
  public getCarriers = async (req: Request, res: Response): Promise<void> => {
    try {
      const carriers = await this.shippingService.getAvailableCarriers();

      // Filter and format carriers for customer API
      const customerCarriers = carriers
        .filter(carrier => carrier.status === 'ACTIVE')
        .map(carrier => ({
          id: carrier.id,
          name: carrier.name,
          code: carrier.code,
          type: carrier.type,
          status: carrier.status,
          coverageAreas: carrier.coverageAreas,
          deliveryTimeframes: carrier.deliveryTimeframes,
          contactInfo: {
            phone: carrier.contactInfo.phone,
            email: carrier.contactInfo.email,
            website: carrier.contactInfo.website
          }
        }));

      res.status(HTTP_STATUS.OK).json(
        createSuccessResponse(
          customerCarriers,
          'Available shipping carriers retrieved successfully'
        )
      );
    } catch (error) {
      console.error('Error fetching carriers:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'Failed to fetch shipping carriers',
          ERROR_CODES.INTERNAL_ERROR,
          error instanceof Error ? error.message : 'Unknown error'
        )
      );
    }
  };

  /**
   * Get shipping zones
   */
  public getZones = async (req: Request, res: Response): Promise<void> => {
    try {
      // Mock implementation - replace with actual service call
      const zones = [
        {
          id: 'zone_lagos',
          name: 'Lagos Metropolitan',
          states: ['Lagos'],
          cities: ['Lagos', 'Ikeja', 'Victoria Island', 'Ikoyi', 'Surulere'],
          baseRate: 1500,
          deliveryDays: 1,
          expressDeliveryDays: 0, // Same day available
          isActive: true
        },
        {
          id: 'zone_southwest',
          name: 'Southwest Nigeria',
          states: ['Ogun', 'Oyo', 'Osun', 'Ondo', 'Ekiti'],
          cities: ['Abeokuta', 'Ibadan', 'Ife', 'Akure', 'Ado-Ekiti'],
          baseRate: 2500,
          deliveryDays: 3,
          expressDeliveryDays: 2,
          isActive: true
        },
        {
          id: 'zone_abuja',
          name: 'Federal Capital Territory',
          states: ['FCT'],
          cities: ['Abuja', 'Gwagwalada', 'Kuje', 'Bwari'],
          baseRate: 2000,
          deliveryDays: 2,
          expressDeliveryDays: 1,
          isActive: true
        },
        {
          id: 'zone_south_south',
          name: 'South-South Nigeria',
          states: ['Rivers', 'Delta', 'Bayelsa', 'Cross River', 'Akwa Ibom', 'Edo'],
          cities: ['Port Harcourt', 'Warri', 'Yenagoa', 'Calabar', 'Uyo', 'Benin'],
          baseRate: 3000,
          deliveryDays: 4,
          expressDeliveryDays: 3,
          isActive: true
        },
        {
          id: 'zone_southeast',
          name: 'Southeast Nigeria', 
          states: ['Anambra', 'Imo', 'Abia', 'Enugu', 'Ebonyi'],
          cities: ['Awka', 'Owerri', 'Umuahia', 'Enugu', 'Abakaliki'],
          baseRate: 3500,
          deliveryDays: 5,
          expressDeliveryDays: 3,
          isActive: true
        }
      ];

      res.status(HTTP_STATUS.OK).json(
        createSuccessResponse(
          zones,
          'Shipping zones retrieved successfully'
        )
      );
    } catch (error) {
      console.error('Error fetching shipping zones:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'Failed to fetch shipping zones',
          ERROR_CODES.INTERNAL_ERROR,
          error instanceof Error ? error.message : 'Unknown error'
        )
      );
    }
  };

  /**
   * Track shipment by tracking number
   */
  public trackShipment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { trackingNumber } = req.params;

      if (!trackingNumber) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          createErrorResponse(
            'Tracking number is required',
            ERROR_CODES.VALIDATION_ERROR
          )
        );
        return;
      }

      const trackingInfo = await this.shippingService.trackShipment(trackingNumber);

      res.status(HTTP_STATUS.OK).json(
        createSuccessResponse(
          trackingInfo,
          'Shipment tracking information retrieved successfully'
        )
      );
    } catch (error) {
      console.error('Error tracking shipment:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          'Failed to track shipment',
          ERROR_CODES.INTERNAL_ERROR,
          error instanceof Error ? error.message : 'Unknown error'
        )
      );
    }
  };

  /**
   * Calculate estimated delivery days from delivery date
   */
  private calculateEstimatedDays(estimatedDelivery: Date): number {
    const now = new Date();
    const diffTime = estimatedDelivery.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  }

  /**
   * Calculate additional fees (fuel surcharge, insurance, VAT)
   */
  private calculateAdditionalFees(baseCost: number) {
    const fuelSurcharge = baseCost * 0.05; // 5% fuel surcharge
    const insurance = baseCost * 0.02; // 2% insurance
    const vat = (baseCost + fuelSurcharge + insurance) * 0.075; // 7.5% VAT

    return {
      fuelSurcharge: Math.round(fuelSurcharge),
      insurance: Math.round(insurance),
      vat: Math.round(vat)
    };
  }

  /**
   * Generate unique request ID for tracking
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default ShippingController;