import { BaseService } from "../BaseService";
import { Order, OrderStatus, CreateOrderRequest, UpdateOrderStatusRequest, OrderListQuery, PaginationMeta } from "../../types";
import { CacheService } from "../cache/CacheService";
export declare class OrderService extends BaseService {
    private cacheService;
    constructor(cacheService: CacheService);
    /**
     * Create a new order
     */
    createOrder(userId: string, request: CreateOrderRequest, cartItems: Array<{
        productId: string;
        productName: string;
        productSku: string;
        productImage?: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
    }>): Promise<Order>;
    /**
     * Get order by ID
     */
    getOrderById(orderId: string): Promise<Order>;
    /**
     * Get orders list with filtering
     */
    getOrders(query?: OrderListQuery): Promise<{
        orders: Order[];
        pagination: PaginationMeta;
    }>;
    /**
     * Get user orders
     */
    getUserOrders(userId: string, page?: number, limit?: number): Promise<{
        orders: Order[];
        pagination: PaginationMeta;
    }>;
    /**
     * Update order status
     */
    updateOrderStatus(orderId: string, request: UpdateOrderStatusRequest, updatedBy: string): Promise<Order>;
    /**
     * Cancel order
     */
    cancelOrder(orderId: string, reason: string, cancelledBy: string): Promise<Order>;
    /**
     * Get order timeline
     */
    getOrderTimeline(orderId: string): Promise<Array<{
        id: string;
        status: OrderStatus;
        description: string;
        notes?: string;
        createdBy?: string;
        createdAt: Date;
    }>>;
    /**
     * Get order by order number
     */
    getOrderByNumber(orderNumber: string, userId?: string): Promise<Order>;
    /**
     * Get order tracking information
     */
    getOrderTracking(orderId: string, userId?: string): Promise<{
        order: Order;
        tracking: {
            trackingNumber?: string;
            status: OrderStatus;
            estimatedDelivery?: Date;
            timeline: Array<{
                status: OrderStatus;
                description: string;
                timestamp: Date;
                notes?: string;
            }>;
        };
    }>;
    /**
     * Reorder items from a previous order
     */
    reorder(orderId: string, userId: string): Promise<{
        success: boolean;
        message: string;
        cartItems: any[];
    }>;
    /**
     * Request return for an order
     */
    requestReturn(orderId: string, userId: string, data: {
        reason: string;
        items?: string[];
        notes?: string;
    }): Promise<{
        success: boolean;
        message: string;
        returnRequest: any;
    }>;
    /**
     * Verify payment for an order
     */
    verifyPayment(orderId: string, userId: string): Promise<{
        success: boolean;
        message: string;
        order: Order;
    }>;
    /**
     * Generate invoice for an order
     */
    generateInvoice(orderId: string, userId?: string): Promise<{
        success: boolean;
        invoice: any;
    }>;
    /**
     * Get user order statistics
     */
    getUserOrderStats(userId: string): Promise<{
        totalOrders: number;
        totalSpent: number;
        averageOrderValue: number;
        ordersByStatus: Record<string, number>;
        recentOrders: Order[];
    }>;
    private generateOrderNumber;
    private calculateShippingAmount;
    private calculateTaxAmount;
    private createTimelineEvent;
    private getStatusDescription;
    private clearOrderCache;
    private transformOrder;
    private transformOrderSummary;
}
//# sourceMappingURL=OrderService.d.ts.map