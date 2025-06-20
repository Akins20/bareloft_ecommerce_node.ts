import { PrismaClient } from '@prisma/client';
import { BaseEntity, PaginationParams, PaginationMeta } from '../types';
import { prisma } from '../database/connection';
import { logger } from '../utils/logger/winston';

// Generic repository interface (keeping your existing interface)
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

// Abstract base repository class (enhanced version of your existing class)
export abstract class BaseRepository<T extends BaseEntity> implements Repository<T> {
  protected db: PrismaClient;
  protected abstract modelName: string;

  constructor(database: PrismaClient = prisma) {
    this.db = database;
  }

  // Get the Prisma model delegate (keeping your existing method)
  protected get model() {
    return (this.db as any)[this.modelName];
  }

  // Find entity by ID (enhanced with better logging)
  async findById(id: string): Promise<T | null> {
    try {
      logger.debug(`Finding ${this.modelName} by ID:`, { id });
      const entity = await this.model.findUnique({
        where: { id }
      });
      
      if (entity) {
        logger.debug(`Found ${this.modelName}:`, { id });
      } else {
        logger.debug(`${this.modelName} not found:`, { id });
      }
      
      return entity;
    } catch (error) {
      logger.error(`Error finding ${this.modelName} by ID ${id}:`, error);
      throw error;
    }
  }

  // Find all entities (enhanced with better defaults)
  async findAll(params?: PaginationParams): Promise<T[]> {
    try {
      logger.debug(`Finding all ${this.modelName}:`, { params });
      const entities = await this.model.findMany({
        orderBy: params?.sortBy ? {
          [params.sortBy]: params.sortOrder || 'desc'
        } : {
          createdAt: 'desc'
        }
      });
      
      logger.debug(`Found ${entities.length} ${this.modelName} records`);
      return entities;
    } catch (error) {
      logger.error(`Error finding all ${this.modelName}:`, error);
      throw error;
    }
  }

  // Find entities with pagination (enhanced with better validation)
  async findWithPagination(params: PaginationParams): Promise<{
    items: T[];
    pagination: PaginationMeta;
  }> {
    try {
      const page = Math.max(params.page || 1, 1); // Ensure page is at least 1
      const limit = Math.min(Math.max(params.limit || 20, 1), 100); // Between 1-100
      const skip = (page - 1) * limit;

      logger.debug(`Finding ${this.modelName} with pagination:`, { page, limit, skip });

      const [items, totalItems] = await Promise.all([
        this.model.findMany({
          take: limit,
          skip,
          orderBy: params.sortBy ? {
            [params.sortBy]: params.sortOrder || 'desc'
          } : {
            createdAt: 'desc'
          }
        }),
        this.model.count()
      ]);

      const totalPages = Math.ceil(totalItems / limit);

      const pagination: PaginationMeta = {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      };

      logger.debug(`Found ${items.length} of ${totalItems} ${this.modelName} records`);
      return { items, pagination };
    } catch (error) {
      logger.error(`Error finding ${this.modelName} with pagination:`, error);
      throw error;
    }
  }

  // Create new entity (enhanced with better logging)
  async create(data: Omit<T, keyof BaseEntity>): Promise<T> {
    try {
      logger.debug(`Creating ${this.modelName}:`, { data });
      const entity = await this.model.create({
        data
      });
      
      logger.info(`Created ${this.modelName}:`, { id: entity.id });
      return entity;
    } catch (error) {
      logger.error(`Error creating ${this.modelName}:`, error);
      throw error;
    }
  }

  // Update entity (enhanced with better logging)
  async update(id: string, data: Partial<T>): Promise<T> {
    try {
      logger.debug(`Updating ${this.modelName}:`, { id, data });
      const entity = await this.model.update({
        where: { id },
        data
      });
      
      logger.info(`Updated ${this.modelName}:`, { id });
      return entity;
    } catch (error) {
      logger.error(`Error updating ${this.modelName} with ID ${id}:`, error);
      throw error;
    }
  }

  // Delete entity (enhanced with better error handling)
  async delete(id: string): Promise<boolean> {
    try {
      logger.debug(`Deleting ${this.modelName}:`, { id });
      await this.model.delete({
        where: { id }
      });
      
      logger.info(`Deleted ${this.modelName}:`, { id });
      return true;
    } catch (error) {
      logger.error(`Error deleting ${this.modelName} with ID ${id}:`, error);
      return false;
    }
  }

  // Count entities (keeping your existing method)
  async count(where?: any): Promise<number> {
    try {
      const count = await this.model.count({ where });
      logger.debug(`Counted ${count} ${this.modelName} records`);
      return count;
    } catch (error) {
      logger.error(`Error counting ${this.modelName}:`, error);
      throw error;
    }
  }

