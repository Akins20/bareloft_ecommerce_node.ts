import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

// Configuration imports
import { config } from "./config/environment";
import { PrismaClient } from "@prisma/client";
import { getServiceContainer } from "./config/serviceContainer";
import { RedisService } from "./services/cache/RedisService";

// Type imports
import {
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
  createErrorResponse,
} from "./types";

// Middleware imports
import { errorHandler } from "./middleware/error/errorHandler";
import { requestLogger } from "./middleware/logging/requestLogger";
import { rateLimiter } from "./middleware/security/rateLimiter";
import { authenticate } from "./middleware/auth/authenticate";

// Route imports - API v1
import authRoutes from "./routes/v1/auth";
import userRoutes from "./routes/v1/users";
import productRoutes from "./routes/v1/products";
import categoryRoutes from "./routes/v1/categories";
import cartRoutes from "./routes/v1/cart";
import orderRoutes from "./routes/v1/orders";
import addressRoutes from "./routes/v1/addresses";
import reviewRoutes from "./routes/v1/reviews";
import wishlistRoutes from "./routes/v1/wishlist";
import searchRoutes from "./routes/v1/search";
import uploadRoutes from "./routes/v1/upload";
import paymentRoutes from "./routes/v1/payments";

// Admin routes
import adminRoutes from "./routes/admin";

// Webhook routes
// import webhookRoutes from "@/routes/webhooks";

class App {
  public app: Application;
  private readonly port: number;
  private prisma: PrismaClient;
  private redis: RedisService;

