# 📚 Complete API Documentation for Frontend Integration

## **🎯 Overview**
This document provides comprehensive API documentation for the Nigerian e-commerce admin system, including all endpoints, authentication, request/response formats, and integration examples for frontend development.

---

## **🔐 Authentication**

### **JWT Authentication**
All admin endpoints require JWT authentication with proper role-based access.

```typescript
// Headers required for all admin API calls
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
```

### **Authentication Endpoints**
```typescript
POST /api/v1/auth/login
POST /api/v1/auth/register
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

### **Role-Based Access**
- `CUSTOMER`: Customer-facing endpoints only
- `ADMIN`: Full admin access except super admin operations
- `SUPER_ADMIN`: All operations including financial and system management

---

# **🏗️ PHASE 1: ADMIN FOUNDATION API**

## **Admin Dashboard Endpoints**

### **📊 Dashboard Overview**
```typescript
GET /api/admin/dashboard/overview
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": {
    "metrics": {
      "totalRevenue": "₦2,450,000.00",
      "totalOrders": 1234,
      "activeUsers": 5678,
      "lowStockAlerts": 12
    },
    "charts": {
      "revenueChart": [...],
      "ordersChart": [...],
      "inventoryChart": [...]
    },
    "nigerianContext": {
      "currentTime": "2025-08-07 15:30:00 WAT",
      "businessHours": "09:00 - 18:00",
      "isBusinessDay": true
    }
  }
}
```

### **📈 Sales Analytics**
```typescript
GET /api/admin/dashboard/sales?period=30d&state=Lagos
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": {
    "totalRevenue": "₦1,250,000.00",
    "orderCount": 456,
    "averageOrderValue": "₦2,739.02",
    "paymentMethods": {
      "card": 45,
      "bankTransfer": 35,
      "ussd": 20
    },
    "stateBreakdown": {
      "Lagos": "₦875,000.00",
      "Abuja": "₦250,000.00",
      "Kano": "₦125,000.00"
    }
  }
}
```

### **🏪 Inventory Dashboard**
```typescript
GET /api/admin/dashboard/inventory
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": {
    "totalValue": "₦15,750,000.00",
    "lowStockItems": 23,
    "outOfStockItems": 8,
    "alerts": [
      {
        "id": "alert_001",
        "type": "LOW_STOCK",
        "productName": "Samsung Galaxy A54",
        "currentStock": 5,
        "threshold": 10,
        "priority": "high"
      }
    ]
  }
}
```

---

# **🏗️ PHASE 2: INVENTORY MANAGEMENT API**

## **Core Inventory Endpoints**

### **📦 List Inventory**
```typescript
GET /api/admin/inventory?page=1&limit=20&filter=low_stock
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "prod_001",
      "name": "Samsung Galaxy A54",
      "sku": "SGA54-001",
      "stock": 15,
      "lowStockThreshold": 10,
      "price": "₦350,000.00",
      "category": "Electronics",
      "status": "NORMAL",
      "lastUpdated": "2025-08-07T14:30:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 100,
    "itemsPerPage": 20
  }
}
```

### **✏️ Update Stock**
```typescript
PUT /api/admin/inventory/prod_001
Authorization: Bearer <admin_token>
Content-Type: application/json

Request:
{
  "stock": 25,
  "lowStockThreshold": 8,
  "reason": "Manual adjustment after stocktake"
}

Response:
{
  "success": true,
  "message": "Stock updated successfully",
  "data": {
    "id": "prod_001",
    "previousStock": 15,
    "newStock": 25,
    "adjustment": 10,
    "updatedAt": "2025-08-07T14:35:00Z"
  }
}
```

### **📊 Bulk Stock Update**
```typescript
POST /api/admin/inventory/bulk-update
Authorization: Bearer <admin_token>
Content-Type: application/json

Request:
{
  "updates": [
    {
      "productId": "prod_001",
      "stock": 30,
      "reason": "Restock from supplier"
    },
    {
      "productId": "prod_002", 
      "stock": 0,
      "reason": "Discontinued item"
    }
  ]
}

