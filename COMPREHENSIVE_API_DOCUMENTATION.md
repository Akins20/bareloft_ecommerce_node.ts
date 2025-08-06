# Bareloft E-commerce API - Comprehensive Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:3000/api/v1`  
**Nigerian Market Optimized E-commerce Backend API**

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Nigerian Market Features](#nigerian-market-features)
4. [API Endpoints](#api-endpoints)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Testing Guide](#testing-guide)

---

## Overview

The Bareloft API is a comprehensive e-commerce backend designed specifically for the Nigerian market. It provides complete functionality for online retail including user management, product catalog, shopping cart, order processing, and payment integration with Paystack.

### Key Features

- **OTP-based Authentication**: Phone number authentication with SMS verification
- **Nigerian Phone Support**: Full +234 format validation and processing
- **Naira Currency**: Complete NGN currency handling and formatting
- **Real-time Inventory**: Live stock tracking and reservation
- **Paystack Integration**: Ready for Nigerian payment processing
- **State-aware Shipping**: Nigerian states and cities support
- **Guest Cart Support**: Anonymous shopping with session management

---

## Authentication

### Authentication Flow

The API uses OTP (One-Time Password) based authentication optimized for Nigerian phone numbers.

#### User Registration Flow
1. **Request OTP**: `POST /auth/request-otp` with purpose: 'signup'
2. **Receive SMS**: User gets 6-digit code via SMS
3. **Complete Signup**: `POST /auth/signup` with user details + OTP
4. **Get Tokens**: Receive access & refresh tokens

#### User Login Flow
1. **Request OTP**: `POST /auth/request-otp` with purpose: 'login'
2. **Receive SMS**: User gets 6-digit code via SMS  
3. **Login**: `POST /auth/login` with phone + OTP
4. **Get Tokens**: Receive access & refresh tokens

### Token Management
- **Access tokens** expire in 15 minutes
- **Refresh tokens** expire in 7 days
- Use `Authorization: Bearer <token>` header for authenticated requests
- Use `POST /auth/refresh` to get new access token

---

## Nigerian Market Features

### Phone Number Format
- **Format**: +234XXXXXXXXXX
- **Examples**: +2348012345678, +2347012345678, +2349012345678
- **Networks**: MTN, Glo, Airtel, 9mobile supported
- **Validation**: Full network validation and formatting

### Currency (Naira - NGN)
- **Symbol**: ₦
- **Format**: ₦1,999.99
- **Precision**: 2 decimal places
- **Paystack**: Uses kobo (multiply by 100 for Paystack API)

### Nigerian States Support
All 36 states plus FCT supported:
```
Abia, Adamawa, Akwa Ibom, Anambra, Bauchi, Bayelsa, Benue, Borno, 
Cross River, Delta, Ebonyi, Edo, Ekiti, Enugu, Gombe, Imo, Jigawa, 
Kaduna, Kano, Katsina, Kebbi, Kogi, Kwara, Lagos, Nasarawa, Niger, 
Ogun, Ondo, Osun, Oyo, Plateau, Rivers, Sokoto, Taraba, Yobe, Zamfara, FCT
```

### Shipping Zones
- **Zone 1**: Lagos, Ogun, Oyo (1-2 days, ₦1,500)
- **Zone 2**: Southwest states (2-3 days, ₦2,500)
- **Zone 3**: Other states (3-5 days, ₦3,500)
- **Remote**: Hard-to-reach areas (5-7 days, ₦5,000)
- **Free Shipping**: Orders above ₦50,000 (Zone 1 & 2 only)

---

## API Endpoints

### Health Check

#### GET /health
**Description**: Check API server health and service status  
**Access**: Public  
**Cache**: No cache

```bash
curl -X GET http://localhost:3000/health
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "environment": "development",
  "responseTime": "45ms",
  "services": {
    "database": "healthy",
    "paystack": "healthy",
    "email": "healthy"
  },
  "metrics": {
    "uptime": "3600s",
    "memory": {
      "used": "128MB",
      "total": "512MB",
      "rss": "256MB"
    },
    "nodeVersion": "v18.17.0"
  }
}
```

---

## 1. Authentication Endpoints

### Base Path: `/api/v1/auth`

#### POST /auth/request-otp
**Description**: Request OTP code for login/signup  
**Access**: Public  
**Rate Limit**: 3 requests per minute

**Request Body**:
```json
{
  "phoneNumber": "+2348012345678",
  "purpose": "login" // or "signup", "password_reset"
}
```

**Response**:
```json
{
  "success": true,
  "message": "OTP sent to ****5678",
  "data": {
    "success": true,
    "message": "Verification code sent to your phone",
    "expiresIn": 600,
    "canResendIn": 60
  }
}
```

#### POST /auth/verify-otp
**Description**: Verify OTP code (standalone verification)  
**Access**: Public  
**Rate Limit**: 5 requests per minute

**Request Body**:
```json
{
  "phoneNumber": "+2348012345678",
  "code": "123456",
  "purpose": "login"
}
```

**Response**:
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "verified": true
  }
}
```

#### POST /auth/signup
**Description**: Register new user account  
**Access**: Public  
**Rate Limit**: 5 requests per minute

**Request Body**:
```json
{
  "phoneNumber": "+2348012345678",
  "firstName": "Emeka",
  "lastName": "Okafor",
  "email": "emeka@example.com", // optional
  "otpCode": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": {
      "id": "uuid-here",
      "phoneNumber": "+2348012345678",
      "firstName": "Emeka",
      "lastName": "Okafor",
      "email": "emeka@example.com",
      "role": "customer",
      "isVerified": true,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "accessToken": "jwt-token-here",
    "refreshToken": "refresh-token-here",
    "expiresIn": 900
  }
}
```

#### POST /auth/login
**Description**: User login with OTP verification  
**Access**: Public  
**Rate Limit**: 5 requests per minute

**Request Body**:
```json
{
  "phoneNumber": "+2348012345678",
  "otpCode": "123456"
}
```

**Response**: Same as signup response

#### POST /auth/refresh
**Description**: Refresh access token  
**Access**: Public  
**Rate Limit**: 10 requests per minute

**Request Body**:
```json
{
  "refreshToken": "refresh-token-here"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new-jwt-token-here",
    "expiresIn": 900
  }
}
```

#### POST /auth/logout
**Description**: User logout (invalidate session)  
**Access**: Private  
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "refreshToken": "refresh-token-here", // optional
  "logoutAllDevices": false // optional
}
```

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": {
    "sessionsInvalidated": 1
  }
}
```

#### GET /auth/me
**Description**: Get current authenticated user information  
**Access**: Private  
**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "message": "Current user retrieved successfully",
  "data": {
    "user": {
      "id": "uuid-here",
      "phoneNumber": "+2348012345678",
      "firstName": "Emeka",
      "lastName": "Okafor",
      "email": "emeka@example.com",
      "avatar": "https://example.com/avatar.jpg",
      "role": "customer",
      "isVerified": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "lastLoginAt": "2024-01-15T15:45:00.000Z"
    }
  }
}
```

