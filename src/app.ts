// src/app.ts
import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";

// Configuration imports
import { config } from "@/config/environment";
import { db } from "@/config/database";
import { redisClient } from "@/config/redis";

// Type imports
import {
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
  createErrorResponse,
} from "@/types";

// Middleware imports (TODO: Create these)
// import { rateLimiter } from '@/middleware/security/rateLimiter';
// import { errorHandler } from '@/middleware/error/errorHandler';
// import { requestLogger } from '@/middleware/logging/requestLogger';

// Route imports
import { authRoutes } from "@/routes/v1/auth";

class App {
  public app: Application;
  private readonly port: number;

  constructor() {
    this.app = express();
    this.port = config.port;

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(
      helmet({
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
      })
    );

    // CORS configuration
    this.app.use(
      cors({
        origin: config.cors.origin,
        credentials: config.cors.credentials,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      })
    );

    // Compression middleware
    this.app.use(compression());

    // Request parsing
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Request logging
    if (config.nodeEnv === "development") {
      this.app.use(morgan("dev"));
    } else {
      this.app.use(morgan("combined"));
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

  private initializeRoutes(): void {
    // API version prefix
    const apiV1 = "/api/v1";

    // Welcome route
    this.app.get("/", (req: Request, res: Response) => {
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
    this.app.use(`${apiV1}/auth`, authRoutes);
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
    this.app.use("*", (req: Request, res: Response) => {
      res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          createErrorResponse(
            `Route ${req.originalUrl} not found`,
            ERROR_CODES.RESOURCE_NOT_FOUND
          )
        );
    });
  }

  private initializeErrorHandling(): void {
    // Global error handler
    this.app.use(
      (error: Error, req: Request, res: Response, next: NextFunction) => {
        console.error("Global error handler:", error);

        // Handle AppError instances
        if (error instanceof AppError) {
          return res
            .status(error.statusCode)
            .json(
              createErrorResponse(
                error.message,
                error.code,
                error.isOperational ? undefined : "Internal server error"
              )
            );
        }

        // Handle validation errors
        if (error.name === "ValidationError") {
          return res
            .status(HTTP_STATUS.BAD_REQUEST)
            .json(
              createErrorResponse(
                "Validation failed",
                ERROR_CODES.VALIDATION_ERROR,
                error.message
              )
            );
        }

        // Handle JSON parsing errors
        if (error instanceof SyntaxError && "body" in error) {
          return res
            .status(HTTP_STATUS.BAD_REQUEST)
            .json(
              createErrorResponse(
                "Invalid JSON format",
                ERROR_CODES.INVALID_INPUT
              )
            );
        }

        // Handle Prisma errors
        if (error.name === "PrismaClientKnownRequestError") {
          const prismaError = error as any;

          if (prismaError.code === "P2002") {
            return res
              .status(HTTP_STATUS.CONFLICT)
              .json(
                createErrorResponse(
                  "Duplicate entry found",
                  ERROR_CODES.RESOURCE_ALREADY_EXISTS
                )
              );
          }

          if (prismaError.code === "P2025") {
            return res
              .status(HTTP_STATUS.NOT_FOUND)
              .json(
                createErrorResponse(
                  "Record not found",
                  ERROR_CODES.RESOURCE_NOT_FOUND
                )
              );
          }
        }

        // Default error response
        res
          .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json(
            createErrorResponse(
              config.nodeEnv === "development"
                ? error.message
                : "Internal server error",
              ERROR_CODES.INTERNAL_ERROR
            )
          );
      }
    );

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
      console.error("Unhandled Promise Rejection:", reason);
      // In production, you might want to gracefully shut down
      if (config.nodeEnv === "production") {
        process.exit(1);
      }
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error: Error) => {
      console.error("Uncaught Exception:", error);
      process.exit(1);
    });
  }

  private async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Check database connection
      const dbHealth = await db.healthCheck();

      // Check Redis connection
      const redisHealth = await redisClient.healthCheck();

      const healthStatus = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        environment: config.nodeEnv,
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
        ? HTTP_STATUS.OK
        : HTTP_STATUS.SERVICE_UNAVAILABLE;

      res.status(statusCode).json(healthStatus);
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      });
    }
  }

  public async initialize(): Promise<void> {
    try {
      // Initialize database connection
      await db.connect();

      // Initialize Redis connection
      await redisClient.connect();

      console.log("✅ All services initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize services:", error);
      throw error;
    }
  }

  public async start(): Promise<void> {
    try {
      await this.initialize();

      this.app.listen(this.port, () => {
        console.log(`
🚀 Bareloft E-commerce API Server Started
📍 Environment: ${config.nodeEnv}
🌐 Port: ${this.port}
🔗 URL: http://localhost:${this.port}
📚 Docs: http://localhost:${this.port}/api-docs
❤️  Health: http://localhost:${this.port}/health
        `);
      });
    } catch (error) {
      console.error("❌ Failed to start server:", error);
      process.exit(1);
    }
  }

  public getApp(): Application {
    return this.app;
  }
}

export default App;
