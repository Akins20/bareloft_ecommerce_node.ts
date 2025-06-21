import { Application } from "express";
import { PrismaClient } from "@prisma/client";
declare class App {
    app: Application;
    private readonly port;
    private prisma;
    constructor();
    private initializeMiddleware;
    private initializeRoutes;
    private initializeErrorHandling;
    private healthCheck;
    private welcomeMessage;
    private checkDatabaseHealth;
    private checkPaystackHealth;
    private checkEmailHealth;
    initialize(): Promise<void>;
    start(): Promise<void>;
    private gracefulShutdown;
    getApp(): Application;
    getPrisma(): PrismaClient;
}
export default App;
//# sourceMappingURL=app.d.ts.map