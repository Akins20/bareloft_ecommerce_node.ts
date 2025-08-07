/**
 * Return Eligibility Calculator
 * Determines if orders/items are eligible for returns
 * Nigerian e-commerce platform business rules
 */

import { ReturnReason } from '../../types/return.types';
import { logger } from '../logger/winston';

interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  status: string;
  total: number;
  createdAt: Date;
  deliveredAt?: Date;
  items: OrderItem[];
  shippingAddress: any;
}

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSku?: string;
  category: string;
  quantity: number;
  price: number;
  total: number;
}

interface EligibilityOptions {
  quantityRequested: number;
  currentDate: Date;
  returnReason?: ReturnReason;
}

interface EligibilityResult {
  isEligible: boolean;
  reason?: string;
  maxQuantityReturnable: number;
  returnWindow?: {
    expiresAt: Date;
    daysRemaining: number;
  };
  conditions?: string[];
  warnings?: string[];
}

/**
 * Business rules for return eligibility in Nigerian market
 */
const RETURN_RULES = {
  // General rules
  DEFAULT_RETURN_WINDOW_DAYS: 14,
  EXTENDED_RETURN_CATEGORIES: {
    'Electronics': 30,
    'Appliances': 30,
    'Computers': 30,
    'Phones': 30
  },
  
  // Non-returnable categories
  NON_RETURNABLE_CATEGORIES: [
    'Personal Care & Hygiene',
    'Food & Beverages',
    'Digital Products',
    'Customized Items',
    'Intimate Apparel',
    'Health & Medicine'
  ],

  // Special handling categories
  INSPECTION_REQUIRED_CATEGORIES: [
    'Electronics',
    'Appliances',
    'Jewelry',
    'Watches',
    'Luxury Items'
  ],

  // Order status requirements
  ELIGIBLE_ORDER_STATUSES: [
    'DELIVERED',
    'COMPLETED'
  ],

  // Minimum order age (must be delivered at least 24 hours ago)
  MIN_ORDER_AGE_HOURS: 24,

  // Maximum return percentage of original order
  MAX_RETURN_PERCENTAGE: 100,

  // Special Nigerian market rules
  NIGERIAN_RULES: {
    // Extended return window during holiday seasons
    HOLIDAY_EXTENSION_DAYS: 7,
    HOLIDAY_MONTHS: [11, 0], // December, January

    // Defective items have longer window (Nigerian consumer protection)
    DEFECTIVE_RETURN_WINDOW_DAYS: 30,

    // Free return shipping thresholds
    FREE_RETURN_THRESHOLD_NGN: 50000,

    // States with express processing
    EXPRESS_PROCESSING_STATES: ['Lagos', 'FCT', 'Rivers', 'Kano']
  }
};

/**
 * Calculate return eligibility for an order item
 */
export async function calculateReturnEligibility(
  order: Order,
  orderItem: OrderItem,
  options: EligibilityOptions
): Promise<EligibilityResult> {
  try {
    const { quantityRequested, currentDate, returnReason } = options;

    // Check basic order eligibility
    const orderEligibility = checkOrderEligibility(order, currentDate);
    if (!orderEligibility.isEligible) {
      return {
        isEligible: false,
        reason: orderEligibility.reason,
        maxQuantityReturnable: 0
      };
    }

    // Check item-specific eligibility
    const itemEligibility = checkItemEligibility(orderItem, quantityRequested, returnReason);
    if (!itemEligibility.isEligible) {
      return {
        isEligible: false,
        reason: itemEligibility.reason,
        maxQuantityReturnable: itemEligibility.maxQuantity || 0
      };
    }

    // Calculate return window
    const returnWindow = calculateReturnWindow(order, orderItem, currentDate, returnReason);
    if (returnWindow.expired) {
      return {
        isEligible: false,
        reason: `Return window has expired. Returns must be requested within ${returnWindow.windowDays} days of delivery.`,
        maxQuantityReturnable: orderItem.quantity,
        returnWindow: {
          expiresAt: returnWindow.expiresAt,
          daysRemaining: 0
        }
      };
    }

    // Generate conditions and warnings
    const conditions = generateReturnConditions(orderItem, returnReason);
    const warnings = generateReturnWarnings(order, orderItem, returnReason);

    return {
      isEligible: true,
      maxQuantityReturnable: orderItem.quantity,
      returnWindow: {
        expiresAt: returnWindow.expiresAt,
        daysRemaining: returnWindow.daysRemaining
      },
      conditions,
      warnings
    };

  } catch (error) {
    logger.error('Error calculating return eligibility', {
      error: error instanceof Error ? error.message : 'Unknown error',
      orderId: order.id,
      orderItemId: orderItem.id
    });

    return {
      isEligible: false,
      reason: 'Unable to determine eligibility. Please contact customer service.',
      maxQuantityReturnable: 0
    };
  }
}

