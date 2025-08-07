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

      // For now, return placeholder user data - actual implementation would use repository
      const users = [
        {
          id: 'u1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@email.com',
          phoneNumber: '+2348012345678',
          role: 'CUSTOMER',
          isVerified: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          orders: [{ id: 'o1' }, { id: 'o2' }],
          reviews: [{ id: 'r1' }]
        },
        {
          id: 'u2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@email.com',
          phoneNumber: '+2348087654321',
          role: 'CUSTOMER',
          isVerified: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          orders: [{ id: 'o3' }],
          reviews: []
        }
      ];
      const total = users.length;

      // Format users for admin view
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
        lastLoginAt: user.lastLoginAt,
        orderCount: user.orders?.length || 0,
        reviewCount: user.reviews?.length || 0
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

      // For now, return placeholder statistics
      const statistics = {
        total: {
          users: 1247,
          verified: 892,
          active: 1156,
          customers: 1203,
          admins: 44
        },
        growth: {
          thisMonth: 47,
          lastMonth: 38,
          growthRate: 23.7
        },
        activity: {
          activeToday: 342,
          activeThisWeek: 756,
          activeThisMonth: 1089
        },
        registrations: {
          today: 8,
          thisWeek: 23,
          thisMonth: 47
        },
        demographics: {
          byRole: {
            customer: 1203,
            admin: 42,
            super_admin: 2
          },
          byStatus: {
            verified: 892,
            unverified: 355,
            active: 1156,
            inactive: 91
          }
        }
      };

      this.sendSuccess(res, statistics, 'User statistics retrieved successfully');
    } catch (error) {
      this.handleError(error, req, res);
    }
  };
}