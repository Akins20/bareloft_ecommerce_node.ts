import { BaseService } from "../BaseService";
import { OrderRepository } from "../../repositories/OrderRepository";
import { CartService } from "../cart/CartService";
import { Order, OrderStatus, CreateOrderRequest, PaginationMeta } from "../../types";
export interface CartItem {
    productId: string;
    productName: string;
    productSku: string;
    productImage?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}
export interface OrderResponse {
    success: boolean;
    message: string;
    order: Order;
}
export interface OrderListResponse {
    success: boolean;
    message: string;
    orders: Order[];
    pagination: PaginationMeta;
}
export declare class OrderService extends BaseService {
    private orderRepository;
    private cartService;
    constructor(orderRepository?: OrderRepository, cartService?: CartService);
    /**
     * Create a new order from cart
     */
    createOrder(userId: string, request: CreateOrderRequest): Promise<OrderResponse>;
    /**
     * Get order by ID
     */
    getOrderById(orderId: string, userId?: string): Promise<Order>;
    /**
     * Get user orders with pagination
     */
    getUserOrders(userId: string, params?: {
        page?: number;
        limit?: number;
        status?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<OrderListResponse>;
    /**
     * Update order status (Admin only)
     */
    updateOrderStatus(orderId: string, status: OrderStatus, adminNotes?: string, updatedBy?: string): Promise<OrderResponse>;
    /**
     * Cancel order
     */
    cancelOrder(orderId: string, reason: string, userId?: string): Promise<OrderResponse>;
    /**
     * Get order by order number
     */
    getOrderByNumber(orderNumber: string, userId?: string): Promise<Order>;
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
    private calculateDiscount;
    private createTimelineEvent;
    private getStatusDescription;
    /**
     * Handle service errors
     */
    protected handleError(message: string, error: any): never;
}
//# sourceMappingURL=OrderService.d.ts.map