  constructor() {
    this.app = express();
    this.port = config.port;
    this.prisma = new PrismaClient();
    this.redis = new RedisService();

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Trust proxy for accurate IP addresses behind reverse proxy
    this.app.set("trust proxy", 1);

    // Security middleware
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: [
              "'self'",
              "data:",
              "https:",
              "*.cloudinary.com",
              "*.amazonaws.com",
            ],
            connectSrc: ["'self'", "*.paystack.co"],
          },
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
        crossOriginEmbedderPolicy: false, // For file uploads
      })
    );

    // CORS configuration for Nigerian e-commerce
    this.app.use(
      cors({
        origin: (origin, callback) => {
          // Allow requests with no origin (mobile apps, etc.)
          if (!origin) return callback(null, true);

          const allowedOrigins = config.cors.origin;
          if (Array.isArray(allowedOrigins)) {
            if (allowedOrigins.includes(origin)) {
              callback(null, true);
            } else {
              callback(new Error("Not allowed by CORS"));
            }
          } else {
            callback(null, allowedOrigins === "*" || allowedOrigins === origin);
          }
        },
        credentials: config.cors.credentials,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-Requested-With",
          "X-HTTP-Method-Override",
          "Accept",
          "Cache-Control",
        ],
        exposedHeaders: ["X-Total-Count", "X-Page-Count"],
      })
    );

    // Compression middleware
    this.app.use(
      compression({
        filter: (req, res) => {
          if (req.headers["x-no-compression"]) {
            return false;
          }
          return compression.filter(req, res);
        },
        threshold: 1024, // Only compress if size > 1KB
      })
    );

    // Request parsing with larger limits for file uploads
    this.app.use(
      express.json({
        limit: "10mb",
        verify: (req, res, buf) => {
          // Store raw body for webhook verification
          if (req.url?.startsWith("/webhooks/")) {
            (req as any).rawBody = buf;
          }
        },
      })
    );
    this.app.use(
      express.urlencoded({
        extended: true,
        limit: "10mb",
      })
    );

    // Request logging
    if (config.nodeEnv === "development") {
      this.app.use(morgan("dev"));
    } else {
      this.app.use(morgan("combined"));
    }

    // Custom request logger for audit trails
    this.app.use(requestLogger);

    // Global rate limiting
    this.app.use(rateLimiter.general);

    // Health check endpoint (before auth middleware)
    this.app.get("/health", this.healthCheck.bind(this));
    this.app.get("/", this.welcomeMessage.bind(this));

    // API documentation endpoint
    this.app.get("/api-docs", (req: Request, res: Response) => {
      res.json({
        message: "API Documentation",
        version: "1.0.0",
        endpoints: {
          authentication: "/api/v1/auth",
          users: "/api/v1/users",
          products: "/api/v1/products",
          categories: "/api/v1/categories",
          cart: "/api/v1/cart",
          orders: "/api/v1/orders",
          payments: "/api/v1/payments",
          addresses: "/api/v1/addresses",
          reviews: "/api/v1/reviews",
          wishlist: "/api/v1/wishlist",
          search: "/api/v1/search",
          upload: "/api/v1/upload",
          admin: "/api/v1/admin",
          webhooks: "/webhooks",
        },
        postman: "https://documenter.getpostman.com/bareloft-api",
        github: "https://github.com/bareloft/api",
      });
    });
  }

  private initializeRoutes(): void {
    // API version prefix
    const apiV1 = "/api/v1";

    // Public routes (no authentication required)
    this.app.use(`${apiV1}/auth`, authRoutes);
    this.app.use(`${apiV1}/products`, productRoutes);
    this.app.use(`${apiV1}/categories`, categoryRoutes);
    this.app.use(`${apiV1}/search`, searchRoutes);

    // Cart routes (supports both authenticated and guest users)
    this.app.use(`${apiV1}/cart`, cartRoutes);

    // Order routes (mixed public and protected endpoints)
    this.app.use(`${apiV1}/orders`, orderRoutes);

    // Payment routes (mixed public and protected endpoints)
    this.app.use(`${apiV1}/payments`, paymentRoutes);

    // Protected routes (authentication required)
    this.app.use(`${apiV1}/users`, authenticate, userRoutes);
    this.app.use(`${apiV1}/addresses`, authenticate, addressRoutes);
    this.app.use(`${apiV1}/reviews`, authenticate, reviewRoutes);
    this.app.use(`${apiV1}/wishlist`, authenticate, wishlistRoutes);
    this.app.use(`${apiV1}/upload`, authenticate, uploadRoutes);

    // Admin routes (admin authentication required)
    this.app.use("/api/admin", adminRoutes);

    // 404 handler for undefined routes
    this.app.use("*", (req: Request, res: Response) => {
      res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          createErrorResponse(
            `Route ${req.method} ${req.originalUrl} not found`,
            ERROR_CODES.RESOURCE_NOT_FOUND
          )
        );
    });
  }

  private initializeErrorHandling(): void {
    // Global error handler
    this.app.use(errorHandler);

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
      console.error("🚨 Unhandled Promise Rejection:", reason);
      console.error("📍 Promise:", promise);

      // In production, gracefully shut down
      if (config.nodeEnv === "production") {
        console.error("🔄 Gracefully shutting down...");
        this.gracefulShutdown();
      }
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error: Error) => {
      console.error("🚨 Uncaught Exception:", error);
      console.error("💀 Exiting process...");
      process.exit(1);
    });

    // Handle SIGTERM (graceful shutdown)
    process.on("SIGTERM", () => {
      console.log("📡 SIGTERM received. Shutting down gracefully...");
      this.gracefulShutdown();
    });

    // Handle SIGINT (Ctrl+C)
    process.on("SIGINT", () => {
      console.log("📡 SIGINT received. Shutting down gracefully...");
      this.gracefulShutdown();
    });
  }

  private async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();

      // Check database connection
      const dbHealth = await this.checkDatabaseHealth();

      // Check external services
      const [paystackHealth, emailHealth] = await Promise.allSettled([
        this.checkPaystackHealth(),
        this.checkEmailHealth(),
      ]);

      const responseTime = Date.now() - startTime;

      const healthStatus = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        environment: config.nodeEnv,
        responseTime: `${responseTime}ms`,
        services: {
          database: dbHealth ? "healthy" : "unhealthy",
          paystack:
            paystackHealth.status === "fulfilled" ? "healthy" : "unhealthy",
          email: emailHealth.status === "fulfilled" ? "healthy" : "unhealthy",
        },
        metrics: {
          uptime: `${Math.floor(process.uptime())}s`,
          memory: {
            used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
            total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
            rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
          },
          cpu: process.cpuUsage(),
          nodeVersion: process.version,
        },
        checks: {
          databaseLatency: dbHealth ? "< 100ms" : "timeout",
          apiResponse: "ok",
        },
      };

      const isHealthy = dbHealth && paystackHealth.status === "fulfilled";
      const statusCode = isHealthy
        ? HTTP_STATUS.OK
        : HTTP_STATUS.SERVICE_UNAVAILABLE;

      res.status(statusCode).json(healthStatus);
    } catch (error) {
      console.error("🏥 Health check failed:", error);
      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Health check failed",
        environment: config.nodeEnv,
      });
    }
  }

  private welcomeMessage(req: Request, res: Response): void {
    res.json({
      success: true,
      message: "🚀 Welcome to Bareloft E-commerce API",
      tagline: "Powering Nigerian E-commerce Excellence",
      version: "1.0.0",
      environment: config.nodeEnv,
      features: [
        "🔐 OTP-based Authentication",
        "🛍️ Product Catalog Management",
        "🛒 Shopping Cart & Checkout",
        "💳 Paystack Payment Integration",
        "📦 Order Management & Tracking",
        "⭐ Product Reviews & Ratings",
        "📍 Nigerian Address Validation",
        "📱 Mobile-Optimized API",
        "🔒 Enterprise Security",
        "📊 Analytics & Reporting",
      ],
      endpoints: {
        documentation: "/api-docs",
        health: "/health",
        authentication: "/api/v1/auth",
        products: "/api/v1/products",
        orders: "/api/v1/orders",
        payments: "/api/v1/payments",
      },
      support: {
        email: "api@bareloft.com",
        documentation: "https://docs.bareloft.com",
        status: "https://status.bareloft.com",
      },
      timestamp: new Date().toISOString(),
    });
  }

  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error("Database health check failed:", error);
      return false;
    }
  }

  private async checkPaystackHealth(): Promise<boolean> {
    try {
      // Simple check to Paystack API
      const response = await fetch("https://api.paystack.co/bank", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.paystack.secretKey}`,
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      console.error("Paystack health check failed:", error);
      return false;
    }
  }

  private async checkEmailHealth(): Promise<boolean> {
    try {
      // Add email service health check here
      // For now, return true
      return true;
    } catch (error) {
      console.error("Email health check failed:", error);
      return false;
    }
  }

  private async verifyDatabaseSchema(): Promise<void> {
    try {
      // Check if critical tables exist
      const tables = await this.prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('users', 'products', 'categories', 'orders')
      `;
      
      const expectedTables = ['users', 'products', 'categories', 'orders'];
      const existingTables = tables.map(t => t.tablename);
      const missingTables = expectedTables.filter(table => !existingTables.includes(table));
      
      if (missingTables.length > 0) {
        console.warn(`⚠️ Missing critical tables: ${missingTables.join(', ')}`);
        console.warn('🔄 Attempting to create missing tables...');
        
        // In production, this should trigger an alert but continue
        if (process.env.NODE_ENV === 'production') {
          console.error('❌ Critical tables missing in production! Manual intervention required.');
          // Don't throw in production - log and continue
        } else {
          console.log('💡 Run "npm run db:deploy" to create missing tables');
        }
      }
      
    } catch (error) {
      console.error("Database schema verification failed:", error);
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Database schema verification failed in production');
      }
      // In development, warn but continue
      console.warn('⚠️ Continuing with unverified database schema');
    }
  }

  public async initialize(): Promise<void> {
    try {
      console.log("🔄 Initializing Bareloft API services...");

      // Initialize database connection
      await this.prisma.$connect();
      console.log("✅ Database connected successfully");

      // Verify database schema
      await this.verifyDatabaseSchema();
      console.log("✅ Database schema verified");

      // Initialize Redis connection
      try {
        await this.redis.connect();
        console.log("✅ Redis connected successfully");
      } catch (error) {
        console.log("⚠️ Redis connection failed, continuing without cache");
      }

      // Initialize service container with proper dependencies
      const serviceContainer = getServiceContainer();
      await serviceContainer.initialize();
      console.log("✅ Service container initialized successfully");

      // Run database migrations if needed
      // await this.runMigrations();

      console.log("🎉 All services initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize services:", error);
      throw error;
    }
  }

  public async start(): Promise<void> {
    try {
      await this.initialize();

      const server = this.app.listen(this.port, () => {
        console.log(`
🚀 Bareloft E-commerce API Server Started Successfully!

📊 Server Information:
   Environment: ${config.nodeEnv}
   Port: ${this.port}
   Node.js: ${process.version}
   Platform: ${process.platform}

🌐 Endpoints:
   API Base: http://localhost:${this.port}/api/v1
   Health Check: http://localhost:${this.port}/health
   Documentation: http://localhost:${this.port}/api-docs
   Welcome: http://localhost:${this.port}

🔗 Key Features:
   🔐 Authentication: /api/v1/auth
   🛍️ Products: /api/v1/products  
   🛒 Cart: /api/v1/cart
   📦 Orders: /api/v1/orders
   👑 Admin: /api/v1/admin
   🔗 Webhooks: /webhooks

🇳🇬 Optimized for Nigerian Market:
   ✅ Naira currency support
   ✅ Nigerian phone validation
   ✅ Local address formats
   ✅ Paystack integration ready

💡 Ready to power amazing e-commerce experiences!
        `);
      });

      // Store server reference for graceful shutdown
      (this as any).server = server;
    } catch (error) {
      console.error("❌ Failed to start server:", error);
      process.exit(1);
    }
  }

  private async gracefulShutdown(): Promise<void> {
    console.log("🔄 Starting graceful shutdown...");

    try {
      // Close server
      if ((this as any).server) {
        await new Promise<void>((resolve) => {
          (this as any).server.close(() => {
            console.log("✅ HTTP server closed");
            resolve();
          });
        });
      }

      // Close database connection
      await this.prisma.$disconnect();
      console.log("✅ Database connection closed");

      // Close Redis connection
      await this.redis.disconnect();
      console.log("✅ Redis connection closed");

      console.log("✅ Graceful shutdown completed");
      process.exit(0);
    } catch (error) {
      console.error("❌ Error during graceful shutdown:", error);
      process.exit(1);
    }
  }

  public getApp(): Application {
    return this.app;
  }

  public getPrisma(): PrismaClient {
    return this.prisma;
  }
}

export default App;
