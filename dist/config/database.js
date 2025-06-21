"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.DatabaseConnection = exports.prisma = void 0;
const client_1 = require("@prisma/client");
const environment_1 = require("./environment");
// Create Prisma client instance
exports.prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: environment_1.config.database.url,
        },
    },
    log: environment_1.config.nodeEnv === "development"
        ? ["query", "info", "warn", "error"]
        : ["error"],
});
// Database connection management
class DatabaseConnection {
    static instance;
    client;
    isConnected = false;
    constructor() {
        this.client = exports.prisma;
    }
    static getInstance() {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection();
        }
        return DatabaseConnection.instance;
    }
    async connect() {
        if (this.isConnected) {
            return;
        }
        try {
            await this.client.$connect();
            this.isConnected = true;
            console.log("✅ Database connected successfully");
        }
        catch (error) {
            console.error("❌ Database connection failed:", error);
            throw error;
        }
    }
    async disconnect() {
        if (!this.isConnected) {
            return;
        }
        try {
            await this.client.$disconnect();
            this.isConnected = false;
            console.log("✅ Database disconnected successfully");
        }
        catch (error) {
            console.error("❌ Database disconnection failed:", error);
            throw error;
        }
    }
    getClient() {
        return this.client;
    }
    async healthCheck() {
        try {
            await this.client.$queryRaw `SELECT 1`;
            return true;
        }
        catch (error) {
            console.error("❌ Database health check failed:", error);
            return false;
        }
    }
    async executeInTransaction(operations) {
        return await this.client.$transaction(async (transaction) => {
            return await operations(transaction);
        });
    }
}
exports.DatabaseConnection = DatabaseConnection;
// Export database instance
exports.db = DatabaseConnection.getInstance();
// Graceful shutdown handler
process.on("SIGINT", async () => {
    console.log("🔄 Graceful shutdown initiated...");
    await exports.db.disconnect();
    process.exit(0);
});
process.on("SIGTERM", async () => {
    console.log("🔄 Graceful shutdown initiated...");
    await exports.db.disconnect();
    process.exit(0);
});
//# sourceMappingURL=database.js.map