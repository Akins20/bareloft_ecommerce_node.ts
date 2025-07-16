// src/controllers/index.ts
// Central barrel export for all controllers

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

// Re-export for convenience
export * from "./BaseController";
export * from "./auth/AuthController";
export * from "./auth/OTPController";
export * from "./products/ProductController";
export * from "./products/CategoryController";
export * from "./products/ReviewController";
export * from "./products/SearchController";
export * from "./cart/CartController";
export * from "./orders/OrderController";
export * from "./users/UserController";
export * from "./users/AddressController";
export * from "./users/WishlistController";
export * from "./upload/UploadController";