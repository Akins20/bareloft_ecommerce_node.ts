# 🏗️ Bareloft E-commerce - System Architecture Documentation

**Last Updated:** August 20, 2025  
**Version:** 1.0.0  
**Environment:** Production Ready

## 🎯 **SYSTEM OVERVIEW**

Bareloft is a comprehensive Nigerian e-commerce platform built with modern microservices architecture, optimized for the Nigerian market with features like Naira currency, local payment gateways, and Nigerian business logic.

---

## 🏛️ **ARCHITECTURE DIAGRAM**

```
┌─────────────────────────────────────────────────────────────┐
│                    🌐 CLIENT LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  👤 Customer Portal     │  🔧 Admin Portal      │  📱 Mobile │
│     (Port 3000)         │    (Port 3004)        │    Apps    │
│     React/Next.js       │    React/Next.js      │   Native   │
└─────────────────────────────────────────────────────────────┘
                                  │
                                  │ HTTPS/REST API
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   🚀 APPLICATION LAYER                      │
├─────────────────────────────────────────────────────────────┤
│              Bareloft API Server (Port 3007)               │
│                    Node.js + Express                       │
│                                                             │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │   🛒 Cart   │  📦 Orders  │  👤 Users   │  🏪 Products│  │
│  │   Service   │   Service   │   Service   │   Service   │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
│                                                             │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │  💳 Payment │  🚚 Ship.   │  📧 Email   │  🔐 Auth    │  │
│  │  (Paystack) │   Service   │   Service   │   Service   │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                   💾 DATA LAYER                             │
├─────────────────────────────────────────────────────────────┤
│  🗄️ PostgreSQL    │  ⚡ Redis Cache   │  📁 File Storage   │
│   Primary DB       │   Performance     │   Product Images   │
│   (Users, Orders,  │   Sessions, Jobs  │   Documents        │
│    Products, etc)  │   Rate Limiting   │                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 **TECHNOLOGY STACK**

### **Backend**
- **Runtime:** Node.js 22.x
- **Framework:** Express.js + TypeScript
- **Database:** PostgreSQL 14.x + Prisma ORM
- **Cache:** Redis 6.x
- **Queue:** Bull Queue (Redis-based)
- **Authentication:** JWT + Session Management

### **Frontend** 
- **Customer Portal:** Next.js 15 + TypeScript
- **Admin Portal:** React + TypeScript  
- **Styling:** Tailwind CSS
- **State Management:** React Context + Hooks

### **External Services**
- **Payment:** Paystack (Nigerian)
- **Email:** SMTP (Gmail)
- **SMS:** Termii/Twilio
- **Shipping:** GIG Logistics, DHL Nigeria, RedStar Express

---

## 🏗️ **SERVICE ARCHITECTURE**

### **Core Services**

#### 🔐 **Authentication Service**
```typescript
├── Phone-based OTP authentication
├── JWT token management (access/refresh)
├── Role-based access control (RBAC)
├── Session management with Redis
└── Nigerian phone number validation
```

#### 🛒 **E-commerce Services**
```typescript
ProductService:
├── Product catalog management
├── Category hierarchy
├── Search & filtering
├── Stock management
└── Price management (Naira)

OrderService:
├── Order lifecycle management  
├── Guest & authenticated orders
├── Payment processing integration
├── Nigerian shipping integration
└── Order tracking & notifications

CartService:
├── Session-based cart (guest users)
├── Persistent cart (authenticated)
├── Real-time stock validation
└── Price calculations with VAT
```

#### 💳 **Payment Service** 
```typescript
PaystackService:
├── Card payments
├── Bank transfers
├── USSD payments
├── Webhook processing
└── Refund management
```

#### 🚚 **Shipping Service**
```typescript
├── Multi-carrier support (GIG, DHL, RedStar)
├── Nigerian states/cities validation
├── Real-time rate calculation  
├── Tracking integration
└── Delivery scheduling
```

---

## 🌐 **API ARCHITECTURE**

### **RESTful API Design**

```
📁 /api/v1/                     # Public API
├── 🏪 /products                # Product catalog
├── 📂 /categories              # Category management  
├── 🛒 /cart                    # Shopping cart
├── 📦 /orders                  # Order management
├── 💳 /payments                # Payment processing
├── 🚚 /shipping                # Shipping quotes
├── 🔐 /auth                    # Authentication
└── 👤 /users                   # User management

📁 /api/admin/                   # Admin API
├── 📊 /dashboard               # Analytics & overview
├── 👥 /users                   # User administration
├── 🏪 /products                # Product management
├── 📦 /orders                  # Order administration
├── 📈 /analytics               # Advanced analytics  
├── ⚙️ /settings                # System configuration
├── 🚚 /shipping                # Shipping management
├── ↩️ /returns                 # Returns processing
├── 💰 /refunds                 # Refund management
├── 🎧 /support                 # Support tickets
└── 🔧 /jobs                    # Background jobs
```

---

## ⚡ **PERFORMANCE ARCHITECTURE**

### **Caching Strategy**

```typescript
Caching Layers:
├── Redis Cache (Primary)
│   ├── Products: 5 minutes TTL
│   ├── Categories: 30 minutes TTL  
│   ├── User sessions: 24 hours TTL
│   └── Rate limiting: 15 minutes TTL
├── HTTP Cache Headers
│   ├── ETag for content validation
│   ├── Cache-Control directives
│   └── Stale-while-revalidate
└── Response Compression
    ├── Gzip for responses > 1KB
    └── 10%+ compression ratio
