# 🇳🇬 Bareloft E-commerce API Documentation

**Version:** 1.0.0  
**Last Updated:** August 20, 2025  
**Nigerian Market Optimized**

## 🌟 **API Overview**

The Bareloft E-commerce API is a comprehensive Nigerian market-focused backend platform providing full e-commerce functionality with local optimization for Nigerian businesses and consumers.

### **🏗️ Base URLs**
- **Development (Main API):** `http://localhost:3007`
- **Development (Admin API):** `http://localhost:3008`  
- **Production:** `https://api.bareloft.com`

### **🔐 Authentication Methods**
- **JWT Bearer Token:** For authenticated user requests
- **Session ID (X-Session-ID):** For guest cart operations
- **Cookie-based:** For admin panel operations

---

## 🇳🇬 **Nigerian Market Features**

### **💰 Currency & Pricing**
- **Primary Currency:** Nigerian Naira (₦ NGN)
- **Kobo Support:** Decimal precision to 2 places (₦1,999.99)
- **VAT Compliance:** 7.5% Nigerian tax integration
- **Price Examples:** 
  - Budget items: ₦5,000 - ₦15,000
  - Premium products: ₦50,000 - ₦200,000+

### **📱 Phone Number Format**
- **Format:** +234XXXXXXXXXX
- **Validation:** Nigerian network prefixes (MTN, GLO, Airtel, 9Mobile)
- **Example:** +2348012345678

### **🚚 Nigerian Logistics**
- **Supported Carriers:** GIG Logistics, DHL Nigeria, RedStar Express
- **Coverage:** All 36 Nigerian states + FCT
- **Shipping Zones:**
  - Zone 1 (Lagos, Ogun): ₦1,500 (1-2 days)
  - Zone 2 (Southwest): ₦2,500 (2-3 days) 
  - Zone 3 (Other states): ₦3,500 (3-5 days)
- **Free Shipping:** Orders above ₦50,000

### **🏠 Address Format**
```json
{
  "firstName": "Adebayo",
  "lastName": "Ogundimu", 
  "addressLine1": "15 Allen Avenue",
  "city": "Lagos",
  "state": "Lagos State",
  "postalCode": "101001",
  "phoneNumber": "+2348012345678"
}
```

---

## 📊 **API Endpoints Summary**

### **🔐 Authentication**
| Endpoint | Method | Description |
|----------|---------|-------------|
| `/api/v1/auth/request-otp` | POST | Request OTP for login/signup |
| `/api/v1/auth/verify-otp` | POST | Verify OTP and authenticate |
| `/api/v1/auth/logout` | POST | Logout user |
| `/api/v1/auth/refresh` | POST | Refresh JWT token |

### **🏪 Products**
| Endpoint | Method | Description |
|----------|---------|-------------|
| `/api/v1/products` | GET | Get products with filtering |
| `/api/v1/products/featured` | GET | Get featured products |
| `/api/v1/products/{id}` | GET | Get product details |
| `/api/v1/products/slug/{slug}` | GET | Get product by SEO slug |
| `/api/v1/products/{id}/related` | GET | Get related products |

### **📂 Categories**
| Endpoint | Method | Description |
|----------|---------|-------------|
| `/api/v1/categories` | GET | Get category hierarchy |
| `/api/v1/categories/tree` | GET | Get category tree |
| `/api/v1/categories/{id}` | GET | Get category details |

### **🛒 Shopping Cart**
| Endpoint | Method | Description |
|----------|---------|-------------|
| `/api/v1/cart` | GET | Get current cart |
| `/api/v1/cart/add` | POST | Add item to cart |
| `/api/v1/cart/update` | PUT | Update cart item |
| `/api/v1/cart/remove/{productId}` | DELETE | Remove item |
| `/api/v1/cart/validate` | POST | Validate cart |
| `/api/v1/cart/shipping/calculate` | POST | Calculate shipping |

