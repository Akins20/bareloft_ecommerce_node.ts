import { PrismaClient } from "@prisma/client";
import { BaseRepository } from "./BaseRepository";
import { InventoryMovement, StockReservation, InventoryMovementType, InventoryStatus, BulkInventoryUpdateRequest, ReserveStockRequest, ReleaseReservationRequest, InventoryListResponse, InventoryAlert, PaginationParams } from "../types";
export interface CreateInventoryData {
    productId: string;
    quantity?: number;
    reservedQuantity?: number;
    lowStockThreshold?: number;
    reorderPoint?: number;
    reorderQuantity?: number;
    status?: InventoryStatus;
    trackInventory?: boolean;
    allowBackorder?: boolean;
    averageCost?: number;
    lastCost?: number;
    lastRestockedAt?: Date;
}
export interface UpdateInventoryData {
    stock?: number;
    quantity?: number;
    reservedQuantity?: number;
    lowStockThreshold?: number;
    reorderPoint?: number;
    reorderQuantity?: number;
    status?: InventoryStatus;
    trackInventory?: boolean;
    trackQuantity?: boolean;
    allowBackorder?: boolean;
    averageCost?: number;
    lastCost?: number;
    lastRestockedAt?: Date;
    lastSoldAt?: Date;
}
export interface CreateMovementData {
    inventoryId: string;
    productId: string;
    type: InventoryMovementType;
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    unitCost?: number;
    totalCost?: number;
    referenceType?: string;
    referenceId?: string;
    reason?: string;
    notes?: string;
    metadata?: any;
    createdBy: string;
    batchId?: string;
}
export interface InventoryWithDetails {
    id: string;
    productId: string;
    quantity: number;
    reservedQuantity: number;
    lowStockThreshold: number;
    reorderPoint: number;
    reorderQuantity: number;
    status: InventoryStatus;
    trackInventory: boolean;
    allowBackorder: boolean;
    averageCost: number;
    lastCost: number;
    lastRestockedAt?: Date;
    lastSoldAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    product: {
        id: string;
        name: string;
        sku?: string;
        price: number;
        isActive: boolean;
    };
    availableQuantity: number;
    isLowStock: boolean;
    isOutOfStock: boolean;
    lastMovement?: Date;
    totalValue: number;
}
export declare class InventoryRepository extends BaseRepository<any, CreateInventoryData, UpdateInventoryData> {
    constructor(prisma: PrismaClient);
    /**
     * Find inventory by product ID
     */
    findByProductId(productId: string): Promise<InventoryWithDetails | null>;
    /**
     * Get or create inventory for product
     */
    getOrCreateInventory(productId: string): Promise<InventoryWithDetails>;
    /**
     * Update inventory quantity with movement tracking
     */
    updateInventoryQuantity(productId: string, adjustment: {
        type: InventoryMovementType;
        quantity: number;
        unitCost?: number;
        reason?: string;
        notes?: string;
        referenceType?: string;
        referenceId?: string;
        createdBy: string;
    }): Promise<InventoryWithDetails>;
    /**
     * Reserve stock for order
     */
    reserveStock(request: ReserveStockRequest): Promise<StockReservation>;
    /**
     * Release stock reservation
     */
    releaseReservation(request: ReleaseReservationRequest): Promise<boolean>;
    /**
     * Get inventory list with filtering
     */
    getInventoryList(filters?: {
        status?: InventoryStatus;
        lowStock?: boolean;
        outOfStock?: boolean;
        categoryId?: string;
        search?: string;
    }, pagination?: PaginationParams): Promise<InventoryListResponse>;
    /**
     * Get low stock alerts
     */
    getLowStockAlerts(): Promise<InventoryAlert[]>;
    /**
     * Get inventory movements with filtering
     */
    getInventoryMovements(filters?: {
        productId?: string;
        type?: InventoryMovementType;
        startDate?: Date;
        endDate?: Date;
        createdBy?: string;
    }, pagination?: PaginationParams): Promise<{
        data: Array<InventoryMovement & {
            productName: string;
            productSku: string;
        }>;
        pagination: any;
    }>;
    /**
     * Bulk inventory adjustment
     */
    bulkInventoryAdjustment(request: BulkInventoryUpdateRequest, createdBy: string): Promise<{
        processed: number;
        errors: Array<{
            productId: string;
            error: string;
        }>;
    }>;
    /**
     * Clean up expired reservations
     */
    cleanupExpiredReservations(): Promise<{
        releasedCount: number;
    }>;
    private isInboundMovement;
    private calculateAverageCost;
    private calculateInventoryStatus;
    private transformInventoryWithDetails;
    private transformProductToInventoryWithDetails;
    private mapToSchemaMovementType;
    private getInventorySummary;
}
//# sourceMappingURL=InventoryRepository.d.ts.map