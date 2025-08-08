// Return and Refund Types for Nigerian E-commerce Platform

export enum ReturnStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IN_TRANSIT = 'IN_TRANSIT',
  RECEIVED = 'RECEIVED',
  INSPECTED = 'INSPECTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ReturnReason {
  DEFECTIVE = 'DEFECTIVE',
  WRONG_ITEM = 'WRONG_ITEM',
  WRONG_SIZE = 'WRONG_SIZE',
  DAMAGED_SHIPPING = 'DAMAGED_SHIPPING',
  NOT_AS_DESCRIBED = 'NOT_AS_DESCRIBED',
  CHANGED_MIND = 'CHANGED_MIND',
  DUPLICATE_ORDER = 'DUPLICATE_ORDER',
  QUALITY_ISSUES = 'QUALITY_ISSUES',
  LATE_DELIVERY = 'LATE_DELIVERY',
  OTHER = 'OTHER',
}

export enum ReturnCondition {
  SELLABLE = 'SELLABLE',
  MINOR_DAMAGE = 'MINOR_DAMAGE',
  MAJOR_DAMAGE = 'MAJOR_DAMAGE',
  DEFECTIVE = 'DEFECTIVE',
  UNSELLABLE = 'UNSELLABLE',
}

export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum RefundMethod {
  ORIGINAL_PAYMENT = 'ORIGINAL_PAYMENT',
  BANK_TRANSFER = 'BANK_TRANSFER',
  WALLET_CREDIT = 'WALLET_CREDIT',
  STORE_CREDIT = 'STORE_CREDIT',
  CASH = 'CASH',
}

export enum ReturnShippingMethod {
  CUSTOMER_DROP_OFF = 'CUSTOMER_DROP_OFF',
  PICKUP_SERVICE = 'PICKUP_SERVICE',
  COURIER_SERVICE = 'COURIER_SERVICE',
  POSTAL_SERVICE = 'POSTAL_SERVICE',
}

// Core Return Request Model
export interface ReturnRequest {
  id: string;
  returnNumber: string;
  orderId: string;
  customerId: string;
  status: ReturnStatus;
  reason: ReturnReason;
  description?: string;
  requestedItems: ReturnItem[];
  totalAmount: number;
  currency: string;
  isEligible: boolean;
  eligibilityReason?: string;
  returnShippingMethod?: ReturnShippingMethod;
  returnTrackingNumber?: string;
  estimatedPickupDate?: Date;
  actualPickupDate?: Date;
  estimatedReturnDate?: Date;
  actualReturnDate?: Date;
  qualityCheckNotes?: string;
  inspectionPhotos?: string[];
  adminNotes?: string;
  customerNotes?: string;
  processedBy?: string;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations (optional - populated by includes)
  order?: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    createdAt: Date;
  };
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phoneNumber: string;
  };
  refunds?: Refund[];
  timeline?: ReturnTimelineEvent[];
}

export interface ReturnItem {
  id: string;
  returnRequestId: string;
  orderItemId: string;
  productId: string;
  productName: string;
  productSku?: string;
  productImage?: string;
  quantityReturned: number;
  unitPrice: number;
  totalPrice: number;
  condition?: ReturnCondition;
  conditionNotes?: string;
  inspectionPhotos?: string[];
  restockable: boolean;
  restockLocation?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations (optional)
  returnRequest?: ReturnRequest;
  orderItem?: {
    id: string;
    quantity: number;
    price: number;
    total: number;
  };
  product?: {
    id: string;
    name: string;
    sku?: string;
    price: number;
    images?: { url: string }[];
  };
}

export interface Refund {
  id: string;
  refundNumber: string;
  returnRequestId?: string;
  orderId: string;
  transactionId?: string;
  customerId: string;
  status: RefundStatus;
  refundMethod: RefundMethod;
  amount: number;
  currency: string;
  reason: string;
  description?: string;
  bankAccountDetails?: {
    accountNumber: string;
    accountName: string;
    bankName: string;
    bankCode: string;
  };
  providerRefundId?: string;
  providerReference?: string;
  processedAt?: Date;
  completedAt?: Date;
  failureReason?: string;
  adminNotes?: string;
  customerNotes?: string;
  processedBy?: string;
  approvedBy?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  // Relations (optional)
  returnRequest?: ReturnRequest;
  order?: {
    id: string;
    orderNumber: string;
    total: number;
  };
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phoneNumber: string;
  };
  transaction?: {
    id: string;
    reference: string;
    amount: number;
    gateway: string;
  };
}

export interface ReturnTimelineEvent {
  id: string;
  returnRequestId: string;
  type: string;
  title: string;
  description: string;
  data?: any;
  createdBy?: string;
  createdByName?: string;
  isVisible: boolean;
  createdAt: Date;

