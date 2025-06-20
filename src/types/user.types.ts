// src/types/user.types.ts
import { BaseEntity, NigerianPhoneNumber, Address, PaginationParams } from './common.types';
import { UserRole } from './auth.types';

// Full user interface (database model)
export interface User extends BaseEntity {
  phoneNumber: NigerianPhoneNumber;
  email?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: UserRole;
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
  phoneNumber: NigerianPhoneNumber;
  email?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: Date;
}

// User profile update request
export interface UpdateUserProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
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

// User address management
export interface CreateAddressRequest {
  type: 'shipping' | 'billing';
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode?: string;
  phoneNumber: NigerianPhoneNumber;
  isDefault?: boolean;
}

export interface UpdateAddressRequest extends Partial<CreateAddressRequest> {
  id: string;
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