Response:
{
  "success": true,
  "message": "Bulk update completed",
  "data": {
    "processed": 2,
    "successful": 2,
    "failed": 0,
    "results": [...]
  }
}
```

## **Inventory Alerts & Reordering**

### **🚨 Get Alerts**
```typescript
GET /api/admin/inventory/alerts?severity=high&status=active
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "alert_001",
      "type": "LOW_STOCK",
      "severity": "HIGH",
      "productId": "prod_001",
      "productName": "Samsung Galaxy A54",
      "currentStock": 5,
      "threshold": 10,
      "message": "Stock below threshold - reorder recommended",
      "createdAt": "2025-08-07T10:00:00Z",
      "estimatedStockoutDate": "2025-08-09T00:00:00Z"
    }
  ]
}
```

### **🔄 Reorder Suggestions**
```typescript
GET /api/admin/inventory/reorder-suggestions
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": [
    {
      "productId": "prod_001",
      "productName": "Samsung Galaxy A54",
      "currentStock": 5,
      "recommendedOrder": 50,
      "supplier": "Tech Distributors Ltd",
      "leadTimeDays": 7,
      "estimatedCost": "₦15,000,000.00",
      "priority": "urgent"
    }
  ]
}
```

## **Inventory Analytics**

### **📈 Inventory Analytics**
```typescript
GET /api/admin/inventory/analytics/overview?period=30d
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": {
    "totalValue": "₦45,750,000.00",
    "turnoverRate": 2.3,
    "topMovers": [
      {
        "productId": "prod_001",
        "name": "Samsung Galaxy A54",
        "salesVelocity": 15,
        "revenue": "₦5,250,000.00"
      }
    ],
    "categoryBreakdown": {
      "Electronics": "₦30,000,000.00",
      "Fashion": "₦10,000,000.00",
      "Home": "₦5,750,000.00"
    }
  }
}
```

---

# **🏗️ PHASE 3: ORDER FULFILLMENT API**

## **Order Management**

### **📋 List Orders**
```typescript
GET /api/admin/orders?status=PENDING&state=Lagos&page=1&limit=20
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "order_001",
      "orderNumber": "BL250807001",
      "customerId": "user_001",
      "customerName": "Adebayo Johnson",
      "customerPhone": "+234 801 234 5678",
      "status": "PENDING",
      "paymentStatus": "PAID",
      "total": "₦125,500.00",
      "items": [
        {
          "productId": "prod_001",
          "name": "Samsung Galaxy A54",
          "quantity": 1,
          "price": "₦350,000.00"
        }
      ],
      "shippingAddress": {
        "state": "Lagos",
        "city": "Ikeja",
        "address": "123 Allen Avenue, Ikeja"
      },
      "createdAt": "2025-08-07T10:30:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 200
  }
}
```

### **✏️ Update Order Status**
```typescript
PUT /api/admin/orders/order_001/status
Authorization: Bearer <admin_token>
Content-Type: application/json

Request:
{
  "status": "PROCESSING",
  "notes": "Order packed and ready for shipping"
}

Response:
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "orderId": "order_001",
    "previousStatus": "PENDING",
    "newStatus": "PROCESSING",
    "updatedAt": "2025-08-07T15:00:00Z",
    "timeline": [...]
  }
}
```

### **📦 Bulk Order Processing**
```typescript
POST /api/admin/orders/bulk/status-update
Authorization: Bearer <admin_token>
Content-Type: application/json

Request:
{
  "orderIds": ["order_001", "order_002", "order_003"],
  "status": "SHIPPED",
  "notes": "Lagos batch shipment - DHL tracking provided"
}