  // Relations (optional)
  returnRequest?: ReturnRequest;
}

// Request/Response Types
export interface CreateReturnRequest {
  orderId: string;
  reason: ReturnReason;
  description?: string;
  items: {
    orderItemId: string;
    quantityToReturn: number;
    reason?: string;
  }[];
  returnShippingMethod?: ReturnShippingMethod;
  customerNotes?: string;
  pickupAddress?: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode?: string;
  };
}

export interface ReturnEligibilityCheck {
  orderId: string;
  items?: {
    orderItemId: string;
    quantityToReturn: number;
  }[];
}

export interface ReturnEligibilityResponse {
  isEligible: boolean;
  reason?: string;
  eligibleItems: {
    orderItemId: string;
    productId: string;
    productName: string;
    maxQuantityReturnable: number;
    isEligible: boolean;
    reason?: string;
    returnWindow?: {
      expiresAt: Date;
      daysRemaining: number;
    };
  }[];
  returnPolicySummary: {
    returnWindowDays: number;
    acceptsReturns: boolean;
    requiresOriginalPackaging: boolean;
    returnShippingCost: string;
  };
}

export interface ApproveReturnRequest {
  returnRequestId: string;
  approvalNotes?: string;
  pickupSchedule?: {
    estimatedDate: Date;
    timeSlot: string;
    instructions?: string;
  };
  refundPreApproval?: {
    amount: number;
    method: RefundMethod;
    bankAccountId?: string;
  };
}

export interface RejectReturnRequest {
  returnRequestId: string;
  rejectionReason: string;
  detailedExplanation?: string;
  alternativeOptions?: string[];
}

export interface InspectReturnRequest {
  returnRequestId: string;
  items: {
    returnItemId: string;
    condition: ReturnCondition;
    conditionNotes?: string;
    inspectionPhotos?: string[];
    restockable: boolean;
    restockLocation?: string;
  }[];
  qualityCheckNotes?: string;
  inspectorName?: string;
  recommendRefundAmount?: number;
}

export interface ProcessRefundRequest {
  returnRequestId?: string;
  orderId: string;
  amount: number;
  refundMethod: RefundMethod;
  reason: string;
  description?: string;
  bankAccountDetails?: {
    accountNumber: string;
    accountName: string;
    bankName: string;
    bankCode: string;
  };
  adminNotes?: string;
  notifyCustomer?: boolean;
}

export interface ReturnBulkRefundRequest {
  refundRequests: {
    returnRequestId?: string;
    orderId: string;
    amount: number;
    refundMethod: RefundMethod;
    reason: string;
  }[];
  processInBatches?: boolean;
  batchSize?: number;
  notifyCustomers?: boolean;
  adminNotes?: string;
}

export interface ReturnListQuery {
  page?: number;
  limit?: number;
  status?: ReturnStatus[];
  reason?: ReturnReason[];
  customerId?: string;
  startDate?: string;
  endDate?: string;
  search?: string; // Search by return number, order number, customer name
  sortBy?: 'createdAt' | 'amount' | 'status' | 'estimatedPickupDate';
  sortOrder?: 'asc' | 'desc';
  state?: string; // Nigerian state filter
  priority?: 'high' | 'medium' | 'low';
}

export interface RefundListQuery {
  page?: number;
  limit?: number;
  status?: RefundStatus[];
  refundMethod?: RefundMethod[];
  customerId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: 'createdAt' | 'amount' | 'status' | 'processedAt';
  sortOrder?: 'asc' | 'desc';
  minAmount?: number;
  maxAmount?: number;
}

// Analytics and Reporting Types
export interface ReturnAnalytics {
  totalReturns: number;
  returnRate: number; // Percentage of orders returned
  totalReturnValue: number;
  averageReturnValue: number;
  returnsByStatus: {
    status: ReturnStatus;
    count: number;
    percentage: number;
  }[];
  returnsByReason: {
    reason: ReturnReason;
    count: number;
    percentage: number;
    totalValue: number;
  }[];
  returnsByProduct: {
    productId: string;
    productName: string;
    returnCount: number;
    returnRate: number;
    totalReturnValue: number;
  }[];
  returnsByState: {
    state: string;
    returnCount: number;
    returnRate: number;
    averageProcessingTime: number; // in days
  }[];
  processingTimeMetrics: {
    averageProcessingTime: number;
    medianProcessingTime: number;
    percentile95ProcessingTime: number;
  };
  customerReturnPatterns: {
    customerId: string;
    customerName: string;
    totalReturns: number;
    totalReturnValue: number;
    returnRate: number;
    averageReturnReason: ReturnReason;
  }[];
  qualityMetrics: {
    restockableRate: number;
    defectiveRate: number;
    averageConditionScore: number;
  };
  financialImpact: {
    totalRefunded: number;
    totalLoss: number; // Unrestockable items
    restockingSavings: number;
    processingCosts: number;
  };
}

