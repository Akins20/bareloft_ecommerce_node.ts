import { PrismaClient } from "@prisma/client";
import { PaginationParams, PaginationMeta } from "../types";
export declare abstract class BaseRepository<T, CreateData, UpdateData> {
    protected prisma: PrismaClient;
    protected modelName: string;
    constructor(prisma: PrismaClient, modelName: string);
    /**
     * Find by ID
     */
    findById(id: string, include?: any): Promise<T | null>;
    /**
     * Find first record matching criteria
     */
    findFirst(where: any, include?: any): Promise<T | null>;
    /**
     * Find many records with pagination
     */
    findMany(where?: any, options?: {
        include?: any;
        orderBy?: any;
        pagination?: PaginationParams;
    }): Promise<{
        data: T[];
        pagination: PaginationMeta;
    }>;
    /**
     * Create new record
     */
    create(data: CreateData, include?: any): Promise<T>;
    /**
     * Update record by ID
     */
    update(id: string, data: UpdateData, include?: any): Promise<T>;
    /**
     * Delete record by ID (soft delete if supported)
     */
    delete(id: string): Promise<boolean>;
    /**
     * Count records matching criteria
     */
    count(where?: any): Promise<number>;
    /**
     * Check if record exists
     */
    exists(where: any): Promise<boolean>;
    /**
     * Create many records at once
     */
    createMany(data: CreateData[]): Promise<{
        count: number;
    }>;
    /**
     * Update many records matching criteria
     */
    updateMany(where: any, data: Partial<UpdateData>): Promise<{
        count: number;
    }>;
    /**
     * Delete many records matching criteria
     */
    deleteMany(where: any): Promise<{
        count: number;
    }>;
    /**
     * Find records with complex search
     */
    search(searchTerm: string, searchFields: string[], where?: any, options?: {
        include?: any;
        orderBy?: any;
        pagination?: PaginationParams;
    }): Promise<{
        data: T[];
        pagination: PaginationMeta;
        searchMeta: {
            term: string;
            fields: string[];
            totalResults: number;
        };
    }>;
    /**
     * Execute raw transaction
     */
    transaction<R>(callback: (prisma: PrismaClient) => Promise<R>): Promise<R>;
    /**
     * Batch operations with transaction
     */
    batchOperations(operations: Array<{
        type: "create" | "update" | "delete";
        data?: any;
        where?: any;
    }>): Promise<any[]>;
    /**
     * Get aggregated data
     */
    aggregate(where: any | undefined, aggregations: {
        _count?: any;
        _sum?: any;
        _avg?: any;
        _min?: any;
        _max?: any;
    }): Promise<any>;
    /**
     * Group records by field
     */
    groupBy(by: string[], where?: any, having?: any, aggregations?: {
        _count?: any;
        _sum?: any;
        _avg?: any;
        _min?: any;
        _max?: any;
    }): Promise<any[]>;
    /**
     * Find records created in date range
     */
    findByDateRange(startDate: Date, endDate: Date, options?: {
        include?: any;
        orderBy?: any;
        pagination?: PaginationParams;
    }): Promise<{
        data: T[];
        pagination: PaginationMeta;
    }>;
    /**
     * Find recent records
     */
    findRecent(days?: number, options?: {
        include?: any;
        orderBy?: any;
        pagination?: PaginationParams;
    }): Promise<{
        data: T[];
        pagination: PaginationMeta;
    }>;
    /**
     * Get the Prisma model for this repository
     */
    protected getModel(): any;
    /**
     * Check if model supports soft delete
     */
    protected supportsSoftDelete(): boolean;
    /**
     * Handle repository errors
     */
    protected handleError(message: string, error: any): void;
    /**
     * Build pagination metadata
     */
    protected buildPagination(page: number, limit: number, total: number): PaginationMeta;
    /**
     * Validate pagination parameters
     */
    protected validatePagination(pagination?: PaginationParams): {
        page: number;
        limit: number;
    };
    /**
     * Build order by clause from sort parameters
     */
    protected buildOrderBy(sortBy?: string, sortOrder?: "asc" | "desc"): any;
    /**
     * Build where clause for soft delete support
     */
    protected buildWhereWithSoftDelete(where?: any): any;
}
//# sourceMappingURL=BaseRepository.d.ts.map