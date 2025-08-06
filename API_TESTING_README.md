# Bareloft E-commerce API - Testing Guide

This guide provides comprehensive instructions for testing the Bareloft E-commerce API, which is optimized for the Nigerian market.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- API server running on `http://localhost:3000`
- Basic understanding of REST APIs

### 1. Server Status Check
First, verify the server is running:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "environment": "development",
  "services": {
    "database": "healthy",
    "paystack": "healthy",
    "email": "healthy"
  }
}
```

### 2. Install Test Dependencies
```bash
npm install axios
```

### 3. Run Comprehensive Tests
```bash
node api-test-script.js
```

## 📋 Test Coverage

The test suite covers all major API functionality:

### ✅ Authentication & Security
- [x] OTP request and verification
- [x] User registration (signup)
- [x] User login
- [x] Token refresh
- [x] Phone number validation
- [x] Rate limiting verification

### ✅ Product Catalog
- [x] Product listing with filters
- [x] Product details retrieval
- [x] Product search functionality
- [x] Stock availability checking
- [x] Featured products
- [x] Category-based filtering

### ✅ Shopping Cart
- [x] Guest cart functionality
- [x] Add/update/remove items
- [x] Cart validation
- [x] Cart merging after login
- [x] Coupon application
- [x] Shipping calculations

### ✅ Order Management
- [x] Order creation
- [x] Order retrieval
- [x] Order tracking
- [x] Order history
- [x] Payment integration setup

### ✅ User Management
- [x] User profile operations
- [x] Address management
- [x] Wishlist functionality
- [x] Account summary

### ✅ Nigerian Market Features
- [x] Nigerian phone number validation (+234 format)
- [x] All 36 states + FCT support
- [x] Naira currency handling (NGN)
- [x] Nigerian shipping zones
- [x] Local address formats

## 🧪 Manual Testing Examples

### Authentication Flow

#### 1. Request OTP for Signup
```bash
curl -X POST http://localhost:3000/api/v1/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+2348012345678",
    "purpose": "signup"
  }'
```

#### 2. Complete Signup (Mock OTP)
```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+2348012345678",
    "firstName": "Emeka",
    "lastName": "Okafor",
    "email": "emeka@example.com",
    "otpCode": "123456"
  }'
```

#### 3. Get Current User
```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Product Browsing

#### 1. Get Products with Nigerian Context
```bash
curl -X GET "http://localhost:3000/api/v1/products?page=1&limit=20&sortBy=price&sortOrder=asc"
```

#### 2. Search for Products
```bash
curl -X GET "http://localhost:3000/api/v1/products?search=samsung&minPrice=100000&maxPrice=500000"
```

#### 3. Get Product Stock
```bash
curl -X GET http://localhost:3000/api/v1/products/PRODUCT_ID/stock
```

### Shopping Cart (Guest)

#### 1. Add to Cart
```bash
curl -X POST http://localhost:3000/api/v1/cart/add \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: guest-session-uuid" \
  -d '{
    "productId": "PRODUCT_ID",
    "quantity": 2
  }'
```

#### 2. Get Cart
```bash
curl -X GET http://localhost:3000/api/v1/cart \
  -H "X-Session-ID: guest-session-uuid"
```

#### 3. Validate Cart
```bash
curl -X POST http://localhost:3000/api/v1/cart/validate \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: guest-session-uuid"
```

### Nigerian Addresses

#### 1. Get Nigerian Locations
```bash
curl -X GET http://localhost:3000/api/v1/addresses/locations
```

#### 2. Create Address
```bash
curl -X POST http://localhost:3000/api/v1/addresses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "type": "shipping",
    "firstName": "Emeka",
    "lastName": "Okafor",
    "addressLine1": "15 Victoria Island Road",
    "city": "Lagos",
    "state": "Lagos",
    "phoneNumber": "+2348012345678",
    "isDefault": true
  }'
```

### Order Creation

#### 1. Create Order
```bash
curl -X POST http://localhost:3000/api/v1/orders/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "shippingAddress": {
      "firstName": "Emeka",
      "lastName": "Okafor",
      "addressLine1": "15 Victoria Island Road",
      "city": "Lagos",
      "state": "Lagos",
      "phoneNumber": "+2348012345678"
    },
    "paymentMethod": {
      "type": "paystack",
      "returnUrl": "https://yourapp.com/success"
    }
  }'
```

#### 2. Get Orders
```bash
curl -X GET http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🇳🇬 Nigerian Market Testing Checklist

### Phone Number Formats
Test these Nigerian phone number formats:
- ✅ `+2348012345678` (MTN)
- ✅ `+2347012345678` (Glo)
- ✅ `+2349012345678` (Airtel)
- ✅ `+2341012345678` (9mobile)

### States and Cities
Verify support for all 36 Nigerian states + FCT:
```bash
curl -X GET http://localhost:3000/api/v1/addresses/locations
```

Expected states include: Lagos, Kano, Rivers, Oyo, Kaduna, Ogun, Delta, Anambra, etc.

### Currency Handling
All prices should be returned in Nigerian Naira (NGN):
- Format: `₦1,999.99`
- Storage: Integer values (kobo for Paystack compatibility)
- Display: Proper comma separation and decimal places

### Shipping Zones
Test shipping calculations for different Nigerian zones:
1. **Zone 1**: Lagos, Ogun, Oyo (₦1,500)
2. **Zone 2**: Southwest states (₦2,500)
3. **Zone 3**: Other states (₦3,500)
4. **Remote**: Hard-to-reach areas (₦5,000)

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. Server Not Starting
```bash
# Check if server is running
curl http://localhost:3000/health