Response:
{
  "success": true,
  "message": "Bulk status update completed",
  "data": {
    "processed": 3,
    "successful": 3,
    "failed": 0,
    "jobId": "bulk_001"
  }
}
```

## **Shipping Management**

### **🚚 List Carriers**
```typescript
GET /api/admin/shipping/carriers
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "jumia_logistics",
      "name": "Jumia Logistics",
      "isActive": true,
      "coverage": ["Lagos", "Abuja", "Port Harcourt", "Kano"],
      "services": ["standard", "express", "same_day"],
      "rates": {
        "Lagos": "₦1,500.00",
        "Abuja": "₦2,500.00",
        "Others": "₦3,000.00"
      }
    }
  ]
}
```

### **📍 Track Shipment**
```typescript
GET /api/admin/shipping/tracking/BL250807001-TRACK
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": {
    "trackingNumber": "BL250807001-TRACK",
    "status": "IN_TRANSIT",
    "carrier": "Jumia Logistics",
    "estimatedDelivery": "2025-08-09T16:00:00Z",
    "currentLocation": "Lagos Sort Facility",
    "events": [
      {
        "timestamp": "2025-08-07T14:00:00Z",
        "status": "PICKED_UP",
        "location": "Lagos Warehouse",
        "description": "Package picked up from seller"
      },
      {
        "timestamp": "2025-08-07T16:30:00Z",
        "status": "IN_TRANSIT",
        "location": "Lagos Sort Facility", 
        "description": "Package sorted and in transit"
      }
    ]
  }
}
```

---

# **🏗️ PHASE 4: CUSTOMER SERVICE API**

## **Returns Management**

### **📋 List Returns**
```typescript
GET /api/admin/returns?status=PENDING&page=1&limit=20
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "return_001",
      "returnNumber": "RET250807001",
      "orderId": "order_001",
      "customerId": "user_001",
      "customerName": "Adebayo Johnson",
      "status": "PENDING",
      "reason": "DEFECTIVE",
      "items": [
        {
          "productId": "prod_001",
          "name": "Samsung Galaxy A54",
          "quantity": 1,
          "condition": "DAMAGED"
        }
      ],
      "refundAmount": "₦350,000.00",
      "createdAt": "2025-08-07T12:00:00Z"
    }
  ]
}
```

### **✅ Approve Return**
```typescript
POST /api/admin/returns/return_001/approve
Authorization: Bearer <admin_token>
Content-Type: application/json

Request:
{
  "refundMethod": "ORIGINAL_PAYMENT",
  "notes": "Return approved - item confirmed defective",
  "pickupScheduled": true
}

Response:
{
  "success": true,
  "message": "Return approved successfully",
  "data": {
    "returnId": "return_001",
    "status": "APPROVED",
    "refundId": "refund_001",
    "pickupReference": "PICKUP_001",
    "estimatedRefund": "2-3 business days"
  }
}
```

### **💰 Process Refund**
```typescript
POST /api/admin/refunds/process
Authorization: Bearer <super_admin_token>
Content-Type: application/json

Request:
{
  "orderId": "order_001",
  "amount": 350000, // in kobo
  "refundMethod": "BANK_TRANSFER",
  "reason": "Product defective",
  "bankAccountDetails": {
    "accountNumber": "0123456789",
    "accountName": "Adebayo Johnson",
    "bankName": "Guaranty Trust Bank",
    "bankCode": "058"
  }
}

Response:
{
  "success": true,
  "message": "Refund processed successfully",
  "data": {
    "refundId": "refund_001",
    "amount": "₦350,000.00",
    "reference": "REF250807001",
    "estimatedCompletion": "2025-08-09T16:00:00Z"
  }
}
```

## **Support Tickets**

### **🎫 List Support Tickets**
```typescript
GET /api/admin/support/tickets?priority=high&status=open&page=1
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "ticket_001",
      "ticketNumber": "SUP250807001",
      "customerId": "user_001",
      "customerName": "Adebayo Johnson",
      "subject": "Payment not reflecting after bank transfer",
      "category": "PAYMENT_ISSUES",
      "priority": "HIGH",
      "status": "OPEN",
      "assignedAgent": "agent_001",
      "createdAt": "2025-08-07T09:15:00Z",
      "lastReply": "2025-08-07T14:30:00Z",
      "messageCount": 3
    }
  ]
}
```

### **💬 Reply to Ticket**
```typescript
POST /api/admin/support/tickets/ticket_001/reply
Authorization: Bearer <admin_token>
Content-Type: application/json

