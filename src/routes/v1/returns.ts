/**
 * Customer-facing Return Request Routes
 * Nigerian e-commerce platform - Customer return management
 */

import { Router } from 'express';
import { CustomerReturnsController } from '../../controllers/returns/CustomerReturnsController';
import { authenticate } from '../../middleware/auth/authenticate';
import { rateLimiter } from '../../middleware/security/rateLimiter';
import { validateRequest } from '../../middleware/validation/validateRequest';
import { body, param, query } from 'express-validator';
// import { uploadMiddleware } from '../../middleware/upload/uploadMiddleware'; // TODO: Implement upload middleware

const router = Router();
const customerReturnsController = new CustomerReturnsController();

// Rate limiting for return operations
const returnRequestLimit = rateLimiter.authenticated;
const returnListLimit = rateLimiter.general;

// ==================== CUSTOMER RETURN REQUEST ENDPOINTS ====================

/**
 * @route   POST /api/v1/returns/request
 * @desc    Submit new return request
 * @access  Private (Customer)
 */
router.post(
  '/request',
  authenticate,
  returnRequestLimit,
  [
    body('orderId')
      .isString()
      .notEmpty()
      .withMessage('Order ID is required'),
    body('reason')
      .isIn(['DEFECTIVE', 'WRONG_ITEM', 'WRONG_SIZE', 'DAMAGED_SHIPPING', 'NOT_AS_DESCRIBED', 'CHANGED_MIND', 'DUPLICATE_ORDER', 'QUALITY_ISSUES', 'LATE_DELIVERY', 'OTHER'])
      .withMessage('Invalid return reason'),
    body('description')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('items')
      .isArray({ min: 1 })
      .withMessage('At least one item must be selected for return'),
    body('items.*.orderItemId')
      .isString()
      .notEmpty()
      .withMessage('Order item ID is required'),
    body('items.*.quantityToReturn')
      .isInt({ min: 1 })
      .withMessage('Quantity to return must be at least 1'),
    body('items.*.reason')
      .optional()
      .isString()
      .trim(),
    body('returnShippingMethod')
      .optional()
      .isIn(['CUSTOMER_DROP_OFF', 'PICKUP_SERVICE', 'COURIER_SERVICE', 'POSTAL_SERVICE'])
      .withMessage('Invalid return shipping method'),
    body('customerNotes')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Customer notes must be less than 500 characters'),
    body('pickupAddress')
      .optional()
      .isObject(),
    body('pickupAddress.firstName')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 2 })
      .withMessage('First name must be at least 2 characters'),
    body('pickupAddress.lastName')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Last name must be at least 2 characters'),
    body('pickupAddress.phoneNumber')
      .optional()
      .matches(/^\+234[789][01]\d{8}$/)
      .withMessage('Invalid Nigerian phone number format (+234xxxxxxxxxx)'),
    body('pickupAddress.addressLine1')
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Address line 1 is required'),
    body('pickupAddress.city')
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage('City is required'),
    body('pickupAddress.state')
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage('State is required'),
  ],
  validateRequest,
  customerReturnsController.submitReturnRequest.bind(customerReturnsController)
);

/**
 * @route   GET /api/v1/returns/my-returns
 * @desc    List customer's return requests
 * @access  Private (Customer)
 */
router.get(
  '/my-returns',
  authenticate,
  returnListLimit,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .isString(),
    query('reason')
      .optional()
      .isString(),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be valid ISO 8601 date'),
    query('search')
      .optional()
      .isString()
      .trim(),
    query('sortBy')
      .optional()
      .isIn(['createdAt', 'amount', 'status', 'estimatedPickupDate'])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc'),
  ],
  validateRequest,
  customerReturnsController.getMyReturns.bind(customerReturnsController)
);

/**
 * @route   GET /api/v1/returns/:returnId
 * @desc    Get specific return details
 * @access  Private (Customer - own returns only)
 */
router.get(
  '/:returnId',
  authenticate,
  [
    param('returnId')
      .isString()
      .notEmpty()
      .withMessage('Return ID is required'),
  ],
  validateRequest,
  customerReturnsController.getReturnDetails.bind(customerReturnsController)
);

/**
 * @route   PUT /api/v1/returns/:returnId/cancel
 * @desc    Cancel pending return request
 * @access  Private (Customer - own returns only)
 */
router.put(
  '/:returnId/cancel',
  authenticate,
  [
    param('returnId')
      .isString()
      .notEmpty()
      .withMessage('Return ID is required'),
    body('reason')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Cancellation reason must be less than 500 characters'),
  ],
  validateRequest,
  customerReturnsController.cancelReturnRequest.bind(customerReturnsController)
);

