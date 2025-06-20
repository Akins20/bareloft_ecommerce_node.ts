// src/models/index.ts
// Central barrel export for all database models
// This provides a clean import interface for the entire application

import AddressModel, { AddressSchema } from "./Address";
import CartModel, { CartSchema } from "./Cart";
import CartItemModel, { CartItemSchema } from "./CartItem";
import CategoryModel, { CategorySchema } from "./Category";
import CouponModel from "./Coupon";
import InventoryModel, { InventorySchema } from "./Inventory";
import InventoryMovementModel, { InventoryMovementSchema } from "./InventoryMovement";
import NotificationModel from "./Notification";
import OrderModel, { OrderSchema } from "./Order";
import OrderItemModel, { OrderItemSchema } from "./OrderItem";
import OrderTimelineEventModel from "./OrderTimelineEvent";
import OTPCodeModel from "./OTPCode";
import PaymentTransactionModel from "./PaymentTransactio";
import ProductModel, { ProductSchema } from "./Product";
import ProductImageModel from "./ProductImage";
import ProductReviewModel from "./ProductReview";
import SessionModel from "./Session";
import StockReservationModel from "./StockReservation";
import UserModel, { UserSchema } from "./User";
import WishlistItemModel from "./WishlistItem";

// Core User Models
export { default as UserModel, UserSchema } from "./User";
export { default as AddressModel, AddressSchema } from "./Address";

// Product Catalog Models
export { default as ProductModel, ProductSchema } from "./Product";
export { default as CategoryModel, CategorySchema } from "./Category";

// Shopping & Orders Models
export { default as CartModel, CartSchema } from "./Cart";
export { default as CartItemModel, CartItemSchema } from "./CartItem";
export { default as OrderModel, OrderSchema } from "./Order";
export { default as OrderItemModel, OrderItemSchema } from "./OrderItem";

// Inventory Management Models
export { default as InventoryModel, InventorySchema } from "./Inventory";
export {
  default as InventoryMovementModel,
  InventoryMovementSchema,
} from "./InventoryMovement";

// Product Enhancement Models
export {
  default as ProductImageModel,
  ProductImageSchema,
} from "./ProductImage";
export {
  default as ProductReviewModel,
  ProductReviewSchema,
} from "./ProductReview";
export {
  default as WishlistItemModel,
  WishlistItemSchema,
} from "./WishlistItem";

// Authentication & Session Models
export { default as OTPCodeModel, OTPCodeSchema } from "./OTPCode";
export { default as SessionModel, SessionSchema } from "./Session";

// Payment & Transaction Models
export {
  default as PaymentTransactionModel,
  PaymentTransactionSchema,
} from "./PaymentTransaction";
export {
  default as StockReservationModel,
  StockReservationSchema,
} from "./StockReservation";

// Order Enhancement Models
export {
  default as OrderTimelineEventModel,
  OrderTimelineEventSchema,
} from "./OrderTimelineEvent";

// Marketing & Communication Models
export { default as CouponModel, CouponSchema } from "./Coupon";
export {
  default as NotificationModel,
  NotificationSchema,
} from "./Notification";

// Grouped exports for convenience
export const ProductModels = {
  Product: ProductModel,
  Category: CategoryModel,
  ProductImage: ProductImageModel,
  ProductReview: ProductReviewModel,
  WishlistItem: WishlistItemModel,
};

export const ShoppingModels = {
  Cart: CartModel,
  CartItem: CartItemModel,
  Order: OrderModel,
  OrderItem: OrderItemModel,
  OrderTimelineEvent: OrderTimelineEventModel,
};

export const InventoryModels = {
  Inventory: InventoryModel,
  InventoryMovement: InventoryMovementModel,
  StockReservation: StockReservationModel,
};

export const AuthModels = {
  User: UserModel,
  Address: AddressModel,
  OTPCode: OTPCodeModel,
  Session: SessionModel,
};

export const PaymentModels = {
  PaymentTransaction: PaymentTransactionModel,
  Coupon: CouponModel,
};

export const CommunicationModels = {
  Notification: NotificationModel,
};

// All models in one object for dynamic access
export const AllModels = {
  // User Management
  User: UserModel,
  Address: AddressModel,
  OTPCode: OTPCodeModel,
  Session: SessionModel,

  // Product Catalog
  Product: ProductModel,
  Category: CategoryModel,
  ProductImage: ProductImageModel,
  ProductReview: ProductReviewModel,
  WishlistItem: WishlistItemModel,

  // Shopping & Orders
  Cart: CartModel,
  CartItem: CartItemModel,
  Order: OrderModel,
  OrderItem: OrderItemModel,
  OrderTimelineEvent: OrderTimelineEventModel,

  // Inventory Management
  Inventory: InventoryModel,
  InventoryMovement: InventoryMovementModel,
  StockReservation: StockReservationModel,

  // Payments & Marketing
  PaymentTransaction: PaymentTransactionModel,
  Coupon: CouponModel,
  Notification: NotificationModel,
};

// Schema definitions for documentation/migration purposes
export const AllSchemas = {
  User: UserSchema,
  Address: AddressSchema,
  Product: ProductSchema,
  Category: CategorySchema,
  Cart: CartSchema,
  CartItem: CartItemSchema,
  Order: OrderSchema,
  OrderItem: OrderItemSchema,
  Inventory: InventorySchema,
  InventoryMovement: InventoryMovementSchema,
};

// Model names for dynamic operations
export const ModelNames = Object.keys(AllModels);

// Export types for better TypeScript support
export type ModelName = keyof typeof AllModels;
export type ModelType = (typeof AllModels)[ModelName];

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
