"use strict";
// src/controllers/index.ts
// Central barrel export for all controllers
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = exports.WishlistController = exports.AddressController = exports.UserController = exports.OrderController = exports.CartController = exports.SearchController = exports.ReviewController = exports.CategoryController = exports.ProductController = exports.OTPController = exports.AuthController = exports.BaseAdminController = exports.BaseController = void 0;
// Base Controllers
var BaseController_1 = require("./BaseController");
Object.defineProperty(exports, "BaseController", { enumerable: true, get: function () { return BaseController_1.BaseController; } });
var BaseAdminController_1 = require("./BaseAdminController");
Object.defineProperty(exports, "BaseAdminController", { enumerable: true, get: function () { return BaseAdminController_1.BaseAdminController; } });
// Authentication Controllers
var AuthController_1 = require("./auth/AuthController");
Object.defineProperty(exports, "AuthController", { enumerable: true, get: function () { return AuthController_1.AuthController; } });
var OTPController_1 = require("./auth/OTPController");
Object.defineProperty(exports, "OTPController", { enumerable: true, get: function () { return OTPController_1.OTPController; } });
// Product Controllers
var ProductController_1 = require("./products/ProductController");
Object.defineProperty(exports, "ProductController", { enumerable: true, get: function () { return ProductController_1.ProductController; } });
var CategoryController_1 = require("./products/CategoryController");
Object.defineProperty(exports, "CategoryController", { enumerable: true, get: function () { return CategoryController_1.CategoryController; } });
var ReviewController_1 = require("./products/ReviewController");
Object.defineProperty(exports, "ReviewController", { enumerable: true, get: function () { return ReviewController_1.ReviewController; } });
var SearchController_1 = require("./products/SearchController");
Object.defineProperty(exports, "SearchController", { enumerable: true, get: function () { return SearchController_1.SearchController; } });
// Cart & Order Controllers
var CartController_1 = require("./cart/CartController");
Object.defineProperty(exports, "CartController", { enumerable: true, get: function () { return CartController_1.CartController; } });
var OrderController_1 = require("./orders/OrderController");
Object.defineProperty(exports, "OrderController", { enumerable: true, get: function () { return OrderController_1.OrderController; } });
// User Controllers
var UserController_1 = require("./users/UserController");
Object.defineProperty(exports, "UserController", { enumerable: true, get: function () { return UserController_1.UserController; } });
var AddressController_1 = require("./users/AddressController");
Object.defineProperty(exports, "AddressController", { enumerable: true, get: function () { return AddressController_1.AddressController; } });
var WishlistController_1 = require("./users/WishlistController");
Object.defineProperty(exports, "WishlistController", { enumerable: true, get: function () { return WishlistController_1.WishlistController; } });
// Upload Controller
var UploadController_1 = require("./upload/UploadController");
Object.defineProperty(exports, "UploadController", { enumerable: true, get: function () { return UploadController_1.UploadController; } });
// Re-export for convenience
__exportStar(require("./BaseController"), exports);
__exportStar(require("./BaseAdminController"), exports);
__exportStar(require("./auth/AuthController"), exports);
__exportStar(require("./auth/OTPController"), exports);
__exportStar(require("./products/ProductController"), exports);
__exportStar(require("./products/CategoryController"), exports);
__exportStar(require("./products/ReviewController"), exports);
__exportStar(require("./products/SearchController"), exports);
__exportStar(require("./cart/CartController"), exports);
__exportStar(require("./orders/OrderController"), exports);
__exportStar(require("./users/UserController"), exports);
__exportStar(require("./users/AddressController"), exports);
__exportStar(require("./users/WishlistController"), exports);
__exportStar(require("./upload/UploadController"), exports);
//# sourceMappingURL=index.js.map