#### GET /auth/check-phone/:phoneNumber
**Description**: Check if phone number is available for registration  
**Access**: Public  
**Rate Limit**: 20 requests per minute

**Example**: `GET /auth/check-phone/+2348012345678`

**Response**:
```json
{
  "success": true,
  "message": "Phone number availability checked",
  "data": {
    "available": false,
    "phoneNumber": "****5678"
  }
}
```

---

## 2. Product Catalog Endpoints

### Base Path: `/api/v1/products`

#### GET /products
**Description**: Get products with filtering, search, and pagination  
**Access**: Public  
**Cache**: 5 minutes

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `categoryId`: Filter by category ID
- `search`: Search in name and description
- `minPrice`: Minimum price filter (NGN)
- `maxPrice`: Maximum price filter (NGN)
- `brand`: Filter by brand
- `isActive`: Filter by active status
- `isFeatured`: Filter by featured status
- `sortBy`: Sort field ('name'|'price'|'createdAt'|'rating')
- `sortOrder`: Sort order ('asc'|'desc')
- `inStock`: Filter by stock availability

**Example**: `GET /products?page=1&limit=20&categoryId=electronics&minPrice=5000&maxPrice=50000&sortBy=price&sortOrder=asc`

**Response**:
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": {
    "products": [
      {
        "id": "product-uuid",
        "name": "Samsung Galaxy A54",
        "slug": "samsung-galaxy-a54",
        "description": "Latest Samsung smartphone with advanced features",
        "shortDescription": "Premium smartphone for everyday use",
        "sku": "SGH-A54-BLK",
        "price": 285000,
        "comparePrice": 320000,
        "categoryId": "smartphones",
        "brand": "Samsung",
        "isActive": true,
        "isFeatured": true,
        "images": [
          {
            "id": "image-uuid",
            "url": "https://cloudinary.com/galaxy-a54.jpg",
            "altText": "Samsung Galaxy A54",
            "isPrimary": true,
            "sortOrder": 1
          }
        ],
        "category": {
          "id": "smartphones",
          "name": "Smartphones",
          "slug": "smartphones"
        },
        "inventory": {
          "inStock": true,
          "quantity": 25,
          "lowStock": false
        },
        "rating": {
          "average": 4.5,
          "count": 128
        },
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T15:45:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    },
    "filters": {
      "categories": [
        {"id": "smartphones", "name": "Smartphones", "count": 45},
        {"id": "laptops", "name": "Laptops", "count": 32}
      ],
      "brands": ["Samsung", "Apple", "Tecno", "Infinix"],
      "priceRange": {"min": 5000, "max": 850000}
    }
  }
}
```

#### GET /products/featured
**Description**: Get featured products  
**Access**: Public  
**Cache**: 10 minutes

**Query Parameters**:
- `limit`: Max items to return (default: 12, max: 50)

#### GET /products/:id
**Description**: Get product details by ID  
**Access**: Public  
**Cache**: 10 minutes

**Response**:
```json
{
  "success": true,
  "message": "Product retrieved successfully",
  "data": {
    "product": {
      // Full product object with all details
    },
    "relatedProducts": [
      // Array of related products
    ],
    "reviews": {
      "summary": {
        "averageRating": 4.5,
        "totalReviews": 128,
        "ratingDistribution": {
          "5": 65,
          "4": 32,
          "3": 20,
          "2": 8,
          "1": 3
        }
      },
      "recent": [
        // Recent reviews
      ]
    },
    "stock": {
      "inStock": true,
      "quantity": 25,
      "availableQuantity": 23
    }
  }
}
```

#### GET /products/slug/:slug
**Description**: Get product by SEO-friendly slug  
**Access**: Public  
**Cache**: 10 minutes

#### GET /products/:id/stock
**Description**: Get real-time stock information  
**Access**: Public  
**Rate Limit**: 120 requests per minute

**Response**:
```json
{
  "success": true,
  "message": "Stock information retrieved successfully",
  "data": {
    "productId": "product-uuid",
    "inStock": true,
    "quantity": 25,
    "lowStock": false,
    "availableQuantity": 23,
    "reservedQuantity": 2,
    "lastUpdated": "2024-01-15T15:45:00.000Z"
  }
}
```

#### POST /products/check-stock
**Description**: Check stock for multiple products  
**Access**: Public  
**Rate Limit**: 60 requests per minute

**Request Body**:
```json
{
  "productIds": ["product-uuid-1", "product-uuid-2", "product-uuid-3"]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Stock information retrieved successfully",
  "data": [
    {
      "productId": "product-uuid-1",
      "inStock": true,
      "quantity": 25,
      "availableQuantity": 23,
      "lowStock": false
    },
    {
      "productId": "product-uuid-2",
      "inStock": false,
      "quantity": 0,
      "availableQuantity": 0,
      "lowStock": true
    }
  ]
}
```

---

## 3. Shopping Cart Endpoints

### Base Path: `/api/v1/cart`

#### GET /cart
**Description**: Get user's current shopping cart  
**Access**: Public (supports guest users)  
**Headers**: 
- `Authorization: Bearer <token>` (for authenticated users)
- `X-Session-ID: <uuid>` (for guest users)

**Response**:
```json
{
  "success": true,
  "message": "Cart retrieved successfully",
  "data": {
    "cart": {
      "id": "cart-uuid",
      "items": [
        {
          "id": "item-uuid",
          "productId": "product-uuid",
          "quantity": 2,
          "unitPrice": 285000,
          "totalPrice": 570000,
          "product": {
            "id": "product-uuid",
            "name": "Samsung Galaxy A54",
            "slug": "samsung-galaxy-a54",
            "sku": "SGH-A54-BLK",
            "primaryImage": "https://cloudinary.com/galaxy-a54.jpg",
            "inStock": true,
            "stockQuantity": 25
          },
          "isAvailable": true,
          "hasStockIssue": false,
          "priceChanged": false
        }
      ],
      "itemCount": 2,
      "subtotal": 570000,
      "estimatedTax": 28500,
      "estimatedShipping": 2500,
      "estimatedTotal": 601000,
      "currency": "NGN",
      "appliedCoupon": {
        "code": "SAVE10",
        "discountAmount": 57000,
        "discountType": "percentage"
      },
      "hasOutOfStockItems": false,
      "hasPriceChanges": false,
      "isValid": true
    }
  }
}
```

#### POST /cart/add
**Description**: Add item to shopping cart  
**Access**: Public (supports guest users)  
**Rate Limit**: 60 requests per minute

**Request Body**:
```json
{
  "productId": "product-uuid",
  "quantity": 2
}
```

**Response**:
```json
{
  "success": true,
  "message": "Item added to cart successfully",
  "data": {
    "success": true,
    "message": "Product added to cart",
    "cart": {
      // Full cart object
    },
    "warnings": [
      "Only 5 items remaining in stock"
    ]
  }
}
```

#### PUT /cart/update
**Description**: Update cart item quantity  
**Access**: Public (supports guest users)  
**Rate Limit**: 60 requests per minute

**Request Body**:
```json
{
  "productId": "product-uuid",
  "quantity": 3
}
```

#### DELETE /cart/remove/:productId
**Description**: Remove item from cart  
**Access**: Public (supports guest users)  
**Rate Limit**: 60 requests per minute

#### DELETE /cart/clear
**Description**: Clear entire shopping cart  
**Access**: Public (supports guest users)

#### GET /cart/count
**Description**: Get cart item count (for header badge)  
**Access**: Public (supports guest users)  
**Rate Limit**: 120 requests per minute

**Response**:
```json
{
  "success": true,
  "message": "Cart item count retrieved successfully",
  "data": {
    "count": 3
  }
}
```

#### POST /cart/validate
**Description**: Validate cart items and check availability  
**Access**: Public (supports guest users)

**Response**:
```json
{
  "success": true,
  "message": "Cart validation completed",
  "data": {
    "isValid": false,
    "issues": [
      {
        "type": "out_of_stock",
        "productId": "product-uuid-2",
        "productName": "iPhone 15",
        "message": "Product is currently out of stock",
        "severity": "error",
        "action": "remove"
      },
      {
        "type": "price_change",
        "productId": "product-uuid-1",
        "productName": "Samsung Galaxy A54",
        "message": "Price has changed from ₦285,000 to ₦275,000",
        "severity": "warning",
        "action": "update_price"
      }
    ],
    "cart": {
      // Updated cart object
    }
  }
}
```

#### POST /cart/merge
**Description**: Merge guest cart with user cart after login  
**Access**: Private  
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "guestSessionId": "guest-session-uuid",
  "strategy": "merge" // "replace", "merge", "keep_authenticated"
}
```

