# 🛠️ Prisma Installation & Setup Guide

## 📦 **Installation**

### **1. Install Prisma Dependencies**

```bash
# Install Prisma CLI and client
npm install prisma @prisma/client

# Install additional dependencies for our setup
npm install @prisma/client bcryptjs jsonwebtoken
npm install -D @types/bcryptjs @types/jsonwebtoken

# Install database drivers
npm install pg  # PostgreSQL driver
npm install -D @types/pg

# Install Redis for caching
npm install redis
npm install -D @types/redis
```

### **2. Initialize Prisma**

```bash
# Initialize Prisma (creates prisma folder and schema.prisma)
npx prisma init

# This creates:
# ├── prisma/
# │   └── schema.prisma
# └── .env
```

## 📋 **Project Structure Setup**

### **3. Create the Complete Prisma Directory Structure**

```bash
# Create the full Prisma structure
mkdir -p src/database/prisma/seeds
mkdir -p src/database/prisma/migrations

# The structure should look like:
# src/database/
# ├── prisma/
# │   ├── schema.prisma (already provided)
# │   ├── migrations/
# │   └── seeds/
# └── connection.ts
```

### **4. Replace Default Schema**

Replace the default `prisma/schema.prisma` with the comprehensive schema you provided. The schema is already complete with:

- ✅ **User Management Models** (User, Address, OTPCode, Session)
- ✅ **Product Catalog Models** (Category, Product, ProductImage, ProductReview)
- ✅ **Inventory Models** (Inventory, InventoryMovement)
- ✅ **Shopping Cart Models** (Cart, CartItem)
- ✅ **Order Management Models** (Order, OrderItem)
- ✅ **Coupon System** (Coupon)
- ✅ **Notifications** (Notification, NotificationPreference)
- ✅ **Analytics** (AnalyticsEvent)
- ✅ **System Settings** (Setting)

## 🔧 **Environment Configuration**

### **5. Update .env File**

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/bareloft_dev?schema=public"

# Redis Configuration
REDIS_URL="redis://localhost:6379"

# JWT Configuration
JWT_SECRET="your-super-secure-jwt-secret-at-least-32-characters"
JWT_REFRESH_SECRET="your-super-secure-refresh-secret-at-least-32-characters"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Paystack Configuration
PAYSTACK_SECRET_KEY="sk_test_xxxxxxxxxxxxxxxxxxxxx"
PAYSTACK_PUBLIC_KEY="pk_test_xxxxxxxxxxxxxxxxxxxxx"
PAYSTACK_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxxxxxxxxxx"

# SMS Configuration (Nigerian Provider)
SMS_API_KEY="your-sms-provider-api-key"
SMS_SENDER_ID="Bareloft"
SMS_BASE_URL="https://api.sms-provider.com"

# Email Configuration
SENDGRID_API_KEY="SG.xxxxxxxxxxxxxxxxxxxxx"
FROM_EMAIL="noreply@bareloft.com"
FROM_NAME="Bareloft"

# File Upload Configuration
CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"

# Application Configuration
NODE_ENV="development"
PORT=3000
API_VERSION="v1"
BASE_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:3001"

# CORS Configuration
CORS_ORIGIN="http://localhost:3001,http://localhost:3000"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # requests per window

# Session Configuration
SESSION_SECRET="your-session-secret-at-least-32-characters"
SESSION_EXPIRES_MS=86400000  # 24 hours

# Security Configuration
BCRYPT_ROUNDS=12
OTP_EXPIRES_MINUTES=10
OTP_MAX_ATTEMPTS=3

# Nigerian Business Configuration
DEFAULT_CURRENCY="NGN"
DEFAULT_COUNTRY="NG"
FREE_SHIPPING_THRESHOLD=50000  # ₦50,000

# Monitoring & Logging
LOG_LEVEL="info"
SENTRY_DSN="your-sentry-dsn-if-using"
```

## 🗄️ **Database Setup**

### **6. Set Up PostgreSQL Database**

```bash
# Option 1: Using Docker (Recommended for development)
docker run --name bareloft-postgres \
  -e POSTGRES_DB=bareloft_dev \
  -e POSTGRES_USER=bareloft_user \
  -e POSTGRES_PASSWORD=secure_password \
  -p 5432:5432 \
  -d postgres:15

# Option 2: Using local PostgreSQL installation
createdb bareloft_dev
```

### **7. Generate Prisma Client**

```bash
# Generate the Prisma client
npx prisma generate

# This creates the client in node_modules/@prisma/client
```

### **8. Run Database Migrations**

```bash
# Create and apply first migration
npx prisma migrate dev --name init

# This will:
# 1. Create migration files
# 2. Apply migration to database
# 3. Generate Prisma client
```

## 🌱 **Database Seeding**

### **9. Create Seed Scripts**

We'll create comprehensive seed data for development:

```bash
# Run the seed script (we'll create this next)
npx prisma db seed
```

## 📝 **Package.json Scripts**

### **10. Add Useful Scripts**

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    
    "db:migrate": "npx prisma migrate dev",
    "db:migrate:deploy": "npx prisma migrate deploy",
    "db:seed": "npx prisma db seed",
    "db:reset": "npx prisma migrate reset",
    "db:generate": "npx prisma generate",
    "db:studio": "npx prisma studio",
    
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "type-check": "tsc --noEmit",
    
    "docs:generate": "swagger-jsdoc -d swaggerDef.js src/routes/**/*.ts -o swagger.json",
    "docs:serve": "swagger-ui-serve swagger.json"
  },
  "prisma": {
    "seed": "ts-node src/database/prisma/seeds/index.ts"
  }
}
```

## 🔍 **Verification Steps**

### **11. Test Your Setup**

```bash
# 1. Check database connection
npx prisma db push

# 2. Open Prisma Studio to view database
npx prisma studio
# Visit: http://localhost:5555

# 3. Test Prisma client
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany().then(console.log).finally(() => prisma.$disconnect());
"
```

## 🚀 **Next Steps**

After completing this setup:

1. ✅ **Prisma is installed and configured**
2. ✅ **Database schema is applied**
3. ✅ **Environment variables are set**
4. ✅ **Database connection is working**

Now we're ready to:
- Create the missing repository files
- Implement service layer business logic
- Build controller request handlers
- Add middleware for security and validation

## 🔧 **Troubleshooting**

### **Common Issues & Solutions**

1. **Connection Refused**
   ```bash
   # Make sure PostgreSQL is running
   sudo service postgresql start
   # or with Docker
   docker start bareloft-postgres
   ```

2. **Migration Errors**
   ```bash
   # Reset database if needed
   npx prisma migrate reset
   npx prisma db push
   ```

3. **Client Generation Issues**
   ```bash
   # Clear and regenerate
   rm -rf node_modules/.prisma
   npx prisma generate
   ```

Your Prisma setup is now complete and ready for our Nigerian e-commerce platform! 🇳🇬