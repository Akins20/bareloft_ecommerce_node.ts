"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
const database_1 = require("@/config/database");
// Abstract base repository class
class BaseRepository {
    db;
    constructor(database = database_1.prisma) {
        this.db = database;
    }
    // Get the Prisma model delegate
    get model() {
        return this.db[this.modelName];
    }
    // Find entity by ID
    async findById(id) {
        try {
            const entity = await this.model.findUnique({
                where: { id }
            });
            return entity;
        }
        catch (error) {
            console.error(`Error finding ${this.modelName} by ID ${id}:`, error);
            throw error;
        }
    }
    // Find all entities
    async findAll(params) {
        try {
            const entities = await this.model.findMany({
                orderBy: params?.sortBy ? {
                    [params.sortBy]: params.sortOrder || 'desc'
                } : {
                    createdAt: 'desc'
                }
            });
            return entities;
        }
        catch (error) {
            console.error(`Error finding all ${this.modelName}:`, error);
            throw error;
        }
    }
    // Find entities with pagination
    async findWithPagination(params) {
        try {
            const page = params.page || 1;
            const limit = Math.min(params.limit || 20, 100); // Max 100 items per page
            const skip = (page - 1) * limit;
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
            return { items, pagination };
        }
        catch (error) {
            console.error(`Error finding ${this.modelName} with pagination:`, error);
            throw error;
        }
    }
    // Create new entity
    async create(data) {
        try {
            const entity = await this.model.create({
                data
            });
            return entity;
        }
        catch (error) {
            console.error(`Error creating ${this.modelName}:`, error);
            throw error;
        }
    }
    // Update entity
    async update(id, data) {
        try {
            const entity = await this.model.update({
                where: { id },
                data
            });
            return entity;
        }
        catch (error) {
            console.error(`Error updating ${this.modelName} with ID ${id}:`, error);
            throw error;
        }
    }
    // Delete entity (soft delete by default)
    async delete(id) {
        try {
            await this.model.delete({
                where: { id }
            });
            return true;
        }
        catch (error) {
            console.error(`Error deleting ${this.modelName} with ID ${id}:`, error);
            return false;
        }
    }
    // Count entities
    async count(where) {
        try {
            return await this.model.count({ where });
        }
        catch (error) {
            console.error(`Error counting ${this.modelName}:`, error);
            throw error;
        }
    }
    // Check if entity exists
    async exists(id) {
        try {
            const entity = await this.model.findUnique({
                where: { id },
                select: { id: true }
            });
            return !!entity;
        }
        catch (error) {
            console.error(`Error checking existence of ${this.modelName} with ID ${id}:`, error);
            return false;
        }
    }
    // Execute custom query
    async executeQuery(query) {
        try {
            return await query;
        }
        catch (error) {
            console.error(`Error executing custom query for ${this.modelName}:`, error);
            throw error;
        }
    }
    // Batch operations
    async createMany(data) {
        try {
            return await this.model.createMany({
                data,
                skipDuplicates: true
            });
        }
        catch (error) {
            console.error(`Error creating many ${this.modelName}:`, error);
            throw error;
        }
    }
    // Find entities by multiple IDs
    async findByIds(ids) {
        try {
            return await this.model.findMany({
                where: {
                    id: {
                        in: ids
                    }
                }
            });
        }
        catch (error) {
            console.error(`Error finding ${this.modelName} by IDs:`, error);
            throw error;
        }
    }
    // Find with custom where clause
    async findWhere(where, options) {
        try {
            return await this.model.findMany({
                where,
                ...options
            });
        }
        catch (error) {
            console.error(`Error finding ${this.modelName} with custom where:`, error);
            throw error;
        }
    }
    // Find first matching entity
    async findFirst(where, options) {
        try {
            return await this.model.findFirst({
                where,
                ...options
            });
        }
        catch (error) {
            console.error(`Error finding first ${this.modelName}:`, error);
            throw error;
        }
    }
    // Upsert operation
    async upsert(where, update, create) {
        try {
            return await this.model.upsert({
                where,
                update,
                create
            });
        }
        catch (error) {
            console.error(`Error upserting ${this.modelName}:`, error);
            throw error;
        }
    }
}
exports.BaseRepository = BaseRepository;
//# sourceMappingURL=BaseRepositories.js.map