#### POST /cart/coupon/apply
**Description**: Apply coupon code to cart  
**Access**: Public (supports guest users)  
**Rate Limit**: 20 requests per minute

**Request Body**:
```json
{
  "couponCode": "SAVE10"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Coupon applied successfully",
  "data": {
    "success": true,
    "message": "Coupon SAVE10 applied",
    "cart": {
      // Updated cart with discount
    },
    "discount": {
      "code": "SAVE10",
      "type": "percentage",
      "value": 10,
      "amount": 57000
    }
  }
}
```

#### DELETE /cart/coupon/remove
**Description**: Remove applied coupon  
**Access**: Public (supports guest users)

---

## 4. Order Management Endpoints

### Base Path: `/api/v1/orders`

#### POST /orders/create
**Description**: Create new order from cart  
**Access**: Private  
**Rate Limit**: 5 orders per 10 minutes  
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "shippingAddress": {
    "firstName": "Emeka",
    "lastName": "Okafor",
    "company": "Tech Solutions Ltd", // optional
    "addressLine1": "15 Victoria Island Road",
    "addressLine2": "Suite 304", // optional
    "city": "Lagos",
    "state": "Lagos",
    "postalCode": "101001", // optional
    "phoneNumber": "+2348012345678"
  },
  "billingAddress": {
    // Same structure as shipping, optional if same as shipping
  },
  "paymentMethod": {
    "type": "paystack",
    "returnUrl": "https://yourapp.com/payment/success",
    "cancelUrl": "https://yourapp.com/payment/cancel"
  },
  "customerNotes": "Please handle with care", // optional
  "couponCode": "SAVE10" // optional
}
```

**Response**:
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {
      "id": "order-uuid",
      "orderNumber": "BL001234",
      "status": "pending_payment",
      "items": [
        {
          "id": "order-item-uuid",
          "productId": "product-uuid",
          "productName": "Samsung Galaxy A54",
          "quantity": 2,
          "unitPrice": 285000,
          "totalPrice": 570000
        }
      ],
      "itemCount": 2,
      "subtotal": 570000,
      "taxAmount": 28500,
      "shippingAmount": 2500,
      "discountAmount": 57000,
      "totalAmount": 544000,
      "currency": "NGN",
      "shippingAddress": {
        // Full shipping address
      },
      "paymentStatus": "pending",
      "estimatedDeliveryDate": "2024-01-20T00:00:00.000Z",
      "createdAt": "2024-01-15T16:30:00.000Z"
    },
    "payment": {
      "reference": "paystack-ref-123456",
      "authorizationUrl": "https://checkout.paystack.com/...",
      "accessCode": "access-code-123"
    }
  }
}
```

