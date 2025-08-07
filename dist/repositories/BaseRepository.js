"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
const types_1 = require("../types");
class BaseRepository {
    prisma;
    modelName;
    constructor(prisma, modelName) {
        this.prisma = prisma;
        this.modelName = modelName;
    }
    /**
     * Find by ID
     */
    async findById(id, include) {
        try {
            const model = this.getModel();
            return await model.findUnique({
                where: { id },
                include,
            });
        }
        catch (error) {
            this.handleError("Error finding record by ID", error);
            throw error;
        }
    }
    /**
     * Find first record matching criteria
     */
    async findFirst(where, include) {
        try {
            const model = this.getModel();
            return await model.findFirst({
                where,
                include,
            });
        }
        catch (error) {
            this.handleError("Error finding first record", error);
            throw error;
        }
    }
    /**
     * Find many records with pagination
     */
    async findMany(where = {}, options = {}) {
        try {
            const model = this.getModel();
            const { include, orderBy, pagination } = options;
            // Default pagination
            const page = pagination?.page || 1;
            const limit = Math.min(pagination?.limit || 20, 100); // Max 100 items
            const skip = (page - 1) * limit;
            // Execute queries in parallel
            const [data, total] = await Promise.all([
                model.findMany({
                    where,
                    include,
                    orderBy: orderBy || { createdAt: "desc" },
                    skip,
                    take: limit,
                }),
                model.count({ where }),
            ]);
            const totalPages = Math.ceil(total / limit);
            return {
                data,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: total,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1,
                },
            };
        }
        catch (error) {
            this.handleError("Error finding many records", error);
            throw error;
        }
    }
    /**
     * Create new record
     */
    async create(data, include) {
        try {
            const model = this.getModel();
            return await model.create({
                data,
                include,
            });
        }
        catch (error) {
            this.handleError("Error creating record", error);
            throw error;
        }
    }
    /**
     * Update record by ID
     */
    async update(id, data, include) {
        try {
            const model = this.getModel();
            // Check if record exists
            const existing = await model.findUnique({ where: { id } });
            if (!existing) {
                throw new types_1.AppError(`${this.modelName} not found`, types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            return await model.update({
                where: { id },
                data,
                include,
            });
        }
        catch (error) {
            this.handleError("Error updating record", error);
            throw error;
        }
    }
    /**
     * Delete record by ID (soft delete if supported)
     */
    async delete(id) {
        try {
            const model = this.getModel();
            // Check if record exists
            const existing = await model.findUnique({ where: { id } });
            if (!existing) {
                throw new types_1.AppError(`${this.modelName} not found`, types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            // Check if model supports soft delete (has isDeleted field)
            if (this.supportsSoftDelete()) {
                await model.update({
                    where: { id },
                    data: { isDeleted: true, deletedAt: new Date() },
                });
            }
            else {
                await model.delete({ where: { id } });
            }
            return true;
        }
        catch (error) {
            this.handleError("Error deleting record", error);
            throw error;
        }
    }
    /**
     * Count records matching criteria
     */
    async count(where = {}) {
        try {
            const model = this.getModel();
            return await model.count({ where });
        }
        catch (error) {
            this.handleError("Error counting records", error);
            throw error;
        }
    }
    /**
     * Check if record exists
     */
    async exists(where) {
        try {
            const count = await this.count(where);
            return count > 0;
        }
        catch (error) {
            this.handleError("Error checking record existence", error);
            throw error;
        }
    }
    /**
     * Create many records at once
     */
    async createMany(data) {
        try {
            const model = this.getModel();
            return await model.createMany({
                data,
                skipDuplicates: true,
            });
        }
        catch (error) {
            this.handleError("Error creating many records", error);
            throw error;
        }
    }
    /**
     * Update many records matching criteria
     */
    async updateMany(where, data) {
        try {
            const model = this.getModel();
            return await model.updateMany({
                where,
                data,
            });
        }
        catch (error) {
            this.handleError("Error updating many records", error);
            throw error;
        }
    }
    /**
     * Delete many records matching criteria
     */
    async deleteMany(where) {
        try {
            const model = this.getModel();
            if (this.supportsSoftDelete()) {
                return await model.updateMany({
                    where,
                    data: { isDeleted: true, deletedAt: new Date() },
                });
            }
            else {
                return await model.deleteMany({ where });
            }
        }
        catch (error) {
            this.handleError("Error deleting many records", error);
            throw error;
        }
    }
    /**
     * Find records with complex search
     */
    async search(searchTerm, searchFields, where = {}, options = {}) {
        try {
            // Build search conditions
            const searchConditions = searchFields.map((field) => ({
                [field]: {
                    contains: searchTerm,
                    mode: "insensitive",
                },
            }));
            const searchWhere = {
                ...where,
                OR: searchConditions,
            };
            const result = await this.findMany(searchWhere, options);
            return {
                ...result,
                searchMeta: {
                    term: searchTerm,
                    fields: searchFields,
                    totalResults: result.pagination.totalItems,
                },
            };
        }
        catch (error) {
            this.handleError("Error searching records", error);
            throw error;
        }
    }
    /**
     * Execute raw transaction
     */
    async transaction(callback) {
        try {
            return await this.prisma.$transaction(callback);
        }
        catch (error) {
            this.handleError("Error executing transaction", error);
            throw error;
        }
    }
    /**
     * Batch operations with transaction
     */
    async batchOperations(operations) {
        try {
            return await this.transaction(async (prisma) => {
                const model = prisma[this.modelName.toLowerCase()];
                const results = [];
                for (const operation of operations) {
                    let result;
                    switch (operation.type) {
                        case "create":
                            result = await model.create({ data: operation.data });
                            break;
                        case "update":
                            result = await model.update({
                                where: operation.where,
                                data: operation.data,
                            });
                            break;
                        case "delete":
                            result = await model.delete({ where: operation.where });
                            break;
                    }
                    results.push(result);
                }
                return results;
            });
        }
        catch (error) {
            this.handleError("Error executing batch operations", error);
            throw error;
        }
    }
    /**
     * Get aggregated data
     */
    async aggregate(where = {}, aggregations) {
        try {
            const model = this.getModel();
            return await model.aggregate({
                where,
                ...aggregations,
            });
        }
        catch (error) {
            this.handleError("Error getting aggregated data", error);
            throw error;
        }
    }
    /**
     * Group records by field
     */
    async groupBy(by, where = {}, having, aggregations) {
        try {
            const model = this.getModel();
            return await model.groupBy({
                by,
                where,
                having,
                ...aggregations,
            });
        }
        catch (error) {
            this.handleError("Error grouping records", error);
            throw error;
        }
    }
    /**
     * Find records created in date range
     */
    async findByDateRange(startDate, endDate, options = {}) {
        const where = {
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
        };
        return await this.findMany(where, options);
    }
    /**
     * Find recent records
     */
    async findRecent(days = 7, options = {}) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        return await this.findByDateRange(startDate, new Date(), options);
    }
    // Protected helper methods
    /**
     * Get the Prisma model for this repository
     */
    getModel() {
        const modelKey = this.modelName;
        const model = this.prisma[modelKey];
        if (!model) {
            throw new types_1.AppError(`Model '${this.modelName}' not found in Prisma client`, types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
        }
        return model;
    }
    /**
     * Check if model supports soft delete
     */
    supportsSoftDelete() {
        // Override in child classes if model supports soft delete
        return false;
    }
    /**
     * Handle repository errors
     */
    handleError(message, error) {
        console.error(`${this.modelName} Repository Error:`, message, error);
        // Convert Prisma errors to application errors
        if (error.code === "P2002") {
            throw new types_1.AppError("Unique constraint violation", types_1.HTTP_STATUS.CONFLICT, types_1.ERROR_CODES.RESOURCE_CONFLICT);
        }
        if (error.code === "P2025") {
            throw new types_1.AppError(`${this.modelName} not found`, types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
        }
        // Re-throw AppErrors as-is
        if (error instanceof types_1.AppError) {
            throw error;
        }
        // Convert other errors to internal server errors
        throw new types_1.AppError(`Database operation failed: ${message}`, types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.DATABASE_ERROR);
    }
    /**
     * Build pagination metadata
     */
    buildPagination(page, limit, total) {
        const totalPages = Math.ceil(total / limit);
        return {
            currentPage: page,
            totalPages,
            totalItems: total,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
        };
    }
    /**
     * Validate pagination parameters
     */
    validatePagination(pagination) {
        const page = Math.max(1, pagination?.page || 1);
        const limit = Math.min(Math.max(1, pagination?.limit || 20), 100);
        return { page, limit };
    }
    /**
     * Build order by clause from sort parameters
     */
    buildOrderBy(sortBy, sortOrder) {
        if (!sortBy) {
            return { createdAt: "desc" };
        }
        return {
            [sortBy]: sortOrder || "asc",
        };
    }
    /**
     * Build where clause for soft delete support
     */
    buildWhereWithSoftDelete(where = {}) {
        if (this.supportsSoftDelete()) {
            return {
                ...where,
                isDeleted: false,
            };
        }
        return where;
    }
}
exports.BaseRepository = BaseRepository;
//# sourceMappingURL=BaseRepository.js.map