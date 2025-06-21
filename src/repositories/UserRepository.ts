import { PrismaClient } from "@prisma/client";
import { BaseRepository } from "./BaseRepository";
import {
  User,
  CreateUserRequest,
  UpdateUserProfileRequest,
  UserQueryParams,
  UserStats,
  NigerianPhoneNumber,
  PaginationParams,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
} from "../types";

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

export class UserRepository extends BaseRepository<
  User,
  CreateUserData,
  UpdateUserData
> {
  constructor(prisma: PrismaClient) {
    super(prisma, "User");
  }

  /**
   * Find user by phone number
   */
  async findByPhoneNumber(
    phoneNumber: NigerianPhoneNumber
  ): Promise<User | null> {
    try {
      return await this.findFirst(
        { phoneNumber },
        {
          addresses: true,
          reviews: {
            include: { product: true },
            orderBy: { createdAt: "desc" },
          },
        }
      );
    } catch (error) {
      this.handleError("Error finding user by phone number", error);
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.findFirst(
        { email },
        {
          addresses: true,
          reviews: {
            include: { product: true },
            orderBy: { createdAt: "desc" },
          },
        }
      );
    } catch (error) {
      this.handleError("Error finding user by email", error);
      throw error;
    }
  }

  /**
   * Create new user with validation
   */
  async createUser(userData: CreateUserData): Promise<User> {
    try {
      // Check if phone number already exists
      const existingUser = await this.findByPhoneNumber(userData.phoneNumber);
      if (existingUser) {
        throw new AppError(
          "Phone number already registered",
          HTTP_STATUS.CONFLICT,
          ERROR_CODES.RESOURCE_ALREADY_EXISTS
        );
      }

      // Check if email already exists (if provided)
      if (userData.email) {
        const existingEmail = await this.findByEmail(userData.email);
        if (existingEmail) {
          throw new AppError(
            "Email already registered",
            HTTP_STATUS.CONFLICT,
            ERROR_CODES.RESOURCE_ALREADY_EXISTS
          );
        }
      }

      return await this.create(userData, {
        addresses: true,
      });
    } catch (error) {
      this.handleError("Error creating user", error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    profileData: UpdateUserProfileRequest
  ): Promise<User> {
    try {
      // If email is being updated, check for conflicts
      if (profileData.email) {
        const existingEmail = await this.findFirst({
          email: profileData.email,
          id: { not: userId },
        });

        if (existingEmail) {
          throw new AppError(
            "Email already in use by another account",
            HTTP_STATUS.CONFLICT,
            ERROR_CODES.RESOURCE_CONFLICT
          );
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
    } catch (error) {
      this.handleError("Error updating user profile", error);
      throw error;
    }
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.update(userId, {
        lastLoginAt: new Date(),
      });
    } catch (error) {
      this.handleError("Error updating last login", error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Verify user account
   */
  async verifyUser(userId: string): Promise<User> {
    try {
      return await this.update(userId, {
        isVerified: true,
        status: "ACTIVE",
      });
    } catch (error) {
      this.handleError("Error verifying user", error);
      throw error;
    }
  }

  /**
   * Suspend user account
   */
  async suspendUser(userId: string, reason?: string): Promise<User> {
    try {
      return await this.update(userId, {
        status: "SUSPENDED",
      });
    } catch (error) {
      this.handleError("Error suspending user", error);
      throw error;
    }
  }

  /**
   * Activate user account
   */
  async activateUser(userId: string): Promise<User> {
    try {
      return await this.update(userId, {
        status: "ACTIVE",
      });
    } catch (error) {
      this.handleError("Error activating user", error);
      throw error;
    }
  }

  /**
   * Find users with filters and pagination
   */
  async findUsersWithFilters(queryParams: UserQueryParams): Promise<{
    data: User[];
    pagination: any;
  }> {
    try {
      const {
        search,
        role,
        isVerified,
        isActive,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = queryParams;

      // Build where clause
      const where: any = {};

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
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
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
    } catch (error) {
      this.handleError("Error finding users with filters", error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<UserStats> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
        verifiedUsers,
        activeUsers,
        usersByRole,
        recentUsers,
      ] = await Promise.all([
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
        this.findMany(
          {},
          {
            orderBy: { createdAt: "desc" },
            pagination: { page: 1, limit: 10 },
          }
        ),
      ]);

      // Transform role counts
      const roleStats = usersByRole.reduce(
        (acc, group) => {
          acc[group.role as keyof typeof acc] = group._count.id;
          return acc;
        },
        {
          CUSTOMER: 0,
          ADMIN: 0,
          SUPER_ADMIN: 0,
        }
      );

      return {
        totalUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
        verifiedUsers,
        activeUsers,
        usersByRole: roleStats,
        recentUsers: recentUsers.data,
      };
    } catch (error) {
      this.handleError("Error getting user statistics", error);
      throw error;
    }
  }

  /**
   * Find customers with orders
   */
  async findCustomersWithOrders(pagination?: PaginationParams): Promise<{
    data: Array<
      User & {
        _count: { orders: number };
        orders: any[];
      }
    >;
    pagination: any;
  }> {
    try {
      return await this.findMany(
        { role: "CUSTOMER" },
        {
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
          pagination,
        }
      );
    } catch (error) {
      this.handleError("Error finding customers with orders", error);
      throw error;
    }
  }

  /**
   * Find users by location (state)
   */
  async findUsersByLocation(state: string): Promise<User[]> {
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
    } catch (error) {
      this.handleError("Error finding users by location", error);
      throw error;
    }
  }

  /**
   * Find top customers by order value
   */
  async findTopCustomers(limit: number = 10): Promise<
    Array<{
      user: User;
      totalSpent: number;
      orderCount: number;
      lastOrderDate: Date;
    }>
  > {
    try {
      // This would be a complex query in real implementation
      // For now, return users with their order aggregations
      const customers = await this.prisma.user.findMany({
        where: { role: "CUSTOMER" },
        include: {
          orders: {
            where: { status: "DELIVERED" },
            select: {
              totalAmount: true,
              createdAt: true,
            },
          },
        },
        take: limit * 2, // Get more to filter and sort
      });

      const customerStats = customers
        .map((customer) => {
          const totalSpent = customer.orders.reduce(
            (sum, order) => sum + Number(order.totalAmount),
            0
          );
          const orderCount = customer.orders.length;
          const lastOrderDate =
            customer.orders.length > 0
              ? new Date(
                  Math.max(...customer.orders.map((o) => o.createdAt.getTime()))
                )
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
    } catch (error) {
      this.handleError("Error finding top customers", error);
      throw error;
    }
  }

  /**
   * Find inactive users (no login in X days)
   */
  async findInactiveUsers(
    daysSinceLastLogin: number = 30,
    pagination?: PaginationParams
  ): Promise<{
    data: User[];
    pagination: any;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastLogin);

      return await this.findMany(
        {
          OR: [{ lastLoginAt: { lt: cutoffDate } }, { lastLoginAt: null }],
          status: "ACTIVE",
        },
        {
          orderBy: { lastLoginAt: "asc" },
          pagination,
        }
      );
    } catch (error) {
      this.handleError("Error finding inactive users", error);
      throw error;
    }
  }

  /**
   * Search users by multiple criteria
   */
  async searchUsers(
    searchTerm: string,
    filters: {
      role?: string;
      isVerified?: boolean;
      state?: string;
    } = {},
    pagination?: PaginationParams
  ): Promise<{
    data: User[];
    pagination: any;
    searchMeta: any;
  }> {
    try {
      const searchFields = ["firstName", "lastName", "email", "phoneNumber"];
      const where: any = { ...filters };

      // Add location filter if state is provided
      if (filters.state) {
        where.addresses = {
          some: {
            state: filters.state,
          },
        };
        delete where.state; // Remove from top level
      }

      return await this.search(searchTerm, searchFields, where, {
        include: {
          addresses: true,
          _count: {
            select: {
              orders: true,
              reviews: true,
            },
          },
        },
        pagination,
      });
    } catch (error) {
      this.handleError("Error searching users", error);
      throw error;
    }
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(userId: string): Promise<{
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
  }> {
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
        throw new AppError(
          "User not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      const orderCount = user.orders.length;
      const totalSpent = user.orders.reduce(
        (sum, order) => sum + Number(order.totalAmount),
        0
      );
      const reviewCount = user.reviews.length;
      const averageRating =
        reviewCount > 0
          ? user.reviews.reduce((sum, review) => sum + review.rating, 0) /
            reviewCount
          : 0;

      // Get last activity (latest order or review)
      const lastOrderDate =
        user.orders.length > 0
          ? new Date(Math.max(...user.orders.map((o) => o.createdAt.getTime())))
          : new Date(0);
      const lastReviewDate =
        user.reviews.length > 0
          ? new Date(
              Math.max(...user.reviews.map((r) => r.createdAt.getTime()))
            )
          : new Date(0);
      const lastActivity = new Date(
        Math.max(lastOrderDate.getTime(), lastReviewDate.getTime())
      );

      // Calculate favorite categories
      const categoryStats = new Map<string, number>();
      user.orders.forEach((order) => {
        order.items.forEach((item) => {
          const categoryName = item.product.category.name;
          categoryStats.set(
            categoryName,
            (categoryStats.get(categoryName) || 0) + 1
          );
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
    } catch (error) {
      this.handleError("Error getting user activity summary", error);
      throw error;
    }
  }

  /**
   * Bulk update user statuses
   */
  async bulkUpdateStatus(
    userIds: string[],
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED"
  ): Promise<{ count: number }> {
    try {
      return await this.updateMany({ id: { in: userIds } }, { status });
    } catch (error) {
      this.handleError("Error bulk updating user statuses", error);
      throw error;
    }
  }
}
