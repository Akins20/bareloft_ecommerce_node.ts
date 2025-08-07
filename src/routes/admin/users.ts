import { Router } from "express";
import { AdminUserController } from "../../controllers/admin/AdminUserController";
import { authenticate } from "../../middleware/auth/authenticate";
import { authorize } from "../../middleware/auth/authorize";
import { rateLimiter } from "../../middleware/security/rateLimiter";

const router = Router();
const userController = new AdminUserController();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize(["ADMIN", "SUPER_ADMIN"]));

// Apply rate limiting for admin endpoints
router.use(rateLimiter.admin);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filtering, pagination, and sorting
 * @access  Admin, Super Admin
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20, max: 100)
 * @query   search - Search term for name, email, or phone
 * @query   role - Filter by user role (customer, admin, super_admin)
 * @query   isVerified - Filter by verification status (true/false)
 * @query   isActive - Filter by active status (true/false)
 * @query   dateFrom - Filter users created from this date
 * @query   dateTo - Filter users created until this date
 * @query   sortBy - Sort field (firstName, lastName, email, createdAt, lastLoginAt)
 * @query   sortOrder - Sort order (asc, desc)
 */
router.get("/", userController.getUsers);

/**
 * @route   GET /api/admin/users/statistics
 * @desc    Get user statistics and analytics
 * @access  Admin, Super Admin
 */
router.get("/statistics", userController.getUserStatistics);

/**
 * @route   POST /api/admin/users
 * @desc    Create new user (Admin only)
 * @access  Admin, Super Admin
 * @body    phoneNumber, firstName, lastName, email?, role?, isVerified?, isActive?
 */
router.post("/", userController.createUser);

/**
 * @route   POST /api/admin/users/bulk
 * @desc    Perform bulk actions on users
 * @access  Admin, Super Admin
 * @body    action (activate, deactivate, verify, delete), userIds[], reason?
 */
router.post("/bulk", userController.bulkUserAction);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user details by ID
 * @access  Admin, Super Admin
 * @param   id - User ID (UUID)
 */
router.get("/:id", userController.getUserById);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user details
 * @access  Admin, Super Admin
 * @param   id - User ID (UUID)
 * @body    firstName?, lastName?, email?, role?, isVerified?, isActive?
 */
router.put("/:id", userController.updateUser);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete/deactivate user
 * @access  Admin, Super Admin
 * @param   id - User ID (UUID)
 */
router.delete("/:id", userController.deleteUser);

export default router;