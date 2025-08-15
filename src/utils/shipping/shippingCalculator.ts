/**
 * Shipping Cost Calculator
 * Calculates shipping costs for Nigerian e-commerce
 * Supports multiple carriers and delivery methods
 */

import { logger } from '../logger/winston';

interface ShippingCalculationInput {
  origin: string;
  destination: string;
  weight: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  value?: number;
  service?: 'standard' | 'express' | 'return' | 'overnight';
  carrier?: 'gig' | 'dhl' | 'ups' | 'nipost' | 'kwik' | 'max';
}

interface ShippingCostResult {
  cost: number;
  currency: string;
  estimatedDays: number;
  service: string;
  carrier: string;
  breakdown?: {
    baseCost: number;
    weightCost: number;
    distanceCost: number;
    serviceFee: number;
    insuranceFee: number;
    taxes: number; // Always 0 - no VAT
  };
}

/**
 * Nigerian states and their shipping zones
 */
const NIGERIAN_SHIPPING_ZONES = {
  // Zone 1 - Lagos Metro (Fastest, cheapest)
  zone1: ['Lagos'],
  
  // Zone 2 - Major Cities (Fast delivery)
  zone2: ['FCT', 'Rivers', 'Kano', 'Oyo', 'Kaduna', 'Anambra'],
  
  // Zone 3 - State Capitals (Standard delivery)
  zone3: [
    'Ogun', 'Delta', 'Enugu', 'Edo', 'Plateau', 'Akwa Ibom', 'Imo', 'Ondo',
    'Osun', 'Abia', 'Ekiti', 'Kwara', 'Cross River', 'Adamawa', 'Borno'
  ],
  
  // Zone 4 - Remote Areas (Slower, more expensive)
  zone4: [
    'Bauchi', 'Gombe', 'Jigawa', 'Kebbi', 'Kogi', 'Nasarawa', 'Niger',
    'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'Ebonyi', 'Bayelsa'
  ]
};

/**
 * Base shipping rates by zone (in kobo)
 */
const BASE_RATES = {
  zone1: {
    standard: 50000, // ₦500
    express: 100000, // ₦1000
    overnight: 200000, // ₦2000
    return: 30000 // ₦300
  },
  zone2: {
    standard: 75000, // ₦750
    express: 150000, // ₦1500
    overnight: 300000, // ₦3000
    return: 50000 // ₦500
  },
  zone3: {
    standard: 100000, // ₦1000
    express: 200000, // ₦2000
    overnight: 400000, // ₦4000
    return: 75000 // ₦750
  },
  zone4: {
    standard: 150000, // ₦1500
    express: 300000, // ₦3000
    overnight: 600000, // ₦6000
    return: 100000 // ₦1000
  }
};

/**
 * Weight multipliers (per kg above 1kg)
 */
const WEIGHT_MULTIPLIERS = {
  standard: 10000, // ₦100 per kg
  express: 15000,  // ₦150 per kg
  overnight: 20000, // ₦200 per kg
  return: 8000     // ₦80 per kg
};

/**
 * Delivery time estimates by zone and service
 */
const DELIVERY_ESTIMATES = {
  zone1: {
    standard: { min: 1, max: 2 },
    express: { min: 1, max: 1 },
    overnight: { min: 1, max: 1 },
    return: { min: 1, max: 3 }
  },
  zone2: {
    standard: { min: 2, max: 3 },
    express: { min: 1, max: 2 },
    overnight: { min: 1, max: 1 },
    return: { min: 2, max: 4 }
  },
  zone3: {
    standard: { min: 3, max: 5 },
    express: { min: 2, max: 3 },
    overnight: { min: 1, max: 2 },
    return: { min: 3, max: 7 }
  },
  zone4: {
    standard: { min: 5, max: 7 },
    express: { min: 3, max: 5 },
    overnight: { min: 2, max: 3 },
    return: { min: 5, max: 10 }
  }
};

/**
 * Calculate shipping cost
 */
export async function calculateShippingCost(input: ShippingCalculationInput): Promise<number> {
  try {
    const result = await calculateDetailedShippingCost(input);
    return result.cost;
  } catch (error) {
    logger.error('Error calculating shipping cost', {
      error: error instanceof Error ? error.message : 'Unknown error',
      input
    });
    
    // Return fallback cost
    return getFallbackShippingCost(input.destination, input.service);
  }
}

/**
 * Calculate detailed shipping cost with breakdown
 */
