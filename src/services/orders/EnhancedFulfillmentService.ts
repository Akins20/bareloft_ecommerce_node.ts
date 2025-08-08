import { BaseService } from "../BaseService";
import {
  OrderModel,
  OrderTimelineEventModel,
  ShipmentModel,
  ShippingCarrierModel,
} from "../../models";
import {
  Order,
  OrderStatus,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
  CreateShipmentRequest,
  ShipmentRateRequest,
  Shipment,
} from "../../types";
import { ShippingService } from "../shipping/ShippingService";
import { ReservationService } from "../inventory/ReservationService";
import { StockService } from "../inventory/StockService";
import { NotificationService } from "../notifications/NotificationService";

interface EnhancedFulfillmentUpdate {
  orderId: string;
  status: OrderStatus;
  trackingNumber?: string;
  carrierId?: string;
  estimatedDelivery?: Date;
  notes?: string;
  updatedBy: string;
}

/**
 * Enhanced Fulfillment Service - Integrates with comprehensive shipping system
 * Provides seamless order fulfillment with Nigerian carrier integration
 */
export class EnhancedFulfillmentService extends BaseService {
  private shippingService: ShippingService;
  private reservationService: ReservationService;
  private stockService: StockService;
  private notificationService: NotificationService;

  constructor(
    reservationService?: ReservationService,
    stockService?: StockService,
    notificationService?: NotificationService
  ) {
    super();
    this.shippingService = new ShippingService();
    this.reservationService = reservationService || {} as ReservationService;
    this.stockService = stockService || {} as StockService;
    this.notificationService = notificationService || {} as NotificationService;
  }

