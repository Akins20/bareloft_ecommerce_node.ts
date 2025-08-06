import { BaseEntity, NigerianPhoneNumber, Address, PaginationParams, NigerianState } from './common.types';
import { UserRole } from './auth.types';
export { UserRole };
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
    addresses?: Address[];
    orders?: any[];
    reviews?: any[];
    cart?: any;
    wishlist?: any[];
}
export interface PublicUser {
    id: string;
    userId: string;
    phoneNumber: NigerianPhoneNumber;
    email?: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    role: UserRole;
    isVerified: boolean;
    sessionId?: string;
    createdAt: Date;
}
export interface UpdateUserProfileRequest {
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string;
    phoneNumber?: NigerianPhoneNumber;
    dateOfBirth?: string;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
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
export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}
export interface UserProfileResponse extends PublicUser {
    profileComplete: number;
    addresses?: Address[];
    preferences?: UserPreferences;
}
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
    country?: string;
    phoneNumber: NigerianPhoneNumber;
    isDefault?: boolean;
}
export interface UpdateAddressRequest extends Partial<CreateAddressRequest> {
    id: string;
}
export interface AddressResponse extends Address {
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
export interface WishlistItem extends BaseEntity {
    userId: string;
    productId: string;
    user: PublicUser;
    product: any;
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
    failures?: {
        productId: string;
        reason: string;
    }[] | undefined;
}
export interface WishlistSummary {
    totalItems: number;
    totalValue: number;
    categories: {
        name: string;
        count: number;
    }[];
    outOfStockItems: number;
    recentlyAdded: WishlistItem[];
}
export interface ShareableWishlistResult {
    shareToken: string;
    shareUrl: string;
    expiresAt: Date;
    isPublic: boolean;
}
//# sourceMappingURL=user.types.d.ts.map