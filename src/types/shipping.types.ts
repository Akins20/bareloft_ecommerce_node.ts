export enum ShippingCarrierStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  MAINTENANCE = "MAINTENANCE",
}

export enum ShipmentStatus {
  PENDING = "PENDING",
  PICKED_UP = "PICKED_UP",
  IN_TRANSIT = "IN_TRANSIT",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  FAILED_DELIVERY = "FAILED_DELIVERY",
  RETURNED = "RETURNED",
  CANCELLED = "CANCELLED",
}

export enum DeliveryAttemptStatus {
  SUCCESSFUL = "SUCCESSFUL",
  FAILED_NO_ONE_HOME = "FAILED_NO_ONE_HOME",
  FAILED_WRONG_ADDRESS = "FAILED_WRONG_ADDRESS",
  FAILED_REFUSED = "FAILED_REFUSED",
  FAILED_DAMAGED = "FAILED_DAMAGED",
  RESCHEDULED = "RESCHEDULED",
}

export interface NigerianAddress {
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  lga?: string; // Local Government Area
  postalCode?: string;
  country: string;
  phoneNumber: string;
  landmarkInstructions?: string;
}

export interface PackageDimensions {
  length: number; // cm
  width: number;  // cm
  height: number; // cm
  weight: number; // kg
}

