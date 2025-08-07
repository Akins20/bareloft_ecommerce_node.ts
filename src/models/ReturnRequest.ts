// Return Request Model for Nigerian E-commerce Platform

export interface ReturnRequest {
  id: string;
  returnNumber: string;
  orderId: string;
  customerId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_TRANSIT' | 'RECEIVED' | 'INSPECTED' | 'COMPLETED' | 'CANCELLED';
  reason: 'DEFECTIVE' | 'WRONG_ITEM' | 'WRONG_SIZE' | 'DAMAGED_SHIPPING' | 'NOT_AS_DESCRIBED' | 'CHANGED_MIND' | 'DUPLICATE_ORDER' | 'QUALITY_ISSUES' | 'LATE_DELIVERY' | 'OTHER';
  description?: string;
  totalAmount: number;
  currency: string;
  isEligible: boolean;
  eligibilityReason?: string;
  returnShippingMethod?: 'CUSTOMER_DROP_OFF' | 'PICKUP_SERVICE' | 'COURIER_SERVICE' | 'POSTAL_SERVICE';
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
  items?: ReturnItem[];
  refunds?: any[];
  timeline?: any[];
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
  condition?: 'SELLABLE' | 'MINOR_DAMAGE' | 'MAJOR_DAMAGE' | 'DEFECTIVE' | 'UNSELLABLE';
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
  status: 'PENDING' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'PARTIALLY_REFUNDED';
  refundMethod: 'ORIGINAL_PAYMENT' | 'BANK_TRANSFER' | 'WALLET_CREDIT' | 'STORE_CREDIT' | 'CASH';
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

// Nigerian Banking Codes for validation
export const NIGERIAN_BANK_CODES = {
  '044': 'Access Bank',
  '014': 'Afribank Nigeria Plc',
  '023': 'Citibank Nigeria Limited',
  '063': 'Diamond Bank Plc',
  '050': 'Ecobank Nigeria Plc',
  '084': 'Enterprise Bank Limited',
  '011': 'First Bank of Nigeria Limited',
  '214': 'First City Monument Bank Plc',
  '070': 'Fidelity Bank Plc',
  '058': 'Guaranty Trust Bank Plc',
  '030': 'Heritage Banking Company Ltd',
  '082': 'Keystone Bank Limited',
  '076': 'Polaris Bank',
  '221': 'Stanbic IBTC Bank Plc',
  '068': 'Standard Chartered Bank Nigeria Limited',
  '232': 'Sterling Bank Plc',
  '032': 'Union Bank of Nigeria Plc',
  '033': 'United Bank for Africa Plc',
  '215': 'Unity Bank Plc',
  '035': 'Wema Bank Plc',
  '057': 'Zenith Bank Plc',
  '101': 'ProvidusBank Limited',
  '100': 'SunTrust Bank Nigeria Limited',
  '302': 'TAJ Bank Limited',
  '090267': 'Kuda Microfinance Bank',
  '090365': 'Sparkle Microfinance Bank',
  '090175': 'Rubies MFB',
};

// Nigerian States for return processing
export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT-Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

// Return processing timeframes by region
export const RETURN_PROCESSING_TIMEFRAMES = {
  'Lagos': { pickup: '1-2 days', processing: '2-3 days', refund: '3-5 days' },
  'FCT-Abuja': { pickup: '1-2 days', processing: '2-3 days', refund: '3-5 days' },
  'Rivers': { pickup: '2-3 days', processing: '3-4 days', refund: '5-7 days' },
  'Kano': { pickup: '2-3 days', processing: '3-4 days', refund: '5-7 days' },
  'Oyo': { pickup: '2-3 days', processing: '3-4 days', refund: '5-7 days' },
  'default': { pickup: '3-5 days', processing: '4-6 days', refund: '7-10 days' },
};