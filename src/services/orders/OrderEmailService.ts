/**
 * Order Email Service
 * Handles email notifications for order-related events
 */

import { BaseService } from '../BaseService';

export class OrderEmailService extends BaseService {
  constructor() {
    super();
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(order: any, user: any): Promise<void> {
    // Implementation will use actual email service
    console.log(`Sending order confirmation email for order ${order.orderNumber} to ${user.email}`);
  }

  /**
   * Send order confirmation email (alias for compatibility)
   */
  async sendOrderConfirmationEmail(order: any, user: any): Promise<void> {
    return this.sendOrderConfirmation(order, user);
  }

  /**
   * Send order shipped email
   */
  async sendOrderShipped(order: any, trackingInfo: any): Promise<void> {
    console.log(`Sending order shipped email for order ${order.orderNumber}`);
  }

  /**
   * Send order delivered email
   */
  async sendOrderDelivered(order: any): Promise<void> {
    console.log(`Sending order delivered email for order ${order.orderNumber}`);
  }

  /**
   * Send order cancelled email
   */
  async sendOrderCancelled(order: any, reason?: string): Promise<void> {
    console.log(`Sending order cancelled email for order ${order.orderNumber}`);
  }

  /**
   * Send guest order confirmation
   */
  async sendGuestOrderConfirmation(order: any, email: string): Promise<void> {
    console.log(`Sending guest order confirmation to ${email}`);
  }

  /**
   * Send order status update email
   */
  async sendOrderStatusUpdateEmail(order: any, user: any, status: string): Promise<void> {
    console.log(`Sending order status update email for order ${order.orderNumber} - status: ${status}`);
  }

  /**
   * Send order tracking email
   */
  async sendOrderTrackingEmail(order: any, trackingInfo: any): Promise<void> {
    console.log(`Sending order tracking email for order ${order.orderNumber}`);
  }
}

// Export OrderData type for compatibility
export interface OrderData {
  orderNumber: string;
  status: string;
  totalAmount: number;
  shippingAddress?: any;
  billingAddress?: any;
  items: any[];
  createdAt: Date | string;
  updatedAt: Date | string;
  estimatedDelivery?: Date | string;
  guestInfo?: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  [key: string]: any; // Allow additional properties
}