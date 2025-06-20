// src/services/BaseService.ts
import { BaseEntity, PaginationParams, PaginationMeta } from '@/types';
import { Repository } from '@/repositories/BaseRepository';
import { AppError, HTTP_STATUS, ERROR_CODES } from '@/types/api.types';

// Generic service interface
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

// Abstract base service class
export abstract class BaseService<T extends BaseEntity> implements Service<T> {
  protected repository: Repository<T>;
  protected entityName: string;

  constructor(repository: Repository<T>, entityName: string) {
    this.repository = repository;
    this.entityName = entityName;
  }

  // Get entity by ID
  async getById(id: string): Promise<T> {
    try {
      this.validateId(id);
      
      const entity = await this.repository.findById(id);
      if (!entity) {
        throw new AppError(
          `${this.entityName} not found`,
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }
      
      return entity;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        `Error retrieving ${this.entityName}`,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  // Get all entities with optional pagination
  async getAll(params?: PaginationParams): Promise<{
    items: T[];
    pagination?: PaginationMeta;
  }> {
    try {
      if (params?.page || params?.limit) {
        const result = await this.repository.findWithPagination(params);
        return {
          items: result.items,
          pagination: result.pagination
        };
      }
      
      const items = await this.repository.findAll(params);
      return { items };
    } catch (error) {
      throw new AppError(
        `Error retrieving ${this.entityName} list`,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  // Create new entity
  async create(data: any): Promise<T> {
    try {
      await this.validateCreateData(data);
      
      const entity = await this.repository.create(data);
      return entity;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        `Error creating ${this.entityName}`,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  // Update entity
  async update(id: string, data: any): Promise<T> {
    try {
      this.validateId(id);
      await this.validateUpdateData(data);
      
      // Check if entity exists
      const exists = await this.repository.exists(id);
      if (!exists) {
        throw new AppError(
          `${this.entityName} not found`,
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }
      
      const entity = await this.repository.update(id, data);
      return entity;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        `Error updating ${this.entityName}`,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  // Delete entity
  async delete(id: string): Promise<boolean> {
    try {
      this.validateId(id);
      
      // Check if entity exists
      const exists = await this.repository.exists(id);
      if (!exists) {
        throw new AppError(
          `${this.entityName} not found`,
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }
      
      // Perform pre-delete validation
      await this.validateDelete(id);
      
      return await this.repository.delete(id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        `Error deleting ${this.entityName}`,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  // Check if entity exists
  async exists(id: string): Promise<boolean> {
    try {
      this.validateId(id);
      return await this.repository.exists(id);
    } catch (error) {
      return false;
    }
  }

  // Get entity count
  async getCount(where?: any): Promise<number> {
    try {
      return await this.repository.count(where);
    } catch (error) {
      throw new AppError(
        `Error counting ${this.entityName}`,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  // Batch create entities
  async createMany(data: any[]): Promise<{ count: number }> {
    try {
      // Validate each item
      for (const item of data) {
        await this.validateCreateData(item);
      }
      
      return await this.repository.createMany(data);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        `Error creating multiple ${this.entityName}`,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  // Find entities by IDs
  async getByIds(ids: string[]): Promise<T[]> {
    try {
      // Validate IDs
      ids.forEach(id => this.validateId(id));
      
      return await this.repository.findByIds(ids);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        `Error retrieving ${this.entityName} by IDs`,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  // Validation methods (to be overridden by child classes)
  protected validateId(id: string): void {
    if (!id || typeof id !== 'string') {
      throw new AppError(
        'Invalid ID provided',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }

    // UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new AppError(
        'Invalid ID format',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }
  }

  protected async validateCreateData(data: any): Promise<void> {
    // Default implementation - override in child classes
    if (!data || typeof data !== 'object') {
      throw new AppError(
        'Invalid data provided',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }
  }

  protected async validateUpdateData(data: any): Promise<void> {
    // Default implementation - override in child classes
    if (!data || typeof data !== 'object') {
      throw new AppError(
        'Invalid data provided',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }
  }

  protected async validateDelete(id: string): Promise<void> {
    // Default implementation - override in child classes
    // This is where you would check for foreign key constraints
    // or business rules that prevent deletion
  }

  // Helper methods
  protected createPaginationMeta(
    currentPage: number,
    totalItems: number,
    itemsPerPage: number
  ): PaginationMeta {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    return {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1
    };
  }

  protected sanitizeSearchQuery(query?: string): string | undefined {
    if (!query) return undefined;
    
    return query.trim().toLowerCase();
  }

  protected validatePaginationParams(params: PaginationParams): {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder: 'asc' | 'desc';
  } {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(Math.max(1, params.limit || 20), 100);
    const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';
    
    return {
      page,
      limit,
      sortBy: params.sortBy,
      sortOrder
    };
  }

  // Error handling helpers
  protected handleDatabaseError(error: any, operation: string): never {
    console.error(`Database error during ${operation}:`, error);
    
    if (error.code === 'P2002') {
      throw new AppError(
        'Duplicate entry found',
        HTTP_STATUS.CONFLICT,
        ERROR_CODES.RESOURCE_ALREADY_EXISTS
      );
    }
    
    if (error.code === 'P2025') {
      throw new AppError(
        `${this.entityName} not found`,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND
      );
    }
    
    throw new AppError(
      `Database error during ${operation}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.DATABASE_ERROR
    );
  }

  protected handleValidationError(errors: any[]): never {
    throw new AppError(
      'Validation failed',
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
      true
    );
  }
}