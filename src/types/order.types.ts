export enum OrderStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  PROCESSING = "processing",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
}

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  REFUNDED = "refunded",
  PARTIAL_REFUND = "partial_refund",
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
  orderId: string;
  productId: string;
  productName: string;
  productSku: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;

  // Pricing
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;

  // Payment
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  paidAt?: Date;

  // Addresses (JSON fields)
  shippingAddress: OrderAddress;
  billingAddress: OrderAddress;

  // Notes
  customerNotes?: string;
  adminNotes?: string;

  // Tracking
  trackingNumber?: string;
  estimatedDelivery?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;

  // Relations
  items: OrderItem[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Request/Response Types
export interface CreateOrderRequest {
  shippingAddress: OrderAddress;
  billingAddress?: OrderAddress; // Optional, defaults to shipping
  paymentMethod: PaymentMethod;
  customerNotes?: string;
  couponCode?: string;
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
  totalAmount: number;
  currency: string;
  itemCount: number;
  customerName: string;
  createdAt: Date;
  estimatedDelivery?: Date;
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
  orderId: string;
  status: OrderStatus;
  description: string;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
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