#### GET /orders
**Description**: Get user's order history  
**Access**: Private  
**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by order status
- `startDate`: Filter orders from date (ISO format)
- `endDate`: Filter orders to date (ISO format)
- `sortBy`: Sort field ('createdAt'|'totalAmount'|'status')
- `sortOrder`: Sort order ('asc'|'desc')

**Response**:
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": {
    "orders": [
      {
        "id": "order-uuid",
        "orderNumber": "BL001234",
        "status": "delivered",
        "itemCount": 2,
        "totalAmount": 544000,
        "currency": "NGN",
        "createdAt": "2024-01-15T16:30:00.000Z",
        "deliveredAt": "2024-01-18T14:20:00.000Z",
        "items": [
          {
            "productName": "Samsung Galaxy A54",
            "quantity": 2,
            "primaryImage": "https://cloudinary.com/galaxy-a54.jpg"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    },
    "summary": {
      "totalOrders": 15,
      "totalSpent": 8560000,
      "averageOrderValue": 570667,
      "statusBreakdown": {
        "pending": 2,
        "processing": 3,
        "shipped": 2,
        "delivered": 7,
        "cancelled": 1
      }
    }
  }
}
```

#### GET /orders/:id
**Description**: Get order details by ID  
**Access**: Private (own orders only)  
**Headers**: `Authorization: Bearer <token>`

#### GET /orders/number/:orderNumber
**Description**: Get order by order number  
**Access**: Private  
**Headers**: `Authorization: Bearer <token>`

#### GET /orders/:id/tracking
**Description**: Track order status and shipping  
**Access**: Private  
**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "message": "Order tracking retrieved successfully",
  "data": {
    "order": {
      "id": "order-uuid",
      "orderNumber": "BL001234",
      "status": "shipped",
      "trackingNumber": "TRK123456789"
    },
    "tracking": {
      "currentStatus": "shipped",
      "estimatedDeliveryDate": "2024-01-20T00:00:00.000Z",
      "carrier": "DHL Nigeria",
      "trackingUrl": "https://dhl.com.ng/track/TRK123456789",
      "lastUpdate": "2024-01-18T10:30:00.000Z",
      "location": "Lagos Distribution Center"
    },
    "timeline": [
      {
        "status": "order_confirmed",
        "timestamp": "2024-01-15T16:30:00.000Z",
        "message": "Order confirmed and payment received"
      },
      {
        "status": "processing",
        "timestamp": "2024-01-16T09:15:00.000Z",
        "message": "Order is being prepared for shipment"
      },
      {
        "status": "shipped",
        "timestamp": "2024-01-18T08:45:00.000Z",
        "message": "Order shipped via DHL Nigeria",
        "trackingNumber": "TRK123456789"
      }
    ]
  }
}
```

#### PUT /orders/:id/cancel
**Description**: Cancel order (if allowed)  
**Access**: Private  
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "reason": "Changed my mind" // optional
}
```

#### POST /orders/:id/reorder
**Description**: Create new order from existing order  
**Access**: Private  
**Rate Limit**: 5 orders per 10 minutes  
**Headers**: `Authorization: Bearer <token>`

#### POST /orders/:id/return
**Description**: Request return/refund  
**Access**: Private  
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "items": [
    {
      "productId": "product-uuid",
      "quantity": 1,
      "reason": "defective"
    }
  ],
  "reason": "Product arrived damaged",
  "notes": "Package was crushed during shipping" // optional
}
```