Request:
{
  "message": "Hello Adebayo, I've checked your payment and it has been confirmed. Your order will be processed shortly. Reference: GTB240807001",
  "channel": "EMAIL",
  "isInternal": false,
  "attachments": []
}

Response:
{
  "success": true,
  "message": "Reply sent successfully",
  "data": {
    "messageId": "msg_001",
    "ticketId": "ticket_001",
    "sentAt": "2025-08-07T15:45:00Z",
    "notificationSent": true
  }
}
```

## **Customer-Facing Returns API**

### **📝 Submit Return Request (Customer)**
```typescript
POST /api/v1/returns/request
Authorization: Bearer <customer_token>
Content-Type: application/json

Request:
{
  "orderId": "order_001",
  "items": [
    {
      "productId": "prod_001",
      "quantity": 1,
      "reason": "DEFECTIVE",
      "condition": "DAMAGED",
      "description": "Screen has dead pixels"
    }
  ],
  "returnMethod": "PICKUP",
  "photos": ["photo1.jpg", "photo2.jpg"]
}

Response:
{
  "success": true,
  "message": "Return request submitted successfully",
  "data": {
    "returnId": "return_001",
    "returnNumber": "RET250807001",
    "status": "PENDING",
    "estimatedProcessingTime": "2-3 business days",
    "pickupScheduled": true
  }
}
```

### **👁️ Track Return (Customer)**
```typescript
GET /api/v1/returns/return_001
Authorization: Bearer <customer_token>

Response:
{
  "success": true,
  "data": {
    "id": "return_001",
    "returnNumber": "RET250807001",
    "status": "IN_REVIEW",
    "progress": 60,
    "timeline": [
      {
        "status": "SUBMITTED",
        "timestamp": "2025-08-07T12:00:00Z",
        "description": "Return request submitted"
      },
      {
        "status": "APPROVED",
        "timestamp": "2025-08-07T14:30:00Z", 
        "description": "Return request approved - pickup scheduled"
      },
      {
        "status": "IN_REVIEW",
        "timestamp": "2025-08-07T16:00:00Z",
        "description": "Item received and under quality inspection"
      }
    ],
    "estimatedRefund": "₦350,000.00",
    "refundMethod": "ORIGINAL_PAYMENT"
  }
}
```

---

# **📱 Frontend Integration Examples**

## **React/Next.js Integration**

### **Authentication Hook**
```typescript
// hooks/useAuth.ts
import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const login = async (credentials: LoginData) => {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    
    const data = await response.json();
    if (data.success) {
      setToken(data.tokens.accessToken);
      setUser(data.user);
      localStorage.setItem('token', data.tokens.accessToken);
    }
  };

  return { token, user, login };
};
```

### **API Service Class**
```typescript
// services/api.ts
class AdminAPI {
  private baseURL = process.env.NEXT_PUBLIC_API_URL;
  private token = localStorage.getItem('token');

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    return response.json();
  }

  // Dashboard Methods
  async getDashboardOverview() {
    return this.request('/api/admin/dashboard/overview');
  }

  // Inventory Methods
  async getInventory(params?: InventoryParams) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/api/admin/inventory?${query}`);
  }

  async updateStock(productId: string, data: StockUpdateData) {
    return this.request(`/api/admin/inventory/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Order Methods
  async getOrders(params?: OrderParams) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/api/admin/orders?${query}`);
  }

  async updateOrderStatus(orderId: string, status: string, notes?: string) {
    return this.request(`/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  }
}