### **📦 Orders**
| Endpoint | Method | Description |
|----------|---------|-------------|
| `/api/v1/orders` | GET | Get user orders |
| `/api/v1/orders/create` | POST | Create authenticated order |
| `/api/v1/orders/guest/create` | POST | Create guest order |
| `/api/v1/orders/{id}` | GET | Get order details |
| `/api/v1/orders/{id}/tracking` | GET | Track order status |

### **💳 Payments (Paystack Integration)**
| Endpoint | Method | Description |
|----------|---------|-------------|
| `/api/v1/payments/initialize` | POST | Initialize payment |
| `/api/v1/payments/verify` | POST | Verify payment status |
| `/api/v1/payments/methods` | GET | Get payment methods |

### **📊 Performance Monitoring**
| Endpoint | Method | Description |
|----------|---------|-------------|
| `/api/v1/metrics/health` | GET | System health check |
| `/api/v1/metrics/performance` | GET | API performance metrics |
| `/api/v1/metrics/realtime` | GET | Real-time metrics |
| `/api/v1/metrics/system` | GET | System resource metrics |

---

## 🎯 **Key API Features**

### **⚡ Performance Optimized**
- **Response Times:** <1s average (optimized with Redis caching)
- **Cache Strategy:** Intelligent TTL-based caching
  - Products: 5 minutes
  - Categories: 30 minutes
  - Product details: 10 minutes
- **Rate Limiting:** Smart rate limiting by endpoint type

### **🔍 Advanced Search & Filtering**
```http
GET /api/v1/products?search=ankara&minPrice=10000&maxPrice=50000&categoryId=fashion&sortBy=price&sortOrder=asc
```
- Full-text search across names and descriptions
- Price range filtering in Naira
- Category and brand filtering
- Multiple sort options
- Pagination support

### **🛒 Guest & Authenticated Shopping**
- **Guest Cart:** Session-based cart for anonymous users
- **Persistent Cart:** Database-backed cart for authenticated users
- **Cart Merging:** Automatic merge when guest users login
- **Real-time Validation:** Stock and price validation

### **📱 Mobile-First Design**
- Optimized for Nigerian mobile networks
- Lightweight response payloads
- Efficient image delivery
- Touch-friendly interfaces support

---

## 🚀 **Getting Started**

### **1. Authentication Flow**
```javascript
// Step 1: Request OTP
POST /api/v1/auth/request-otp
{
  "phoneNumber": "+2348012345678",
  "purpose": "login"
}

// Step 2: Verify OTP
POST /api/v1/auth/verify-otp
{
  "phoneNumber": "+2348012345678", 
  "code": "123456",
  "purpose": "login"
}
```

### **2. Browse Products**
```javascript
// Get featured Nigerian products
GET /api/v1/products/featured?limit=10

// Search for traditional wear
GET /api/v1/products?search=ankara&categoryId=traditional-wear&minPrice=15000
```

### **3. Guest Shopping Flow**
```javascript
// Add to guest cart
POST /api/v1/cart/add
Headers: { "X-Session-ID": "guest-session-123" }
{
  "productId": "prod_123",
  "quantity": 2
}

// Calculate Nigerian shipping
POST /api/v1/cart/shipping/calculate
Headers: { "X-Session-ID": "guest-session-123" }
{
  "state": "Lagos State",
  "city": "Victoria Island"
}
```

### **4. Create Order**
```javascript
// Guest checkout
POST /api/v1/orders/guest/create
{
  "guestInfo": {
    "email": "customer@example.com",
    "firstName": "Adebayo",
    "lastName": "Ogundimu",
    "phoneNumber": "+2348012345678"
  },
  "shippingAddress": {
    "firstName": "Adebayo",
    "lastName": "Ogundimu",
    "addressLine1": "15 Allen Avenue", 
    "city": "Lagos",
    "state": "Lagos State",
    "phoneNumber": "+2348012345678"
  },
  "paymentMethod": "PAYSTACK"
}
```

