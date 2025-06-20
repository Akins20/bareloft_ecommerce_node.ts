export { default as UserModel, UserSchema } from "./User";
export { default as AddressModel, AddressSchema } from "./Address";
export { default as ProductModel, ProductSchema } from "./Product";
export { default as CategoryModel, CategorySchema } from "./Category";
export { default as CartModel, CartSchema } from "./Cart";
export { default as CartItemModel, CartItemSchema } from "./CartItem";
export { default as OrderModel, OrderSchema } from "./Order";
export { default as OrderItemModel, OrderItemSchema } from "./OrderItem";
export { default as InventoryModel, InventorySchema } from "./Inventory";
export { default as InventoryMovementModel, InventoryMovementSchema, } from "./InventoryMovement";
export { default as ProductImageModel, ProductImageSchema, } from "./ProductImage";
export { default as ProductReviewModel, ProductReviewSchema, } from "./ProductReview";
export { default as WishlistItemModel, WishlistItemSchema, } from "./WishlistItem";
export { default as OTPCodeModel, OTPCodeSchema } from "./OTPCode";
export { default as SessionModel, SessionSchema } from "./Session";
export { default as PaymentTransactionModel, PaymentTransactionSchema, } from "./PaymentTransaction";
export { default as StockReservationModel, StockReservationSchema, } from "./StockReservation";
export { default as OrderTimelineEventModel, OrderTimelineEventSchema, } from "./OrderTimelineEvent";
export { default as CouponModel, CouponSchema } from "./Coupon";
export { default as NotificationModel, NotificationSchema, } from "./Notification";
export declare const ProductModels: {
    Product: any;
    Category: any;
    ProductImage: any;
    ProductReview: any;
    WishlistItem: any;
};
export declare const ShoppingModels: {
    Cart: any;
    CartItem: any;
    Order: any;
    OrderItem: any;
    OrderTimelineEvent: any;
};
export declare const InventoryModels: {
    Inventory: any;
    InventoryMovement: any;
    StockReservation: any;
};
export declare const AuthModels: {
    User: any;
    Address: any;
    OTPCode: any;
    Session: any;
};
export declare const PaymentModels: {
    PaymentTransaction: any;
    Coupon: any;
};
export declare const CommunicationModels: {
    Notification: any;
};
export declare const AllModels: {
    User: any;
    Address: any;
    OTPCode: any;
    Session: any;
    Product: any;
    Category: any;
    ProductImage: any;
    ProductReview: any;
    WishlistItem: any;
    Cart: any;
    CartItem: any;
    Order: any;
    OrderItem: any;
    OrderTimelineEvent: any;
    Inventory: any;
    InventoryMovement: any;
    StockReservation: any;
    PaymentTransaction: any;
    Coupon: any;
    Notification: any;
};
export declare const AllSchemas: {
    User: string;
    Address: string;
    Product: string;
    Category: string;
    Cart: string;
    CartItem: string;
    Order: string;
    OrderItem: string;
    Inventory: string;
    InventoryMovement: string;
};
export declare const ModelNames: string[];
export type ModelName = keyof typeof AllModels;
export type ModelType = (typeof AllModels)[ModelName];
//# sourceMappingURL=index.d.ts.map