---

## 5. User Management Endpoints

### Base Path: `/api/v1/users`

#### GET /users/profile
**Description**: Get user profile  
**Access**: Private  
**Headers**: `Authorization: Bearer <token>`

#### PUT /users/profile
**Description**: Update user profile  
**Access**: Private  
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "firstName": "Emeka",
  "lastName": "Okafor",
  "email": "emeka@example.com" // optional
}
```

#### GET /users/account/summary
**Description**: Get account summary with statistics  
**Access**: Private  
**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "message": "Account summary retrieved successfully",
  "data": {
    "user": {
      "id": "user-uuid",
      "phoneNumber": "+2348012345678",
      "firstName": "Emeka",
      "lastName": "Okafor",
      "email": "emeka@example.com",
      "isVerified": true,
      "memberSince": "2024-01-15T10:30:00.000Z"
    },
    "statistics": {
      "totalOrders": 15,
      "totalSpent": 8560000,
      "averageOrderValue": 570667,
      "favoriteCategory": "Electronics",
      "lastOrderDate": "2024-01-15T16:30:00.000Z"
    },
    "recentOrders": [
      // Last 3 orders
    ],
    "addresses": [
      // User addresses
    ],
    "wishlistCount": 12
  }
}
```

---

## 6. Address Management Endpoints

