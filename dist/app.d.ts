import { Application } from "express";
declare class App {
    app: Application;
    private readonly port;
    constructor();
    private initializeMiddleware;
    private initializeRoutes;
    private initializeErrorHandling;
    private healthCheck;
    initialize(): Promise<void>;
    start(): Promise<void>;
    getApp(): Application;
}
export default App;
//# sourceMappingURL=app.d.ts.map