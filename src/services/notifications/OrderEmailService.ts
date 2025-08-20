import { BaseService } from "../BaseService";
import { EmailHelper } from "../../utils/email/emailHelper";
import { logger } from "../../utils/logger/winston";

export interface OrderData {
  orderNumber: string;
  status: string;
  estimatedDelivery: string;
  trackingNumber: string;
  message: string;
  total?: number;
  subtotal?: number;
  tax?: number;
  shipping?: number;
  currency?: string;
  createdAt?: string;
  orderDate?: string;
  paymentStatus?: string;
  items?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    sku?: string;
  }>;
  shippingAddress?: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode?: string;
  };
  billingAddress?: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode?: string;
  };
  guestInfo?: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  paymentMethod?: string;
  paymentReference?: string;
}

export class OrderEmailService extends BaseService {
  
  /**
   * Send order confirmation email after successful payment
   */
  async sendOrderConfirmationEmail(orderData: OrderData): Promise<boolean> {
    try {
      const customerEmail = orderData.guestInfo?.email || orderData.shippingAddress?.email;
      const customerName = orderData.guestInfo?.firstName || orderData.shippingAddress?.firstName || 'Valued Customer';
      
      if (!customerEmail) {
        logger.error('No customer email found for order confirmation', { orderNumber: orderData.orderNumber });
        return false;
      }

      logger.info(`📧 Sending order confirmation email for order ${orderData.orderNumber} to ${customerEmail}`);

      const emailData = {
        customerName,
        customerEmail,
        orderNumber: orderData.orderNumber,
        trackingNumber: orderData.trackingNumber,
        status: orderData.status,
        estimatedDelivery: orderData.estimatedDelivery ? new Date(orderData.estimatedDelivery).toLocaleDateString('en-NG', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : 'TBD',
        orderDate: orderData.createdAt ? new Date(orderData.createdAt).toLocaleDateString('en-NG') : new Date().toLocaleDateString('en-NG'),
        total: orderData.total || 0,
        subtotal: orderData.subtotal,
        tax: orderData.tax,
        shipping: orderData.shipping,
        items: orderData.items || [],
        shippingAddress: orderData.shippingAddress,
        billingAddress: orderData.billingAddress,
        paymentMethod: orderData.paymentMethod,
        paymentReference: orderData.paymentReference,
        trackingUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/track?orderNumber=${orderData.orderNumber}&email=${customerEmail}`,
        supportEmail: 'support@bareloft.com'
      };

      const success = await EmailHelper.sendTemplateEmail({
        to: customerEmail,
        template: 'order-confirmation',
        subject: `Order Confirmed! #${orderData.orderNumber} - Bareloft`,
        data: emailData
      });

      if (success) {
        logger.info(`✅ Order confirmation email sent successfully for order ${orderData.orderNumber}`);
      } else {
        logger.error(`❌ Failed to send order confirmation email for order ${orderData.orderNumber}`);
      }

      return success;
    } catch (error) {
      this.handleError('Error sending order confirmation email', error);
      return false;
    }
  }

