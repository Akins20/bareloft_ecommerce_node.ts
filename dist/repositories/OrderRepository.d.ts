import { PrismaClient } from "@prisma/client";
import { BaseRepository } from "./BaseRepository";
import { Order, OrderItem, OrderTimelineEvent, OrderListQuery, OrderSummary, OrderListResponse, OrderAnalytics, PaginationParams } from "../types";
export interface CreateOrderData {
    orderNumber: string;
    userId: string;
    status?: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
    subtotal: number;
    taxAmount?: number;
    shippingAmount?: number;
    discountAmount?: number;
    totalAmount: number;
    currency?: string;
    paymentStatus?: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "PARTIAL_REFUND";
    paymentMethod?: "CARD" | "BANK_TRANSFER" | "USSD" | "WALLET";
    paymentReference?: string;
    shippingAddress: any;
    billingAddress: any;
    customerNotes?: string;
    adminNotes?: string;
    trackingNumber?: string;
    estimatedDelivery?: Date;
}
export interface UpdateOrderData {
    status?: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
    paymentStatus?: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "PARTIAL_REFUND";
    paymentMethod?: "CARD" | "BANK_TRANSFER" | "USSD" | "WALLET";
    paymentReference?: string;
    adminNotes?: string;
    trackingNumber?: string;
    estimatedDelivery?: Date;
    paidAt?: Date;
    shippedAt?: Date;
    deliveredAt?: Date;
}
export interface OrderWithDetails extends Order {
    items: OrderItem[];
    timeline: OrderTimelineEvent[];
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
        productName: string;
        productSku: string;
        productImage?: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
    }>): Promise<OrderWithDetails>;
    /**
     * Update order status with timeline
     */
    updateOrderStatus(orderId: string, statusData: {
        status: UpdateOrderData["status"];
        adminNotes?: string;
        trackingNumber?: string;
        estimatedDelivery?: Date;
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