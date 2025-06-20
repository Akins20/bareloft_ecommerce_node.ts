import { BaseService } from "../BaseService";
import {
  OrderModel,
  OrderTimelineEventModel,
  InventoryModel,
} from "../../models";
import {
  Order,
  OrderStatus,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
} from "../../types";
import { ReservationService } from "../inventory/ReservationService";
import { StockService } from "../inventory/StockService";
import { NotificationService } from "../notifications/NotificationService";

interface FulfillmentUpdate {
  orderId: string;
  status: OrderStatus;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  notes?: string;
  updatedBy: string;
}

interface ShippingLabel {
  orderId: string;
  trackingNumber: string;
  shippingMethod: string;
  recipientName: string;
  recipientAddress: string;
  recipientPhone: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

export class FulfillmentService extends BaseService {
  private reservationService: ReservationService;
  private stockService: StockService;
  private notificationService: NotificationService;

  constructor(
    reservationService: ReservationService,
    stockService: StockService,
    notificationService: NotificationService
  ) {
    super();
    this.reservationService = reservationService;
    this.stockService = stockService;
    this.notificationService = notificationService;
  }

  /**
   * Confirm order and convert reservations to actual stock reduction
   */
  async confirmOrder(orderId: string, confirmedBy: string): Promise<Order> {
    try {
      const order = await OrderModel.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          user: true,
        },
      });

