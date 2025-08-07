# BaseAdminController - Nigerian E-commerce Features

## Overview

The BaseAdminController provides comprehensive admin functionality specifically designed for Nigerian e-commerce operations. It includes activity logging, audit trails, bulk operations, and Nigerian market-specific features.

## Key Features

### 1. Admin Activity Logging

All admin actions are automatically logged with Nigerian business context:

```typescript
// Example: User management action
this.logAdminActivity(req, 'user_management', 'get_users', {
  description: `Retrieved users list with filters: ${JSON.stringify(queryParams)}`,
  severity: 'low',
  resourceType: 'user_list',
  metadata: { queryParams, totalFilters: Object.keys(queryParams).length }
});
```

### 2. Nigerian Currency Formatting

Automatic currency formatting with Naira support:

```typescript
// Format amounts in admin responses
totalAmountFormatted: this.formatAdminCurrency(order.totalAmount / 100), // Convert from kobo
vatTotal: this.formatAdminCurrency(NigerianUtils.Ecommerce.calculateVAT(totalRevenue))
```

### 3. Enhanced Admin Authorization

Includes Nigerian business hours awareness:

```typescript
// Check admin permissions with business context
if (!this.requireAdminAuth(req, res, 'admin')) return;
```

### 4. Bulk Operations with Nigerian Compliance

Process multiple items with compliance validation:

```typescript
const bulkResult = await this.processBulkOperation(
  userIds,
  async (userId: string, index: number) => {
    // Process individual user
    return await this.userRepository.update(userId, { isActive: true });
  },
  {
    batchSize: 10,
    validateNigerianCompliance: false,
    logActivity: true,
    activityType: 'user_management'
  }
);
```

### 5. Data Export with Nigerian Standards

Export data with local compliance:

```typescript
const exportConfig: DataExportConfig = {
  format: 'csv',
  includeVAT: true,
  currency: {
    format: 'naira',
    includeSymbol: true,
    decimalPlaces: 2
  },
  timezone: 'Africa/Lagos',
  includeNigerianFields: true,
  complianceLevel: 'full'
};
```

## Activity Types

- `user_management` - User operations (create, update, delete)
- `order_management` - Order processing and fulfillment
- `inventory_management` - Stock and product management
- `financial_operations` - Revenue and payment operations
- `system_configuration` - Settings and configuration changes
- `security_operations` - Security-related actions
- `content_management` - Content and media management
- `analytics_access` - Dashboard and analytics access
- `bulk_operations` - Bulk processing operations
- `data_export` - Data export operations
- `compliance_check` - Nigerian compliance validations

## Nigerian Business Features

### Business Hours Integration

```typescript
// Automatic business hours detection
nigerianBusinessHours: NigerianUtils.Business.isBusinessHours()

// Business days calculation
businessDaysActive: NigerianUtils.Business.calculateBusinessDays(startDate, now)
```

### Currency and VAT Handling

```typescript
// VAT calculation (7.5% Nigerian rate)
vatTotal: NigerianUtils.Ecommerce.calculateVAT(totalRevenue)

// Proper Naira formatting
formatted: this.formatAdminCurrency(amount, {
  format: 'display',
  showKobo: false,
  precision: 2
})
```

### Phone Number Validation

```typescript
// Validate Nigerian phone numbers in bulk
const phoneValidation = this.validateNigerianPhoneNumbers(phoneNumbers);
// Returns: { valid: string[], invalid: string[], formatted: string[] }
```

## Enhanced Response Format

Admin responses include Nigerian business context:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "admin": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "nigerianTime": "Monday, January 15, 2024",
    "businessHours": true,
    "timezone": "Africa/Lagos",
    "activity": "user_management",
    "performance": {
      "executionTime": 150,
      "memoryUsage": 25600000,
      "databaseQueries": 3
    },
    "currency": {
      "primary": "NGN",
      "symbol": "₦",
      "koboConversion": "amount * 100",
      "vatRate": "7.5%"
    }
  }
}
```

## Security Features

### Activity Audit Trail

Every admin action is logged with:
- Admin identity and role
- IP address and user agent
- Nigerian time and business hours context
- Action severity level
- Resource type and ID
- Complete metadata

### Role-based Access Control

```typescript
// Different permission levels
this.requireAdminAuth(req, res, 'admin')        // Basic admin
this.requireAdminAuth(req, res, 'super_admin')  // Super admin only
```

### Off-hours Monitoring

Super admin actions during non-business hours are specially flagged:

```typescript
if (!isBusinessHours && minimumRole === 'super_admin') {
  this.logAdminActivity(req, 'security_operations', 'off_hours_super_admin_access', {
    severity: 'medium',
    description: 'Super admin access during non-business hours'
  });
}
```

## Performance Monitoring

Built-in performance tracking for admin operations:

```typescript
this.performanceMetrics = {
  requestStartTime: Date.now(),
  databaseQueryCount: 0,
  cacheHits: 0,
  cacheMisses: 0,
  memoryUsage: process.memoryUsage().heapUsed,
  nigerianBusinessHours: NigerianUtils.Business.isBusinessHours()
};
```

## Usage in Controllers

### Extending BaseAdminController

```typescript
import { BaseAdminController } from "../BaseAdminController";

export class AdminUserController extends BaseAdminController {
  public getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      // Authentication with admin context
      if (!this.requireAdminAuth(req, res, 'admin')) return;

      // Enhanced logging
      this.logAdminActivity(req, 'user_management', 'get_users', {
        description: 'Retrieved users list',
        severity: 'low',
        resourceType: 'user_list'
      });

      // ... business logic ...

      // Enhanced admin response
      this.sendAdminSuccess(res, data, 'Users retrieved successfully', 200, {
        activity: 'user_management',
        includeMetrics: true,
        includeCurrencyInfo: true
      });
    } catch (error) {
      this.handleError(error, req, res);
    }
  };
}
```

This BaseAdminController provides a solid foundation for all Nigerian e-commerce admin operations with comprehensive logging, security, and local market features.