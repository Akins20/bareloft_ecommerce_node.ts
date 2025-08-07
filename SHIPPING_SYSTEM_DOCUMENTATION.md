# Nigerian Shipping and Tracking System Documentation

## Overview

This document provides comprehensive documentation for the **Phase 3.3: Shipping Tracking and Carrier Integration** implementation for the Bareloft Nigerian e-commerce platform. The system integrates with major Nigerian logistics providers including **Jumia Logistics** and **local carriers** to provide seamless shipping and tracking capabilities.

## 🚚 System Architecture

### Core Components

1. **Database Models** - Extended schema for shipping management
2. **Carrier Services** - API integrations with Nigerian logistics providers
3. **Shipping Management** - Orchestration and optimization layer
4. **Analytics Engine** - Performance monitoring and insights
5. **Admin API** - Comprehensive management interface
6. **Order Integration** - Seamless fulfillment workflow

### Technology Stack

- **Database**: PostgreSQL with Prisma ORM
- **API Integration**: Axios HTTP client with carrier-specific adapters
- **Analytics**: Real-time performance tracking and reporting
- **Authentication**: JWT-based admin access control
- **Validation**: Express-validator with Nigerian market rules
- **Testing**: Jest with comprehensive scenario coverage

## 📊 Database Schema Extensions

### New Models Added

#### ShippingCarrier
```prisma
model ShippingCarrier {
  id                String              @id @default(cuid())
  name              String              @unique // "Jumia Logistics", "Swift Local Delivery"
  code              String              @unique // "JUMIA_NG", "SLD_NG"
  type              String              // "express", "standard", "economy"
  status            ShippingCarrierStatus @default(ACTIVE)
  supportedServices Json?               // Array of service types
  coverageAreas     Json?               // Nigerian states/cities covered
  businessHours     Json?               // Operating hours
  deliveryTimeframes Json?              // Delivery timeframes by zone
  contactInfo       Json?               // Contact information
  isDefault         Boolean             @default(false)
  
  // Relations
  shipments         Shipment[]
  shippingRates     ShippingRate[]
}
```

#### Shipment
```prisma
model Shipment {
  id                  String         @id @default(cuid())
  trackingNumber      String         @unique
  orderId             String         @unique
  order               Order          @relation(fields: [orderId], references: [id])
  carrierId           String
  carrier             ShippingCarrier @relation(fields: [carrierId], references: [id])
  status              ShipmentStatus @default(PENDING)
  originAddress       Json           // Warehouse/pickup address
  destinationAddress  Json           // Customer delivery address
  packageWeight       Decimal        @db.Decimal(8, 2)
  packageDimensions   Json           // length, width, height in cm
  declaredValue       Decimal        @db.Decimal(10, 2)
  shippingCost        Decimal        @db.Decimal(8, 2)
  estimatedDelivery   DateTime?
  actualDelivery      DateTime?
  
  // Relations
  trackingEvents      TrackingEvent[]
  deliveryAttempts    DeliveryAttempt[]
}
```

#### Nigerian Shipping Zones
```prisma
model ShippingZone {
  id              String   @id @default(cuid())
  name            String   // "Lagos Metropolitan", "Southwest Region"
  states          Json     // Array of Nigerian states
  cities          Json?    // Specific cities if applicable
  baseRate        Decimal  @db.Decimal(8, 2)
  weightMultiplier Decimal @db.Decimal(4, 2) @default(1.0)
  deliveryDays    Int      @default(3)
  expressDeliveryDays Int? // Express delivery days
}
```

## 🏢 Carrier Integrations

### 1. Jumia Logistics Integration

**Primary carrier** for nationwide Nigerian delivery with comprehensive coverage.

#### Features:
- **Coverage**: All 36 Nigerian states + FCT
- **Services**: Standard, Express, Same-day (Lagos only)
- **API Integration**: Full REST API with real-time tracking
- **Zone-based pricing** for Nigerian regions
- **Business hours delivery** (Mon-Fri: 8AM-6PM, Sat: 9AM-4PM)

