export enum InventoryMovementType {
  // Inbound
  IN = "IN",
  // Outbound  
  OUT = "OUT",
  // Adjustments
  ADJUSTMENT = "ADJUSTMENT",

  // Backwards compatibility aliases
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
  RELEASE_RESERVE = "IN",
}

export enum InventoryStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  DISCONTINUED = "DISCONTINUED",
  OUT_OF_STOCK = "OUT_OF_STOCK",
  LOW_STOCK = "LOW_STOCK",
  OVERSTOCKED = "OVERSTOCKED",
}

export enum StockAlert {
  LOW_STOCK = "LOW_STOCK",
  OUT_OF_STOCK = "OUT_OF_STOCK",
  OVERSTOCK = "OVERSTOCK",
  NEGATIVE_STOCK = "NEGATIVE_STOCK",
  RESERVATION_EXPIRED = "RESERVATION_EXPIRED",
}

// Inventory interface matches Product fields for stock management
export interface Inventory {
  id: string;
  productId: string;

  // Stock Levels (mapped from Product model)
  quantity: number; // maps to Product.stock
  reservedQuantity: number; // calculated from reservations
  availableQuantity: number; // quantity - reservedQuantity

  // Thresholds
  lowStockThreshold: number; // maps to Product.lowStockThreshold
  maxStockLevel?: number;
  reorderPoint: number;
  reorderQuantity: number;

  // Status
  status: InventoryStatus;
  trackInventory: boolean; // maps to Product.trackQuantity
  allowBackorder: boolean;
  backorderLimit?: number;

  // Location (for multi-warehouse support)
  warehouseId?: string;
  location?: string;
  bin?: string;

  // Cost Management
  averageCost: number; // maps to Product.costPrice or calculated
  lastCost: number; // maps to Product.costPrice

  // Timestamps
  lastRestockedAt?: Date;
  lastSoldAt?: Date;
  lastMovementAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// InventoryMovement interface matches actual Prisma schema
export interface InventoryMovement {
  id: string;
  productId: string; // schema only has productId, not inventoryId

  // Movement Details (simplified based on schema)
  type: InventoryMovementType;
  quantity: number;
  reference?: string; // maps to schema reference field
  reason?: string;

  // Extended fields for compatibility (not in schema)
  inventoryId?: string; // for compatibility, derived from productId
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

  // Timestamps
  createdAt: Date;
}

// StockReservation interface matches actual Prisma schema
export interface StockReservation {
  id: string;
  productId: string;
  orderId?: string;
  quantity: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Extended fields for compatibility (not in schema)
  inventoryId?: string; // for compatibility, derived from productId
  cartId?: string;
  reason?: string;
  isExpired?: boolean;
  isReleased?: boolean;
  releasedAt?: Date;
}

// Request Types
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
  expirationMinutes?: number; // Default 15 minutes
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

// Response Types
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

// Analytics Types
export interface InventoryAnalytics {
  totalProducts: number;
  totalStockValue: number;
  averageStockLevel: number;
  stockTurnoverRate: number;

  // Stock Status Distribution
  stockDistribution: {
    status: InventoryStatus;
    count: number;
    percentage: number;
    value: number;
  }[];

  // Movement Analysis
  movementsByType: {
    type: InventoryMovementType;
    count: number;
    quantity: number;
    value: number;
  }[];

  // Top Moving Products
  topMovingProducts: {
    productId: string;
    productName: string;
    movementCount: number;
    totalQuantityMoved: number;
    velocity: number; // movements per day
  }[];

  // Slow Moving Products
  slowMovingProducts: {
    productId: string;
    productName: string;
    daysWithoutMovement: number;
    currentStock: number;
    stockValue: number;
  }[];

  // Stock Levels Over Time
  stockLevelsOverTime: {
    date: string;
    totalStock: number;
    totalValue: number;
    lowStockProducts: number;
  }[];

  // Alerts Summary
  alertsSummary: {
    total: number;
    byType: {
      type: StockAlert;
      count: number;
    }[];
    unreadCount: number;
  };
}

// Inventory Valuation
export interface InventoryValuation {
  totalValue: number;
  totalQuantity: number;
  averageUnitCost: number;

  // By Category
  valueByCategory: {
    categoryId: string;
    categoryName: string;
    value: number;
    quantity: number;
    percentage: number;
  }[];

  // By Product
  topValueProducts: {
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
    totalValue: number;
  }[];

  // Movement Impact
  monthlyValuation: {
    month: string;
    openingValue: number;
    additions: number;
    reductions: number;
    closingValue: number;
  }[];
}

// Multi-Warehouse Support (Future)
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
