// src/controllers/index.ts
// Central barrel export for all controllers

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

// Base Controller
export { BaseController } from "./BaseController";

// Authentication Controllers
export { AuthController } from "./auth/AuthController";
export { OTPController } from "./auth/OTPController";

// Product Controllers
export { ProductController } from "./products/ProductController";
export { CategoryController } from "./products/CategoryController";
export { ReviewController } from "./products/ReviewController";
export { SearchController } from "./products/SearchController";

// Cart & Order Controllers
export { CartController } from "./cart/CartController";
export { OrderController } from "./orders/OrderController";

// User Controllers
export { UserController } from "./users/UserController";
export { AddressController } from "./users/AddressController";
export { WishlistController } from "./users/WishlistController";

// Upload Controller
export { UploadController } from "./upload/UploadController";

// Additional Controllers (to be imported as created)
// export { SessionController } from './auth/SessionController';
// export { CheckoutController } from './orders/CheckoutController';
// export { TrackingController } from './orders/TrackingController';
// export { ProfileController } from './users/ProfileController';
// export { PaymentController } from './payments/PaymentController';
// export { PaystackController } from './payments/PaystackController';
// export { WebhookController } from './payments/WebhookController';

// Grouped exports for convenience
export const AuthControllers = {
  Auth: AuthController,
  OTP: OTPController,
  // Session: SessionController,
};

export const ProductControllers = {
  Product: ProductController,
  Category: CategoryController,
  Review: ReviewController,
  Search: SearchController,
};

export const ShoppingControllers = {
  Cart: CartController,
  Order: OrderController,
  // Checkout: CheckoutController,
  // Tracking: TrackingController,
};

export const UserControllers = {
  User: UserController,
  Address: AddressController,
  Wishlist: WishlistController,
  // Profile: ProfileController,
};

export const UtilityControllers = {
  Upload: UploadController,
};

// export const PaymentControllers = {
//   Payment: PaymentController,
//   Paystack: PaystackController,
//   Webhook: WebhookController,
// };

// All controllers in one object for dynamic access
export const AllControllers = {
  // Authentication
  Auth: AuthController,
  OTP: OTPController,

  // Products
  Product: ProductController,
  Category: CategoryController,
  Review: ReviewController,
  Search: SearchController,

  // Shopping
  Cart: CartController,
  Order: OrderController,

  // Users
  User: UserController,
  Address: AddressController,
  Wishlist: WishlistController,

  // Utilities
  Upload: UploadController,
};

// Controller names for dynamic operations
export const ControllerNames = Object.keys(AllControllers);

// Export types for better TypeScript support
export type ControllerName = keyof typeof AllControllers;
export type ControllerType = (typeof AllControllers)[ControllerName];

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
export { BaseController } from "./BaseController";

// Authentication Controllers (already done)
export { AuthController } from "./auth/AuthController";

// Product Controllers
export { ProductController } from "./products/ProductController";
export { CategoryController } from "./products/CategoryController";

// Cart & Order Controllers
export { CartController } from "./cart/CartController";
export { OrderController } from "./orders/OrderController";

// User Controllers
export { UserController } from "./users/UserController";
export { AddressController } from "./users/AddressController";

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
export const AuthControllers = {
  Auth: AuthController,
  // OTP: OTPController,
  // Session: SessionController,
};

export const ProductControllers = {
  Product: ProductController,
  Category: CategoryController,
  // Review: ReviewController,
  // Search: SearchController,
};

export const ShoppingControllers = {
  Cart: CartController,
  Order: OrderController,
  // Checkout: CheckoutController,
  // Tracking: TrackingController,
};

export const UserControllers = {
  User: UserController,
  Address: AddressController,
  // Profile: ProfileController,
  // Wishlist: WishlistController,
};

// export const PaymentControllers = {
//   Payment: PaymentController,
//   Paystack: PaystackController,
//   Webhook: WebhookController,
// };

// All controllers in one object for dynamic access
export const AllControllers = {
  // Authentication
  Auth: AuthController,

  // Products
  Product: ProductController,
  Category: CategoryController,

  // Shopping
  Cart: CartController,
  Order: OrderController,

  // Users
  User: UserController,
  Address: AddressController,
};

// Controller names for dynamic operations
export const ControllerNames = Object.keys(AllControllers);

// Export types for better TypeScript support
export type ControllerName = keyof typeof AllControllers;
export type ControllerType = (typeof AllControllers)[ControllerName];

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