#### API Endpoints:
```typescript
POST /shipping/calculate-rate  // Rate calculation
POST /shipments/create        // Shipment creation
GET  /shipments/track/{id}    // Real-time tracking
POST /shipments/{id}/label    // Label generation
POST /shipments/{id}/cancel   // Cancellation
```

### 2. Swift Local Delivery (Local Carrier)

**Secondary carrier** for cost-effective local deliveries in major Nigerian cities.

#### Features:
- **Coverage**: 12 major Nigerian states and cities
- **Services**: Standard, Express
- **Cost-effective** for lightweight packages (<25kg)
- **Local expertise** in covered areas
- **Flexible delivery options**

#### Mock Implementation:
- Simulated API responses for testing
- Nigerian business hours consideration
- State-specific delivery patterns
- Realistic tracking progression

## 🛣️ Nigerian Market Optimizations

### Geographic Coverage

#### Shipping Zones:
1. **Lagos Metropolitan** - 1-2 days delivery
2. **Southwest Region** - 2-3 days delivery  
3. **North Central (FCT)** - 3-4 days delivery
4. **Southeast Region** - 3-4 days delivery
5. **South South Region** - 4-5 days delivery
6. **Northeast Region** - 5-6 days delivery
7. **Northwest Region** - 4-5 days delivery

### Address Validation

#### Nigerian Phone Formats:
- `+2348123456789` (International format)
- `08123456789` (Local format)
- `07012345678` (Alternative format)

#### State Validation:
All 36 Nigerian states + FCT recognized and validated.

#### Business Hours:
- **Weekdays**: 8:00 AM - 6:00 PM
- **Saturdays**: 9:00 AM - 4:00 PM  
- **Sundays**: No delivery
- **Public Holidays**: Automatic handling

### Seasonal Considerations

#### Rainy Season Impact (April - October):
- Additional 1-2 days delivery time
- Weather alerts in delivery calendar
- Route optimization for flood-prone areas

#### Nigerian Public Holidays:
- New Year's Day
- Independence Day (October 1st)
- Christmas Day
- Boxing Day

## 📱 Admin API Endpoints

### Carrier Management
```
GET    /api/admin/shipping/carriers           # List carriers
POST   /api/admin/shipping/carriers           # Add carrier
PUT    /api/admin/shipping/carriers/:id       # Update carrier
```

### Shipping Rates
```
GET    /api/admin/shipping/rates              # Calculate rates
```

### Label Management
```
POST   /api/admin/shipping/labels             # Generate labels
```

### Tracking System
```
POST   /api/admin/shipping/track              # Track shipment
GET    /api/admin/shipping/tracking/:number   # Get tracking info
POST   /api/admin/shipping/tracking/bulk      # Bulk tracking
POST   /api/admin/shipping/tracking/manual-update # Manual update
POST   /api/admin/shipping/tracking/webhook   # Carrier webhooks
```

### Status Management
```
PUT    /api/admin/shipping/update-status      # Update status
```

### Analytics & Reporting
```
GET    /api/admin/shipping/analytics/performance  # Performance analytics
GET    /api/admin/shipping/analytics/costs       # Cost analysis
GET    /api/admin/shipping/analytics/delays      # Delay analysis
GET    /api/admin/shipping/dashboard             # Real-time dashboard
```

### Delivery Management
```
POST   /api/admin/shipping/schedule-delivery     # Schedule delivery
GET    /api/admin/shipping/delivery-calendar     # Delivery calendar
POST   /api/admin/shipping/cancel               # Cancel shipment
```

## 📈 Analytics and Reporting

### Performance Metrics

#### Carrier Performance:
- **Delivery Success Rate**: Percentage of successful deliveries
- **Average Delivery Time**: Days from pickup to delivery
- **On-time Delivery Rate**: Deliveries within estimated time
- **Customer Satisfaction**: Rating based on delivery experience
- **Cost Efficiency**: Cost per successful delivery