  /**
   * Send order status update email when status changes
   */
  async sendOrderStatusUpdateEmail(orderData: OrderData, previousStatus?: string): Promise<boolean> {
    try {
      const customerEmail = orderData.guestInfo?.email || orderData.shippingAddress?.email;
      const customerName = orderData.guestInfo?.firstName || orderData.shippingAddress?.firstName || 'Valued Customer';
      
      if (!customerEmail) {
        logger.error('No customer email found for status update', { orderNumber: orderData.orderNumber });
        return false;
      }

      logger.info(`📧 Sending status update email for order ${orderData.orderNumber} to ${customerEmail}. Status: ${previousStatus} → ${orderData.status}`);

      const statusMessages = {
        'PROCESSING': {
          title: 'Order Being Processed',
          message: 'Your order is being prepared for shipment',
          icon: '⏳',
          class: 'processing'
        },
        'SHIPPED': {
          title: 'Order Shipped',
          message: 'Your order has been shipped and is on its way',
          icon: '🚚',
          class: 'shipped'
        },
        'DELIVERED': {
          title: 'Order Delivered',
          message: 'Your order has been successfully delivered',
          icon: '✅',
          class: 'delivered'
        },
        'CANCELLED': {
          title: 'Order Cancelled',
          message: 'Your order has been cancelled',
          icon: '❌',
          class: 'cancelled'
        }
      };

      const statusInfo = statusMessages[orderData.status as keyof typeof statusMessages] || {
        title: 'Order Updated',
        message: orderData.message || 'Your order status has been updated',
        icon: '📦',
        class: 'processing'
      };

      const emailData = {
        customerName,
        customerEmail,
        orderNumber: orderData.orderNumber,
        trackingNumber: orderData.trackingNumber,
        status: orderData.status,
        statusTitle: statusInfo.title,
        statusMessage: statusInfo.message,
        statusIcon: statusInfo.icon,
        statusClass: statusInfo.class,
        estimatedDelivery: orderData.estimatedDelivery ? new Date(orderData.estimatedDelivery).toLocaleDateString('en-NG', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : null,
        orderDate: orderData.createdAt ? new Date(orderData.createdAt).toLocaleDateString('en-NG') : null,
        lastUpdated: new Date().toLocaleString('en-NG'),
        trackingUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/track?orderNumber=${orderData.orderNumber}&email=${customerEmail}`,
        supportEmail: 'support@bareloft.com'
      };

      const success = await EmailHelper.sendTemplateEmail({
        to: customerEmail,
        template: 'order-status-update',
        subject: `Order Update: ${statusInfo.title} - ${orderData.orderNumber}`,
        data: emailData
      });

      if (success) {
        logger.info(`✅ Order status update email sent successfully for order ${orderData.orderNumber}`);
      } else {
        logger.error(`❌ Failed to send order status update email for order ${orderData.orderNumber}`);
      }

      return success;
    } catch (error) {
      this.handleError('Error sending order status update email', error);
      return false;
    }
  }

  /**
   * Send order tracking information email when user requests tracking
   */
  async sendOrderTrackingEmail(orderData: OrderData, requestedEmail: string): Promise<boolean> {
    try {
      const customerName = orderData.guestInfo?.firstName || orderData.shippingAddress?.firstName || 'Valued Customer';
      
      logger.info(`📧 Sending order tracking email for order ${orderData.orderNumber} to ${requestedEmail}`);

      const emailData = {
        customerName,
        customerEmail: requestedEmail,
        orderNumber: orderData.orderNumber,
        trackingNumber: orderData.trackingNumber,
        status: orderData.status,
        statusMessage: orderData.message || 'Your order is being processed',
        estimatedDelivery: orderData.estimatedDelivery || 'TBD',
        orderDate: orderData.orderDate || 'N/A',
        requestTime: new Date().toLocaleString('en-NG'),
        trackingUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/track?orderNumber=${orderData.orderNumber}&email=${requestedEmail}`,
        supportEmail: 'support@bareloft.com',
        // Add order details
        total: orderData.total,
        subtotal: orderData.subtotal,
        tax: orderData.tax,
        shipping: orderData.shipping,
        currency: orderData.currency,
        items: orderData.items || [],
        shippingAddress: orderData.shippingAddress,
        paymentMethod: orderData.paymentMethod,
        paymentReference: orderData.paymentReference,
        paymentStatus: orderData.paymentStatus || 'PENDING'
      };

      const success = await EmailHelper.sendTemplateEmail({
        to: requestedEmail,
        template: 'order-tracking-info',
        subject: `Order Tracking Information - ${orderData.orderNumber}`,
        data: emailData
      });

      if (success) {
        logger.info(`✅ Order tracking email sent successfully for order ${orderData.orderNumber} to ${requestedEmail}`);
      } else {
        logger.error(`❌ Failed to send order tracking email for order ${orderData.orderNumber} to ${requestedEmail}`);
      }

      return success;
    } catch (error) {
      this.handleError('Error sending order tracking email', error);
      return false;
    }
  }

  /**
   * Send bulk order update emails
   */
  async sendBulkOrderUpdateEmails(orders: OrderData[]): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    logger.info(`📧 Starting bulk order update emails for ${orders.length} orders`);

    for (const order of orders) {
      try {
        const success = await this.sendOrderStatusUpdateEmail(order);
        if (success) {
          sent++;
        } else {
          failed++;
        }
        
        // Add small delay between emails to avoid overwhelming the email service
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        failed++;
        logger.error(`Failed to send bulk update email for order ${order.orderNumber}:`, error);
      }
    }

    logger.info(`📧 Bulk order update completed: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  }
}

export default OrderEmailService;