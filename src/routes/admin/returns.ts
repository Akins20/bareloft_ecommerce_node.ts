import { Router } from 'express';
import { AdminReturnsController } from '../../controllers/admin/AdminReturnsController';
import { AdminRefundsController } from '../../controllers/admin/AdminRefundsController';
import { authenticate } from '../../middleware/auth/authenticate';
import { authorize } from '../../middleware/auth/authorize';
import rateLimit from 'express-rate-limit';
import { validationResult } from 'express-validator';
import { body, param, query } from 'express-validator';

// Simple validation result handler middleware
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

const router = Router();
const returnsController = new AdminReturnsController();
const refundsController = new AdminRefundsController();

// Apply authentication and admin role validation to all routes
router.use(authenticate);
router.use(authorize(['ADMIN', 'SUPER_ADMIN']));

// Apply rate limiting
router.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
}));

// ==================== RETURNS MANAGEMENT ROUTES ====================

/**
 * @route   GET /api/admin/returns
 * @desc    List all return requests with filtering and pagination
 * @access  Admin
 */
router.get(
  '/returns',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isString(),
    query('reason').optional().isString(),
    query('customerId').optional().isMongoId(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('search').optional().isString().trim(),
    query('sortBy').optional().isIn(['createdAt', 'amount', 'status', 'estimatedPickupDate']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    query('state').optional().isString(),
    query('priority').optional().isIn(['high', 'medium', 'low']),
  ],
  handleValidationErrors,
  returnsController.getReturnRequests.bind(returnsController)
);

/**
 * @route   GET /api/admin/returns/dashboard
 * @desc    Get return management dashboard data
 * @access  Admin
 */
router.get(
  '/returns/dashboard',
  [
    query('period').optional().isInt({ min: 1, max: 365 }),
  ],
  handleValidationErrors,
  returnsController.getReturnDashboard.bind(returnsController)
);

/**
 * @route   GET /api/admin/returns/analytics
 * @desc    Get returns analytics and insights
 * @access  Admin
 */
router.get(
  '/returns/analytics',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('state').optional().isString(),
  ],
  handleValidationErrors,
  returnsController.getReturnAnalytics.bind(returnsController)
);

/**
 * @route   GET /api/admin/returns/export
 * @desc    Export returns data
 * @access  Admin
 */
