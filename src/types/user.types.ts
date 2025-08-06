// src/types/user.types.ts
import { BaseEntity, NigerianPhoneNumber, Address, PaginationParams, NigerianState } from './common.types';
import { UserRole } from './auth.types';

// Re-export UserRole for convenience
export { UserRole };

// Full user interface (database model)
export interface User extends BaseEntity {
  phoneNumber: NigerianPhoneNumber;
  email?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  isVerified: boolean;
  isActive: boolean;
  lastLoginAt?: Date;
  
  // Relationships (populated when needed)
  addresses?: Address[];
  orders?: any[]; // Import from order.types to avoid circular dependency
  reviews?: any[]; // Import from product.types to avoid circular dependency
  cart?: any; // Import from cart.types to avoid circular dependency
  wishlist?: any[]; // Import from product.types to avoid circular dependency
}

// Public user interface (API responses) - excludes sensitive data
export interface PublicUser {
  id: string;
  userId: string; // Alias for id for consistency with JWTPayload
  phoneNumber: NigerianPhoneNumber;
  email?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: UserRole;
  isVerified: boolean;
  sessionId?: string; // Current session ID when authenticated
  createdAt: Date;
}

// User profile update request
export interface UpdateUserProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
  phoneNumber?: NigerianPhoneNumber;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
}

// User creation request (admin)
export interface CreateUserRequest {
  phoneNumber: NigerianPhoneNumber;
  firstName: string;
  lastName: string;
  email?: string;
  role?: UserRole;
}

// User query parameters
export interface UserQueryParams extends PaginationParams {
  search?: string;
  role?: UserRole;
  isVerified?: boolean;
  isActive?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

// User statistics (admin dashboard)
export interface UserStats {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  verifiedUsers: number;
  activeUsers: number;
  usersByRole: Record<UserRole, number>;
  recentUsers: PublicUser[];
}

// Password change request
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// User profile response with additional data
export interface UserProfileResponse extends PublicUser {
  profileComplete: number;
  addresses?: Address[];
  preferences?: UserPreferences;
}

// User address management
export interface CreateAddressRequest {
  type: 'SHIPPING' | 'BILLING';
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: NigerianState;
  postalCode?: string;
  country?: string; // Optional since it defaults to 'NG'
  phoneNumber: NigerianPhoneNumber;
  isDefault?: boolean;
}

export interface UpdateAddressRequest extends Partial<CreateAddressRequest> {
  id: string;
}

export interface AddressResponse extends Address {
  // Additional response fields if needed
}

// User preferences
export interface UserPreferences {
  userId: string;
  notifications: {
    email: {
      orderUpdates: boolean;
      promotions: boolean;
      newsletters: boolean;
    };
    sms: {
      orderUpdates: boolean;
      promotions: boolean;
      securityAlerts: boolean;
    };
    push: {
      orderUpdates: boolean;
      promotions: boolean;
      inAppMessages: boolean;
    };
  };
  privacy: {
    profileVisibility: 'public' | 'private';
    showReviews: boolean;
    allowDataCollection: boolean;
  };
}

// User activity tracking
export interface UserActivity {
  userId: string;
  action: string;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// User search/filter options
export interface UserFilters {
  role?: UserRole[];
  isVerified?: boolean;
  isActive?: boolean;
  hasOrders?: boolean;
  registrationDateFrom?: Date;
  registrationDateTo?: Date;
  lastLoginFrom?: Date;
  lastLoginTo?: Date;
  state?: string[];
}

// Wishlist types
export interface WishlistItem extends BaseEntity {
  userId: string;
  productId: string;
  
  // Relationships
  user: PublicUser;
  product: any; // Import from product.types to avoid circular dependency
}

export interface AddToWishlistRequest {
  productId: string;
}

export interface WishlistResponse {
  items: WishlistItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface WishlistOperationResult {
  success: boolean;
  message: string;
  item?: WishlistItem;
}

export interface WishlistClearResult {
  itemsRemoved: number;
}

export interface MoveToCartItem {
  productId: string;
  quantity?: number;
}

export interface MoveToCartResult {
  success: boolean;
  message: string;
  successCount?: number;
  failureCount?: number;
  failures?: { productId: string; reason: string }[] | undefined;
}

export interface WishlistSummary {
  totalItems: number;
  totalValue: number;
  categories: { name: string; count: number }[];
  outOfStockItems: number;
  recentlyAdded: WishlistItem[];
}

export interface ShareableWishlistResult {
  shareToken: string;
  shareUrl: string;
  expiresAt: Date;
  isPublic: boolean;
}