/**
 * Check if the order itself is eligible for returns
 */
function checkOrderEligibility(order: Order, currentDate: Date): {
  isEligible: boolean;
  reason?: string;
} {
  // Check order status
  if (!RETURN_RULES.ELIGIBLE_ORDER_STATUSES.includes(order.status)) {
    return {
      isEligible: false,
      reason: `Orders with status '${order.status}' are not eligible for returns. Order must be delivered.`
    };
  }

  // Check if order has been delivered
  if (!order.deliveredAt) {
    return {
      isEligible: false,
      reason: 'Order must be delivered before returns can be requested.'
    };
  }

  // Check minimum order age (prevent immediate returns)
  const orderAgeHours = (currentDate.getTime() - order.deliveredAt.getTime()) / (1000 * 60 * 60);
  if (orderAgeHours < RETURN_RULES.MIN_ORDER_AGE_HOURS) {
    return {
      isEligible: false,
      reason: 'Returns can only be requested 24 hours after delivery.'
    };
  }

  return { isEligible: true };
}

/**
 * Check if the specific item is eligible for returns
 */
function checkItemEligibility(
  orderItem: OrderItem,
  quantityRequested: number,
  returnReason?: ReturnReason
): {
  isEligible: boolean;
  reason?: string;
  maxQuantity?: number;
} {
  // Check if category is returnable
  if (RETURN_RULES.NON_RETURNABLE_CATEGORIES.includes(orderItem.category)) {
    return {
      isEligible: false,
      reason: `${orderItem.category} items are not eligible for returns due to health and safety regulations.`
    };
  }

  // Check quantity limits
  if (quantityRequested > orderItem.quantity) {
    return {
      isEligible: false,
      reason: `Cannot return ${quantityRequested} items. Only ${orderItem.quantity} were ordered.`,
      maxQuantity: orderItem.quantity
    };
  }

  if (quantityRequested <= 0) {
    return {
      isEligible: false,
      reason: 'Return quantity must be greater than 0.',
      maxQuantity: orderItem.quantity
    };
  }

  return { isEligible: true };
}

/**
 * Calculate return window for item
 */
