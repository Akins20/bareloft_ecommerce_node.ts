"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartRepository = void 0;
const client_1 = require("@prisma/client");
const BaseRepository_1 = require("./BaseRepository");
const types_1 = require("../types");
class CartRepository extends BaseRepository_1.BaseRepository {
    constructor(prisma) {
        super(prisma || new client_1.PrismaClient(), "Cart");
    }
    /**
     * Find cart items by user ID
     */
    async findByUserId(userId) {
        try {
            return await this.prisma.cartItem.findMany({
                where: { userId },
                include: {
                    product: {
                        include: {
                            images: true,
                            category: true,
                        },
                    },
                },
            });
        }
        catch (error) {
            this.handleError("Error finding cart items by user ID", error);
            throw error;
        }
    }
    /**
     * Find cart item by user and product
     */
    async findByUserAndProduct(userId, productId) {
        try {
            return await this.prisma.cartItem.findFirst({
                where: {
                    userId,
                    productId,
                },
                include: {
                    product: true,
                },
            });
        }
        catch (error) {
            this.handleError("Error finding cart item by user and product", error);
            throw error;
        }
    }
    /**
     * Find cart item by ID and user
     */
    async findByIdAndUser(itemId, userId) {
        try {
            return await this.prisma.cartItem.findFirst({
                where: {
                    id: itemId,
                    userId,
                },
                include: {
                    product: true,
                },
            });
        }
        catch (error) {
            this.handleError("Error finding cart item by ID and user", error);
            throw error;
        }
    }
    /**
     * Update cart item quantity
     */
    async updateQuantity(itemId, quantity) {
        try {
            return await this.prisma.cartItem.update({
                where: { id: itemId },
                data: { quantity },
                include: {
                    product: true,
                },
            });
        }
        catch (error) {
            this.handleError("Error updating cart item quantity", error);
            throw error;
        }
    }
    /**
     * Delete cart items by user ID
     */
    async deleteByUserId(userId) {
        try {
            await this.prisma.cartItem.deleteMany({
                where: { userId },
            });
        }
        catch (error) {
            this.handleError("Error deleting cart items by user ID", error);
            throw error;
        }
    }
    /**
     * Get or create cart for user
     */
    async getOrCreateUserCart(userId) {
        try {
            let cart = await this.findFirst({ userId }, {
                items: {
                    include: {
                        product: {
                            include: {
                                images: {
                                    where: { isPrimary: true },
                                    take: 1,
                                },
                                inventory: true,
                            },
                        },
                    },
                },
            });
            if (!cart) {
                // Create new cart for user
                cart = await this.create({
                    userId,
                    currency: "NGN",
                    subtotal: 0,
                    estimatedTax: 0,
                    estimatedShipping: 0,
                    estimatedTotal: 0,
                });
            }
            return this.transformCartWithDetails(cart);
        }
        catch (error) {
            this.handleError("Error getting or creating user cart", error);
            throw error;
        }
    }
    /**
     * Get or create cart for guest session
     */
    async getOrCreateGuestCart(sessionId) {
        try {
            let cart = await this.findFirst({ sessionId }, {
                items: {
                    include: {
                        product: {
                            include: {
                                images: {
                                    where: { isPrimary: true },
                                    take: 1,
                                },
                                inventory: true,
                            },
                        },
                    },
                },
            });
            if (!cart) {
                // Create new guest cart with expiration
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + types_1.CONSTANTS.CART_EXPIRY_DAYS);
                cart = await this.create({
                    sessionId,
                    currency: "NGN",
                    subtotal: 0,
                    estimatedTax: 0,
                    estimatedShipping: 0,
                    estimatedTotal: 0,
                    expiresAt,
                });
            }
            return this.transformCartWithDetails(cart);
        }
        catch (error) {
            this.handleError("Error getting or creating guest cart", error);
            throw error;
        }
    }
    /**
     * Add item to cart
     */
    async addItemToCart(cartId, productId, quantity) {
        try {
            return await this.transaction(async (prisma) => {
                // Get product details
                const product = await prisma.product.findUnique({
                    where: { id: productId, isActive: true },
                    include: { inventory: true },
                });
                if (!product) {
                    throw new types_1.AppError("Product not found or inactive", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
                }
                // Check stock availability
                const availableStock = (product.inventory?.quantity || 0) -
                    (product.inventory?.reservedQuantity || 0);
                if (availableStock < quantity) {
                    throw new types_1.AppError("Insufficient stock available", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.INSUFFICIENT_STOCK);
                }
                // Validate quantity limits
                if (quantity > types_1.CONSTANTS.CART_ITEM_MAX_QUANTITY) {
                    throw new types_1.AppError(`Maximum quantity per item is ${types_1.CONSTANTS.CART_ITEM_MAX_QUANTITY}`, types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
                }
                // Check if item already exists in cart
                const existingItem = await prisma.cartItem.findUnique({
                    where: {
                        cartId_productId: {
                            cartId,
                            productId,
                        },
                    },
                });
                if (existingItem) {
                    // Update existing item quantity
                    const newQuantity = existingItem.quantity + quantity;
                    if (newQuantity > types_1.CONSTANTS.CART_ITEM_MAX_QUANTITY) {
                        throw new types_1.AppError(`Maximum quantity per item is ${types_1.CONSTANTS.CART_ITEM_MAX_QUANTITY}`, types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
                    }
                    if (availableStock < newQuantity) {
                        throw new types_1.AppError("Insufficient stock for requested quantity", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.INSUFFICIENT_STOCK);
                    }
                    await prisma.cartItem.update({
                        where: { id: existingItem.id },
                        data: {
                            quantity: newQuantity,
                            totalPrice: newQuantity * Number(product.price),
                        },
                    });
                }
                else {
                    // Create new cart item
                    await prisma.cartItem.create({
                        data: {
                            cartId,
                            productId,
                            quantity,
                            unitPrice: Number(product.price),
                            totalPrice: quantity * Number(product.price),
                        },
                    });
                }
                // Recalculate cart totals
                await this.recalculateCartTotals(cartId, prisma);
                // Return updated cart
                const updatedCart = await this.findById(cartId, {
                    items: {
                        include: {
                            product: {
                                include: {
                                    images: {
                                        where: { isPrimary: true },
                                        take: 1,
                                    },
                                    inventory: true,
                                },
                            },
                        },
                    },
                });
                return this.transformCartWithDetails(updatedCart);
            });
        }
        catch (error) {
            this.handleError("Error adding item to cart", error);
            throw error;
        }
    }
    /**
     * Update cart item quantity
     */
    async updateCartItem(cartId, productId, quantity) {
        try {
            return await this.transaction(async (prisma) => {
                // Find the cart item
                const cartItem = await prisma.cartItem.findUnique({
                    where: {
                        cartId_productId: {
                            cartId,
                            productId,
                        },
                    },
                    include: {
                        product: {
                            include: { inventory: true },
                        },
                    },
                });
                if (!cartItem) {
                    throw new types_1.AppError("Cart item not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
                }
                // Validate quantity
                if (quantity <= 0) {
                    // Remove item if quantity is 0 or negative
                    await prisma.cartItem.delete({
                        where: { id: cartItem.id },
                    });
                }
                else {
                    // Validate quantity limits
                    if (quantity > types_1.CONSTANTS.CART_ITEM_MAX_QUANTITY) {
                        throw new types_1.AppError(`Maximum quantity per item is ${types_1.CONSTANTS.CART_ITEM_MAX_QUANTITY}`, types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
                    }
                    // Check stock availability
                    const availableStock = (cartItem.product.inventory?.quantity || 0) -
                        (cartItem.product.inventory?.reservedQuantity || 0);
                    if (availableStock < quantity) {
                        throw new types_1.AppError("Insufficient stock for requested quantity", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.INSUFFICIENT_STOCK);
                    }
                    // Update item
                    await prisma.cartItem.update({
                        where: { id: cartItem.id },
                        data: {
                            quantity,
                            unitPrice: Number(cartItem.product.price),
                            totalPrice: quantity * Number(cartItem.product.price),
                        },
                    });
                }
                // Recalculate cart totals
                await this.recalculateCartTotals(cartId, prisma);
                // Return updated cart
                const updatedCart = await this.findById(cartId, {
                    items: {
                        include: {
                            product: {
                                include: {
                                    images: {
                                        where: { isPrimary: true },
                                        take: 1,
                                    },
                                    inventory: true,
                                },
                            },
                        },
                    },
                });
                return this.transformCartWithDetails(updatedCart);
            });
        }
        catch (error) {
            this.handleError("Error updating cart item", error);
            throw error;
        }
    }
    /**
     * Remove item from cart
     */
    async removeItemFromCart(cartId, productId) {
        try {
            return await this.transaction(async (prisma) => {
                // Delete the cart item
                await prisma.cartItem.deleteMany({
                    where: {
                        cartId,
                        productId,
                    },
                });
                // Recalculate cart totals
                await this.recalculateCartTotals(cartId, prisma);
                // Return updated cart
                const updatedCart = await this.findById(cartId, {
                    items: {
                        include: {
                            product: {
                                include: {
                                    images: {
                                        where: { isPrimary: true },
                                        take: 1,
                                    },
                                    inventory: true,
                                },
                            },
                        },
                    },
                });
                return this.transformCartWithDetails(updatedCart);
            });
        }
        catch (error) {
            this.handleError("Error removing item from cart", error);
            throw error;
        }
    }
    /**
     * Clear entire cart
     */
    async clearCart(cartId) {
        try {
            return await this.transaction(async (prisma) => {
                // Delete all cart items
                await prisma.cartItem.deleteMany({
                    where: { cartId },
                });
                // Reset cart totals
                await prisma.cart.update({
                    where: { id: cartId },
                    data: {
                        subtotal: 0,
                        estimatedTax: 0,
                        estimatedShipping: 0,
                        estimatedTotal: 0,
                        appliedCoupon: null,
                    },
                });
                // Return empty cart
                const updatedCart = await this.findById(cartId, {
                    items: {
                        include: {
                            product: {
                                include: {
                                    images: {
                                        where: { isPrimary: true },
                                        take: 1,
                                    },
                                    inventory: true,
                                },
                            },
                        },
                    },
                });
                return this.transformCartWithDetails(updatedCart);
            });
        }
        catch (error) {
            this.handleError("Error clearing cart", error);
            throw error;
        }
    }
    /**
     * Validate cart before checkout
     */
    async validateCart(cartId) {
        try {
            const cart = await this.findById(cartId, {
                items: {
                    include: {
                        product: {
                            include: { inventory: true },
                        },
                    },
                },
            });
            if (!cart) {
                throw new types_1.AppError("Cart not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            const issues = [];
            let isValid = true;
            for (const item of cart.items) {
                const product = item.product;
                const inventory = product.inventory;
                // Check if product is still active
                if (!product.isActive) {
                    issues.push({
                        type: "product_unavailable",
                        productId: product.id,
                        productName: product.name,
                        message: `${product.name} is no longer available`,
                        severity: "error",
                        action: "remove",
                    });
                    isValid = false;
                    continue;
                }
                // Check stock availability
                const availableStock = (inventory?.quantity || 0) - (inventory?.reservedQuantity || 0);
                if (availableStock <= 0) {
                    issues.push({
                        type: "out_of_stock",
                        productId: product.id,
                        productName: product.name,
                        message: `${product.name} is out of stock`,
                        severity: "error",
                        action: "remove",
                    });
                    isValid = false;
                }
                else if (availableStock < item.quantity) {
                    issues.push({
                        type: "quantity_limit",
                        productId: product.id,
                        productName: product.name,
                        message: `Only ${availableStock} units of ${product.name} are available`,
                        severity: "warning",
                        action: "reduce_quantity",
                    });
                    isValid = false;
                }
                // Check price changes
                const currentPrice = Number(product.price);
                if (currentPrice !== Number(item.unitPrice)) {
                    issues.push({
                        type: "price_change",
                        productId: product.id,
                        productName: product.name,
                        message: `Price of ${product.name} has changed from ₦${item.unitPrice} to ₦${currentPrice}`,
                        severity: "warning",
                        action: "update_price",
                    });
                    // Price changes don't make cart invalid, just notify user
                }
            }
            const transformedCart = this.transformCartWithDetails(cart);
            return {
                isValid,
                issues,
                cart: transformedCart,
            };
        }
        catch (error) {
            this.handleError("Error validating cart", error);
            throw error;
        }
    }
    /**
     * Merge guest cart with user cart
     */
    async mergeGuestCartToUser(guestSessionId, userId, strategy = "merge") {
        try {
            return await this.transaction(async (prisma) => {
                const [guestCart, userCart] = await Promise.all([
                    this.findFirst({ sessionId: guestSessionId }, {
                        items: {
                            include: { product: true },
                        },
                    }),
                    this.findFirst({ userId }, {
                        items: {
                            include: { product: true },
                        },
                    }),
                ]);
                if (!guestCart) {
                    // No guest cart to merge, return user cart or create new one
                    return userCart
                        ? this.transformCartWithDetails(userCart)
                        : await this.getOrCreateUserCart(userId);
                }
                let targetCart = userCart;
                if (!userCart) {
                    // No user cart exists, convert guest cart to user cart
                    targetCart = await prisma.cart.update({
                        where: { id: guestCart.id },
                        data: {
                            userId,
                            sessionId: null,
                            expiresAt: null,
                        },
                        include: {
                            items: {
                                include: {
                                    product: {
                                        include: {
                                            images: {
                                                where: { isPrimary: true },
                                                take: 1,
                                            },
                                            inventory: true,
                                        },
                                    },
                                },
                            },
                        },
                    });
                }
                else {
                    // Both carts exist, merge based on strategy
                    switch (strategy) {
                        case "replace":
                            // Replace user cart with guest cart
                            await prisma.cartItem.deleteMany({
                                where: { cartId: userCart.id },
                            });
                            await prisma.cartItem.updateMany({
                                where: { cartId: guestCart.id },
                                data: { cartId: userCart.id },
                            });
                            await prisma.cart.delete({
                                where: { id: guestCart.id },
                            });
                            break;
                        case "merge":
                            // Merge items from guest cart to user cart
                            for (const guestItem of guestCart.items) {
                                const existingUserItem = userCart.items.find((item) => item.productId === guestItem.productId);
                                if (existingUserItem) {
                                    // Update quantity (respecting limits)
                                    const newQuantity = Math.min(existingUserItem.quantity + guestItem.quantity, types_1.CONSTANTS.CART_ITEM_MAX_QUANTITY);
                                    await prisma.cartItem.update({
                                        where: { id: existingUserItem.id },
                                        data: {
                                            quantity: newQuantity,
                                            totalPrice: newQuantity * Number(guestItem.unitPrice),
                                        },
                                    });
                                }
                                else {
                                    // Move item to user cart
                                    await prisma.cartItem.update({
                                        where: { id: guestItem.id },
                                        data: { cartId: userCart.id },
                                    });
                                }
                            }
                            // Delete guest cart
                            await prisma.cart.delete({
                                where: { id: guestCart.id },
                            });
                            break;
                        case "keep_authenticated":
                            // Keep user cart, delete guest cart
                            await prisma.cart.delete({
                                where: { id: guestCart.id },
                            });
                            break;
                    }
                    // Recalculate totals for user cart
                    await this.recalculateCartTotals(userCart.id, prisma);
                    // Get updated user cart
                    targetCart = await this.findById(userCart.id, {
                        items: {
                            include: {
                                product: {
                                    include: {
                                        images: {
                                            where: { isPrimary: true },
                                            take: 1,
                                        },
                                        inventory: true,
                                    },
                                },
                            },
                        },
                    });
                }
                return this.transformCartWithDetails(targetCart);
            });
        }
        catch (error) {
            this.handleError("Error merging guest cart to user", error);
            throw error;
        }
    }
    /**
     * Apply coupon to cart
     */
    async applyCoupon(cartId, couponCode) {
        try {
            // Get coupon details (would validate with CouponService)
            const coupon = await this.prisma.coupon.findFirst({
                where: {
                    code: couponCode,
                    isActive: true,
                    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                },
            });
            if (!coupon) {
                throw new types_1.AppError("Invalid or expired coupon", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.INVALID_COUPON);
            }
            // Apply coupon to cart
            const cart = await this.update(cartId, {
                appliedCoupon: {
                    code: coupon.code,
                    discountType: coupon.discountType,
                    discountValue: Number(coupon.discountValue),
                },
            }, {
                items: {
                    include: {
                        product: {
                            include: {
                                images: {
                                    where: { isPrimary: true },
                                    take: 1,
                                },
                                inventory: true,
                            },
                        },
                    },
                },
            });
            // Recalculate totals with coupon
            await this.recalculateCartTotals(cartId);
            return this.transformCartWithDetails(cart);
        }
        catch (error) {
            this.handleError("Error applying coupon to cart", error);
            throw error;
        }
    }
    /**
     * Get abandoned carts for marketing
     */
    async getAbandonedCarts(abandonedAfterHours = 24, limit = 100) {
        try {
            const cutoffTime = new Date();
            cutoffTime.setHours(cutoffTime.getHours() - abandonedAfterHours);
            const result = await this.findMany({
                updatedAt: { lt: cutoffTime },
                items: {
                    some: {}, // Has items
                },
                userId: { not: null }, // Authenticated users only
            }, {
                include: {
                    user: {
                        select: {
                            email: true,
                            phoneNumber: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    items: {
                        include: {
                            product: {
                                include: {
                                    images: {
                                        where: { isPrimary: true },
                                        take: 1,
                                    },
                                    inventory: true,
                                },
                            },
                        },
                    },
                },
                pagination: { page: 1, limit },
            });
            return result.data.map((cart) => ({
                ...this.transformCartWithDetails(cart),
                abandonedAt: cart.updatedAt,
                customerEmail: cart.user?.email,
                customerPhone: cart.user?.phoneNumber,
            }));
        }
        catch (error) {
            this.handleError("Error getting abandoned carts", error);
            throw error;
        }
    }
    /**
     * Clean up expired guest carts
     */
    async cleanupExpiredCarts() {
        try {
            const result = await this.deleteMany({
                sessionId: { not: null },
                expiresAt: { lt: new Date() },
            });
            return { deletedCount: result.count };
        }
        catch (error) {
            this.handleError("Error cleaning up expired carts", error);
            return { deletedCount: 0 };
        }
    }
    // Private helper methods
    async recalculateCartTotals(cartId, prismaInstance) {
        const prisma = prismaInstance || this.prisma;
        try {
            // Get all cart items
            const cartItems = await prisma.cartItem.findMany({
                where: { cartId },
            });
            const subtotal = cartItems.reduce((sum, item) => sum + Number(item.totalPrice), 0);
            // Calculate tax (5% VAT for Nigeria)
            const estimatedTax = subtotal * 0.05;
            // Calculate shipping (free over ₦50,000)
            const estimatedShipping = subtotal >= types_1.CONSTANTS.FREE_SHIPPING_THRESHOLD
                ? 0
                : types_1.CONSTANTS.DEFAULT_SHIPPING_FEE;
            // Get cart to check for applied coupon
            const cart = await prisma.cart.findUnique({
                where: { id: cartId },
            });
            let discountAmount = 0;
            if (cart?.appliedCoupon) {
                const coupon = cart.appliedCoupon;
                if (coupon.discountType === "percentage") {
                    discountAmount = subtotal * (coupon.discountValue / 100);
                }
                else if (coupon.discountType === "fixed") {
                    discountAmount = Math.min(coupon.discountValue, subtotal);
                }
            }
            const estimatedTotal = subtotal + estimatedTax + estimatedShipping - discountAmount;
            // Update cart totals
            await prisma.cart.update({
                where: { id: cartId },
                data: {
                    subtotal,
                    estimatedTax,
                    estimatedShipping,
                    estimatedTotal: Math.max(0, estimatedTotal),
                },
            });
        }
        catch (error) {
            this.handleError("Error recalculating cart totals", error);
        }
    }
    transformCartWithDetails(cart) {
        const items = cart.items?.map((item) => {
            const product = item.product;
            const inventory = product.inventory;
            const availableStock = (inventory?.quantity || 0) - (inventory?.reservedQuantity || 0);
            return {
                ...item,
                product: {
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    sku: product.sku,
                    price: Number(product.price),
                    comparePrice: product.comparePrice
                        ? Number(product.comparePrice)
                        : undefined,
                    primaryImage: product.images?.[0]?.imageUrl || null,
                    inStock: availableStock > 0,
                    stockQuantity: availableStock,
                    weight: product.weight ? Number(product.weight) : undefined,
                },
                isAvailable: product.isActive && availableStock > 0,
                hasStockIssue: availableStock < item.quantity,
                priceChanged: Number(product.price) !== Number(item.unitPrice),
            };
        }) || [];
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
        const hasOutOfStockItems = items.some((item) => !item.isAvailable);
        const hasPriceChanges = items.some((item) => item.priceChanged);
        const isValid = !hasOutOfStockItems && items.every((item) => !item.hasStockIssue);
        return {
            ...cart,
            items,
            itemCount,
            hasOutOfStockItems,
            hasPriceChanges,
            isValid,
        };
    }
}
exports.CartRepository = CartRepository;
//# sourceMappingURL=CartRepository.js.map