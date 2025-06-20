import { PrismaClient } from '@prisma/client';
import { BaseEntity, PaginationParams, PaginationMeta } from '@/types';
export interface Repository<T extends BaseEntity> {
    findById(id: string): Promise<T | null>;
    findAll(params?: PaginationParams): Promise<T[]>;
    findWithPagination(params: PaginationParams): Promise<{
        items: T[];
        pagination: PaginationMeta;
    }>;
    create(data: Omit<T, keyof BaseEntity>): Promise<T>;
    update(id: string, data: Partial<T>): Promise<T>;
    delete(id: string): Promise<boolean>;
    count(where?: any): Promise<number>;
    exists(id: string): Promise<boolean>;
}
export declare abstract class BaseRepository<T extends BaseEntity> implements Repository<T> {
    protected db: PrismaClient;
    protected abstract modelName: string;
    constructor(database?: PrismaClient);
    protected get model(): any;
    findById(id: string): Promise<T | null>;
    findAll(params?: PaginationParams): Promise<T[]>;
    findWithPagination(params: PaginationParams): Promise<{
        items: T[];
        pagination: PaginationMeta;
    }>;
    create(data: Omit<T, keyof BaseEntity>): Promise<T>;
    update(id: string, data: Partial<T>): Promise<T>;
    delete(id: string): Promise<boolean>;
    count(where?: any): Promise<number>;
    exists(id: string): Promise<boolean>;
    protected executeQuery(query: any): Promise<any>;
    createMany(data: Omit<T, keyof BaseEntity>[]): Promise<{
        count: number;
    }>;
    findByIds(ids: string[]): Promise<T[]>;
    findWhere(where: any, options?: {
        orderBy?: any;
        take?: number;
        skip?: number;
        include?: any;
    }): Promise<T[]>;
    findFirst(where: any, options?: {
        orderBy?: any;
        include?: any;
    }): Promise<T | null>;
    upsert(where: any, update: any, create: any): Promise<T>;
}
//# sourceMappingURL=BaseRepositories.d.ts.map