export async function calculateDetailedShippingCost(
  input: ShippingCalculationInput
): Promise<ShippingCostResult> {
  try {
    const zone = getShippingZone(input.destination);
    const service = input.service || 'standard';
    const weight = parseWeight(input.weight);
    
    // Get base rate for zone and service
    const baseRate = BASE_RATES[zone][service as keyof typeof BASE_RATES[typeof zone]];
    if (!baseRate) {
      throw new Error(`Invalid service type: ${service}`);
    }
    
    // Calculate weight-based cost (for items over 1kg)
    const extraWeight = Math.max(0, weight - 1);
    const weightCost = extraWeight * WEIGHT_MULTIPLIERS[service as keyof typeof WEIGHT_MULTIPLIERS];
    
    // Distance cost (already included in zone-based pricing)
    const distanceCost = 0;
    
    // Service fees
    const serviceFee = calculateServiceFee(service, zone);
    
    // Insurance (for high-value items)
    const insuranceFee = calculateInsuranceFee(input.value || 0);
    
    // No VAT applied for this platform
    const subtotal = baseRate + weightCost + distanceCost + serviceFee + insuranceFee;
    const taxes = 0; // VAT not applicable
    
    const totalCost = subtotal;
    
    // Get delivery estimate
    const estimate = DELIVERY_ESTIMATES[zone][service as keyof typeof DELIVERY_ESTIMATES[typeof zone]];
    const estimatedDays = Math.round((estimate.min + estimate.max) / 2);
    
    return {
      cost: totalCost,
      currency: 'NGN',
      estimatedDays,
      service: service,
      carrier: input.carrier || getDefaultCarrier(zone, service),
      breakdown: {
        baseCost: baseRate,
        weightCost,
        distanceCost,
        serviceFee,
        insuranceFee,
        taxes
      }
    };
    
  } catch (error) {
    logger.error('Error calculating detailed shipping cost', {
      error: error instanceof Error ? error.message : 'Unknown error',
      input
    });
    
    // Return fallback result
    const fallbackCost = getFallbackShippingCost(input.destination, input.service);
    return {
      cost: fallbackCost,
      currency: 'NGN',
      estimatedDays: 5,
      service: input.service || 'standard',
      carrier: input.carrier || 'gig'
    };
  }
}

/**
 * Get shipping zone for a Nigerian state
 */
function getShippingZone(state: string): 'zone1' | 'zone2' | 'zone3' | 'zone4' {
  const cleanState = state.trim();
  
  if (NIGERIAN_SHIPPING_ZONES.zone1.includes(cleanState)) return 'zone1';
  if (NIGERIAN_SHIPPING_ZONES.zone2.includes(cleanState)) return 'zone2';
  if (NIGERIAN_SHIPPING_ZONES.zone3.includes(cleanState)) return 'zone3';
  
  // Default to zone4 for unlisted states
  return 'zone4';
}

/**
 * Parse weight string to number (in kg)
 */
function parseWeight(weight: string): number {
  try {
    // Handle formats like "2.5kg", "1500g", "2.5", "1500"
    const cleanWeight = weight.toLowerCase().replace(/[^\d.]/g, '');
    const numericWeight = parseFloat(cleanWeight);
    
    if (isNaN(numericWeight)) return 1; // Default to 1kg
    
    // Convert grams to kg if weight seems to be in grams (>50)
    if (numericWeight > 50) {
      return numericWeight / 1000;
    }
    
    return Math.max(0.1, numericWeight); // Minimum 0.1kg
  } catch (error) {
    logger.warn('Error parsing weight, using default', { weight });
    return 1; // Default to 1kg
  }
}

/**
 * Calculate service-specific fees
 */
function calculateServiceFee(service: string, zone: string): number {
  const fees = {
    standard: 0,
    express: 5000, // ₦50 express handling
    overnight: 10000, // ₦100 priority handling
    return: 0 // No additional fee for returns
  };
  
  return fees[service as keyof typeof fees] || 0;
}

/**
 * Calculate insurance fee for valuable items
 */
function calculateInsuranceFee(value: number): number {
  if (value <= 0) return 0;
  
  // Insurance: 0.5% of item value, minimum ₦50, maximum ₦5000
  const insuranceRate = 0.005;
  const calculatedFee = value * 100 * insuranceRate; // Convert to kobo
  
  return Math.min(Math.max(calculatedFee, 5000), 500000);
}

/**
 * Get default carrier for zone and service
 */
function getDefaultCarrier(zone: string, service: string): string {
  if (service === 'overnight') return 'dhl';
  if (zone === 'zone1' || zone === 'zone2') return 'gig';
  if (zone === 'zone3') return 'kwik';
  return 'nipost'; // Zone 4 and fallback
}

/**
 * Get fallback shipping cost when calculation fails
 */
function getFallbackShippingCost(destination: string, service?: string): number {
  const zone = getShippingZone(destination);
  const serviceType = service || 'standard';
  
  return BASE_RATES[zone][serviceType as keyof typeof BASE_RATES[typeof zone]] || 100000; // ₦1000 fallback
}

/**
 * Get available shipping options for a destination
 */
