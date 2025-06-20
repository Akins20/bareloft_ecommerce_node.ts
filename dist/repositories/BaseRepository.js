"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
const connection_1 = require("../database/connection");
const winston_1 = require("../utils/logger/winston");
// Abstract base repository class (enhanced version of your existing class)
class BaseRepository {
    db;
    constructor(database = connection_1.prisma) {
        this.db = database;
    }
    // Get the Prisma model delegate (keeping your existing method)
    get model() {
        return this.db[this.modelName];
    }
    // Find entity by ID (enhanced with better logging)
    async findById(id) {
        try {
            winston_1.logger.debug(`Finding ${this.modelName} by ID:`, { id });
            const entity = await this.model.findUnique({
                where: { id }
            });
            if (entity) {
                winston_1.logger.debug(`Found ${this.modelName}:`, { id });
            }
            else {
                winston_1.logger.debug(`${this.modelName} not found:`, { id });
            }
            return entity;
        }
        catch (error) {
            winston_1.logger.error(`Error finding ${this.modelName} by ID ${id}:`, error);
            throw error;
        }
    }
    // Find all entities (enhanced with better defaults)
    async findAll(params) {
        try {
            winston_1.logger.debug(`Finding all ${this.modelName}:`, { params });
            const entities = await this.model.findMany({
                orderBy: params?.sortBy ? {
                    [params.sortBy]: params.sortOrder || 'desc'
                } : {
                    createdAt: 'desc'
                }
            });
            winston_1.logger.debug(`Found ${entities.length} ${this.modelName} records`);
            return entities;
        }
        catch (error) {
            winston_1.logger.error(`Error finding all ${this.modelName}:`, error);
            throw error;
        }
    }
    // Find entities with pagination (enhanced with better validation)
    async findWithPagination(params) {
        try {
            const page = Math.max(params.page || 1, 1); // Ensure page is at least 1
            const limit = Math.min(Math.max(params.limit || 20, 1), 100); // Between 1-100
            const skip = (page - 1) * limit;
            winston_1.logger.debug(`Finding ${this.modelName} with pagination:`, { page, limit, skip });
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
            const pagination = {
                currentPage: page,
                totalPages,
                totalItems,
                itemsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            };
            winston_1.logger.debug(`Found ${items.length} of ${totalItems} ${this.modelName} records`);
            return { items, pagination };
        }
        catch (error) {
            winston_1.logger.error(`Error finding ${this.modelName} with pagination:`, error);
            throw error;
        }
    }
    // Create new entity (enhanced with better logging)
    async create(data) {
        try {
            winston_1.logger.debug(`Creating ${this.modelName}:`, { data });
            const entity = await this.model.create({
                data
            });
            winston_1.logger.info(`Created ${this.modelName}:`, { id: entity.id });
            return entity;
        }
        catch (error) {
            winston_1.logger.error(`Error creating ${this.modelName}:`, error);
            throw error;
        }
    }
    // Update entity (enhanced with better logging)
    async update(id, data) {
        try {
            winston_1.logger.debug(`Updating ${this.modelName}:`, { id, data });
            const entity = await this.model.update({
                where: { id },
                data
            });
            winston_1.logger.info(`Updated ${this.modelName}:`, { id });
            return entity;
        }
        catch (error) {
            winston_1.logger.error(`Error updating ${this.modelName} with ID ${id}:`, error);
            throw error;
        }
    }
    // Delete entity (enhanced with better error handling)
    async delete(id) {
        try {
            winston_1.logger.debug(`Deleting ${this.modelName}:`, { id });
            await this.model.delete({
                where: { id }
            });
            winston_1.logger.info(`Deleted ${this.modelName}:`, { id });
            return true;
        }
        catch (error) {
            winston_1.logger.error(`Error deleting ${this.modelName} with ID ${id}:`, error);
            return false;
        }
    }
    // Count entities (keeping your existing method)
    async count(where) {
        try {
            const count = await this.model.count({ where });
            winston_1.logger.debug(`Counted ${count} ${this.modelName} records`);
            return count;
        }
        catch (error) {
            winston_1.logger.error(`Error counting ${this.modelName}:`, error);
            throw error;
        }
    }
    // Check if entity exists (keeping your existing method)
    async exists(id) {
        try {
            const entity = await this.model.findUnique({
                where: { id },
                select: { id: true }
            });
            const exists = !!entity;
            winston_1.logger.debug(`${this.modelName} exists check:`, { id, exists });
            return exists;
        }
        catch (error) {
            winston_1.logger.error(`Error checking existence of ${this.modelName} with ID ${id}:`, error);
            return false;
        }
    }
    // Execute custom query (keeping your existing method with better logging)
    async executeQuery(query) {
        try {
            winston_1.logger.debug(`Executing custom query for ${this.modelName}`);
            const result = await query;
            winston_1.logger.debug(`Custom query completed for ${this.modelName}`);
            return result;
        }
        catch (error) {
            winston_1.logger.error(`Error executing custom query for ${this.modelName}:`, error);
            throw error;
        }
    }
    // Batch operations (enhanced with better logging)
    async createMany(data) {
        try {
            winston_1.logger.debug(`Creating many ${this.modelName}:`, { count: data.length });
            const result = await this.model.createMany({
                data,
                skipDuplicates: true
            });
            winston_1.logger.info(`Created ${result.count} ${this.modelName} records`);
            return result;
        }
        catch (error) {
            winston_1.logger.error(`Error creating many ${this.modelName}:`, error);
            throw error;
        }
    }
    // Find entities by multiple IDs (keeping your existing method)
    async findByIds(ids) {
        try {
            winston_1.logger.debug(`Finding ${this.modelName} by IDs:`, { count: ids.length });
            const entities = await this.model.findMany({
                where: {
                    id: {
                        in: ids
                    }
                }
            });
            winston_1.logger.debug(`Found ${entities.length} ${this.modelName} records by IDs`);
            return entities;
        }
        catch (error) {
            winston_1.logger.error(`Error finding ${this.modelName} by IDs:`, error);
            throw error;
        }
    }
    // Find with custom where clause (keeping your existing method)
    async findWhere(where, options) {
        try {
            winston_1.logger.debug(`Finding ${this.modelName} with custom where:`, { where, options });
            const entities = await this.model.findMany({
                where,
                ...options
            });
            winston_1.logger.debug(`Found ${entities.length} ${this.modelName} records with custom where`);
            return entities;
        }
        catch (error) {
            winston_1.logger.error(`Error finding ${this.modelName} with custom where:`, error);
            throw error;
        }
    }
    // Find first matching entity (keeping your existing method)
    async findFirst(where, options) {
        try {
            winston_1.logger.debug(`Finding first ${this.modelName}:`, { where, options });
            const entity = await this.model.findFirst({
                where,
                ...options
            });
            winston_1.logger.debug(`Found first ${this.modelName}:`, { found: !!entity });
            return entity;
        }
        catch (error) {
            winston_1.logger.error(`Error finding first ${this.modelName}:`, error);
            throw error;
        }
    }
    // Upsert operation (keeping your existing method with better logging)
    async upsert(where, update, create) {
        try {
            winston_1.logger.debug(`Upserting ${this.modelName}:`, { where });
            const entity = await this.model.upsert({
                where,
                update,
                create
            });
            winston_1.logger.info(`Upserted ${this.modelName}:`, { id: entity.id });
            return entity;
        }
        catch (error) {
            winston_1.logger.error(`Error upserting ${this.modelName}:`, error);
            throw error;
        }
    }
    // Additional helper methods for enhanced functionality
    // Transaction support
    async transaction(callback) {
        try {
            winston_1.logger.debug(`Starting transaction for ${this.modelName}`);
            const result = await this.db.$transaction(callback);
            winston_1.logger.debug(`Transaction completed for ${this.modelName}`);
            return result;
        }
        catch (error) {
            winston_1.logger.error(`Transaction failed for ${this.modelName}:`, error);
            throw error;
        }
    }
    // Health check for the repository
    async healthCheck() {
        try {
            const totalRecords = await this.count();
            return {
                status: 'healthy',
                totalRecords,
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    // Soft delete support (if model has deletedAt field)
    async softDelete(id) {
        try {
            winston_1.logger.debug(`Soft deleting ${this.modelName}:`, { id });
            // Try to update with deletedAt timestamp
            await this.model.update({
                where: { id },
                data: { deletedAt: new Date() }
            });
            winston_1.logger.info(`Soft deleted ${this.modelName}:`, { id });
            return true;
        }
        catch (error) {
            // If deletedAt field doesn't exist, fall back to hard delete
            winston_1.logger.warn(`Soft delete not supported for ${this.modelName}, falling back to hard delete`);
            return await this.delete(id);
        }
    }
}
exports.BaseRepository = BaseRepository;
//# sourceMappingURL=BaseRepository.js.map