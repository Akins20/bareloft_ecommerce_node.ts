# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Database Operations
```bash
# Database migrations and schema
npm run db:generate          # Generate Prisma client
npm run db:migrate          # Create and apply migration (dev)
npm run db:migrate:prod     # Deploy migrations to production
npm run db:deploy           # Deploy migrations or push schema
npm run db:seed             # Seed database with test data
npm run db:seed:prod        # Seed production database
npm run db:reset            # Reset database (dev only)
npm run db:studio           # Open Prisma Studio
npm run db:verify           # Verify database health
npm run db:check            # Check database health
npm run db:setup:dev        # Full dev DB setup (generate + migrate + seed)
npm run db:setup:prod       # Full prod DB setup (generate + deploy + seed)

# Build and Development
npm run build               # Full production build (clean + db:setup:prod + docs + compile)
npm run build:dev           # Development build (clean + db:setup:dev + docs + compile)
npm run clean               # Remove dist folder
npm run dev                 # Start development server with hot reload (nodemon)
npm start                   # Start production server from dist/

# Testing
npm test                    # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report
npm run test:integration   # Run integration tests only
npm run test:e2e           # Run end-to-end tests

# Code Quality
npm run lint               # Run ESLint on src/**/*.ts
npm run lint:fix           # Fix ESLint issues automatically
npm run type-check         # TypeScript type checking without emit

# Documentation
npm run docs:generate      # Generate Swagger documentation from routes
npm run docs:serve         # Serve API documentation

# Deployment
npm run deploy             # Run deployment script
npm run deploy:railway     # Build and start for Railway deployment
```

## Architecture Overview

### Layered Architecture Pattern
This is a Nigerian e-commerce backend API built with a strict layered architecture:

1. **Routes Layer** (`src/routes/`) - API endpoint definitions and routing
2. **Controllers Layer** (`src/controllers/`) - HTTP request/response handling  
3. **Services Layer** (`src/services/`) - Business logic and rules
4. **Repositories Layer** (`src/repositories/`) - Data access abstraction
5. **Models Layer** (`src/models/`) - Prisma database models

### Key Design Principles

- **Path Aliases**: Uses TypeScript path mapping with `@/` prefix for clean imports
- **Barrel Exports**: Each major directory has an `index.ts` that exports all modules
- **Base Classes**: `BaseController.ts`, `BaseAdminController.ts`, `BaseService.ts`, `BaseRepository.ts` provide common functionality
- **Type Safety**: TypeScript with flexible configuration (strict mode disabled for pragmatic development)
- **Nigerian Market Focus**: Phone-based auth, Naira currency, local payment integrations
- **Service Container**: Centralized dependency injection via `getServiceContainer()` in `src/config/serviceContainer.ts`

### Core Application Structure

**Entry Points:**
- `src/server.ts` - Main server entry point (calls App.start())
- `src/app.ts` - Express application configuration and middleware setup

**Configuration:**
- `src/config/` - All environment and service configurations
- `src/config/environment.ts` - Centralized config object exported as `config`
- `src/config/serviceContainer.ts` - Dependency injection container

**Authentication Flow:**
- OTP-based phone authentication (Nigerian market optimization)
- JWT tokens with refresh token rotation via `JWTService`
- Cookie-based authentication support (see `slidingSessionMiddleware`)
- Role-based access control (CUSTOMER, ADMIN, SUPER_ADMIN)
- **Email verification is optional** - Users can place orders and use all features without email verification
- Authentication services: `AuthService`, `OTPService`, `SMSService`, `SessionService`, `JWTService`

**Database:**
- PostgreSQL with Prisma ORM
- Comprehensive schema in `prisma/schema.prisma`
- Repository pattern abstracts all database operations
- Singleton PrismaClient instance managed by App class
- Redis for caching via `GlobalRedisService` singleton

**Background Jobs:**
- Bull queue system via `GlobalJobService` singleton
- Payment reconciliation scheduler (`PaymentReconciliationScheduler`)
- Email notifications and async processing

