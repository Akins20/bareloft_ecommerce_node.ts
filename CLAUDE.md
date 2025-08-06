# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Database Operations
```bash
# Database migrations and schema
npm run db:generate          # Generate Prisma client
npm run db:migrate          # Create and apply migration
npm run db:migrate:prod     # Deploy migrations to production
npm run db:seed             # Seed database with test data
npm run db:reset            # Reset database (dev only)
npm run db:studio           # Open Prisma Studio

# Build and Development
npm run build               # Compile TypeScript to dist/
npm run dev                 # Start development server with hot reload
npm start                   # Start production server from dist/

# Testing
npm test                    # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report
npm run test:integration   # Run integration tests only
npm run test:e2e           # Run end-to-end tests

# Code Quality
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint issues automatically  
npm run type-check         # TypeScript type checking without emit

# Documentation
npm run docs:generate      # Generate Swagger documentation
npm run docs:serve         # Serve API documentation
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
- **Base Classes**: `BaseController.ts`, `BaseService.ts`, `BaseRepository.ts` provide common functionality
- **Type Safety**: Strict TypeScript configuration with zero `any` types allowed
- **Nigerian Market Focus**: Phone-based auth, Naira currency, local payment integrations

### Core Application Structure

**Entry Points:**
- `src/server.ts` - Main server entry point (calls App.start())
- `src/app.ts` - Express application configuration and middleware setup

**Configuration:**
- `src/config/` - All environment and service configurations
- Uses centralized config pattern with `@/config/environment`

**Authentication Flow:**
- OTP-based phone authentication (Nigerian market optimization)
- JWT tokens with refresh token rotation
- Role-based access control (CUSTOMER, ADMIN, SUPER_ADMIN)

**Database:**
- PostgreSQL with Prisma ORM
- Comprehensive schema in `prisma/schema.prisma`
- Repository pattern abstracts all database operations

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

### Error Handling

Uses standardized error responses with:
- `AppError` class for operational errors
- Global error handler middleware
- Consistent API response format via `createErrorResponse()`
- HTTP status codes from `HTTP_STATUS` constants

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
- Helmet.js for security headers
- Rate limiting with Redis
- CORS configured for Nigerian domains
- Input validation and sanitization

**Performance:**
- Redis caching for frequently accessed data
- Database query optimization with Prisma
- Compression middleware for responses
- Graceful shutdown handling

**Monitoring:**
- Winston logging with rotation
- Health check endpoints (`/health`)
- Error tracking and audit trails
- Performance metrics collection

## Important Notes

- Always run database migrations before starting development: `npm run db:migrate`
- The application uses strict TypeScript - no `any` types allowed
- Authentication middleware is applied at route level, not controller level
- All database operations must go through Repository layer, never direct Prisma calls in controllers/services
- Nigerian phone numbers should be formatted to +234 standard
- Currency amounts are stored in kobo (smallest Nigerian currency unit)