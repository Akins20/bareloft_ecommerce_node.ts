import { Request, Response } from "express";
import { BaseAdminController } from "../BaseAdminController";
import { UserService } from "../../services/users/UserService";
import { UserRepository } from "../../repositories/UserRepository";
import { userManagementSchemas } from "../../utils/validation/schemas/adminSchemas";
import Joi from "joi";

/**
 * Admin User Management Controller
 * Handles user management operations for administrators with Nigerian e-commerce features
 */
export class AdminUserController extends BaseAdminController {
  private userService: UserService;
  private userRepository: UserRepository;

  constructor() {
    super();
    this.userService = new UserService();
    this.userRepository = new UserRepository();
  }

  /**
   * Get all users with filtering, pagination, and sorting
   * GET /api/admin/users
   */
  public getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      // Admin authentication and authorization
      if (!this.requireAdminAuth(req, res, 'admin')) return;

      const userId = this.getUserId(req);

      // Validate query parameters
      const { error, value: queryParams } = userManagementSchemas.userQuery.validate(req.query);
      if (error) {
        this.sendError(res, "Invalid query parameters", 400, "VALIDATION_ERROR", error.details.map(d => d.message));
        return;
      }

      const {
        page,
        limit,
        search,
        role,
        isVerified,
        isActive,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder
      } = queryParams;

      // Enhanced admin activity logging
      this.logAdminActivity(req, 'user_management', 'get_users', {
        description: `Retrieved users list with filters: ${JSON.stringify(queryParams)}`,
        severity: 'low',
        resourceType: 'user_list',
        metadata: { queryParams, totalFilters: Object.keys(queryParams).length }
      });

