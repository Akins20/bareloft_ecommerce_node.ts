export interface CartItem {
    id: string;
    cartId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    product: {
        id: string;
        name: string;
        slug: string;
        sku: string;
        price: number;
        comparePrice?: number;
        primaryImage?: string;
        inStock: boolean;
        stockQuantity: number;
        weight?: number;
    };
    isAvailable: boolean;
    hasStockIssue: boolean;
    priceChanged: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface Cart {
    id: string;
    userId?: string;
    sessionId?: string;
    items: CartItem[];
    itemCount: number;
    subtotal: number;
    estimatedTax: number;
    estimatedShipping: number;
    estimatedTotal: number;
    currency: string;
    appliedCoupon?: {
        code: string;
        discountAmount: number;
        discountType: "percentage" | "fixed";
    };
    hasOutOfStockItems: boolean;
    hasPriceChanges: boolean;
    isValid: boolean;
    shippingAddress?: {
        state: string;
        city: string;
        postalCode?: string;
    };
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
}
export interface AddToCartRequest {
    productId: string;
    quantity: number;
}
export interface UpdateCartItemRequest {
    productId: string;
    quantity: number;
}
export interface RemoveFromCartRequest {
    productId: string;
}
export interface ApplyCouponRequest {
    couponCode: string;
}
export interface UpdateShippingRequest {
    state: string;
    city: string;
    postalCode?: string;
}
export interface CartResponse {
    cart: Cart;
    messages?: string[];
}
export interface CartActionResponse {
    success: boolean;
    message: string;
    cart: Cart;
    warnings?: string[];
}
export interface CartValidationResult {
    isValid: boolean;
    issues: CartIssue[];
    cart: Cart;
}
export interface CartIssue {
    type: "out_of_stock" | "price_change" | "product_unavailable" | "quantity_limit";
    productId: string;
    productName: string;
    message: string;
    severity: "warning" | "error";
    action?: "remove" | "reduce_quantity" | "update_price";
}
export interface GuestCartRequest {
    sessionId: string;
    items: {
        productId: string;
        quantity: number;
    }[];
}
export interface MergeCartRequest {
    guestSessionId: string;
    strategy?: "replace" | "merge" | "keep_authenticated";
}
export interface CartAnalytics {
    totalCarts: number;
    activeCarts: number;
    abandonedCarts: number;
    averageCartValue: number;
    conversionRate: number;
    cartsByStatus: {
        active: number;
        abandoned: number;
        converted: number;
    };
    topAbandonedProducts: {
        productId: string;
        productName: string;
        abandonmentCount: number;
        abandonmentRate: number;
    }[];
    averageTimeToConversion: number;
    cartSizeDistribution: {
        itemCount: number;
        cartCount: number;
        percentage: number;
    }[];
}
export interface ShippingOption {
    id: string;
    name: string;
    description: string;
    price: number;
    estimatedDays: number;
    isAvailable: boolean;
}
export interface ShippingCalculationRequest {
    items: {
        productId: string;
        quantity: number;
        weight?: number;
    }[];
    destination: {
        state: string;
        city: string;
        postalCode?: string;
    };
}
export interface ShippingCalculationResponse {
    options: ShippingOption[];
    freeShippingThreshold?: number;
    freeShippingRemaining?: number;
}
export interface AbandonedCart {
    id: string;
    userId?: string;
    email?: string;
    phoneNumber?: string;
    items: CartItem[];
    value: number;
    abandonedAt: Date;
    recoveryEmailsSent: number;
    lastRecoveryEmailAt?: Date;
    isRecovered: boolean;
    recoveredAt?: Date;
}
export interface CartRecoveryEmail {
    cartId: string;
    email: string;
    templateId: string;
    scheduledFor: Date;
    sentAt?: Date;
    opened?: boolean;
    clicked?: boolean;
    recovered?: boolean;
}
//# sourceMappingURL=cart.types.d.ts.map