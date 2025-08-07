export declare enum InventoryMovementType {
    IN = "IN",
    OUT = "OUT",
    ADJUSTMENT = "ADJUSTMENT",
    INITIAL_STOCK = "IN",
    RESTOCK = "IN",
    PURCHASE = "IN",
    RETURN = "IN",
    TRANSFER_IN = "IN",
    ADJUSTMENT_IN = "ADJUSTMENT",
    SALE = "OUT",
    TRANSFER_OUT = "OUT",
    DAMAGE = "OUT",
    THEFT = "OUT",
    EXPIRED = "OUT",
    ADJUSTMENT_OUT = "ADJUSTMENT",
    RESERVE = "OUT",
    RELEASE_RESERVE = "IN"
}
export declare enum InventoryStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    DISCONTINUED = "DISCONTINUED",
    OUT_OF_STOCK = "OUT_OF_STOCK",
    LOW_STOCK = "LOW_STOCK",
    OVERSTOCKED = "OVERSTOCKED"
}
export declare enum StockAlert {
    LOW_STOCK = "LOW_STOCK",
    OUT_OF_STOCK = "OUT_OF_STOCK",
    OVERSTOCK = "OVERSTOCK",
    NEGATIVE_STOCK = "NEGATIVE_STOCK",
    RESERVATION_EXPIRED = "RESERVATION_EXPIRED",
    REORDER_NEEDED = "REORDER_NEEDED",
    CRITICAL_STOCK = "CRITICAL_STOCK",
    SLOW_MOVING = "SLOW_MOVING",
    FAST_MOVING = "FAST_MOVING"
}
export declare enum AlertSeverity {
    INFO = "info",
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical",
    URGENT = "urgent"
}
export declare enum ReorderStatus {
    SUGGESTED = "suggested",
    PENDING_APPROVAL = "pending_approval",
    APPROVED = "approved",
    ORDER_PLACED = "order_placed",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
    REJECTED = "rejected"
}
export interface Inventory {
    id: string;
    productId: string;
    quantity: number;
    reservedQuantity: number;
    availableQuantity: number;
    lowStockThreshold: number;
    maxStockLevel?: number;
    reorderPoint: number;
    reorderQuantity: number;
    status: InventoryStatus;
    trackInventory: boolean;
    allowBackorder: boolean;
    backorderLimit?: number;
    warehouseId?: string;
    location?: string;
    bin?: string;
    averageCost: number;
    lastCost: number;
    lastRestockedAt?: Date;
    lastSoldAt?: Date;
    lastMovementAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface InventoryMovement {
    id: string;
    productId: string;
    type: InventoryMovementType;
    quantity: number;
    reference?: string;
    reason?: string;
    inventoryId?: string;
    previousQuantity?: number;
    newQuantity?: number;
    unitCost?: number;
    totalCost?: number;
    referenceType?: "order" | "purchase" | "adjustment" | "transfer";
    referenceId?: string;
    notes?: string;
    metadata?: Record<string, any>;
    createdBy?: string;
    batchId?: string;
    createdAt: Date;
}
export interface StockReservation {
    id: string;
    productId: string;
    orderId?: string;
    quantity: number;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    inventoryId?: string;
    cartId?: string;
    reason?: string;
    isExpired?: boolean;
    isReleased?: boolean;
    releasedAt?: Date;
}
export interface UpdateInventoryRequest {
    productId: string;
    quantity?: number;
    lowStockThreshold?: number;
    reorderPoint?: number;
    reorderQuantity?: number;
    trackInventory?: boolean;
    allowBackorder?: boolean;
    reason?: string;
    notes?: string;
}
export interface BulkInventoryUpdateRequest {
    updates: {
        productId: string;
        quantity: number;
        reason?: string;
    }[];
    batchReason?: string;
    notes?: string;
}
export interface ReserveStockRequest {
    productId: string;
    quantity: number;
    orderId?: string;
    cartId?: string;
    reason: string;
    expirationMinutes?: number;
}
export interface ReleaseReservationRequest {
    reservationId?: string;
    orderId?: string;
    cartId?: string;
    reason: string;
}
export interface InventoryAdjustmentRequest {
    productId: string;
    adjustmentType: "set" | "increase" | "decrease";
    quantity: number;
    reason: string;
    notes?: string;
    unitCost?: number;
}
export interface CreateAlertConfigurationRequest {
    name: string;
    description?: string;
    lowStockEnabled: boolean;
    lowStockThreshold?: number;
    criticalStockEnabled: boolean;
    criticalStockThreshold?: number;
    outOfStockEnabled: boolean;
    reorderNeededEnabled: boolean;
    slowMovingEnabled: boolean;
    slowMovingDays?: number;
    emailEnabled: boolean;
    emailAddress?: string;
    smsEnabled: boolean;
    phoneNumber?: string;
    pushEnabled: boolean;
    respectBusinessHours?: boolean;
    businessHoursStart?: string;
    businessHoursEnd?: string;
    businessDays?: string[];
    timezone?: string;
    maxAlertsPerHour?: number;
    maxAlertsPerDay?: number;
    categoryIds?: string[];
    productIds?: string[];
    minStockValue?: number;
}
export interface UpdateAlertRequest {
    alertId: string;
    action: "acknowledge" | "dismiss" | "read";
    notes?: string;
}
export interface TestAlertRequest {
    configurationId: string;
    alertType: StockAlert;
    productId?: string;
}
export interface CreateReorderSuggestionRequest {
    productId: string;
    quantity?: number;
    reason?: string;
    preferredSupplierId?: string;
    notes?: string;
    priority?: AlertSeverity;
}
export interface CreateReorderRequestRequest {
    suggestionId?: string;
    productId: string;
    supplierId?: string;
    quantity: number;
    unitCost: number;
    expectedDeliveryDate?: Date;
    requiresImport?: boolean;
    notes?: string;
}
export interface UpdateReorderRequestRequest {
    action: "approve" | "reject" | "complete" | "cancel";
    notes?: string;
    actualDeliveryDate?: Date;
    orderReference?: string;
    supplierReference?: string;
    trackingNumber?: string;
}
export interface CreateSupplierRequest {
    name: string;
    code?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    address?: {
        street: string;
        city: string;
        state: string;
        country: string;
        postalCode?: string;
    };
    isLocal: boolean;
    businessType: "manufacturer" | "distributor" | "importer" | "wholesaler";
    taxId?: string;
    cacNumber?: string;
    paymentTerms?: string;
    currency?: string;
    creditLimit?: number;
    discountPercentage?: number;
    averageLeadTimeDays: number;
}
export interface InventoryResponse {
    inventory: Inventory;
    movements: InventoryMovement[];
    reservations: StockReservation[];
    alerts: InventoryAlert[];
}
export interface InventoryListResponse {
    inventories: InventoryListItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    summary: {
        totalProducts: number;
        lowStockProducts: number;
        outOfStockProducts: number;
        totalValue: number;
    };
}
export interface InventoryListItem {
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    reservedQuantity: number;
    availableQuantity: number;
    lowStockThreshold: number;
    status: InventoryStatus;
    lastMovementAt?: Date;
    totalValue: number;
}
export interface InventoryAlert {
    id: string;
    type: StockAlert;
    severity: AlertSeverity;
    productId: string;
    productName: string;
    productSku?: string;
    categoryName?: string;
    currentStock: number;
    threshold?: number;
    reorderPoint?: number;
    message: string;
    description?: string;
    isRead: boolean;
    isAcknowledged: boolean;
    acknowledgedBy?: string;
    acknowledgedAt?: Date;
    isDismissed: boolean;
    dismissedBy?: string;
    dismissedAt?: Date;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
export interface AlertConfiguration {
    id: string;
    userId?: string;
    name: string;
    description?: string;
    lowStockEnabled: boolean;
    lowStockThreshold?: number;
    criticalStockEnabled: boolean;
    criticalStockThreshold?: number;
    outOfStockEnabled: boolean;
    reorderNeededEnabled: boolean;
    slowMovingEnabled: boolean;
    slowMovingDays?: number;
    emailEnabled: boolean;
    emailAddress?: string;
    smsEnabled: boolean;
    phoneNumber?: string;
    pushEnabled: boolean;
    respectBusinessHours: boolean;
    businessHoursStart?: string;
    businessHoursEnd?: string;
    businessDays?: string[];
    timezone: string;
    maxAlertsPerHour?: number;
    maxAlertsPerDay?: number;
    categoryIds?: string[];
    productIds?: string[];
    minStockValue?: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface ReorderSuggestion {
    id: string;
    productId: string;
    productName: string;
    productSku?: string;
    categoryName?: string;
    currentStock: number;
    reservedStock: number;
    availableStock: number;
    reorderPoint: number;
    suggestedQuantity: number;
    estimatedCost: number;
    currency: string;
    averageDailySales: number;
    salesVelocity: number;
    daysOfStockLeft: number;
    leadTimeDays: number;
    preferredSupplierId?: string;
    supplierName?: string;
    supplierContact?: string;
    lastOrderDate?: Date;
    lastOrderQuantity?: number;
    lastOrderCost?: number;
    importRequired: boolean;
    customsClearanceDays?: number;
    localSupplierAvailable: boolean;
    businessDaysToReorder: number;
    status: ReorderStatus;
    priority: AlertSeverity;
    reason: string;
    notes?: string;
    createdBy?: string;
    approvedBy?: string;
    approvedAt?: Date;
    rejectedBy?: string;
    rejectedAt?: Date;
    rejectionReason?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface ReorderRequest {
    id: string;
    suggestionId?: string;
    productId: string;
    supplierId?: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    currency: string;
    expectedDeliveryDate?: Date;
    actualDeliveryDate?: Date;
    deliveryAddress?: string;
    requiresImport: boolean;
    customsValue?: number;
    customsDuty?: number;
    localPurchaseOrder?: string;
    supplierInvoice?: string;
    status: ReorderStatus;
    orderReference?: string;
    supplierReference?: string;
    trackingNumber?: string;
    requestedBy: string;
    approvedBy?: string;
    approvedAt?: Date;
    completedBy?: string;
    completedAt?: Date;
    notes?: string;
    history?: ReorderHistoryEntry[];
    createdAt: Date;
    updatedAt: Date;
}
export interface ReorderHistoryEntry {
    action: string;
    performedBy: string;
    performedAt: Date;
    notes?: string;
    previousStatus?: ReorderStatus;
    newStatus?: ReorderStatus;
}
export interface Supplier {
    id: string;
    name: string;
    code?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    address?: {
        street: string;
        city: string;
        state: string;
        country: string;
        postalCode?: string;
    };
    isLocal: boolean;
    businessType: "manufacturer" | "distributor" | "importer" | "wholesaler";
    taxId?: string;
    cacNumber?: string;
    rating?: number;
    reliability?: number;
    averageLeadTimeDays: number;
    onTimeDeliveryRate?: number;
    qualityRating?: number;
    paymentTerms?: string;
    currency: string;
    creditLimit?: number;
    discountPercentage?: number;
    isActive: boolean;
    isPreferred: boolean;
    lastOrderDate?: Date;
    totalOrders?: number;
    totalValue?: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface InventoryAnalytics {
    totalProducts: number;
    totalStockValue: number;
    averageStockLevel: number;
    stockTurnoverRate: number;
    stockDistribution: {
        status: InventoryStatus;
        count: number;
        percentage: number;
        value: number;
    }[];
    movementsByType: {
        type: InventoryMovementType;
        count: number;
        quantity: number;
        value: number;
    }[];
    topMovingProducts: {
        productId: string;
        productName: string;
        movementCount: number;
        totalQuantityMoved: number;
        velocity: number;
    }[];
    slowMovingProducts: {
        productId: string;
        productName: string;
        daysWithoutMovement: number;
        currentStock: number;
        stockValue: number;
    }[];
    stockLevelsOverTime: {
        date: string;
        totalStock: number;
        totalValue: number;
        lowStockProducts: number;
    }[];
    alertsSummary: {
        total: number;
        byType: {
            type: StockAlert;
            count: number;
        }[];
        unreadCount: number;
    };
}
export interface InventoryValuation {
    totalValue: number;
    totalQuantity: number;
    averageUnitCost: number;
    valueByCategory: {
        categoryId: string;
        categoryName: string;
        value: number;
        quantity: number;
        percentage: number;
    }[];
    topValueProducts: {
        productId: string;
        productName: string;
        quantity: number;
        unitCost: number;
        totalValue: number;
    }[];
    monthlyValuation: {
        month: string;
        openingValue: number;
        additions: number;
        reductions: number;
        closingValue: number;
    }[];
}
export interface Warehouse {
    id: string;
    name: string;
    code: string;
    address: {
        street: string;
        city: string;
        state: string;
        country: string;
        postalCode?: string;
    };
    isActive: boolean;
    isDefault: boolean;
    capacity?: number;
    manager?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface StockTransfer {
    id: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    items: {
        productId: string;
        quantity: number;
        unitCost: number;
    }[];
    status: "pending" | "in_transit" | "completed" | "cancelled";
    reason: string;
    notes?: string;
    createdBy: string;
    approvedBy?: string;
    receivedBy?: string;
    createdAt: Date;
    shippedAt?: Date;
    receivedAt?: Date;
}
//# sourceMappingURL=inventory.types.d.ts.map