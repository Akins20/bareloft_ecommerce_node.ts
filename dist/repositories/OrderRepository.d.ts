import { PrismaClient, OrderStatus as PrismaOrderStatus, PaymentStatus as PrismaPaymentStatus } from "@prisma/client";
import { BaseRepository } from "./BaseRepository";
import { Order, OrderItem, OrderTimelineEvent, OrderListQuery, OrderSummary, OrderListResponse, OrderAnalytics, PaginationParams } from "../types";
export interface CreateOrderData {
    orderNumber: string;
    userId: string;
    status?: PrismaOrderStatus;
    subtotal: number;
    tax?: number;
    shippingCost?: number;
    discount?: number;
    total: number;
    currency?: string;
    paymentStatus?: PrismaPaymentStatus;
    paymentMethod?: string;
    paymentReference?: string;
    notes?: string;
    shippingAddressId?: string;
    billingAddressId?: string;
}
export interface UpdateOrderData {
    status?: PrismaOrderStatus;
    paymentStatus?: PrismaPaymentStatus;
    paymentMethod?: string;
    paymentReference?: string;
    notes?: string;
}
export interface OrderWithDetails extends Order {
    items?: OrderItem[];
    timeline?: OrderTimelineEvent[];
    customer: {
        id: string;
        firstName: string;
        lastName: string;
        email?: string;
        phoneNumber: string;
        totalOrders: number;
        totalSpent: number;
    };
}
export declare class OrderRepository extends BaseRepository<Order, CreateOrderData, UpdateOrderData> {
    constructor(prisma: PrismaClient);
    /**
     * Find order by order number
     */
    findByOrderNumber(orderNumber: string): Promise<OrderWithDetails | null>;
    /**
     * Create order with items
     */
    createOrderWithItems(orderData: CreateOrderData, items: Array<{
        productId: string;
        quantity: number;
        price: number;
        total: number;
    }>): Promise<OrderWithDetails>;
    /**
     * Update order status with timeline
     */
    updateOrderStatus(orderId: string, statusData: {
        status: UpdateOrderData["status"];
        adminNotes?: string;
        updatedBy?: string;
    }): Promise<OrderWithDetails>;
    /**
     * Get orders with advanced filtering
     */
    getOrdersWithFilters(queryParams: OrderListQuery): Promise<OrderListResponse>;
    /**
     * Get user's order history
     */
    getUserOrderHistory(userId: string, pagination?: PaginationParams): Promise<{
        data: OrderSummary[];
        pagination: any;
    }>;
    /**
     * Get recent orders
     */
    getRecentOrders(limit?: number, status?: string): Promise<OrderSummary[]>;
    /**
     * Get orders requiring attention
     */
    getOrdersRequiringAttention(): Promise<{
        pendingPayment: OrderSummary[];
        processingDelayed: OrderSummary[];
        shippingDelayed: OrderSummary[];
        lowStockOrders: OrderSummary[];
    }>;
    /**
     * Get order analytics
     */
    getOrderAnalytics(startDate?: Date, endDate?: Date): Promise<OrderAnalytics>;
    /**
     * Cancel order
     */
    cancelOrder(orderId: string, reason: string, cancelledBy?: string): Promise<OrderWithDetails>;
    /**
     * Find verified purchase for review
     */
    findVerifiedPurchase(userId: string, productId: string): Promise<{
        orderId: string;
    } | null>;
    /**
     * Generate unique order number
     */
    generateOrderNumber(): Promise<string>;
    private getCustomerOrderStats;
    private getStatusDescription;
    private getOrdersSummary;
    private getOrderSummaries;
    private getRevenue;
    private getOrdersByStatus;
    private getTopProducts;
    private getTopCategories;
    private getTopCustomers;
    private getRevenueByMonth;
}
//# sourceMappingURL=OrderRepository.d.ts.map