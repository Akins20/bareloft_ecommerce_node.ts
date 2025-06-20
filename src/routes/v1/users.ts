import { Router } from "express";
import { UserController } from "../../controllers/users/UserController";
import { authenticate } from "../../middleware/auth/authenticate";
import { authorize } from "../../middleware/auth/authorize";
import { validateRequest } from "../../middleware/validation/validateRequest";
import { rateLimiter } from "../../middleware/security/rateLimiter";
import {
  updateProfileSchema,
  changePasswordSchema,
  verifyPhoneSchema,
  confirmPhoneSchema,
  updatePreferencesSchema,
} from "../../utils/validation/schemas/userSchemas";

const router = Router();

// Initialize controller
let userController: UserController;

export const initializeUserRoutes = (controller: UserController) => {
  userController = controller;
  return router;
};

// Rate limiting for sensitive operations
const profileUpdateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 profile updates per 15 minutes
  message: "Too many profile update attempts. Please try again later.",
});

const passwordChangeLimit = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 password changes per hour
  message: "Too many password change attempts. Please try again later.",
});

const phoneVerificationLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 phone verification attempts per 15 minutes
  message: "Too many phone verification attempts. Please try again later.",
});

// ==================== USER PROFILE ENDPOINTS ====================

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get current user profile
 * @access  Private (Customer)
 */
