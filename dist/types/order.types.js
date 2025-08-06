"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMethod = exports.PaymentStatus = exports.OrderStatus = void 0;
var OrderStatus;
(function (OrderStatus) {
    OrderStatus[OrderStatus["PENDING"] = 0] = "PENDING";
    OrderStatus[OrderStatus["CONFIRMED"] = 1] = "CONFIRMED";
    OrderStatus[OrderStatus["PROCESSING"] = 2] = "PROCESSING";
    OrderStatus[OrderStatus["SHIPPED"] = 3] = "SHIPPED";
    OrderStatus[OrderStatus["DELIVERED"] = 4] = "DELIVERED";
    OrderStatus[OrderStatus["CANCELLED"] = 5] = "CANCELLED";
    OrderStatus[OrderStatus["REFUNDED"] = 6] = "REFUNDED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus[PaymentStatus["PENDING"] = 0] = "PENDING";
    PaymentStatus[PaymentStatus["PROCESSING"] = 1] = "PROCESSING";
    PaymentStatus[PaymentStatus["COMPLETED"] = 2] = "COMPLETED";
    PaymentStatus[PaymentStatus["FAILED"] = 3] = "FAILED";
    PaymentStatus[PaymentStatus["CANCELLED"] = 4] = "CANCELLED";
    PaymentStatus[PaymentStatus["REFUNDED"] = 5] = "REFUNDED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CARD"] = "card";
    PaymentMethod["BANK_TRANSFER"] = "bank_transfer";
    PaymentMethod["USSD"] = "ussd";
    PaymentMethod["WALLET"] = "wallet";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
//# sourceMappingURL=order.types.js.map