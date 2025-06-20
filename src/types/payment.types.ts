export enum PaymentProvider {
  PAYSTACK = "paystack",
  FLUTTERWAVE = "flutterwave", // Future expansion
  INTERNAL = "internal", // For manual payments
}

export enum PaymentChannel {
  CARD = "card",
  BANK = "bank",
  USSD = "ussd",
  BANK_TRANSFER = "bank_transfer",
  MOBILE_MONEY = "mobile_money",
  QR = "qr",
  WALLET = "wallet",
}

export enum PaymentStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  SUCCESS = "success",
  FAILED = "failed",
  CANCELLED = "cancelled",
  ABANDONED = "abandoned",
  EXPIRED = "expired",
}

export enum RefundStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  userId?: string;

  // Payment Details
  provider: PaymentProvider;
  channel: PaymentChannel;
  status: PaymentStatus;

  // Amounts (in kobo for Paystack)
  amount: number;
  amountPaid: number;
  fees: number;
  currency: string;

  // Provider Details
  reference: string; // Our internal reference
  providerReference: string; // Paystack reference
  providerTransactionId?: string;

  // Payment Method Details
  authorization?: PaymentAuthorization;
  gateway?: PaymentGateway;

  // Customer Info
  customer: PaymentCustomer;

  // Metadata
  metadata?: Record<string, any>;

  // Timestamps
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentAuthorization {
  authorizationCode?: string;
  bin?: string;
  last4?: string;
  cardType?: string;
  bank?: string;
  countryCode?: string;
  brand?: string;
  reusable?: boolean;
  signature?: string;
  accountName?: string;
}

export interface PaymentGateway {
  message?: string;
  gatewayResponse?: string;
  helpdesk?: string;
  referenceNumber?: string;
}

export interface PaymentCustomer {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  customerCode?: string; // Paystack customer code
}

// Paystack Webhook Types
export interface PaystackWebhookEvent {
  event: string;
  data: PaystackTransactionData;
}

export interface PaystackTransactionData {
  id: number;
  domain: string;
  status: string;
  reference: string;
  amount: number;
  message: string | null;
  gateway_response: string;
  paid_at: string | null;
  created_at: string;
  channel: string;
  currency: string;
  ip_address: string;
  metadata: Record<string, any>;
  fees: number;
  fees_split: any | null;
  authorization: PaystackAuthorization;
  customer: PaystackCustomer;
  plan: any | null;
  split: any | null;
  order_id: any | null;
  paidAt: string | null;
  createdAt: string;
  requested_amount: number;
  pos_transaction_data: any | null;
  source: any | null;
  fees_breakdown: any | null;
}

export interface PaystackAuthorization {
  authorization_code: string;
  bin: string;
  last4: string;
  exp_month: string;
  exp_year: string;
  channel: string;
  card_type: string;
  bank: string;
  country_code: string;
  brand: string;
  reusable: boolean;
  signature: string;
  account_name: string | null;
}

export interface PaystackCustomer {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  customer_code: string;
  phone: string | null;
  metadata: Record<string, any>;
  risk_action: string;
  international_format_phone: string | null;
}

// Payment Request Types
export interface InitializePaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  email: string;
  phoneNumber?: string;
  channels?: PaymentChannel[];
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export interface InitializePaymentResponse {
  success: boolean;
  message: string;
  data: {
    authorizationUrl: string;
    accessCode: string;
    reference: string;
  };
}

export interface VerifyPaymentRequest {
  reference: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  data: PaymentTransaction;
}

// Refund Types
export interface RefundRequest {
  transactionId: string;
  amount?: number; // Partial refund if less than original
  reason: string;
  metadata?: Record<string, any>;
}

export interface Refund {
  id: string;
  transactionId: string;
  orderId: string;

  // Refund Details
  status: RefundStatus;
  amount: number;
  currency: string;
  reason: string;

  // Provider Details
  providerRefundId?: string;
  providerReference?: string;

  // Processing
  processedAt?: Date;
  failureReason?: string;

  // Metadata
  metadata?: Record<string, any>;

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefundResponse {
  success: boolean;
  message: string;
  refund: Refund;
}

// Payment Analytics
export interface PaymentAnalytics {
  totalTransactions: number;
  totalVolume: number;
  successRate: number;
  averageTransactionValue: number;

  // By Status
  transactionsByStatus: {
    status: PaymentStatus;
    count: number;
    volume: number;
    percentage: number;
  }[];

  // By Channel
  transactionsByChannel: {
    channel: PaymentChannel;
    count: number;
    volume: number;
    successRate: number;
  }[];

  // By Time
  volumeByMonth: {
    month: string;
    volume: number;
    count: number;
    successRate: number;
  }[];

  // Failed Transactions
  failureReasons: {
    reason: string;
    count: number;
    percentage: number;
  }[];

  // Processing Times
  averageProcessingTime: number; // in seconds
  processingTimeDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
}

// Saved Payment Methods
export interface SavedPaymentMethod {
  id: string;
  userId: string;

  // Method Details
  type: PaymentChannel;
  provider: PaymentProvider;

  // Card Details (if applicable)
  last4?: string;
  cardType?: string;
  bank?: string;
  brand?: string;
  expiryMonth?: string;
  expiryYear?: string;

  // Authorization
  authorizationCode: string;
  reusable: boolean;

  // Metadata
  nickname?: string;
  isDefault: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
}

// Payment Links (for manual payment processing)
export interface PaymentLink {
  id: string;
  orderId: string;

  // Link Details
  url: string;
  reference: string;
  amount: number;
  currency: string;
  description: string;

  // Configuration
  expiresAt: Date;
  isActive: boolean;
  channels: PaymentChannel[];

  // Customer
  customerEmail?: string;
  customerPhone?: string;

  // Usage
  clickCount: number;
  lastClickedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Nigerian Bank Codes (for bank transfers)
export interface NigeriaBankCode {
  name: string;
  code: string;
  ussdTemplate?: string;
  longCode?: string;
  gateway?: string;
  payWithBank: boolean;
  active: boolean;
  country: string;
  currency: string;
  type: "nuban" | "mobile_money";
}