### Base Path: `/api/v1/addresses`

#### GET /addresses
**Description**: Get user addresses  
**Access**: Private  
**Headers**: `Authorization: Bearer <token>`

#### POST /addresses
**Description**: Create new address  
**Access**: Private  
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "type": "shipping", // or "billing"
  "firstName": "Emeka",
  "lastName": "Okafor",
  "company": "Tech Solutions Ltd", // optional
  "addressLine1": "15 Victoria Island Road",
  "addressLine2": "Suite 304", // optional
  "city": "Lagos",
  "state": "Lagos",
  "postalCode": "101001", // optional
  "phoneNumber": "+2348012345678",
  "isDefault": true // optional
}
```

#### PUT /addresses/:id
**Description**: Update address  
**Access**: Private

#### DELETE /addresses/:id
**Description**: Delete address  
**Access**: Private

#### PUT /addresses/:id/default
**Description**: Set as default address  
**Access**: Private

#### GET /addresses/locations
**Description**: Get Nigerian locations (states/cities)  
**Access**: Public

**Response**:
```json
{
  "success": true,
  "message": "Nigerian locations retrieved successfully",
  "data": {
    "states": [
      {
        "name": "Lagos",
        "code": "LG",
        "cities": ["Lagos", "Ikeja", "Surulere", "Victoria Island", "Ikoyi"]
      },
      {
        "name": "Oyo",
        "code": "OY",
        "cities": ["Ibadan", "Ogbomoso", "Oyo", "Iseyin"]
      }
    ]
  }
}
```

---

## 7. Wishlist Endpoints

### Base Path: `/api/v1/wishlist`

#### GET /wishlist
**Description**: Get user's wishlist  
**Access**: Private  
**Headers**: `Authorization: Bearer <token>`

#### POST /wishlist/add
**Description**: Add product to wishlist  
**Access**: Private

**Request Body**:
```json
{
  "productId": "product-uuid"
}
```

#### DELETE /wishlist/remove/:productId
**Description**: Remove from wishlist  
**Access**: Private

#### GET /wishlist/count
**Description**: Get wishlist count  
**Access**: Private

---

## 8. Search Endpoints

### Base Path: `/api/v1/search`

#### GET /search
**Description**: Search products with advanced filters  
**Access**: Public

**Query Parameters**:
- `q`: Search query
- `categoryId`: Filter by category
- `minPrice`: Minimum price
- `maxPrice`: Maximum price
- `brand`: Filter by brand
- `page`: Page number
- `limit`: Items per page

#### GET /search/autocomplete
**Description**: Get search suggestions  
**Access**: Public  
**Query Parameters**: `q` (search query)

#### GET /search/popular
**Description**: Get popular search terms  
**Access**: Public

---

## 9. Upload Endpoints

### Base Path: `/api/v1/upload`

#### POST /upload/single
**Description**: Upload single file  
**Access**: Private  
**Content-Type**: `multipart/form-data`

#### POST /upload/avatar
**Description**: Upload user avatar  
**Access**: Private  
**Content-Type**: `multipart/form-data`

---

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional error information"
  },
  "meta": {
    "timestamp": "2024-01-15T16:30:00.000Z"
  }
}
```

### Common Error Codes

#### Authentication Errors
- `INVALID_CREDENTIALS`: Invalid login credentials
- `TOKEN_EXPIRED`: Access token has expired
- `TOKEN_INVALID`: Invalid or malformed token
- `NOT_AUTHENTICATED`: Authentication required
- `UNAUTHORIZED`: Insufficient permissions

#### Validation Errors
- `VALIDATION_ERROR`: Request validation failed
- `INVALID_INPUT`: Invalid input parameters
- `MISSING_REQUIRED_FIELD`: Required field missing

#### Resource Errors
- `RESOURCE_NOT_FOUND`: Requested resource not found
- `RESOURCE_ALREADY_EXISTS`: Resource already exists
- `RESOURCE_CONFLICT`: Resource conflict

