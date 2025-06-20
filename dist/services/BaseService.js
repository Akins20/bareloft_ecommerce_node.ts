"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = void 0;
const api_types_1 = require("@/types/api.types");
// Abstract base service class
class BaseService {
    repository;
    entityName;
    constructor(repository, entityName) {
        this.repository = repository;
        this.entityName = entityName;
    }
    // Get entity by ID
    async getById(id) {
        try {
            this.validateId(id);
            const entity = await this.repository.findById(id);
            if (!entity) {
                throw new api_types_1.AppError(`${this.entityName} not found`, api_types_1.HTTP_STATUS.NOT_FOUND, api_types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            return entity;
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            throw new api_types_1.AppError(`Error retrieving ${this.entityName}`, api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    // Get all entities with optional pagination
    async getAll(params) {
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
        }
        catch (error) {
            throw new api_types_1.AppError(`Error retrieving ${this.entityName} list`, api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    // Create new entity
    async create(data) {
        try {
            await this.validateCreateData(data);
            const entity = await this.repository.create(data);
            return entity;
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            throw new api_types_1.AppError(`Error creating ${this.entityName}`, api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    // Update entity
    async update(id, data) {
        try {
            this.validateId(id);
            await this.validateUpdateData(data);
            // Check if entity exists
            const exists = await this.repository.exists(id);
            if (!exists) {
                throw new api_types_1.AppError(`${this.entityName} not found`, api_types_1.HTTP_STATUS.NOT_FOUND, api_types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            const entity = await this.repository.update(id, data);
            return entity;
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            throw new api_types_1.AppError(`Error updating ${this.entityName}`, api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    // Delete entity
    async delete(id) {
        try {
            this.validateId(id);
            // Check if entity exists
            const exists = await this.repository.exists(id);
            if (!exists) {
                throw new api_types_1.AppError(`${this.entityName} not found`, api_types_1.HTTP_STATUS.NOT_FOUND, api_types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            // Perform pre-delete validation
            await this.validateDelete(id);
            return await this.repository.delete(id);
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            throw new api_types_1.AppError(`Error deleting ${this.entityName}`, api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    // Check if entity exists
    async exists(id) {
        try {
            this.validateId(id);
            return await this.repository.exists(id);
        }
        catch (error) {
            return false;
        }
    }
    // Get entity count
    async getCount(where) {
        try {
            return await this.repository.count(where);
        }
        catch (error) {
            throw new api_types_1.AppError(`Error counting ${this.entityName}`, api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    // Batch create entities
    async createMany(data) {
        try {
            // Validate each item
            for (const item of data) {
                await this.validateCreateData(item);
            }
            return await this.repository.createMany(data);
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            throw new api_types_1.AppError(`Error creating multiple ${this.entityName}`, api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    // Find entities by IDs
    async getByIds(ids) {
        try {
            // Validate IDs
            ids.forEach(id => this.validateId(id));
            return await this.repository.findByIds(ids);
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            throw new api_types_1.AppError(`Error retrieving ${this.entityName} by IDs`, api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    // Validation methods (to be overridden by child classes)
    validateId(id) {
        if (!id || typeof id !== 'string') {
            throw new api_types_1.AppError('Invalid ID provided', api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.INVALID_INPUT);
        }
        // UUID validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            throw new api_types_1.AppError('Invalid ID format', api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.INVALID_INPUT);
        }
    }
    async validateCreateData(data) {
        // Default implementation - override in child classes
        if (!data || typeof data !== 'object') {
            throw new api_types_1.AppError('Invalid data provided', api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.INVALID_INPUT);
        }
    }
    async validateUpdateData(data) {
        // Default implementation - override in child classes
        if (!data || typeof data !== 'object') {
            throw new api_types_1.AppError('Invalid data provided', api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.INVALID_INPUT);
        }
    }
    async validateDelete(id) {
        // Default implementation - override in child classes
        // This is where you would check for foreign key constraints
        // or business rules that prevent deletion
    }
    // Helper methods
    createPaginationMeta(currentPage, totalItems, itemsPerPage) {
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
    sanitizeSearchQuery(query) {
        if (!query)
            return undefined;
        return query.trim().toLowerCase();
    }
    validatePaginationParams(params) {
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
    handleDatabaseError(error, operation) {
        console.error(`Database error during ${operation}:`, error);
        if (error.code === 'P2002') {
            throw new api_types_1.AppError('Duplicate entry found', api_types_1.HTTP_STATUS.CONFLICT, api_types_1.ERROR_CODES.RESOURCE_ALREADY_EXISTS);
        }
        if (error.code === 'P2025') {
            throw new api_types_1.AppError(`${this.entityName} not found`, api_types_1.HTTP_STATUS.NOT_FOUND, api_types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
        }
        throw new api_types_1.AppError(`Database error during ${operation}`, api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.DATABASE_ERROR);
    }
    handleValidationError(errors) {
        throw new api_types_1.AppError('Validation failed', api_types_1.HTTP_STATUS.BAD_REQUEST, api_types_1.ERROR_CODES.VALIDATION_ERROR, true);
    }
}
exports.BaseService = BaseService;
//# sourceMappingURL=BaseService.js.map