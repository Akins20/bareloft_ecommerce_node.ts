import { Router } from "express";
import { PaymentController } from "../../controllers/payments/PaymentController";
import { PaymentService } from "../../services/payments/PaymentService";
import { PaystackService } from "../../services/payments/PaystackService";
import { authenticate } from "../../middleware/auth/authenticate";
import { authorize } from "../../middleware/auth/authorize";
import { validateRequest } from "../../middleware/validation/validateRequest";
import { rateLimiter } from "../../middleware/security/rateLimiter";
import { getServiceContainer } from "../../config/serviceContainer";

const router = Router();

// Get services from container (singleton)
const serviceContainer = getServiceContainer();
const paymentService = serviceContainer.getService<PaymentService>('paymentService');
const paystackService = serviceContainer.getService<PaystackService>('paystackService');
const paymentController = new PaymentController(paymentService, paystackService);

// Rate limiting for payment operations
const paymentInitLimit = rateLimiter.authenticated;
const webhookLimit = rateLimiter.webhook;

// ==================== PUBLIC PAYMENT ENDPOINTS ====================

/**
 * @route   GET /api/v1/payments/channels
 * @desc    Get supported payment channels
 * @access  Public
 */
router.get("/channels", async (req, res, next) => {
  try {
    await paymentController.getPaymentChannels(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/payments/banks
 * @desc    Get list of Nigerian banks for bank transfer
 * @access  Public
 */
router.get("/banks", async (req, res, next) => {
  try {
    await paymentController.getBanks(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/payments/resolve-account
 * @desc    Resolve Nigerian bank account details
 * @access  Public
 * @body    { accountNumber: string, bankCode: string }
 */
router.post(
  "/resolve-account",
  rateLimiter.general,
  async (req, res, next) => {
    try {
      await paymentController.resolveAccount(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/payments/calculate-fees
 * @desc    Calculate payment processing fees
 * @access  Public
 * @body    { amount: number }
 */
router.post("/calculate-fees", rateLimiter.general, async (req, res, next) => {
  try {
    await paymentController.calculateFees(req, res);
  } catch (error) {
    next(error);
  }
});

// ==================== AUTHENTICATED PAYMENT ENDPOINTS ====================

/**
 * @route   POST /api/v1/payments/initialize
 * @desc    Initialize payment transaction
 * @access  Private (Customer)
 * @body    InitializePaymentRequest {
 *   orderId: string,
 *   amount: number,
 *   currency?: string,
 *   channels?: PaymentChannel[],
 *   callbackUrl?: string,
 *   metadata?: object
 * }
 */
router.post(
  "/initialize",
  authenticate,
  paymentInitLimit,
  // validateRequest(initializePaymentSchema), // Skip validation for now
  async (req, res, next) => {
    try {
      await paymentController.initializePayment(req as any, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/payments/verify
 * @desc    Verify payment transaction by reference
 * @access  Private (Customer)
 * @body    { reference: string }
 */
router.post(
  "/verify",
  authenticate,
  rateLimiter.authenticated,
  async (req, res, next) => {
    try {
      await paymentController.verifyPayment(req as any, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/payments/verify
 * @desc    Verify payment transaction by order number (for frontend use)
 * @access  Private (Customer)
 * @query   { orderNumber: string }
 */
router.get(
  "/verify",
  authenticate,
  rateLimiter.authenticated,
  async (req, res, next) => {
    try {
      await paymentController.verifyPaymentByOrderNumber(req as any, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/payments/history
 * @desc    Get user's payment transaction history
 * @access  Private (Customer)
 * @query   { page?: number, limit?: number }
 */
router.get("/history", authenticate, async (req, res, next) => {
  try {
    await paymentController.getPaymentHistory(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/payments/:transactionId
 * @desc    Get payment transaction details by ID
 * @access  Private (Customer - own transactions only)
 * @param   transactionId - Payment transaction ID
 */
router.get("/:transactionId", authenticate, async (req, res, next) => {
  try {
    await paymentController.getTransaction(req as any, res);
  } catch (error) {
    next(error);
  }
});

// ==================== WEBHOOK ENDPOINTS ====================

/**
 * @route   POST /api/v1/payments/webhook/paystack
 * @desc    Handle Paystack webhook events
 * @access  Internal (Paystack webhooks)
 * @headers X-Paystack-Signature: webhook signature
 * @body    PaystackWebhookEvent
 */
router.post(
  "/webhook/paystack",
  webhookLimit,
  async (req, res, next) => {
    try {
      await paymentController.handlePaystackWebhook(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// ==================== ADMIN ENDPOINTS ====================

/**
 * @route   GET /api/v1/payments/analytics
 * @desc    Get payment analytics and statistics
 * @access  Private (Admin)
 * @query   { startDate?: string, endDate?: string }
 */
router.get(
  "/analytics",
  authenticate,
  authorize(["ADMIN", "SUPER_ADMIN"]),
  async (req, res, next) => {
    try {
      await paymentController.getPaymentAnalytics(req, res);
    } catch (error) {
      next(error);
    }
  }
);

export default router;