  /**
   * Confirm order with automatic shipping setup
   */
  async confirmOrderWithShipping(
    orderId: string, 
    confirmedBy: string,
    preferredCarrierId?: string
  ): Promise<Order> {
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
          user: true,
          shippingAddress: true,
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
      if (this.reservationService.convertReservationToSale) {
        await this.reservationService.convertReservationToSale(
          orderId,
          confirmedBy
        );
      }

      // Update order status
      await OrderModel.update({
        where: { id: orderId },
        data: {
          status: "CONFIRMED" as any,
          updatedAt: new Date(),
        },
      });

      // Automatically create shipment if shipping address exists
      if (order.shippingAddress) {
        try {
          await this.createShipmentForOrder(order, preferredCarrierId);
        } catch (shippingError) {
          this.logger.warn('Failed to create shipment automatically', shippingError);
          // Continue with order confirmation even if shipping fails
        }
      }

      // Create timeline event
      await this.createTimelineEvent(
        orderId,
        "CONFIRMED" as any,
        "Order confirmed and prepared for shipment",
        confirmedBy
      );

      // Send enhanced confirmation notification
      await this.sendEnhancedConfirmationNotification(order);

      return this.getUpdatedOrder(orderId);
    } catch (error) {
      this.handleError("Error confirming order with shipping", error);
      throw error;
    }
  }

  /**
   * Start processing order with carrier selection
   */
  async startProcessingWithCarrier(
    orderId: string,
    processedBy: string,
    carrierId?: string
  ): Promise<Order> {
    try {
      const order = await this.validateOrderStatus(orderId, ["CONFIRMED" as any]);

      // Get optimal carrier if not specified
      if (!carrierId) {
        carrierId = await this.selectOptimalCarrier(order);
      }

      await OrderModel.update({
        where: { id: orderId },
        data: {
          status: "PROCESSING" as any,
          updatedAt: new Date(),
        },
      });

      // Create or update shipment
      await this.ensureShipmentExists(order, carrierId);

      await this.createTimelineEvent(
        orderId,
        "PROCESSING" as any,
        `Order is being prepared for shipment via ${await this.getCarrierName(carrierId)}`,
        processedBy
      );

      return this.getUpdatedOrder(orderId);
    } catch (error) {
      this.handleError("Error starting order processing", error);
      throw error;
    }
  }

  /**
   * Ship order with integrated carrier tracking
   */
  async shipOrderWithTracking(
    orderId: string,
    shippedBy: string,
    carrierId?: string,
    notes?: string
  ): Promise<Order> {
    try {
      const order = await this.validateOrderStatus(orderId, ["PROCESSING" as any]);

      // Find or create shipment
      let shipment = await ShipmentModel.findUnique({
        where: { orderId },
        include: { carrier: true }
      });

      if (!shipment) {
        // Create shipment if it doesn't exist
        shipment = await this.createShipmentForOrder(order, carrierId);
      }

      // Generate shipping label
      const label = await this.shippingService.generateShippingLabel(shipment.id);

      // Update order status
      await OrderModel.update({
        where: { id: orderId },
        data: {
          status: "SHIPPED" as any,
          updatedAt: new Date(),
        },
      });

      await this.createTimelineEvent(
        orderId,
        "SHIPPED" as any,
        `Order shipped via carrier ${shipment.carrierId} - Tracking: ${shipment.trackingNumber}`,
        shippedBy,
        notes
      );

      // Send enhanced shipping notification with tracking
      await this.sendEnhancedShippingNotification(order, shipment);

      return this.getUpdatedOrder(orderId);
    } catch (error) {
      this.handleError("Error shipping order", error);
      throw error;
    }
  }

  /**
   * Get comprehensive fulfillment queue with shipping information
   */
  async getEnhancedFulfillmentQueue(): Promise<
    Array<{
      orderId: string;
      orderNumber: string;
      customerName: string;
      totalAmount: number;
      itemCount: number;
      createdAt: Date;
      priority: "high" | "normal" | "low";
      shippingInfo?: {
        trackingNumber?: string;
        carrier?: string;
        estimatedDelivery?: Date;
        status?: string;
      };
    }>
  > {
    try {
      const orders = await OrderModel.findMany({
        where: {
          status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED"] },
          paymentStatus: "COMPLETED" as any,
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
          shipment: {
            include: {
              carrier: {
                select: {
                  name: true,
                }
              }
            }
          }
        },
        orderBy: { createdAt: "asc" },
      });

      return orders.map((order: any) => ({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.user 
          ? `${order.user.firstName} ${order.user.lastName}` 
          : 'Unknown Customer',
        totalAmount: Number(order.total),
        itemCount: order.items ? order.items.length : 0,
        createdAt: order.createdAt,
        priority: this.calculatePriority(order),
        shippingInfo: order.shipment ? {
          trackingNumber: order.shipment.trackingNumber,
          carrier: order.shipment.carrier?.name,
          estimatedDelivery: order.shipment.estimatedDelivery,
          status: order.shipment.status,
        } : undefined,
      }));
    } catch (error) {
      this.handleError("Error fetching enhanced fulfillment queue", error);
      throw error;
    }
  }

  /**
   * Get shipping rate comparison for order
   */
  async getShippingRatesForOrder(orderId: string): Promise<any[]> {
    try {
      const order = await OrderModel.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  weight: true,
                  dimensions: true,
                },
              },
            },
          },
          shippingAddress: true,
        },
      });

      if (!order || !order.shippingAddress) {
        throw new AppError(
          "Order or shipping address not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      const { totalWeight, packageDimensions } = this.calculatePackageSpecs(order.items);

      const rateRequest: ShipmentRateRequest = {
        originCity: "Lagos", // Default warehouse location
        originState: "Lagos",
        destinationCity: order.shippingAddress.city,
        destinationState: order.shippingAddress.state,
        packageWeight: totalWeight,
        packageDimensions,
        declaredValue: Number(order.total),
      };

      return await this.shippingService.calculateShippingRates(rateRequest);
    } catch (error) {
      this.handleError("Error getting shipping rates for order", error);
      throw error;
    }
  }

  // Private helper methods

  private async createShipmentForOrder(
    order: any, 
    carrierId?: string
  ): Promise<any> {
    if (!order.shippingAddress) {
      throw new AppError(
        "Order must have shipping address to create shipment",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const { totalWeight, packageDimensions } = this.calculatePackageSpecs(order.items);

    const shipmentRequest: CreateShipmentRequest = {
      orderId: order.id,
      carrierId: carrierId || await this.selectOptimalCarrier(order),
      serviceType: this.determineServiceType(order),
      destinationAddress: {
        firstName: order.shippingAddress.firstName,
        lastName: order.shippingAddress.lastName,
        company: order.shippingAddress.company,
        addressLine1: order.shippingAddress.addressLine1,
        addressLine2: order.shippingAddress.addressLine2,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        postalCode: order.shippingAddress.postalCode,
        country: order.shippingAddress.country || 'NG',
        phoneNumber: order.shippingAddress.phoneNumber,
      },
      packageWeight: totalWeight,
      packageDimensions,
      declaredValue: Number(order.total),
      specialInstructions: order.notes,
    };

    return await this.shippingService.createShipment(shipmentRequest);
  }

  private async selectOptimalCarrier(order: any): Promise<string> {
    try {
      const rates = await this.getShippingRatesForOrder(order.id);
      
      if (rates.length === 0) {
        // Fallback to default carrier
        const defaultCarrier = await ShippingCarrierModel.findFirst({
          where: { isDefault: true, status: 'ACTIVE' }
        });
        
        return defaultCarrier?.id || 'jumia_logistics';
      }

      // Select carrier with best balance of cost and delivery time
      const optimalRate = rates.reduce((best, current) => {
        const bestScore = best.cost + (best.estimatedDays * 500); // Weight delivery time
        const currentScore = current.cost + (current.estimatedDays * 500);
        return currentScore < bestScore ? current : best;
      });

      return optimalRate.carrierId;
    } catch (error) {
      this.logger.warn('Error selecting optimal carrier, using default', error);
      return 'jumia_logistics'; // Fallback to Jumia
    }
  }

  private async ensureShipmentExists(order: any, carrierId: string): Promise<void> {
    const existingShipment = await ShipmentModel.findUnique({
      where: { orderId: order.id }
    });

    if (!existingShipment) {
      await this.createShipmentForOrder(order, carrierId);
    } else if (existingShipment.carrierId !== carrierId) {
      // Update carrier if different
      await ShipmentModel.update({
        where: { id: existingShipment.id },
        data: { carrierId }
      });
    }
  }

  private calculatePackageSpecs(items: any[]): {
    totalWeight: number;
    packageDimensions: any;
  } {
    const totalWeight = items.reduce((total, item) => {
      const productWeight = item.product?.weight 
        ? Number(item.product.weight)
        : 0.5; // Default 0.5kg
      return total + productWeight * item.quantity;
    }, 0);

    // Simple packaging calculation
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const packageDimensions = {
      length: Math.max(30, itemCount * 5), // Minimum 30cm
      width: Math.max(20, itemCount * 3),  // Minimum 20cm
      height: Math.max(10, itemCount * 2), // Minimum 10cm
      weight: totalWeight,
    };

    return { totalWeight, packageDimensions };
  }

  private determineServiceType(order: any): string {
    const orderValue = Number(order.total);
    
    // Premium service for high-value orders
    if (orderValue > 100000) {
      return 'express';
    }
    
    // Standard service for most orders
    return 'standard';
  }

  private async getCarrierName(carrierId: string): Promise<string> {
    try {
      const carrier = await ShippingCarrierModel.findUnique({
        where: { id: carrierId }
      });
      return carrier?.name || 'Unknown Carrier';
    } catch (error) {
      return 'Unknown Carrier';
    }
  }

  private async sendEnhancedConfirmationNotification(order: any): Promise<void> {
    if (order.user?.email && this.notificationService.sendNotification) {
      await this.notificationService.sendNotification({
        type: "order_confirmation_enhanced" as any,
        channel: "email" as any,
        userId: order.userId,
        recipient: {
          email: order.user.email,
          name: `${order.user?.firstName || ''} ${order.user?.lastName || ''}`,
        },
        variables: {
          orderNumber: order.orderNumber,
          customerName: order.user?.firstName || '',
          totalAmount: order.total,
          itemCount: order.items?.length || 0,
          shippingAddress: order.shippingAddress ? {
            city: order.shippingAddress.city,
            state: order.shippingAddress.state,
          } : null,
          estimatedDelivery: this.calculateEstimatedDelivery(
            order.shippingAddress?.state || "Lagos"
          ),
        },
      });
    }
  }

  private async sendEnhancedShippingNotification(order: any, shipment: any): Promise<void> {
    if (order.user?.email && this.notificationService.sendNotification) {
      await this.notificationService.sendNotification({
        type: "order_shipped_enhanced" as any,
        channel: "email" as any,
        userId: order.userId,
        recipient: {
          email: order.user.email,
          name: `${order.user?.firstName || ''} ${order.user?.lastName || ''}`,
        },
        variables: {
          orderNumber: order.orderNumber,
          trackingNumber: shipment.trackingNumber,
          carrierName: shipment.carrier?.name || 'Carrier',
          customerName: order.user?.firstName || '',
          estimatedDelivery: shipment.estimatedDelivery,
          trackingUrl: `https://track.bareloft.com/${shipment.trackingNumber}`,
          shippingAddress: order.shippingAddress,
        },
      });
    }

    // Also send SMS notification for Nigerian customers
    if (order.user?.phoneNumber) {
      await this.notificationService.sendNotification({
        userId: order.userId,
        recipient: { phoneNumber: order.user.phoneNumber },
        type: 'ORDER_SHIPPED' as any,
        channel: 'SMS' as any,
        priority: 'HIGH' as any,
        variables: {
          orderNumber: order.orderNumber,
          trackingNumber: shipment.trackingNumber,
          estimatedDelivery: shipment.estimatedDelivery?.toDateString()
        }
      });
    }
  }

  // Inherited methods from original FulfillmentService
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

  private async validateOrderStatus(orderId: string, allowedStatuses: OrderStatus[]): Promise<any> {
    const order = await OrderModel.findUnique({
      where: { id: orderId },
      include: { user: true, shippingAddress: true },
    });

    if (!order) {
      throw new AppError(
        "Order not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND
      );
    }

    if (!allowedStatuses.includes(order.status as any)) {
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
        type: (status as any) as string,
        message: description,
        data: notes ? { notes, createdBy } : { createdBy },
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
        shipment: {
          include: {
            carrier: true,
          }
        }
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

  private calculatePriority(order: any): "high" | "normal" | "low" {
    const orderAge = Date.now() - order.createdAt.getTime();
    const hoursOld = orderAge / (1000 * 60 * 60);
    const totalAmount = Number(order.total);

    // High priority: Old orders, high value orders, or express shipments
    if (hoursOld > 24 || totalAmount > 100000 || order.shipment?.serviceType === 'express') {
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
      tax: Number(order.tax),
      shippingCost: Number(order.shippingCost),
      discount: Number(order.discount),
      total: Number(order.total),
      currency: order.currency,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      paymentReference: order.paymentReference,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items:
        order.items?.map((item: any) => ({
          id: item.id,
          orderId: item.orderId,
          productId: item.productId,
          quantity: item.quantity,
          price: Number(item.price),
          total: Number(item.total),
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })) || [],
    };
  }
}