/**
 * @route   POST /api/v1/returns/:returnId/upload-photos
 * @desc    Upload return photos
 * @access  Private (Customer - own returns only)
 */
router.post(
  '/:returnId/upload-photos',
  authenticate,
  // uploadMiddleware.array('photos', 10), // Max 10 photos // TODO: Implement upload middleware
  [
    param('returnId')
      .isString()
      .notEmpty()
      .withMessage('Return ID is required'),
    body('description')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
  ],
  validateRequest,
  customerReturnsController.uploadReturnPhotos.bind(customerReturnsController)
);

/**
 * @route   GET /api/v1/returns/eligibility/:orderId
 * @desc    Check return eligibility for order
 * @access  Private (Customer - own orders only)
 */
router.get(
  '/eligibility/:orderId',
  authenticate,
  [
    param('orderId')
      .isString()
      .notEmpty()
      .withMessage('Order ID is required'),
    query('items')
      .optional()
      .isArray(),
    query('items.*.orderItemId')
      .optional()
      .isString(),
    query('items.*.quantityToReturn')
      .optional()
      .isInt({ min: 1 }),
  ],
  validateRequest,
  customerReturnsController.checkReturnEligibility.bind(customerReturnsController)
);

// ==================== CUSTOMER RETURN DASHBOARD ENDPOINTS ====================

/**
 * @route   GET /api/v1/returns/dashboard
 * @desc    Customer return dashboard with summary and quick actions
 * @access  Private (Customer)
 */
router.get(
  '/dashboard',
  authenticate,
  [
    query('period')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Period must be between 1 and 365 days'),
  ],
  validateRequest,
  customerReturnsController.getReturnDashboard.bind(customerReturnsController)
);

/**
 * @route   GET /api/v1/returns/:returnId/timeline
 * @desc    Get return request timeline/history
 * @access  Private (Customer - own returns only)
 */
router.get(
  '/:returnId/timeline',
  authenticate,
  [
    param('returnId')
      .isString()
      .notEmpty()
      .withMessage('Return ID is required'),
  ],
  validateRequest,
  customerReturnsController.getReturnTimeline.bind(customerReturnsController)
);

/**
 * @route   GET /api/v1/returns/:returnId/refund-estimate
 * @desc    Get estimated refund information
 * @access  Private (Customer - own returns only)
 */
router.get(
  '/:returnId/refund-estimate',
  authenticate,
  [
    param('returnId')
      .isString()
      .notEmpty()
      .withMessage('Return ID is required'),
  ],
  validateRequest,
  customerReturnsController.getRefundEstimate.bind(customerReturnsController)
);

// ==================== RETURN POLICY & INFORMATION ENDPOINTS ====================

/**
 * @route   GET /api/v1/returns/policy
 * @desc    Return policy details and information
 * @access  Public
 */
router.get(
  '/policy',
  returnListLimit,
  customerReturnsController.getReturnPolicy.bind(customerReturnsController)
);

/**
 * @route   GET /api/v1/returns/faq
 * @desc    Frequently asked questions about returns
 * @access  Public
 */
router.get(
  '/faq',
  returnListLimit,
  customerReturnsController.getReturnFAQ.bind(customerReturnsController)
);

/**
 * @route   GET /api/v1/returns/reasons
 * @desc    Get available return reasons and descriptions
 * @access  Public
 */
router.get(
  '/reasons',
  returnListLimit,
  customerReturnsController.getReturnReasons.bind(customerReturnsController)
);

// ==================== RETURN SHIPPING & PICKUP ENDPOINTS ====================

/**
 * @route   POST /api/v1/returns/:returnId/schedule-pickup
 * @desc    Schedule return pickup
 * @access  Private (Customer - own returns only)
 */
router.post(
  '/:returnId/schedule-pickup',
  authenticate,
  [
    param('returnId')
      .isString()
      .notEmpty()
      .withMessage('Return ID is required'),
    body('preferredDate')
      .isISO8601()
      .withMessage('Preferred date must be valid ISO 8601 date'),
    body('timeSlot')
      .isIn(['morning', 'afternoon', 'evening'])
      .withMessage('Invalid time slot'),
    body('specialInstructions')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Special instructions must be less than 500 characters'),
    body('contactPhone')
      .matches(/^\+234[789][01]\d{8}$/)
      .withMessage('Invalid Nigerian phone number format (+234xxxxxxxxxx)'),
  ],
  validateRequest,
  customerReturnsController.scheduleReturnPickup.bind(customerReturnsController)
);