export interface RefundAnalytics {
  totalRefunds: number;
  totalRefundAmount: number;
  averageRefundAmount: number;
  refundRate: number; // Percentage of orders refunded
  refundsByStatus: {
    status: RefundStatus;
    count: number;
    percentage: number;
    totalAmount: number;
  }[];
  refundsByMethod: {
    method: RefundMethod;
    count: number;
    percentage: number;
    totalAmount: number;
    averageProcessingTime: number;
  }[];
  refundsByReason: {
    reason: string;
    count: number;
    totalAmount: number;
  }[];
  processingTimeMetrics: {
    averageProcessingTime: number;
    medianProcessingTime: number;
    successRate: number;
  };
  financialMetrics: {
    totalRefunded: number;
    refundGrowthRate: number;
    refundToRevenueRatio: number;
  };
  geographicalBreakdown: {
    state: string;
    refundCount: number;
    totalAmount: number;
    averageAmount: number;
    successRate: number;
  }[];
}

// Nigerian Market Specific Types
export interface NigerianReturnPolicy {
  returnWindowDays: number;
  acceptedReasons: ReturnReason[];
  shippingCostResponsibility: 'customer' | 'merchant' | 'shared';
  requiresOriginalPackaging: boolean;
  qualityCheckRequired: boolean;
  restockingFeePercentage: number;
  fastTrackEligibleStates: string[];
  pickupServiceStates: string[];
  dropOffLocations: {
    state: string;
    city: string;
    address: string;
    businessHours: {
      weekdays: { open: string; close: string };
      saturday: { open: string; close: string };
      sunday: { open: string; close: string };
    };
    contactPhone: string;
  }[];
}

export interface NigerianBankAccount {
  id: string;
  customerId: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  isVerified: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Communication Templates
export interface ReturnNotificationTemplate {
  type: 'return_created' | 'return_approved' | 'return_rejected' | 'return_completed' | 'refund_processed';
  channels: ('email' | 'sms' | 'push')[];
  emailTemplate?: {
    subject: string;
    htmlContent: string;
    textContent: string;
  };
  smsTemplate?: {
    content: string;
  };
  variables: {
    customerName: string;
    returnNumber: string;
    orderNumber: string;
    returnStatus: string;
    refundAmount?: string;
    estimatedProcessingTime?: string;
    trackingInfo?: string;
    nextSteps?: string;
  };
}

// Response Types
export interface ReturnRequestResponse {
  success: boolean;
  message: string;
  returnRequest: ReturnRequest;
  estimatedProcessingTime?: string;
  nextSteps?: string[];
}

export interface ReturnListResponse {
  success: boolean;
  message: string;
  returns: ReturnRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary?: {
    totalReturns: number;
    pendingReturns: number;
    completedReturns: number;
    totalReturnValue: number;
  };
}

export interface RefundResponse {
  success: boolean;
  message: string;
  refund: Refund;
  estimatedCompletionTime?: string;
}

export interface RefundListResponse {
  success: boolean;
  message: string;
  refunds: Refund[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary?: {
    totalRefunds: number;
    pendingRefunds: number;
    completedRefunds: number;
    totalRefundAmount: number;
  };
}

export interface BulkRefundResponse {
  success: boolean;
  message: string;
  jobId: string;
  processedRefunds: Refund[];
  failedRefunds: {
    returnRequestId?: string;
    orderId: string;
    error: string;
  }[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    totalAmount: number;
  };
}

// Error Types
export interface ReturnError {
  code: string;
  message: string;
  details?: any;
}

export enum ReturnErrorCodes {
  RETURN_NOT_ELIGIBLE = 'RETURN_NOT_ELIGIBLE',
  RETURN_WINDOW_EXPIRED = 'RETURN_WINDOW_EXPIRED',
  INVALID_RETURN_QUANTITY = 'INVALID_RETURN_QUANTITY',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  RETURN_ALREADY_EXISTS = 'RETURN_ALREADY_EXISTS',
  INSUFFICIENT_REFUND_BALANCE = 'INSUFFICIENT_REFUND_BALANCE',
  INVALID_BANK_ACCOUNT = 'INVALID_BANK_ACCOUNT',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  INSPECTION_REQUIRED = 'INSPECTION_REQUIRED',
  QUALITY_CHECK_FAILED = 'QUALITY_CHECK_FAILED',
}