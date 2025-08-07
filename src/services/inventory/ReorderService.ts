import { BaseService } from "../BaseService";
import { 
  InventoryModel,
  InventoryMovementModel,
  ProductModel,
} from "../../models";
import { 
  ReorderSuggestionModel, 
  ReorderRequestModel 
} from "../../models/ReorderRequest";
import { SupplierModel } from "../../models/Supplier";
import { NotificationService } from "../notifications/NotificationService";
import { CacheService } from "../cache/CacheService";
import {
  ReorderSuggestion,
  ReorderRequest,
  Supplier,
  ReorderStatus,
  AlertSeverity,
  CreateReorderSuggestionRequest,
  CreateReorderRequestRequest,
  UpdateReorderRequestRequest,
  CreateSupplierRequest,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
  PaginationMeta,
} from "../../types";
import { NotificationType, NotificationChannel } from "../../types/notification.types";

interface ReorderFilters {
  status?: ReorderStatus;
  productId?: string;
  supplierId?: string;
  priority?: AlertSeverity;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

interface SalesVelocityData {
  productId: string;
  averageDailySales: number;
  salesVelocity: number;
  daysOfStockLeft: number;
  isSlowMoving: boolean;
  isFastMoving: boolean;
}

export class ReorderService extends BaseService {
  private notificationService: NotificationService;
  private cacheService: CacheService;

  constructor(
    notificationService: NotificationService,
    cacheService: CacheService
  ) {
    super();
    this.notificationService = notificationService;
    this.cacheService = cacheService;
  }

