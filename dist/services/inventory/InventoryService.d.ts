import { BaseService } from "../BaseService";
import { ProductRepository } from "../../repositories/ProductRepository";
import { Inventory, InventoryStatus, UpdateInventoryRequest, BulkInventoryUpdateRequest, InventoryAdjustmentRequest, PaginationMeta } from "../../types";
import { CacheService } from "../cache/CacheService";
import { NotificationService } from "../notifications/NotificationService";
interface InventoryListFilter {
    status?: InventoryStatus;
    lowStock?: boolean;
    outOfStock?: boolean;
    categoryId?: string;
    searchTerm?: string;
    page?: number;
    limit?: number;
}
interface InventorySummary {
    totalProducts: number;
    totalValue: number;
    lowStockProducts: number;
    outOfStockProducts: number;
}
export declare class InventoryService extends BaseService {
    private productRepository;
    private cacheService;
    private notificationService;
    constructor(productRepository: ProductRepository, cacheService: CacheService, notificationService: NotificationService);
    /**
     * Get inventory details for a specific product
     */
    getProductInventory(productId: string): Promise<Inventory>;
    /**
     * Get inventory list with filtering and pagination
     */
    getInventoryList(filters?: InventoryListFilter): Promise<{
        inventories: any[];
        pagination: PaginationMeta;
        summary: InventorySummary;
    }>;
    /**
     * Update inventory for a single product
     */
    updateInventory(productId: string, request: UpdateInventoryRequest, userId: string): Promise<Inventory>;
    /**
     * Bulk update inventory for multiple products
     */
    bulkUpdateInventory(request: BulkInventoryUpdateRequest, userId: string): Promise<{
        successful: number;
        failed: number;
        errors: string[];
    }>;
    /**
     * Get low stock alerts
     */
    getLowStockAlerts(): Promise<Array<{
        productId: string;
        productName: string;
        currentStock: number;
        threshold: number;
        categoryName: string;
    }>>;
    /**
     * Perform inventory adjustment
     */
    performInventoryAdjustment(request: InventoryAdjustmentRequest, userId: string): Promise<Inventory>;
    private checkLowStockAlert;
    private getInventorySummary;
    private clearInventoryCache;
    private transformProductToInventory;
    private transformProductToInventoryListItem;
}
export {};
//# sourceMappingURL=InventoryService.d.ts.map