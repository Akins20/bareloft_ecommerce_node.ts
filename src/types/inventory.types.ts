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
  REORDER_NEEDED = "REORDER_NEEDED",
  CRITICAL_STOCK = "CRITICAL_STOCK",
  SLOW_MOVING = "SLOW_MOVING",
  FAST_MOVING = "FAST_MOVING",
}

export enum AlertSeverity {
  INFO = "info",
  LOW = "low", 
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
  URGENT = "urgent",
}

export enum ReorderStatus {
  SUGGESTED = "suggested",
  PENDING_APPROVAL = "pending_approval", 
  APPROVED = "approved",
  ORDER_PLACED = "order_placed",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  REJECTED = "rejected",
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

// Alert Request Types
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

// Reorder Request Types
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
  userId?: string; // Admin user ID
  name: string;
  description?: string;
  
  // Alert Types and Thresholds
  lowStockEnabled: boolean;
  lowStockThreshold?: number; // Override global threshold
  criticalStockEnabled: boolean;
  criticalStockThreshold?: number;
  outOfStockEnabled: boolean;
  reorderNeededEnabled: boolean;
  slowMovingEnabled: boolean;
  slowMovingDays?: number;
  
  // Notification Preferences
  emailEnabled: boolean;
  emailAddress?: string;
  smsEnabled: boolean;
  phoneNumber?: string;
  pushEnabled: boolean;
  
  // Business Hours (Nigerian context)
  respectBusinessHours: boolean;
  businessHoursStart?: string; // "09:00"
  businessHoursEnd?: string; // "17:00"
  businessDays?: string[]; // ["monday", "tuesday", ...]
  timezone: string; // "Africa/Lagos"
  
  // Frequency Control
  maxAlertsPerHour?: number;
  maxAlertsPerDay?: number;
  
  // Filtering
  categoryIds?: string[]; // Only alert for specific categories
  productIds?: string[]; // Only alert for specific products
  minStockValue?: number; // Only alert if stock value above threshold
  
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
  
  // Current State
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  reorderPoint: number;
  
  // Calculations
  suggestedQuantity: number;
  estimatedCost: number;
  currency: string;
  
  // Velocity Analysis
  averageDailySales: number;
  salesVelocity: number;
  daysOfStockLeft: number;
  leadTimeDays: number;
  
  // Supplier Information
  preferredSupplierId?: string;
  supplierName?: string;
  supplierContact?: string;
  lastOrderDate?: Date;
  lastOrderQuantity?: number;
  lastOrderCost?: number;
  
  // Nigerian Business Context
  importRequired: boolean;
  customsClearanceDays?: number;
  localSupplierAvailable: boolean;
  businessDaysToReorder: number;
  
  // Status
  status: ReorderStatus;
  priority: AlertSeverity;
  reason: string;
  notes?: string;
  
  // Approval Tracking
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
  
  // Order Details
  quantity: number;
  unitCost: number;
  totalCost: number;
  currency: string;
  
  // Delivery
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  deliveryAddress?: string;
  
  // Nigerian Business Details
  requiresImport: boolean;
  customsValue?: number;
  customsDuty?: number;
  localPurchaseOrder?: string;
  supplierInvoice?: string;
  
  // Status and Tracking
  status: ReorderStatus;
  orderReference?: string;
  supplierReference?: string;
  trackingNumber?: string;
  
  // Approval Workflow
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  completedBy?: string;
  completedAt?: Date;
  
  // Notes and History
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
  whatsapp?: string; // Nigerian business context
  
  // Address
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
  };
  
  // Business Details
  isLocal: boolean; // Nigerian supplier
  businessType: "manufacturer" | "distributor" | "importer" | "wholesaler";
  taxId?: string; // Nigerian tax ID
  cacNumber?: string; // Nigerian CAC registration
  
  // Performance
  rating?: number;
  reliability?: number;
  averageLeadTimeDays: number;
  onTimeDeliveryRate?: number;
  qualityRating?: number;
  
  // Financial
  paymentTerms?: string;
  currency: string;
  creditLimit?: number;
  discountPercentage?: number;
  
  // Status
  isActive: boolean;
  isPreferred: boolean;
  lastOrderDate?: Date;
  totalOrders?: number;
  totalValue?: number;
  
  createdAt: Date;
  updatedAt: Date;
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
