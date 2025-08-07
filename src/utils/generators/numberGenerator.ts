/**
 * Number Generator Utilities
 * Generates unique numbers for orders, returns, tracking, etc.
 * Nigerian e-commerce platform optimized
 */

import { logger } from '../logger/winston';

/**
 * Generate unique return number
 * Format: RT-YYYYMM-XXXXXX (RT-202412-123456)
 */
export async function generateReturnNumber(): Promise<string> {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6); // Last 6 digits
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `RT-${year}${month}-${timestamp}${randomSuffix}`;
  } catch (error) {
    logger.error('Error generating return number', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Fallback generation
    const fallback = `RT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    return fallback;
  }
}

/**
 * Generate tracking number
 * Format: BL[TYPE]-YYYYMMDDHHMM-XXX
 */
export async function generateTrackingNumber(type: 'ORDER' | 'RETURN' | 'SHIPMENT' = 'ORDER'): Promise<string> {
  try {
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
                   (now.getMonth() + 1).toString().padStart(2, '0') +
                   now.getDate().toString().padStart(2, '0') +
                   now.getHours().toString().padStart(2, '0') +
                   now.getMinutes().toString().padStart(2, '0');
    
    const typePrefix = {
      'ORDER': 'ORD',
      'RETURN': 'RTN',
      'SHIPMENT': 'SHP'
    }[type];
    
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `BL${typePrefix}-${dateStr}-${randomSuffix}`;
  } catch (error) {
    logger.error('Error generating tracking number', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type
    });
    
    // Fallback generation
    const fallback = `BL${type.substring(0, 3)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    return fallback;
  }
}

/**
 * Generate order number
 * Format: BL-YYYYMM-XXXXXX
 */
export async function generateOrderNumber(): Promise<string> {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    
    // Use timestamp for uniqueness
    const timestamp = now.getTime().toString().slice(-6);
    const randomSuffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    
    return `BL-${year}${month}${day}-${timestamp}${randomSuffix}`;
  } catch (error) {
    logger.error('Error generating order number', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Fallback generation
    const fallback = `BL-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    return fallback;
  }
}

/**
 * Generate invoice number
 * Format: INV-YYYY-XXXXXXXXX
 */
export async function generateInvoiceNumber(): Promise<string> {
  try {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-9); // Last 9 digits for uniqueness
    
    return `INV-${year}-${timestamp}`;
  } catch (error) {
    logger.error('Error generating invoice number', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Fallback generation
    return `INV-${new Date().getFullYear()}-${Date.now()}`;
  }
}

/**
 * Generate refund reference
 * Format: REF-YYYYMMDD-XXXXXX
 */
export async function generateRefundReference(): Promise<string> {
  try {
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
                   (now.getMonth() + 1).toString().padStart(2, '0') +
                   now.getDate().toString().padStart(2, '0');
    
    const timestamp = now.getTime().toString().slice(-6);
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `REF-${dateStr}-${timestamp}${randomSuffix}`;
  } catch (error) {
    logger.error('Error generating refund reference', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Fallback generation
    return `REF-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
}

/**
 * Generate coupon code
 * Format: Customizable length and pattern
 */
export function generateCouponCode(
  length: number = 8,
  pattern: 'ALPHANUMERIC' | 'ALPHABETIC' | 'NUMERIC' = 'ALPHANUMERIC'
): string {
  try {
    const chars = {
      ALPHANUMERIC: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      ALPHABETIC: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      NUMERIC: '0123456789'
    };
    
    const charset = chars[pattern];
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return result;
  } catch (error) {
    logger.error('Error generating coupon code', {
      error: error instanceof Error ? error.message : 'Unknown error',
      length,
      pattern
    });
    
    // Fallback generation
    return Math.random().toString(36).substring(2, 2 + length).toUpperCase();
  }
}

/**
 * Generate OTP (One Time Password)
 * Nigerian market standard 6-digit OTP
 */
export function generateOTP(length: number = 6): string {
  try {
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += Math.floor(Math.random() * 10).toString();
    }
    return otp;
  } catch (error) {
    logger.error('Error generating OTP', {
      error: error instanceof Error ? error.message : 'Unknown error',
      length
    });
    
    // Fallback generation
    return Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
  }
}

/**
 * Generate verification code for various purposes
 * Format: Prefix + timestamp + random
 */
export function generateVerificationCode(prefix: string = 'VER'): string {
  try {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  } catch (error) {
    logger.error('Error generating verification code', {
      error: error instanceof Error ? error.message : 'Unknown error',
      prefix
    });
    
    // Fallback generation
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
}

/**
 * Generate transaction reference for payments
 * Nigerian payment gateway compatible format
 */
export async function generateTransactionReference(prefix: string = 'TXN'): Promise<string> {
  try {
    const now = new Date();
    const dateStr = now.getFullYear().toString().substring(2) + // YY
                   (now.getMonth() + 1).toString().padStart(2, '0') + // MM
                   now.getDate().toString().padStart(2, '0'); // DD
    
    const timeStr = now.getHours().toString().padStart(2, '0') +
                   now.getMinutes().toString().padStart(2, '0') +
                   now.getSeconds().toString().padStart(2, '0');
    
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    return `${prefix}_${dateStr}${timeStr}${randomSuffix}`;
  } catch (error) {
    logger.error('Error generating transaction reference', {
      error: error instanceof Error ? error.message : 'Unknown error',
      prefix
    });
    
    // Fallback generation
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }
}

/**
 * Generate batch ID for bulk operations
 */
export function generateBatchId(operation: string): string {
  try {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${operation.toUpperCase()}_BATCH_${timestamp}_${random}`;
  } catch (error) {
    logger.error('Error generating batch ID', {
      error: error instanceof Error ? error.message : 'Unknown error',
      operation
    });
    
    // Fallback generation
    return `${operation.toUpperCase()}_BATCH_${Date.now()}`;
  }
}

/**
 * Validate generated number format
 */
export function validateNumberFormat(
  number: string,
  type: 'ORDER' | 'RETURN' | 'INVOICE' | 'TRACKING' | 'REFUND'
): boolean {
  try {
    const patterns = {
      ORDER: /^BL-\d{8}-\d{8}$/,
      RETURN: /^RT-\d{6}-\d{9}$/,
      INVOICE: /^INV-\d{4}-\d{9}$/,
      TRACKING: /^BL(ORD|RTN|SHP)-\d{12}-\d{3}$/,
      REFUND: /^REF-\d{8}-\d{9}$/
    };
    
    const pattern = patterns[type];
    return pattern ? pattern.test(number) : false;
  } catch (error) {
    logger.error('Error validating number format', {
      error: error instanceof Error ? error.message : 'Unknown error',
      number: number?.substring(0, 10) + '...', // Log partial for security
      type
    });
    return false;
  }
}

/**
 * Generate unique identifier for general use
 */
export function generateUniqueId(prefix?: string): string {
  try {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    const id = `${timestamp}${random}`;
    
    return prefix ? `${prefix}_${id}` : id;
  } catch (error) {
    logger.error('Error generating unique ID', {
      error: error instanceof Error ? error.message : 'Unknown error',
      prefix
    });
    
    // Fallback generation
    const fallback = Date.now().toString() + Math.random().toString().substring(2);
    return prefix ? `${prefix}_${fallback}` : fallback;
  }
}