### Route Structure

The API follows RESTful conventions with versioning at `/api/v1` and admin routes at `/api/admin`:

**Public Routes** (no authentication):
- `/api/v1/auth` - Authentication (signup, login, OTP)
- `/api/v1/products` - Product catalog browsing
- `/api/v1/categories` - Category browsing
- `/api/v1/search` - Product search
- `/api/v1/shipping` - Shipping information
- `/api/v1/metrics` - Public metrics

**Mixed Routes** (some endpoints public, some protected):
- `/api/v1/cart` - Shopping cart (supports both guest and authenticated)
- `/api/v1/orders` - Order management
- `/api/v1/payments` - Payment processing

**Protected Routes** (require `authenticate` middleware):
- `/api/v1/users` - User profile management
- `/api/v1/addresses` - User address management
- `/api/v1/reviews` - Product reviews
- `/api/v1/wishlist` - User wishlist
- `/api/v1/upload` - File uploads
- `/api/v1/notifications` - User notifications
- `/api/v1/returns` - Order returns and refunds

**Admin Routes** (require admin authentication):
- `/api/admin/*` - All admin operations (products, orders, users, etc.)

**Utility Endpoints**:
- `/` - Welcome message with API information
- `/health` - Fast health check (DB only)
- `/health/detailed` - Comprehensive health check
- `/api-docs` - Swagger documentation UI
- `/api-info` - API endpoint listing

### Import Patterns

```typescript
// Service imports
import { UserService, AuthService } from '@/services';

// Repository imports
import { UserRepository } from '@/repositories';

// Type imports
import { ApiResponse, UserCreateData } from '@/types';

// Config imports
import { config } from '@/config/environment';

// Middleware imports
import { authenticate, authorize } from '@/middleware';

// Utility imports
import { GlobalRedisService } from '@/utils/globalRedisService';
import { GlobalJobService } from '@/utils/globalJobService';
import { EmailHelper } from '@/utils/email/emailHelper';
```

### Nigerian Market Features

**Phone Authentication:**
- Primary authentication via Nigerian phone numbers
- OTP delivery through SMS providers
- Phone number validation for Nigerian formats (+234, 080x, 070x, etc.)

**Payment Integration:**
- Paystack integration for cards, bank transfers, USSD
- Naira currency handling with kobo conversion
- Nigerian banking system support

**Address System:**
- Nigerian states and cities validation
- Local address format support
- Delivery zone management

### Middleware Stack (Applied in Order)

The application uses a comprehensive middleware stack in `src/app.ts`:

1. **Security Middleware** (first layer):
   - `helmet()` - Security headers with CSP
   - `cors()` - Dynamic CORS with origin validation
   - `securityEnhancements.enhancedSecurityHeaders` - Additional security headers
   - `securityEnhancements.securityAuditLogger` - Security event logging
   - `securityEnhancements.requestSizeLimit()` - DoS protection
   - `securityEnhancements.suspiciousActivityDetection` - Threat detection
   - `securityEnhancements.sqlInjectionProtection` - SQL injection prevention
   - `securityEnhancements.noSqlInjectionProtection` - NoSQL injection prevention
   - `xssProtection` - XSS attack prevention
   - `sanitizeInput` - Input sanitization

2. **Performance & Logging**:
   - `compression()` - Response compression
   - `performanceMiddleware` - Response time tracking
   - `morgan()` - HTTP request logging (dev/combined)
   - `requestLogger` - Custom audit trail logging

3. **Parsing & Session**:
   - `cookieParser()` - Cookie parsing for auth
   - `express.json()` - JSON body parsing (10mb limit, webhook rawBody support)
   - `express.urlencoded()` - URL-encoded body parsing

4. **Rate Limiting**:
   - `rateLimiter.general` - Global rate limiting

5. **Route-Level Middleware** (applied per route):
   - `authenticate` - JWT/cookie authentication
   - `slidingSessionMiddleware` - Session extension
   - Route-specific rate limiters from `rateLimiter`