export const adminAPI = new AdminAPI();
```

### **Dashboard Component Example**
```typescript
// components/AdminDashboard.tsx
import React, { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';

interface DashboardData {
  metrics: {
    totalRevenue: string;
    totalOrders: number;
    activeUsers: number;
    lowStockAlerts: number;
  };
}

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await adminAPI.getDashboardOverview();
        if (response.success) {
          setData(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total Revenue</h3>
          <p className="metric-value">{data?.metrics.totalRevenue}</p>
        </div>
        <div className="metric-card">
          <h3>Total Orders</h3>
          <p className="metric-value">{data?.metrics.totalOrders}</p>
        </div>
        <div className="metric-card">
          <h3>Active Users</h3>
          <p className="metric-value">{data?.metrics.activeUsers}</p>
        </div>
        <div className="metric-card alert">
          <h3>Low Stock Alerts</h3>
          <p className="metric-value">{data?.metrics.lowStockAlerts}</p>
        </div>
      </div>
    </div>
  );
};
```

## **Vue.js Integration**

### **Composable for API Calls**
```typescript
// composables/useAdmin.ts
import { ref, reactive } from 'vue';

export const useAdmin = () => {
  const loading = ref(false);
  const error = ref<string | null>(null);

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      return data;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    apiCall,
  };
};
```

---

# **🔄 WebSocket Integration**

## **Real-time Updates**
```typescript
// Real-time inventory alerts
const ws = new WebSocket('ws://localhost:3000/admin/inventory/alerts');

ws.onmessage = (event) => {
  const alertData = JSON.parse(event.data);
  
  if (alertData.type === 'LOW_STOCK_ALERT') {
    showNotification({
      title: 'Low Stock Alert',
      message: `${alertData.productName} is running low (${alertData.currentStock} remaining)`,
      type: 'warning'
    });
  }
};

// Real-time order updates
const orderWs = new WebSocket('ws://localhost:3000/admin/orders/updates');

orderWs.onmessage = (event) => {
  const orderUpdate = JSON.parse(event.data);
  
  // Update order list in real-time
  updateOrderInState(orderUpdate.orderId, orderUpdate.status);
};
```

---

# **🚀 Deployment Configuration**

## **Environment Variables**
```bash
# .env.production
NEXT_PUBLIC_API_URL=https://api.bareloft.com
NEXT_PUBLIC_WS_URL=wss://api.bareloft.com

# Admin specific
ADMIN_SESSION_TIMEOUT=3600000
MAX_UPLOAD_SIZE=10485760
SUPPORTED_FILE_TYPES=image/jpeg,image/png,image/webp

# Nigerian specific
DEFAULT_CURRENCY=NGN
DEFAULT_TIMEZONE=Africa/Lagos
BUSINESS_HOURS_START=09:00
BUSINESS_HOURS_END=18:00
```

## **TypeScript Definitions**
```typescript
// types/admin.ts
export interface AdminUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  permissions: string[];
  profile: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
  price: string; // Formatted as "₦350,000.00"
  category: string;
  status: 'NORMAL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'CRITICAL';
  lastUpdated: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: string;
  items: OrderItem[];
  shippingAddress: Address;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerId: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedAgent?: string;
  createdAt: string;
  lastReply: string;
  messageCount: number;
}
```

---

# **📋 Testing Examples**

## **Jest API Tests**
```typescript
// __tests__/api/admin.test.ts
import { adminAPI } from '../services/api';

describe('Admin API', () => {
  beforeAll(() => {
    // Set up test token
    localStorage.setItem('token', 'test-admin-token');
  });

  test('should fetch dashboard overview', async () => {
    const data = await adminAPI.getDashboardOverview();
    
    expect(data.success).toBe(true);
    expect(data.data.metrics).toBeDefined();
    expect(data.data.metrics.totalRevenue).toMatch(/₦[\d,]+\.00/);
  });

  test('should update inventory stock', async () => {
    const updateData = {
      stock: 25,
      reason: 'Test update'
    };
    
    const result = await adminAPI.updateStock('prod_001', updateData);
    
    expect(result.success).toBe(true);
    expect(result.data.newStock).toBe(25);
  });
});
```

---

# **🎯 Summary**

This comprehensive API documentation provides:

1. **Complete endpoint coverage** for all 4 phases
2. **Authentication examples** with JWT tokens
3. **Request/response formats** with Nigerian currency formatting
4. **Frontend integration examples** for React/Vue.js
5. **TypeScript definitions** for type safety
6. **Real-time WebSocket integration** for live updates
7. **Error handling patterns** and best practices
8. **Testing examples** for quality assurance

The API is production-ready and optimized for Nigerian e-commerce operations with proper currency formatting, business hours consideration, and local market features.

**Ready for frontend integration!** 🚀