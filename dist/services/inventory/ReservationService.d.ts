import { BaseService } from "../BaseService";
import { StockReservation, ReserveStockRequest, ReleaseReservationRequest } from "../../types";
interface ReservationResult {
    success: boolean;
    reservationId?: string;
    message: string;
    availableQuantity?: number;
    reservedQuantity?: number;
}
interface BulkReservationRequest {
    items: Array<{
        productId: string;
        quantity: number;
    }>;
    orderId?: string;
    cartId?: string;
    reason: string;
    expirationMinutes?: number;
}
interface BulkReservationResult {
    success: boolean;
    reservations: Array<{
        productId: string;
        success: boolean;
        reservationId?: string;
        message: string;
    }>;
    totalReserved: number;
    failedItems: number;
}
export declare class ReservationService extends BaseService {
    private cacheService;
    constructor(cacheService?: any);
    /**
     * Reserve stock for a single product
     */
    reserveStock(request: ReserveStockRequest): Promise<ReservationResult>;
    /**
     * Reserve stock for multiple products (bulk operation)
     */
    bulkReserveStock(request: BulkReservationRequest): Promise<BulkReservationResult>;
    /**
     * Release a specific reservation
     */
    releaseReservation(request: ReleaseReservationRequest): Promise<ReservationResult>;
    /**
     * Release all reservations for an order or cart
     */
    releaseAllReservations(orderId?: string, cartId?: string, reason?: string): Promise<{
        releasedCount: number;
        totalQuantity: number;
    }>;
    /**
     * Get active reservations for a product
     */
    getProductReservations(productId: string): Promise<StockReservation[]>;
    /**
     * Get reservations for an order or cart
     */
    getReservations(orderId?: string, cartId?: string): Promise<StockReservation[]>;
    /**
     * Clean up expired reservations
     */
    cleanupExpiredReservations(): Promise<{
        cleanedUp: number;
        totalQuantity: number;
    }>;
    /**
     * Extend reservation expiration time
     */
    extendReservation(reservationId: string, additionalMinutes?: number): Promise<ReservationResult>;
    /**
     * Convert reservation to sale (when order is confirmed)
     */
    convertReservationToSale(orderId: string, userId: string): Promise<{
        convertedCount: number;
        totalQuantity: number;
    }>;
    /**
     * Get reservation statistics
     */
    getReservationStats(): Promise<{
        totalActiveReservations: number;
        totalReservedQuantity: number;
        expiringSoon: number;
        byProduct: Array<{
            productId: string;
            productName: string;
            reservedQuantity: number;
            reservationCount: number;
        }>;
    }>;
    private calculateExpirationTime;
    private updateReservedQuantity;
    private clearReservationCache;
    private transformReservation;
}
export {};
//# sourceMappingURL=ReservationService.d.ts.map