#### State-wise Performance:
- **Delivery Volume**: Number of shipments per state
- **Average Delivery Days**: Time variation by location
- **Success Rate**: State-specific delivery success
- **Common Issues**: Location-specific challenges

### Cost Optimization

#### Features:
- **Carrier Cost Comparison**: Real-time rate comparison
- **Route Optimization**: Delivery path suggestions
- **Bulk Shipping Discounts**: Volume-based pricing
- **Seasonal Adjustments**: Weather and traffic impact
- **Potential Savings**: Cost optimization recommendations

### Real-time Dashboard

#### Key Metrics:
- Today's shipments count
- Active shipments in transit
- Delayed shipments requiring attention
- Weekly growth trends
- Carrier status overview
- Recent shipping alerts

## 🔄 Order Management Integration

### Enhanced Fulfillment Workflow

#### Automated Shipping Setup:
1. **Order Confirmation** → Auto-create shipment
2. **Carrier Selection** → Optimal carrier based on cost/speed
3. **Label Generation** → Automatic shipping label creation
4. **Status Updates** → Real-time order status synchronization
5. **Customer Notifications** → Email + SMS with tracking info

#### Order Status Mapping:
```
PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
    ↓         ↓           ↓          ↓         ↓
 Created  → Shipment → Picking  → In Transit → Complete
```

### Integration Points

#### FulfillmentService Enhancement:
- `confirmOrderWithShipping()` - Auto-shipment creation
- `startProcessingWithCarrier()` - Carrier selection
- `shipOrderWithTracking()` - Integrated tracking
- `getShippingRatesForOrder()` - Rate comparison

## 🧪 Testing Coverage

### Test Categories

#### Unit Tests:
- Carrier service functionality
- Nigerian address validation
- Phone number format validation
- Business hours calculation
- Cost calculation algorithms

#### Integration Tests:
- Admin API endpoints
- Database operations
- Carrier API interactions
- Webhook processing
- Order integration flow

#### Nigerian Market Tests:
- State-specific delivery rules
- Seasonal impact calculations
- Holiday scheduling
- Currency handling (NGN)
- Local delivery patterns

### Test Scenarios

#### Address Validation:
```typescript
const nigerianAddresses = [
  { state: 'Lagos', city: 'Ikeja', phone: '+2348123456789' },
  { state: 'Abuja', city: 'Wuse', phone: '08087654321' },
  { state: 'Kano', city: 'Kano', phone: '07012345678' }
];
```

#### Rate Calculations:
- Same-state delivery (Lagos → Lagos)
- Cross-regional delivery (Lagos → Abuja)  
- Remote area delivery (Lagos → Borno)
- Express vs Standard pricing
- Weight-based surcharges

## 🚀 Deployment Setup

### Environment Variables
```bash
# Jumia Logistics
JUMIA_API_KEY=your_jumia_api_key
JUMIA_SELLER_ID=your_seller_id
JUMIA_API_URL=https://api.jumia-logistics.com/v2

# Local Carrier
LOCAL_CARRIER_API_KEY=your_local_carrier_key

# Database
DATABASE_URL=your_postgresql_connection_string
```

### Database Migration
```bash
# Generate Prisma client with new schema
npm run db:generate

# Create and apply migration
npm run db:migrate

# Seed shipping data
npx ts-node scripts/seedShippingData.ts
```

### Initial Data Setup
```bash
# Seed Nigerian shipping zones, carriers, and rates
npm run seed:shipping

# This creates:
# - 7 Nigerian shipping zones
# - 2 shipping carriers (Jumia + Local)
# - Zone-based shipping rates
# - Service type configurations
```

## 📋 Usage Examples

### Calculate Shipping Rates
```typescript
const rates = await shippingService.calculateShippingRates({
  originCity: 'Lagos',
  originState: 'Lagos', 
  destinationCity: 'Abuja',
  destinationState: 'FCT',
  packageWeight: 2.5,
  packageDimensions: { length: 30, width: 20, height: 15, weight: 2.5 },
  declaredValue: 25000
});
```

