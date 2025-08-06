import { BaseService } from "../BaseService";
import { InventoryRepository } from "../../repositories/InventoryRepository";
import { MovementType } from "@prisma/client";
import { CacheService } from "../cache/CacheService";
import { NotificationService } from "../notifications/NotificationService";
interface StockCheckResult {
    productId: string;
    available: boolean;
    currentStock: number;
    reservedStock: number;
    availableStock: number;
    isLowStock: boolean;
    isOutOfStock: boolean;
}
interface StockUpdateData {
    productId: string;
    quantity: number;
    type: MovementType;
    reason?: string;
    reference?: string;
    referenceId?: string;
    unitCost?: number;
    userId: string;
}
interface BulkStockCheck {
    productId: string;
    requestedQuantity: number;
}
interface BulkStockResult {
    productId: string;
    available: boolean;
    availableQuantity: number;
    requestedQuantity: number;
    shortfall?: number;
}
export declare class StockService extends BaseService {
    private inventoryRepository;
    private cacheService;
    private notificationService;
    constructor(inventoryRepository: InventoryRepository, cacheService: CacheService, notificationService: NotificationService);
    /**
     * Check stock availability for a single product
     */
    checkStockAvailability(productId: string, requestedQuantity?: number): Promise<StockCheckResult>;
    /**
     * Check stock availability for multiple products
     */
    bulkCheckStockAvailability(requests: BulkStockCheck[]): Promise<BulkStockResult[]>;
    /**
     * Update stock levels with movement tracking
     */
    updateStock(data: StockUpdateData): Promise<void>;
    /**
     * Get current stock levels for multiple products
     */
    getCurrentStockLevels(productIds: string[]): Promise<Map<string, number>>;
    /**
     * Decrease stock (for sales/orders)
     */
    decreaseStock(productId: string, quantity: number, orderId: string, userId: string): Promise<void>;
    /**
     * Increase stock (for restocking)
     */
    increaseStock(productId: string, quantity: number, unitCost: number, reason: string, userId: string): Promise<void>;
    /**
     * Handle returns (increase stock)
     */
    handleReturn(productId: string, quantity: number, orderId: string, userId: string): Promise<void>;
    /**
     * Mark stock as damaged (decrease without sale)
     */
    markAsDamaged(productId: string, quantity: number, reason: string, userId: string): Promise<void>;
    /**
     * Transfer stock between locations (future feature)
     */
    transferStock(productId: string, quantity: number, fromLocation: string, toLocation: string, userId: string): Promise<void>;
    /**
     * Get stock movement history for a product
     */
    getStockMovementHistory(productId: string, limit?: number): Promise<any[]>;
    /**
     * Get low stock products
     */
    getLowStockProducts(): Promise<any[]>;
    /**
     * Get out of stock products
     */
    getOutOfStockProducts(): Promise<any[]>;
    private getReservedStock;
    private isInboundMovement;
    private isOutboundMovement;
    private checkStockAlerts;
    private sendLowStockAlert;
    private sendOutOfStockAlert;
    private calculateUrgency;
    private clearStockCache;
}
export {};
//# sourceMappingURL=StockService.d.ts.map