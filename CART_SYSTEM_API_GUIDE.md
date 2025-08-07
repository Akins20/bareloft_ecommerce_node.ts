# 🛒 Bareloft Cart System API Guide

Complete analysis and integration guide for the Nigerian e-commerce cart system.

---

## 📋 **System Overview**

**Base URL:** `http://localhost:3000/api/v1/cart`  
**Status:** 🟡 **75% Complete** - Core functionality ready, authentication issues need fixing  
**Nigerian Features:** ✅ Full support for Naira, shipping zones, VAT

### **Response Format**
```typescript
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: string;
  };
}
```

---

## 🏗️ **Architecture Analysis**

### **Layer Structure**
1. **Routes** (`cart.ts`) - 16 endpoints with comprehensive documentation
2. **Controller** (`CartController.ts`) - 13 methods with validation
3. **Service** (`CartService.ts`) - Business logic with Nigerian features
4. **Repository** (`CartRepository.ts`) - Database operations with Prisma

### **Key Components**
- **Cart Items**: Stored in `CartItem` table with `userId` foreign key
- **Virtual Cart**: Generated from cart items, no separate cart table
- **Session Support**: Designed for guest carts (not fully implemented)
- **Nigerian Integration**: VAT, shipping zones, currency formatting

---

## ✅ **Working Features**

### **1. Nigerian Market Optimizations**

**Currency & Pricing:**
- All prices in Nigerian Naira (₦)
- Proper kobo handling and formatting
- VAT calculation at 7.5% (Nigerian standard)

**Shipping Calculations:**
```typescript
// Nigerian shipping zones
const shippingRates = {
  "Lagos": 1500,           // ₦1,500
  "Major Cities": 2000,    // ₦2,000  
  "Remote Areas": 3000     // ₦3,000
};

// Free shipping threshold
const freeShippingThreshold = 50000; // ₦50,000
```

**Address Validation:**
- 36 Nigerian states + FCT validation
- City name validation
- Optional 6-digit postal code support

### **2. Core Cart Operations**

**Cart Structure:**
```typescript
interface CartSummary {
  items: CartItem[];
  subtotal: number;        // Pre-tax total
  tax: number;            // 7.5% VAT
  total: number;          // Final total
  itemCount: number;      // Total quantity
}
```

**Stock Management:**
- Real-time stock validation
- Maximum quantity limits (99 per item)
- Out-of-stock detection
- Low stock warnings

### **3. Advanced Features**

**Cart Validation:**
```typescript
interface CartValidationResult {
  isValid: boolean;
  issues: CartIssue[];    // Stock/price problems
  cart: CartWithDetails;
}
```

**Issue Types:**
- `out_of_stock` - Product unavailable
- `quantity_limit` - Exceeds available stock
- `price_change` - Price has changed
- `product_unavailable` - Product deactivated

---

## ❌ **Current Issues & Limitations**

### **1. Authentication Problems**

**Issue:** Routes require authentication but claim to support guests
```typescript
// Routes documented as "Public" but controller requires auth
router.get("/", cartController.getCart); // No guest middleware
```

**Impact:** 
- Guest shopping not possible
- Session IDs not properly handled
- Cart abandonment tracking broken

### **2. Service Dependencies**

**Issue:** Mock dependencies instead of real implementations
```typescript
constructor(cartRepository?: any, productRepository?: any) {
  this.cartRepository = cartRepository || {}; // Mock object
  this.productRepository = productRepository || {}; // Mock object
}
```

**Impact:**
- Database operations may fail
- Dependency injection not working properly
- Testing/development limitations

### **3. Missing Implementations**

**Coupon System:**
```typescript
async applyCoupon(...): Promise<CartActionResponse> {
  return {
    success: false,
    message: "Coupon functionality not implemented yet", // ❌
    cart: currentCart
  };
}
```

**Guest Cart Storage:**
- No session-based cart persistence
- Guest cart merging incomplete
- Session ID validation missing

---

## 🔧 **API Endpoints Analysis**

### **Core Cart Endpoints**

