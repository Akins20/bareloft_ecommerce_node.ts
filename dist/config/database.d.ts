import { PrismaClient } from "@prisma/client";
export declare const prisma: PrismaClient<{
    datasources: {
        db: {
            url: string;
        };
    };
    log: ("query" | "error" | "info" | "warn")[];
}, never, import("@prisma/client/runtime/library").DefaultArgs>;
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