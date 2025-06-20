import { BaseEntity, NigerianPhoneNumber, Address, PaginationParams } from './common.types';
import { UserRole } from './auth.types';
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
    addresses?: Address[];
    orders?: any[];
    reviews?: any[];
    cart?: any;
    wishlist?: any[];
}
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
export interface UpdateUserProfileRequest {
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string;
}
export interface CreateUserRequest {
    phoneNumber: NigerianPhoneNumber;
    firstName: string;
    lastName: string;
    email?: string;
    role?: UserRole;
}
export interface UserQueryParams extends PaginationParams {
    search?: string;
    role?: UserRole;
    isVerified?: boolean;
    isActive?: boolean;
    dateFrom?: Date;
    dateTo?: Date;
}
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
//# sourceMappingURL=user.types.d.ts.map