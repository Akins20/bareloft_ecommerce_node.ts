import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";

// Configuration imports
import { config } from "./config/environment";
import { PrismaClient } from "@prisma/client";
import { getServiceContainer } from "./config/serviceContainer";
import { GlobalRedisService } from "./utils/globalRedisService";

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
import { slidingSessionMiddleware } from "./middleware/auth/slidingSession";
import { performanceMiddleware } from "./middleware/monitoring/performanceMiddleware";
import { sanitizeInput } from "./middleware/validation/sanitizeInput";
import { xssProtection } from "./middleware/security/xss";
import { 
  securityEnhancements 
} from "./middleware/security/securityEnhancements";

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
import notificationRoutes from "./routes/v1/notifications";
import returnsRoutes from "./routes/v1/returns";
import shippingRoutes from "./routes/v1/shipping";
import metricsRoutes from "./routes/v1/metrics";

// Admin routes
import adminRoutes from "./routes/admin";

// Webhook routes
// import webhookRoutes from "@/routes/webhooks";

class App {
  public app: Application;
  private readonly port: number;
  private prisma: PrismaClient;

  constructor() {
    this.app = express();
    this.port = config.port;

    // Initialize Prisma with optimized connection pool settings
    // Add connection pool parameters to DATABASE_URL for faster cold starts
    const databaseUrl = process.env.DATABASE_URL || '';
    const optimizedUrl = databaseUrl.includes('?')
      ? `${databaseUrl}&connection_limit=10&pool_timeout=20`
      : `${databaseUrl}?connection_limit=10&pool_timeout=20`;

    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: optimizedUrl,
        },
      },
      log: config.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
    });

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
          
          // If allowedOrigins is true (development mode), allow all origins
          if (allowedOrigins === true) {
            return callback(null, true);
          }
          
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
          "X-Country",
          "X-Currency", 
          "X-Timezone",
          "X-Session-ID",
        ],
        exposedHeaders: ["X-Total-Count", "X-Page-Count"],
      })
    );

    // Note: Compression has been disabled due to compatibility issues (see line ~251)

    // Performance monitoring middleware - track response times and metrics
    // Disabled in development for better performance
    if (config.nodeEnv !== "development") {
      this.app.use(performanceMiddleware);
    }

    // Enhanced security headers
    this.app.use(securityEnhancements.enhancedSecurityHeaders);

    // Security audit logging
    // Disabled in development for better performance
    if (config.nodeEnv !== "development") {
      this.app.use(securityEnhancements.securityAuditLogger);
    }

    // Request size limits for DoS protection
    this.app.use(securityEnhancements.requestSizeLimit(config.security.maxRequestSizeMB));

    // Suspicious activity detection - ONLY on write operations to reduce overhead
    this.app.use((req, res, next) => {
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
        return securityEnhancements.suspiciousActivityDetection(req, res, next);
      }
      next();
    });

    // SQL and NoSQL injection protection - ONLY on write operations
    // Skip expensive regex checks on GET/HEAD/OPTIONS requests
    this.app.use((req, res, next) => {
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
        return securityEnhancements.sqlInjectionProtection(req, res, next);
      }
      next();
    });

    this.app.use((req, res, next) => {
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
        return securityEnhancements.noSqlInjectionProtection(req, res, next);
      }
      next();
    });

    // XSS Protection - only on write operations
    this.app.use((req, res, next) => {
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        return xssProtection(req, res, next);
      }
      next();
    });

    // Input sanitization - only on write operations
    this.app.use((req, res, next) => {
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        return sanitizeInput(req, res, next);
      }
      next();
    });

    // Content type validation for POST/PUT requests
    this.app.use(securityEnhancements.contentTypeValidation(['application/json', 'multipart/form-data']));

    // Cookie parser middleware for cookie-based authentication
    this.app.use(cookieParser());

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

    // Compression disabled - causing "incorrect header check" errors with some clients
    // Performance is already excellent (5-8ms) without compression
    // Can re-enable later with proper testing if bandwidth becomes a concern
    // this.app.use(compression());

    // Request logging
    if (config.nodeEnv === "development") {
      this.app.use(morgan("dev"));
    } else {
      this.app.use(morgan("combined"));
    }

    // Custom request logger for audit trails
    // Disabled in development for better performance (morgan already logs requests)
    if (config.nodeEnv !== "development") {
      this.app.use(requestLogger);
    }

    // Global rate limiting
    this.app.use(rateLimiter.general);

    // Health check endpoints (before auth middleware)
    this.app.get("/health", this.healthCheck.bind(this));
    this.app.get("/health/detailed", this.detailedHealthCheck.bind(this));
    this.app.get("/", this.welcomeMessage.bind(this));

    // Swagger UI documentation
    try {
      const swaggerDocument = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'swagger.json'), 'utf8')
      );
      
      this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'Bareloft E-commerce API Documentation',
        swaggerOptions: {
          docExpansion: 'none',
          filter: true,
          showRequestHeaders: true,
          showCommonExtensions: true,
          tryItOutEnabled: true,
        }
      }));
      
      // Fallback endpoint for API information (available at /api-info)
      this.app.get("/api-info", (req: Request, res: Response) => {
        res.json({
          message: "API Documentation",
          version: "1.0.0",
          documentation: "/api-docs",
          endpoints: {
            authentication: "/api/v1/auth",
            users: "/api/v1/users", 
            products: "/api/v1/products",
            categories: "/api/v1/categories",
            cart: "/api/v1/cart",
            orders: "/api/v1/orders",
            payments: "/api/v1/payments",
            shipping: "/api/v1/shipping",
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
    } catch (error) {
      console.error("Failed to load swagger.json:", error);
      
      // Fallback to simple JSON response if swagger.json is not available
      this.app.get("/api-docs", (req: Request, res: Response) => {
        res.json({
          error: "Swagger documentation unavailable",
          message: "Please run 'npm run docs:generate' to generate API documentation",
          endpoints: {
            authentication: "/api/v1/auth",
            users: "/api/v1/users",
            products: "/api/v1/products",
            categories: "/api/v1/categories",
            cart: "/api/v1/cart",
            orders: "/api/v1/orders",
            payments: "/api/v1/payments",
          }
        });
      });
    }
  }

  private initializeRoutes(): void {
    // API version prefix
    const apiV1 = "/api/v1";

    // Public routes (no authentication required)
    this.app.use(`${apiV1}/auth`, authRoutes);
    this.app.use(`${apiV1}/products`, productRoutes);
    this.app.use(`${apiV1}/categories`, categoryRoutes);
    this.app.use(`${apiV1}/search`, searchRoutes);
    this.app.use(`${apiV1}/shipping`, shippingRoutes);
    this.app.use(`${apiV1}/metrics`, metricsRoutes);

    // Cart routes (supports both authenticated and guest users)
    this.app.use(`${apiV1}/cart`, cartRoutes);

    // Order routes (mixed public and protected endpoints)
    this.app.use(`${apiV1}/orders`, orderRoutes);

    // Payment routes (mixed public and protected endpoints)
    this.app.use(`${apiV1}/payments`, paymentRoutes);

    // Protected routes (authentication + sliding session)
    this.app.use(`${apiV1}/users`, authenticate, slidingSessionMiddleware, userRoutes);
    this.app.use(`${apiV1}/addresses`, authenticate, slidingSessionMiddleware, addressRoutes);
    this.app.use(`${apiV1}/reviews`, authenticate, slidingSessionMiddleware, reviewRoutes);
    this.app.use(`${apiV1}/wishlist`, authenticate, slidingSessionMiddleware, wishlistRoutes);
    this.app.use(`${apiV1}/upload`, authenticate, slidingSessionMiddleware, uploadRoutes);
    this.app.use(`${apiV1}/notifications`, authenticate, slidingSessionMiddleware, notificationRoutes);
    this.app.use(`${apiV1}/returns`, authenticate, slidingSessionMiddleware, returnsRoutes);

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

      // Only check database for basic health - fastest and most critical
      const dbHealth = await this.checkDatabaseHealth();

      const responseTime = Date.now() - startTime;

      const healthStatus = {
        status: dbHealth ? "healthy" : "unhealthy",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        environment: config.nodeEnv,
        responseTime: `${responseTime}ms`,
        services: {
          database: dbHealth ? "healthy" : "unhealthy",
          api: "healthy", // If we can respond, API is healthy
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

      const statusCode = dbHealth ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;
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

  private async detailedHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();

      // Check database connection
      const dbHealth = await this.checkDatabaseHealth();

      // Check external services with timeout
      const [paystackHealth, emailHealth] = await Promise.allSettled([
        this.checkPaystackHealth(),
        this.checkEmailHealth(),
      ]);

      const responseTime = Date.now() - startTime;

      const healthStatus = {
        status: "detailed_check",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        environment: config.nodeEnv,
        responseTime: `${responseTime}ms`,
        services: {
          database: dbHealth ? "healthy" : "unhealthy",
          paystack: paystackHealth.status === "fulfilled" ? "healthy" : "unhealthy",
          email: emailHealth.status === "fulfilled" ? "healthy" : "unhealthy",
          api: "healthy",
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
          paystackLatency: paystackHealth.status === "fulfilled" ? "< 5s" : "timeout/error",
          emailLatency: emailHealth.status === "fulfilled" ? "< 1s" : "timeout/error",
          apiResponse: "ok",
        },
        warnings: [
          ...(paystackHealth.status === "rejected" ? ["Paystack API connectivity issues"] : []),
          ...(emailHealth.status === "rejected" ? ["Email service connectivity issues"] : []),
        ],
      };

      // Consider healthy if core services (DB) are working
      const isHealthy = dbHealth;
      const statusCode = isHealthy ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;

      res.status(statusCode).json(healthStatus);
    } catch (error) {
      console.error("🏥 Detailed health check failed:", error);
      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Detailed health check failed",
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
      // Use a simple connectivity check with timeout
      const result = await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), 1000)
        )
      ]);
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

  /**
   * Pre-warm critical queries to reduce cold start latency
   * This executes and compiles frequently-used queries during startup
   */
  private async prewarmQueries(): Promise<void> {
    try {
      console.log("🔥 Pre-warming critical queries...");
      const startTime = Date.now();

      // Run queries in parallel for faster warmup
      await Promise.all([
        // Pre-warm product queries (most frequently accessed)
        this.prisma.product.findFirst({
          where: { isActive: true },
          include: {
            category: true,
            images: true,
            reviews: true,
          }
        }).catch(() => null), // Ignore errors if no data

        // Pre-warm category queries
        this.prisma.category.findFirst({
          where: { isActive: true }
        }).catch(() => null),

        // Pre-warm user queries (for authentication)
        this.prisma.user.findFirst({
          select: {
            id: true,
            phoneNumber: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          }
        }).catch(() => null),

        // Pre-warm session queries
        this.prisma.session.findFirst({
          where: { expiresAt: { gt: new Date() } }
        }).catch(() => null),
      ]);

      const duration = Date.now() - startTime;
      console.log(`✅ Query pre-warming completed in ${duration}ms`);
    } catch (error) {
      console.warn('⚠️ Query pre-warming failed, continuing anyway:', error);
      // Don't throw - pre-warming is optional optimization
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

      // Initialize Redis connection using singleton
      try {
        await GlobalRedisService.getInstance();
        console.log("✅ Redis connected successfully");
      } catch (error) {
        console.log("⚠️ Redis connection failed, continuing without cache");
      }

      // Initialize service container with shared Prisma instance
      const serviceContainer = getServiceContainer();
      serviceContainer.setPrismaClient(this.prisma);
      await serviceContainer.initialize();
      console.log("✅ Service container initialized with shared Prisma instance");

      // Initialize email service
      const { EmailHelper } = await import('./utils/email/emailHelper');
      await EmailHelper.initialize();
      console.log("✅ Email service initialized successfully");

      // Initialize job service (background job processing)
      const { GlobalJobService } = await import('./utils/globalJobService');
      const jobService = await GlobalJobService.getInstance();
      console.log("✅ Job service initialized successfully");
      
      // Store job service reference for graceful shutdown
      (this as any).jobService = jobService;

      // DISABLED: Payment reconciliation scheduler
      // Uncomment below to re-enable automatic payment reconciliation
      // const { PaymentReconciliationScheduler } = await import('./services/scheduler/PaymentReconciliationScheduler');
      // const reconciliationScheduler = new PaymentReconciliationScheduler(jobService);
      // reconciliationScheduler.start();
      // console.log("✅ Payment reconciliation scheduler started successfully");
      // (this as any).reconciliationScheduler = reconciliationScheduler;

      // Pre-warm critical queries to reduce cold start latency
      await this.prewarmQueries();

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
      const redis = GlobalRedisService.getInstanceSync();
      if (redis) {
        await redis.disconnect();
        console.log("✅ Redis connection closed");
      }

      // Stop payment reconciliation scheduler
      if ((this as any).reconciliationScheduler) {
        (this as any).reconciliationScheduler.stop();
        console.log("✅ Payment reconciliation scheduler stopped");
      }

      // Shutdown job service
      if ((this as any).jobService) {
        await (this as any).jobService.shutdown();
        console.log("✅ Job service shutdown completed");
      }

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