### Create Shipment
```typescript
const shipment = await shippingService.createShipment({
  orderId: 'order_123',
  carrierId: 'jumia_logistics',
  serviceType: 'standard',
  destinationAddress: {
    firstName: 'Adebayo',
    lastName: 'Ogundimu',
    addressLine1: '15 Allen Avenue',
    city: 'Ikeja',
    state: 'Lagos',
    country: 'NG',
    phoneNumber: '+2348123456789'
  },
  packageWeight: 2.5,
  packageDimensions: { length: 30, width: 20, height: 15, weight: 2.5 },
  declaredValue: 25000
});
```

### Track Shipment
```typescript
const tracking = await shippingService.trackShipment('JUM202312250001');
```

## 🔧 Configuration Options

### Carrier Configuration
```typescript
const jumiaConfig = {
  apiKey: process.env.JUMIA_API_KEY,
  sellerId: process.env.JUMIA_SELLER_ID,
  baseUrl: process.env.JUMIA_API_URL,
  testMode: process.env.NODE_ENV !== 'production'
};
```

### Nigerian Business Rules
```typescript
const nigerianRules = {
  businessHours: {
    weekdays: { start: '08:00', end: '18:00' },
    saturday: { start: '09:00', end: '16:00' },
    sunday: null // No Sunday delivery
  },
  rainySeasonMonths: [4, 5, 6, 7, 8, 9, 10],
  publicHolidays: ['01-01', '10-01', '12-25', '12-26'],
  maxWeight: 50, // kg
  maxDimensions: { length: 120, width: 80, height: 80 }
};
```

## 🚨 Error Handling

### Carrier API Failures
- **Automatic fallback** to secondary carrier
- **Graceful degradation** with mock tracking data
- **Retry mechanisms** for temporary failures
- **Admin notifications** for critical issues

### Nigerian Market Considerations
- **Network latency** handling for Nigerian infrastructure
- **Currency formatting** in Nigerian Naira (₦)
- **Phone number validation** for Nigerian formats
- **Address standardization** for Nigerian addresses

## 📞 Support and Monitoring

### Health Checks
```
GET /api/admin/health
```
Includes shipping system status and carrier connectivity.

### Logging
- **Structured logging** with Winston
- **Carrier API interactions** logged with request IDs
- **Performance metrics** for optimization
- **Error tracking** with context

### Monitoring
- **Real-time dashboard** for shipping operations
- **Alert system** for delayed deliveries
- **Performance analytics** for continuous improvement
- **Cost tracking** for budget management

## 🎯 Success Metrics

### Key Performance Indicators (KPIs)
- **Delivery Success Rate**: >95%
- **On-time Delivery**: >90%
- **Average Delivery Time**: <4 days nationwide
- **Customer Satisfaction**: >4.0/5.0
- **Cost Optimization**: >15% savings through smart routing

### Nigerian Market KPIs
- **Lagos Same-day Delivery**: Available
- **FCT Express Delivery**: 2-day guarantee
- **Nationwide Coverage**: All 36 states + FCT
- **Local Currency**: 100% NGN pricing
- **Phone Integration**: Nigerian number support

---

## 🏁 Conclusion

The Nigerian Shipping and Tracking System provides a comprehensive, market-optimized solution for e-commerce logistics in Nigeria. With integrated carrier management, real-time tracking, advanced analytics, and seamless order integration, the system enables efficient and scalable shipping operations across the Nigerian market.

### Key Achievements:
✅ **Comprehensive carrier integration** with Jumia Logistics and local carriers  
✅ **Real-time tracking** with webhook integration  
✅ **Nigerian market optimization** with local business rules  
✅ **Advanced analytics** for performance monitoring  
✅ **Seamless order integration** with automated workflows  
✅ **Extensive testing coverage** for Nigerian scenarios  
✅ **Production-ready deployment** with monitoring and alerts  

The system is now ready for production deployment and will scale to meet the growing demands of Nigerian e-commerce logistics.