/**
 * @route   GET /api/v1/returns/pickup-locations
 * @desc    Get available pickup/drop-off locations
 * @access  Public
 */
router.get(
  '/pickup-locations',
  returnListLimit,
  [
    query('state')
      .optional()
      .isString()
      .trim(),
    query('city')
      .optional()
      .isString()
      .trim(),
  ],
  validateRequest,
  customerReturnsController.getPickupLocations.bind(customerReturnsController)
);

/**
 * @route   GET /api/v1/returns/:returnId/tracking
 * @desc    Track return shipment
 * @access  Private (Customer - own returns only)
 */
router.get(
  '/:returnId/tracking',
  authenticate,
  [
    param('returnId')
      .isString()
      .notEmpty()
      .withMessage('Return ID is required'),
  ],
  validateRequest,
  customerReturnsController.trackReturnShipment.bind(customerReturnsController)
);

/**
 * @route   GET /api/v1/returns/shipping-cost/:orderId
 * @desc    Get return shipping cost estimate
 * @access  Private (Customer - own orders only)
 */
router.get(
  '/shipping-cost/:orderId',
  authenticate,
  [
    param('orderId')
      .isString()
      .notEmpty()
      .withMessage('Order ID is required'),
    query('returnMethod')
      .optional()
      .isIn(['CUSTOMER_DROP_OFF', 'PICKUP_SERVICE', 'COURIER_SERVICE', 'POSTAL_SERVICE'])
      .withMessage('Invalid return method'),
    query('pickupState')
      .optional()
      .isString()
      .trim(),
  ],
  validateRequest,
  customerReturnsController.getReturnShippingCost.bind(customerReturnsController)
);

// ==================== CUSTOMER SUPPORT INTEGRATION ====================

/**
 * @route   POST /api/v1/returns/:returnId/create-ticket
 * @desc    Create support ticket for return issue
 * @access  Private (Customer - own returns only)
 */
router.post(
  '/:returnId/create-ticket',
  authenticate,
  [
    param('returnId')
      .isString()
      .notEmpty()
      .withMessage('Return ID is required'),
    body('subject')
      .isString()
      .trim()
      .notEmpty()
      .isLength({ min: 5, max: 100 })
      .withMessage('Subject must be between 5 and 100 characters'),
    body('description')
      .isString()
      .trim()
      .notEmpty()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Description must be between 10 and 1000 characters'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority level'),
    body('category')
      .optional()
      .isString()
      .trim(),
  ],
  validateRequest,
  customerReturnsController.createReturnSupportTicket.bind(customerReturnsController)
);

/**
 * @route   GET /api/v1/returns/help/suggestions
 * @desc    Get AI-powered help suggestions for return issues
 * @access  Private (Customer)
 */
router.get(
  '/help/suggestions',
  authenticate,
  [
    query('issue')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Issue description is required'),
    query('returnId')
      .optional()
      .isString(),
  ],
  validateRequest,
  customerReturnsController.getReturnHelpSuggestions.bind(customerReturnsController)
);

// ==================== CUSTOMER RETURN ANALYTICS & INSIGHTS ====================

/**
 * @route   GET /api/v1/returns/my-analytics
 * @desc    Personal return analytics and insights for customer
 * @access  Private (Customer)
 */
router.get(
  '/my-analytics',
  authenticate,
  [
    query('period')
      .optional()
      .isInt({ min: 30, max: 730 })
      .withMessage('Period must be between 30 and 730 days'),
  ],
  validateRequest,
  customerReturnsController.getMyReturnAnalytics.bind(customerReturnsController)
);

/**
 * @route   GET /api/v1/returns/processing-estimates
 * @desc    Get current return processing time estimates
 * @access  Public
 */
router.get(
  '/processing-estimates',
  returnListLimit,
  [
    query('state')
      .optional()
      .isString()
      .trim(),
    query('returnMethod')
      .optional()
      .isIn(['CUSTOMER_DROP_OFF', 'PICKUP_SERVICE', 'COURIER_SERVICE', 'POSTAL_SERVICE']),
  ],
  validateRequest,
  customerReturnsController.getProcessingEstimates.bind(customerReturnsController)
);

/**
 * @route   GET /api/v1/returns/seasonal-info
 * @desc    Get seasonal return information and processing times
 * @access  Public
 */
router.get(
  '/seasonal-info',
  returnListLimit,
  customerReturnsController.getSeasonalReturnInfo.bind(customerReturnsController)
);

export default router;