# If not running, start the server
npm run dev
```

#### 2. TypeScript Compilation Errors
```bash
# Build the project
npm run build

# Check for TypeScript errors
npm run type-check
```

#### 3. Database Connection Issues
```bash
# Check database status in health endpoint
curl http://localhost:3000/health | grep -i database

# Run database migrations if needed
npm run db:migrate
```

#### 4. OTP Testing (Development)
Since real SMS isn't sent in development:
- Use mock OTP code: `123456`
- Check logs for generated OTP codes
- Use test phone numbers that don't trigger SMS

#### 5. Rate Limiting Issues
If you hit rate limits during testing:
```bash
# Wait for rate limit window to reset (usually 1-15 minutes)
# Or restart the server to reset rate limits
```

### Environment Variables Check
Ensure these environment variables are set:
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
```

## 📊 Test Results Interpretation

### Success Criteria
- ✅ **Health Check**: Server is running and all services are healthy
- ✅ **Authentication**: OTP flow works, tokens are generated
- ✅ **Products**: Catalog loads, search works, stock checking functions
- ✅ **Cart**: Guest and authenticated cart operations work
- ✅ **Orders**: Order creation and retrieval successful
- ✅ **Nigerian Features**: Phone validation, states, currency formatting

### Performance Expectations
- **Health Check**: < 100ms response time
- **Authentication**: < 2s for OTP request/verification
- **Product Listing**: < 500ms for 20 products
- **Cart Operations**: < 300ms per operation
- **Order Creation**: < 1s for complete order

### Rate Limit Expectations
- **OTP Requests**: 3 per minute per phone
- **Authentication**: 5 attempts per minute
- **General API**: 100 requests per minute
- **Cart Operations**: 60 per minute
- **Stock Checks**: 120 per minute

## 🚀 Frontend Integration Testing

### React/Next.js Integration
```javascript
// Test with real frontend integration
const api = new BareloftAPI('http://localhost:3000/api/v1');

// Test authentication flow
await api.requestOTP('+2348012345678', 'login');
const user = await api.login('+2348012345678', '123456');

// Test product browsing
const products = await api.getProducts({ page: 1, limit: 20 });

// Test cart operations
await api.addToCart('product-id', 2);
const cart = await api.getCart();
```

### Mobile App Integration
```javascript
// Test with mobile-specific features
import AsyncStorage from '@react-native-async-storage/async-storage';

// Session management
const sessionId = await AsyncStorage.getItem('sessionId');
await api.addToCart('product-id', 1, { sessionId });

// Cart merge after login
await api.mergeGuestCart(sessionId);
```

## 📝 Test Reporting

The test script automatically generates a comprehensive report including:
- ✅ **Test Summary**: Pass/fail rates and critical issues
- 🇳🇬 **Nigerian Features**: Market-specific functionality status
- 📊 **Performance Metrics**: Response times and success rates
- 🔧 **Integration Recommendations**: Best practices for frontend

### Sample Test Report
```
🚀 Starting Bareloft API Comprehensive Test Suite
============================================================

🧪 Testing: Health Check
✅ Health check passed - Status: healthy
Server uptime: 3600s
Environment: development

🧪 Testing: Authentication Flow
✅ OTP request successful
Phone: +2348012345678
Expires in: 600 seconds
✅ Signup successful
User ID: uuid-here
Access Token: jwt-token-here...

... (additional tests)

============================================================
📊 TEST SUMMARY
============================================================
Total Tests: 18
Passed: 16
Failed: 2
Critical Failures: 0
Success Rate: 88.9%

✅ API is functioning well and ready for integration!

🇳🇬 NIGERIAN MARKET FEATURES
Phone Number Support: ✅
OTP Authentication: ✅
Naira Currency: ✅ (NGN format detected)
State Support: ✅ (All 36 states + FCT)
Shipping Zones: ✅ (Ready for Nigerian logistics)
```

## 🤝 Contributing to Tests

### Adding New Tests
1. Create new test function in `api-test-script.js`
2. Add to the test suite array
3. Follow the existing pattern:
   ```javascript
   const testNewFeature = async () => {
     logTest('New Feature Test');
     try {
       // Test implementation
       logSuccess('Test passed');
       return true;
     } catch (error) {
       logError(`Test failed: ${error.message}`);
       return false;
     }
   };
   ```

### Test Data Guidelines
- Use test phone numbers: `+234801234567X`
- Use test emails: `test@example.com`
- Use mock addresses in Lagos, Nigeria
- Generate UUIDs for session IDs
- Use mock OTP code: `123456`

### Best Practices
1. Always check for critical vs non-critical failures
2. Provide clear success/failure messages
3. Include relevant response data in logs
4. Handle network errors gracefully
5. Test both success and error scenarios
6. Verify Nigerian market-specific features

---

## 📞 Support

For API testing issues or questions:
- Check the comprehensive API documentation: `COMPREHENSIVE_API_DOCUMENTATION.md`
- Review server logs for detailed error information
- Ensure all environment variables are properly set
- Verify database and Redis connections
- Test with different Nigerian phone numbers and states

**The API is ready for integration with frontend applications and provides full support for Nigerian e-commerce requirements.**