router.get(
  '/returns/export',
  [
    query('format').optional().isIn(['csv', 'json']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('status').optional().isString(),
    query('reason').optional().isString(),
  ],
  handleValidationErrors,
  returnsController.exportReturns.bind(returnsController)
);

/**
 * @route   GET /api/admin/returns/:returnId
 * @desc    Get detailed return request information
 * @access  Admin
 */
router.get(
  '/returns/:returnId',
  [
    param('returnId').isMongoId().withMessage('Invalid return ID'),
  ],
  handleValidationErrors,
  returnsController.getReturnRequest.bind(returnsController)
);

/**
 * @route   PUT /api/admin/returns/:returnId/status
 * @desc    Update return request status
 * @access  Admin
 */
router.put(
  '/returns/:returnId/status',
  [
    param('returnId').isMongoId().withMessage('Invalid return ID'),
    body('status')
      .isIn(['PENDING', 'APPROVED', 'REJECTED', 'IN_TRANSIT', 'RECEIVED', 'INSPECTED', 'COMPLETED', 'CANCELLED'])
      .withMessage('Invalid return status'),
    body('adminNotes').optional().isString().trim(),
    body('estimatedPickupDate').optional().isISO8601(),
    body('returnTrackingNumber').optional().isString().trim(),
  ],
  handleValidationErrors,
  returnsController.updateReturnStatus.bind(returnsController)
);

/**
 * @route   POST /api/admin/returns/:returnId/approve
 * @desc    Approve return request
 * @access  Admin
 */
router.post(
  '/returns/:returnId/approve',
  [
    param('returnId').isMongoId().withMessage('Invalid return ID'),
    body('approvalNotes').optional().isString().trim(),
    body('estimatedPickupDate').optional().isISO8601(),
    body('timeSlot').optional().isIn(['morning', 'afternoon', 'evening']),
    body('instructions').optional().isString().trim(),
    body('refundPreApproval').optional().isObject(),
    body('refundPreApproval.amount').optional().isFloat({ min: 0 }),
    body('refundPreApproval.method').optional().isIn(['ORIGINAL_PAYMENT', 'BANK_TRANSFER', 'WALLET_CREDIT', 'STORE_CREDIT']),
  ],
  handleValidationErrors,
  returnsController.approveReturn.bind(returnsController)
);

/**
 * @route   POST /api/admin/returns/:returnId/reject
 * @desc    Reject return request
 * @access  Admin
 */
router.post(
  '/returns/:returnId/reject',
  [
    param('returnId').isMongoId().withMessage('Invalid return ID'),
    body('rejectionReason')
      .notEmpty()
      .withMessage('Rejection reason is required')
      .isString()
      .trim(),
    body('detailedExplanation').optional().isString().trim(),
    body('alternativeOptions').optional().isArray(),
  ],
  handleValidationErrors,
  returnsController.rejectReturn.bind(returnsController)
);

/**
 * @route   POST /api/admin/returns/:returnId/inspect
 * @desc    Inspect returned items and update condition
 * @access  Admin
 */
router.post(
  '/returns/:returnId/inspect',
  [
    param('returnId').isMongoId().withMessage('Invalid return ID'),
    body('items').isArray({ min: 1 }).withMessage('Items array is required'),
    body('items.*.returnItemId').isMongoId().withMessage('Invalid return item ID'),
    body('items.*.condition')
      .isIn(['SELLABLE', 'MINOR_DAMAGE', 'MAJOR_DAMAGE', 'DEFECTIVE', 'UNSELLABLE'])
      .withMessage('Invalid item condition'),
    body('items.*.conditionNotes').optional().isString().trim(),
    body('items.*.inspectionPhotos').optional().isArray(),
    body('items.*.restockable').optional().isBoolean(),
    body('items.*.restockLocation').optional().isString().trim(),
    body('qualityCheckNotes').optional().isString().trim(),
    body('inspectorName').optional().isString().trim(),
    body('recommendRefundAmount').optional().isFloat({ min: 0 }),
  ],
  handleValidationErrors,
  returnsController.inspectReturn.bind(returnsController)
);

/**
 * @route   POST /api/admin/returns/:returnId/complete
 * @desc    Complete return request processing
 * @access  Admin
 */
router.post(
  '/returns/:returnId/complete',
  [
    param('returnId').isMongoId().withMessage('Invalid return ID'),
    body('completionNotes').optional().isString().trim(),
  ],
  handleValidationErrors,
  returnsController.completeReturn.bind(returnsController)
);

/**
 * @route   POST /api/admin/returns/bulk-update
 * @desc    Bulk update return statuses
 * @access  Admin
 */
router.post(
  '/returns/bulk-update',
  [
    body('returnIds').isArray({ min: 1 }).withMessage('Return IDs array is required'),
    body('returnIds.*').isMongoId().withMessage('Invalid return ID'),
    body('action').isIn(['approve', 'reject']).withMessage('Invalid bulk action'),
    body('data').optional().isObject(),
    body('data.notes').optional().isString().trim(),
    body('data.reason').optional().isString().trim(),
  ],
  handleValidationErrors,
  returnsController.bulkUpdateReturns.bind(returnsController)
);

// ==================== REFUNDS MANAGEMENT ROUTES ====================

/**
 * @route   GET /api/admin/refunds
 * @desc    List all refunds with filtering and pagination
 * @access  Admin
 */
router.get(
  '/refunds',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isString(),
    query('refundMethod').optional().isString(),
    query('customerId').optional().isMongoId(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('search').optional().isString().trim(),
    query('sortBy').optional().isIn(['createdAt', 'amount', 'status', 'processedAt']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    query('minAmount').optional().isFloat({ min: 0 }),
    query('maxAmount').optional().isFloat({ min: 0 }),
  ],
  handleValidationErrors,
  refundsController.getRefunds.bind(refundsController)
);

/**
 * @route   GET /api/admin/refunds/dashboard
 * @desc    Get refund management dashboard data
 * @access  Admin
 */
router.get(
  '/refunds/dashboard',
  [
    query('period').optional().isInt({ min: 1, max: 365 }),
  ],
  handleValidationErrors,
  refundsController.getRefundDashboard.bind(refundsController)
);

/**
 * @route   GET /api/admin/refunds/analytics
 * @desc    Get refunds analytics and insights
 * @access  Admin
 */
router.get(
  '/refunds/analytics',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('customerId').optional().isMongoId(),
  ],
  handleValidationErrors,
  refundsController.getRefundAnalytics.bind(refundsController)
);

/**
 * @route   GET /api/admin/refunds/pending
 * @desc    Get all pending refunds that need processing
 * @access  Admin
 */
router.get(
  '/refunds/pending',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  handleValidationErrors,
  refundsController.getPendingRefunds.bind(refundsController)
);

/**
 * @route   GET /api/admin/refunds/stats/summary
 * @desc    Get refund summary statistics
 * @access  Admin
 */
router.get(
  '/refunds/stats/summary',
  [
    query('period').optional().isInt({ min: 1, max: 365 }),
  ],
  handleValidationErrors,
  refundsController.getRefundStats.bind(refundsController)
);

/**
 * @route   GET /api/admin/refunds/export
 * @desc    Export refunds data
 * @access  Admin
 */
router.get(
  '/refunds/export',
  [
    query('format').optional().isIn(['csv', 'json']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('status').optional().isString(),
    query('refundMethod').optional().isString(),
  ],
  handleValidationErrors,
  refundsController.exportRefunds.bind(refundsController)
);

/**
 * @route   GET /api/admin/refunds/:refundId
 * @desc    Get detailed refund information
 * @access  Admin
 */
router.get(
  '/refunds/:refundId',
  [
    param('refundId').isMongoId().withMessage('Invalid refund ID'),
  ],
  handleValidationErrors,
  refundsController.getRefund.bind(refundsController)
);

/**
 * @route   POST /api/admin/refunds/process
 * @desc    Process a new refund
 * @access  Admin
 */
router.post(
  '/refunds/process',
  [
    body('returnRequestId').optional().isMongoId().withMessage('Invalid return request ID'),
    body('orderId').isMongoId().withMessage('Order ID is required'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than 0'),
    body('refundMethod')
      .isIn(['ORIGINAL_PAYMENT', 'BANK_TRANSFER', 'WALLET_CREDIT', 'STORE_CREDIT', 'CASH'])
      .withMessage('Invalid refund method'),
    body('reason').notEmpty().withMessage('Reason is required'),
    body('description').optional().isString().trim(),
    body('bankAccountDetails').optional().isObject(),
    body('bankAccountDetails.accountNumber').optional().matches(/^\d{10}$/).withMessage('Invalid account number'),
    body('bankAccountDetails.accountName').optional().isString().trim(),
    body('bankAccountDetails.bankName').optional().isString().trim(),
    body('bankAccountDetails.bankCode').optional().isString().trim(),
    body('adminNotes').optional().isString().trim(),
    body('notifyCustomer').optional().isBoolean(),
  ],
  handleValidationErrors,
  refundsController.processRefund.bind(refundsController)
);

/**
 * @route   POST /api/admin/refunds/bulk-process
 * @desc    Process multiple refunds in bulk
 * @access  Admin
 */
router.post(
  '/refunds/bulk-process',
  [
    body('refundRequests').isArray({ min: 1 }).withMessage('Refund requests array is required'),
    body('refundRequests.*.orderId').isMongoId().withMessage('Invalid order ID'),
    body('refundRequests.*.amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('refundRequests.*.refundMethod')
      .isIn(['ORIGINAL_PAYMENT', 'BANK_TRANSFER', 'WALLET_CREDIT', 'STORE_CREDIT', 'CASH'])
      .withMessage('Invalid refund method'),
    body('refundRequests.*.reason').notEmpty().withMessage('Reason is required'),
    body('processInBatches').optional().isBoolean(),
    body('batchSize').optional().isInt({ min: 1, max: 50 }),
    body('notifyCustomers').optional().isBoolean(),
    body('adminNotes').optional().isString().trim(),
  ],
  handleValidationErrors,
  refundsController.processBulkRefunds.bind(refundsController)
);

/**
 * @route   POST /api/admin/refunds/:refundId/approve
 * @desc    Approve a pending refund
 * @access  Admin
 */
router.post(
  '/refunds/:refundId/approve',
  [
    param('refundId').isMongoId().withMessage('Invalid refund ID'),
    body('approvalNotes').optional().isString().trim(),
  ],
  handleValidationErrors,
  refundsController.approveRefund.bind(refundsController)
);

/**
 * @route   POST /api/admin/refunds/validate-bank-account
 * @desc    Validate Nigerian bank account details
 * @access  Admin
 */
router.post(
  '/refunds/validate-bank-account',
  [
    body('accountNumber')
      .matches(/^\d{10}$/)
      .withMessage('Account number must be 10 digits'),
    body('bankCode').notEmpty().withMessage('Bank code is required'),
  ],
  handleValidationErrors,
  refundsController.validateBankAccount.bind(refundsController)
);

export default router;