export enum OrderStatus {
  PENDING,
  CONFIRMED,
  PROCESSING,
  SHIPPED,
  DELIVERED,
  CANCELLED,
  REFUNDED,
}

export enum PaymentStatus {
  PENDING,
  PROCESSING,
  COMPLETED,
  FAILED,
  CANCELLED,
  REFUNDED,
}

export enum PaymentMethod {
  CARD = "card",
  BANK_TRANSFER = "bank_transfer",
  USSD = "ussd",
  WALLET = "wallet",
}

export interface OrderAddress {
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
  phoneNumber: string;
}

export interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  total: number;
  orderId: string;
  productId: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations (optional - populated by includes)
  order?: Order;
  product?: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    price: number;
    primaryImage?: string;
  };
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount: number;
  total: number;
  currency: string;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
  userId: string;
  shippingAddressId?: string;
  billingAddressId?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations (optional - populated by includes)
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
  items?: OrderItem[];
  timelineEvents?: OrderTimelineEvent[];
  paymentTransactions?: any[];
  shippingAddress?: OrderAddress;
  billingAddress?: OrderAddress;
  _count?: {
    items: number;
  };
}

// Request/Response Types
export interface CreateOrderRequest {
  shippingAddress: OrderAddress;
  billingAddress?: OrderAddress; // Optional, defaults to shipping
  paymentMethod?: PaymentMethod; // Made optional since it can be set during payment
  customerNotes?: string;
  couponCode?: string;
  cartData?: {
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      product?: {
        name: string;
        sku: string;
        price: number;
      };
    }>;
    subtotal: number;
  };
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  adminNotes?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
}

export interface OrderListQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  startDate?: string;
  endDate?: string;
  search?: string; // Search by order number, customer name, etc.
  sortBy?: "createdAt" | "totalAmount" | "status";
  sortOrder?: "asc" | "desc";
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number; // This can stay as totalAmount for display purposes
  currency: string;
  itemCount: number;
  customerName: string;
  createdAt: Date;
  estimatedDelivery?: Date; // Keep for compatibility
}

export interface OrderListResponse {
  orders: OrderSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
  };
}

export interface OrderDetailResponse {
  order: Order;
  timeline: OrderTimelineEvent[];
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phoneNumber: string;
    totalOrders: number;
    totalSpent: number;
  };
}

export interface OrderTimelineEvent {
  id: string;
  type: string;
  message: string;
  data?: any;
  orderId: string;
  createdAt: Date;

  // Relations (optional)
  order?: Order;
}

// Checkout Types
export interface CheckoutSession {
  id: string;
  userId?: string; // null for guest checkout
  items: CheckoutItem[];
  shippingAddress?: OrderAddress;
  billingAddress?: OrderAddress;
  paymentMethod?: PaymentMethod;
  couponCode?: string;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  expiresAt: Date;
  createdAt: Date;
}

export interface CheckoutItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CreateOrderResponse {
  order: Order;
  paymentUrl?: string; // For Paystack payment
  qrCode?: string; // For USSD/Bank transfer
}

export interface PaymentOrderResponse {
  success: boolean;
  message: string;
  order: {
    id: string;
    orderNumber: string;
    items: Array<{
      productId: string;
      productName: string;
      productSku: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    pricing: {
      subtotal: number;
      shipping: number;
      discount?: number;
      total: number;
      currency: string;
    };
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    createdAt: Date;
  };
  payment: {
    reference: string;
    amount: number;
    currency: string;
    email: string;
  };
}

export interface OrderResponse {
  success: boolean;
  message: string;
  order: Order;
}

// Analytics Types
export interface OrderAnalytics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  topProducts: {
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
  }[];
  revenueByMonth: {
    month: string;
    revenue: number;
    orders: number;
  }[];
  ordersByStatus: {
    status: OrderStatus;
    count: number;
    percentage: number;
  }[];
}

// Bulk Processing Types
export enum BulkOperationType {
  STATUS_UPDATE = 'status_update',
  ASSIGN_STAFF = 'assign_staff',
  CANCEL_ORDERS = 'cancel_orders',
  PROCESS_REFUNDS = 'process_refunds',
  SET_PRIORITY = 'set_priority',
  EXPORT_DATA = 'export_data',
  GENERATE_LABELS = 'generate_labels',
  SEND_NOTIFICATIONS = 'send_notifications',
  IMPORT_DATA = 'import_data',
}

export enum BulkJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PARTIALLY_COMPLETED = 'partially_completed',
}

export enum OrderPriority {
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low',
}

export interface BulkOrderStatusUpdateRequest {
  orderIds: string[];
  newStatus: OrderStatus;
  notes?: string;
  notifyCustomers?: boolean;
  processInBatches?: boolean;
  batchSize?: number;
}

