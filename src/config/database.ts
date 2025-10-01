import { PrismaClient } from "@prisma/client";
import { config } from "./environment";

// Create Prisma client instance
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.database.url,
    },
  },
  log:
    config.nodeEnv === "development"
      ? ["warn", "error"]  // Removed "query" and "info" for better performance
      : ["error"],
});

// Database connection management
export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private client: PrismaClient;
  private isConnected = false;

  private constructor() {
    this.client = prisma;
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.client.$connect();
      this.isConnected = true;
      console.log("✅ Database connected successfully");
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.client.$disconnect();
      this.isConnected = false;
      console.log("✅ Database disconnected successfully");
    } catch (error) {
      console.error("❌ Database disconnection failed:", error);
      throw error;
    }
  }

  public getClient(): PrismaClient {
    return this.client;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error("❌ Database health check failed:", error);
      return false;
    }
  }

  public async executeInTransaction<T>(
    operations: (client: PrismaClient) => Promise<T>
  ): Promise<T> {
    return await this.client.$transaction(async (transaction: any) => {
      return await operations(transaction);
    });
  }
}

// Export database instance
export const db = DatabaseConnection.getInstance();

// Graceful shutdown handler
process.on("SIGINT", async () => {
  console.log("🔄 Graceful shutdown initiated...");
  await db.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("🔄 Graceful shutdown initiated...");
  await db.disconnect();
  process.exit(0);
});
