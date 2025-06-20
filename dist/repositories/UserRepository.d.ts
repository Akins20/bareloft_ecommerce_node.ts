import { UserRole } from "@prisma/client";
import { BaseRepository } from "./BaseRepository";
import { UserType } from "@/types";
import { PaginationParams } from "../types/common.types";
export declare class UserRepository extends BaseRepository<UserType> {
    protected modelName: string;
    /**
     * Find user by phone number (Nigerian format)
     */
    findByPhoneNumber(phoneNumber: string): Promise<UserType | null>;
    /**
     * Find user by email
     */
    findByEmail(email: string): Promise<UserType | null>;
    /**
     * Create user with Nigerian phone validation
     */
    createUser(userData: {
        phoneNumber: string;
        firstName: string;
        lastName: string;
        email?: string;
        role?: UserRole;
    }): Promise<UserType>;
    /**
     * Update user profile
     */
    updateProfile(userId: string, updates: {
        firstName?: string;
        lastName?: string;
        email?: string;
        avatar?: string;
    }): Promise<UserType>;
    /**
     * Verify user phone number
     */
    verifyPhoneNumber(userId: string): Promise<UserType>;
    /**
     * Update last login timestamp
     */
    updateLastLogin(userId: string): Promise<UserType>;
    /**
     * Find users by role with pagination
     */
    findByRole(role: UserRole, pagination: PaginationParams): Promise<{
        items: UserType[];
        pagination: any;
    }>;
    /**
     * Search users by name or phone
     */
    searchUsers(query: string, pagination: PaginationParams): Promise<{
        items: UserType[];
        pagination: any;
    }>;
    /**
     * Get user with full profile including orders and addresses
     */
    findByIdWithFullProfile(userId: string): Promise<UserType | null>;
    /**
     * Deactivate user account
     */
    deactivateUser(userId: string): Promise<UserType>;
    /**
     * Get user statistics for admin dashboard
     */
    getUserStats(): Promise<{
        totalUsers: number;
        activeUsers: number;
        verifiedUsers: number;
        newUsersThisMonth: number;
        usersByRole: Record<UserRole, number>;
    }>;
}
//# sourceMappingURL=UserRepository.d.ts.map