| Method | Endpoint | Status | Auth Required | Description |
|--------|----------|---------|---------------|-------------|
| GET | `/cart` | ⚠️ Auth Issue | Yes | Get user's cart |
| POST | `/cart/add` | ⚠️ Auth Issue | Yes | Add item to cart |
| PUT | `/cart/update` | ⚠️ Auth Issue | Yes | Update item quantity |
| DELETE | `/cart/remove/:productId` | ⚠️ Auth Issue | Yes | Remove item |
| DELETE | `/cart/clear` | ⚠️ Auth Issue | Yes | Clear entire cart |
| GET | `/cart/count` | ⚠️ Auth Issue | Yes | Get cart item count |

### **Advanced Features**

| Method | Endpoint | Status | Implementation |
|--------|----------|---------|----------------|
| POST | `/cart/validate` | ✅ Ready | Stock/price validation |
| POST | `/cart/merge` | 🔄 Partial | Guest cart merging |
| POST | `/cart/coupon/apply` | ❌ Placeholder | Coupon system needed |
| DELETE | `/cart/coupon/remove` | ❌ Placeholder | Coupon system needed |
| PUT | `/cart/shipping` | ✅ Ready | Nigerian shipping calc |
| POST | `/cart/shipping/calculate` | ✅ Ready | Shipping options |

### **Wishlist Integration**

| Method | Endpoint | Status | Implementation |
|--------|----------|---------|----------------|
| POST | `/cart/save-for-later/:productId` | 🔄 Partial | Moves to wishlist |
| POST | `/cart/move-to-cart/:productId` | 🔄 Partial | Moves from wishlist |

---

## 🛠️ **Required Fixes**

### **Priority 1: Authentication & Sessions**

```typescript
// Fix route middleware
router.get("/", 
  optionalAuth,           // Allow both auth and guest
  sessionHandler,         // Handle X-Session-ID
  cartController.getCart
);

// Fix controller logic
public getCart = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  const sessionId = req.sessionId || req.headers["x-session-id"];
  
  if (!userId && !sessionId) {
    // Return empty cart for new guests
    return res.json({ success: true, cart: emptyCart });
  }
  
  // Handle both authenticated and guest carts
};
```

### **Priority 2: Service Dependencies**

```typescript
// Fix dependency injection in routes or app initialization
const cartService = new CartService(
  cartRepository,        // Real repository instance
  productRepository     // Real repository instance  
);

const cartController = new CartController(cartService);
```

### **Priority 3: Guest Cart Implementation**

```typescript
// Add session-based cart storage
interface GuestCart {
  sessionId: string;
  items: GuestCartItem[];
  expiresAt: Date;
}

// Store in Redis or session storage
await redisClient.setex(`guest_cart:${sessionId}`, 86400, JSON.stringify(cart));
```

---

## 🎯 **Nigerian Market Features**

### **Shipping Zones**
```typescript
const nigerianShippingZones = {
  "Zone 1 (Lagos)": { cost: 1500, days: "1-2" },
  "Zone 2 (Major Cities)": { cost: 2000, days: "2-3" },  
  "Zone 3 (Other States)": { cost: 3000, days: "3-5" }
};
```

### **Payment Integration Ready**
- Paystack integration structure in place
- Nigerian banking system support
- USSD and bank transfer options planned

### **Local Business Logic**
```typescript
// VAT calculation (7.5% for Nigeria)
const tax = subtotal * 0.075;

// Free shipping threshold (₦50,000)
const shippingCost = subtotal >= 50000 ? 0 : baseShippingCost;

// Nigerian postal code validation (6 digits)
const postalCodeRegex = /^\d{6}$/;
```

---

## 📱 **Frontend Integration Examples**

### **Add to Cart (TypeScript/React)**

```typescript
interface AddToCartRequest {
  productId: string;
  quantity: number;
}

const addToCart = async (productId: string, quantity: number = 1) => {
  try {
    const response = await fetch('/api/v1/cart/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`, // If authenticated
        'X-Session-ID': sessionId // If guest
      },
      body: JSON.stringify({ productId, quantity })
    });

    const result = await response.json();
    
    if (result.success) {
      // Update cart UI
      updateCartCount(result.data.cart.itemCount);
      showSuccess('Item added to cart!');
    } else {
      showError(result.message);
    }
  } catch (error) {
    showError('Failed to add item to cart');
  }
};
```

### **Cart Management Hook**

```typescript
import { useState, useEffect } from 'react';

interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  estimatedTax: number;
  estimatedShipping: number;
  estimatedTotal: number;
  currency: string;
  itemCount: number;
}

export const useCart = () => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/cart', {
        headers: getAuthHeaders()
      });
      
      const result = await response.json();
      if (result.success) {
        setCart(result.data.cart);
      }
    } catch (err) {
      setError('Failed to fetch cart');
    }
    setLoading(false);
  };

  const addItem = async (productId: string, quantity: number) => {
    try {
      const response = await fetch('/api/v1/cart/add', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity })
      });
      
      if (response.ok) {
        await fetchCart(); // Refresh cart
      }
    } catch (err) {
      setError('Failed to add item');
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    try {
      const response = await fetch('/api/v1/cart/update', {
        method: 'PUT', 
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity })
      });
      
      if (response.ok) {
        await fetchCart();
      }
    } catch (err) {
      setError('Failed to update item');
    }
  };

  const removeItem = async (productId: string) => {
    try {
      const response = await fetch(`/api/v1/cart/remove/${productId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        await fetchCart();
      }
    } catch (err) {
      setError('Failed to remove item');
    }
  };

  const validateCart = async () => {
    try {
      const response = await fetch('/api/v1/cart/validate', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      return await response.json();
    } catch (err) {
      setError('Failed to validate cart');
      return null;
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  return {
    cart,
    loading,
    error,
    addItem,
    updateQuantity, 
    removeItem,
    validateCart,
    refetch: fetchCart
  };
};
```

### **Nigerian Currency Formatting**

```typescript
export const formatNaira = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₦${num.toLocaleString('en-NG', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  })}`;
};

// Usage examples:
formatNaira(25000);     // "₦25,000.00"
formatNaira("125.50");  // "₦125.50"
```

---

## 🚀 **Production Readiness Checklist**

### **Immediate Fixes Required**

- [ ] **Fix authentication middleware** - Support both auth and guest users
- [ ] **Implement session management** - Redis-based guest cart storage  
- [ ] **Fix service dependencies** - Proper dependency injection
- [ ] **Complete coupon system** - Database schema and validation logic
- [ ] **Add rate limiting** - Prevent cart spam and abuse
- [ ] **Implement cart cleanup** - Remove expired guest carts

### **Enhancement Opportunities**

- [ ] **Cart abandonment emails** - Nigerian-specific messaging
- [ ] **Bulk operations** - Add multiple items at once
- [ ] **Cart sharing** - Share cart via WhatsApp (popular in Nigeria)
- [ ] **Offline support** - Local storage fallback for poor connections
- [ ] **Cart recommendations** - "Complete your purchase" suggestions

### **Nigerian Market Enhancements**

- [ ] **Payment plan integration** - Installment payments for high-value items
- [ ] **WhatsApp integration** - Share cart/get support via WhatsApp
- [ ] **Mobile money support** - Integration with Nigerian mobile payment providers
- [ ] **Bulk purchase discounts** - Popular with Nigerian businesses
- [ ] **Regional pricing** - Different pricing for different regions

---

## 📊 **System Health Summary**

| Component | Status | Completion | Issues |
|-----------|--------|------------|---------|
| **Route Definition** | ✅ Excellent | 95% | Minor auth config |
| **Controller Logic** | ✅ Good | 85% | Session handling |
| **Service Layer** | ⚠️ Issues | 70% | Dependencies, coupons |
| **Repository** | ✅ Good | 80% | Guest cart storage |
| **Nigerian Features** | ✅ Excellent | 90% | Minor enhancements |
| **Error Handling** | ✅ Good | 85% | Consistent responses |

**Overall System Status: 🟡 75% Complete**

The cart system has excellent Nigerian market features and comprehensive functionality. The main blocker is authentication/session management. Once fixed, this will be a production-ready cart system optimized for the Nigerian e-commerce market.

---

## 🎯 **Next Steps**

1. **Fix Authentication** - Implement proper guest/auth middleware
2. **Test Integration** - End-to-end testing with real authentication
3. **Complete Coupon System** - Database schema and business logic
4. **Production Testing** - Load testing and edge case handling
5. **Documentation** - API documentation and frontend integration guide

The foundation is solid - this cart system is well-architected for the Nigerian market with proper business logic, validation, and error handling. The fixes needed are primarily infrastructure-related rather than business logic issues.