router.get("/profile", authenticate, async (req, res, next) => {
  try {
    await userController.getProfile(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile information
 * @access  Private (Customer)
 * @body    UpdateUserProfileRequest {
 *   firstName?: string,
 *   lastName?: string,
 *   email?: string,
 *   dateOfBirth?: string,
 *   gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say'
 * }
 */
router.put(
  "/profile",
  authenticate,
  profileUpdateLimit,
  validateRequest(updateProfileSchema),
  async (req, res, next) => {
    try {
      await userController.updateProfile(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/users/profile/avatar
 * @desc    Upload user profile avatar
 * @access  Private (Customer)
 * @body    FormData { file: File }
 */
router.post(
  "/profile/avatar",
  authenticate,
  profileUpdateLimit,
  async (req, res, next) => {
    try {
      await userController.uploadAvatar(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/users/profile/avatar
 * @desc    Delete user profile avatar
 * @access  Private (Customer)
 */
router.delete("/profile/avatar", authenticate, async (req, res, next) => {
  try {
    await userController.deleteAvatar(req, res);
  } catch (error) {
    next(error);
  }
});

// ==================== ACCOUNT SECURITY ENDPOINTS ====================

/**
 * @route   PUT /api/v1/users/password/change
 * @desc    Change user password
 * @access  Private (Customer)
 * @body    ChangePasswordRequest {
 *   currentPassword: string,
 *   newPassword: string
 * }
 */
router.put(
  "/password/change",
  authenticate,
  passwordChangeLimit,
  validateRequest(changePasswordSchema),
  async (req, res, next) => {
    try {
      await userController.changePassword(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/users/phone/verify
 * @desc    Initiate phone number verification
 * @access  Private (Customer)
 * @body    { phoneNumber: NigerianPhoneNumber }
 */
router.post(
  "/phone/verify",
  authenticate,
  phoneVerificationLimit,
  validateRequest(verifyPhoneSchema),
  async (req, res, next) => {
    try {
      await userController.verifyPhoneNumber(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/users/phone/confirm
 * @desc    Confirm phone number verification with OTP
 * @access  Private (Customer)
 * @body    { phoneNumber: string, code: string }
 */
router.post(
  "/phone/confirm",
  authenticate,
  phoneVerificationLimit,
  validateRequest(confirmPhoneSchema),
  async (req, res, next) => {
    try {
      await userController.confirmPhoneVerification(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// ==================== ACCOUNT SUMMARY ENDPOINTS ====================

/**
 * @route   GET /api/v1/users/account/summary
 * @desc    Get user account summary (orders, addresses, etc.)
 * @access  Private (Customer)
 */
router.get("/account/summary", authenticate, async (req, res, next) => {
  try {
    await userController.getAccountSummary(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/users/activity
 * @desc    Get user activity log
 * @access  Private (Customer)
 * @query   { page?: number, limit?: number }
 */
router.get("/activity", authenticate, async (req, res, next) => {
  try {
    await userController.getActivityLog(req, res);
  } catch (error) {
    next(error);
  }
});

// ==================== USER PREFERENCES ENDPOINTS ====================

/**
 * @route   GET /api/v1/users/preferences
 * @desc    Get user preferences (notifications, privacy, etc.)
 * @access  Private (Customer)
 */
router.get("/preferences", authenticate, async (req, res, next) => {
  try {
    await userController.getPreferences(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/users/preferences
 * @desc    Update user preferences
 * @access  Private (Customer)
 * @body    {
 *   notifications?: {
 *     email?: { orderUpdates?: boolean, promotions?: boolean, newsletters?: boolean },
 *     sms?: { orderUpdates?: boolean, promotions?: boolean, securityAlerts?: boolean },
 *     push?: { orderUpdates?: boolean, promotions?: boolean, inAppMessages?: boolean }
 *   },
 *   privacy?: {
 *     profileVisibility?: 'public' | 'private',
 *     showReviews?: boolean,
 *     allowDataCollection?: boolean
 *   }
 * }
 */
router.put(
  "/preferences",
  authenticate,
  validateRequest(updatePreferencesSchema),
  async (req, res, next) => {
    try {
      await userController.updatePreferences(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/users/email/preferences
 * @desc    Update email notification preferences
 * @access  Private (Customer)
 * @body    {
 *   orderUpdates?: boolean,
 *   promotions?: boolean,
 *   newsletters?: boolean,
 *   productUpdates?: boolean,
 *   securityAlerts?: boolean
 * }
 */
router.put("/email/preferences", authenticate, async (req, res, next) => {
  try {
    await userController.updateEmailPreferences(req, res);
  } catch (error) {
    next(error);
  }
});

// ==================== ACCOUNT MANAGEMENT ENDPOINTS ====================

/**
 * @route   PUT /api/v1/users/account/deactivate
 * @desc    Deactivate user account
 * @access  Private (Customer)
 * @body    { password: string, reason?: string }
 */
router.put(
  "/account/deactivate",
  authenticate,
  rateLimiter({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRequests: 1, // 1 deactivation attempt per day
    message: "Account deactivation can only be attempted once per day.",
  }),
  async (req, res, next) => {
    try {
      await userController.deactivateAccount(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/users/account/export
 * @desc    Request account data export (GDPR compliance)
 * @access  Private (Customer)
 */
router.post(
  "/account/export",
  authenticate,
  rateLimiter({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRequests: 1, // 1 export request per day
    message: "Data export can only be requested once per day.",
  }),
  async (req, res, next) => {
    try {
      await userController.requestDataExport(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// ==================== USER STATISTICS ENDPOINTS ====================

/**
 * @route   GET /api/v1/users/stats/orders
 * @desc    Get user's order statistics
 * @access  Private (Customer)
 * @query   { period?: '30d' | '90d' | '1y' | 'all' }
 */
router.get("/stats/orders", authenticate, async (req, res, next) => {
  try {
    res.status(501).json({
      success: false,
      message: "User order statistics not yet implemented",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/users/stats/spending
 * @desc    Get user's spending analytics
 * @access  Private (Customer)
 * @query   { period?: '30d' | '90d' | '1y' | 'all' }
 */
router.get("/stats/spending", authenticate, async (req, res, next) => {
  try {
    res.status(501).json({
      success: false,
      message: "User spending analytics not yet implemented",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/users/stats/activity
 * @desc    Get user's activity statistics
 * @access  Private (Customer)
 * @query   { period?: '30d' | '90d' | '1y' | 'all' }
 */
router.get("/stats/activity", authenticate, async (req, res, next) => {
  try {
    res.status(501).json({
      success: false,
      message: "User activity statistics not yet implemented",
    });
  } catch (error) {
    next(error);
  }
});

// ==================== SOCIAL FEATURES ENDPOINTS ====================

/**
 * @route   GET /api/v1/users/public/:userId
 * @desc    Get public user profile (for social features)
 * @access  Public
 * @param   userId - User ID
 */
router.get("/public/:userId", async (req, res, next) => {
  try {
    res.status(501).json({
      success: false,
      message: "Public user profiles not yet implemented",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/users/following
 * @desc    Get users that current user is following
 * @access  Private (Customer)
 * @query   { page?: number, limit?: number }
 */
router.get("/following", authenticate, async (req, res, next) => {
  try {
    res.status(501).json({
      success: false,
      message: "User following feature not yet implemented",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/users/followers
 * @desc    Get users following current user
 * @access  Private (Customer)
 * @query   { page?: number, limit?: number }
 */
router.get("/followers", authenticate, async (req, res, next) => {
  try {
    res.status(501).json({
      success: false,
      message: "User followers feature not yet implemented",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/users/follow/:userId
 * @desc    Follow another user
 * @access  Private (Customer)
 * @param   userId - User ID to follow
 */
router.post("/follow/:userId", authenticate, async (req, res, next) => {
  try {
    res.status(501).json({
      success: false,
      message: "User follow feature not yet implemented",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/users/follow/:userId
 * @desc    Unfollow a user
 * @access  Private (Customer)
 * @param   userId - User ID to unfollow
 */
router.delete("/follow/:userId", authenticate, async (req, res, next) => {
  try {
    res.status(501).json({
      success: false,
      message: "User unfollow feature not yet implemented",
    });
  } catch (error) {
    next(error);
  }
});

// ==================== LOYALTY PROGRAM ENDPOINTS ====================

/**
 * @route   GET /api/v1/users/loyalty
 * @desc    Get user's loyalty program status
 * @access  Private (Customer)
 */
router.get("/loyalty", authenticate, async (req, res, next) => {
  try {
    res.status(501).json({
      success: false,
      message: "Loyalty program not yet implemented",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/users/loyalty/points
 * @desc    Get user's loyalty points history
 * @access  Private (Customer)
 * @query   { page?: number, limit?: number }
 */
router.get("/loyalty/points", authenticate, async (req, res, next) => {
  try {
    res.status(501).json({
      success: false,
      message: "Loyalty points system not yet implemented",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/users/loyalty/redeem
 * @desc    Redeem loyalty points for rewards
 * @access  Private (Customer)
 * @body    { rewardId: string, pointsToRedeem: number }
 */
router.post("/loyalty/redeem", authenticate, async (req, res, next) => {
  try {
    res.status(501).json({
      success: false,
      message: "Loyalty points redemption not yet implemented",
    });
  } catch (error) {
    next(error);
  }
});

// ==================== ADMIN USER MANAGEMENT ENDPOINTS ====================

/**
 * @route   GET /api/v1/users/admin/all
 * @desc    Get all users with admin filtering (Admin only)
 * @access  Private (Admin)
 * @query   {
 *   page?: number,
 *   limit?: number,
 *   search?: string,
 *   role?: UserRole,
 *   isVerified?: boolean,
 *   isActive?: boolean,
 *   dateFrom?: string,
 *   dateTo?: string
 * }
 */
router.get(
  "/admin/all",
  authenticate,
  authorize(["admin", "super_admin"]),
  async (req, res, next) => {
    try {
      res.status(501).json({
        success: false,
        message: "Admin user management not yet implemented",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/users/admin/:userId/status
 * @desc    Update user status (Admin only)
 * @access  Private (Admin)
 * @param   userId - User ID
 * @body    { status: 'active' | 'inactive' | 'suspended', reason?: string }
 */
router.put(
  "/admin/:userId/status",
  authenticate,
  authorize(["admin", "super_admin"]),
  async (req, res, next) => {
    try {
      res.status(501).json({
        success: false,
        message: "Admin user status management not yet implemented",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/users/admin/:userId/role
 * @desc    Update user role (Super Admin only)
 * @access  Private (Super Admin)
 * @param   userId - User ID
 * @body    { role: UserRole, reason?: string }
 */
router.put(
  "/admin/:userId/role",
  authenticate,
  authorize(["super_admin"]),
  async (req, res, next) => {
    try {
      res.status(501).json({
        success: false,
        message: "Admin user role management not yet implemented",
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