export interface BulkOrderAssignRequest {
  orderIds: string[];
  staffId: string;
  staffName?: string;
  notes?: string;
  assignmentType?: 'fulfillment' | 'customer_service' | 'quality_check';
}

export interface BulkOrderCancelRequest {
  orderIds: string[];
  reason: string;
  processRefunds?: boolean;
  notifyCustomers?: boolean;
  refundPercentage?: number; // 0-100, default 100
}

export interface BulkRefundRequest {
  orderIds: string[];
  reason: string;
  refundType?: 'full' | 'partial';
  customAmounts?: { [orderId: string]: number }; // For partial refunds
  refundMethod?: 'original' | 'wallet' | 'bank_transfer';
  notifyCustomers?: boolean;
}

export interface BulkPriorityUpdateRequest {
  orderIds: string[];
  priority: OrderPriority;
  reason?: string;
  autoReorder?: boolean; // Reorder processing queue based on priority
}

export interface BulkNotificationRequest {
  orderIds: string[];
  notificationType: 'status_update' | 'shipping_delay' | 'ready_for_pickup' | 'custom';
  customMessage?: string;
  channels: ('email' | 'sms' | 'push')[];
  scheduleTime?: Date; // For scheduled notifications
}

export interface BulkExportRequest {
  orderIds?: string[]; // If empty, use filters
  filters?: {
    status?: OrderStatus[];
    paymentStatus?: PaymentStatus[];
    dateFrom?: Date;
    dateTo?: Date;
    state?: string[];
    minAmount?: number;
    maxAmount?: number;
  };
  format: 'csv' | 'xlsx' | 'pdf';
  includeCustomerData?: boolean;
  includePaymentData?: boolean;
  includeItemDetails?: boolean;
  groupBy?: 'status' | 'state' | 'date' | 'none';
}

export interface BulkImportRequest {
  data: BulkImportRow[];
  validateOnly?: boolean;
  skipInvalidRows?: boolean;
  notifyOnCompletion?: boolean;
}

export interface BulkImportRow {
  orderNumber?: string;
  orderId?: string;
  newStatus?: string;
  trackingNumber?: string;
  notes?: string;
  priority?: string;
  assignedStaff?: string;
  estimatedDelivery?: string;
  customData?: { [key: string]: any };
}

export interface BulkJob {
  id: string;
  type: BulkOperationType;
  status: BulkJobStatus;
  title: string;
  description?: string;
  requestData: any; // Original request data
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  progress: number; // 0-100
  results?: BulkJobResult[];
  errors?: BulkJobError[];
  estimatedCompletion?: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
  // Nigerian specific fields
  processingRegion?: 'lagos' | 'abuja' | 'kano' | 'port_harcourt' | 'national';
  businessHoursOnly?: boolean;
  respectHolidays?: boolean;
}

export interface BulkJobResult {
  id: string;
  orderId: string;
  orderNumber?: string;
  success: boolean;
  message?: string;
  data?: any;
  processedAt: Date;
}

export interface BulkJobError {
  id: string;
  orderId?: string;
  orderNumber?: string;
  error: string;
  errorCode?: string;
  retryable: boolean;
  occurredAt: Date;
}

export interface BulkJobProgress {
  jobId: string;
  status: BulkJobStatus;
  progress: number;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  estimatedCompletion?: Date;
  currentOperation?: string;
  lastUpdate: Date;
}

export interface BulkProcessingSummary {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalOrdersProcessed: number;
  averageProcessingTime: number; // in minutes
  successRate: number; // percentage
  lastJobCompletion?: Date;
  queueSize: number;
  systemLoad: 'low' | 'medium' | 'high';
}

export interface SmartBatchConfig {
  maxBatchSize: number;
  priorityBatching: boolean;
  locationBasedBatching: boolean;
  timeBasedBatching: boolean;
  resourceAwareBatching: boolean;
  nigerianBusinessHours: {
    enabled: boolean;
    timezone: string;
    weekdays: { start: string; end: string };
    saturday: { start: string; end: string };
    holidays: Date[];
  };
}

export interface BulkOperationMetrics {
  operationType: BulkOperationType;
  totalOperations: number;
  successRate: number;
  averageProcessingTime: number;
  averageBatchSize: number;
  peakProcessingHours: string[];
  commonErrors: {
    error: string;
    frequency: number;
    impact: 'low' | 'medium' | 'high';
  }[];
  performanceByState: {
    state: string;
    successRate: number;
    averageTime: number;
  }[];
  resourceUtilization: {
    cpuUsage: number;
    memoryUsage: number;
    queueLength: number;
  };
}