  // Check if entity exists (keeping your existing method)
  async exists(id: string): Promise<boolean> {
    try {
      const entity = await this.model.findUnique({
        where: { id },
        select: { id: true }
      });
      const exists = !!entity;
      logger.debug(`${this.modelName} exists check:`, { id, exists });
      return exists;
    } catch (error) {
      logger.error(`Error checking existence of ${this.modelName} with ID ${id}:`, error);
      return false;
    }
  }

  // Execute custom query (keeping your existing method with better logging)
  protected async executeQuery(query: any): Promise<any> {
    try {
      logger.debug(`Executing custom query for ${this.modelName}`);
      const result = await query;
      logger.debug(`Custom query completed for ${this.modelName}`);
      return result;
    } catch (error) {
      logger.error(`Error executing custom query for ${this.modelName}:`, error);
      throw error;
    }
  }

  // Batch operations (enhanced with better logging)
  async createMany(data: Omit<T, keyof BaseEntity>[]): Promise<{ count: number }> {
    try {
      logger.debug(`Creating many ${this.modelName}:`, { count: data.length });
      const result = await this.model.createMany({
        data,
        skipDuplicates: true
      });
      
      logger.info(`Created ${result.count} ${this.modelName} records`);
      return result;
    } catch (error) {
      logger.error(`Error creating many ${this.modelName}:`, error);
      throw error;
    }
  }

  // Find entities by multiple IDs (keeping your existing method)
  async findByIds(ids: string[]): Promise<T[]> {
    try {
      logger.debug(`Finding ${this.modelName} by IDs:`, { count: ids.length });
      const entities = await this.model.findMany({
        where: {
          id: {
            in: ids
          }
        }
      });
      
      logger.debug(`Found ${entities.length} ${this.modelName} records by IDs`);
      return entities;
    } catch (error) {
      logger.error(`Error finding ${this.modelName} by IDs:`, error);
      throw error;
    }
  }

  // Find with custom where clause (keeping your existing method)
  async findWhere(where: any, options?: {
    orderBy?: any;
    take?: number;
    skip?: number;
    include?: any;
  }): Promise<T[]> {
    try {
      logger.debug(`Finding ${this.modelName} with custom where:`, { where, options });
      const entities = await this.model.findMany({
        where,
        ...options
      });
      
      logger.debug(`Found ${entities.length} ${this.modelName} records with custom where`);
      return entities;
    } catch (error) {
      logger.error(`Error finding ${this.modelName} with custom where:`, error);
      throw error;
    }
  }

  // Find first matching entity (keeping your existing method)
  async findFirst(where: any, options?: {
    orderBy?: any;
    include?: any;
  }): Promise<T | null> {
    try {
      logger.debug(`Finding first ${this.modelName}:`, { where, options });
      const entity = await this.model.findFirst({
        where,
        ...options
      });
      
      logger.debug(`Found first ${this.modelName}:`, { found: !!entity });
      return entity;
    } catch (error) {
      logger.error(`Error finding first ${this.modelName}:`, error);
      throw error;
    }
  }

  // Upsert operation (keeping your existing method with better logging)
  async upsert(where: any, update: any, create: any): Promise<T> {
    try {
      logger.debug(`Upserting ${this.modelName}:`, { where });
      const entity = await this.model.upsert({
        where,
        update,
        create
      });
      
      logger.info(`Upserted ${this.modelName}:`, { id: entity.id });
      return entity;
    } catch (error) {
      logger.error(`Error upserting ${this.modelName}:`, error);
      throw error;
    }
  }

  // Additional helper methods for enhanced functionality
  
  // Transaction support
  async transaction<TResult>(
    callback: (prisma: PrismaClient) => Promise<TResult>
  ): Promise<TResult> {
    try {
      logger.debug(`Starting transaction for ${this.modelName}`);
      const result = await this.db.$transaction(callback);
      logger.debug(`Transaction completed for ${this.modelName}`);
      return result;
    } catch (error) {
      logger.error(`Transaction failed for ${this.modelName}:`, error);
      throw error;
    }
  }

  // Health check for the repository
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    totalRecords?: number;
    error?: string;
  }> {
    try {
      const totalRecords = await this.count();
      return {
        status: 'healthy',
        totalRecords,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Soft delete support (if model has deletedAt field)
  async softDelete(id: string): Promise<boolean> {
    try {
      logger.debug(`Soft deleting ${this.modelName}:`, { id });
      
      // Try to update with deletedAt timestamp
      await this.model.update({
        where: { id },
        data: { deletedAt: new Date() }
      });
      
      logger.info(`Soft deleted ${this.modelName}:`, { id });
      return true;
    } catch (error) {
      // If deletedAt field doesn't exist, fall back to hard delete
      logger.warn(`Soft delete not supported for ${this.modelName}, falling back to hard delete`);
      return await this.delete(id);
    }
  }
}