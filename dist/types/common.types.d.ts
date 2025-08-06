export interface BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const NIGERIAN_STATES: readonly ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara", "FCT"];
export type NigerianState = typeof NIGERIAN_STATES[number];
export type Currency = 'NGN';
export interface NairaCurrency {
    amount: number;
    currency?: Currency;
    formatted: string;
    inKobo?: number;
}
export type NigerianPhoneNumber = string;
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
export interface SearchParams {
    query?: string;
    filters?: Record<string, any>;
}
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
    country: 'NG';
    phoneNumber: NigerianPhoneNumber;
    isDefault: boolean;
    type: 'SHIPPING' | 'BILLING';
}
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
export interface PaginatedResponse<T = any> extends ResponseData<T[]> {
    meta: {
        pagination: PaginationMeta;
        timestamp: string;
    };
}
export declare const CONSTANTS: {
    readonly DEFAULT_PAGE_SIZE: 20;
    readonly MAX_PAGE_SIZE: 100;
    readonly OTP_LENGTH: 6;
    readonly OTP_EXPIRY_MINUTES: 10;
    readonly MAX_OTP_ATTEMPTS: 3;
    readonly OTP_RATE_LIMIT_MINUTES: 15;
    readonly JWT_EXPIRES_IN: "15m";
    readonly JWT_REFRESH_EXPIRES_IN: "7d";
    readonly CART_ITEM_MAX_QUANTITY: 99;
    readonly CART_EXPIRY_DAYS: 30;
    readonly ORDER_NUMBER_PREFIX: "BL";
    readonly ORDER_CANCELLATION_WINDOW_HOURS: 24;
    readonly LOW_STOCK_DEFAULT_THRESHOLD: 10;
    readonly INVENTORY_RESERVATION_MINUTES: 15;
    readonly MAX_FILE_SIZE: number;
    readonly MAX_FILES_PER_UPLOAD: 10;
    readonly ALLOWED_IMAGE_FORMATS: readonly ["jpg", "jpeg", "png", "webp"];
    readonly FREE_SHIPPING_THRESHOLD: 50000;
    readonly DEFAULT_SHIPPING_FEE: 2500;
    readonly NAIRA_TO_KOBO: 100;
    readonly AUTH_RATE_LIMIT: 5;
    readonly API_RATE_LIMIT: 100;
    readonly CACHE_TTL: {
        readonly SHORT: 300;
        readonly MEDIUM: 1800;
        readonly LONG: 3600;
        readonly VERY_LONG: 86400;
    };
};
export declare const isNigerianPhoneNumber: (phone: string) => phone is NigerianPhoneNumber;
export declare const isValidEmail: (email: string) => boolean;
export declare const isUUID: (str: string) => boolean;
//# sourceMappingURL=common.types.d.ts.map