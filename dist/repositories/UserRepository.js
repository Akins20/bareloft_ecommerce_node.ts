"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const client_1 = require("@prisma/client");
const BaseRepository_1 = require("./BaseRepository");
const winston_1 = require("../utils/logger/winston");
const nigerian_1 = require("../utils/helpers/nigerian");
class UserRepository extends BaseRepository_1.BaseRepository {
    modelName = "user";
    /**
     * Find user by phone number (Nigerian format)
     */
    async findByPhoneNumber(phoneNumber) {
        try {
            const formattedPhone = nigerian_1.NigerianPhoneUtils.format(phoneNumber);
            winston_1.logger.debug("Finding user by phone number:", {
                original: phoneNumber,
                formatted: formattedPhone,
            });
            const user = await this.model.findUnique({
                where: { phoneNumber: formattedPhone },
                include: {
                    addresses: true,
                    orders: {
                        take: 5,
                        orderBy: { createdAt: "desc" },
                    },
                },
            });
            if (user) {
                winston_1.logger.debug("User found by phone number:", { id: user.id });
            }
            else {
                winston_1.logger.debug("User not found by phone number:", {
                    phoneNumber: formattedPhone,
                });
            }
            return user;
        }
        catch (error) {
            winston_1.logger.error("Error finding user by phone number:", error);
            throw error;
        }
    }
    /**
     * Find user by email
     */
    async findByEmail(email) {
        try {
            winston_1.logger.debug("Finding user by email:", { email });
            const user = await this.model.findUnique({
                where: { email: email.toLowerCase() },
                include: {
                    addresses: true,
                    orders: {
                        take: 5,
                        orderBy: { createdAt: "desc" },
                    },
                },
            });
            if (user) {
                winston_1.logger.debug("User found by email:", { id: user.id });
            }
            return user;
        }
        catch (error) {
            winston_1.logger.error("Error finding user by email:", error);
            throw error;
        }
    }
    /**
     * Create user with Nigerian phone validation
     */
    async createUser(userData) {
        try {
            const formattedPhone = nigerian_1.NigerianPhoneUtils.format(userData.phoneNumber);
            if (!nigerian_1.NigerianPhoneUtils.validate(formattedPhone)) {
                throw new Error("Invalid Nigerian phone number format");
            }
            winston_1.logger.debug("Creating user with validated phone:", {
                originalPhone: userData.phoneNumber,
                formattedPhone,
            });
            const user = await this.create({
                ...userData,
                phoneNumber: formattedPhone,
                email: userData.email?.toLowerCase(),
                role: userData.role || client_1.UserRole.CUSTOMER,
                isVerified: false,
                isActive: true,
            });
            winston_1.logger.info("User created successfully:", {
                id: user.id,
                phoneNumber: formattedPhone,
            });
            return user;
        }
        catch (error) {
            winston_1.logger.error("Error creating user:", error);
            throw error;
        }
    }
    /**
     * Update user profile
     */
    async updateProfile(userId, updates) {
        try {
            winston_1.logger.debug("Updating user profile:", { userId, updates });
            const user = await this.update(userId, {
                ...updates,
                email: updates.email?.toLowerCase(),
                updatedAt: new Date(),
            });
            winston_1.logger.info("User profile updated:", { userId });
            return user;
        }
        catch (error) {
            winston_1.logger.error("Error updating user profile:", error);
            throw error;
        }
    }
    /**
     * Verify user phone number
     */
    async verifyPhoneNumber(userId) {
        try {
            winston_1.logger.debug("Verifying user phone number:", { userId });
            const user = await this.update(userId, {
                isVerified: true,
                updatedAt: new Date(),
            });
            winston_1.logger.info("User phone verified:", { userId });
            return user;
        }
        catch (error) {
            winston_1.logger.error("Error verifying user phone:", error);
            throw error;
        }
    }
    /**
     * Update last login timestamp
     */
    async updateLastLogin(userId) {
        try {
            const user = await this.update(userId, {
                lastLoginAt: new Date(),
                updatedAt: new Date(),
            });
            winston_1.logger.debug("Updated user last login:", { userId });
            return user;
        }
        catch (error) {
            winston_1.logger.error("Error updating last login:", error);
            throw error;
        }
    }
    /**
     * Find users by role with pagination
     */
    async findByRole(role, pagination) {
        try {
            winston_1.logger.debug("Finding users by role:", { role, pagination });
            const page = pagination.page || 1;
            const limit = Math.min(pagination.limit || 20, 100);
            const skip = (page - 1) * limit;
            const [items, totalItems] = await Promise.all([
                this.model.findMany({
                    where: { role },
                    take: limit,
                    skip,
                    orderBy: { createdAt: "desc" },
                    include: {
                        addresses: true,
                        _count: {
                            select: {
                                orders: true,
                            },
                        },
                    },
                }),
                this.model.count({ where: { role } }),
            ]);
            const totalPages = Math.ceil(totalItems / limit);
            return {
                items,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1,
                },
            };
        }
        catch (error) {
            winston_1.logger.error("Error finding users by role:", error);
            throw error;
        }
    }
    /**
     * Search users by name or phone
     */
    async searchUsers(query, pagination) {
        try {
            winston_1.logger.debug("Searching users:", { query, pagination });
            const page = pagination.page || 1;
            const limit = Math.min(pagination.limit || 20, 100);
            const skip = (page - 1) * limit;
            // Try to format as phone number for search
            const formattedPhone = nigerian_1.NigerianPhoneUtils.format(query);
            const isPhoneSearch = nigerian_1.NigerianPhoneUtils.validate(formattedPhone);
            const whereCondition = {
                OR: [
                    {
                        firstName: {
                            contains: query,
                            mode: client_1.Prisma.QueryMode.insensitive,
                        },
                    },
                    {
                        lastName: {
                            contains: query,
                            mode: client_1.Prisma.QueryMode.insensitive,
                        },
                    },
                    {
                        email: {
                            contains: query,
                            mode: client_1.Prisma.QueryMode.insensitive,
                        },
                    },
                    ...(isPhoneSearch
                        ? [
                            {
                                phoneNumber: {
                                    contains: formattedPhone,
                                },
                            },
                        ]
                        : []),
                ],
            };
            const [items, totalItems] = await Promise.all([
                this.model.findMany({
                    where: whereCondition,
                    take: limit,
                    skip,
                    orderBy: { createdAt: "desc" },
                    include: {
                        addresses: true,
                        _count: {
                            select: {
                                orders: true,
                            },
                        },
                    },
                }),
                this.model.count({ where: whereCondition }),
            ]);
            const totalPages = Math.ceil(totalItems / limit);
            winston_1.logger.debug(`Found ${items.length} users matching search`);
            return {
                items,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1,
                },
            };
        }
        catch (error) {
            winston_1.logger.error("Error searching users:", error);
            throw error;
        }
    }
    /**
     * Get user with full profile including orders and addresses
     */
    async findByIdWithFullProfile(userId) {
        try {
            winston_1.logger.debug("Finding user with full profile:", { userId });
            const user = await this.model.findUnique({
                where: { id: userId },
                include: {
                    addresses: {
                        orderBy: { createdAt: "desc" },
                    },
                    orders: {
                        take: 10,
                        orderBy: { createdAt: "desc" },
                        include: {
                            items: {
                                include: {
                                    product: {
                                        select: {
                                            name: true,
                                            images: {
                                                where: { isPrimary: true },
                                                take: 1,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    reviews: {
                        take: 5,
                        orderBy: { createdAt: "desc" },
                        include: {
                            product: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                    wishlist: {
                        include: {
                            product: {
                                include: {
                                    images: {
                                        where: { isPrimary: true },
                                        take: 1,
                                    },
                                },
                            },
                        },
                    },
                },
            });
            return user;
        }
        catch (error) {
            winston_1.logger.error("Error finding user with full profile:", error);
            throw error;
        }
    }
    /**
     * Deactivate user account
     */
    async deactivateUser(userId) {
        try {
            winston_1.logger.debug("Deactivating user:", { userId });
            const user = await this.update(userId, {
                isActive: false,
                updatedAt: new Date(),
            });
            winston_1.logger.info("User deactivated:", { userId });
            return user;
        }
        catch (error) {
            winston_1.logger.error("Error deactivating user:", error);
            throw error;
        }
    }
    /**
     * Get user statistics for admin dashboard
     */
    async getUserStats() {
        try {
            winston_1.logger.debug("Getting user statistics");
            const currentMonth = new Date();
            currentMonth.setDate(1);
            currentMonth.setHours(0, 0, 0, 0);
            const [totalUsers, activeUsers, verifiedUsers, newUsersThisMonth, usersByRole,] = await Promise.all([
                this.count(),
                this.count({ isActive: true }),
                this.count({ isVerified: true }),
                this.count({
                    createdAt: {
                        gte: currentMonth,
                    },
                }),
                this.model.groupBy({
                    by: ["role"],
                    _count: {
                        id: true,
                    },
                }),
            ]);
            const roleStats = usersByRole.reduce((acc, item) => {
                acc[item.role] = item._count.id;
                return acc;
            }, {});
            const stats = {
                totalUsers,
                activeUsers,
                verifiedUsers,
                newUsersThisMonth,
                usersByRole: roleStats,
            };
            winston_1.logger.debug("User statistics calculated:", stats);
            return stats;
        }
        catch (error) {
            winston_1.logger.error("Error getting user statistics:", error);
            throw error;
        }
    }
}
exports.UserRepository = UserRepository;
//# sourceMappingURL=UserRepository.js.map