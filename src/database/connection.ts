import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger/winston";

// Global Prisma instance to prevent multiple connections
declare global {
  var __prisma: PrismaClient | undefined;
}

/**
 * Database connection configuration
 */
const createPrismaClient = () => {
  const client = new PrismaClient({
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
      logger.debug("Database Query:", {
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`,
        target: e.target,
      });
    });
  }

  // Log database errors
  client.$on("error", (e) => {
    logger.error("Database Error:", {
      message: e.message,
      target: e.target,
    });
  });

  // Log database info
  client.$on("info", (e) => {
    logger.info("Database Info:", {
      message: e.message,
      target: e.target,
    });
  });

  // Log database warnings
  client.$on("warn", (e) => {
    logger.warn("Database Warning:", {
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
export const prisma = globalThis.__prisma || createPrismaClient();

// In development, store client globally to prevent hot reload issues
if (process.env.NODE_ENV === "development") {
  globalThis.__prisma = prisma;
}

/**
 * Database connection manager
 */
export class DatabaseManager {
  private static instance: DatabaseManager;
  private client: PrismaClient;
  private isConnected: boolean = false;

  private constructor() {
    this.client = prisma;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Connect to database
   */
  public async connect(): Promise<void> {
    try {
      await this.client.$connect();
      this.isConnected = true;
      logger.info("Database connected successfully");
    } catch (error) {
      logger.error("Failed to connect to database:", error);
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  public async disconnect(): Promise<void> {
    try {
      await this.client.$disconnect();
      this.isConnected = false;
      logger.info("Database disconnected successfully");
    } catch (error) {
      logger.error("Failed to disconnect from database:", error);
      throw error;
    }
  }

  /**
   * Check database connection health
   */
  public async healthCheck(): Promise<{
    status: "healthy" | "unhealthy";
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Simple query to test connection
      await this.client.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;

      return {
        status: "healthy",
        latency,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get database statistics
   */
  public async getStats(): Promise<{
    totalConnections: number;
    activeQueries: number;
    version: string;
  }> {
    try {
      const [connectionResult, versionResult] = await Promise.all([
        this.client.$queryRaw<{ count: bigint }[]>`
          SELECT count(*) as count 
          FROM pg_stat_activity 
          WHERE datname = current_database()
        `,
        this.client.$queryRaw<{ version: string }[]>`SELECT version()`,
      ]);

      return {
        totalConnections: Number(connectionResult[0]?.count || 0),
        activeQueries: 0, // This would require more complex queries
        version: versionResult[0]?.version || "Unknown",
      };
    } catch (error) {
      logger.error("Failed to get database stats:", error);
      throw error;
    }
  }

  /**
   * Execute raw SQL query with logging
   */
  public async executeRaw<T = any>(query: string, params?: any[]): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await this.client.$queryRawUnsafe<T>(
        query,
        ...(params || [])
      );
      const duration = Date.now() - startTime;

      logger.debug("Raw query executed:", {
        query,
        params,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error) {
      logger.error("Raw query failed:", {
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
  public async transaction<T>(
    callback: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    return this.client.$transaction(callback);
  }

  /**
   * Get Prisma client instance
   */
  public getClient(): PrismaClient {
    return this.client;
  }

  /**
   * Check if connected
   */
  public isHealthy(): boolean {
    return this.isConnected;
  }
}

/**
 * Default database manager instance
 */
export const database = DatabaseManager.getInstance();

/**
 * Graceful shutdown handler
 */
export const gracefulShutdown = async (): Promise<void> => {
  logger.info("Shutting down database connections...");
  await database.disconnect();
};

// Handle process termination
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
process.on("beforeExit", gracefulShutdown);

export default prisma;
