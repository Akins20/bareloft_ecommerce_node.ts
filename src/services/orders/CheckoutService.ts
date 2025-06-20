import { BaseService } from "../BaseService";
import { CartModel, OrderModel, InventoryModel } from "../../models";
import {
  CreateOrderRequest,
  Order,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
} from "../../types";
import { OrderService } from "./OrderService";
import { ReservationService } from "../inventory/ReservationService";
import { StockService } from "../inventory/StockService";

interface CheckoutValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  cartItems: Array<{
    productId: string;
    productName: string;
    productSku: string;
    productImage?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    available: boolean;
    availableQuantity: number;
  }>;
  totals: {
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
  };
}

interface ShippingCalculation {
  cost: number;
  isFree: boolean;
  estimatedDays: number;
  method: string;
}

export class CheckoutService extends BaseService {
  private orderService: OrderService;
  private reservationService: ReservationService;
  private stockService: StockService;

  constructor(
    orderService: OrderService,
    reservationService: ReservationService,
    stockService: StockService
  ) {
    super();
    this.orderService = orderService;
    this.reservationService = reservationService;
    this.stockService = stockService;
  }

  /**
   * Validate cart and prepare for checkout
   */
  async validateCheckout(userId: string): Promise<CheckoutValidationResult> {
    try {
      const cart = await CartModel.findFirst({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  inventory: true,
                  images: {
                    where: { isPrimary: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        return {
          isValid: false,
          errors: ["Cart is empty"],
          warnings: [],
          cartItems: [],
          totals: { subtotal: 0, shipping: 0, tax: 0, total: 0 },
        };
      }

      const errors: string[] = [];
      const warnings: string[] = [];
      const cartItems = [];

      let subtotal = 0;

      // Validate each cart item
      for (const item of cart.items) {
        const product = item.product;
        const inventory = product.inventory;

        // Check if product is active
        if (!product.isActive) {
          errors.push(`${product.name} is no longer available`);
          continue;
        }

        // Check stock availability
        const availableQuantity = inventory
          ? inventory.quantity - inventory.reservedQuantity
          : 0;

        const isAvailable = availableQuantity >= item.quantity;

        if (!isAvailable) {
          if (availableQuantity === 0) {
            errors.push(`${product.name} is out of stock`);
          } else {
            errors.push(
              `Only ${availableQuantity} units of ${product.name} available (requested: ${item.quantity})`
            );
          }
        }

        // Check if price has changed
        const currentPrice = Number(product.price);
        const cartPrice = Number(item.unitPrice);

        if (currentPrice !== cartPrice) {
          warnings.push(
            `Price of ${product.name} has changed from ₦${cartPrice} to ₦${currentPrice}`
          );
        }

        const finalPrice = currentPrice;
        const totalPrice = finalPrice * item.quantity;

        cartItems.push({
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          productImage: product.images[0]?.imageUrl,
          quantity: item.quantity,
          unitPrice: finalPrice,
          totalPrice,
          available: isAvailable,
          availableQuantity,
        });

        if (isAvailable) {
          subtotal += totalPrice;
        }
      }

      // Calculate totals
      const shipping = this.calculateShipping(subtotal);
      const tax = this.calculateTax(subtotal);
      const total = subtotal + shipping + tax;

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        cartItems,
        totals: {
          subtotal,
          shipping,
          tax,
          total,
        },
      };
    } catch (error) {
      this.handleError("Error validating checkout", error);
      throw error;
    }
  }

  /**
   * Process checkout and create order
   */
  async processCheckout(
    userId: string,
    checkoutData: CreateOrderRequest
  ): Promise<{
    order: Order;
    paymentUrl?: string;
    requiresPayment: boolean;
  }> {
    try {
      // Validate checkout first
      const validation = await this.validateCheckout(userId);

      if (!validation.isValid) {
        throw new AppError(
          `Checkout validation failed: ${validation.errors.join(", ")}`,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Reserve stock for all items
      const reservationResult = await this.reservationService.bulkReserveStock({
        items: validation.cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        cartId: await this.getCartId(userId),
        reason: "Checkout reservation",
        expirationMinutes: 15, // 15 minutes to complete payment
      });

      if (!reservationResult.success) {
        throw new AppError(
          "Unable to reserve stock for checkout",
          HTTP_STATUS.CONFLICT,
          ERROR_CODES.INSUFFICIENT_STOCK
        );
      }

      // Create order
      const order = await this.orderService.createOrder(
        userId,
        checkoutData,
        validation.cartItems
      );

      // Determine if payment is required
      const requiresPayment = order.totalAmount > 0;
      let paymentUrl: string | undefined;

      if (requiresPayment) {
        // In a real implementation, this would initialize payment with Paystack
        paymentUrl = await this.initializePayment(order);
      }

      // Clear cart after successful order creation
      await this.clearUserCart(userId);

      return {
        order,
        paymentUrl,
        requiresPayment,
      };
    } catch (error) {
      this.handleError("Error processing checkout", error);
      throw error;
    }
  }

  /**
   * Calculate shipping cost
   */
  calculateShipping(subtotal: number): number {
    // Free shipping for orders over ₦50,000
    if (subtotal >= 50000) {
      return 0;
    }

    // Standard shipping rate
    return 2500;
  }

  /**
   * Calculate tax amount
   */
  calculateTax(subtotal: number): number {
    // 7.5% VAT in Nigeria
    return Math.round(subtotal * 0.075);
  }

  /**
   * Get shipping options for checkout
   */
  async getShippingOptions(
    subtotal: number,
    state: string
  ): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      cost: number;
      estimatedDays: number;
      isFree: boolean;
    }>
  > {
    try {
      const isFreeShipping = subtotal >= 50000;

      const options = [
        {
          id: "standard",
          name: "Standard Delivery",
          description: "Regular delivery within Nigeria",
          cost: isFreeShipping ? 0 : 2500,
          estimatedDays: this.getEstimatedDeliveryDays(state, "standard"),
          isFree: isFreeShipping,
        },
      ];

      // Add express option for Lagos
      if (state.toLowerCase() === "lagos") {
        options.push({
          id: "express",
          name: "Express Delivery",
          description: "Same day delivery in Lagos",
          cost: isFreeShipping ? 1000 : 3500, // Reduced cost if free shipping qualified
          estimatedDays: 1,
          isFree: false,
        });
      }

      return options;
    } catch (error) {
      this.handleError("Error getting shipping options", error);
      throw error;
    }
  }

  /**
   * Apply coupon code to checkout
   */
  async applyCoupon(
    userId: string,
    couponCode: string
  ): Promise<{
    isValid: boolean;
    discountAmount: number;
    message: string;
  }> {
    try {
      // Simple coupon validation - in production, this would check a coupons table
      const validCoupons: Record<
        string,
        { discount: number; type: "percentage" | "fixed"; minimum?: number }
      > = {
        WELCOME10: { discount: 10, type: "percentage", minimum: 10000 },
        SAVE5000: { discount: 5000, type: "fixed", minimum: 25000 },
        NEWUSER: { discount: 15, type: "percentage", minimum: 5000 },
      };

      const coupon = validCoupons[couponCode.toUpperCase()];

      if (!coupon) {
        return {
          isValid: false,
          discountAmount: 0,
          message: "Invalid coupon code",
        };
      }

      // Get cart total
      const validation = await this.validateCheckout(userId);
      const subtotal = validation.totals.subtotal;

      // Check minimum amount
      if (coupon.minimum && subtotal < coupon.minimum) {
        return {
          isValid: false,
          discountAmount: 0,
          message: `Minimum order amount of ₦${coupon.minimum.toLocaleString()} required for this coupon`,
        };
      }

      // Calculate discount
      let discountAmount = 0;
      if (coupon.type === "percentage") {
        discountAmount = Math.round(subtotal * (coupon.discount / 100));
      } else {
        discountAmount = coupon.discount;
      }

      // Don't exceed subtotal
      discountAmount = Math.min(discountAmount, subtotal);

      return {
        isValid: true,
        discountAmount,
        message: `Coupon applied! You saved ₦${discountAmount.toLocaleString()}`,
      };
    } catch (error) {
      this.handleError("Error applying coupon", error);
      throw error;
    }
  }

  // Private helper methods

  private async getCartId(userId: string): Promise<string | undefined> {
    const cart = await CartModel.findFirst({
      where: { userId },
      select: { id: true },
    });
    return cart?.id;
  }

  private async clearUserCart(userId: string): Promise<void> {
    await CartModel.deleteMany({
      where: { userId },
    });
  }

  private async initializePayment(order: Order): Promise<string> {
    // In production, this would integrate with Paystack
    // For now, return a mock URL
    return `https://checkout.paystack.com/pay/${order.id}`;
  }

  private getEstimatedDeliveryDays(state: string, method: string): number {
    const stateLower = state.toLowerCase();

    // Delivery estimates by state for standard shipping
    if (method === "standard") {
      if (["lagos", "abuja", "fct"].includes(stateLower)) {
        return 2; // 1-2 days for major cities
      } else if (
        ["ogun", "oyo", "osun", "ondo", "ekiti"].includes(stateLower)
      ) {
        return 3; // 2-3 days for southwest
      } else {
        return 5; // 3-5 days for other states
      }
    }

    return 3; // Default
  }
}