export async function getShippingOptions(destination: string, weight?: string): Promise<{
  service: string;
  cost: number;
  estimatedDays: number;
  carrier: string;
  description: string;
}[]> {
  try {
    const zone = getShippingZone(destination);
    const parsedWeight = weight ? parseWeight(weight) : 1;
    
    const services = ['standard', 'express', 'overnight'];
    const options = [];
    
    for (const service of services) {
      try {
        const result = await calculateDetailedShippingCost({
          origin: 'Lagos',
          destination,
          weight: parsedWeight.toString(),
          service: service as any
        });
        
        options.push({
          service,
          cost: result.cost,
          estimatedDays: result.estimatedDays,
          carrier: result.carrier,
          description: getServiceDescription(service, result.estimatedDays)
        });
      } catch (error) {
        logger.warn(`Error calculating cost for ${service}`, { error, destination });
      }
    }
    
    return options.sort((a, b) => a.cost - b.cost);
  } catch (error) {
    logger.error('Error getting shipping options', {
      error: error instanceof Error ? error.message : 'Unknown error',
      destination
    });
    
    // Return basic fallback options
    return [
      {
        service: 'standard',
        cost: 100000,
        estimatedDays: 5,
        carrier: 'gig',
        description: 'Standard delivery (5 business days)'
      }
    ];
  }
}

/**
 * Get service description
 */
function getServiceDescription(service: string, estimatedDays: number): string {
  const descriptions = {
    standard: `Standard delivery (${estimatedDays} business days)`,
    express: `Express delivery (${estimatedDays} business days)`,
    overnight: `Overnight delivery (next business day)`,
    return: `Return shipping (${estimatedDays} business days)`
  };
  
  return descriptions[service as keyof typeof descriptions] || 'Standard delivery';
}

/**
 * Check if overnight delivery is available
 */
export function isOvernightAvailable(destination: string): boolean {
  const zone = getShippingZone(destination);
  // Overnight only available in zone1 and zone2
  return zone === 'zone1' || zone === 'zone2';
}

/**
 * Calculate bulk shipping discount
 */
export function calculateBulkDiscount(totalWeight: number, itemCount: number): number {
  if (itemCount < 3) return 0;
  
  // 5% discount for 3-5 items, 10% for 6-10 items, 15% for 10+ items
  if (itemCount >= 10) return 0.15;
  if (itemCount >= 6) return 0.10;
  return 0.05;
}

/**
 * Calculate free shipping eligibility
 */
export function calculateFreeShipping(
  orderValue: number,
  destination: string,
  customerTier: 'regular' | 'premium' | 'vip' = 'regular'
): {
  eligible: boolean;
  threshold: number;
  remaining: number;
} {
  const zone = getShippingZone(destination);
  
  // Free shipping thresholds by zone and customer tier
  const thresholds = {
    zone1: { regular: 2500000, premium: 2000000, vip: 1500000 }, // ₦25k, ₦20k, ₦15k
    zone2: { regular: 3000000, premium: 2500000, vip: 2000000 }, // ₦30k, ₦25k, ₦20k
    zone3: { regular: 5000000, premium: 4000000, vip: 3000000 }, // ₦50k, ₦40k, ₦30k
    zone4: { regular: 7500000, premium: 6000000, vip: 4500000 }  // ₦75k, ₦60k, ₦45k
  };
  
  const threshold = thresholds[zone][customerTier];
  const orderValueInKobo = orderValue * 100; // Convert to kobo
  
  return {
    eligible: orderValueInKobo >= threshold,
    threshold: threshold / 100, // Convert back to naira
    remaining: Math.max(0, (threshold - orderValueInKobo) / 100)
  };
}

/**
 * Validate Nigerian address for shipping
 */
export function validateShippingAddress(address: {
  state: string;
  city: string;
  addressLine1: string;
  postalCode?: string;
}): {
  valid: boolean;
  errors: string[];
  suggestions?: string[];
} {
  const errors: string[] = [];
  const suggestions: string[] = [];
  
  // Validate state
  const allStates = [
    ...NIGERIAN_SHIPPING_ZONES.zone1,
    ...NIGERIAN_SHIPPING_ZONES.zone2,
    ...NIGERIAN_SHIPPING_ZONES.zone3,
    ...NIGERIAN_SHIPPING_ZONES.zone4
  ];
  
  if (!allStates.includes(address.state)) {
    errors.push('Invalid or unsupported state for shipping');
    suggestions.push('Please select a valid Nigerian state');
  }
  
  // Validate required fields
  if (!address.city?.trim()) {
    errors.push('City is required');
  }
  
  if (!address.addressLine1?.trim()) {
    errors.push('Street address is required');
  }
  
  if (address.addressLine1 && address.addressLine1.length < 10) {
    errors.push('Street address seems too short');
    suggestions.push('Please provide a more detailed address including landmarks');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    suggestions: suggestions.length > 0 ? suggestions : undefined
  };
}