import { BaseRepository } from './BaseRepository';
import { User, UserQueryParams, NigerianPhoneNumber, UserRole } from '@/types';
import { PrismaClient } from '@prisma/client';
export declare class UserRepository extends BaseRepository<User> {
    protected modelName: string;
    constructor(database?: PrismaClient);
    findByPhoneNumber(phoneNumber: NigerianPhoneNumber): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    createUser(userData: {
        phoneNumber: NigerianPhoneNumber;
        firstName: string;
        lastName: string;
        email?: string;
        role?: UserRole;
    }): Promise<User>;
    updateProfile(id: string, profileData: {
        firstName?: string;
        lastName?: string;
        email?: string;
        avatar?: string;
    }): Promise<User>;
    verifyUser(id: string): Promise<User>;
    updateLastLogin(id: string): Promise<User>;
    findWithFilters(params: UserQueryParams): Promise<{
        users: User[];
        total: number;
    }>;
    getUserStats(): Promise<{
        totalUsers: number;
        verifiedUsers: number;
        activeUsers: number;
        newUsersToday: number;
        newUsersThisWeek: number;
        newUsersThisMonth: number;
        usersByRole: Record<UserRole, number>;
    }>;
    findByRole(role: UserRole): Promise<User[]>;
    deactivateUser(id: string): Promise<User>;
    activateUser(id: string): Promise<User>;
    phoneNumberExists(phoneNumber: NigerianPhoneNumber): Promise<boolean>;
    emailExists(email: string): Promise<boolean>;
    findByIdWithRelations(id: string): Promise<User | null>;
    updateUserRole(id: string, role: UserRole): Promise<User>;
    getRecentUsers(limit?: number): Promise<User[]>;
}
//# sourceMappingURL=UserRepositories.d.ts.map