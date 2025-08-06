import { PrismaClient } from "@prisma/client";
import {
  PaginationParams,
  PaginationMeta,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
} from "../types";

export abstract class BaseRepository<T, CreateData, UpdateData> {
  protected prisma: PrismaClient;
  protected modelName: string;

  constructor(prisma: PrismaClient, modelName: string) {
    this.prisma = prisma;
    this.modelName = modelName;
  }

  /**
   * Find by ID
   */
  async findById(id: string, include?: any): Promise<T | null> {
    try {
      const model = this.getModel();
      return await model.findUnique({
        where: { id },
        include,
      });
    } catch (error) {
      this.handleError("Error finding record by ID", error);
      throw error;
    }
  }

  /**
   * Find first record matching criteria
   */
  async findFirst(where: any, include?: any): Promise<T | null> {
    try {
      const model = this.getModel();
      return await model.findFirst({
        where,
        include,
      });
    } catch (error) {
      this.handleError("Error finding first record", error);
      throw error;
    }
  }

  /**
   * Find many records with pagination
   */
  async findMany(
    where: any = {},
    options: {
      include?: any;
      orderBy?: any;
      pagination?: PaginationParams;
    } = {}
  ): Promise<{
    data: T[];
    pagination: PaginationMeta;
  }> {
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
    } catch (error) {
      this.handleError("Error finding many records", error);
      throw error;
    }
  }

  /**
   * Create new record
   */
  async create(data: CreateData, include?: any): Promise<T> {
    try {
      const model = this.getModel();
      return await model.create({
        data,
        include,
      });
    } catch (error) {
      this.handleError("Error creating record", error);
      throw error;
    }
  }

  /**
   * Update record by ID
   */
  async update(id: string, data: UpdateData, include?: any): Promise<T> {
    try {
      const model = this.getModel();

      // Check if record exists
      const existing = await model.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError(
          `${this.modelName} not found`,
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      return await model.update({
        where: { id },
        data,
        include,
      });
    } catch (error) {
      this.handleError("Error updating record", error);
      throw error;
    }
  }

  /**
   * Delete record by ID (soft delete if supported)
   */
  async delete(id: string): Promise<boolean> {
    try {
      const model = this.getModel();

      // Check if record exists
      const existing = await model.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError(
          `${this.modelName} not found`,
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      // Check if model supports soft delete (has isDeleted field)
      if (this.supportsSoftDelete()) {
        await model.update({
          where: { id },
          data: { isDeleted: true, deletedAt: new Date() },
        });
      } else {
        await model.delete({ where: { id } });
      }

      return true;
    } catch (error) {
      this.handleError("Error deleting record", error);
      throw error;
    }
  }

  /**
   * Count records matching criteria
   */
  async count(where: any = {}): Promise<number> {
    try {
      const model = this.getModel();
      return await model.count({ where });
    } catch (error) {
      this.handleError("Error counting records", error);
      throw error;
    }
  }

  /**
   * Check if record exists
   */
  async exists(where: any): Promise<boolean> {
    try {
      const count = await this.count(where);
      return count > 0;
    } catch (error) {
      this.handleError("Error checking record existence", error);
      throw error;
    }
  }

  /**
   * Create many records at once
   */
  async createMany(data: CreateData[]): Promise<{ count: number }> {
    try {
      const model = this.getModel();
      return await model.createMany({
        data,
        skipDuplicates: true,
      });
    } catch (error) {
      this.handleError("Error creating many records", error);
      throw error;
    }
  }

  /**
   * Update many records matching criteria
   */
  async updateMany(
    where: any,
    data: Partial<UpdateData>
  ): Promise<{ count: number }> {
    try {
      const model = this.getModel();
      return await model.updateMany({
        where,
        data,
      });
    } catch (error) {
      this.handleError("Error updating many records", error);
      throw error;
    }
  }

  /**
   * Delete many records matching criteria
   */
  async deleteMany(where: any): Promise<{ count: number }> {
    try {
      const model = this.getModel();

      if (this.supportsSoftDelete()) {
        return await model.updateMany({
          where,
          data: { isDeleted: true, deletedAt: new Date() },
        });
      } else {
        return await model.deleteMany({ where });
      }
    } catch (error) {
      this.handleError("Error deleting many records", error);
      throw error;
    }
  }

  /**
   * Find records with complex search
   */
  async search(
    searchTerm: string,
    searchFields: string[],
    where: any = {},
    options: {
      include?: any;
      orderBy?: any;
      pagination?: PaginationParams;
    } = {}
  ): Promise<{
    data: T[];
    pagination: PaginationMeta;
    searchMeta: {
      term: string;
      fields: string[];
      totalResults: number;
    };
  }> {
    try {
      // Build search conditions
      const searchConditions = searchFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive" as const,
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
    } catch (error) {
      this.handleError("Error searching records", error);
      throw error;
    }
  }

  /**
   * Execute raw transaction
   */
  async transaction<R>(
    callback: (prisma: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => Promise<R>
  ): Promise<R> {
    try {
      return await this.prisma.$transaction(callback);
    } catch (error) {
      this.handleError("Error executing transaction", error);
      throw error;
    }
  }

  /**
   * Batch operations with transaction
   */
  async batchOperations(
    operations: Array<{
      type: "create" | "update" | "delete";
      data?: any;
      where?: any;
    }>
  ): Promise<any[]> {
    try {
      return await this.transaction(async (prisma) => {
        const model = prisma[
          this.modelName.toLowerCase() as keyof PrismaClient
        ] as any;
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
    } catch (error) {
      this.handleError("Error executing batch operations", error);
      throw error;
    }
  }

  /**
   * Get aggregated data
   */
  async aggregate(
    where: any = {},
    aggregations: {
      _count?: any;
      _sum?: any;
      _avg?: any;
      _min?: any;
      _max?: any;
    }
  ): Promise<any> {
    try {
      const model = this.getModel();
      return await model.aggregate({
        where,
        ...aggregations,
      });
    } catch (error) {
      this.handleError("Error getting aggregated data", error);
      throw error;
    }
  }

  /**
   * Group records by field
   */
  async groupBy(
    by: string[],
    where: any = {},
    having?: any,
    aggregations?: {
      _count?: any;
      _sum?: any;
      _avg?: any;
      _min?: any;
      _max?: any;
    }
  ): Promise<any[]> {
    try {
      const model = this.getModel();
      return await model.groupBy({
        by,
        where,
        having,
        ...aggregations,
      });
    } catch (error) {
      this.handleError("Error grouping records", error);
      throw error;
    }
  }

  /**
   * Find records created in date range
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    options: {
      include?: any;
      orderBy?: any;
      pagination?: PaginationParams;
    } = {}
  ): Promise<{
    data: T[];
    pagination: PaginationMeta;
  }> {
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
  async findRecent(
    days: number = 7,
    options: {
      include?: any;
      orderBy?: any;
      pagination?: PaginationParams;
    } = {}
  ): Promise<{
    data: T[];
    pagination: PaginationMeta;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await this.findByDateRange(startDate, new Date(), options);
  }

  // Protected helper methods

  /**
   * Get the Prisma model for this repository
   */
  protected getModel(): any {
    const modelKey = this.modelName.toLowerCase() as keyof PrismaClient;
    return this.prisma[modelKey];
  }

  /**
   * Check if model supports soft delete
   */
  protected supportsSoftDelete(): boolean {
    // Override in child classes if model supports soft delete
    return false;
  }

  /**
   * Handle repository errors
   */
  protected handleError(message: string, error: any): void {
    console.error(`${this.modelName} Repository Error:`, message, error);

    // Convert Prisma errors to application errors
    if (error.code === "P2002") {
      throw new AppError(
        "Unique constraint violation",
        HTTP_STATUS.CONFLICT,
        ERROR_CODES.RESOURCE_CONFLICT
      );
    }

    if (error.code === "P2025") {
      throw new AppError(
        `${this.modelName} not found`,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND
      );
    }

    // Re-throw AppErrors as-is
    if (error instanceof AppError) {
      throw error;
    }

    // Convert other errors to internal server errors
    throw new AppError(
      `Database operation failed: ${message}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.DATABASE_ERROR
    );
  }

  /**
   * Build pagination metadata
   */
  protected buildPagination(
    page: number,
    limit: number,
    total: number
  ): PaginationMeta {
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
  protected validatePagination(pagination?: PaginationParams): {
    page: number;
    limit: number;
  } {
    const page = Math.max(1, pagination?.page || 1);
    const limit = Math.min(Math.max(1, pagination?.limit || 20), 100);

    return { page, limit };
  }

  /**
   * Build order by clause from sort parameters
   */
  protected buildOrderBy(sortBy?: string, sortOrder?: "asc" | "desc"): any {
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
  protected buildWhereWithSoftDelete(where: any = {}): any {
    if (this.supportsSoftDelete()) {
      return {
        ...where,
        isDeleted: false,
      };
    }
    return where;
  }
}
