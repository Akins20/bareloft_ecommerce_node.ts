import { Router } from "express";
import { ShippingController } from "../../controllers/v1/ShippingController";
import { validateRequest } from "../../middleware/validation/expressValidatorMiddleware";
import { body, param } from "express-validator";

const router = Router();
const shippingController = new ShippingController();

/**
 * @swagger
 * components:
 *   schemas:
 *     ShippingRateRequest:
 *       type: object
 *       required:
 *         - destinationCity
 *         - destinationState
 *         - packageWeight
 *         - declaredValue
 *       properties:
 *         originCity:
 *           type: string
 *           default: Lagos
 *           description: Origin city for shipment
 *         originState:
 *           type: string
 *           default: Lagos
 *           description: Origin state for shipment
 *         destinationCity:
 *           type: string
 *           description: Destination city
 *         destinationState:
 *           type: string
 *           description: Destination state
 *         packageWeight:
 *           type: number
 *           minimum: 0.1
 *           description: Package weight in kg
 *         packageDimensions:
 *           type: object
 *           properties:
 *             length:
 *               type: number
 *               description: Length in cm
 *             width:
 *               type: number
 *               description: Width in cm
 *             height:
 *               type: number
 *               description: Height in cm
 *         declaredValue:
 *           type: number
 *           minimum: 0
 *           description: Declared package value in Naira
 *         serviceType:
 *           type: string
 *           enum: [standard, express, same-day]
 *           description: Preferred service type
 *     
 *     ShippingRate:
 *       type: object
 *       properties:
 *         carrierId:
 *           type: string
 *         carrierName:
 *           type: string
 *         serviceType:
 *           type: string
 *         cost:
 *           type: number
 *         currency:
 *           type: string
 *         estimatedDays:
 *           type: number
 *         estimatedDelivery:
 *           type: string
 *           format: date-time
 *         additionalFees:
 *           type: object
 *           properties:
 *             fuelSurcharge:
 *               type: number
 *             insurance:
 *               type: number
 *             vat:
 *               type: number
 *     
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
 *         coverageAreas:
 *           type: array
 *           items:
 *             type: string
 *         deliveryTimeframes:
 *           type: object
 *         contactInfo:
 *           type: object
 *           properties:
 *             phone:
 *               type: string
 *             email:
 *               type: string
 *             website:
 *               type: string
 *     
 *     ShippingZone:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         states:
 *           type: array
 *           items:
 *             type: string
 *         cities:
 *           type: array
 *           items:
 *             type: string
 *         baseRate:
 *           type: number
 *         deliveryDays:
 *           type: number
 *         expressDeliveryDays:
 *           type: number
 *         isActive:
 *           type: boolean
 *     
 *     TrackingInfo:
 *       type: object
 *       properties:
 *         trackingNumber:
 *           type: string
 *         status:
 *           type: string
 *         estimatedDelivery:
 *           type: string
 *           format: date-time
 *         actualDelivery:
 *           type: string
 *           format: date-time
 *         currentLocation:
 *           type: string
 *         progress:
 *           type: object
 *           properties:
 *             percentage:
 *               type: number
 *             currentStep:
 *               type: string
 *             nextStep:
 *               type: string
 *         events:
 *           type: array
 *           items:
 *             type: object
 *         deliveryAttempts:
 *           type: array
 *           items:
 *             type: object
 */

/**
 * @swagger
 * /api/v1/shipping/rates:
 *   post:
 *     summary: Calculate shipping rates
 *     description: Get shipping rates from multiple carriers for a package
 *     tags: [Shipping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShippingRateRequest'
 *           example:
 *             destinationCity: "Abuja"
 *             destinationState: "FCT"
 *             packageWeight: 2.5
 *             packageDimensions:
 *               length: 30
 *               width: 25
 *               height: 15
 *             declaredValue: 50000
 *             serviceType: "standard"
 *     responses:
 *       200:
 *         description: Shipping rates calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ShippingRate'
 *                 metadata:
 *                   type: object
 *       400:
 *         description: Validation failed
 *       500:
 *         description: Internal server error
 */
router.post(
  "/rates",
  [
    body("destinationCity")
      .notEmpty()
      .withMessage("Destination city is required")
      .isString()
      .withMessage("Destination city must be a string"),
    body("destinationState")
      .notEmpty()
      .withMessage("Destination state is required")
      .isString()
      .withMessage("Destination state must be a string"),
    body("packageWeight")
      .isFloat({ min: 0.1 })
      .withMessage("Package weight must be at least 0.1 kg"),
    body("declaredValue")
      .isFloat({ min: 0 })
      .withMessage("Declared value must be a positive number"),
    body("packageDimensions.length")
      .optional()
      .isFloat({ min: 1 })
      .withMessage("Package length must be at least 1 cm"),
    body("packageDimensions.width")
      .optional()
      .isFloat({ min: 1 })
      .withMessage("Package width must be at least 1 cm"),
    body("packageDimensions.height")
      .optional()
      .isFloat({ min: 1 })
      .withMessage("Package height must be at least 1 cm"),
    body("serviceType")
      .optional()
      .isIn(["standard", "express", "same-day", "economy"])
      .withMessage("Invalid service type"),
    validateRequest,
  ],
  shippingController.getRates
);

/**
 * @swagger
 * /api/v1/shipping/carriers:
 *   get:
 *     summary: Get available shipping carriers
 *     description: Retrieve list of active shipping carriers
 *     tags: [Shipping]
 *     responses:
 *       200:
 *         description: Available carriers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ShippingCarrier'
 *       500:
 *         description: Internal server error
 */
router.get("/carriers", shippingController.getCarriers);

/**
 * @swagger
 * /api/v1/shipping/zones:
 *   get:
 *     summary: Get shipping zones
 *     description: Retrieve available shipping zones with rates and delivery times
 *     tags: [Shipping]
 *     responses:
 *       200:
 *         description: Shipping zones retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ShippingZone'
 *       500:
 *         description: Internal server error
 */
router.get("/zones", shippingController.getZones);

/**
 * @swagger
 * /api/v1/shipping/track/{trackingNumber}:
 *   get:
 *     summary: Track shipment
 *     description: Get tracking information for a shipment
 *     tags: [Shipping]
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Shipment tracking number
 *     responses:
 *       200:
 *         description: Tracking information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/TrackingInfo'
 *       400:
 *         description: Invalid tracking number
 *       404:
 *         description: Shipment not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/track/:trackingNumber",
  [
    param("trackingNumber")
      .notEmpty()
      .withMessage("Tracking number is required")
      .isString()
      .withMessage("Tracking number must be a string")
      .isLength({ min: 5, max: 50 })
      .withMessage("Tracking number must be between 5 and 50 characters"),
    validateRequest,
  ],
  shippingController.trackShipment
);

export default router;