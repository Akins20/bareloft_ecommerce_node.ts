import { Request, Response } from "express";
import { BaseController } from "../BaseController";
import { InventoryAlertService } from "../../services/inventory/InventoryAlertService";
import { ReorderService } from "../../services/inventory/ReorderService";
import { NotificationService } from "../../services/notifications/NotificationService";
import { CacheService } from "../../services/cache/CacheService";
import {
  CreateAlertConfigurationRequest,
  UpdateAlertRequest,
  TestAlertRequest,
  CreateReorderSuggestionRequest,
  CreateReorderRequestRequest,
  UpdateReorderRequestRequest,
  CreateSupplierRequest,
  StockAlert,
  AlertSeverity,
  ReorderStatus,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
} from "../../types";

export class AdminInventoryAlertController extends BaseController {
  private alertService: InventoryAlertService;
  private reorderService: ReorderService;

  constructor(
    notificationService: NotificationService,
    cacheService: CacheService
  ) {
    super();
    this.alertService = new InventoryAlertService(notificationService, cacheService);
    this.reorderService = new ReorderService(notificationService, cacheService);
  }

  /**
   * GET /api/admin/inventory/alerts
   * View all active alerts
   */
  getAlerts = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        severity,
        type,
        productId,
        categoryId,
        isRead,
        isAcknowledged,
        isDismissed,
        startDate,
        endDate,
        page = 1,
        limit = 20,
      } = req.query;

      const filters: any = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      };

      if (severity) filters.severity = severity as AlertSeverity;
      if (type) filters.type = type as StockAlert;
      if (productId) filters.productId = productId as string;
      if (categoryId) filters.categoryId = categoryId as string;
      if (isRead !== undefined) filters.isRead = isRead === 'true';
      if (isAcknowledged !== undefined) filters.isAcknowledged = isAcknowledged === 'true';
      if (isDismissed !== undefined) filters.isDismissed = isDismissed === 'true';
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const result = await this.alertService.getAlerts(filters);

      this.sendSuccess(res, result, "Alerts retrieved successfully");
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * POST /api/admin/inventory/alerts/configure
   * Configure alert thresholds and preferences
   */
  configureAlerts = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError(
          "User not authenticated",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.UNAUTHORIZED
        );
      }

      const request: CreateAlertConfigurationRequest = {
        name: req.body.name,
        description: req.body.description,
        lowStockEnabled: req.body.lowStockEnabled ?? true,
        lowStockThreshold: req.body.lowStockThreshold,
        criticalStockEnabled: req.body.criticalStockEnabled ?? true,
        criticalStockThreshold: req.body.criticalStockThreshold,
        outOfStockEnabled: req.body.outOfStockEnabled ?? true,
        reorderNeededEnabled: req.body.reorderNeededEnabled ?? false,
        slowMovingEnabled: req.body.slowMovingEnabled ?? false,
        slowMovingDays: req.body.slowMovingDays,
        emailEnabled: req.body.emailEnabled ?? true,
        emailAddress: req.body.emailAddress,
        smsEnabled: req.body.smsEnabled ?? false,
        phoneNumber: req.body.phoneNumber,
        pushEnabled: req.body.pushEnabled ?? true,
        respectBusinessHours: req.body.respectBusinessHours ?? false,
        businessHoursStart: req.body.businessHoursStart,
        businessHoursEnd: req.body.businessHoursEnd,
        businessDays: req.body.businessDays,
        timezone: req.body.timezone || "Africa/Lagos",
        maxAlertsPerHour: req.body.maxAlertsPerHour,
        maxAlertsPerDay: req.body.maxAlertsPerDay,
        categoryIds: req.body.categoryIds,
        productIds: req.body.productIds,
        minStockValue: req.body.minStockValue,
      };

      // Validate required fields
      if (!request.name) {
        throw new AppError(
          "Configuration name is required",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Validate Nigerian phone number format if SMS enabled
      if (request.smsEnabled && request.phoneNumber) {
        if (!this.isValidNigerianPhoneNumber(request.phoneNumber)) {
          throw new AppError(
            "Invalid Nigerian phone number format. Use +234XXXXXXXXXX",
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR
          );
        }
      }

      const configuration = await this.alertService.createAlertConfiguration(request, userId);

      this.sendSuccess(res, { configuration }, "Alert configuration created successfully", HTTP_STATUS.CREATED);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * PUT /api/admin/inventory/alerts/:alertId
   * Update alert status (acknowledge, dismiss)
   */
  updateAlert = async (req: Request, res: Response): Promise<void> => {
    try {
      const { alertId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError(
          "User not authenticated",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.UNAUTHORIZED
        );
      }

      const request: UpdateAlertRequest = {
        alertId,
        action: req.body.action,
        notes: req.body.notes,
      };

      // Validate action
      if (!["acknowledge", "dismiss", "read"].includes(request.action)) {
        throw new AppError(
          "Invalid action. Must be 'acknowledge', 'dismiss', or 'read'",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      await this.alertService.updateAlert(request, userId);

      this.sendSuccess(res, null, `Alert ${request.action}d successfully`);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * GET /api/admin/inventory/alerts/history
   * Alert history and trends
   */
  getAlertHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        startDate,
        endDate,
        page = 1,
        limit = 50,
      } = req.query;

      const result = await this.alertService.getAlertHistory(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        parseInt(page as string),
        parseInt(limit as string)
      );

      this.sendSuccess(res, result, "Alert history retrieved successfully");
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * POST /api/admin/inventory/alerts/test
   * Test alert notifications
   */
  testAlert = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: TestAlertRequest = {
        configurationId: req.body.configurationId,
        alertType: req.body.alertType,
        productId: req.body.productId,
      };

      // Validate alert type
      if (!Object.values(StockAlert).includes(request.alertType)) {
        throw new AppError(
          "Invalid alert type",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const result = await this.alertService.testAlert(request);

      this.sendSuccess(res, result, "Test alert sent successfully");
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * GET /api/admin/inventory/reorder-suggestions
   * AI-powered reorder recommendations
   */
  getReorderSuggestions = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        status,
        productId,
        supplierId,
        priority,
        startDate,
        endDate,
        page = 1,
        limit = 20,
      } = req.query;

      const filters: any = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      };

      if (status) filters.status = status as ReorderStatus;
      if (productId) filters.productId = productId as string;
      if (supplierId) filters.supplierId = supplierId as string;
      if (priority) filters.priority = priority as AlertSeverity;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const result = await this.reorderService.getReorderSuggestions(filters);

      this.sendSuccess(res, result, "Reorder suggestions retrieved successfully");
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * POST /api/admin/inventory/reorder/:productId
   * Create reorder request
   */
  createReorderRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { productId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError(
          "User not authenticated",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.UNAUTHORIZED
        );
      }

      const request: CreateReorderRequestRequest = {
        suggestionId: req.body.suggestionId,
        productId,
        supplierId: req.body.supplierId,
        quantity: parseInt(req.body.quantity),
        unitCost: parseFloat(req.body.unitCost),
        expectedDeliveryDate: req.body.expectedDeliveryDate ? 
          new Date(req.body.expectedDeliveryDate) : undefined,
        requiresImport: req.body.requiresImport ?? false,
        notes: req.body.notes,
      };

      // Validate required fields
      if (!request.quantity || request.quantity <= 0) {
        throw new AppError(
          "Valid quantity is required",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      if (!request.unitCost || request.unitCost <= 0) {
        throw new AppError(
          "Valid unit cost is required",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const reorderRequest = await this.reorderService.createReorderRequest(request, userId);

      this.sendSuccess(res, { reorderRequest }, "Reorder request created successfully", HTTP_STATUS.CREATED);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * GET /api/admin/inventory/pending-reorders
   * View pending reorder requests
   */
  getPendingReorders = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        status,
        productId,
        supplierId,
        page = 1,
        limit = 20,
      } = req.query;

      const filters: any = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      };

      if (status) filters.status = status as ReorderStatus;
      if (productId) filters.productId = productId as string;
      if (supplierId) filters.supplierId = supplierId as string;

      const result = await this.reorderService.getPendingReorders(filters);

      this.sendSuccess(res, result, "Pending reorders retrieved successfully");
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * PUT /api/admin/inventory/reorder/:orderId
   * Approve/modify reorder requests
   */
  updateReorderRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError(
          "User not authenticated",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.UNAUTHORIZED
        );
      }

      const request: UpdateReorderRequestRequest = {
        action: req.body.action,
        notes: req.body.notes,
        actualDeliveryDate: req.body.actualDeliveryDate ? 
          new Date(req.body.actualDeliveryDate) : undefined,
        orderReference: req.body.orderReference,
        supplierReference: req.body.supplierReference,
        trackingNumber: req.body.trackingNumber,
      };

      // Validate action
      if (!["approve", "reject", "complete", "cancel"].includes(request.action)) {
        throw new AppError(
          "Invalid action. Must be 'approve', 'reject', 'complete', or 'cancel'",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const updatedRequest = await this.reorderService.updateReorderRequest(
        orderId,
        request,
        userId
      );

      this.sendSuccess(res, { reorderRequest: updatedRequest }, `Reorder request ${request.action}d successfully`);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * GET /api/admin/inventory/reorder-history
   * Reorder history and analytics
   */
  getReorderHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        startDate,
        endDate,
        page = 1,
        limit = 50,
      } = req.query;

      const result = await this.reorderService.getReorderHistory(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        parseInt(page as string),
        parseInt(limit as string)
      );

      this.sendSuccess(res, result, "Reorder history retrieved successfully");
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * POST /api/admin/inventory/reorder-suggestion
   * Create manual reorder suggestion
   */
  createReorderSuggestion = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError(
          "User not authenticated",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.UNAUTHORIZED
        );
      }

      const request: CreateReorderSuggestionRequest = {
        productId: req.body.productId,
        quantity: req.body.quantity,
        reason: req.body.reason,
        preferredSupplierId: req.body.preferredSupplierId,
        notes: req.body.notes,
        priority: req.body.priority as AlertSeverity,
      };

      // Validate required fields
      if (!request.productId) {
        throw new AppError(
          "Product ID is required",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const suggestion = await this.reorderService.createReorderSuggestion(request, userId);

      this.sendSuccess(res, { suggestion }, "Reorder suggestion created successfully", HTTP_STATUS.CREATED);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * GET /api/admin/inventory/suppliers
   * Get supplier list
   */
  getSuppliers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { isLocal, isActive = true } = req.query;

      const suppliers = await this.reorderService.getSuppliers(
        isLocal !== undefined ? isLocal === 'true' : undefined,
        isActive === 'true'
      );

      this.sendSuccess(res, { suppliers }, "Suppliers retrieved successfully");
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * POST /api/admin/inventory/suppliers
   * Create new supplier
   */
  createSupplier = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError(
          "User not authenticated",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.UNAUTHORIZED
        );
      }

      const request: CreateSupplierRequest = {
        name: req.body.name,
        code: req.body.code,
        contactPerson: req.body.contactPerson,
        email: req.body.email,
        phone: req.body.phone,
        whatsapp: req.body.whatsapp,
        address: req.body.address,
        isLocal: req.body.isLocal ?? true,
        businessType: req.body.businessType || "distributor",
        taxId: req.body.taxId,
        cacNumber: req.body.cacNumber,
        paymentTerms: req.body.paymentTerms,
        currency: req.body.currency || "NGN",
        creditLimit: req.body.creditLimit,
        discountPercentage: req.body.discountPercentage,
        averageLeadTimeDays: parseInt(req.body.averageLeadTimeDays) || 7,
      };

      // Validate required fields
      if (!request.name) {
        throw new AppError(
          "Supplier name is required",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Validate Nigerian phone number if provided
      if (request.phone && !this.isValidNigerianPhoneNumber(request.phone)) {
        throw new AppError(
          "Invalid Nigerian phone number format. Use +234XXXXXXXXXX",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Validate WhatsApp number if provided
      if (request.whatsapp && !this.isValidNigerianPhoneNumber(request.whatsapp)) {
        throw new AppError(
          "Invalid WhatsApp number format. Use +234XXXXXXXXXX",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const supplier = await this.reorderService.createSupplier(request, userId);

      this.sendSuccess(res, { supplier }, "Supplier created successfully", HTTP_STATUS.CREATED);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * POST /api/admin/inventory/alerts/monitor
   * Manually trigger inventory monitoring (for testing)
   */
  monitorInventory = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.alertService.monitorInventoryLevels();

      this.sendSuccess(res, result, "Inventory monitoring completed successfully");
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  // Private helper methods

  private isValidNigerianPhoneNumber(phone: string): boolean {
    // Nigerian phone number patterns:
    // +234XXXXXXXXXX (international)
    // 0XXXXXXXXXX (local)
    // Must be 11 digits after country code or 11 digits starting with 0
    const patterns = [
      /^\+234[789][01]\d{8}$/, // +234XXXXXXXXXX
      /^0[789][01]\d{8}$/,     // 0XXXXXXXXXX
      /^[789][01]\d{8}$/,      // Without country code or leading zero
    ];

    return patterns.some(pattern => pattern.test(phone.replace(/\s/g, '')));
  }
}