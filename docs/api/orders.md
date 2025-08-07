# Orders API Documentation

## Overview
The Orders API provides comprehensive order management functionality for the Bareloft e-commerce platform, including order creation, tracking, payment verification, returns, and administrative operations.

## Base URL
```
https://api.bareloft.com/api/v1/orders
```

## Authentication
- **Protected endpoints**: Require Bearer token in Authorization header
- **Public endpoints**: No authentication required (guest tracking, webhooks)
- **Admin endpoints**: Require admin role authorization

## Rate Limits
- **Order Creation**: 10 requests per minute per authenticated user
- **General**: 100 requests per minute per IP
- **Guest Tracking**: 20 requests per hour per IP

---

## Customer Endpoints

### Create Order
Create a new order from user's cart items.

```http
POST /api/v1/orders/create
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "addressLine1": "123 Victoria Island",
    "addressLine2": "Suite 45",
    "city": "Lagos",
    "state": "Lagos",
    "postalCode": "101001",
    "country": "Nigeria",
    "phoneNumber": "+2348012345678"
  },
  "billingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "addressLine1": "123 Victoria Island",
    "city": "Lagos",
    "state": "Lagos",
    "postalCode": "101001",
    "country": "Nigeria",
    "phoneNumber": "+2348012345678"
  },
  "paymentMethod": "PAYSTACK",
  "customerNotes": "Please deliver between 9AM-5PM",
  "couponCode": "WELCOME10"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {
      "id": "ord_123456789",
      "orderNumber": "BL240001",
      "status": "PENDING",
      "paymentStatus": "PENDING",
      "paymentMethod": "PAYSTACK",
      "subtotal": 15000,
      "tax": 1125,
      "shippingCost": 1500,
      "discount": 1500,
      "total": 16125,
      "currency": "NGN",
      "items": [
        {
          "id": "item_123",
          "productId": "prod_456",
          "productName": "iPhone 14 Pro",
          "quantity": 1,
          "price": 15000,
          "total": 15000
        }
      ],
      "estimatedDelivery": "2024-12-10T10:00:00Z",
      "createdAt": "2024-12-07T10:00:00Z"
    },
    "paymentUrl": "https://checkout.paystack.com/abc123"
  }
}
```

**Error Responses:**