#### Business Logic Errors
- `INSUFFICIENT_STOCK`: Not enough stock available
- `PRODUCT_OUT_OF_STOCK`: Product is out of stock
- `ORDER_CANNOT_BE_CANCELLED`: Order cancellation not allowed
- `PAYMENT_FAILED`: Payment processing failed
- `INVALID_COUPON`: Coupon code invalid or expired

#### Nigerian-Specific Errors
- `INVALID_PHONE_NUMBER`: Invalid Nigerian phone number format
- `INVALID_STATE`: Invalid Nigerian state
- `OTP_EXPIRED`: OTP code has expired
- `OTP_INVALID`: Invalid OTP code
- `SMS_DELIVERY_FAILED`: SMS delivery failed

### HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `422`: Unprocessable Entity
- `429`: Too Many Requests
- `500`: Internal Server Error
- `503`: Service Unavailable

---

## Rate Limiting

### Rate Limits by Endpoint Type

#### Authentication Endpoints
- **OTP Requests**: 3 requests per minute
- **Login/Signup**: 5 requests per minute
- **Token Refresh**: 10 requests per minute

#### General API Endpoints
- **Product Browsing**: 100 requests per minute
- **Cart Operations**: 60 requests per minute
- **Order Creation**: 5 requests per 10 minutes
- **Stock Checking**: 120 requests per minute

#### Headers in Rate-Limited Responses
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642353600
```

---

## Testing Guide

### Authentication Testing

1. **Request OTP for Signup**
```bash
curl -X POST http://localhost:3000/api/v1/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+2348012345678",
    "purpose": "signup"
  }'
```

2. **Complete Signup**
```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+2348012345678",
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "otpCode": "123456"
  }'
```

3. **Get Current User**
```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Product Catalog Testing

1. **Get Products**
```bash
curl -X GET "http://localhost:3000/api/v1/products?page=1&limit=10&sortBy=price&sortOrder=asc"
```

2. **Search Products**
```bash
curl -X GET "http://localhost:3000/api/v1/products?search=samsung&minPrice=100000&maxPrice=500000"
```

3. **Get Product Details**
```bash
curl -X GET http://localhost:3000/api/v1/products/PRODUCT_ID
```

### Shopping Cart Testing

1. **Add to Cart (Guest)**
```bash
curl -X POST http://localhost:3000/api/v1/cart/add \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: guest-session-uuid" \
  -d '{
    "productId": "PRODUCT_ID",
    "quantity": 2
  }'
```

2. **Get Cart**
```bash
curl -X GET http://localhost:3000/api/v1/cart \
  -H "X-Session-ID: guest-session-uuid"
```

3. **Apply Coupon**
```bash
curl -X POST http://localhost:3000/api/v1/cart/coupon/apply \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: guest-session-uuid" \
  -d '{
    "couponCode": "SAVE10"
  }'
```

### Order Testing

1. **Create Order**
```bash
curl -X POST http://localhost:3000/api/v1/orders/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "shippingAddress": {
      "firstName": "Test",
      "lastName": "User",
      "addressLine1": "123 Test Street",
      "city": "Lagos",
      "state": "Lagos",
      "phoneNumber": "+2348012345678"
    },
    "paymentMethod": {
      "type": "paystack",
      "returnUrl": "https://yourapp.com/payment/success"
    }
  }'
```

2. **Get Orders**
```bash
curl -X GET http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

3. **Track Order**
```bash
curl -X GET http://localhost:3000/api/v1/orders/ORDER_ID/tracking \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Nigerian Market Testing

1. **Test Nigerian Phone Numbers**
```bash
# Valid formats
+2348012345678  # MTN
+2347012345678  # Glo
+2349012345678  # Airtel
+2341012345678  # 9mobile

# Test phone availability
curl -X GET http://localhost:3000/api/v1/auth/check-phone/+2348012345678
```

2. **Test Nigerian States**
```bash
curl -X GET http://localhost:3000/api/v1/addresses/locations
```

3. **Test Naira Currency Formatting**
All prices should be returned in this format:
- Amount: 285000 (stored as kobo for Paystack)
- Formatted: "₦2,850.00"

### Performance Testing

1. **Load Testing with curl**
```bash
# Test rate limits
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/v1/auth/request-otp \
    -H "Content-Type: application/json" \
    -d '{"phoneNumber": "+2348012345678", "purpose": "login"}' &
done
```

2. **Cache Testing**
```bash
# First request (cache miss)
curl -X GET http://localhost:3000/api/v1/products -w "@curl-format.txt"

# Second request (cache hit)
curl -X GET http://localhost:3000/api/v1/products -w "@curl-format.txt"
```

