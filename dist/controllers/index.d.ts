import { OTPController } from "./auth/OTPController";
import { CartController } from "./cart/CartController";
import { OrderController } from "./orders/OrderController";
import { CategoryController } from "./products/CategoryController";
import { ProductController } from "./products/ProductController";
import { ReviewController } from "./products/ReviewController";
import { SearchController } from "./products/SearchController";
import { UploadController } from "./upload/UploadController";
import { AddressController } from "./users/AddressController";
import { UserController } from "./users/UserController";
import { WishlistController } from "./users/WishlistController";
export { BaseController } from "./BaseController";
export { AuthController } from "./auth/AuthController";
export { OTPController } from "./auth/OTPController";
export { ProductController } from "./products/ProductController";
export { CategoryController } from "./products/CategoryController";
export { ReviewController } from "./products/ReviewController";
export { SearchController } from "./products/SearchController";
export { CartController } from "./cart/CartController";
export { OrderController } from "./orders/OrderController";
export { UserController } from "./users/UserController";
export { AddressController } from "./users/AddressController";
export { WishlistController } from "./users/WishlistController";
export { UploadController } from "./upload/UploadController";
export declare const AuthControllers: {
    Auth: any;
    OTP: typeof OTPController;
};
export declare const ProductControllers: {
    Product: typeof ProductController;
    Category: typeof CategoryController;
    Review: typeof ReviewController;
    Search: typeof SearchController;
};
export declare const ShoppingControllers: {
    Cart: typeof CartController;
    Order: typeof OrderController;
};
export declare const UserControllers: {
    User: typeof UserController;
    Address: typeof AddressController;
    Wishlist: typeof WishlistController;
};
export declare const UtilityControllers: {
    Upload: typeof UploadController;
};
export declare const AllControllers: {
    Auth: any;
    OTP: typeof OTPController;
    Product: typeof ProductController;
    Category: typeof CategoryController;
    Review: typeof ReviewController;
    Search: typeof SearchController;
    Cart: typeof CartController;
    Order: typeof OrderController;
    User: typeof UserController;
    Address: typeof AddressController;
    Wishlist: typeof WishlistController;
    Upload: typeof UploadController;
};
export declare const ControllerNames: string[];
export type ControllerName = keyof typeof AllControllers;
export type ControllerType = (typeof AllControllers)[ControllerName];
export { BaseController } from "./BaseController";
export { AuthController } from "./auth/AuthController";
export { ProductController } from "./products/ProductController";
export { CategoryController } from "./products/CategoryController";
export { CartController } from "./cart/CartController";
export { OrderController } from "./orders/OrderController";
export { UserController } from "./users/UserController";
export { AddressController } from "./users/AddressController";
export declare const AuthControllers: {
    Auth: any;
};
export declare const ProductControllers: {
    Product: typeof ProductController;
    Category: typeof CategoryController;
};
export declare const ShoppingControllers: {
    Cart: typeof CartController;
    Order: typeof OrderController;
};
export declare const UserControllers: {
    User: typeof UserController;
    Address: typeof AddressController;
};
export declare const AllControllers: {
    Auth: any;
    Product: typeof ProductController;
    Category: typeof CategoryController;
    Cart: typeof CartController;
    Order: typeof OrderController;
    User: typeof UserController;
    Address: typeof AddressController;
};
export declare const ControllerNames: string[];
export type ControllerName = keyof typeof AllControllers;
export type ControllerType = (typeof AllControllers)[ControllerName];
//# sourceMappingURL=index.d.ts.map