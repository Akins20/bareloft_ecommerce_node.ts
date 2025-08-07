import { Router } from "express";
import { AdminSettingsController } from "../../controllers/admin/AdminSettingsController";
import { authenticate } from "../../middleware/auth/authenticate";
import { authorize } from "../../middleware/auth/authorize";
import { rateLimiter } from "../../middleware/security/rateLimiter";

const router = Router();
const settingsController = new AdminSettingsController();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize(["ADMIN", "SUPER_ADMIN"]));

// Apply rate limiting for admin endpoints
router.use(rateLimiter.admin);

/**
 * @route   GET /api/admin/settings
 * @desc    Get all system settings
 * @access  Admin, Super Admin
 */
router.get("/", settingsController.getSettings);

/**
 * @route   GET /api/admin/settings/system-info
 * @desc    Get system information and status
 * @access  Admin, Super Admin
 */
router.get("/system-info", settingsController.getSystemInfo);

/**
 * @route   GET /api/admin/settings/export
 * @desc    Export system settings
 * @access  Admin, Super Admin
 * @query   includeSecrets - Include sensitive data (super admin only)
 */
router.get("/export", settingsController.exportSettings);

/**
 * @route   PUT /api/admin/settings/general
 * @desc    Update general settings
 * @access  Admin, Super Admin
 * @body    siteName?, siteDescription?, contactEmail?, contactPhone?, currency?, timezone?, maintenanceMode?
 */
router.put("/general", settingsController.updateGeneralSettings);

/**
 * @route   PUT /api/admin/settings/payment
 * @desc    Update payment settings
 * @access  Admin, Super Admin
 * @body    paystackPublicKey?, paystackSecretKey?, enabledMethods?, freeShippingThreshold?, defaultShippingFee?, taxRate?
 */
router.put("/payment", settingsController.updatePaymentSettings);

/**
 * @route   PUT /api/admin/settings/notifications
 * @desc    Update notification settings
 * @access  Admin, Super Admin
 * @body    emailNotifications?, smsNotifications?, adminEmail?, lowStockThreshold?, orderNotifications?
 */
router.put("/notifications", settingsController.updateNotificationSettings);

/**
 * @route   POST /api/admin/settings/maintenance
 * @desc    Toggle maintenance mode
 * @access  Admin, Super Admin
 * @body    enabled (boolean), message?
 */
router.post("/maintenance", settingsController.toggleMaintenanceMode);

/**
 * @route   POST /api/admin/settings/cache/clear
 * @desc    Clear system cache
 * @access  Admin, Super Admin
 * @body    cacheType? (all, products, categories, users, analytics)
 */
router.post("/cache/clear", settingsController.clearCache);

/**
 * @route   POST /api/admin/settings/import
 * @desc    Import system settings
 * @access  Admin, Super Admin
 * @body    settings (object), overwrite? (boolean)
 */
router.post("/import", settingsController.importSettings);

export default router;