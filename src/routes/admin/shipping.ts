import { Router } from "express";
import { AdminShippingController } from "../../controllers/admin/AdminShippingController";
import { authenticate } from "../../middleware/auth/authenticate";
import { authorize } from "../../middleware/auth/authorize";
import { validateRequest } from "../../middleware/validation/validateRequest";
import auditLogging from "../../middleware/logging/auditLogging";
import { body, param, query } from "express-validator";

const router = Router();
const shippingController = new AdminShippingController();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize(["ADMIN", "SUPER_ADMIN"]));
router.use(auditLogging.adminAuditLogger);

/**
 * @swagger
 * components:
 *   schemas:
 *     ShippingCarrier:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         code:
 *           type: string
 *         type:
 *           type: string
 *           enum: [express, standard, economy]
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, MAINTENANCE]
 *         supportedServices:
 *           type: array
 *           items:
 *             type: string
 *         coverageAreas:
 *           type: array
 *           items:
 *             type: string
 *     
 *     Shipment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         trackingNumber:
 *           type: string
 *         orderId:
 *           type: string
 *         carrierId:
 *           type: string
 *         status:
 *           type: string
 *         estimatedDelivery:
 *           type: string
 *           format: date-time
 */

// Carrier Management Routes

/**
 * @swagger
 * /api/admin/shipping/carriers:
 *   get:
 *     summary: Get all shipping carriers
 *     tags: [Admin Shipping]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Carriers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ShippingCarrier'
 */
router.get("/carriers", shippingController.getCarriers.bind(shippingController));

/**
 * @swagger
 * /api/admin/shipping/carriers:
 *   post:
 *     summary: Create new shipping carrier
 *     tags: [Admin Shipping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [express, standard, economy]
 *     responses:
 *       201:
 *         description: Carrier created successfully
 */
router.post(
  "/carriers",
  [
    body("name").notEmpty().withMessage("Carrier name is required"),
    body("code").notEmpty().withMessage("Carrier code is required"),
    body("type").isIn(["express", "standard", "economy"]).withMessage("Invalid carrier type"),
    validateRequest,
  ],
  shippingController.createCarrier.bind(shippingController)
);

/**
 * @swagger
 * /api/admin/shipping/carriers/{carrierId}:
 *   put:
 *     summary: Update shipping carrier
 *     tags: [Admin Shipping]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: carrierId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Carrier updated successfully
 */
router.put(
  "/carriers/:carrierId",
  [
    param("carrierId").isString().notEmpty(),
    validateRequest,
  ],
  shippingController.updateCarrier.bind(shippingController)
);

// Shipping Rate Management

/**
 * @swagger
 * /api/admin/shipping/rates:
 *   get:
 *     summary: Calculate shipping rates
 *     tags: [Admin Shipping]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: destinationCity
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: destinationState
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: packageWeight
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Shipping rates calculated successfully
 */
router.get(
  "/rates",
  [
    query("destinationCity").notEmpty().withMessage("Destination city is required"),
    query("destinationState").notEmpty().withMessage("Destination state is required"),
    query("packageWeight").isFloat({ min: 0.1 }).withMessage("Package weight must be at least 0.1 kg"),
    validateRequest,
  ],
  shippingController.calculateShippingRates.bind(shippingController)
);

// Label Management

/**
 * @swagger
 * /api/admin/shipping/labels:
 *   post:
 *     summary: Generate shipping labels
 *     tags: [Admin Shipping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shipmentId
 *             properties:
 *               shipmentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shipping label generated successfully
 */
router.post(
  "/labels",
  [
    body("shipmentId").isString().notEmpty().withMessage("Shipment ID is required"),
    validateRequest,
  ],
  shippingController.generateShippingLabel.bind(shippingController)
);

// Tracking Management

/**
 * @swagger
 * /api/admin/shipping/track:
 *   post:
 *     summary: Track shipment with carriers
 *     tags: [Admin Shipping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - trackingNumber
 *             properties:
 *               trackingNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shipment tracked successfully
 */
router.post(
  "/track",
  [
    body("trackingNumber").isString().notEmpty().withMessage("Tracking number is required"),
    validateRequest,
  ],
  shippingController.trackShipment.bind(shippingController)
);

/**
 * @swagger
 * /api/admin/shipping/tracking/{trackingNumber}:
 *   get:
 *     summary: Get detailed tracking information
 *     tags: [Admin Shipping]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tracking information retrieved successfully
 */
router.get(
  "/tracking/:trackingNumber",
  [
    param("trackingNumber").isString().notEmpty(),
    validateRequest,
  ],
  shippingController.getTrackingInfo.bind(shippingController)
);

/**
 * @swagger
 * /api/admin/shipping/tracking/bulk:
 *   post:
 *     summary: Bulk track multiple shipments
 *     tags: [Admin Shipping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - trackingNumbers
 *             properties:
 *               trackingNumbers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *               includeEvents:
 *                 type: boolean
 *               includeDeliveryAttempts:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Bulk tracking completed successfully
 */
router.post(
  "/tracking/bulk",
  [
    body("trackingNumbers")
      .isArray({ min: 1 })
      .withMessage("At least one tracking number is required"),
    body("trackingNumbers.*")
      .isString()
      .notEmpty()
      .withMessage("Invalid tracking number"),
    validateRequest,
  ],
  shippingController.bulkTrackShipments.bind(shippingController)
);

