import { BaseService } from "../BaseService";
import { InventoryMovement, InventoryMovementType, InventoryAdjustmentRequest, PaginationMeta } from "../../types";
import { CacheService } from "../cache/CacheService";
interface MovementFilter {
    productId?: string;
    type?: InventoryMovementType;
    startDate?: Date;
    endDate?: Date;
    createdBy?: string;
    page?: number;
    limit?: number;
}
export declare class MovementService extends BaseService {
    private cacheService;
    constructor(cacheService: CacheService);
    /**
     * Record a new inventory movement
     */
    recordMovement(request: InventoryAdjustmentRequest): Promise<InventoryMovement>;
    /**
     * Get movement history with filtering and pagination
     */
    getMovements(filters?: MovementFilter): Promise<{
        movements: InventoryMovement[];
        pagination: PaginationMeta;
    }>;
    /**
     * Get movement summary for a specific product
     */
    getProductMovementSummary(productId: string, days?: number): Promise<{
        totalMovements: number;
        totalInbound: number;
        totalOutbound: number;
        netChange: number;
        recentMovements: InventoryMovement[];
    }>;
    /**
     * Get stock movement history for a product
     */
    getStockMovementHistory(productId: string, limit?: number): Promise<InventoryMovement[]>;
    private calculateNewQuantity;
    private isInboundMovement;
    private isOutboundMovement;
    private clearMovementCache;
    private transformMovement;
}
export {};
//# sourceMappingURL=MovementService.d.ts.map