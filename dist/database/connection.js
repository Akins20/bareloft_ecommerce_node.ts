"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gracefulShutdown = exports.database = exports.DatabaseManager = exports.prisma = void 0;
const client_1 = require("@prisma/client");
const winston_1 = require("../utils/logger/winston");
/**
 * Database connection configuration
 */
const createPrismaClient = () => {
    const client = new client_1.PrismaClient({
        log: [
            { level: "query", emit: "event" },
            { level: "error", emit: "event" },
            { level: "info", emit: "event" },
            { level: "warn", emit: "event" },
        ],
        errorFormat: "pretty",
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    });
    // Log database queries in development
    if (process.env.NODE_ENV === "development") {
        client.$on("query", (e) => {
            winston_1.logger.debug("Database Query:", {
                query: e.query,
                params: e.params,
                duration: `${e.duration}ms`,
                target: e.target,
            });
        });
    }
    // Log database errors
    client.$on("error", (e) => {
        winston_1.logger.error("Database Error:", {
            message: e.message,
            target: e.target,
        });
    });
    // Log database info
    client.$on("info", (e) => {
        winston_1.logger.info("Database Info:", {
            message: e.message,
            target: e.target,
        });
    });
    // Log database warnings
    client.$on("warn", (e) => {
        winston_1.logger.warn("Database Warning:", {
            message: e.message,
            target: e.target,
        });
    });
    return client;
};
/**
 * Get or create Prisma client instance
 * Implements singleton pattern to prevent multiple connections
 */
exports.prisma = globalThis.__prisma || createPrismaClient();
// In development, store client globally to prevent hot reload issues
if (process.env.NODE_ENV === "development") {
    globalThis.__prisma = exports.prisma;
}
/**
 * Database connection manager
 */
class DatabaseManager {
    static instance;
    client;
    isConnected = false;
    constructor() {
        this.client = exports.prisma;
    }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }
    /**
     * Connect to database
     */
    async connect() {
        try {
            await this.client.$connect();
            this.isConnected = true;
            winston_1.logger.info("Database connected successfully");
        }
        catch (error) {
            winston_1.logger.error("Failed to connect to database:", error);
            throw error;
        }
    }
    /**
     * Disconnect from database
     */
    async disconnect() {
        try {
            await this.client.$disconnect();
            this.isConnected = false;
            winston_1.logger.info("Database disconnected successfully");
        }
        catch (error) {
            winston_1.logger.error("Failed to disconnect from database:", error);
            throw error;
        }
    }
    /**
     * Check database connection health
     */
    async healthCheck() {
        const startTime = Date.now();
        try {
            // Simple query to test connection
            await this.client.$queryRaw `SELECT 1`;
            const latency = Date.now() - startTime;
            return {
                status: "healthy",
                latency,
            };
        }
        catch (error) {
            return {
                status: "unhealthy",
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    /**
     * Get database statistics
     */
    async getStats() {
        try {
            const [connectionResult, versionResult] = await Promise.all([
                this.client.$queryRaw `
          SELECT count(*) as count 
          FROM pg_stat_activity 
          WHERE datname = current_database()
        `,
                this.client.$queryRaw `SELECT version()`,
            ]);
            return {
                totalConnections: Number(connectionResult[0]?.count || 0),
                activeQueries: 0, // This would require more complex queries
                version: versionResult[0]?.version || "Unknown",
            };
        }
        catch (error) {
            winston_1.logger.error("Failed to get database stats:", error);
            throw error;
        }
    }
    /**
     * Execute raw SQL query with logging
     * @param query - The SQL query string
     * @param params - Optional query parameters
     * @returns Promise<T> - Query result cast to type T
     */
    async executeRaw(query, params) {
        const startTime = Date.now();
        try {
            // Remove generic type parameter and use type assertion instead
            const result = (await this.client.$queryRawUnsafe(query, ...(params || [])));
            const duration = Date.now() - startTime;
            winston_1.logger.debug("Raw query executed:", {
                query,
                params,
                duration: `${duration}ms`,
            });
            return result;
        }
        catch (error) {
            winston_1.logger.error("Raw query failed:", {
                query,
                params,
                error: error instanceof Error ? error.message : "Unknown error",
            });
            throw error;
        }
    }
    /**
     * Execute raw SQL query with better type safety
     * Alternative method for specific query types
     */
    async executeTypedQuery(query, params) {
        const startTime = Date.now();
        try {
            const result = await this.client.$queryRawUnsafe(query, ...(params || []));
            const duration = Date.now() - startTime;
            winston_1.logger.debug("Typed query executed:", {
                query,
                params,
                duration: `${duration}ms`,
            });
            // Type assertion for array results
            return Array.isArray(result) ? result : [result];
        }
        catch (error) {
            winston_1.logger.error("Typed query failed:", {
                query,
                params,
                error: error instanceof Error ? error.message : "Unknown error",
            });
            throw error;
        }
    }
    /**
     * Begin transaction
     */
    async transaction(callback) {
        return this.client.$transaction(callback);
    }
    /**
     * Get Prisma client instance
     */
    getClient() {
        return this.client;
    }
    /**
     * Check if connected
     */
    isHealthy() {
        return this.isConnected;
    }
}
exports.DatabaseManager = DatabaseManager;
/**
 * Default database manager instance
 */
exports.database = DatabaseManager.getInstance();
/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async () => {
    winston_1.logger.info("Shutting down database connections...");
    await exports.database.disconnect();
};
exports.gracefulShutdown = gracefulShutdown;
// Handle process termination
process.on("SIGINT", exports.gracefulShutdown);
process.on("SIGTERM", exports.gracefulShutdown);
process.on("beforeExit", exports.gracefulShutdown);
exports.default = exports.prisma;
//# sourceMappingURL=connection.js.map