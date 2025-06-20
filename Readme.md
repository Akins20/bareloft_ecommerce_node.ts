# 🛍️ Bareloft E-commerce Backend API

> **Professional TypeScript Backend for Nigerian E-commerce Platform**  
> Built with enterprise-grade architecture, type safety, and scalability in mind.

## 📋 **Table of Contents**

- [🎯 Project Overview](#-project-overview)
- [🏗️ Architecture](#️-architecture)
- [⚙️ Tech Stack](#️-tech-stack)
- [🚀 Quick Start](#-quick-start)
- [📂 Project Structure](#-project-structure)
- [🔧 Development Guide](#-development-guide)
- [🧪 Testing Strategy](#-testing-strategy)
- [📖 API Documentation](#-api-documentation)
- [🚀 Deployment](#-deployment)
- [🔒 Security](#-security)
- [📊 Monitoring](#-monitoring)

## 🎯 **Project Overview**

Bareloft Backend API is a comprehensive e-commerce platform designed specifically for the Nigerian market. Built with TypeScript, it provides a robust, scalable, and type-safe foundation for modern e-commerce operations.

### **Key Features**

- 🇳🇬 **Nigerian Market Optimized**: Phone-based auth, Naira currency, local payment methods
- 🔐 **Secure Authentication**: OTP-based verification with JWT tokens
- 🛍️ **Complete E-commerce**: Products, cart, orders, inventory, reviews
- 💳 **Payment Integration**: Paystack for cards, bank transfers, USSD
- 👑 **Admin Dashboard**: Comprehensive management interface
- 📱 **Mobile-First**: Optimized for Nigerian mobile usage patterns
- 🚀 **Production-Ready**: Docker, monitoring, logging, error handling

### **Business Objectives**

- **Zero Inventory Discrepancies**: Real-time stock tracking with reservation system
- **99.9% Payment Success**: Reliable Paystack integration with webhook handling
- **Sub-3s Response Times**: Optimized queries and Redis caching
- **Scalable Architecture**: Microservice-ready modular design
- **Audit-Compliant**: Comprehensive logging and data trails

## 🏗️ **Architecture**

### **Layered Architecture Pattern**

```
┌─────────────────────────────────────────────────────────────┐
│                    🌐 API Layer (Routes)                    │
│                 Express.js + Middleware                     │
├─────────────────────────────────────────────────────────────┤
│                 🎮 Controller Layer                         │
│              Request/Response Handling                      │
├─────────────────────────────────────────────────────────────┤
│                 🔧 Service Layer                            │
│               Business Logic & Rules                        │
├─────────────────────────────────────────────────────────────┤
│                🗄️ Repository Layer                          │
│              Data Access & Persistence                      │
├─────────────────────────────────────────────────────────────┤
│                 💾 Database Layer                           │
│            PostgreSQL + Redis + Prisma                     │
└─────────────────────────────────────────────────────────────┘
```

### **Core Design Principles**

1. **Single Responsibility**: Each module has one clear purpose
2. **Dependency Inversion**: High-level modules don't depend on low-level modules
3. **Interface Segregation**: Clients depend only on interfaces they use
4. **Open/Closed**: Open for extension, closed for modification
5. **DRY Principle**: Don't Repeat Yourself across codebase

### **Modular Structure Benefits**

- 🔧 **Easy Maintenance**: Clear separation of concerns
- 🚀 **Rapid Development**: Reusable components and services
- 🧪 **Testable Code**: Each layer can be tested independently
- 📈 **Scalable Growth**: Add features without breaking existing code
- 🔄 **Future-Proof**: Architecture supports microservices migration

## ⚙️ **Tech Stack**

### **Core Technologies**

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | JavaScript runtime |
| **TypeScript** | 5.0+ | Type safety & development experience |
| **Express.js** | 4.18+ | Web framework |
| **Prisma** | 5.0+ | Database ORM & migrations |
| **PostgreSQL** | 15+ | Primary database |
| **Redis** | 7.0+ | Caching & session storage |
| **JWT** | 9.0+ | Authentication tokens |
| **Joi/Zod** | Latest | Request validation |
| **Winston** | 3.8+ | Logging system |
| **Jest** | 29+ | Testing framework |
| **Docker** | 20+ | Containerization |

### **Nigerian Market Integrations**

| Service | Purpose | Implementation |
|---------|---------|----------------|
| **Paystack** | Payment processing | Cards, Bank Transfer, USSD |
| **SMS Provider** | OTP delivery | Nigerian telecommunications |
| **Cloudinary** | Image storage | Product images & avatars |
| **SendGrid** | Email service | Order confirmations & notifications |

## 🚀 **Quick Start**

### **Prerequisites**

```bash
# Required software
Node.js 18+
PostgreSQL 15+
Redis 7+
Docker (optional)
```

### **Installation**

```bash
# 1. Clone repository
git clone https://github.com/bareloft/backend-api.git
cd bareloft-backend-api

# 2. Install dependencies
npm install

# 3. Environment setup
cp .env.example .env
# Edit .env with your configuration

# 4. Database setup
npx prisma migrate dev
npx prisma db seed

# 5. Start development server
npm run dev

# 6. Run tests
npm test

# 7. Generate API documentation
npm run docs:generate
```

### **Environment Variables**

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/bareloft"
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET="your-super-secure-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-token-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Paystack Integration
PAYSTACK_SECRET_KEY="sk_test_xxxxx"
PAYSTACK_PUBLIC_KEY="pk_test_xxxxx"
PAYSTACK_WEBHOOK_SECRET="whsec_xxxxx"

# SMS Service (Nigerian Provider)
SMS_API_KEY="your-sms-api-key"
SMS_SENDER_ID="Bareloft"

# Email Service
SENDGRID_API_KEY="SG.xxxxx"
FROM_EMAIL="noreply@bareloft.com"

# File Upload
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Application Settings
NODE_ENV="development"
PORT=3000
API_VERSION="v1"
CORS_ORIGIN="http://localhost:3001"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # per window
```

## 📂 **Project Structure**

### **Key Directories Explained**

```
src/
├── types/           # 📋 TypeScript definitions
├── models/          # 🗄️ Database models (Prisma)
├── controllers/     # 🎮 HTTP request handlers
├── services/        # 🔧 Business logic layer
├── repositories/    # 🗄️ Data access layer
├── middleware/      # 🛡️ Express middleware
├── routes/          # 🛣️ API route definitions
├── utils/           # 🔧 Helper functions
├── config/          # ⚙️ Configuration files
└── database/        # 🗄️ Database schemas & seeds
```

### **Import Structure**

```typescript
// Barrel exports for clean imports
import { UserService, AuthService } from '@/services';
import { UserRepository } from '@/repositories';
import { authenticate, authorize } from '@/middleware';
import { ApiResponse, UserType } from '@/types';
```

## 🔧 **Development Guide**

### **Development Workflow**

1. **Feature Development**
   ```bash
   # Create feature branch
   git checkout -b feature/user-authentication
   
   # Develop with TypeScript strict mode
   npm run dev
   
   # Run tests continuously
   npm run test:watch
   
   # Check code quality
   npm run lint
   npm run type-check
   ```

2. **Database Changes**
   ```bash
   # Create migration
   npx prisma migrate dev --name add_user_table
   
   # Update seeds
   npm run db:seed
   
   # Reset database (development only)
   npm run db:reset
   ```

3. **API Documentation**
   ```bash
   # Generate Swagger docs
   npm run docs:generate
   
   # Serve documentation
   npm run docs:serve
   # Visit http://localhost:3000/api-docs
   ```

### **Code Standards**

#### **TypeScript Guidelines**

```typescript
// ✅ Good: Explicit types and interfaces
interface CreateUserRequest {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
}

class UserService {
  async createUser(data: CreateUserRequest): Promise<User> {
    // Implementation
  }
}

// ❌ Bad: Any types and implicit returns
class UserService {
  async createUser(data: any) {
    // Implementation
  }
}
```

#### **Error Handling Pattern**

```typescript
// ✅ Standardized error responses
class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string,
    public isOperational: boolean = true
  ) {
    super(message);
  }
}

// Usage in services
if (!user) {
  throw new AppError('User not found', 404, 'USER_NOT_FOUND');
}
```

#### **Response Format**

```typescript
// ✅ Consistent API responses
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: string;
  };
  meta?: {
    pagination?: PaginationMeta;
    timestamp: string;
  };
}
```

### **Nigerian Market Considerations**

#### **Phone Number Validation**

```typescript
// Nigerian phone number formats
const NIGERIAN_PHONE_REGEX = /^(\+234|234|0)[789][01][0-9]{8}$/;

export const validateNigerianPhone = (phone: string): boolean => {
  return NIGERIAN_PHONE_REGEX.test(phone);
};

export const formatNigerianPhone = (phone: string): string => {
  // Convert to +234 format
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    return `+234${cleaned.substring(1)}`;
  }
  if (cleaned.startsWith('234')) {
    return `+${cleaned}`;
  }
  return phone;
};
```

#### **Currency Handling**

```typescript
// Naira currency utilities
export const formatNaira = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0
  }).format(amount);
};

// Paystack amount format (kobo)
export const toPaystackAmount = (naira: number): number => {
  return Math.round(naira * 100); // Convert to kobo
};
```

#### **Nigerian States & Addresses**

```typescript
export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi',
  'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta',
  'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
  'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe',
  'Zamfara', 'FCT'
] as const;

export type NigerianState = typeof NIGERIAN_STATES[number];
```

## 🧪 **Testing Strategy**

### **Testing Pyramid**

```
           🎭 E2E Tests (10%)
          Complete user journeys
        
       🔗 Integration Tests (30%)
      API endpoints with database
    
  🔬 Unit Tests (60%)
 Individual functions & classes
```

### **Test Categories**

1. **Unit Tests** (60% of test suite)
   ```typescript
   // Example: Service layer test
   describe('UserService', () => {
     it('should create user with valid data', async () => {
       // Given
       const userData = {
         phoneNumber: '+2348012345678',
         firstName: 'John',
         lastName: 'Doe'
       };
       
       // When
       const user = await userService.createUser(userData);
       
       // Then
       expect(user).toBeDefined();
       expect(user.phoneNumber).toBe(userData.phoneNumber);
     });
   });
   ```

2. **Integration Tests** (30% of test suite)
   ```typescript
   // Example: API endpoint test
   describe('POST /api/v1/auth/signup', () => {
     it('should register new user successfully', async () => {
       const response = await request(app)
         .post('/api/v1/auth/signup')
         .send({
           phoneNumber: '+2348012345678',
           firstName: 'John',
           lastName: 'Doe',
           otpCode: '123456'
         })
         .expect(201);
         
       expect(response.body.success).toBe(true);
       expect(response.body.data.user).toBeDefined();
     });
   });
   ```

3. **E2E Tests** (10% of test suite)
   ```typescript
   // Example: Complete user flow
   describe('User Registration Flow', () => {
     it('should complete full registration process', async () => {
       // 1. Request OTP
       await request(app)
         .post('/api/v1/auth/request-otp')
         .send({ phoneNumber: '+2348012345678', purpose: 'signup' });
         
       // 2. Verify OTP and register
       await request(app)
         .post('/api/v1/auth/signup')
         .send({ phoneNumber: '+2348012345678', /* ... */ });
         
       // 3. Access protected resource
       // ...
     });
   });
   ```

### **Test Commands**

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- user.test.ts

# Run integration tests only
npm run test:integration

# Run e2e tests only
npm run test:e2e
```

## 📖 **API Documentation**

### **Swagger/OpenAPI Integration**

Our API is fully documented using OpenAPI 3.0 specification with interactive documentation.

#### **Access Documentation**

```bash
# Development
npm run docs:serve
# Visit: http://localhost:3000/api-docs

# Production  
# Visit: https://api.bareloft.com/docs
```

#### **Key API Endpoints**

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/v1/auth/request-otp` | POST | Request OTP for phone | No |
| `/api/v1/auth/verify-otp` | POST | Verify OTP code | No |
| `/api/v1/auth/signup` | POST | Register new user | No |
| `/api/v1/auth/login` | POST | User login | No |
| `/api/v1/products` | GET | List products | No |
| `/api/v1/products/:id` | GET | Get product details | No |
| `/api/v1/cart` | GET | Get user cart | Yes |
| `/api/v1/cart/add` | POST | Add item to cart | Yes |
| `/api/v1/orders` | GET | Get user orders | Yes |
| `/api/v1/orders/create` | POST | Create new order | Yes |
| `/api/v1/admin/products` | POST | Create product | Admin |
| `/api/v1/admin/orders` | GET | Manage orders | Admin |

### **Authentication Flow**

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant S as SMS Service
    participant D as Database
    
    C->>A: POST /auth/request-otp
    A->>S: Send OTP SMS
    A->>D: Store OTP code
    A-->>C: OTP sent confirmation
    
    C->>A: POST /auth/verify-otp
    A->>D: Validate OTP
    A->>D: Create/Update user
    A-->>C: JWT tokens
    
    C->>A: API requests with Bearer token
    A->>A: Validate JWT
    A-->>C: Protected resource
```

## 🚀 **Deployment**

### **Docker Deployment**

#### **Development Environment**

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

#### **Production Environment**

```bash
# Build production image
docker build -t bareloft-api:latest .

# Run with production compose
docker-compose -f docker-compose.prod.yml up -d
```

### **Environment-Specific Configurations**

#### **Development** (`docker-compose.yml`)
```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - postgres
      - redis
      
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=bareloft_dev
    ports:
      - "5432:5432"
      
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

#### **Production** (`docker-compose.prod.yml`)
```yaml
version: '3.8'
services:
  api:
    image: bareloft-api:latest
    restart: always
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis
    networks:
      - app-network
      
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api
```

### **Deployment Checklist**

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] Monitoring setup (health checks)
- [ ] Logging configured
- [ ] Backup procedures in place
- [ ] Load balancer configured
- [ ] CDN setup for static assets

## 🔒 **Security**

### **Security Measures**

1. **Authentication & Authorization**
   - JWT tokens with refresh rotation
   - Role-based access control (RBAC)
   - Rate limiting on auth endpoints
   - OTP-based phone verification

2. **Data Protection**
   - Password hashing with bcrypt
   - Input validation and sanitization
   - SQL injection prevention (Prisma ORM)
   - XSS protection headers

3. **API Security**
   - CORS configuration
   - Helmet.js security headers
   - Request size limits
   - API versioning

4. **Infrastructure Security**
   - HTTPS enforcement
   - Environment variable encryption
   - Database connection security
   - Redis authentication

### **Security Headers**

```typescript
// Helmet.js configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## 📊 **Monitoring**

### **Health Check Endpoint**

```typescript
// GET /health
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "external_apis": {
      "paystack": "healthy",
      "sms_service": "healthy"
    }
  },
  "metrics": {
    "uptime": 86400,
    "memory_usage": "45%",
    "cpu_usage": "12%"
  }
}
```

### **Logging Strategy**

```typescript
// Winston logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### **Metrics Collection**

- **Request Metrics**: Response time, error rates, throughput
- **Business Metrics**: Orders created, payment success rate, user registrations
- **System Metrics**: Memory usage, CPU usage, database connections
- **Error Tracking**: Error frequency, error types, stack traces

---

## 📞 **Support & Contribution**

### **Getting Help**

- 📧 **Email**: dev@bareloft.com
- 📚 **Documentation**: [docs.bareloft.com](https://docs.bareloft.com)
- 🐛 **Issues**: [GitHub Issues](https://github.com/bareloft/backend-api/issues)

### **Contributing**

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### **Development Team**

- **Lead Developer**: [Your Name]
- **Frontend Integration**: [Frontend Team]
- **DevOps**: [DevOps Team]
- **QA**: [QA Team]

---

## 📄 **License**

This project is proprietary software owned by Bareloft. All rights reserved.

---

**🚀 Ready to build the future of Nigerian e-commerce!**