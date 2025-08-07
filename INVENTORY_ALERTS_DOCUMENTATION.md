# Phase 2.2: Inventory Alerts and Automated Reordering System

## Overview

The enhanced inventory management system provides intelligent stock monitoring, multi-level alerts, and automated reordering capabilities optimized for Nigerian e-commerce operations. This system proactively manages inventory levels and automates procurement processes to ensure optimal stock availability.

## 🚀 Key Features

### 1. Multi-Level Alert System
- **Real-time monitoring** of inventory levels against configurable thresholds
- **Six severity levels**: Info, Low, Medium, High, Critical, Urgent
- **Nine alert types**: Low Stock, Out of Stock, Critical Stock, Reorder Needed, Slow Moving, Fast Moving, Overstock, Negative Stock, Reservation Expired
- **Intelligent alert aggregation** to prevent notification spam
- **Business hours compliance** for alert timing

### 2. Alert Management
- **Configurable alert preferences** per admin user
- **Acknowledgment and dismissal** tracking
- **Alert history and trends** analysis
- **Test notification system** for configuration validation
- **Nigerian business context** integration

### 3. Automated Reordering System
- **AI-powered reorder suggestions** based on sales velocity
- **Supplier integration framework** with local supplier preference
- **Reorder workflow management** with approval processes
- **Economic Order Quantity (EOQ)** calculations
- **Lead time optimization** for Nigerian supply chains

### 4. Nigerian Market Optimization
- **Lagos timezone** support (Africa/Lagos)
- **Nigerian business hours** (8 AM - 6 PM weekdays)
- **Local supplier prioritization**
- **Import/customs consideration** for international suppliers
- **WhatsApp integration** for business communications
- **Nigerian phone number validation** (+234 format)
- **Naira currency** calculations and formatting

## 📋 API Endpoints

### Alert Management

#### GET /api/admin/inventory/alerts
View all active alerts with filtering and pagination.

**Query Parameters:**
- `severity`: Filter by alert severity (info, low, medium, high, critical, urgent)
- `type`: Filter by alert type (LOW_STOCK, OUT_OF_STOCK, etc.)
- `productId`: Filter alerts for specific product
- `categoryId`: Filter alerts for specific category
- `isRead`, `isAcknowledged`, `isDismissed`: Filter by status
- `startDate`, `endDate`: Filter by date range
- `page`, `limit`: Pagination controls

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "alert_123",
        "type": "LOW_STOCK",
        "severity": "high",
        "productId": "prod_123",
        "productName": "Samsung Galaxy S23 Ultra",
        "currentStock": 3,
        "threshold": 10,
        "message": "Low stock alert: Samsung Galaxy S23 Ultra - Current stock: 3, Threshold: 10",
        "isRead": false,
        "isAcknowledged": false,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    },
    "summary": {
      "total": 45,
      "unread": 12,
      "acknowledged": 20,
      "dismissed": 8,
      "bySeverity": {
        "critical": 3,
        "high": 8,
        "medium": 15,
        "low": 12,
        "urgent": 2,
        "info": 5
      }
    }
  }
}
```

#### POST /api/admin/inventory/alerts/configure
Configure alert thresholds and notification preferences.

**Request Body:**
```json
{
  "name": "Nigerian E-commerce Alert Config",
  "description": "Optimized for Nigerian business hours",
  "lowStockEnabled": true,
  "lowStockThreshold": 15,
  "criticalStockEnabled": true,
  "criticalStockThreshold": 5,
  "outOfStockEnabled": true,
  "reorderNeededEnabled": true,
  "emailEnabled": true,
  "emailAddress": "inventory@bareloft.com",
  "smsEnabled": true,
  "phoneNumber": "+234801234567",
  "respectBusinessHours": true,
  "businessHoursStart": "08:00",
  "businessHoursEnd": "18:00",
  "businessDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
  "timezone": "Africa/Lagos",
  "maxAlertsPerHour": 5,
  "maxAlertsPerDay": 20
}
```

#### PUT /api/admin/inventory/alerts/:alertId
Update alert status (acknowledge, dismiss, read).

**Request Body:**
```json
{
  "action": "acknowledge",
  "notes": "Will reorder from Lagos Electronics Hub tomorrow"
}
```

#### POST /api/admin/inventory/alerts/test
Test alert notification configuration.

**Request Body:**
```json
{
  "configurationId": "config_123",
  "alertType": "LOW_STOCK",
  "productId": "prod_123"
}
```

### Reorder Management

#### GET /api/admin/inventory/reorder-suggestions
Get AI-powered reorder recommendations.

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "id": "suggestion_123",
        "productId": "prod_123",
        "productName": "Samsung Galaxy S23 Ultra",
        "currentStock": 3,
        "suggestedQuantity": 25,
        "estimatedCost": 23750000,
        "currency": "NGN",
        "averageDailySales": 1.2,
        "daysOfStockLeft": 2,
        "leadTimeDays": 7,
        "supplierName": "Lagos Electronics Hub",
        "importRequired": false,
        "localSupplierAvailable": true,
        "businessDaysToReorder": 1,
        "priority": "critical",
        "reason": "Stock will run out in 2 days"
      }
    ],
    "summary": {
      "totalSuggestions": 8,
      "pendingApproval": 3,
      "urgent": 2,
      "estimatedTotalCost": 45600000
    }
  }
}
```