---

## Integration Examples

### Frontend Integration (React/Next.js)

```javascript
// API client setup
const API_BASE_URL = 'http://localhost:3000/api/v1';

class BareloftAPI {
  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    this.sessionId = localStorage.getItem('sessionId') || this.generateSessionId();
  }

  generateSessionId() {
    const sessionId = crypto.randomUUID();
    localStorage.setItem('sessionId', sessionId);
    return sessionId;
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    } else {
      headers['X-Session-ID'] = this.sessionId;
    }

    return headers;
  }

  // Authentication
  async requestOTP(phoneNumber, purpose = 'login') {
    const response = await fetch(`${API_BASE_URL}/auth/request-otp`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ phoneNumber, purpose })
    });
    return response.json();
  }

  async signup(userData) {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(userData)
    });
    const data = await response.json();
    
    if (data.success) {
      this.accessToken = data.data.accessToken;
      localStorage.setItem('accessToken', this.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
    }
    
    return data;
  }

  // Products
  async getProducts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/products?${queryString}`, {
      headers: this.getHeaders()
    });
    return response.json();
  }

  // Cart
  async addToCart(productId, quantity) {
    const response = await fetch(`${API_BASE_URL}/cart/add`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ productId, quantity })
    });
    return response.json();
  }

  async getCart() {
    const response = await fetch(`${API_BASE_URL}/cart`, {
      headers: this.getHeaders()
    });
    return response.json();
  }

  // Orders
  async createOrder(orderData) {
    const response = await fetch(`${API_BASE_URL}/orders/create`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(orderData)
    });
    return response.json();
  }
}

// Usage example
const api = new BareloftAPI();

// Request OTP and signup
const handleSignup = async (formData) => {
  try {
    // Step 1: Request OTP
    await api.requestOTP(formData.phoneNumber, 'signup');
    
    // Step 2: Show OTP input form
    // User enters OTP code
    
    // Step 3: Complete signup
    const result = await api.signup({
      ...formData,
      otpCode: userEnteredOTP
    });
    
    if (result.success) {
      // Redirect to dashboard
      window.location.href = '/dashboard';
    }
  } catch (error) {
    console.error('Signup failed:', error);
  }
};
```

### Mobile App Integration (React Native)

```javascript
// Nigerian phone number formatting
const formatNigerianPhone = (phone) => {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle different formats
  if (cleaned.startsWith('234')) {
    return `+${cleaned}`;
  } else if (cleaned.startsWith('0')) {
    return `+234${cleaned.slice(1)}`;
  } else if (cleaned.length === 10) {
    return `+234${cleaned}`;
  }
  
  return phone;
};

// Cart management with AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

class MobileBareloftAPI extends BareloftAPI {
  async getStoredToken() {
    return await AsyncStorage.getItem('accessToken');
  }

  async getStoredSessionId() {
    let sessionId = await AsyncStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = this.generateSessionId();
      await AsyncStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  async mergeGuestCartAfterLogin() {
    const guestSessionId = await AsyncStorage.getItem('guestSessionId');
    if (guestSessionId) {
      await fetch(`${API_BASE_URL}/cart/merge`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          guestSessionId,
          strategy: 'merge'
        })
      });
      await AsyncStorage.removeItem('guestSessionId');
    }
  }
}
```

### Payment Integration (Paystack)

```javascript
// Frontend Paystack integration
const handlePayment = async (orderData) => {
  try {
    // Create order
    const orderResponse = await api.createOrder(orderData);
    
    if (orderResponse.success) {
      const { order, payment } = orderResponse.data;
      
      // Initialize Paystack
      const handler = PaystackPop.setup({
        key: 'pk_test_your_paystack_public_key',
        email: orderData.email || 'customer@example.com',
        amount: order.totalAmount * 100, // Convert to kobo
        currency: 'NGN',
        ref: payment.reference,
        callback: function(response) {
          // Payment successful
          console.log('Payment successful:', response);
          
          // Verify payment on backend
          api.verifyPayment(order.id).then(() => {
            window.location.href = `/orders/${order.id}/success`;
          });
        },
        onClose: function() {
          console.log('Payment cancelled');
        }
      });
      
      handler.openIframe();
    }
  } catch (error) {
    console.error('Payment initiation failed:', error);
  }
};
```

---

This comprehensive documentation provides everything needed to integrate with the Bareloft E-commerce API. The API is specifically optimized for the Nigerian market with support for local phone numbers, currency, and shipping zones.

For additional support or questions about the API, please contact the development team.