**400 Bad Request - Validation Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Shipping address first name is required",
    "Valid Nigerian phone number is required",
    "Payment method is required"
  ]
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "User authentication required"
}
```

**422 Unprocessable Entity - Cart Empty:**
```json
{
  "success": false,
  "message": "Cannot create order with empty cart",
  "code": "CART_EMPTY"
}
```

---

### Get User Orders
Retrieve paginated list of user's order history with filtering options.

```http
GET /api/v1/orders?page=1&limit=10&status=DELIVERED&startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page, max 50 (default: 10)
- `status` (string, optional): Filter by order status
- `startDate` (string, optional): Filter from date (ISO format)
- `endDate` (string, optional): Filter to date (ISO format)
- `sortBy` (string, optional): Sort field (createdAt, totalAmount, status)
- `sortOrder` (string, optional): Sort direction (asc, desc)

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": {
    "orders": [
      {
        "id": "ord_123456789",
        "orderNumber": "BL240001",
        "status": "DELIVERED",
        "paymentStatus": "COMPLETED",
        "total": 16125,
        "currency": "NGN",
        "itemCount": 2,
        "createdAt": "2024-12-07T10:00:00Z",
        "estimatedDelivery": "2024-12-10T10:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 47,
      "itemsPerPage": 10,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### Get Order Details
Retrieve detailed information for a specific order by ID.

```http
GET /api/v1/orders/:id
Authorization: Bearer <token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Order retrieved successfully",
  "data": {
    "order": {
      "id": "ord_123456789",
      "orderNumber": "BL240001",
      "status": "DELIVERED",
      "paymentStatus": "COMPLETED",
      "paymentMethod": "PAYSTACK",
      "paymentReference": "T123456789",
      "subtotal": 15000,
      "tax": 1125,
      "shippingCost": 1500,
      "discount": 1500,
      "total": 16125,
      "currency": "NGN",
      "customerNotes": "Please deliver between 9AM-5PM",
      "shippingAddress": {
        "firstName": "John",
        "lastName": "Doe",
        "addressLine1": "123 Victoria Island",
        "city": "Lagos",
        "state": "Lagos",
        "country": "Nigeria",
        "phoneNumber": "+2348012345678"
      },
      "items": [
        {
          "id": "item_123",
          "productId": "prod_456",
          "productName": "iPhone 14 Pro",
          "productImage": "https://images.bareloft.com/iphone14.jpg",
          "quantity": 1,
          "price": 15000,
          "total": 15000
        }
      ],
      "timeline": [
        {
          "id": "evt_1",
          "type": "ORDER_CREATED",
          "message": "Order placed successfully",
          "timestamp": "2024-12-07T10:00:00Z",
          "status": "PENDING"
        },
        {
          "id": "evt_2",
          "type": "PAYMENT_COMPLETED",
          "message": "Payment confirmed",
          "timestamp": "2024-12-07T10:15:00Z",
          "status": "PAID"
        }
      ],
      "createdAt": "2024-12-07T10:00:00Z",
      "updatedAt": "2024-12-07T12:00:00Z"
    }
  }
}
```

**Error Responses:**

**404 Not Found:**
```json
{
  "success": false,
  "message": "Order not found or access denied"
}
```

---

### Get Order by Number
Retrieve order details using the human-readable order number.

```http
GET /api/v1/orders/number/:orderNumber
Authorization: Bearer <token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Order retrieved successfully",
  "data": {
    "order": {
      // Same structure as Get Order Details
    }
  }
}
```

---

### Get Order Statistics
Retrieve summary statistics for user's order history.

```http
GET /api/v1/orders/stats
Authorization: Bearer <token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Order statistics retrieved successfully",
  "data": {
    "totalOrders": 47,
    "totalSpent": 156750,
    "averageOrderValue": 3335,
    "statusBreakdown": {
      "PENDING": 2,
      "CONFIRMED": 1,
      "PROCESSING": 3,
      "SHIPPED": 5,
      "DELIVERED": 34,
      "CANCELLED": 1,
      "REFUNDED": 1
    },
    "recentOrders": 5,
    "favoriteProducts": [
      {
        "productId": "prod_456",
        "productName": "iPhone 14 Pro",
        "orderCount": 2,
        "totalSpent": 30000
      }
    ]
  }
}
```

---

### Track Order
Get real-time tracking information and shipping status.

```http
GET /api/v1/orders/:id/tracking
Authorization: Bearer <token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Order tracking information retrieved successfully",
  "data": {
    "orderNumber": "BL240001",
    "status": "SHIPPED",
    "paymentStatus": "COMPLETED",
    "tracking": {
      "trackingNumber": "TRK-BL240001",
      "currentLocation": "In Transit",
      "estimatedDelivery": "2024-12-10T10:00:00Z",
      "carrier": "Bareloft Logistics",
      "statusHistory": [
        {
          "status": "ORDER_PLACED",
          "location": "Order Processing Center",
          "timestamp": "2024-12-07T10:00:00Z",
          "description": "Order has been placed and is being prepared"
        },
        {
          "status": "SHIPPED",
          "location": "In Transit",
          "timestamp": "2024-12-08T14:30:00Z",
          "description": "Order has been shipped and is on the way"
        }
      ]
    }
  }
}
```

---

### Get Order Timeline
Retrieve detailed timeline of order status changes and events.

```http
GET /api/v1/orders/:id/timeline
Authorization: Bearer <token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Order timeline retrieved successfully",
  "data": {
    "timeline": [
      {
        "id": "evt_1",
        "type": "ORDER_CREATED",
        "message": "Order placed successfully",
        "timestamp": "2024-12-07T10:00:00Z",
        "status": "PENDING"
      },
      {
        "id": "evt_2",
        "type": "PAYMENT_COMPLETED",
        "message": "Payment confirmed",
        "timestamp": "2024-12-07T10:15:00Z",
        "status": "PAID"
      },
      {
        "id": "evt_3",
        "type": "STATUS_UPDATED",
        "message": "Order status updated to processing",
        "timestamp": "2024-12-07T12:00:00Z",
        "status": "PROCESSING"
      }
    ]
  }
}
```

---

### Get Invoice
Generate and retrieve invoice data (PDF generation capability).

```http
GET /api/v1/orders/:id/invoice?format=pdf
Authorization: Bearer <token>
```

**Query Parameters:**
- `format` (string, optional): Response format (pdf, html) - default: html

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Invoice data retrieved successfully",
  "data": {
    "invoice": {
      "orderNumber": "BL240001",
      "customerName": "John Doe",
      "customerEmail": "john.doe@example.com",
      "customerPhone": "+2348012345678",
      "orderDate": "2024-12-07T10:00:00Z",
      "items": [
        {
          "productName": "iPhone 14 Pro",
          "quantity": 1,
          "price": 15000,
          "total": 15000
        }
      ],
      "subtotal": 15000,
      "tax": 1125,
      "shippingCost": 1500,
      "discount": 1500,
      "total": 16125,
      "currency": "NGN",
      "status": "DELIVERED",
      "paymentStatus": "COMPLETED"
    }
  }
}
```

---

### Verify Payment
Check and verify payment status for an order.

```http
GET /api/v1/orders/:id/payment/verify
Authorization: Bearer <token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Payment status retrieved successfully",
  "data": {
    "payment": {
      "orderNumber": "BL240001",
      "paymentStatus": "COMPLETED",
      "paymentMethod": "PAYSTACK",
      "paymentReference": "T123456789",
      "amount": 16125,
      "currency": "NGN",
      "verificationStatus": "verified",
      "lastChecked": "2024-12-07T15:30:00Z"
    }
  }
}
```

---

### Cancel Order
Cancel an order within the allowed time window.

```http
PUT /api/v1/orders/:id/cancel
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "Changed my mind about the purchase"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "orderNumber": "BL240001",
    "status": "CANCELLED",
    "refundAmount": 16125,
    "refundMethod": "Original payment method",
    "estimatedRefundTime": "3-5 business days"
  }
}
```

**Error Responses:**

**400 Bad Request - Cannot Cancel:**
```json
{
  "success": false,
  "message": "Order cannot be cancelled at this stage",
  "code": "CANCELLATION_NOT_ALLOWED"
}
```

**422 Unprocessable Entity - Time Window Expired:**
```json
{
  "success": false,
  "message": "Cancellation window has expired (30 minutes after order)",
  "code": "CANCELLATION_WINDOW_EXPIRED"
}
```

---

### Reorder
Create a new order based on items from a previous order.

```http
POST /api/v1/orders/:id/reorder
Authorization: Bearer <token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Reorder data prepared successfully",
  "data": {
    "reorder": {
      "originalOrderNumber": "BL240001",
      "items": [
        {
          "productId": "prod_456",
          "productName": "iPhone 14 Pro",
          "quantity": 1,
          "price": 15000
        }
      ],
      "estimatedTotal": 15000,
      "message": "Items ready to be added to cart"
    }
  }
}
```

---

### Request Return
Submit a return/refund request for delivered orders.

```http
POST /api/v1/orders/:id/return
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "items": [
    {
      "productId": "prod_456",
      "quantity": 1,
      "reason": "Product defective"
    }
  ],
  "reason": "Product arrived damaged",
  "notes": "Screen has visible cracks"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Return request submitted successfully",
  "data": {
    "returnRequest": {
      "returnRequestId": "RTN-BL240001-1701950400",
      "orderNumber": "BL240001",
      "status": "PENDING",
      "reason": "Product arrived damaged",
      "notes": "Screen has visible cracks",
      "requestedItems": [
        {
          "productId": "prod_456",
          "quantity": 1,
          "reason": "Product defective"
        }
      ],
      "requestDate": "2024-12-07T15:00:00Z",
      "estimatedRefund": 15000
    }
  }
}
```

**Error Responses:**

**400 Bad Request - Order Not Eligible:**
```json
{
  "success": false,
  "message": "Only delivered orders can be returned",
  "code": "RETURN_NOT_ALLOWED"
}
```

**422 Unprocessable Entity - Return Window Expired:**
```json
{
  "success": false,
  "message": "Return window has expired (14 days from delivery)",
  "code": "RETURN_WINDOW_EXPIRED"
}
```

---

## Guest Endpoints

### Guest Order Tracking
Track orders for guest users using order number and email verification.

```http
GET /api/v1/orders/guest/track/:orderNumber?email=customer@example.com
```

**Query Parameters:**
- `email` (string, required): Customer email address for verification

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Order tracking information retrieved",
  "data": {
    "orderNumber": "BL240001",
    "status": "PROCESSING",
    "estimatedDelivery": "2024-12-10T10:00:00Z",
    "trackingNumber": "TRK-BL240001",
    "message": "Your order is being processed"
  }
}
```

