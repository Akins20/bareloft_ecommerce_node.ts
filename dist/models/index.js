"use strict";
// src/models/index.ts
// Central barrel export for all database models
// This provides a clean import interface for the entire application
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelNames = exports.AllSchemas = exports.AllModels = exports.CommunicationModels = exports.PaymentModels = exports.AuthModels = exports.InventoryModels = exports.ShoppingModels = exports.ProductModels = exports.NotificationSchema = exports.NotificationModel = exports.CouponSchema = exports.CouponModel = exports.OrderTimelineEventSchema = exports.OrderTimelineEventModel = exports.StockReservationSchema = exports.StockReservationModel = exports.PaymentTransactionSchema = exports.PaymentTransactionModel = exports.SessionSchema = exports.SessionModel = exports.OTPCodeSchema = exports.OTPCodeModel = exports.WishlistItemSchema = exports.WishlistItemModel = exports.ProductReviewSchema = exports.ProductReviewModel = exports.ProductImageSchema = exports.ProductImageModel = exports.InventoryMovementSchema = exports.InventoryMovementModel = exports.InventorySchema = exports.InventoryModel = exports.OrderItemSchema = exports.OrderItemModel = exports.OrderSchema = exports.OrderModel = exports.CartItemSchema = exports.CartItemModel = exports.CartSchema = exports.CartModel = exports.CategorySchema = exports.CategoryModel = exports.ProductSchema = exports.ProductModel = exports.AddressSchema = exports.AddressModel = exports.UserSchema = exports.UserModel = void 0;
const Address_1 = __importStar(require("./Address"));
const Cart_1 = __importStar(require("./Cart"));
const CartItem_1 = __importStar(require("./CartItem"));
const Category_1 = __importStar(require("./Category"));
const Coupon_1 = __importDefault(require("./Coupon"));
const Inventory_1 = __importStar(require("./Inventory"));
const InventoryMovement_1 = __importStar(require("./InventoryMovement"));
const Notification_1 = __importDefault(require("./Notification"));
const Order_1 = __importStar(require("./Order"));
const OrderItem_1 = __importStar(require("./OrderItem"));
const OrderTimelineEvent_1 = __importDefault(require("./OrderTimelineEvent"));
const OTPCode_1 = __importDefault(require("./OTPCode"));
const PaymentTransaction_1 = __importDefault(require("./PaymentTransaction"));
const Product_1 = __importStar(require("./Product"));
const ProductImage_1 = __importDefault(require("./ProductImage"));
const ProductReview_1 = __importDefault(require("./ProductReview"));
const Session_1 = __importDefault(require("./Session"));
const StockReservation_1 = __importDefault(require("./StockReservation"));
const User_1 = __importStar(require("./User"));
const WishlistItem_1 = __importDefault(require("./WishlistItem"));
// Core User Models
var User_2 = require("./User");
Object.defineProperty(exports, "UserModel", { enumerable: true, get: function () { return __importDefault(User_2).default; } });
Object.defineProperty(exports, "UserSchema", { enumerable: true, get: function () { return User_2.UserSchema; } });
var Address_2 = require("./Address");
Object.defineProperty(exports, "AddressModel", { enumerable: true, get: function () { return __importDefault(Address_2).default; } });
Object.defineProperty(exports, "AddressSchema", { enumerable: true, get: function () { return Address_2.AddressSchema; } });
// Product Catalog Models
var Product_2 = require("./Product");
Object.defineProperty(exports, "ProductModel", { enumerable: true, get: function () { return __importDefault(Product_2).default; } });
Object.defineProperty(exports, "ProductSchema", { enumerable: true, get: function () { return Product_2.ProductSchema; } });
var Category_2 = require("./Category");
Object.defineProperty(exports, "CategoryModel", { enumerable: true, get: function () { return __importDefault(Category_2).default; } });
Object.defineProperty(exports, "CategorySchema", { enumerable: true, get: function () { return Category_2.CategorySchema; } });
// Shopping & Orders Models
var Cart_2 = require("./Cart");
Object.defineProperty(exports, "CartModel", { enumerable: true, get: function () { return __importDefault(Cart_2).default; } });
Object.defineProperty(exports, "CartSchema", { enumerable: true, get: function () { return Cart_2.CartSchema; } });
var CartItem_2 = require("./CartItem");
Object.defineProperty(exports, "CartItemModel", { enumerable: true, get: function () { return __importDefault(CartItem_2).default; } });
Object.defineProperty(exports, "CartItemSchema", { enumerable: true, get: function () { return CartItem_2.CartItemSchema; } });
var Order_2 = require("./Order");
Object.defineProperty(exports, "OrderModel", { enumerable: true, get: function () { return __importDefault(Order_2).default; } });
Object.defineProperty(exports, "OrderSchema", { enumerable: true, get: function () { return Order_2.OrderSchema; } });
var OrderItem_2 = require("./OrderItem");
Object.defineProperty(exports, "OrderItemModel", { enumerable: true, get: function () { return __importDefault(OrderItem_2).default; } });
Object.defineProperty(exports, "OrderItemSchema", { enumerable: true, get: function () { return OrderItem_2.OrderItemSchema; } });
// Inventory Management Models
var Inventory_2 = require("./Inventory");
Object.defineProperty(exports, "InventoryModel", { enumerable: true, get: function () { return __importDefault(Inventory_2).default; } });
Object.defineProperty(exports, "InventorySchema", { enumerable: true, get: function () { return Inventory_2.InventorySchema; } });
var InventoryMovement_2 = require("./InventoryMovement");
Object.defineProperty(exports, "InventoryMovementModel", { enumerable: true, get: function () { return __importDefault(InventoryMovement_2).default; } });
Object.defineProperty(exports, "InventoryMovementSchema", { enumerable: true, get: function () { return InventoryMovement_2.InventoryMovementSchema; } });
// Product Enhancement Models
var ProductImage_2 = require("./ProductImage");
Object.defineProperty(exports, "ProductImageModel", { enumerable: true, get: function () { return __importDefault(ProductImage_2).default; } });
Object.defineProperty(exports, "ProductImageSchema", { enumerable: true, get: function () { return ProductImage_2.ProductImageSchema; } });
var ProductReview_2 = require("./ProductReview");
Object.defineProperty(exports, "ProductReviewModel", { enumerable: true, get: function () { return __importDefault(ProductReview_2).default; } });
Object.defineProperty(exports, "ProductReviewSchema", { enumerable: true, get: function () { return ProductReview_2.ProductReviewSchema; } });
var WishlistItem_2 = require("./WishlistItem");
Object.defineProperty(exports, "WishlistItemModel", { enumerable: true, get: function () { return __importDefault(WishlistItem_2).default; } });
Object.defineProperty(exports, "WishlistItemSchema", { enumerable: true, get: function () { return WishlistItem_2.WishlistItemSchema; } });
// Authentication & Session Models
var OTPCode_2 = require("./OTPCode");
Object.defineProperty(exports, "OTPCodeModel", { enumerable: true, get: function () { return __importDefault(OTPCode_2).default; } });
Object.defineProperty(exports, "OTPCodeSchema", { enumerable: true, get: function () { return OTPCode_2.OTPCodeSchema; } });
var Session_2 = require("./Session");
Object.defineProperty(exports, "SessionModel", { enumerable: true, get: function () { return __importDefault(Session_2).default; } });
Object.defineProperty(exports, "SessionSchema", { enumerable: true, get: function () { return Session_2.SessionSchema; } });
// Payment & Transaction Models
var PaymentTransaction_2 = require("./PaymentTransaction");
Object.defineProperty(exports, "PaymentTransactionModel", { enumerable: true, get: function () { return __importDefault(PaymentTransaction_2).default; } });
Object.defineProperty(exports, "PaymentTransactionSchema", { enumerable: true, get: function () { return PaymentTransaction_2.PaymentTransactionSchema; } });
var StockReservation_2 = require("./StockReservation");
Object.defineProperty(exports, "StockReservationModel", { enumerable: true, get: function () { return __importDefault(StockReservation_2).default; } });
Object.defineProperty(exports, "StockReservationSchema", { enumerable: true, get: function () { return StockReservation_2.StockReservationSchema; } });
// Order Enhancement Models
var OrderTimelineEvent_2 = require("./OrderTimelineEvent");
Object.defineProperty(exports, "OrderTimelineEventModel", { enumerable: true, get: function () { return __importDefault(OrderTimelineEvent_2).default; } });
Object.defineProperty(exports, "OrderTimelineEventSchema", { enumerable: true, get: function () { return OrderTimelineEvent_2.OrderTimelineEventSchema; } });
// Marketing & Communication Models
var Coupon_2 = require("./Coupon");
Object.defineProperty(exports, "CouponModel", { enumerable: true, get: function () { return __importDefault(Coupon_2).default; } });
Object.defineProperty(exports, "CouponSchema", { enumerable: true, get: function () { return Coupon_2.CouponSchema; } });
var Notification_2 = require("./Notification");
Object.defineProperty(exports, "NotificationModel", { enumerable: true, get: function () { return __importDefault(Notification_2).default; } });
Object.defineProperty(exports, "NotificationSchema", { enumerable: true, get: function () { return Notification_2.NotificationSchema; } });
// Grouped exports for convenience
exports.ProductModels = {
    Product: Product_1.default,
    Category: Category_1.default,
    ProductImage: ProductImage_1.default,
    ProductReview: ProductReview_1.default,
    WishlistItem: WishlistItem_1.default,
};
exports.ShoppingModels = {
    Cart: Cart_1.default,
    CartItem: CartItem_1.default,
    Order: Order_1.default,
    OrderItem: OrderItem_1.default,
    OrderTimelineEvent: OrderTimelineEvent_1.default,
};
exports.InventoryModels = {
    Inventory: Inventory_1.default,
    InventoryMovement: InventoryMovement_1.default,
    StockReservation: StockReservation_1.default,
};
exports.AuthModels = {
    User: User_1.default,
    Address: Address_1.default,
    OTPCode: OTPCode_1.default,
    Session: Session_1.default,
};
exports.PaymentModels = {
    PaymentTransaction: PaymentTransaction_1.default,
    Coupon: Coupon_1.default,
};
exports.CommunicationModels = {
    Notification: Notification_1.default,
};
// All models in one object for dynamic access
exports.AllModels = {
    // User Management
    User: User_1.default,
    Address: Address_1.default,
    OTPCode: OTPCode_1.default,
    Session: Session_1.default,
    // Product Catalog
    Product: Product_1.default,
    Category: Category_1.default,
    ProductImage: ProductImage_1.default,
    ProductReview: ProductReview_1.default,
    WishlistItem: WishlistItem_1.default,
    // Shopping & Orders
    Cart: Cart_1.default,
    CartItem: CartItem_1.default,
    Order: Order_1.default,
    OrderItem: OrderItem_1.default,
    OrderTimelineEvent: OrderTimelineEvent_1.default,
    // Inventory Management
    Inventory: Inventory_1.default,
    InventoryMovement: InventoryMovement_1.default,
    StockReservation: StockReservation_1.default,
    // Payments & Marketing
    PaymentTransaction: PaymentTransaction_1.default,
    Coupon: Coupon_1.default,
    Notification: Notification_1.default,
};
// Schema definitions for documentation/migration purposes
exports.AllSchemas = {
    User: User_1.UserSchema,
    Address: Address_1.AddressSchema,
    Product: Product_1.ProductSchema,
    Category: Category_1.CategorySchema,
    Cart: Cart_1.CartSchema,
    CartItem: CartItem_1.CartItemSchema,
    Order: Order_1.OrderSchema,
    OrderItem: OrderItem_1.OrderItemSchema,
    Inventory: Inventory_1.InventorySchema,
    InventoryMovement: InventoryMovement_1.InventoryMovementSchema,
};
// Model names for dynamic operations
exports.ModelNames = Object.keys(exports.AllModels);
// Usage Examples:
/*
// Import individual models
import { UserModel, ProductModel } from './models';

// Import grouped models
import { UserModels, ShoppingModels } from './models';

// Import all models
import { AllModels } from './models';

// Dynamic model access
const modelName: ModelName = 'User';
const model = AllModels[modelName];

// Use in services
const userService = new UserService(UserModel);
const orderService = new OrderService(OrderModel);
*/
//# sourceMappingURL=index.js.map