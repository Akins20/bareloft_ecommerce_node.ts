"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const client_1 = require("@prisma/client");
const BaseRepository_1 = require("./BaseRepository");
const types_1 = require("../types");
class UserRepository extends BaseRepository_1.BaseRepository {
    constructor(prisma) {
        super(prisma || new client_1.PrismaClient(), "user");
    }
    /**
     * Transform User to PublicUser
     */
    transformToPublicUser(user) {
        return {
            id: user.id,
            userId: user.id,
            phoneNumber: user.phoneNumber,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar || '',
            role: user.role,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
        };
    }
    /**
     * Find user by phone number
     */
    async findByPhoneNumber(phoneNumber) {
        try {
            return await this.findFirst({ phoneNumber }, {
                addresses: true,
                reviews: {
                    include: { product: true },
                    orderBy: { createdAt: "desc" },
                },
            });
        }
        catch (error) {
            this.handleError("Error finding user by phone number", error);
            throw error;
        }
    }
    /**
     * Find user by email
     */
    async findByEmail(email) {
        try {
            return await this.findFirst({ email }, {
                addresses: true,
                reviews: {
                    include: { product: true },
                    orderBy: { createdAt: "desc" },
                },
            });
        }
        catch (error) {
            this.handleError("Error finding user by email", error);
            throw error;
        }
    }
    /**
     * Check if email exists
     */
    async emailExists(email) {
        try {
            const user = await this.findFirst({ email });
            return !!user;
        }
        catch (error) {
            this.handleError("Error checking email existence", error);
            throw error;
        }
    }
    /**
     * Create new user with validation
     */
    async createUser(userData) {
        try {
            // Check if phone number already exists
            const existingUser = await this.findByPhoneNumber(userData.phoneNumber);
            if (existingUser) {
                throw new types_1.AppError("Phone number already registered", types_1.HTTP_STATUS.CONFLICT, types_1.ERROR_CODES.RESOURCE_ALREADY_EXISTS);
            }
            // Check if email already exists (if provided)
            if (userData.email) {
                const existingEmail = await this.findByEmail(userData.email);
                if (existingEmail) {
                    throw new types_1.AppError("Email already registered", types_1.HTTP_STATUS.CONFLICT, types_1.ERROR_CODES.RESOURCE_ALREADY_EXISTS);
                }
            }
            return await this.create(userData, {
                addresses: true,
            });
        }
        catch (error) {
            this.handleError("Error creating user", error);
            throw error;
        }
    }
    /**
     * Update user profile
     */
    async updateProfile(userId, profileData) {
        try {
            // If email is being updated, check for conflicts
            if (profileData.email) {
                const existingEmail = await this.findFirst({
                    email: profileData.email,
                    id: { not: userId },
                });
                if (existingEmail) {
                    throw new types_1.AppError("Email already in use by another account", types_1.HTTP_STATUS.CONFLICT, types_1.ERROR_CODES.RESOURCE_CONFLICT);
                }
            }
            return await this.update(userId, profileData, {
                addresses: true,
                reviews: {
                    include: { product: true },
                    orderBy: { createdAt: "desc" },
                    take: 5,
                },
            });
        }
        catch (error) {
            this.handleError("Error updating user profile", error);
            throw error;
        }
    }
    /**
     * Update last login timestamp
     */
    async updateLastLogin(userId) {
        try {
            await this.update(userId, {
                lastLoginAt: new Date(),
            });
        }
        catch (error) {
            this.handleError("Error updating last login", error);
            // Don't throw - this is not critical
        }
    }
    /**
     * Verify user account
     */
    async verifyUser(userId) {
        try {
            return await this.update(userId, {
                isVerified: true,
                status: "ACTIVE",
            });
        }
        catch (error) {
            this.handleError("Error verifying user", error);
            throw error;
        }
    }
    /**
     * Suspend user account
     */
    async suspendUser(userId, reason) {
        try {
            return await this.update(userId, {
                status: "SUSPENDED",
            });
        }
        catch (error) {
            this.handleError("Error suspending user", error);
            throw error;
        }
    }
    /**
     * Activate user account
     */
    async activateUser(userId) {
        try {
            return await this.update(userId, {
                status: "ACTIVE",
            });
        }
        catch (error) {
            this.handleError("Error activating user", error);
            throw error;
        }
    }
    /**
     * Find users with filters and pagination
     */
    async findUsersWithFilters(queryParams) {
        try {
            const { search, role, isVerified, isActive, dateFrom, dateTo, page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc", } = queryParams;
            // Build where clause
            const where = {};
            // Search in names, email, and phone
            if (search) {
                where.OR = [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    { phoneNumber: { contains: search } },
                ];
            }
            // Filter by role
            if (role) {
                where.role = role;
            }
            // Filter by verification status
            if (typeof isVerified === "boolean") {
                where.isVerified = isVerified;
            }
            // Filter by active status
            if (typeof isActive === "boolean") {
                where.status = isActive ? "ACTIVE" : { not: "ACTIVE" };
            }
            // Filter by date range
            if (dateFrom || dateTo) {
                where.createdAt = {};
                if (dateFrom)
                    where.createdAt.gte = dateFrom;
                if (dateTo)
                    where.createdAt.lte = dateTo;
            }
            return await this.findMany(where, {
                include: {
                    addresses: true,
                    _count: {
                        select: {
                            orders: true,
                            reviews: true,
                        },
                    },
                },
                orderBy: this.buildOrderBy(sortBy, sortOrder),
                pagination: { page, limit },
            });
        }
        catch (error) {
            this.handleError("Error finding users with filters", error);
            throw error;
        }
    }
    /**
     * Get user statistics
     */
    async getUserStats() {
        try {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const [totalUsers, newUsersToday, newUsersThisWeek, newUsersThisMonth, verifiedUsers, activeUsers, usersByRole, recentUsers,] = await Promise.all([
                this.count(),
                this.count({
                    createdAt: { gte: today },
                }),
                this.count({
                    createdAt: { gte: weekStart },
                }),
                this.count({
                    createdAt: { gte: monthStart },
                }),
                this.count({
                    isVerified: true,
                }),
                this.count({
                    status: "ACTIVE",
                }),
                this.groupBy(["role"], {}, undefined, {
                    _count: { id: true },
                }),
                this.findMany({}, {
                    orderBy: { createdAt: "desc" },
                    pagination: { page: 1, limit: 10 },
                }),
            ]);
            // Transform role counts
            const roleStats = usersByRole.reduce((acc, group) => {
                acc[group.role] = group._count.id;
                return acc;
            }, {
                CUSTOMER: 0,
                ADMIN: 0,
                SUPER_ADMIN: 0,
            });
            return {
                totalUsers,
                newUsersToday,
                newUsersThisWeek,
                newUsersThisMonth,
                verifiedUsers,
                activeUsers,
                usersByRole: roleStats,
                recentUsers: recentUsers.data.map(user => this.transformToPublicUser(user)),
            };
        }
        catch (error) {
            this.handleError("Error getting user statistics", error);
            throw error;
        }
    }
    /**
     * Find customers with orders
     */
    async findCustomersWithOrders(pagination) {
        try {
            const findOptions = {
                include: {
                    orders: {
                        orderBy: { createdAt: "desc" },
                        take: 3,
                        include: {
                            items: {
                                include: { product: true },
                                take: 2,
                            },
                        },
                    },
                    _count: {
                        select: { orders: true },
                    },
                },
                orderBy: { createdAt: "desc" },
            };
            if (pagination) {
                findOptions.pagination = pagination;
            }
            return await this.findMany({ role: "CUSTOMER" }, findOptions);
        }
        catch (error) {
            this.handleError("Error finding customers with orders", error);
            throw error;
        }
    }
    /**
     * Find users by location (state)
     */
    async findUsersByLocation(state) {
        try {
            const result = await this.findMany({
                addresses: {
                    some: {
                        state,
                        isDefault: true,
                    },
                },
            });
            return result.data;
        }
        catch (error) {
            this.handleError("Error finding users by location", error);
            throw error;
        }
    }
    /**
     * Find top customers by order value
     */
    async findTopCustomers(limit = 10) {
        try {
            // This would be a complex query in real implementation
            // For now, return users with their order aggregations
            const customers = await this.prisma.user.findMany({
                where: { role: "CUSTOMER" },
                include: {
                    orders: {
                        where: { status: "DELIVERED" },
                        select: {
                            id: true,
                            total: true,
                            createdAt: true,
                        },
                    },
                },
                take: limit * 2, // Get more to filter and sort
            });
            const customerStats = customers
                .map((customer) => {
                const totalSpent = customer.orders.reduce((sum, order) => sum + Number(order.total), 0);
                const orderCount = customer.orders.length;
                const lastOrderDate = customer.orders.length > 0
                    ? new Date(Math.max(...customer.orders.map((o) => o.createdAt.getTime())))
                    : new Date(0);
                return {
                    user: customer,
                    totalSpent,
                    orderCount,
                    lastOrderDate,
                };
            })
                .filter((stat) => stat.orderCount > 0)
                .sort((a, b) => b.totalSpent - a.totalSpent)
                .slice(0, limit);
            return customerStats;
        }
        catch (error) {
            this.handleError("Error finding top customers", error);
            throw error;
        }
    }
    /**
     * Find inactive users (no login in X days)
     */
    async findInactiveUsers(daysSinceLastLogin = 30, pagination) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastLogin);
            const findOptions = {
                orderBy: { lastLoginAt: "asc" },
            };
            if (pagination) {
                findOptions.pagination = pagination;
            }
            return await this.findMany({
                OR: [{ lastLoginAt: { lt: cutoffDate } }, { lastLoginAt: null }],
                status: "ACTIVE",
            }, findOptions);
        }
        catch (error) {
            this.handleError("Error finding inactive users", error);
            throw error;
        }
    }
    /**
     * Search users by multiple criteria
     */
    async searchUsers(searchTerm, filters = {}, pagination) {
        try {
            const searchFields = ["firstName", "lastName", "email", "phoneNumber"];
            const where = { ...filters };
            // Add location filter if state is provided
            if (filters.state) {
                where.addresses = {
                    some: {
                        state: filters.state,
                    },
                };
                delete where.state; // Remove from top level
            }
            const searchOptions = {
                include: {
                    addresses: true,
                    _count: {
                        select: {
                            orders: true,
                            reviews: true,
                        },
                    },
                },
            };
            if (pagination) {
                searchOptions.pagination = pagination;
            }
            return await this.search(searchTerm, searchFields, where, searchOptions);
        }
        catch (error) {
            this.handleError("Error searching users", error);
            throw error;
        }
    }
    /**
     * Get user activity summary
     */
    async getUserActivitySummary(userId) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                include: {
                    orders: {
                        where: { status: "DELIVERED" },
                        include: {
                            items: {
                                include: {
                                    product: {
                                        include: { category: true },
                                    },
                                },
                            },
                        },
                    },
                    reviews: true,
                },
            });
            if (!user) {
                throw new types_1.AppError("User not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            const orderCount = user.orders.length;
            const totalSpent = user.orders.reduce((sum, order) => sum + Number(order.total), 0);
            const reviewCount = user.reviews.length;
            const averageRating = reviewCount > 0
                ? user.reviews.reduce((sum, review) => sum + review.rating, 0) /
                    reviewCount
                : 0;
            // Get last activity (latest order or review)
            const lastOrderDate = user.orders.length > 0
                ? new Date(Math.max(...user.orders.map((o) => o.createdAt.getTime())))
                : new Date(0);
            const lastReviewDate = user.reviews.length > 0
                ? new Date(Math.max(...user.reviews.map((r) => r.createdAt.getTime())))
                : new Date(0);
            const lastActivity = new Date(Math.max(lastOrderDate.getTime(), lastReviewDate.getTime()));
            // Calculate favorite categories
            const categoryStats = new Map();
            user.orders.forEach((order) => {
                order.items.forEach((item) => {
                    const categoryName = item.product.category.name;
                    categoryStats.set(categoryName, (categoryStats.get(categoryName) || 0) + 1);
                });
            });
            const favoriteCategories = Array.from(categoryStats.entries())
                .map(([categoryName, orderCount]) => ({ categoryName, orderCount }))
                .sort((a, b) => b.orderCount - a.orderCount)
                .slice(0, 5);
            return {
                orderCount,
                totalSpent,
                reviewCount,
                averageRating,
                lastActivity,
                joinDate: user.createdAt,
                favoriteCategories,
            };
        }
        catch (error) {
            this.handleError("Error getting user activity summary", error);
            throw error;
        }
    }
    /**
     * Bulk update user statuses
     */
    async bulkUpdateStatus(userIds, status) {
        try {
            return await this.updateMany({ id: { in: userIds } }, { status });
        }
        catch (error) {
            this.handleError("Error bulk updating user statuses", error);
            throw error;
        }
    }
}
exports.UserRepository = UserRepository;
//# sourceMappingURL=UserRepository.js.map