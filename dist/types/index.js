"use strict";
// src/types/index.ts - Main Type Definitions Export
// This file serves as the central hub for all type definitions
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
exports.RefundStatus = exports.PaymentTransactionStatus = exports.PaymentChannel = exports.PaymentProvider = exports.createErrorResponse = exports.createSuccessResponse = exports.ERROR_CODES = exports.HTTP_STATUS = exports.AppError = void 0;
// Re-export all type definitions for clean imports
__exportStar(require("./common.types"), exports);
__exportStar(require("./user.types"), exports);
__exportStar(require("./product.types"), exports);
__exportStar(require("./session.types"), exports);
// Selective exports to avoid conflicts
var api_types_1 = require("./api.types");
Object.defineProperty(exports, "AppError", { enumerable: true, get: function () { return api_types_1.AppError; } });
Object.defineProperty(exports, "HTTP_STATUS", { enumerable: true, get: function () { return api_types_1.HTTP_STATUS; } });
Object.defineProperty(exports, "ERROR_CODES", { enumerable: true, get: function () { return api_types_1.ERROR_CODES; } });
Object.defineProperty(exports, "createSuccessResponse", { enumerable: true, get: function () { return api_types_1.createSuccessResponse; } });
Object.defineProperty(exports, "createErrorResponse", { enumerable: true, get: function () { return api_types_1.createErrorResponse; } });
__exportStar(require("./cart.types"), exports);
__exportStar(require("./order.types"), exports);
__exportStar(require("./return.types"), exports);
var payment_types_1 = require("./payment.types");
Object.defineProperty(exports, "PaymentProvider", { enumerable: true, get: function () { return payment_types_1.PaymentProvider; } });
Object.defineProperty(exports, "PaymentChannel", { enumerable: true, get: function () { return payment_types_1.PaymentChannel; } });
Object.defineProperty(exports, "PaymentTransactionStatus", { enumerable: true, get: function () { return payment_types_1.PaymentStatus; } });
Object.defineProperty(exports, "RefundStatus", { enumerable: true, get: function () { return payment_types_1.RefundStatus; } });
__exportStar(require("./inventory.types"), exports);
__exportStar(require("./notification.types"), exports);
__exportStar(require("./shipping.types"), exports);
__exportStar(require("./support.types"), exports);
//# sourceMappingURL=index.js.map