  /**
   * Generate AI-powered reorder suggestions
   */
  async getReorderSuggestions(filters: ReorderFilters = {}): Promise<{
    suggestions: ReorderSuggestion[];
    pagination: PaginationMeta;
    summary: {
      totalSuggestions: number;
      pendingApproval: number;
      urgent: number;
      estimatedTotalCost: number;
    };
  }> {
    try {
      const { page = 1, limit = 20 } = filters;

      // Get products that need reordering
      const productsNeedingReorder = await this.identifyProductsNeedingReorder();

      // Generate suggestions for each product
      const suggestions: ReorderSuggestion[] = [];
      for (const product of productsNeedingReorder) {
        const suggestion = await this.generateReorderSuggestion(product);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }

      // Apply filters
      let filteredSuggestions = suggestions;
      if (filters.status) {
        filteredSuggestions = suggestions.filter(s => s.status === filters.status);
      }
      if (filters.productId) {
        filteredSuggestions = suggestions.filter(s => s.productId === filters.productId);
      }
      if (filters.priority) {
        filteredSuggestions = suggestions.filter(s => s.priority === filters.priority);
      }

      // Sort by priority and urgency
      filteredSuggestions.sort((a, b) => {
        const priorityOrder = {
          [AlertSeverity.URGENT]: 6,
          [AlertSeverity.CRITICAL]: 5,
          [AlertSeverity.HIGH]: 4,
          [AlertSeverity.MEDIUM]: 3,
          [AlertSeverity.LOW]: 2,
          [AlertSeverity.INFO]: 1,
        };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      // Paginate
      const startIndex = (page - 1) * limit;
      const paginatedSuggestions = filteredSuggestions.slice(startIndex, startIndex + limit);

      // Calculate summary
      const summary = {
        totalSuggestions: filteredSuggestions.length,
        pendingApproval: filteredSuggestions.filter(s => s.status === ReorderStatus.PENDING_APPROVAL).length,
        urgent: filteredSuggestions.filter(s => s.priority === AlertSeverity.URGENT).length,
        estimatedTotalCost: filteredSuggestions.reduce((sum, s) => sum + s.estimatedCost, 0),
      };

      const pagination = this.createPagination(page, limit, filteredSuggestions.length);

      return {
        suggestions: paginatedSuggestions,
        pagination,
        summary,
      };
    } catch (error) {
      this.handleError("Error getting reorder suggestions", error);
      throw error;
    }
  }

  /**
   * Create manual reorder suggestion
   */
  async createReorderSuggestion(
    request: CreateReorderSuggestionRequest,
    userId: string
  ): Promise<ReorderSuggestion> {
    try {
      const product = await InventoryModel.findUnique({
        where: { id: request.productId },
        include: { category: true },
      });

      if (!product) {
        throw new AppError(
          "Product not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Get sales velocity data
      const velocityData = await this.calculateSalesVelocity(product.id);
      
      // Get preferred supplier
      const supplier = request.preferredSupplierId 
        ? await this.getSupplier(request.preferredSupplierId)
        : await this.findBestSupplier(product.id);

      // Calculate Nigerian business context
      const businessContext = await this.calculateNigerianBusinessContext(product, supplier);

      const suggestion: ReorderSuggestion = {
        id: `suggestion-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        categoryName: product.category.name,
        currentStock: product.stock,
        reservedStock: 0, // Calculate from reservations
        availableStock: product.stock,
        reorderPoint: product.lowStockThreshold,
        suggestedQuantity: request.quantity || this.calculateOptimalOrderQuantity(product, velocityData),
        estimatedCost: 0, // Calculate based on supplier data
        currency: "NGN",
        averageDailySales: velocityData.averageDailySales,
        salesVelocity: velocityData.salesVelocity,
        daysOfStockLeft: velocityData.daysOfStockLeft,
        leadTimeDays: supplier?.averageLeadTimeDays || 7,
        preferredSupplierId: supplier?.id,
        supplierName: supplier?.name,
        supplierContact: supplier?.phone || supplier?.email,
        importRequired: businessContext.importRequired,
        customsClearanceDays: businessContext.customsClearanceDays,
        localSupplierAvailable: businessContext.localSupplierAvailable,
        businessDaysToReorder: businessContext.businessDaysToReorder,
        status: ReorderStatus.SUGGESTED,
        priority: request.priority || this.calculatePriority(product, velocityData),
        reason: request.reason || `Stock below reorder point (${product.lowStockThreshold})`,
        notes: request.notes,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Calculate estimated cost
      suggestion.estimatedCost = await this.calculateEstimatedCost(
        suggestion.suggestedQuantity,
        supplier,
        product
      );

      // Store suggestion
      await ReorderSuggestionModel.create({
        ...suggestion,
        productName: product.name,
      });

      return suggestion;
    } catch (error) {
      this.handleError("Error creating reorder suggestion", error);
      throw error;
    }
  }

  /**
   * Create reorder request from suggestion
   */
  async createReorderRequest(
    request: CreateReorderRequestRequest,
    userId: string
  ): Promise<ReorderRequest> {
    try {
      let suggestion;
      if (request.suggestionId) {
        suggestion = await ReorderSuggestionModel.findUnique(request.suggestionId);
      }

      const product = await InventoryModel.findUnique({
        where: { id: request.productId },
        include: { category: true },
      });

      if (!product) {
        throw new AppError(
          "Product not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      const supplier = request.supplierId 
        ? await this.getSupplier(request.supplierId)
        : null;

      // Calculate Nigerian business details
      const nigerianDetails = await this.calculateNigerianBusinessDetails(
        request.quantity,
        request.unitCost,
        supplier,
        request.requiresImport || false
      );

      const reorderRequest: ReorderRequest = {
        id: `request-${Date.now()}`,
        suggestionId: request.suggestionId,
        productId: product.id,
        supplierId: request.supplierId,
        quantity: request.quantity,
        unitCost: request.unitCost,
        totalCost: request.quantity * request.unitCost,
        currency: "NGN",
        expectedDeliveryDate: request.expectedDeliveryDate || this.calculateExpectedDelivery(supplier),
        requiresImport: request.requiresImport || false,
        customsValue: nigerianDetails.customsValue,
        customsDuty: nigerianDetails.customsDuty,
        status: ReorderStatus.PENDING_APPROVAL,
        requestedBy: userId,
        notes: request.notes,
        history: [{
          action: "created",
          performedBy: userId,
          performedAt: new Date(),
          notes: "Reorder request created",
          newStatus: ReorderStatus.PENDING_APPROVAL,
        }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store request
      await ReorderRequestModel.create({
        ...reorderRequest,
        productName: product.name,
      });

      // Update suggestion status if linked
      if (suggestion) {
        await ReorderSuggestionModel.update(request.suggestionId!, {
          status: ReorderStatus.PENDING_APPROVAL,
        });
      }

      // Send approval notification
      await this.sendApprovalNotification(reorderRequest, product);

      return reorderRequest;
    } catch (error) {
      this.handleError("Error creating reorder request", error);
      throw error;
    }
  }

  /**
   * Get pending reorder requests
   */
  async getPendingReorders(filters: ReorderFilters = {}): Promise<{
    requests: ReorderRequest[];
    pagination: PaginationMeta;
    summary: {
      totalRequests: number;
      totalValue: number;
      urgent: number;
      requiresImport: number;
    };
  }> {
    try {
      const { page = 1, limit = 20 } = filters;

      // Get pending requests from storage
      const allRequests = await ReorderRequestModel.findMany({
        where: {},
      });

      // Transform and filter
      let requests: ReorderRequest[] = [];
      for (const req of allRequests) {
        const transformed = await this.transformNotificationToReorderRequest(req);
        if (transformed && 
            (filters.status === undefined || transformed.status === filters.status) &&
            (filters.productId === undefined || transformed.productId === filters.productId) &&
            (filters.supplierId === undefined || transformed.supplierId === filters.supplierId)) {
          requests.push(transformed);
        }
      }

      // Filter for pending by default
      if (!filters.status) {
        requests = requests.filter(r => r.status === ReorderStatus.PENDING_APPROVAL);
      }

      // Sort by urgency and creation date
      requests.sort((a, b) => b.totalCost - a.totalCost);

      // Paginate
      const startIndex = (page - 1) * limit;
      const paginatedRequests = requests.slice(startIndex, startIndex + limit);

      // Calculate summary
      const summary = {
        totalRequests: requests.length,
        totalValue: requests.reduce((sum, r) => sum + r.totalCost, 0),
        urgent: requests.filter(r => r.totalCost > 100000).length, // High value orders
        requiresImport: requests.filter(r => r.requiresImport).length,
      };

      const pagination = this.createPagination(page, limit, requests.length);

      return {
        requests: paginatedRequests,
        pagination,
        summary,
      };
    } catch (error) {
      this.handleError("Error getting pending reorders", error);
      throw error;
    }
  }

  /**
   * Update reorder request (approve/reject/complete)
   */
  async updateReorderRequest(
    requestId: string,
    update: UpdateReorderRequestRequest,
    userId: string
  ): Promise<ReorderRequest> {
    try {
      const existing = await ReorderRequestModel.findUnique(requestId);
      if (!existing) {
        throw new AppError(
          "Reorder request not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      const currentData = existing.data as any;
      let newStatus: ReorderStatus;
      let statusUpdateData: any = {};

      switch (update.action) {
        case "approve":
          newStatus = ReorderStatus.APPROVED;
          statusUpdateData = {
            status: newStatus,
            approvedBy: userId,
            approvedAt: new Date(),
          };
          break;
        case "reject":
          newStatus = ReorderStatus.REJECTED;
          statusUpdateData = {
            status: newStatus,
            rejectedBy: userId,
            rejectedAt: new Date(),
            rejectionReason: update.notes,
          };
          break;
        case "complete":
          newStatus = ReorderStatus.COMPLETED;
          statusUpdateData = {
            status: newStatus,
            completedBy: userId,
            completedAt: new Date(),
            actualDeliveryDate: update.actualDeliveryDate,
            orderReference: update.orderReference,
            supplierReference: update.supplierReference,
            trackingNumber: update.trackingNumber,
          };
          break;
        case "cancel":
          newStatus = ReorderStatus.CANCELLED;
          statusUpdateData = {
            status: newStatus,
          };
          break;
        default:
          throw new AppError(
            "Invalid update action",
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR
          );
      }

      // Add to history
      const historyEntry = {
        action: update.action,
        performedBy: userId,
        performedAt: new Date(),
        notes: update.notes,
        previousStatus: currentData.status,
        newStatus,
      };

      const updatedHistory = [...(currentData.history || []), historyEntry];

      // Update the request
      const updatedRequest = await ReorderRequestModel.update(requestId, {
        ...statusUpdateData,
        history: updatedHistory,
        notes: update.notes || currentData.notes,
      });

      const result = await this.transformNotificationToReorderRequest(updatedRequest);

      // Handle completion actions
      if (update.action === "complete" && result) {
        await this.handleReorderCompletion(result);
      }

      // Send status update notification
      await this.sendStatusUpdateNotification(result!, update.action, userId);

      return result!;
    } catch (error) {
      this.handleError("Error updating reorder request", error);
      throw error;
    }
  }

  /**
   * Get reorder history
   */
  async getReorderHistory(
    startDate?: Date,
    endDate?: Date,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    requests: ReorderRequest[];
    pagination: PaginationMeta;
    analytics: {
      totalOrders: number;
      totalValue: number;
      averageOrderValue: number;
      completionRate: number;
      averageDeliveryDays: number;
      topSuppliers: Array<{
        supplierId: string;
        supplierName: string;
        orderCount: number;
        totalValue: number;
      }>;
    };
  }> {
    try {
      const where: any = {};

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const allRequests = await ReorderRequestModel.findMany({ where });
      
      let requests: ReorderRequest[] = [];
      for (const req of allRequests) {
        const transformed = await this.transformNotificationToReorderRequest(req);
        if (transformed) {
          requests.push(transformed);
        }
      }

      // Sort by creation date (newest first)
      requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Paginate
      const startIndex = (page - 1) * limit;
      const paginatedRequests = requests.slice(startIndex, startIndex + limit);

      // Calculate analytics
      const analytics = await this.calculateReorderAnalytics(requests);

      const pagination = this.createPagination(page, limit, requests.length);

      return {
        requests: paginatedRequests,
        pagination,
        analytics,
      };
    } catch (error) {
      this.handleError("Error getting reorder history", error);
      throw error;
    }
  }

  /**
   * Supplier management methods
   */
  async createSupplier(request: CreateSupplierRequest, userId: string): Promise<Supplier> {
    try {
      const supplier: Supplier = {
        id: `supplier-${Date.now()}`,
        name: request.name,
        code: request.code,
        contactPerson: request.contactPerson,
        email: request.email,
        phone: request.phone,
        whatsapp: request.whatsapp,
        address: request.address,
        isLocal: request.isLocal,
        businessType: request.businessType,
        taxId: request.taxId,
        cacNumber: request.cacNumber,
        paymentTerms: request.paymentTerms,
        currency: request.currency || "NGN",
        creditLimit: request.creditLimit,
        discountPercentage: request.discountPercentage,
        averageLeadTimeDays: request.averageLeadTimeDays,
        isActive: true,
        isPreferred: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await SupplierModel.create(supplier);

      return supplier;
    } catch (error) {
      this.handleError("Error creating supplier", error);
      throw error;
    }
  }

  async getSuppliers(
    isLocal?: boolean,
    isActive: boolean = true
  ): Promise<Supplier[]> {
    try {
      const where: any = { isActive };
      if (isLocal !== undefined) {
        where.isLocal = isLocal;
      }

      const notifications = await SupplierModel.findMany(where);
      
      return notifications.map(n => this.transformNotificationToSupplier(n));
    } catch (error) {
      this.handleError("Error getting suppliers", error);
      throw error;
    }
  }

  // Private helper methods

  private async identifyProductsNeedingReorder(): Promise<any[]> {
    return InventoryModel.findMany({
      where: {
        isActive: true,
        trackQuantity: true,
        OR: [
          { stock: { lte: InventoryModel.findMany.arguments.lowStockThreshold || 10 } },
          { stock: 0 },
        ],
      },
      include: {
        category: true,
        stockReservations: {
          where: { expiresAt: { gt: new Date() } },
        },
      },
      take: 50, // Limit for performance
    });
  }

  private async generateReorderSuggestion(product: any): Promise<ReorderSuggestion | null> {
    const velocityData = await this.calculateSalesVelocity(product.id);
    const supplier = await this.findBestSupplier(product.id);
    const businessContext = await this.calculateNigerianBusinessContext(product, supplier);

    if (velocityData.daysOfStockLeft <= 7) { // Needs reorder within a week
      return {
        id: `suggestion-${product.id}-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        categoryName: product.category?.name,
        currentStock: product.stock,
        reservedStock: 0,
        availableStock: product.stock,
        reorderPoint: product.lowStockThreshold,
        suggestedQuantity: this.calculateOptimalOrderQuantity(product, velocityData),
        estimatedCost: 0,
        currency: "NGN",
        averageDailySales: velocityData.averageDailySales,
        salesVelocity: velocityData.salesVelocity,
        daysOfStockLeft: velocityData.daysOfStockLeft,
        leadTimeDays: supplier?.averageLeadTimeDays || 7,
        preferredSupplierId: supplier?.id,
        supplierName: supplier?.name,
        supplierContact: supplier?.phone || supplier?.email,
        importRequired: businessContext.importRequired,
        customsClearanceDays: businessContext.customsClearanceDays,
        localSupplierAvailable: businessContext.localSupplierAvailable,
        businessDaysToReorder: businessContext.businessDaysToReorder,
        status: ReorderStatus.SUGGESTED,
        priority: this.calculatePriority(product, velocityData),
        reason: `Stock will run out in ${velocityData.daysOfStockLeft} days`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return null;
  }

  private async calculateSalesVelocity(productId: string): Promise<SalesVelocityData> {
    // Get sales data from order items for the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Simplified calculation - in production you'd query actual order data
    const mockDailySales = Math.random() * 5; // 0-5 units per day
    
    return {
      productId,
      averageDailySales: mockDailySales,
      salesVelocity: mockDailySales * 7, // Weekly velocity
      daysOfStockLeft: mockDailySales > 0 ? Math.floor(10 / mockDailySales) : 999,
      isSlowMoving: mockDailySales < 0.5,
      isFastMoving: mockDailySales > 3,
    };
  }

  private calculateOptimalOrderQuantity(product: any, velocity: SalesVelocityData): number {
    // Economic Order Quantity (EOQ) with Nigerian business considerations
    const leadTimeDays = 14; // Assume 2 weeks lead time for local suppliers
    const safetyStockDays = 7; // 1 week safety stock
    
    const leadTimeDemand = velocity.averageDailySales * leadTimeDays;
    const safetyStock = velocity.averageDailySales * safetyStockDays;
    
    const optimalQuantity = Math.max(
      leadTimeDemand + safetyStock,
      product.lowStockThreshold * 2, // At least twice the threshold
      50 // Minimum order quantity
    );

    return Math.ceil(optimalQuantity);
  }

  private calculatePriority(product: any, velocity: SalesVelocityData): AlertSeverity {
    if (product.stock === 0) {
      return AlertSeverity.URGENT;
    }
    if (velocity.daysOfStockLeft <= 3) {
      return AlertSeverity.CRITICAL;
    }
    if (velocity.daysOfStockLeft <= 7) {
      return AlertSeverity.HIGH;
    }
    if (velocity.daysOfStockLeft <= 14) {
      return AlertSeverity.MEDIUM;
    }
    return AlertSeverity.LOW;
  }

  private async findBestSupplier(productId: string): Promise<Supplier | null> {
    // Get preferred suppliers (local first)
    const suppliers = await this.getSuppliers(true, true); // Local, active suppliers
    
    if (suppliers.length > 0) {
      // Return the first preferred supplier or highest rated
      return suppliers.find(s => s.isPreferred) || suppliers[0];
    }

    return null;
  }

  private async getSupplier(supplierId: string): Promise<Supplier | null> {
    const notification = await SupplierModel.findUnique(supplierId);
    return notification ? this.transformNotificationToSupplier(notification) : null;
  }

  private async calculateNigerianBusinessContext(product: any, supplier: Supplier | null): Promise<{
    importRequired: boolean;
    customsClearanceDays?: number;
    localSupplierAvailable: boolean;
    businessDaysToReorder: number;
  }> {
    const isImportProduct = !supplier?.isLocal || product.category?.name?.toLowerCase().includes('electronics');
    
    return {
      importRequired: isImportProduct,
      customsClearanceDays: isImportProduct ? 7 : undefined,
      localSupplierAvailable: supplier?.isLocal || false,
      businessDaysToReorder: this.calculateBusinessDaysToReorder(),
    };
  }

  private calculateBusinessDaysToReorder(): number {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // If it's Friday evening or weekend, add extra days
    if (dayOfWeek === 5 && now.getHours() > 17) return 3; // Friday evening
    if (dayOfWeek === 6 || dayOfWeek === 0) return 2; // Weekend
    
    return 1; // Regular business day
  }

  private async calculateNigerianBusinessDetails(
    quantity: number,
    unitCost: number,
    supplier: Supplier | null,
    requiresImport: boolean
  ): Promise<{
    customsValue?: number;
    customsDuty?: number;
  }> {
    if (!requiresImport) {
      return {};
    }

    const totalValue = quantity * unitCost;
    const dutyRate = 0.15; // Assume 15% customs duty for imported goods
    
    return {
      customsValue: totalValue,
      customsDuty: totalValue * dutyRate,
    };
  }

  private calculateExpectedDelivery(supplier: Supplier | null): Date {
    const leadDays = supplier?.averageLeadTimeDays || 14;
    const businessDays = this.calculateBusinessDaysToReorder();
    
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + leadDays + businessDays);
    
    return deliveryDate;
  }

  private async calculateEstimatedCost(
    quantity: number,
    supplier: Supplier | null,
    product: any
  ): Promise<number> {
    // Use cost price or estimate based on selling price
    const unitCost = Number(product.costPrice) || Number(product.price) * 0.6;
    let totalCost = quantity * unitCost;

    // Apply supplier discount if available
    if (supplier?.discountPercentage) {
      totalCost *= (1 - supplier.discountPercentage / 100);
    }

    return totalCost;
  }

  private async handleReorderCompletion(request: ReorderRequest): Promise<void> {
    // Update product stock
    await InventoryModel.update({
      where: { id: request.productId },
      data: {
        stock: { increment: request.quantity },
      },
    });

    // Create inventory movement
    await InventoryMovementModel.create({
      data: {
        productId: request.productId,
        type: "IN",
        quantity: request.quantity,
        reason: `Reorder completed - ${request.orderReference || 'Manual restock'}`,
        reference: request.orderReference,
      },
    });
  }

  private async sendApprovalNotification(request: ReorderRequest, product: any): Promise<void> {
    await this.notificationService.sendNotification({
      type: NotificationType.RESTOCK_NEEDED,
      channel: NotificationChannel.EMAIL,
      recipient: {
        email: "admin@bareloft.com",
        name: "Inventory Manager",
      },
      variables: {
        productName: product.name,
        quantity: request.quantity,
        totalCost: request.totalCost,
        supplierName: request.supplierId ? "Unknown Supplier" : "Manual Order",
      },
    });
  }

  private async sendStatusUpdateNotification(
    request: ReorderRequest,
    action: string,
    userId: string
  ): Promise<void> {
    // Implementation would send notifications based on status change
    console.log(`Reorder ${request.id} ${action} by ${userId}`);
  }

  private async calculateReorderAnalytics(requests: ReorderRequest[]): Promise<any> {
    const completedOrders = requests.filter(r => r.status === ReorderStatus.COMPLETED);
    const totalValue = requests.reduce((sum, r) => sum + r.totalCost, 0);
    
    return {
      totalOrders: requests.length,
      totalValue,
      averageOrderValue: requests.length > 0 ? totalValue / requests.length : 0,
      completionRate: requests.length > 0 ? (completedOrders.length / requests.length) * 100 : 0,
      averageDeliveryDays: 14, // Simplified
      topSuppliers: [], // Simplified
    };
  }

  private async transformNotificationToReorderRequest(notification: any): Promise<ReorderRequest | null> {
    const data = notification.data as any;
    if (data?.type !== "REORDER_REQUEST") return null;

    return {
      id: notification.id,
      suggestionId: data.suggestionId,
      productId: data.productId,
      supplierId: data.supplierId,
      quantity: data.quantity,
      unitCost: data.unitCost,
      totalCost: data.totalCost,
      currency: data.currency || "NGN",
      expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined,
      actualDeliveryDate: data.actualDeliveryDate ? new Date(data.actualDeliveryDate) : undefined,
      deliveryAddress: data.deliveryAddress,
      requiresImport: data.requiresImport || false,
      customsValue: data.customsValue,
      customsDuty: data.customsDuty,
      localPurchaseOrder: data.localPurchaseOrder,
      supplierInvoice: data.supplierInvoice,
      status: data.status as ReorderStatus,
      orderReference: data.orderReference,
      supplierReference: data.supplierReference,
      trackingNumber: data.trackingNumber,
      requestedBy: data.requestedBy,
      approvedBy: data.approvedBy,
      approvedAt: data.approvedAt ? new Date(data.approvedAt) : undefined,
      completedBy: data.completedBy,
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      notes: data.notes,
      history: data.history || [],
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  private transformNotificationToSupplier(notification: any): Supplier {
    const data = notification.data as any;
    
    return {
      id: notification.id,
      name: data.name,
      code: data.code,
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone,
      whatsapp: data.whatsapp,
      address: data.address,
      isLocal: data.isLocal || true,
      businessType: data.businessType || "distributor",
      taxId: data.taxId,
      cacNumber: data.cacNumber,
      rating: data.rating,
      reliability: data.reliability,
      averageLeadTimeDays: data.averageLeadTimeDays || 7,
      onTimeDeliveryRate: data.onTimeDeliveryRate,
      qualityRating: data.qualityRating,
      paymentTerms: data.paymentTerms,
      currency: data.currency || "NGN",
      creditLimit: data.creditLimit,
      discountPercentage: data.discountPercentage,
      isActive: data.isActive !== false,
      isPreferred: data.isPreferred || false,
      lastOrderDate: data.lastOrderDate ? new Date(data.lastOrderDate) : undefined,
      totalOrders: data.totalOrders || 0,
      totalValue: data.totalValue || 0,
      createdAt: data.createdAt ? new Date(data.createdAt) : notification.createdAt,
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : notification.updatedAt,
    };
  }
}