#### POST /api/admin/inventory/reorder/:productId
Create reorder request.

**Request Body:**
```json
{
  "supplierId": "supplier_123",
  "quantity": 25,
  "unitCost": 950000,
  "expectedDeliveryDate": "2024-01-22T00:00:00Z",
  "requiresImport": false,
  "notes": "Urgent reorder for popular product"
}
```

#### GET /api/admin/inventory/pending-reorders
View pending reorder requests.

**Response:**
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "request_123",
        "productId": "prod_123",
        "supplierId": "supplier_123",
        "quantity": 25,
        "unitCost": 950000,
        "totalCost": 23750000,
        "currency": "NGN",
        "status": "pending_approval",
        "requiresImport": false,
        "requestedBy": "admin_123",
        "createdAt": "2024-01-15T14:30:00Z"
      }
    ],
    "summary": {
      "totalRequests": 12,
      "totalValue": 89500000,
      "urgent": 3,
      "requiresImport": 2
    }
  }
}
```

#### PUT /api/admin/inventory/reorder/:orderId
Approve/modify reorder requests.

**Request Body:**
```json
{
  "action": "approve",
  "notes": "Approved - proceed with purchase order"
}
```

### Supplier Management

#### GET /api/admin/inventory/suppliers
Get supplier list with Nigerian business context.

**Response:**
```json
{
  "success": true,
  "data": {
    "suppliers": [
      {
        "id": "supplier_123",
        "name": "Lagos Electronics Hub",
        "contactPerson": "Adebayo Johnson",
        "phone": "+234803456789",
        "whatsapp": "+234803456789",
        "isLocal": true,
        "businessType": "distributor",
        "cacNumber": "RC123456",
        "currency": "NGN",
        "averageLeadTimeDays": 3,
        "paymentTerms": "Net 30 days"
      }
    ]
  }
}
```

#### POST /api/admin/inventory/suppliers
Create new supplier with Nigerian business details.

**Request Body:**
```json
{
  "name": "Aba Manufacturing Co.",
  "contactPerson": "Chioma Okafor",
  "phone": "+234703456789",
  "whatsapp": "+234703456789",
  "address": {
    "street": "Industrial Layout, Aba",
    "city": "Aba",
    "state": "Abia",
    "country": "Nigeria"
  },
  "isLocal": true,
  "businessType": "manufacturer",
  "cacNumber": "RC789012",
  "currency": "NGN",
  "averageLeadTimeDays": 14
}
```

## 🏗️ Architecture Components

### Services

#### InventoryAlertService
- **Alert generation** and monitoring
- **Configuration management**
- **Notification triggering**
- **Alert lifecycle management**

#### ReorderService
- **Reorder suggestion engine**
- **Supplier management**
- **Request workflow processing**
- **Nigerian business logic**

#### NotificationService (Enhanced)
- **Multi-channel notifications** (Email, SMS, Push, WhatsApp)
- **Nigerian phone number handling**
- **Business hours compliance**
- **Template management**

### Data Models

#### InventoryAlert
```typescript
interface InventoryAlert {
  id: string;
  type: StockAlert;
  severity: AlertSeverity;
  productId: string;
  productName: string;
  currentStock: number;
  threshold?: number;
  message: string;
  isRead: boolean;
  isAcknowledged: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### ReorderSuggestion
```typescript
interface ReorderSuggestion {
  id: string;
  productId: string;
  suggestedQuantity: number;
  estimatedCost: number;
  averageDailySales: number;
  daysOfStockLeft: number;
  leadTimeDays: number;
  importRequired: boolean;
  localSupplierAvailable: boolean;
  businessDaysToReorder: number;
  status: ReorderStatus;
  priority: AlertSeverity;
}
```

#### Supplier
```typescript
interface Supplier {
  id: string;
  name: string;
  isLocal: boolean; // Nigerian supplier
  businessType: "manufacturer" | "distributor" | "importer" | "wholesaler";
  cacNumber?: string; // Nigerian CAC registration
  whatsapp?: string; // WhatsApp for business
  currency: string; // "NGN"
  averageLeadTimeDays: number;
}
```

## 🇳🇬 Nigerian Business Features

### Local Supplier Optimization
- **Priority for Nigerian suppliers** in reorder suggestions
- **Reduced lead times** for local sourcing
- **No import duties** consideration for local purchases
- **Nigerian business registration** tracking (CAC numbers)

### Business Hours Integration
- **Lagos timezone** (Africa/Lagos) support
- **Nigerian working days** (Monday-Friday) configuration
- **Alert timing** respects business hours
- **Weekend and holiday** consideration

### Communication Preferences
- **WhatsApp integration** for supplier communications
- **Nigerian phone format** validation (+234 prefix)
- **Local language** support for notifications
- **Cultural business practices** consideration

### Financial Optimization
- **Naira currency** calculations
- **Nigerian payment terms** (Net 30/45/60 days)
- **Local banking** integration readiness
- **Tax and duty** calculations for imports

## 📊 Monitoring and Analytics

### Alert Analytics
- **Alert frequency** trends
- **Resolution time** tracking
- **Product-specific** alert patterns
- **Seasonal** alert variations

### Reorder Analytics
- **Order completion rates**
- **Supplier performance** metrics
- **Cost optimization** tracking
- **Lead time** analysis

### Nigerian Market Insights
- **Local vs import** sourcing ratios
- **Business days** impact analysis
- **Seasonal demand** patterns
- **Supplier relationship** health

## 🔧 Configuration Examples

### Alert Configuration for Nigerian E-commerce
```json
{
  "name": "Bareloft Standard Configuration",
  "timezone": "Africa/Lagos",
  "businessHoursStart": "08:00",
  "businessHoursEnd": "18:00",
  "businessDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
  "lowStockThreshold": 15,
  "criticalStockThreshold": 5,
  "maxAlertsPerDay": 20,
  "emailAddress": "inventory@bareloft.com",
  "phoneNumber": "+234801234567",
  "respectBusinessHours": true
}
```

### Supplier Configuration for Local Partner
```json
{
  "name": "Computer Village Electronics",
  "isLocal": true,
  "businessType": "distributor",
  "cacNumber": "RC123456",
  "phone": "+234803123456",
  "whatsapp": "+234803123456",
  "averageLeadTimeDays": 2,
  "paymentTerms": "Net 30 days",
  "currency": "NGN",
  "address": {
    "city": "Lagos",
    "state": "Lagos",
    "country": "Nigeria"
  }
}
```

## 🧪 Testing

The system includes comprehensive tests covering:
- **Multi-level alert generation**
- **Nigerian business hour compliance**
- **Reorder workflow processes**
- **Supplier management**
- **Phone number validation**
- **Currency calculations**
- **Integration scenarios**

Run tests with:
```bash
npm test src/tests/inventory-alerts.test.ts
```

## 🚀 Deployment Considerations

### Environment Variables
```env
# Nigerian Business Configuration
BUSINESS_TIMEZONE=Africa/Lagos
BUSINESS_HOURS_START=08:00
BUSINESS_HOURS_END=18:00
DEFAULT_CURRENCY=NGN

# Notification Configuration
ADMIN_EMAIL=inventory@bareloft.com
ADMIN_PHONE=+234801234567
WHATSAPP_BUSINESS_API_KEY=your_whatsapp_key

# Alert Configuration
MAX_ALERTS_PER_HOUR=5
MAX_ALERTS_PER_DAY=20
DEFAULT_LOW_STOCK_THRESHOLD=10
CRITICAL_STOCK_THRESHOLD=5
```

### Cron Job Setup
```bash
# Monitor inventory levels every 15 minutes during business hours
*/15 8-18 * * 1-5 curl -X POST http://localhost:3000/api/admin/inventory/alerts/monitor

# Generate reorder suggestions daily at 9 AM
0 9 * * 1-5 curl -X POST http://localhost:3000/api/admin/inventory/reorder-suggestions/generate

# Process scheduled notifications every 5 minutes
*/5 * * * * curl -X POST http://localhost:3000/api/notifications/process-scheduled
```

## 📈 Performance Optimization

### Caching Strategy
- **Alert configurations** cached for 24 hours
- **Supplier data** cached for 1 hour
- **Reorder suggestions** cached for 30 minutes
- **Inventory snapshots** cached for 15 minutes

### Database Optimization
- **Indexed queries** on product stock levels
- **Partitioned notifications** table by date
- **Optimized joins** for inventory movements
- **Automated cleanup** of old alert records

## 🔐 Security Considerations

### Access Control
- **Admin-only endpoints** for alert configuration
- **Role-based permissions** for reorder approvals
- **Audit logging** for all inventory changes
- **Encrypted communication** with suppliers

### Data Protection
- **Sensitive supplier data** encryption
- **Nigerian data compliance** considerations
- **PII protection** in notifications
- **Secure API key** management

## 📚 Integration Points

### External Systems
- **Paystack** for supplier payments
- **Nigerian logistics** providers
- **WhatsApp Business API** for communications
- **Local banking** systems

### Internal Systems
- **Existing inventory** management
- **Order processing** system
- **User management** and authentication
- **Notification** infrastructure

This comprehensive system provides intelligent inventory management optimized for Nigerian e-commerce operations, ensuring optimal stock levels while respecting local business practices and preferences.