export interface ShippingCarrier {
  id: string;
  name: string;
  code: string;
  type: "express" | "standard" | "economy";
  status: ShippingCarrierStatus;
  baseUrl?: string;
  supportedServices: string[];
  coverageAreas: string[]; // Nigerian states
  businessHours: {
    weekdays: { start: string; end: string };
    saturday: { start: string; end: string };
    sunday?: { start: string; end: string };
  };
  maxWeight?: number;
  maxDimensions?: PackageDimensions;
  deliveryTimeframes: {
    [zone: string]: {
      standard: number; // days
      express?: number; // days
      sameDay?: boolean;
    };
  };
  contactInfo: {
    phone: string;
    email: string;
    website?: string;
  };
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShippingZone {
  id: string;
  name: string;
  states: string[];
  cities?: string[];
  postalCodes?: string[];
  baseRate: number;
  weightMultiplier: number;
  deliveryDays: number;
  expressDeliveryDays?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShippingRate {
  id: string;
  carrierId: string;
  carrier?: ShippingCarrier;
  zoneId: string;
  zone?: ShippingZone;
  serviceType: "standard" | "express" | "same-day";
  minWeight: number;
  maxWeight: number;
  baseRate: number;
  weightRate: number;
  dimensionalFactor: number;
  fuelSurcharge: number;
  insuranceRate: number;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  orderId: string;
  carrierId: string;
  carrier?: ShippingCarrier;
  serviceType: string;
  status: ShipmentStatus;
  originAddress: NigerianAddress;
  destinationAddress: NigerianAddress;
  packageWeight: number;
  packageDimensions: PackageDimensions;
  declaredValue: number;
  shippingCost: number;
  insuranceCost?: number;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  pickedUpAt?: Date;
  lastLocationUpdate?: {
    location: string;
    timestamp: Date;
    latitude?: number;
    longitude?: number;
  };
  specialInstructions?: string;
  customerNotes?: string;
  labelUrl?: string;
  manifestNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  trackingEvents?: TrackingEvent[];
  deliveryAttempts?: DeliveryAttempt[];
}

export interface TrackingEvent {
  id: string;
  shipmentId: string;
  status: ShipmentStatus;
  location?: string;
  city?: string;
  state?: string;
  country: string;
  description: string;
  carrierEventCode?: string;
  eventData?: any;
  latitude?: number;
  longitude?: number;
  estimatedDelivery?: Date;
  isPublic: boolean;
  createdAt: Date;
}

export interface DeliveryAttempt {
  id: string;
  shipmentId: string;
  attemptNumber: number;
  status: DeliveryAttemptStatus;
  attemptedAt: Date;
  reason?: string;
  notes?: string;
  driverName?: string;
  driverPhone?: string;
  recipientName?: string;
  signatureUrl?: string;
  photoUrl?: string;
  nextAttemptAt?: Date;
  createdAt: Date;
}

export interface ShippingAnalytics {
  id: string;
  carrierId: string;
  date: Date;
  state: string;
  totalShipments: number;
  deliveredShipments: number;
  failedDeliveries: number;
  averageDeliveryDays?: number;
  totalRevenue: number;
  averageShippingCost?: number;
  onTimeDeliveryRate?: number;
  customerSatisfaction?: number;
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response Types

export interface CreateShipmentRequest {
  orderId: string;
  carrierId: string;
  serviceType: string;
  destinationAddress: NigerianAddress;
  packageWeight: number;
  packageDimensions: PackageDimensions;
  declaredValue: number;
  specialInstructions?: string;
  customerNotes?: string;
  insuranceRequired?: boolean;
}

export interface ShipmentRateRequest {
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  packageWeight: number;
  packageDimensions: PackageDimensions;
  declaredValue: number;
  serviceType?: string;
}

export interface ShipmentRateResponse {
  carrierId: string;
  carrierName: string;
  serviceType: string;
  cost: number;
  currency: string;
  estimatedDays: number;
  estimatedDelivery: Date;
  additionalFees?: {
    fuelSurcharge: number;
    insurance: number;
    vat: number;
  };
}

export interface TrackingResponse {
  trackingNumber: string;
  status: ShipmentStatus;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  currentLocation?: string;
  progress: {
    percentage: number;
    currentStep: string;
    nextStep?: string;
  };
  events: TrackingEvent[];
  deliveryAttempts?: DeliveryAttempt[];
}

export interface CarrierWebhookData {
  trackingNumber: string;
  status: ShipmentStatus;
  location: string;
  description: string;
  timestamp: Date;
  carrierEventCode?: string;
  additionalData?: any;
}

export interface BulkTrackingRequest {
  trackingNumbers: string[];
  includeEvents?: boolean;
  includeDeliveryAttempts?: boolean;
}

export interface ShippingLabel {
  trackingNumber: string;
  labelUrl: string;
  labelFormat: "pdf" | "png" | "zpl";
  manifestNumber?: string;
  createdAt: Date;
}

export interface DeliverySchedule {
  shipmentId: string;
  scheduledDate: Date;
  timeWindow: {
    start: string;
    end: string;
  };
  driverName?: string;
  driverPhone?: string;
  vehicleInfo?: string;
  specialInstructions?: string;
}

// Nigerian Shipping Specific Types

export interface NigerianShippingZones {
  LAGOS_METRO: string[];
  SOUTHWEST: string[];
  SOUTHEAST: string[];
  SOUTHSOUTH: string[];
  NORTHCENTRAL: string[];
  NORTHEAST: string[];
  NORTHWEST: string[];
}

export interface NigerianHolidays {
  date: Date;
  name: string;
  type: "public" | "religious" | "cultural";
  affectedStates?: string[];
}

export interface WeatherImpact {
  state: string;
  season: "dry" | "rainy";
  impact: "none" | "low" | "moderate" | "high";
  expectedDelays: number; // additional days
}

export interface SecurityConsiderations {
  state: string;
  riskLevel: "low" | "medium" | "high";
  restrictions: string[];
  alternativeDeliveryOptions: string[];
}

// Carrier Integration Types

export interface DHLNigeriaConfig {
  apiKey: string;
  secretKey: string;
  accountNumber: string;
  baseUrl: string;
  testMode: boolean;
}

export interface GIGLogisticsConfig {
  apiKey: string;
  merchantId: string;
  baseUrl: string;
  testMode: boolean;
}

export interface UPSNigeriaConfig {
  accessKey: string;
  userId: string;
  password: string;
  baseUrl: string;
  testMode: boolean;
}

export interface JumiaLogisticsConfig {
  apiKey: string;
  sellerId: string;
  baseUrl: string;
  testMode: boolean;
}

export interface NIPOSTConfig {
  facilityCode: string;
  accessCode: string;
  baseUrl: string;
}

export interface CarrierAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    requestId: string;
    timestamp: Date;
    carrierResponseTime: number;
  };
}

// Analytics and Reporting Types

export interface ShippingPerformanceReport {
  period: {
    start: Date;
    end: Date;
  };
  overview: {
    totalShipments: number;
    deliveredShipments: number;
    averageDeliveryDays: number;
    onTimeDeliveryRate: number;
    totalShippingRevenue: number;
  };
  carrierPerformance: {
    carrierId: string;
    carrierName: string;
    shipmentCount: number;
    deliveryRate: number;
    averageCost: number;
    customerRating: number;
  }[];
  statePerformance: {
    state: string;
    shipmentCount: number;
    averageDeliveryDays: number;
    successRate: number;
    issues: string[];
  }[];
  costAnalysis: {
    totalCosts: number;
    averageCostPerKg: number;
    costByCarrier: { carrierId: string; cost: number }[];
    potentialSavings: number;
  };
  delays: {
    totalDelayed: number;
    averageDelayDays: number;
    commonReasons: { reason: string; count: number }[];
    seasonalPatterns: any[];
  };
}

export interface DeliveryCalendar {
  date: Date;
  scheduledDeliveries: number;
  estimatedDeliveries: number;
  confirmedDeliveries: number;
  workload: "light" | "normal" | "heavy";
  restrictions: string[];
  weatherAlert?: string;
}