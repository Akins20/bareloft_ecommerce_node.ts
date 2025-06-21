import { PrismaClient } from "@prisma/client";
export declare const prisma: any;
export declare class DatabaseConnection {
    private static instance;
    private client;
    private isConnected;
    private constructor();
    static getInstance(): DatabaseConnection;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getClient(): PrismaClient;
    healthCheck(): Promise<boolean>;
    executeInTransaction<T>(operations: (client: PrismaClient) => Promise<T>): Promise<T>;
}
export declare const db: DatabaseConnection;
//# sourceMappingURL=database.d.ts.map