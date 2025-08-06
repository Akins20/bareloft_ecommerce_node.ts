import { BaseService } from "../BaseService";
import { OrderModel, OrderTimelineEventModel } from "../../models";
import {
  Order,
  OrderStatus,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
} from "../../types";
import { CacheService } from "../cache/CacheService";

interface TrackingInfo {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  currentLocation?: string;
  timeline: Array<{
    status: OrderStatus;
    description: string;
    timestamp: Date;
    location?: string;
  }>;
  deliveryProgress: {
    percentage: number;
    currentStep: string;
    nextStep?: string;
  };
}

interface DeliveryUpdate {
  trackingNumber: string;
  status: OrderStatus;
  location: string;
  description: string;
  timestamp: Date;
  updatedBy: string;
}

export class TrackingService extends BaseService {
  private cacheService: any;

  constructor(cacheService?: any) {
    super();
    this.cacheService = cacheService || {};
  }

  /**
   * Track order by order number or tracking number
   */
  async trackOrder(identifier: string): Promise<TrackingInfo> {
    try {
      const cacheKey = `tracking:${identifier}`;
      const cached = this.cacheService.get ? await this.cacheService.get(cacheKey) : null;
      if (cached) return cached;

      // Find order by order number only (trackingNumber field doesn't exist in schema)
      const order = await OrderModel.findFirst?.({
        where: {
          orderNumber: identifier,
        },
        include: {
          items: {
            take: 1, // Just to get item count
            select: { id: true },
          },
        },
      }) || null;

      if (!order) {
        throw new AppError(
          "Order not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Get timeline events
      const timeline = await this.getOrderTimeline(order.id);

      // Calculate delivery progress
      const deliveryProgress = this.calculateDeliveryProgress(order.status as any);

      const trackingInfo: TrackingInfo = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status as any,
        trackingNumber: `TRK-${order.orderNumber}`,
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        currentLocation: this.getCurrentLocation(
          order.status as any,
          null // shippingAddress not directly available
        ),
        timeline,
        deliveryProgress,
      };

      // Cache for 10 minutes (simplified)
      if (this.cacheService.set) {
        await this.cacheService.set(cacheKey, trackingInfo);
      }

      return trackingInfo;
    } catch (error) {
      this.handleError("Error tracking order", error);
      throw error;
    }
  }

  /**
   * Track multiple orders for a user
   */
  async trackUserOrders(userId: string): Promise<TrackingInfo[]> {
    try {
      const orders = await OrderModel.findMany?.({
        where: {
          userId,
          status: {
            in: ["CONFIRMED", "PROCESSING", "SHIPPED"],
          },
        },
        orderBy: { createdAt: "desc" },
      }) || [];

      const trackingInfos: TrackingInfo[] = [];

      for (const order of orders) {
        try {
          const tracking = await this.trackOrder(order.orderNumber);
          trackingInfos.push(tracking);
        } catch (error) {
          // Skip orders that can't be tracked
          continue;
        }
      }

      return trackingInfos;
    } catch (error) {
      this.handleError("Error tracking user orders", error);
      throw error;
    }
  }

  /**
   * Update delivery status (for logistics partners)
   */
  async updateDeliveryStatus(update: DeliveryUpdate): Promise<void> {
    try {
      // Find order by order number (using trackingNumber as order number since trackingNumber field doesn't exist)
      const order = await OrderModel.findFirst?.({
        where: { orderNumber: update.trackingNumber },
      }) || null;

      if (!order) {
        throw new AppError(
          "Order not found with tracking number",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Update order status if it's progressing forward
      const shouldUpdateOrder = this.shouldUpdateOrderStatus(
        order.status as any,
        update.status
      );

      if (shouldUpdateOrder) {
        await OrderModel.update?.({
          where: { id: order.id },
          data: {
            status: update.status as any,
            updatedAt: new Date(),
          },
        });
      }

      // Create timeline event
      await OrderTimelineEventModel.create?.({
        data: {
          orderId: order.id,
          type: (update.status as any) as string,
          message: `${update.description} - Location: ${update.location}`,
          // createdAt field might not exist, use data field instead
          data: { timestamp: update.timestamp },
        },
      });

      // Clear cache
      await this.clearTrackingCache(order.orderNumber);
    } catch (error) {
      this.handleError("Error updating delivery status", error);
      throw error;
    }
  }

  /**
   * Get estimated delivery time
   */
  async getEstimatedDelivery(
    orderId: string,
    shippingState: string
  ): Promise<{
    estimatedDate: Date;
    estimatedDays: number;
    deliveryWindow: string;
  }> {
    try {
      const order = await OrderModel.findUnique?.({
        where: { id: orderId },
        select: {
          createdAt: true,
          status: true,
        },
      }) || null;

      if (!order) {
        throw new AppError(
          "Order not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      const estimatedDays = this.getDeliveryDays(
        shippingState,
        order.status as any
      );
      const baseDate = order.createdAt;

      const estimatedDate = new Date(baseDate);
      estimatedDate.setDate(estimatedDate.getDate() + estimatedDays);

      // Skip weekends for delivery
      while (estimatedDate.getDay() === 0 || estimatedDate.getDay() === 6) {
        estimatedDate.setDate(estimatedDate.getDate() + 1);
      }

      const deliveryWindow = this.getDeliveryWindow(shippingState);

      return {
        estimatedDate,
        estimatedDays,
        deliveryWindow,
      };
    } catch (error) {
      this.handleError("Error calculating estimated delivery", error);
      throw error;
    }
  }

  /**
   * Check for delayed orders
   */
  async getDelayedOrders(): Promise<
    Array<{
      orderId: string;
      orderNumber: string;
      customerName: string;
      trackingNumber?: string;
      estimatedDelivery: Date;
      daysOverdue: number;
      status: OrderStatus;
    }>
  > {
    try {
      const now = new Date();

      const delayedOrders = await OrderModel.findMany?.({
        where: {
          status: { in: ["PROCESSING", "SHIPPED"] },
          createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Orders older than 7 days
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }) || [];

      return delayedOrders.map((order) => {
        const estimatedDelivery = new Date(order.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
        const daysOverdue = Math.floor(
          (now.getTime() - estimatedDelivery.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        return {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.user ? `${order.user?.firstName || ''} ${order.user?.lastName || ''}` : "Unknown Customer",
          trackingNumber: `TRK-${order.orderNumber}`,
          estimatedDelivery,
          daysOverdue,
          status: order.status as any,
        };
      });
    } catch (error) {
      this.handleError("Error fetching delayed orders", error);
      throw error;
    }
  }

  /**
   * Generate tracking URL for external tracking
   */
  generateTrackingUrl(trackingNumber: string): string {
    // In production, this would generate URLs for actual logistics partners
    return `https://track.bareloft.com/${trackingNumber}`;
  }

  // Private helper methods

  private async getOrderTimeline(orderId: string): Promise<
    Array<{
      status: OrderStatus;
      description: string;
      timestamp: Date;
      location?: string;
    }>
  > {
    const events = await OrderTimelineEventModel.findMany?.({
      where: { orderId },
      orderBy: { createdAt: "asc" },
    }) || [];

    return events.map((event) => ({
      status: (event.type as any) as OrderStatus,
      description: event.message,
      timestamp: event.createdAt,
      location: this.extractLocationFromDescription(event.message),
    }));
  }

  private calculateDeliveryProgress(status: OrderStatus): {
    percentage: number;
    currentStep: string;
    nextStep?: string;
  } {
    const steps = {
      PENDING: {
        percentage: 10,
        current: "Order Placed",
        next: "Order Confirmation",
      },
      CONFIRMED: {
        percentage: 25,
        current: "Order Confirmed",
        next: "Preparing for Shipment",
      },
      PROCESSING: {
        percentage: 50,
        current: "Preparing for Shipment",
        next: "Shipped",
      },
      SHIPPED: {
        percentage: 75,
        current: "In Transit",
        next: "Out for Delivery",
      },
      DELIVERED: { percentage: 100, current: "Delivered", next: undefined },
      CANCELLED: { percentage: 0, current: "Cancelled", next: undefined },
      REFUNDED: { percentage: 0, current: "Refunded", next: undefined },
    };

    const step = steps[status] || steps["PENDING"];

    return {
      percentage: step.percentage,
      currentStep: step.current,
      nextStep: step.next,
    };
  }

  private getCurrentLocation(
    status: OrderStatus,
    shippingAddress: any
  ): string {
    const address = shippingAddress as any;

    const statusString = (status as any) as string;
    switch (statusString) {
      case "PENDING":
      case "CONFIRMED":
        return "Bareloft Warehouse, Lagos";
      case "PROCESSING":
        return "Bareloft Fulfillment Center";
      case "SHIPPED":
        return address ? `In transit to ${address.city}, ${address.state}` : "In transit";
      case "DELIVERED":
        return address ? `Delivered to ${address.city}, ${address.state}` : "Delivered";
      default:
        return "Unknown";
    }
  }

  private getDeliveryDays(state: string, currentStatus: OrderStatus): number {
    const stateLower = state.toLowerCase();

    // Base delivery days by state
    let baseDays = 3;
    if (["lagos", "abuja", "fct"].includes(stateLower)) {
      baseDays = 2;
    } else if (["ogun", "oyo", "osun", "ondo", "ekiti"].includes(stateLower)) {
      baseDays = 3;
    } else {
      baseDays = 5;
    }

    // Adjust based on current status
    const statusString = (currentStatus as any) as string;
    switch (statusString) {
      case "SHIPPED":
        return Math.max(1, baseDays - 1); // Reduce by 1 day if already shipped
      case "PROCESSING":
        return baseDays;
      default:
        return baseDays + 1; // Add 1 day for processing
    }
  }

  private getDeliveryWindow(state: string): string {
    const stateLower = state.toLowerCase();

    if (["lagos", "abuja", "fct"].includes(stateLower)) {
      return "9:00 AM - 6:00 PM";
    } else {
      return "10:00 AM - 5:00 PM";
    }
  }

  private shouldUpdateOrderStatus(
    currentStatus: OrderStatus,
    newStatus: OrderStatus
  ): boolean {
    const statusOrder = [
      "PENDING",
      "CONFIRMED",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
    ];
    const currentIndex = statusOrder.indexOf((currentStatus as any) as string);
    const newIndex = statusOrder.indexOf((newStatus as any) as string);

    // Only update if new status is further along in the process
    return newIndex > currentIndex;
  }

  private extractLocationFromDescription(
    description: string
  ): string | undefined {
    // Simple regex to extract location from description
    const locationMatch = description.match(/Location:\s*([^-]+)/);
    return locationMatch ? locationMatch[1].trim() : undefined;
  }

  private async clearTrackingCache(
    orderNumber: string,
    trackingNumber?: string
  ): Promise<void> {
    const cacheKeys = [`tracking:${orderNumber}`];
    if (trackingNumber) {
      cacheKeys.push(`tracking:${trackingNumber}`);
    }

    if (this.cacheService.delete) {
      await Promise.all(cacheKeys.map((key) => this.cacheService.delete(key)));
    }
  }
}
