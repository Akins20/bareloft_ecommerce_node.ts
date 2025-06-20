"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/app.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
// Configuration imports
const environment_1 = require("@/config/environment");
const database_1 = require("@/config/database");
const redis_1 = require("@/config/redis");
// Type imports
const types_1 = require("@/types");
// Middleware imports (TODO: Create these)
// import { rateLimiter } from '@/middleware/security/rateLimiter';
// import { errorHandler } from '@/middleware/error/errorHandler';
// import { requestLogger } from '@/middleware/logging/requestLogger';
// Route imports
const auth_1 = require("@/routes/v1/auth");
class App {
    app;
    port;
    constructor() {
        this.app = (0, express_1.default)();
        this.port = environment_1.config.port;
        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }
    initializeMiddleware() {
        // Security middleware
        this.app.use((0, helmet_1.default)({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                },
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true,
            },
        }));
        // CORS configuration
        this.app.use((0, cors_1.default)({
            origin: environment_1.config.cors.origin,
            credentials: environment_1.config.cors.credentials,
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
        }));
        // Compression middleware
        this.app.use((0, compression_1.default)());
        // Request parsing
        this.app.use(express_1.default.json({ limit: "10mb" }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
        // Request logging
        if (environment_1.config.nodeEnv === "development") {
            this.app.use((0, morgan_1.default)("dev"));
        }
        else {
            this.app.use((0, morgan_1.default)("combined"));
        }
        // Rate limiting (TODO: Implement)
        // this.app.use(rateLimiter);
        // Custom request logger (TODO: Implement)
        // this.app.use(requestLogger);
        // Health check endpoint
        this.app.get("/health", this.healthCheck.bind(this));
        // API documentation (TODO: Implement Swagger)
        // this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    }
    initializeRoutes() {
        // API version prefix
        const apiV1 = "/api/v1";
        // Welcome route
        this.app.get("/", (req, res) => {
            res.json({
                success: true,
                message: "Welcome to Bareloft E-commerce API",
                version: "1.0.0",
                documentation: "/api-docs",
                health: "/health",
                timestamp: new Date().toISOString(),
            });
        });
        // API routes
        this.app.use(`${apiV1}/auth`, auth_1.authRoutes);
        // TODO: Add more routes as we build them
        // this.app.use(`${apiV1}/users`, userRoutes);
        // this.app.use(`${apiV1}/products`, productRoutes);
        // this.app.use(`${apiV1}/orders`, orderRoutes);
        // this.app.use(`${apiV1}/cart`, cartRoutes);
        // Admin routes
        // this.app.use(`${apiV1}/admin`, adminRoutes);
        // Webhook routes
        // this.app.use('/webhooks', webhookRoutes);
        // 404 handler for undefined routes
        this.app.use("*", (req, res) => {
            res
                .status(types_1.HTTP_STATUS.NOT_FOUND)
                .json((0, types_1.createErrorResponse)(`Route ${req.originalUrl} not found`, types_1.ERROR_CODES.RESOURCE_NOT_FOUND));
        });
    }
    initializeErrorHandling() {
        // Global error handler
        this.app.use((error, req, res, next) => {
            console.error("Global error handler:", error);
            // Handle AppError instances
            if (error instanceof types_1.AppError) {
                return res
                    .status(error.statusCode)
                    .json((0, types_1.createErrorResponse)(error.message, error.code, error.isOperational ? undefined : "Internal server error"));
            }
            // Handle validation errors
            if (error.name === "ValidationError") {
                return res
                    .status(types_1.HTTP_STATUS.BAD_REQUEST)
                    .json((0, types_1.createErrorResponse)("Validation failed", types_1.ERROR_CODES.VALIDATION_ERROR, error.message));
            }
            // Handle JSON parsing errors
            if (error instanceof SyntaxError && "body" in error) {
                return res
                    .status(types_1.HTTP_STATUS.BAD_REQUEST)
                    .json((0, types_1.createErrorResponse)("Invalid JSON format", types_1.ERROR_CODES.INVALID_INPUT));
            }
            // Handle Prisma errors
            if (error.name === "PrismaClientKnownRequestError") {
                const prismaError = error;
                if (prismaError.code === "P2002") {
                    return res
                        .status(types_1.HTTP_STATUS.CONFLICT)
                        .json((0, types_1.createErrorResponse)("Duplicate entry found", types_1.ERROR_CODES.RESOURCE_ALREADY_EXISTS));
                }
                if (prismaError.code === "P2025") {
                    return res
                        .status(types_1.HTTP_STATUS.NOT_FOUND)
                        .json((0, types_1.createErrorResponse)("Record not found", types_1.ERROR_CODES.RESOURCE_NOT_FOUND));
                }
            }
            // Default error response
            res
                .status(types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR)
                .json((0, types_1.createErrorResponse)(environment_1.config.nodeEnv === "development"
                ? error.message
                : "Internal server error", types_1.ERROR_CODES.INTERNAL_ERROR));
        });
        // Handle unhandled promise rejections
        process.on("unhandledRejection", (reason, promise) => {
            console.error("Unhandled Promise Rejection:", reason);
            // In production, you might want to gracefully shut down
            if (environment_1.config.nodeEnv === "production") {
                process.exit(1);
            }
        });
        // Handle uncaught exceptions
        process.on("uncaughtException", (error) => {
            console.error("Uncaught Exception:", error);
            process.exit(1);
        });
    }
    async healthCheck(req, res) {
        try {
            // Check database connection
            const dbHealth = await database_1.db.healthCheck();
            // Check Redis connection
            const redisHealth = await redis_1.redisClient.healthCheck();
            const healthStatus = {
                status: "healthy",
                timestamp: new Date().toISOString(),
                version: "1.0.0",
                environment: environment_1.config.nodeEnv,
                services: {
                    database: dbHealth ? "healthy" : "unhealthy",
                    redis: redisHealth ? "healthy" : "unhealthy",
                    // TODO: Add external service checks
                    // paystack: await this.checkPaystackHealth(),
                    // email: await this.checkEmailHealth(),
                    // sms: await this.checkSMSHealth()
                },
                metrics: {
                    uptime: process.uptime(),
                    memory: {
                        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
                    },
                    cpu: process.cpuUsage(),
                },
            };
            const isHealthy = dbHealth && redisHealth;
            const statusCode = isHealthy
                ? types_1.HTTP_STATUS.OK
                : types_1.HTTP_STATUS.SERVICE_UNAVAILABLE;
            res.status(statusCode).json(healthStatus);
        }
        catch (error) {
            console.error("Health check failed:", error);
            res.status(types_1.HTTP_STATUS.SERVICE_UNAVAILABLE).json({
                status: "unhealthy",
                timestamp: new Date().toISOString(),
                error: "Health check failed",
            });
        }
    }
    async initialize() {
        try {
            // Initialize database connection
            await database_1.db.connect();
            // Initialize Redis connection
            await redis_1.redisClient.connect();
            console.log("✅ All services initialized successfully");
        }
        catch (error) {
            console.error("❌ Failed to initialize services:", error);
            throw error;
        }
    }
    async start() {
        try {
            await this.initialize();
            this.app.listen(this.port, () => {
                console.log(`
🚀 Bareloft E-commerce API Server Started
📍 Environment: ${environment_1.config.nodeEnv}
🌐 Port: ${this.port}
🔗 URL: http://localhost:${this.port}
📚 Docs: http://localhost:${this.port}/api-docs
❤️  Health: http://localhost:${this.port}/health
        `);
            });
        }
        catch (error) {
            console.error("❌ Failed to start server:", error);
            process.exit(1);
        }
    }
    getApp() {
        return this.app;
    }
}
exports.default = App;
//# sourceMappingURL=app.js.map