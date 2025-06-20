import { BaseService } from "../BaseService";
import { CreateOrderRequest, Order } from "../../types";
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
export declare class CheckoutService extends BaseService {
    private orderService;
    private reservationService;
    private stockService;
    constructor(orderService: OrderService, reservationService: ReservationService, stockService: StockService);
    /**
     * Validate cart and prepare for checkout
     */
    validateCheckout(userId: string): Promise<CheckoutValidationResult>;
    /**
     * Process checkout and create order
     */
    processCheckout(userId: string, checkoutData: CreateOrderRequest): Promise<{
        order: Order;
        paymentUrl?: string;
        requiresPayment: boolean;
    }>;
    /**
     * Calculate shipping cost
     */
    calculateShipping(subtotal: number): number;
    /**
     * Calculate tax amount
     */
    calculateTax(subtotal: number): number;
    /**
     * Get shipping options for checkout
     */
    getShippingOptions(subtotal: number, state: string): Promise<Array<{
        id: string;
        name: string;
        description: string;
        cost: number;
        estimatedDays: number;
        isFree: boolean;
    }>>;
    /**
     * Apply coupon code to checkout
     */
    applyCoupon(userId: string, couponCode: string): Promise<{
        isValid: boolean;
        discountAmount: number;
        message: string;
    }>;
    private getCartId;
    private clearUserCart;
    private initializePayment;
    private getEstimatedDeliveryDays;
}
export {};
//# sourceMappingURL=CheckoutService.d.ts.map