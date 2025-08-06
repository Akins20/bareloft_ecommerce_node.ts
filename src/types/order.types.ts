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