      if (!order) {
        throw new AppError(
          "Order not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      if (order.status !== "PENDING") {
        throw new AppError(
          "Order cannot be confirmed",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Convert reservations to sales
      await this.reservationService.convertReservationToSale(
        orderId,
        confirmedBy
      );

      // Update order status
      await OrderModel.update({
        where: { id: orderId },
        data: {
          status: "CONFIRMED",
          updatedAt: new Date(),
        },
      });

      // Create timeline event
      await this.createTimelineEvent(
        orderId,
        "CONFIRMED",
        "Order confirmed and inventory allocated",
        confirmedBy
      );

      // Send confirmation notification
      await this.notificationService.sendNotification({
        type: "ORDER_CONFIRMATION",
        channel: "EMAIL",
        userId: order.userId,
        recipient: {
          email: order.user.email,
          name: `${order.user.firstName} ${order.user.lastName}`,
        },
        variables: {
          orderNumber: order.orderNumber,
          customerName: order.user.firstName,
          totalAmount: order.totalAmount,
          estimatedDelivery: this.calculateEstimatedDelivery(
            order.shippingAddress.state
          ),
        },
      });

      return this.getUpdatedOrder(orderId);
    } catch (error) {
      this.handleError("Error confirming order", error);
      throw error;
    }
  }

  /**
   * Start processing order
   */
  async startProcessing(orderId: string, processedBy: string): Promise<Order> {
    try {
      const order = await this.validateOrderStatus(orderId, ["CONFIRMED"]);

      await OrderModel.update({
        where: { id: orderId },
        data: {
          status: "PROCESSING",
          updatedAt: new Date(),
        },
      });

      await this.createTimelineEvent(
        orderId,
        "PROCESSING",
        "Order is being prepared for shipment",
        processedBy
      );

      return this.getUpdatedOrder(orderId);
    } catch (error) {
      this.handleError("Error starting order processing", error);
      throw error;
    }
  }

  /**
   * Ship order with tracking information
   */
  async shipOrder(
    orderId: string,
    trackingNumber: string,
    estimatedDelivery: Date,
    shippedBy: string,
    notes?: string
  ): Promise<Order> {
    try {
      const order = await this.validateOrderStatus(orderId, ["PROCESSING"]);

      await OrderModel.update({
        where: { id: orderId },
        data: {
          status: "SHIPPED",
          trackingNumber,
          estimatedDelivery,
          shippedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await this.createTimelineEvent(
        orderId,
        "SHIPPED",
        `Order shipped with tracking number: ${trackingNumber}`,
        shippedBy,
        notes
      );

      // Send shipping notification
      await this.sendShippingNotification(orderId, trackingNumber);

      return this.getUpdatedOrder(orderId);
    } catch (error) {
      this.handleError("Error shipping order", error);
      throw error;
    }
  }

  /**
   * Mark order as delivered
   */
  async deliverOrder(
    orderId: string,
    deliveredBy: string,
    notes?: string
  ): Promise<Order> {
    try {
      const order = await this.validateOrderStatus(orderId, ["SHIPPED"]);

      await OrderModel.update({
        where: { id: orderId },
        data: {
          status: "DELIVERED",
          deliveredAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await this.createTimelineEvent(
        orderId,
        "DELIVERED",
        "Order has been delivered successfully",
        deliveredBy,
        notes
      );

      // Send delivery notification
      await this.sendDeliveryNotification(orderId);

      return this.getUpdatedOrder(orderId);
    } catch (error) {
      this.handleError("Error marking order as delivered", error);
      throw error;
    }
  }

  /**
   * Process return/refund
   */
  async processReturn(
    orderId: string,
    returnReason: string,
    refundAmount: number,
    processedBy: string
  ): Promise<Order> {
    try {
      const order = await this.validateOrderStatus(orderId, ["DELIVERED"]);

      // Return items to inventory
      const orderItems = await OrderModel.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (orderItems) {
        for (const item of orderItems.items) {
          await this.stockService.handleReturn(
            item.productId,
            item.quantity,
            orderId,
            processedBy
          );
        }
      }

      await OrderModel.update({
        where: { id: orderId },
        data: {
          status: "REFUNDED",
          updatedAt: new Date(),
        },
      });

      await this.createTimelineEvent(
        orderId,
        "REFUNDED",
        `Return processed: ${returnReason}. Refund amount: ₦${refundAmount.toLocaleString()}`,
        processedBy
      );

      return this.getUpdatedOrder(orderId);
    } catch (error) {
      this.handleError("Error processing return", error);
      throw error;
    }
  }

  /**
   * Generate shipping label
   */
  async generateShippingLabel(orderId: string): Promise<ShippingLabel> {
    try {
      const order = await OrderModel.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  weight: true,
                  dimensions: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new AppError(
          "Order not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      if (!order.trackingNumber) {
        throw new AppError(
          "Order must be shipped first",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const shippingAddress = order.shippingAddress as any;
      const totalWeight = this.calculateTotalWeight(order.items);
      const dimensions = this.calculatePackageDimensions(order.items);

      return {
        orderId: order.id,
        trackingNumber: order.trackingNumber,
        shippingMethod: "Standard Delivery",
        recipientName: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
        recipientAddress: this.formatAddress(shippingAddress),
        recipientPhone: shippingAddress.phoneNumber,
        weight: totalWeight,
        dimensions,
      };
    } catch (error) {
      this.handleError("Error generating shipping label", error);
      throw error;
    }
  }

  /**
   * Get fulfillment queue (orders ready for processing)
   */
  async getFulfillmentQueue(): Promise<
    Array<{
      orderId: string;
      orderNumber: string;
      customerName: string;
      totalAmount: number;
      itemCount: number;
      createdAt: Date;
      priority: "high" | "normal" | "low";
    }>
  > {
    try {
      const orders = await OrderModel.findMany({
        where: {
          status: { in: ["CONFIRMED", "PROCESSING"] },
          paymentStatus: "PAID",
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          items: {
            select: {
              id: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      return orders.map((order) => ({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: `${order.user.firstName} ${order.user.lastName}`,
        totalAmount: Number(order.totalAmount),
        itemCount: order.items.length,
        createdAt: order.createdAt,
        priority: this.calculatePriority(order),
      }));
    } catch (error) {
      this.handleError("Error fetching fulfillment queue", error);
      throw error;
    }
  }

  // Private helper methods

  private async validateOrderStatus(
    orderId: string,
    allowedStatuses: OrderStatus[]
  ): Promise<any> {
    const order = await OrderModel.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) {
      throw new AppError(
        "Order not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND
      );
    }

    if (!allowedStatuses.includes(order.status as OrderStatus)) {
      throw new AppError(
        `Order status must be one of: ${allowedStatuses.join(", ")}`,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    return order;
  }

  private async createTimelineEvent(
    orderId: string,
    status: OrderStatus,
    description: string,
    createdBy: string,
    notes?: string
  ): Promise<void> {
    await OrderTimelineEventModel.create({
      data: {
        orderId,
        status,
        description,
        notes,
        createdBy,
      },
    });
  }

  private async getUpdatedOrder(orderId: string): Promise<Order> {
    const order = await OrderModel.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      throw new AppError(
        "Order not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND
      );
    }

    return this.transformOrder(order);
  }

  private calculateEstimatedDelivery(state: string): Date {
    const now = new Date();
    const stateLower = state.toLowerCase();

    let daysToAdd = 3; // Default 3 days

    if (["lagos", "abuja", "fct"].includes(stateLower)) {
      daysToAdd = 2;
    } else if (["ogun", "oyo", "osun", "ondo", "ekiti"].includes(stateLower)) {
      daysToAdd = 3;
    } else {
      daysToAdd = 5;
    }

    const estimatedDate = new Date(now);
    estimatedDate.setDate(estimatedDate.getDate() + daysToAdd);
    return estimatedDate;
  }

  private async sendShippingNotification(
    orderId: string,
    trackingNumber: string
  ): Promise<void> {
    const order = await OrderModel.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (order && order.user.email) {
      await this.notificationService.sendNotification({
        type: "ORDER_SHIPPED",
        channel: "EMAIL",
        userId: order.userId,
        recipient: {
          email: order.user.email,
          name: `${order.user.firstName} ${order.user.lastName}`,
        },
        variables: {
          orderNumber: order.orderNumber,
          trackingNumber,
          customerName: order.user.firstName,
          estimatedDelivery: order.estimatedDelivery,
        },
      });
    }
  }

  private async sendDeliveryNotification(orderId: string): Promise<void> {
    const order = await OrderModel.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (order && order.user.email) {
      await this.notificationService.sendNotification({
        type: "ORDER_DELIVERED",
        channel: "EMAIL",
        userId: order.userId,
        recipient: {
          email: order.user.email,
          name: `${order.user.firstName} ${order.user.lastName}`,
        },
        variables: {
          orderNumber: order.orderNumber,
          customerName: order.user.firstName,
          totalAmount: order.totalAmount,
        },
      });
    }
  }

  private calculateTotalWeight(items: any[]): number {
    return items.reduce((total, item) => {
      const productWeight = item.product.weight
        ? Number(item.product.weight)
        : 0.5; // Default 0.5kg
      return total + productWeight * item.quantity;
    }, 0);
  }

  private calculatePackageDimensions(items: any[]): {
    length: number;
    width: number;
    height: number;
  } {
    // Simple calculation - in reality would be more complex
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      length: Math.max(30, itemCount * 5), // Minimum 30cm
      width: Math.max(20, itemCount * 3), // Minimum 20cm
      height: Math.max(10, itemCount * 2), // Minimum 10cm
    };
  }

  private formatAddress(address: any): string {
    const parts = [
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.state,
      address.country || "Nigeria",
    ].filter(Boolean);

    return parts.join(", ");
  }

  private calculatePriority(order: any): "high" | "normal" | "low" {
    const orderAge = Date.now() - order.createdAt.getTime();
    const hoursOld = orderAge / (1000 * 60 * 60);
    const totalAmount = Number(order.totalAmount);

    // High priority: Old orders or high value orders
    if (hoursOld > 24 || totalAmount > 100000) {
      return "high";
    }

    // Low priority: Recent small orders
    if (hoursOld < 6 && totalAmount < 20000) {
      return "low";
    }

    return "normal";
  }

  private transformOrder(order: any): Order {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      status: order.status,
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      shippingAmount: Number(order.shippingAmount),
      discountAmount: Number(order.discountAmount),
      totalAmount: Number(order.totalAmount),
      currency: order.currency,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      paymentReference: order.paymentReference,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      customerNotes: order.customerNotes,
      adminNotes: order.adminNotes,
      trackingNumber: order.trackingNumber,
      estimatedDelivery: order.estimatedDelivery,
      paidAt: order.paidAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items:
        order.items?.map((item: any) => ({
          id: item.id,
          orderId: item.orderId,
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          productImage: item.productImage,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })) || [],
    };
  }
}