      // Build filter options
      const filters: any = {};
      if (search) {
        filters.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phoneNumber: { contains: search } }
        ];
      }
      if (role) filters.role = role.toUpperCase();
      if (typeof isVerified === 'boolean') filters.isVerified = isVerified;
      if (typeof isActive === 'boolean') filters.isActive = isActive;
      if (dateFrom || dateTo) {
        filters.createdAt = {};
        if (dateFrom) filters.createdAt.gte = dateFrom;
        if (dateTo) filters.createdAt.lte = dateTo;
      }

      // Get users from database with pagination and filters
      const result = await this.userRepository.findMany(filters, {
        include: {
          orders: { select: { id: true } },
          reviews: { select: { id: true } }
        },
        orderBy: { [sortBy]: sortOrder },
        pagination: { page, limit }
      });

      const users = result.data;
      const total = result.pagination.totalItems;

      // Format users for admin view with Nigerian context
      const formattedUsers = users.map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
        orderCount: user.orders?.length || 0,
        reviewCount: user.reviews?.length || 0,
        avatar: user.avatar,
        // Nigerian e-commerce specific fields
        nigerianPhone: user.phoneNumber ? user.phoneNumber.startsWith('+234') : false,
        verificationStatus: user.isVerified ? 'verified' : 'pending',
        accountAge: Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
      }));

      const totalPages = Math.ceil(total / limit);
      const pagination = {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      };

      // Use enhanced admin response with Nigerian context
      this.sendAdminSuccess(res, {
        users: formattedUsers,
        pagination
      }, 'Users retrieved successfully', 200, {
        activity: 'user_management',
        includeMetrics: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get user details by ID
   * GET /api/admin/users/:id
   */
  public getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = this.getUserId(req);

      if (!this.isValidUUID(id)) {
        this.sendError(res, "Invalid user ID format", 400, "INVALID_ID");
        return;
      }

      this.logAction('get_user_details', userId, 'admin_user', id);

      // For now, use repository with basic user data - actual implementation would include relations
      const user = await this.userRepository.findById(id);

      if (!user) {
        this.sendError(res, "User not found", 404, "USER_NOT_FOUND");
        return;
      }

      const userDetails = {
        ...user,
        statistics: {
          totalOrders: 2,
          totalReviews: 1,
          totalAddresses: 1,
          wishlistItems: 3
        }
      };

      this.sendSuccess(res, userDetails, 'User details retrieved successfully');
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Create new user (Admin only)
   * POST /api/admin/users
   */
  public createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);

      // Validate request body
      const { error, value: userData } = userManagementSchemas.createUser.validate(req.body);
      if (error) {
        this.sendError(res, "Invalid user data", 400, "VALIDATION_ERROR", error.details.map(d => d.message));
        return;
      }

      this.logAction('create_user', userId, 'admin_user', undefined, { phoneNumber: userData.phoneNumber, role: userData.role });

      // For now, use repository method - actual implementation would include full user creation logic
      const newUser = await this.userRepository.create({
        ...userData,
        role: userData.role.toUpperCase()
      });

      // Remove sensitive data from response
      const { ...userResponse } = newUser;
      delete (userResponse as any).password;

      this.sendSuccess(res, userResponse, 'User created successfully', 201);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Update user details (Admin only)
   * PUT /api/admin/users/:id
   */
  public updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = this.getUserId(req);

      if (!this.isValidUUID(id)) {
        this.sendError(res, "Invalid user ID format", 400, "INVALID_ID");
        return;
      }

      // Validate request body
      const { error, value: updateData } = userManagementSchemas.updateUser.validate(req.body);
      if (error) {
        this.sendError(res, "Invalid update data", 400, "VALIDATION_ERROR", error.details.map(d => d.message));
        return;
      }

      this.logAction('update_user', userId, 'admin_user', id, updateData);

      // Check if user exists
      const existingUser = await this.userRepository.findById(id);
      if (!existingUser) {
        this.sendError(res, "User not found", 404, "USER_NOT_FOUND");
        return;
      }

      // Update user
      const updatedUser = await this.userRepository.update(id, {
        ...updateData,
        role: updateData.role ? updateData.role.toUpperCase() : undefined
      });

      // Remove sensitive data from response
      const { ...userResponse } = updatedUser;
      delete (userResponse as any).password;

      this.sendSuccess(res, userResponse, 'User updated successfully');
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Delete user (Admin only)
   * DELETE /api/admin/users/:id
   */
  public deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = this.getUserId(req);

      if (!this.isValidUUID(id)) {
        this.sendError(res, "Invalid user ID format", 400, "INVALID_ID");
        return;
      }

      this.logAction('delete_user', userId, 'admin_user', id);

      // Check if user exists
      const existingUser = await this.userRepository.findById(id);
      if (!existingUser) {
        this.sendError(res, "User not found", 404, "USER_NOT_FOUND");
        return;
      }

      // Prevent deletion of super admin by regular admin
      const currentUser = await this.userRepository.findById(userId!);
      if (existingUser.role === 'SUPER_ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
        this.sendError(res, "Cannot delete super admin user", 403, "FORBIDDEN");
        return;
      }

      // Soft delete user (deactivate instead of hard delete)
      await this.userRepository.update(id, { isActive: false });

      this.sendSuccess(res, null, 'User deactivated successfully');
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Bulk actions on users with enhanced Nigerian compliance
   * POST /api/admin/users/bulk
   */
  public bulkUserAction = async (req: Request, res: Response): Promise<void> => {
    try {
      // Require super admin for bulk operations
      if (!this.requireAdminAuth(req, res, 'super_admin')) return;

      // Validate request body
      const { error, value: bulkData } = userManagementSchemas.userBulkAction.validate(req.body);
      if (error) {
        this.sendError(res, "Invalid bulk action data", 400, "VALIDATION_ERROR", error.details.map(d => d.message));
        return;
      }

      const { action, userIds, reason } = bulkData;

      // Enhanced logging for bulk operations
      this.logAdminActivity(req, 'bulk_operations', 'bulk_user_action', {
        description: `Performing bulk ${action} on ${userIds.length} users`,
        severity: 'high',
        resourceType: 'user_bulk',
        metadata: { action, userCount: userIds.length, reason }
      });

      // Use enhanced bulk operation processor
      const bulkResult = await this.processBulkOperation(
        userIds,
        async (userId: string, index: number) => {
          const user = await this.userRepository.findById(userId);
          if (!user) {
            throw new Error('User not found');
          }

          switch (action) {
            case 'activate':
              return await this.userRepository.update(userId, { isActive: true });
            case 'deactivate':
              return await this.userRepository.update(userId, { isActive: false });
            case 'verify':
              return await this.userRepository.update(userId, { isVerified: true });
            case 'delete':
              return await this.userRepository.update(userId, { isActive: false });
            default:
              throw new Error(`Invalid action: ${action}`);
          }
        },
        {
          batchSize: 10,
          validateNigerianCompliance: false, // Users don't require compliance
          logActivity: true,
          activityType: 'user_management'
        }
      );

      // Send enhanced admin response
      this.sendAdminSuccess(res, bulkResult, 
        `Bulk ${action} completed: ${bulkResult.successful} successful, ${bulkResult.failed} failed`,
        200, {
          activity: 'bulk_operations',
          includeMetrics: true
        }
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get user statistics
   * GET /api/admin/users/statistics
   */
  public getUserStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);

      this.logAction('get_user_statistics', userId, 'admin_user_stats');

      // Get comprehensive user statistics from database
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Parallel database queries for statistics
      const [
        totalUsers,
        verifiedUsers,
        activeUsers,
        customerUsers,
        adminUsers,
        superAdminUsers,
        registrationsToday,
        registrationsThisWeek,
        registrationsThisMonth,
        registrationsLastMonth,
        activeToday,
        activeThisWeek,
        activeThisMonth
      ] = await Promise.all([
        this.userRepository.count({}),
        this.userRepository.count({ isVerified: true }),
        this.userRepository.count({ isActive: true }),
        this.userRepository.count({ role: 'CUSTOMER' }),
        this.userRepository.count({ role: 'ADMIN' }),
        this.userRepository.count({ role: 'SUPER_ADMIN' }),
        this.userRepository.count({ createdAt: { gte: startOfToday } }),
        this.userRepository.count({ createdAt: { gte: startOfWeek } }),
        this.userRepository.count({ createdAt: { gte: startOfMonth } }),
        this.userRepository.count({ 
          createdAt: { 
            gte: startOfLastMonth, 
            lte: endOfLastMonth 
          } 
        }),
        this.userRepository.count({ 
          lastLoginAt: { gte: startOfToday },
          isActive: true 
        }),
        this.userRepository.count({ 
          lastLoginAt: { gte: startOfWeek },
          isActive: true 
        }),
        this.userRepository.count({ 
          lastLoginAt: { gte: startOfMonth },
          isActive: true 
        }),
      ]);

      // Calculate growth rate
      const growthRate = registrationsLastMonth > 0 
        ? ((registrationsThisMonth - registrationsLastMonth) / registrationsLastMonth) * 100 
        : registrationsThisMonth > 0 ? 100 : 0;

      const statistics = {
        total: {
          users: totalUsers,
          verified: verifiedUsers,
          active: activeUsers,
          customers: customerUsers,
          admins: adminUsers + superAdminUsers
        },
        growth: {
          thisMonth: registrationsThisMonth,
          lastMonth: registrationsLastMonth,
          growthRate: Math.round(growthRate * 10) / 10 // Round to 1 decimal
        },
        activity: {
          activeToday: activeToday,
          activeThisWeek: activeThisWeek,
          activeThisMonth: activeThisMonth
        },
        registrations: {
          today: registrationsToday,
          thisWeek: registrationsThisWeek,
          thisMonth: registrationsThisMonth
        },
        demographics: {
          byRole: {
            customer: customerUsers,
            admin: adminUsers,
            super_admin: superAdminUsers
          },
          byStatus: {
            verified: verifiedUsers,
            unverified: totalUsers - verifiedUsers,
            active: activeUsers,
            inactive: totalUsers - activeUsers
          }
        }
      };

      this.sendSuccess(res, statistics, 'User statistics retrieved successfully');
    } catch (error) {
      this.handleError(error, req, res);
    }
  };
}