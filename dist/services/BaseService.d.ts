import { BaseEntity, PaginationParams, PaginationMeta } from '@/types';
import { Repository } from '@/repositories/BaseRepository';
export interface Service<T extends BaseEntity> {
    getById(id: string): Promise<T>;
    getAll(params?: PaginationParams): Promise<{
        items: T[];
        pagination?: PaginationMeta;
    }>;
    create(data: any): Promise<T>;
    update(id: string, data: any): Promise<T>;
    delete(id: string): Promise<boolean>;
    exists(id: string): Promise<boolean>;
}
export declare abstract class BaseService<T extends BaseEntity> implements Service<T> {
    protected repository: Repository<T>;
    protected entityName: string;
    constructor(repository: Repository<T>, entityName: string);
    getById(id: string): Promise<T>;
    getAll(params?: PaginationParams): Promise<{
        items: T[];
        pagination?: PaginationMeta;
    }>;
    create(data: any): Promise<T>;
    update(id: string, data: any): Promise<T>;
    delete(id: string): Promise<boolean>;
    exists(id: string): Promise<boolean>;
    getCount(where?: any): Promise<number>;
    createMany(data: any[]): Promise<{
        count: number;
    }>;
    getByIds(ids: string[]): Promise<T[]>;
    protected validateId(id: string): void;
    protected validateCreateData(data: any): Promise<void>;
    protected validateUpdateData(data: any): Promise<void>;
    protected validateDelete(id: string): Promise<void>;
    protected createPaginationMeta(currentPage: number, totalItems: number, itemsPerPage: number): PaginationMeta;
    protected sanitizeSearchQuery(query?: string): string | undefined;
    protected validatePaginationParams(params: PaginationParams): {
        page: number;
        limit: number;
        sortBy?: string;
        sortOrder: 'asc' | 'desc';
    };
    protected handleDatabaseError(error: any, operation: string): never;
    protected handleValidationError(errors: any[]): never;
}
//# sourceMappingURL=BaseService.d.ts.map