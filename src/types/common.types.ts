// Base Entity Interface - All entities extend this
export interface BaseEntity {
    id: string; // UUID
    createdAt: Date;
    updatedAt: Date;
  }
  
  // Nigerian-specific types
  export const NIGERIAN_STATES = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi',
    'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta',
    'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe',
    'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
    'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
    'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
    'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe',
    'Zamfara', 'FCT'
  ] as const;
  
  export type NigerianState = typeof NIGERIAN_STATES[number];
  
  // Currency types
  export type Currency = 'NGN';
  
  // Phone number validation type
  export type NigerianPhoneNumber = string; // Format: +234XXXXXXXXXX
  
  // Pagination interface
  export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
  
  export interface PaginationMeta {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }
  
  // Search and filter interfaces
  export interface SearchParams {
    query?: string;
    filters?: Record<string, any>;
  }
  
  // File upload types
  export interface FileUpload {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  }
  
  export interface UploadedFile {
    url: string;
    publicId: string;
    format: string;
    size: number;
    width?: number;
    height?: number;
  }
  
  // Address interface (Nigerian format)
  export interface Address {
    id: string;
    firstName: string;
    lastName: string;
    company?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: NigerianState;
    postalCode?: string;
    country: 'NG'; // Always Nigeria
    phoneNumber: NigerianPhoneNumber;
    isDefault: boolean;
    type: 'shipping' | 'billing';
  }
  
  // Generic response wrapper
  export interface ResponseData<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: {
      code: string;
      details?: string | string[];
    };
    meta?: {
      pagination?: PaginationMeta;
      timestamp: string;
    };
  }
  
  // Constants
  export const CONSTANTS = {
    // Pagination
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    
    // OTP
    OTP_LENGTH: 6,
    OTP_EXPIRY_MINUTES: 10,
    MAX_OTP_ATTEMPTS: 3,
    OTP_RATE_LIMIT_MINUTES: 15,
    
    // JWT
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    
    // Cart
    CART_ITEM_MAX_QUANTITY: 99,
    CART_EXPIRY_DAYS: 30,
    
    // Orders
    ORDER_NUMBER_PREFIX: 'BL',
    ORDER_CANCELLATION_WINDOW_HOURS: 24,
    
    // Inventory
    LOW_STOCK_DEFAULT_THRESHOLD: 10,
    INVENTORY_RESERVATION_MINUTES: 15,
    
    // File Upload
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    MAX_FILES_PER_UPLOAD: 10,
    ALLOWED_IMAGE_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
    
    // Nigerian specific
    FREE_SHIPPING_THRESHOLD: 50000, // ₦50,000
    DEFAULT_SHIPPING_FEE: 2500, // ₦2,500
    NAIRA_TO_KOBO: 100, // Paystack uses kobo
    
    // Rate limiting
    AUTH_RATE_LIMIT: 5, // 5 requests per 15 minutes
    API_RATE_LIMIT: 100, // 100 requests per 15 minutes
    
    // Cache TTL (seconds)
    CACHE_TTL: {
      SHORT: 300,    // 5 minutes
      MEDIUM: 1800,  // 30 minutes
      LONG: 3600,    // 1 hour
      VERY_LONG: 86400 // 24 hours
    }
  } as const;
  
  // Type guards
  export const isNigerianPhoneNumber = (phone: string): phone is NigerianPhoneNumber => {
    const nigerianPhoneRegex = /^(\+234|234|0)[789][01][0-9]{8}$/;
    return nigerianPhoneRegex.test(phone);
  };
  
  export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  export const isUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };