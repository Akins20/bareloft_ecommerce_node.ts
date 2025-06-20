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