function calculateReturnWindow(
  order: Order,
  orderItem: OrderItem,
  currentDate: Date,
  returnReason?: ReturnReason
): {
  expiresAt: Date;
  windowDays: number;
  daysRemaining: number;
  expired: boolean;
} {
  const deliveryDate = order.deliveredAt || order.createdAt;
  
  // Determine return window days
  let windowDays = RETURN_RULES.DEFAULT_RETURN_WINDOW_DAYS;

  // Extended window for certain categories
  if (RETURN_RULES.EXTENDED_RETURN_CATEGORIES[orderItem.category]) {
    windowDays = RETURN_RULES.EXTENDED_RETURN_CATEGORIES[orderItem.category];
  }

  // Special rules for defective items (Nigerian consumer protection)
  if (returnReason && [ReturnReason.DEFECTIVE, ReturnReason.DAMAGED_SHIPPING, ReturnReason.NOT_AS_DESCRIBED].includes(returnReason)) {
    windowDays = Math.max(windowDays, RETURN_RULES.NIGERIAN_RULES.DEFECTIVE_RETURN_WINDOW_DAYS);
  }

  // Holiday extension
  const deliveryMonth = deliveryDate.getMonth();
  if (RETURN_RULES.NIGERIAN_RULES.HOLIDAY_MONTHS.includes(deliveryMonth)) {
    windowDays += RETURN_RULES.NIGERIAN_RULES.HOLIDAY_EXTENSION_DAYS;
  }

  // Calculate expiration date
  const expiresAt = new Date(deliveryDate);
  expiresAt.setDate(expiresAt.getDate() + windowDays);

  const daysRemaining = Math.ceil((expiresAt.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
  const expired = daysRemaining <= 0;

  return {
    expiresAt,
    windowDays,
    daysRemaining: Math.max(0, daysRemaining),
    expired
  };
}

/**
 * Generate return conditions based on item and reason
 */
function generateReturnConditions(
  orderItem: OrderItem,
  returnReason?: ReturnReason
): string[] {
  const conditions: string[] = [
    'Item must be in original condition',
    'All tags and labels must be attached',
    'Original packaging required when possible'
  ];

  // Category-specific conditions
  if (RETURN_RULES.INSPECTION_REQUIRED_CATEGORIES.includes(orderItem.category)) {
    conditions.push('Item will undergo detailed quality inspection');
    conditions.push('All accessories and components must be included');
  }

  if (orderItem.category === 'Clothing' || orderItem.category === 'Fashion') {
    conditions.push('Item must be unworn and unwashed');
    conditions.push('All original tags must be attached');
  }

  if (orderItem.category === 'Electronics') {
    conditions.push('All original accessories and cables must be included');
    conditions.push('Device must power on and function normally');
    conditions.push('No physical damage or modifications');
  }

  // Reason-specific conditions
  if (returnReason === ReturnReason.DEFECTIVE) {
    conditions.push('Please provide photos of the defect');
    conditions.push('Describe the issue in detail');
  }

  if (returnReason === ReturnReason.WRONG_SIZE) {
    conditions.push('Size tags must be intact');
    conditions.push('Item must be completely unused');
  }

  return conditions;
}

/**
 * Generate warnings and important notes
 */
function generateReturnWarnings(
  order: Order,
  orderItem: OrderItem,
  returnReason?: ReturnReason
): string[] {
  const warnings: string[] = [];

  // Shipping cost warnings
  if (order.total < RETURN_RULES.NIGERIAN_RULES.FREE_RETURN_THRESHOLD_NGN) {
    if (!returnReason || ![ReturnReason.DEFECTIVE, ReturnReason.WRONG_ITEM, ReturnReason.DAMAGED_SHIPPING].includes(returnReason)) {
      warnings.push('Return shipping costs will be deducted from your refund');
    }
  }

  // Processing time warnings
  if (RETURN_RULES.INSPECTION_REQUIRED_CATEGORIES.includes(orderItem.category)) {
    warnings.push('This item requires detailed inspection, which may extend processing time by 1-2 days');
  }

  // State-specific warnings
  const customerState = order.shippingAddress?.state;
  if (customerState && !RETURN_RULES.NIGERIAN_RULES.EXPRESS_PROCESSING_STATES.includes(customerState)) {
    warnings.push('Processing may take longer for your location. Consider using a drop-off center for faster service.');
  }

  // Value warnings
  if (orderItem.price > 100000) { // ₦100,000+
    warnings.push('High-value items undergo additional verification steps');
    warnings.push('Consider insured return shipping for valuable items');
  }

  // Reason-specific warnings
  if (returnReason === ReturnReason.CHANGED_MIND) {
    warnings.push('Change of mind returns may take longer to process');
    warnings.push('Consider store credit for faster refund processing');
  }

  return warnings;
}

/**
 * Check if return window is within holiday extension period
 */
export function isHolidayPeriod(date: Date): boolean {
  const month = date.getMonth();
  return RETURN_RULES.NIGERIAN_RULES.HOLIDAY_MONTHS.includes(month);
}

/**
 * Get return window days for a category
 */
export function getReturnWindowDays(category: string, isDefective: boolean = false): number {
  let days = RETURN_RULES.EXTENDED_RETURN_CATEGORIES[category] || RETURN_RULES.DEFAULT_RETURN_WINDOW_DAYS;
  
  if (isDefective) {
    days = Math.max(days, RETURN_RULES.NIGERIAN_RULES.DEFECTIVE_RETURN_WINDOW_DAYS);
  }
  
  return days;
}

/**
 * Check if a category is returnable
 */
export function isCategoryReturnable(category: string): boolean {
  return !RETURN_RULES.NON_RETURNABLE_CATEGORIES.includes(category);
}

/**
 * Get free return shipping threshold
 */
export function getFreeReturnThreshold(): number {
  return RETURN_RULES.NIGERIAN_RULES.FREE_RETURN_THRESHOLD_NGN;
}