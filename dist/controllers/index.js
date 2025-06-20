"use strict";
// src/controllers/index.ts
// Central barrel export for all controllers
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControllerNames = exports.AllControllers = exports.UtilityControllers = exports.UserControllers = exports.ShoppingControllers = exports.ProductControllers = exports.AuthControllers = exports.UploadController = exports.WishlistController = exports.AddressController = exports.UserController = exports.OrderController = exports.CartController = exports.SearchController = exports.ReviewController = exports.CategoryController = exports.ProductController = exports.OTPController = exports.AuthController = exports.BaseController = void 0;
const OTPController_1 = require("./auth/OTPController");
const CartController_1 = require("./cart/CartController");
const OrderController_1 = require("./orders/OrderController");
const CategoryController_1 = require("./products/CategoryController");
const ProductController_1 = require("./products/ProductController");
const ReviewController_1 = require("./products/ReviewController");
const SearchController_1 = require("./products/SearchController");
const UploadController_1 = require("./upload/UploadController");
const AddressController_1 = require("./users/AddressController");
const UserController_1 = require("./users/UserController");
const WishlistController_1 = require("./users/WishlistController");
// Base Controller
var BaseController_1 = require("./BaseController");
Object.defineProperty(exports, "BaseController", { enumerable: true, get: function () { return BaseController_1.BaseController; } });
// Authentication Controllers
var AuthController_1 = require("./auth/AuthController");
Object.defineProperty(exports, "AuthController", { enumerable: true, get: function () { return AuthController_1.AuthController; } });
var OTPController_2 = require("./auth/OTPController");
Object.defineProperty(exports, "OTPController", { enumerable: true, get: function () { return OTPController_2.OTPController; } });
// Product Controllers
var ProductController_2 = require("./products/ProductController");
Object.defineProperty(exports, "ProductController", { enumerable: true, get: function () { return ProductController_2.ProductController; } });
var CategoryController_2 = require("./products/CategoryController");
Object.defineProperty(exports, "CategoryController", { enumerable: true, get: function () { return CategoryController_2.CategoryController; } });
var ReviewController_2 = require("./products/ReviewController");
Object.defineProperty(exports, "ReviewController", { enumerable: true, get: function () { return ReviewController_2.ReviewController; } });
var SearchController_2 = require("./products/SearchController");
Object.defineProperty(exports, "SearchController", { enumerable: true, get: function () { return SearchController_2.SearchController; } });
// Cart & Order Controllers
var CartController_2 = require("./cart/CartController");
Object.defineProperty(exports, "CartController", { enumerable: true, get: function () { return CartController_2.CartController; } });
var OrderController_2 = require("./orders/OrderController");
Object.defineProperty(exports, "OrderController", { enumerable: true, get: function () { return OrderController_2.OrderController; } });
// User Controllers
var UserController_2 = require("./users/UserController");
Object.defineProperty(exports, "UserController", { enumerable: true, get: function () { return UserController_2.UserController; } });
var AddressController_2 = require("./users/AddressController");
Object.defineProperty(exports, "AddressController", { enumerable: true, get: function () { return AddressController_2.AddressController; } });
var WishlistController_2 = require("./users/WishlistController");
Object.defineProperty(exports, "WishlistController", { enumerable: true, get: function () { return WishlistController_2.WishlistController; } });
// Upload Controller
var UploadController_2 = require("./upload/UploadController");
Object.defineProperty(exports, "UploadController", { enumerable: true, get: function () { return UploadController_2.UploadController; } });
// Additional Controllers (to be imported as created)
// export { SessionController } from './auth/SessionController';
// export { CheckoutController } from './orders/CheckoutController';
// export { TrackingController } from './orders/TrackingController';
// export { ProfileController } from './users/ProfileController';
// export { PaymentController } from './payments/PaymentController';
// export { PaystackController } from './payments/PaystackController';
// export { WebhookController } from './payments/WebhookController';
// Grouped exports for convenience
exports.AuthControllers = {
    Auth: AuthController,
    OTP: OTPController_1.OTPController,
    // Session: SessionController,
};
exports.ProductControllers = {
    Product: ProductController_1.ProductController,
    Category: CategoryController_1.CategoryController,
    Review: ReviewController_1.ReviewController,
    Search: SearchController_1.SearchController,
};
exports.ShoppingControllers = {
    Cart: CartController_1.CartController,
    Order: OrderController_1.OrderController,
    // Checkout: CheckoutController,
    // Tracking: TrackingController,
};
exports.UserControllers = {
    User: UserController_1.UserController,
    Address: AddressController_1.AddressController,
    Wishlist: WishlistController_1.WishlistController,
    // Profile: ProfileController,
};
exports.UtilityControllers = {
    Upload: UploadController_1.UploadController,
};
// export const PaymentControllers = {
//   Payment: PaymentController,
//   Paystack: PaystackController,
//   Webhook: WebhookController,
// };
// All controllers in one object for dynamic access
exports.AllControllers = {
    // Authentication
    Auth: AuthController,
    OTP: OTPController_1.OTPController,
    // Products
    Product: ProductController_1.ProductController,
    Category: CategoryController_1.CategoryController,
    Review: ReviewController_1.ReviewController,
    Search: SearchController_1.SearchController,
    // Shopping
    Cart: CartController_1.CartController,
    Order: OrderController_1.OrderController,
    // Users
    User: UserController_1.UserController,
    Address: AddressController_1.AddressController,
    Wishlist: WishlistController_1.WishlistController,
    // Utilities
    Upload: UploadController_1.UploadController,
};
// Controller names for dynamic operations
exports.ControllerNames = Object.keys(exports.AllControllers);
// Usage Examples:
/*
// Import individual controllers
import { ProductController, UserController, ReviewController } from './controllers';

// Import grouped controllers
import { ProductControllers, UserControllers, AuthControllers } from './controllers';

// Import all controllers
import { AllControllers } from './controllers';

// Dynamic controller access
const controllerName: ControllerName = 'Product';
const controller = AllControllers[controllerName];

// Use in routes
const productController = new ProductController(productService);
const userController = new UserController(userService);
const reviewController = new ReviewController(reviewService);
const searchController = new SearchController(searchService);
const wishlistController = new WishlistController(wishlistService);
const uploadController = new UploadController(fileUploadService, imageProcessingService);

// Initialize with dependency injection
export const initializeControllers = (services: any) => {
  return {
    auth: new AuthController(services.authService),
    otp: new OTPController(services.otpService),
    product: new ProductController(services.productService),
    category: new CategoryController(services.categoryService),
    review: new ReviewController(services.reviewService),
    search: new SearchController(services.searchService),
    cart: new CartController(services.cartService),
    order: new OrderController(services.orderService),
    user: new UserController(services.userService),
    address: new AddressController(services.addressService),
    wishlist: new WishlistController(services.wishlistService),
    upload: new UploadController(services.fileUploadService, services.imageProcessingService),
  };
};
*/ // src/controllers/index.ts
// Central barrel export for all controllers
// Base Controller
var BaseController_2 = require("./BaseController");
Object.defineProperty(exports, "BaseController", { enumerable: true, get: function () { return BaseController_2.BaseController; } });
// Authentication Controllers (already done)
var AuthController_2 = require("./auth/AuthController");
Object.defineProperty(exports, "AuthController", { enumerable: true, get: function () { return AuthController_2.AuthController; } });
// Product Controllers
var ProductController_3 = require("./products/ProductController");
Object.defineProperty(exports, "ProductController", { enumerable: true, get: function () { return ProductController_3.ProductController; } });
var CategoryController_3 = require("./products/CategoryController");
Object.defineProperty(exports, "CategoryController", { enumerable: true, get: function () { return CategoryController_3.CategoryController; } });
// Cart & Order Controllers
var CartController_3 = require("./cart/CartController");
Object.defineProperty(exports, "CartController", { enumerable: true, get: function () { return CartController_3.CartController; } });
var OrderController_3 = require("./orders/OrderController");
Object.defineProperty(exports, "OrderController", { enumerable: true, get: function () { return OrderController_3.OrderController; } });
// User Controllers
var UserController_3 = require("./users/UserController");
Object.defineProperty(exports, "UserController", { enumerable: true, get: function () { return UserController_3.UserController; } });
var AddressController_3 = require("./users/AddressController");
Object.defineProperty(exports, "AddressController", { enumerable: true, get: function () { return AddressController_3.AddressController; } });
// Additional Controllers (to be imported as created)
// export { OTPController } from './auth/OTPController';
// export { SessionController } from './auth/SessionController';
// export { ReviewController } from './products/ReviewController';
// export { SearchController } from './products/SearchController';
// export { CheckoutController } from './orders/CheckoutController';
// export { TrackingController } from './orders/TrackingController';
// export { ProfileController } from './users/ProfileController';
// export { WishlistController } from './users/WishlistController';
// export { PaymentController } from './payments/PaymentController';
// export { PaystackController } from './payments/PaystackController';
// export { WebhookController } from './payments/WebhookController';
// export { UploadController } from './upload/UploadController';
// Grouped exports for convenience
exports.AuthControllers = {
    Auth: AuthController,
    // OTP: OTPController,
    // Session: SessionController,
};
exports.ProductControllers = {
    Product: ProductController_1.ProductController,
    Category: CategoryController_1.CategoryController,
    // Review: ReviewController,
    // Search: SearchController,
};
exports.ShoppingControllers = {
    Cart: CartController_1.CartController,
    Order: OrderController_1.OrderController,
    // Checkout: CheckoutController,
    // Tracking: TrackingController,
};
exports.UserControllers = {
    User: UserController_1.UserController,
    Address: AddressController_1.AddressController,
    // Profile: ProfileController,
    // Wishlist: WishlistController,
};
// export const PaymentControllers = {
//   Payment: PaymentController,
//   Paystack: PaystackController,
//   Webhook: WebhookController,
// };
// All controllers in one object for dynamic access
exports.AllControllers = {
    // Authentication
    Auth: AuthController,
    // Products
    Product: ProductController_1.ProductController,
    Category: CategoryController_1.CategoryController,
    // Shopping
    Cart: CartController_1.CartController,
    Order: OrderController_1.OrderController,
    // Users
    User: UserController_1.UserController,
    Address: AddressController_1.AddressController,
};
// Controller names for dynamic operations
exports.ControllerNames = Object.keys(exports.AllControllers);
// Usage Examples:
/*
// Import individual controllers
import { ProductController, UserController } from './controllers';

// Import grouped controllers
import { ProductControllers, UserControllers } from './controllers';

// Import all controllers
import { AllControllers } from './controllers';

// Dynamic controller access
const controllerName: ControllerName = 'Product';
const controller = AllControllers[controllerName];

// Use in routes
const productController = new ProductController(productService);
const userController = new UserController(userService);
*/
//# sourceMappingURL=index.js.map