### Error Handling

Uses standardized error responses with:
- `AppError` class for operational errors
- `errorHandler` global middleware (last in chain)
- Consistent API response format via `createErrorResponse()`
- HTTP status codes from `HTTP_STATUS` constants
- Graceful shutdown on unhandled rejections/exceptions

### Testing Strategy

**Test Structure:**
- Unit tests (60%) - Individual functions/classes
- Integration tests (30%) - API endpoints with database
- E2E tests (10%) - Complete user workflows

**Key Testing Commands:**
- Individual test: `npm test -- filename.test.ts`
- Watch mode: `npm run test:watch` 
- Coverage: `npm run test:coverage`

### Development Workflow

1. **Database First**: Always update Prisma schema before models
2. **Type Definitions**: Update types in `src/types/` for new features
3. **Layer by Layer**: Repository → Service → Controller → Route
4. **Test Coverage**: Write tests for each layer as you develop
5. **Nigerian Context**: Consider local market requirements (phone formats, currency, etc.)

### Production Considerations

**Security:**
- Helmet.js for security headers with CSP
- Multi-layer rate limiting (general + endpoint-specific)
- CORS with dynamic origin validation
- Input validation and sanitization (XSS, SQL injection, NoSQL injection)
- Security audit logging for suspicious activity
- Cookie-based and JWT authentication
- Admin API key authentication for admin routes

**Performance:**
- Redis caching via `GlobalRedisService` singleton
- Database connection pooling with Prisma
- Response compression (threshold: 1KB)
- Performance monitoring middleware tracking response times
- Graceful shutdown handling (closes DB, Redis, jobs)

**Monitoring:**
- Winston logging with rotation
- Health check endpoints:
  - `/health` - Fast basic health check (DB only)
  - `/health/detailed` - Comprehensive check (DB, Paystack, Email)
- Error tracking and audit trails
- Performance metrics via `performanceMiddleware`
- Request logging with `requestLogger` and `morgan`

**API Documentation:**
- Swagger/OpenAPI documentation at `/api-docs`
- Generated from JSDoc comments in route files
- Fallback API info endpoint at `/api-info`

## Important Notes

### Development Practices
- Always run database setup before starting: `npm run db:setup:dev` (includes generate, migrate, seed)
- The application uses TypeScript with flexible configuration (strict mode disabled for pragmatic development)
- Authentication middleware (`authenticate`) is applied at route level, not controller level
- All database operations must go through Repository layer - never direct Prisma calls in controllers/services
- Use barrel exports via `index.ts` files for clean imports

### Data Handling
- Nigerian phone numbers should be formatted to +234 standard
- Currency amounts are stored in kobo (smallest Nigerian currency unit) for Paystack
- Email verification is **optional** - users can use all features without verifying email

### Architecture Rules
- Follow layered architecture: Repository → Service → Controller → Route
- Base classes provide common functionality (extend `BaseController`, `BaseService`, `BaseRepository`)
- Use service container for dependency injection: `getServiceContainer()`
- Singleton pattern for Redis (`GlobalRedisService`) and Jobs (`GlobalJobService`)

### Security
- Admin routes require `adminApiKey` from environment variables
- Webhooks have raw body parsing for signature verification
- Rate limiting is multi-layered (general + endpoint-specific)
- Multiple security middleware layers protect against XSS, SQL injection, etc.

### Testing
- Test files located in `src/tests/`
- Run individual tests: `npm test -- filename.test.ts`
- Maintain test pyramid: 60% unit, 30% integration, 10% e2e

### Key Services & Utilities
- **Email**: `EmailHelper` (singleton) - handles email sending with templates
- **Redis**: `GlobalRedisService` (singleton) - caching and session storage
- **Jobs**: `GlobalJobService` (singleton) - background job processing with Bull
- **Schedulers**: `PaymentReconciliationScheduler` - automated payment reconciliation