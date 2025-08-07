import { Response } from "express";
import { BaseController } from "../BaseController";
import { OrderService } from "../../services/orders/OrderService";
import { AuthenticatedRequest } from "../../types/auth.types";
export declare class OrderController extends BaseController {
    private orderService;
    constructor(orderService: OrderService);
    /**
     * Create new order from cart
     * POST /api/v1/orders/create
     */
    createOrder: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Get user's order history
     * GET /api/v1/orders
     */
    getUserOrders: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Get order details by ID
     * GET /api/v1/orders/:orderId
     */
    getOrderById: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Get order by order number
     * GET /api/v1/orders/number/:orderNumber
     */
    getOrderByNumber: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Get order summary statistics for user
     * GET /api/v1/orders/stats
     */
    getOrderStats: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Cancel an order
     * POST /api/v1/orders/:orderId/cancel
     */
    cancelOrder: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Update order status (Admin only)
     * PUT /api/v1/orders/:orderId/status
     */
    updateOrderStatus: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Get all orders (Admin only)
     * GET /api/v1/orders/admin/all
     */
    getAllOrders: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    private validateCreateOrderRequest;
    /**
     * Track order status and shipping information
     * GET /api/v1/orders/:id/tracking
     */
    trackOrder: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Get order timeline/history of status changes
     * GET /api/v1/orders/:id/timeline
     */
    getOrderTimeline: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Get downloadable invoice (PDF)
     * GET /api/v1/orders/:id/invoice
     */
    getInvoice: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Verify payment status for order
     * GET /api/v1/orders/:id/payment/verify
     */
    verifyPayment: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Reorder (create new order from existing order items)
     * POST /api/v1/orders/:id/reorder
     */
    reorder: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Request return/refund for order items
     * POST /api/v1/orders/:id/return
     */
    requestReturn: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    private getTrackingLocation;
    private calculateEstimatedDelivery;
    private getStatusDescription;
}
//# sourceMappingURL=OrderController.d.ts.map