/**
 * @swagger
 * /api/admin/shipping/tracking/manual-update:
 *   post:
 *     summary: Manual tracking update
 *     tags: [Admin Shipping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shipmentId
 *               - status
 *               - description
 *             properties:
 *               shipmentId:
 *                 type: string
 *               status:
 *                 type: string
 *               description:
 *                 type: string
 *               location:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Manual tracking update added successfully
 */
router.post(
  "/tracking/manual-update",
  [
    body("shipmentId").isString().notEmpty().withMessage("Shipment ID is required"),
    body("status").isString().notEmpty().withMessage("Status is required"),
    body("description").isString().notEmpty().withMessage("Description is required"),
    validateRequest,
  ],
  shippingController.manualTrackingUpdate.bind(shippingController)
);

/**
 * @swagger
 * /api/admin/shipping/tracking/webhook:
 *   post:
 *     summary: Receive carrier webhook updates
 *     tags: [Admin Shipping]
 *     description: Endpoint for carriers to send tracking updates
 *     parameters:
 *       - in: header
 *         name: x-carrier-id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
router.post("/tracking/webhook", shippingController.handleCarrierWebhook.bind(shippingController));

// Status Management

/**
 * @swagger
 * /api/admin/shipping/update-status:
 *   put:
 *     summary: Update shipping status
 *     tags: [Admin Shipping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shipmentId
 *               - status
 *             properties:
 *               shipmentId:
 *                 type: string
 *               status:
 *                 type: string
 *               location:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shipping status updated successfully
 */
router.put(
  "/update-status",
  [
    body("shipmentId").isString().notEmpty().withMessage("Shipment ID is required"),
    body("status").isString().notEmpty().withMessage("Status is required"),
    validateRequest,
  ],
  shippingController.updateShippingStatus.bind(shippingController)
);

// Analytics and Reporting

/**
 * @swagger
 * /api/admin/shipping/analytics/performance:
 *   get:
 *     summary: Get delivery performance analytics
 *     tags: [Admin Shipping Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: states
 *         schema:
 *           type: string
 *           description: Comma-separated list of Nigerian states
 *     responses:
 *       200:
 *         description: Performance analytics retrieved successfully
 */
router.get("/analytics/performance", shippingController.getPerformanceAnalytics.bind(shippingController));

/**
 * @swagger
 * /api/admin/shipping/analytics/costs:
 *   get:
 *     summary: Get shipping cost analysis
 *     tags: [Admin Shipping Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Cost analytics retrieved successfully
 */
router.get("/analytics/costs", shippingController.getCostAnalytics.bind(shippingController));

/**
 * @swagger
 * /api/admin/shipping/analytics/delays:
 *   get:
 *     summary: Get delay analysis and patterns
 *     tags: [Admin Shipping Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: daysThreshold
 *         schema:
 *           type: integer
 *           minimum: 1
 *           description: Number of days to consider as delayed
 *     responses:
 *       200:
 *         description: Delay analytics retrieved successfully
 */
router.get("/analytics/delays", shippingController.getDelayAnalytics.bind(shippingController));

// Delivery Management

/**
 * @swagger
 * /api/admin/shipping/schedule-delivery:
 *   post:
 *     summary: Schedule delivery for specific time
 *     tags: [Admin Shipping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shipmentId
 *               - scheduledDate
 *               - timeWindow
 *             properties:
 *               shipmentId:
 *                 type: string
 *               scheduledDate:
 *                 type: string
 *                 format: date
 *               timeWindow:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                   end:
 *                     type: string
 *               driverInfo:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   vehicle:
 *                     type: string
 *     responses:
 *       200:
 *         description: Delivery scheduled successfully
 */
router.post(
  "/schedule-delivery",
  [
    body("shipmentId").isString().notEmpty().withMessage("Shipment ID is required"),
    body("scheduledDate").isISO8601().withMessage("Valid scheduled date is required"),
    body("timeWindow").isObject().withMessage("Time window is required"),
    body("timeWindow.start").isString().notEmpty().withMessage("Start time is required"),
    body("timeWindow.end").isString().notEmpty().withMessage("End time is required"),
    validateRequest,
  ],
  shippingController.scheduleDelivery.bind(shippingController)
);

/**
 * @swagger
 * /api/admin/shipping/delivery-calendar:
 *   get:
 *     summary: View delivery calendar with schedules
 *     tags: [Admin Shipping]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Delivery calendar retrieved successfully
 */
router.get("/delivery-calendar", shippingController.getDeliveryCalendar.bind(shippingController));

/**
 * @swagger
 * /api/admin/shipping/dashboard:
 *   get:
 *     summary: Get real-time shipping dashboard metrics
 *     tags: [Admin Shipping]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     overview:
 *                       type: object
 *                       properties:
 *                         todayShipments:
 *                           type: number
 *                         activeShipments:
 *                           type: number
 *                         delayedShipments:
 *                           type: number
 */
router.get("/dashboard", shippingController.getShippingDashboard.bind(shippingController));

// Shipment Operations

/**
 * @swagger
 * /api/admin/shipping/cancel:
 *   post:
 *     summary: Cancel shipment
 *     tags: [Admin Shipping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shipmentId
 *               - reason
 *             properties:
 *               shipmentId:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shipment cancellation processed
 */
router.post(
  "/cancel",
  [
    body("shipmentId").isString().notEmpty().withMessage("Shipment ID is required"),
    body("reason").isString().notEmpty().withMessage("Cancellation reason is required"),
    validateRequest,
  ],
  shippingController.cancelShipment.bind(shippingController)
);

export { router as shippingRoutes };