import { User, UserRole, Prisma } from "@prisma/client";
import { BaseRepository } from "./BaseRepository";
import { UserType } from "@/types";
import { PaginationParams } from "../types/common.types";
import { logger } from "../utils/logger/winston";
import { NigerianPhoneUtils } from "../utils/helpers/nigerian";

export class UserRepository extends BaseRepository<UserType> {
  protected modelName = "user";

  /**
   * Find user by phone number (Nigerian format)
   */
  async findByPhoneNumber(phoneNumber: string): Promise<UserType | null> {
    try {
      const formattedPhone = NigerianPhoneUtils.format(phoneNumber);
      logger.debug("Finding user by phone number:", {
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
        logger.debug("User found by phone number:", { id: user.id });
      } else {
        logger.debug("User not found by phone number:", {
          phoneNumber: formattedPhone,
        });
      }

      return user;
    } catch (error) {
      logger.error("Error finding user by phone number:", error);
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserType | null> {
    try {
      logger.debug("Finding user by email:", { email });

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
        logger.debug("User found by email:", { id: user.id });
      }

      return user;
    } catch (error) {
      logger.error("Error finding user by email:", error);
      throw error;
    }
  }

  /**
   * Create user with Nigerian phone validation
   */
  async createUser(userData: {
    phoneNumber: string;
    firstName: string;
    lastName: string;
    email?: string;
    role?: UserRole;
  }): Promise<UserType> {
    try {
      const formattedPhone = NigerianPhoneUtils.format(userData.phoneNumber);

      if (!NigerianPhoneUtils.validate(formattedPhone)) {
        throw new Error("Invalid Nigerian phone number format");
      }

      logger.debug("Creating user with validated phone:", {
        originalPhone: userData.phoneNumber,
        formattedPhone,
      });

      const user = await this.create({
        ...userData,
        phoneNumber: formattedPhone,
        email: userData.email?.toLowerCase(),
        role: userData.role || UserRole.CUSTOMER,
        isVerified: false,
        isActive: true,
      });

      logger.info("User created successfully:", {
        id: user.id,
        phoneNumber: formattedPhone,
      });

      return user;
    } catch (error) {
      logger.error("Error creating user:", error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: {
      firstName?: string;
      lastName?: string;
      email?: string;
      avatar?: string;
    }
  ): Promise<UserType> {
    try {
      logger.debug("Updating user profile:", { userId, updates });

      const user = await this.update(userId, {
        ...updates,
        email: updates.email?.toLowerCase(),
        updatedAt: new Date(),
      });

      logger.info("User profile updated:", { userId });
      return user;
    } catch (error) {
      logger.error("Error updating user profile:", error);
      throw error;
    }
  }

  /**
   * Verify user phone number
   */
  async verifyPhoneNumber(userId: string): Promise<UserType> {
    try {
      logger.debug("Verifying user phone number:", { userId });

      const user = await this.update(userId, {
        isVerified: true,
        updatedAt: new Date(),
      });

      logger.info("User phone verified:", { userId });
      return user;
    } catch (error) {
      logger.error("Error verifying user phone:", error);
      throw error;
    }
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<UserType> {
    try {
      const user = await this.update(userId, {
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      });

      logger.debug("Updated user last login:", { userId });
      return user;
    } catch (error) {
      logger.error("Error updating last login:", error);
      throw error;
    }
  }

  /**
   * Find users by role with pagination
   */
  async findByRole(
    role: UserRole,
    pagination: PaginationParams
  ): Promise<{
    items: UserType[];
    pagination: any;
  }> {
    try {
      logger.debug("Finding users by role:", { role, pagination });

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
    } catch (error) {
      logger.error("Error finding users by role:", error);
      throw error;
    }
  }

  /**
   * Search users by name or phone
   */
  async searchUsers(
    query: string,
    pagination: PaginationParams
  ): Promise<{
    items: UserType[];
    pagination: any;
  }> {
    try {
      logger.debug("Searching users:", { query, pagination });

      const page = pagination.page || 1;
      const limit = Math.min(pagination.limit || 20, 100);
      const skip = (page - 1) * limit;

      // Try to format as phone number for search
      const formattedPhone = NigerianPhoneUtils.format(query);
      const isPhoneSearch = NigerianPhoneUtils.validate(formattedPhone);

      const whereCondition = {
        OR: [
          {
            firstName: {
              contains: query,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            lastName: {
              contains: query,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            email: {
              contains: query,
              mode: Prisma.QueryMode.insensitive,
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

      logger.debug(`Found ${items.length} users matching search`);

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
    } catch (error) {
      logger.error("Error searching users:", error);
      throw error;
    }
  }

  /**
   * Get user with full profile including orders and addresses
   */
  async findByIdWithFullProfile(userId: string): Promise<UserType | null> {
    try {
      logger.debug("Finding user with full profile:", { userId });

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
    } catch (error) {
      logger.error("Error finding user with full profile:", error);
      throw error;
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(userId: string): Promise<UserType> {
    try {
      logger.debug("Deactivating user:", { userId });

      const user = await this.update(userId, {
        isActive: false,
        updatedAt: new Date(),
      });

      logger.info("User deactivated:", { userId });
      return user;
    } catch (error) {
      logger.error("Error deactivating user:", error);
      throw error;
    }
  }

  /**
   * Get user statistics for admin dashboard
   */
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    verifiedUsers: number;
    newUsersThisMonth: number;
    usersByRole: Record<UserRole, number>;
  }> {
    try {
      logger.debug("Getting user statistics");

      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const [
        totalUsers,
        activeUsers,
        verifiedUsers,
        newUsersThisMonth,
        usersByRole,
      ] = await Promise.all([
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

      const roleStats = usersByRole.reduce(
        (acc: Record<UserRole, number>, item: any) => {
          acc[item.role] = item._count.id;
          return acc;
        },
        {} as Record<UserRole, number>
      );

      const stats = {
        totalUsers,
        activeUsers,
        verifiedUsers,
        newUsersThisMonth,
        usersByRole: roleStats,
      };

      logger.debug("User statistics calculated:", stats);
      return stats;
    } catch (error) {
      logger.error("Error getting user statistics:", error);
      throw error;
    }
  }
}