---

## 📊 **Response Format**

### **Standard Success Response**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  },
  "meta": {
    "timestamp": "2025-08-20T07:30:00.000Z",
    "version": "1.0.0"
  }
}
```

### **Standard Error Response** 
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detailed error information"
  },
  "meta": {
    "timestamp": "2025-08-20T07:30:00.000Z"
  }
}
```

---

## 🔒 **Security Features**

### **🛡️ API Security**
- **HTTPS Enforcement:** All production traffic encrypted
- **Rate Limiting:** Tiered rate limiting by endpoint sensitivity
- **Input Validation:** Comprehensive request validation
- **SQL Injection Protection:** Prisma ORM with parameterized queries

### **🔐 Authentication Security**
- **JWT Tokens:** 15-minute access tokens, 7-day refresh tokens
- **OTP Security:** 6-digit codes with 10-minute expiry
- **Session Management:** Secure session handling for admin operations
- **Role-based Access:** CUSTOMER, ADMIN, SUPER_ADMIN roles

### **🇳🇬 Nigerian Compliance**
- **Data Protection:** Nigerian data protection law compliance
- **VAT Handling:** Automatic 7.5% VAT calculations
- **Phone Validation:** Nigerian telecom network validation
- **Address Verification:** Nigerian postal code and state validation

---

## 📈 **Performance Metrics**

### **🎯 Current Performance**
- **Average Response Time:** 245ms
- **95th Percentile:** 890ms  
- **99th Percentile:** 1.2s
- **Error Rate:** <2%
- **Cache Hit Rate:** 95%
- **Uptime:** 99.9%

### **🔧 Monitoring Endpoints**
```javascript
// Health check
GET /api/v1/metrics/health
// Returns: healthy|degraded|unhealthy with recommendations

// Performance metrics  
GET /api/v1/metrics/performance?window=300000
// Returns: response times, throughput, error rates

// Real-time monitoring
GET /api/v1/metrics/realtime
// Returns: current metrics with trends
```

---

## 🌍 **Nigerian Business Context**

### **💼 Target Market**
- **Primary:** Nigerian online retailers and marketplaces
- **Secondary:** Pan-African e-commerce expansion
- **User Base:** 50M+ Nigerian internet users
- **Mobile Usage:** 80%+ mobile-first customers

### **🏪 Supported Business Models**
- **B2C Marketplaces:** Individual seller to customer
- **B2B Wholesale:** Bulk ordering and enterprise sales
- **Multi-vendor Platforms:** Multiple sellers on single platform
- **Drop-shipping:** Supplier integration support

### **📍 Logistics Integration**
- **Last-Mile Delivery:** Integration with Nigerian logistics companies
- **Cash on Delivery:** Support for COD payments
- **Pickup Points:** Strategic location pickup support
- **Express Delivery:** Same-day delivery in Lagos and Abuja

---

## 🛠️ **Developer Resources**

### **📚 SDKs & Libraries**
- **JavaScript/Node.js:** Official SDK available
- **React/Next.js:** Component library for frontend integration  
- **Mobile:** React Native integration helpers
- **PHP:** Laravel package for WordPress/WooCommerce

### **🔧 Testing Environment**
- **Postman Collection:** Complete API collection available
- **Swagger UI:** Interactive API documentation
- **Test Data:** Sample Nigerian products and addresses
- **Sandbox:** Full-featured development environment

### **📖 Additional Documentation**
- **Integration Guide:** Step-by-step integration instructions
- **Nigerian Market Guide:** Cultural and business context
- **Payment Integration:** Paystack integration specifics
- **Shipping Guide:** Nigerian logistics best practices

---

**📧 Support:** dev@bareloft.com  
**🌐 Website:** https://bareloft.com  
**📱 Status Page:** https://status.bareloft.com

---

*Built with ❤️ for Nigerian entrepreneurs and developers*