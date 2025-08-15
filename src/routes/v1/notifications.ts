import { Router } from "express";
import { NotificationController } from "../../controllers/NotificationController";
import { authenticate } from "../../middleware/auth/authenticate";

const router = Router();
const notificationController = new NotificationController();

/**
 * @route   GET /api/v1/notifications
 * @desc    Get user notifications
 * @access  Private (Authenticated users only)
 * @query   {
 *   page?: number,
 *   limit?: number,
 *   unreadOnly?: boolean
 * }
 */
router.get("/", authenticate, async (req, res, next) => {
  try {
    await notificationController.getNotifications(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/notifications
 * @desc    Create a new notification
 * @access  Private (Authenticated users only)
 * @body    {
 *   userId: string,
 *   type: 'order' | 'system' | 'promotion' | 'account',
 *   category?: string,
 *   title: string,
 *   message: string,
 *   metadata?: object
 * }
 */
router.post("/", authenticate, async (req, res, next) => {
  try {
    await notificationController.createNotification(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private (Authenticated users only)
 */
router.put("/:id/read", authenticate, async (req, res, next) => {
  try {
    await notificationController.markAsRead(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete notification
 * @access  Private (Authenticated users only)
 */
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    await notificationController.deleteNotification(req as any, res);
  } catch (error) {
    next(error);
  }
});

export default router;