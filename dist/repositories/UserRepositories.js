"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
// src/repositories/UserRepository.ts
const BaseRepository_1 = require("./BaseRepository");
class UserRepository extends BaseRepository_1.BaseRepository {
    modelName = 'user';
    constructor(database) {
        super(database);
    }
    // Find user by phone number
    async findByPhoneNumber(phoneNumber) {
        try {
            return await this.model.findUnique({
                where: { phoneNumber },
                include: {
                    addresses: true
                }
            });
        }
        catch (error) {
            console.error(`Error finding user by phone number ${phoneNumber}:`, error);
            throw error;
        }
    }
    // Find user by email
    async findByEmail(email) {
        try {
            return await this.model.findUnique({
                where: { email },
                include: {
                    addresses: true
                }
            });
        }
        catch (error) {
            console.error(`Error finding user by email ${email}:`, error);
            throw error;
        }
    }
    // Create user with phone number validation
    async createUser(userData) {
        try {
            return await this.model.create({
                data: {
                    ...userData,
                    role: userData.role || 'customer',
                    isVerified: false,
                    isActive: true
                },
                include: {
                    addresses: true
                }
            });
        }
        catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }
    // Update user profile
    async updateProfile(id, profileData) {
        try {
            return await this.model.update({
                where: { id },
                data: profileData,
                include: {
                    addresses: true
                }
            });
        }
        catch (error) {
            console.error(`Error updating user profile ${id}:`, error);
            throw error;
        }
    }
    // Verify user phone number
    async verifyUser(id) {
        try {
            return await this.model.update({
                where: { id },
                data: {
                    isVerified: true,
                    lastLoginAt: new Date()
                }
            });
        }
        catch (error) {
            console.error(`Error verifying user ${id}:`, error);
            throw error;
        }
    }
    // Update last login time
    async updateLastLogin(id) {
        try {
            return await this.model.update({
                where: { id },
                data: {
                    lastLoginAt: new Date()
                }
            });
        }
        catch (error) {
            console.error(`Error updating last login for user ${id}:`, error);
            throw error;
        }
    }
    // Find users with advanced filtering
    async findWithFilters(params) {
        try {
            const page = params.page || 1;
            const limit = Math.min(params.limit || 20, 100);
            const skip = (page - 1) * limit;
            // Build where clause
            const where = {};
            if (params.search) {
                where.OR = [
                    { firstName: { contains: params.search, mode: 'insensitive' } },
                    { lastName: { contains: params.search, mode: 'insensitive' } },
                    { email: { contains: params.search, mode: 'insensitive' } },
                    { phoneNumber: { contains: params.search } }
                ];
            }
            if (params.role) {
                where.role = params.role;
            }
            if (params.isVerified !== undefined) {
                where.isVerified = params.isVerified;
            }
            if (params.isActive !== undefined) {
                where.isActive = params.isActive;
            }
            if (params.dateFrom || params.dateTo) {
                where.createdAt = {};
                if (params.dateFrom) {
                    where.createdAt.gte = params.dateFrom;
                }
                if (params.dateTo) {
                    where.createdAt.lte = params.dateTo;
                }
            }
            const [users, total] = await Promise.all([
                this.model.findMany({
                    where,
                    take: limit,
                    skip,
                    orderBy: params.sortBy ? {
                        [params.sortBy]: params.sortOrder || 'desc'
                    } : {
                        createdAt: 'desc'
                    },
                    include: {
                        addresses: true,
                        _count: {
                            select: {
                                orders: true,
                                reviews: true
                            }
                        }
                    }
                }),
                this.model.count({ where })
            ]);
            return { users, total };
        }
        catch (error) {
            console.error('Error finding users with filters:', error);
            throw error;
        }
    }
    // Get user statistics
    async getUserStats() {
        try {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            const [totalUsers, verifiedUsers, activeUsers, newUsersToday, newUsersThisWeek, newUsersThisMonth, customerCount, adminCount, superAdminCount] = await Promise.all([
                this.model.count(),
                this.model.count({ where: { isVerified: true } }),
                this.model.count({ where: { isActive: true } }),
                this.model.count({ where: { createdAt: { gte: today } } }),
                this.model.count({ where: { createdAt: { gte: weekAgo } } }),
                this.model.count({ where: { createdAt: { gte: monthAgo } } }),
                this.model.count({ where: { role: 'customer' } }),
                this.model.count({ where: { role: 'admin' } }),
                this.model.count({ where: { role: 'super_admin' } })
            ]);
            return {
                totalUsers,
                verifiedUsers,
                activeUsers,
                newUsersToday,
                newUsersThisWeek,
                newUsersThisMonth,
                usersByRole: {
                    customer: customerCount,
                    admin: adminCount,
                    super_admin: superAdminCount
                }
            };
        }
        catch (error) {
            console.error('Error getting user statistics:', error);
            throw error;
        }
    }
    // Find users by role
    async findByRole(role) {
        try {
            return await this.model.findMany({
                where: { role },
                include: {
                    addresses: true
                }
            });
        }
        catch (error) {
            console.error(`Error finding users by role ${role}:`, error);
            throw error;
        }
    }
    // Deactivate user account
    async deactivateUser(id) {
        try {
            return await this.model.update({
                where: { id },
                data: { isActive: false }
            });
        }
        catch (error) {
            console.error(`Error deactivating user ${id}:`, error);
            throw error;
        }
    }
    // Activate user account
    async activateUser(id) {
        try {
            return await this.model.update({
                where: { id },
                data: { isActive: true }
            });
        }
        catch (error) {
            console.error(`Error activating user ${id}:`, error);
            throw error;
        }
    }
    // Check if phone number exists
    async phoneNumberExists(phoneNumber) {
        try {
            const user = await this.model.findUnique({
                where: { phoneNumber },
                select: { id: true }
            });
            return !!user;
        }
        catch (error) {
            console.error(`Error checking phone number existence ${phoneNumber}:`, error);
            return false;
        }
    }
    // Check if email exists
    async emailExists(email) {
        try {
            const user = await this.model.findUnique({
                where: { email },
                select: { id: true }
            });
            return !!user;
        }
        catch (error) {
            console.error(`Error checking email existence ${email}:`, error);
            return false;
        }
    }
    // Get user with full relations
    async findByIdWithRelations(id) {
        try {
            return await this.model.findUnique({
                where: { id },
                include: {
                    addresses: {
                        orderBy: { isDefault: 'desc' }
                    },
                    orders: {
                        take: 5,
                        orderBy: { createdAt: 'desc' },
                        select: {
                            id: true,
                            orderNumber: true,
                            status: true,
                            totalAmount: true,
                            createdAt: true
                        }
                    },
                    reviews: {
                        take: 5,
                        orderBy: { createdAt: 'desc' },
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    slug: true
                                }
                            }
                        }
                    },
                    wishlist: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    slug: true,
                                    price: true,
                                    images: {
                                        where: { isPrimary: true },
                                        take: 1
                                    }
                                }
                            }
                        }
                    },
                    _count: {
                        select: {
                            orders: true,
                            reviews: true,
                            addresses: true
                        }
                    }
                }
            });
        }
        catch (error) {
            console.error(`Error finding user with relations ${id}:`, error);
            throw error;
        }
    }
    // Update user role (admin operation)
    async updateUserRole(id, role) {
        try {
            return await this.model.update({
                where: { id },
                data: { role }
            });
        }
        catch (error) {
            console.error(`Error updating user role ${id}:`, error);
            throw error;
        }
    }
    // Get recent users
    async getRecentUsers(limit = 10) {
        try {
            return await this.model.findMany({
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: {
                            orders: true
                        }
                    }
                }
            });
        }
        catch (error) {
            console.error('Error getting recent users:', error);
            throw error;
        }
    }
}
exports.UserRepository = UserRepository;
//# sourceMappingURL=UserRepositories.js.map