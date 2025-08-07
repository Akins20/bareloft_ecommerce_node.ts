"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderPriority = exports.BulkJobStatus = exports.BulkOperationType = exports.PaymentMethod = exports.PaymentStatus = exports.OrderStatus = void 0;
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
// Bulk Processing Types
var BulkOperationType;
(function (BulkOperationType) {
    BulkOperationType["STATUS_UPDATE"] = "status_update";
    BulkOperationType["ASSIGN_STAFF"] = "assign_staff";
    BulkOperationType["CANCEL_ORDERS"] = "cancel_orders";
    BulkOperationType["PROCESS_REFUNDS"] = "process_refunds";
    BulkOperationType["SET_PRIORITY"] = "set_priority";
    BulkOperationType["EXPORT_DATA"] = "export_data";
    BulkOperationType["GENERATE_LABELS"] = "generate_labels";
    BulkOperationType["SEND_NOTIFICATIONS"] = "send_notifications";
    BulkOperationType["IMPORT_DATA"] = "import_data";
})(BulkOperationType || (exports.BulkOperationType = BulkOperationType = {}));
var BulkJobStatus;
(function (BulkJobStatus) {
    BulkJobStatus["PENDING"] = "pending";
    BulkJobStatus["PROCESSING"] = "processing";
    BulkJobStatus["COMPLETED"] = "completed";
    BulkJobStatus["FAILED"] = "failed";
    BulkJobStatus["CANCELLED"] = "cancelled";
    BulkJobStatus["PARTIALLY_COMPLETED"] = "partially_completed";
})(BulkJobStatus || (exports.BulkJobStatus = BulkJobStatus = {}));
var OrderPriority;
(function (OrderPriority) {
    OrderPriority["HIGH"] = "high";
    OrderPriority["NORMAL"] = "normal";
    OrderPriority["LOW"] = "low";
})(OrderPriority || (exports.OrderPriority = OrderPriority = {}));
//# sourceMappingURL=order.types.js.map