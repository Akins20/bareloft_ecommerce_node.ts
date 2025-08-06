import { PrismaClient } from "@prisma/client";
declare global {
    var __prisma: PrismaClient | undefined;
}
/**
 * Get or create Prisma client instance
 * Implements singleton pattern to prevent multiple connections
 */
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
/**
 * Database connection manager
 */
export declare class DatabaseManager {
    private static instance;
    private client;
    private isConnected;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(): DatabaseManager;
    /**
     * Connect to database
     */
    connect(): Promise<void>;
    /**
     * Disconnect from database
     */
    disconnect(): Promise<void>;
    /**
     * Check database connection health
     */
    healthCheck(): Promise<{
        status: "healthy" | "unhealthy";
        latency?: number;
        error?: string;
    }>;
    /**
     * Get database statistics
     */
    getStats(): Promise<{
        totalConnections: number;
        activeQueries: number;
        version: string;
    }>;
    /**
     * Execute raw SQL query with logging
     * @param query - The SQL query string
     * @param params - Optional query parameters
     * @returns Promise<T> - Query result cast to type T
     */
    executeRaw<T = any>(query: string, params?: any[]): Promise<T>;
    /**
     * Execute raw SQL query with better type safety
     * Alternative method for specific query types
     */
    executeTypedQuery<T>(query: string, params?: any[]): Promise<T[]>;
    /**
     * Begin transaction
     */
    transaction<T>(callback: (prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>): Promise<T>;
    /**
     * Get Prisma client instance
     */
    getClient(): PrismaClient;
    /**
     * Check if connected
     */
    isHealthy(): boolean;
}
/**
 * Default database manager instance
 */
export declare const database: DatabaseManager;
/**
 * Graceful shutdown handler
 */
export declare const gracefulShutdown: () => Promise<void>;
export default prisma;
//# sourceMappingURL=connection.d.ts.map