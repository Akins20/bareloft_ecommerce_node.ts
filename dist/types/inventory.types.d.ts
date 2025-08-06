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
    RESERVATION_EXPIRED = "RESERVATION_EXPIRED"
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
    severity: "low" | "medium" | "high" | "critical";
    productId: string;
    productName: string;
    currentStock: number;
    threshold?: number;
    message: string;
    isRead: boolean;
    createdAt: Date;
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