```

### **Performance Metrics (Cached)**
- **Products API:** 0.39s (18x improvement)  
- **Categories API:** 0.39s (6x improvement)
- **Cache Hit Rate:** ~95%
- **Response Size:** 10% reduction via compression

---

## 🔒 **SECURITY ARCHITECTURE**

### **Security Layers**

```typescript
Security Implementation:
├── Authentication
│   ├── JWT tokens (15min access, 7day refresh)
│   ├── Phone OTP verification
│   ├── Rate limiting (5 attempts/min)
│   └── Session invalidation
├── Authorization  
│   ├── Role-based access control (RBAC)
│   ├── Resource-level permissions
│   └── Admin privilege separation
├── API Security
│   ├── Helmet.js security headers
│   ├── CORS configuration
│   ├── Request sanitization
│   └── SQL injection prevention (Prisma)
└── Data Protection
    ├── Bcrypt password hashing
    ├── Sensitive data encryption
    └── PII data handling
```

---

## 🇳🇬 **NIGERIAN MARKET FEATURES**

### **Localization**
- **Currency:** Nigerian Naira (₦) with kobo support
- **Timezone:** Africa/Lagos
- **Phone Numbers:** +234 format validation
- **Business Hours:** Nigerian business context

### **Payment Integration**
- **Paystack:** Primary payment processor
- **Methods:** Cards, Bank Transfer, USSD
- **Currency:** NGN with kobo precision
- **VAT:** 7.5% Nigerian tax compliance

### **Shipping & Logistics** 
- **Carriers:** GIG Logistics, DHL Nigeria, RedStar Express
- **Coverage:** All 36 Nigerian states
- **Delivery:** State-wise delivery optimization
- **Tracking:** Real-time shipment tracking

---

## 🔄 **DATA FLOW**

### **Order Processing Flow**
```
1. 🛒 Add to Cart → Validate Stock & Price
2. 🔐 Authentication → OTP Verification  
3. 💳 Payment → Paystack Processing
4. 📧 Confirmation → Email + SMS Notification
5. 📦 Fulfillment → Inventory Update
6. 🚚 Shipping → Carrier Assignment
7. 📱 Tracking → Real-time Updates
8. ✅ Delivery → Order Completion
```

### **Admin Dashboard Flow** 
```
1. 🔑 Admin Login → JWT Token Generation
2. 📊 Dashboard → Cached Analytics Load
3. 🛠️ Management → CRUD Operations
4. 📈 Analytics → Real-time Metrics
5. 🔧 Configuration → System Settings
```

---

## 🏗️ **DATABASE SCHEMA**

### **Core Entities**

```sql
Users (Authentication & Profiles)
├── id, phoneNumber, email, role
├── firstName, lastName, isVerified
└── createdAt, updatedAt

Products (Catalog)
├── id, name, slug, description  
├── price, costPrice, comparePrice
├── sku, categoryId, isActive
└── stock, lowStockThreshold

Orders (E-commerce)
├── id, orderNumber, status
├── userId, totalAmount, paymentStatus
├── shippingAddress, billingAddress
└── createdAt, completedAt

Categories (Hierarchy)
├── id, name, slug, description
├── parentId, sortOrder, isActive  
└── createdAt, updatedAt
```

---

## 📊 **MONITORING & OBSERVABILITY**

### **Health Checks**
- **API Health:** `/api/health` endpoint
- **Database:** Connection monitoring
- **Redis:** Cache health checks  
- **External Services:** Paystack, carriers

### **Performance Monitoring**
- **Response Times:** API endpoint metrics
- **Cache Performance:** Hit rates, TTL effectiveness
- **Database Queries:** Slow query detection
- **Error Tracking:** Exception monitoring

---

## 🚀 **DEPLOYMENT ARCHITECTURE**

### **Development Environment**
```
├── Customer Portal: localhost:3000
├── Admin Portal: localhost:3004  
├── API Server: localhost:3007
├── PostgreSQL: localhost:5432
└── Redis: localhost:6379
```

### **Production Recommendations**
```
├── Load Balancer (Nginx/Cloudflare)
├── Multiple API instances
├── Database clustering (PostgreSQL)
├── Redis cluster for cache
├── CDN for static assets
└── Monitoring (Grafana/Prometheus)
```

---

## 📋 **MAINTENANCE & OPERATIONS**

### **Background Jobs**
- **Email Processing:** Queued email delivery
- **Payment Reconciliation:** Automated verification
- **Analytics Updates:** Metric calculations
- **Cache Warming:** Performance optimization
- **System Cleanup:** Log rotation, temp files

### **Database Maintenance** 
- **Backup Strategy:** Daily automated backups
- **Indexing:** Performance optimization
- **Migration Management:** Version-controlled schema changes
- **Data Archiving:** Historical data management

---

## 🎯 **SCALABILITY CONSIDERATIONS**

### **Horizontal Scaling**
- **API Servers:** Stateless, easily scalable
- **Database:** Read replicas for scaling reads  
- **Cache:** Redis clustering for distributed cache
- **File Storage:** CDN integration for static assets

### **Performance Optimization**
- **Database Indexing:** Optimized query performance
- **Connection Pooling:** Efficient resource usage
- **Caching Strategy:** Multi-layer caching
- **Async Processing:** Background job queues

---

**📞 Engineering Contact:** Development Team  
**📅 Documentation Date:** August 20, 2025  
**🔄 Next Update:** Architecture review scheduled