**Error Responses:**

**400 Bad Request - Missing Email:**
```json
{
  "success": false,
  "message": "Email is required for guest order tracking"
}
```

**404 Not Found - Order Not Found:**
```json
{
  "success": false,
  "message": "Order not found or email does not match",
  "code": "ORDER_NOT_FOUND"
}
```

---

## Webhook Endpoints

### Payment Update Webhook
Receive payment status updates from payment providers (Paystack).

```http
POST /api/v1/orders/webhook/payment-update
Content-Type: application/json
X-Paystack-Signature: <signature>
```

**Request Body:**
```json
{
  "event": "charge.success",
  "data": {
    "id": 302961,
    "domain": "live",
    "status": "success",
    "reference": "T123456789",
    "amount": 1612500,
    "message": null,
    "gateway_response": "Successful",
    "paid_at": "2024-12-07T10:15:00Z",
    "metadata": {
      "orderId": "ord_123456789",
      "customerEmail": "john.doe@example.com"
    }
  }
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

---

### Shipping Update Webhook
Receive shipping status updates from logistics partners.

```http
POST /api/v1/orders/webhook/shipping-update
Content-Type: application/json
```

**Request Body:**
```json
{
  "trackingNumber": "TRK-BL240001",
  "status": "in_transit",
  "location": "Lagos Distribution Center",
  "estimatedDelivery": "2024-12-10T10:00:00Z",
  "timestamp": "2024-12-08T14:30:00Z"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Shipping update processed successfully"
}
```

---

## Data Models

### Order Status Enum
```typescript
enum OrderStatus {
  PENDING = "PENDING",           // Order created, awaiting payment
  CONFIRMED = "CONFIRMED",       // Payment confirmed, ready for processing
  PROCESSING = "PROCESSING",     // Order being prepared
  SHIPPED = "SHIPPED",           // Order dispatched
  DELIVERED = "DELIVERED",       // Order delivered successfully
  CANCELLED = "CANCELLED",       // Order cancelled
  REFUNDED = "REFUNDED"          // Order refunded
}
```

### Payment Status Enum
```typescript
enum PaymentStatus {
  PENDING = "PENDING",           // Payment initiated
  PROCESSING = "PROCESSING",     // Payment being processed
  COMPLETED = "COMPLETED",       // Payment successful
  FAILED = "FAILED",             // Payment failed
  CANCELLED = "CANCELLED",       // Payment cancelled
  REFUNDED = "REFUNDED"          // Payment refunded
}
```

### Payment Methods
```typescript
enum PaymentMethod {
  PAYSTACK = "PAYSTACK",         // Paystack gateway
  CARD = "CARD",                 // Direct card payment
  BANK_TRANSFER = "BANK_TRANSFER", // Bank transfer
  CASH_ON_DELIVERY = "CASH_ON_DELIVERY" // Pay on delivery
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `ORDER_NOT_FOUND` | Order does not exist or access denied |
| `CART_EMPTY` | Cannot create order with empty cart |
| `INVALID_ADDRESS` | Shipping or billing address validation failed |
| `PAYMENT_FAILED` | Payment processing failed |
| `CANCELLATION_NOT_ALLOWED` | Order cannot be cancelled at current stage |
| `CANCELLATION_WINDOW_EXPIRED` | Time window for cancellation has passed |
| `RETURN_NOT_ALLOWED` | Order is not eligible for returns |
| `RETURN_WINDOW_EXPIRED` | Return period has expired |
| `INSUFFICIENT_STOCK` | Product out of stock |
| `INVALID_COUPON` | Coupon code is invalid or expired |

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Order Creation | 10 requests | Per minute per user |
| Order Listing | 100 requests | Per minute per user |
| Guest Tracking | 20 requests | Per hour per IP |
| Webhooks | 1000 requests | Per minute per IP |

---

## Nigerian Market Specifics

### Address Validation
- **States**: All 36 Nigerian states + FCT supported
- **Phone Numbers**: Nigerian format validation (+234, 080x, 070x, 081x, 090x)
- **Cities**: Major Nigerian cities database for validation

### Currency and Pricing
- **Currency**: Nigerian Naira (NGN)
- **Tax Rate**: 7.5% VAT applied automatically
- **Pricing**: All amounts in kobo (smallest currency unit)

### Shipping Zones
- **Zone 1**: Lagos, Abuja (1-2 days, ₦1,500)
- **Zone 2**: Southwest states (2-3 days, ₦2,000)
- **Zone 3**: Other states (3-5 days, ₦2,500)

### Payment Integration
- **Primary**: Paystack for card payments, bank transfers, USSD
- **Alternative**: Bank transfer, Cash on delivery
- **Currencies**: NGN only

---

## Testing

### Test Order Numbers
- `BL999001` - Pending order
- `BL999002` - Confirmed order  
- `BL999003` - Shipped order
- `BL999004` - Delivered order
- `BL999005` - Cancelled order

### Test Email for Guest Tracking
- `test@bareloft.com` - Works with all test order numbers

### Webhook Testing
Use tools like ngrok for local webhook testing:
```bash
ngrok http 3000
# Use the HTTPS URL for webhook endpoints
```

---

## SDKs and Libraries

### JavaScript/Node.js
```javascript
const BareloftOrdersAPI = require('@bareloft/orders-sdk');

const orders = new BareloftOrdersAPI({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.bareloft.com'
});

// Create order
const order = await orders.create({
  shippingAddress: { /* address data */ },
  paymentMethod: 'PAYSTACK'
});
```

### PHP
```php
use Bareloft\OrdersAPI\Client;

$client = new Client([
    'api_key' => 'your-api-key',
    'base_url' => 'https://api.bareloft.com'
]);

$order = $client->orders()->create([
    'shippingAddress' => [/* address data */],
    'paymentMethod' => 'PAYSTACK'
]);
```

---

## Support

- **Technical Support**: api-support@bareloft.com
- **Documentation**: https://docs.bareloft.com/api/orders
- **Status Page**: https://status.bareloft.com
- **Developer Portal**: https://developers.bareloft.com

---

*Last Updated: December 7, 2024*
*API Version: v1.0*