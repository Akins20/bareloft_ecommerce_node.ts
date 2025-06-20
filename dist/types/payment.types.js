"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundStatus = exports.PaymentStatus = exports.PaymentChannel = exports.PaymentProvider = void 0;
var PaymentProvider;
(function (PaymentProvider) {
    PaymentProvider["PAYSTACK"] = "paystack";
    PaymentProvider["FLUTTERWAVE"] = "flutterwave";
    PaymentProvider["INTERNAL"] = "internal";
})(PaymentProvider || (exports.PaymentProvider = PaymentProvider = {}));
var PaymentChannel;
(function (PaymentChannel) {
    PaymentChannel["CARD"] = "card";
    PaymentChannel["BANK"] = "bank";
    PaymentChannel["USSD"] = "ussd";
    PaymentChannel["BANK_TRANSFER"] = "bank_transfer";
    PaymentChannel["MOBILE_MONEY"] = "mobile_money";
    PaymentChannel["QR"] = "qr";
    PaymentChannel["WALLET"] = "wallet";
})(PaymentChannel || (exports.PaymentChannel = PaymentChannel = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["PROCESSING"] = "processing";
    PaymentStatus["SUCCESS"] = "success";
    PaymentStatus["FAILED"] = "failed";
    PaymentStatus["CANCELLED"] = "cancelled";
    PaymentStatus["ABANDONED"] = "abandoned";
    PaymentStatus["EXPIRED"] = "expired";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var RefundStatus;
(function (RefundStatus) {
    RefundStatus["PENDING"] = "pending";
    RefundStatus["PROCESSING"] = "processing";
    RefundStatus["COMPLETED"] = "completed";
    RefundStatus["FAILED"] = "failed";
    RefundStatus["CANCELLED"] = "cancelled";
})(RefundStatus || (exports.RefundStatus = RefundStatus = {}));
//# sourceMappingURL=payment.types.js.map