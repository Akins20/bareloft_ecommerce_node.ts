import { PrismaClient } from "@prisma/client";
import { BaseRepository } from "./BaseRepository";
import { User, UpdateUserProfileRequest, UserQueryParams, UserStats, NigerianPhoneNumber, PaginationParams } from "../types";
export interface CreateUserData {
    phoneNumber: string;
    firstName: string;
    lastName: string;
    email?: string;
    role?: "CUSTOMER" | "ADMIN" | "SUPER_ADMIN";
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION";
}
export interface UpdateUserData {
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string;
    dateOfBirth?: Date;
    gender?: string;
    role?: "CUSTOMER" | "ADMIN" | "SUPER_ADMIN";
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION";
    isVerified?: boolean;
    lastLoginAt?: Date;
}
export declare class UserRepository extends BaseRepository<User, CreateUserData, UpdateUserData> {
    constructor(prisma: PrismaClient);
    /**
     * Find user by phone number
     */
    findByPhoneNumber(phoneNumber: NigerianPhoneNumber): Promise<User | null>;
    /**
     * Find user by email
     */
    findByEmail(email: string): Promise<User | null>;
    /**
     * Create new user with validation
     */
    createUser(userData: CreateUserData): Promise<User>;
    /**
     * Update user profile
     */
    updateProfile(userId: string, profileData: UpdateUserProfileRequest): Promise<User>;
    /**
     * Update last login timestamp
     */
    updateLastLogin(userId: string): Promise<void>;
    /**
     * Verify user account
     */
    verifyUser(userId: string): Promise<User>;
    /**
     * Suspend user account
     */
    suspendUser(userId: string, reason?: string): Promise<User>;
    /**
     * Activate user account
     */
    activateUser(userId: string): Promise<User>;
    /**
     * Find users with filters and pagination
     */
    findUsersWithFilters(queryParams: UserQueryParams): Promise<{
        data: User[];
        pagination: any;
    }>;
    /**
     * Get user statistics
     */
    getUserStats(): Promise<UserStats>;
    /**
     * Find customers with orders
     */
    findCustomersWithOrders(pagination?: PaginationParams): Promise<{
        data: Array<User & {
            _count: {
                orders: number;
            };
            orders: any[];
        }>;
        pagination: any;
    }>;
    /**
     * Find users by location (state)
     */
    findUsersByLocation(state: string): Promise<User[]>;
    /**
     * Find top customers by order value
     */
    findTopCustomers(limit?: number): Promise<Array<{
        user: User;
        totalSpent: number;
        orderCount: number;
        lastOrderDate: Date;
    }>>;
    /**
     * Find inactive users (no login in X days)
     */
    findInactiveUsers(daysSinceLastLogin?: number, pagination?: PaginationParams): Promise<{
        data: User[];
        pagination: any;
    }>;
    /**
     * Search users by multiple criteria
     */
    searchUsers(searchTerm: string, filters?: {
        role?: string;
        isVerified?: boolean;
        state?: string;
    }, pagination?: PaginationParams): Promise<{
        data: User[];
        pagination: any;
        searchMeta: any;
    }>;
    /**
     * Get user activity summary
     */
    getUserActivitySummary(userId: string): Promise<{
        orderCount: number;
        totalSpent: number;
        reviewCount: number;
        averageRating: number;
        lastActivity: Date;
        joinDate: Date;
        favoriteCategories: Array<{
            categoryName: string;
            orderCount: number;
        }>;
    }>;
    /**
     * Bulk update user statuses
     */
    bulkUpdateStatus(userIds: string[], status: "ACTIVE" | "INACTIVE" | "SUSPENDED"): Promise<{
        count: number;
    }>;
}
//# sourceMappingURL=UserRepository.d.ts.map