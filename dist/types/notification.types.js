"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationPriority = exports.NotificationStatus = exports.NotificationChannel = exports.NotificationType = void 0;
var NotificationType;
(function (NotificationType) {
    // Order Notifications
    NotificationType["ORDER_CONFIRMATION"] = "order_confirmation";
    NotificationType["ORDER_SHIPPED"] = "order_shipped";
    NotificationType["ORDER_DELIVERED"] = "order_delivered";
    NotificationType["ORDER_CANCELLED"] = "order_cancelled";
    NotificationType["ORDER_REFUNDED"] = "order_refunded";
    // Payment Notifications
    NotificationType["PAYMENT_SUCCESSFUL"] = "payment_successful";
    NotificationType["PAYMENT_FAILED"] = "payment_failed";
    NotificationType["PAYMENT_PENDING"] = "payment_pending";
    NotificationType["REFUND_PROCESSED"] = "refund_processed";
    // Account Notifications
    NotificationType["ACCOUNT_CREATED"] = "account_created";
    NotificationType["ACCOUNT_VERIFIED"] = "account_verified";
    NotificationType["PASSWORD_RESET"] = "password_reset";
    NotificationType["LOGIN_ALERT"] = "login_alert";
    // Inventory Notifications (Admin) - Enhanced Phase 2.2
    NotificationType["LOW_STOCK_ALERT"] = "low_stock_alert";
    NotificationType["OUT_OF_STOCK_ALERT"] = "out_of_stock_alert";
    NotificationType["CRITICAL_STOCK_ALERT"] = "critical_stock_alert";
    NotificationType["RESTOCK_NEEDED"] = "restock_needed";
    NotificationType["REORDER_SUGGESTION"] = "reorder_suggestion";
    NotificationType["REORDER_APPROVED"] = "reorder_approved";
    NotificationType["REORDER_COMPLETED"] = "reorder_completed";
    NotificationType["SLOW_MOVING_ALERT"] = "slow_moving_alert";
    NotificationType["FAST_MOVING_ALERT"] = "fast_moving_alert";
    NotificationType["OVERSTOCK_ALERT"] = "overstock_alert";
    NotificationType["NEGATIVE_STOCK_ALERT"] = "negative_stock_alert";
    NotificationType["SUPPLIER_ALERT"] = "supplier_alert";
    // Marketing Notifications
    NotificationType["WELCOME_SERIES"] = "welcome_series";
    NotificationType["ABANDONED_CART"] = "abandoned_cart";
    NotificationType["PRODUCT_BACK_IN_STOCK"] = "product_back_in_stock";
    NotificationType["NEWSLETTER"] = "newsletter";
    NotificationType["PROMOTIONAL"] = "promotional";
    // System Notifications
    NotificationType["SYSTEM_MAINTENANCE"] = "system_maintenance";
    NotificationType["SECURITY_ALERT"] = "security_alert";
    NotificationType["FEATURE_ANNOUNCEMENT"] = "feature_announcement";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["EMAIL"] = "email";
    NotificationChannel["SMS"] = "sms";
    NotificationChannel["PUSH"] = "push";
    NotificationChannel["IN_APP"] = "in_app";
    NotificationChannel["WHATSAPP"] = "whatsapp";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
var NotificationStatus;
(function (NotificationStatus) {
    NotificationStatus["PENDING"] = "pending";
    NotificationStatus["QUEUED"] = "queued";
    NotificationStatus["SENT"] = "sent";
    NotificationStatus["DELIVERED"] = "delivered";
    NotificationStatus["FAILED"] = "failed";
    NotificationStatus["CANCELLED"] = "cancelled";
})(NotificationStatus || (exports.NotificationStatus = NotificationStatus = {}));
var NotificationPriority;
(function (NotificationPriority) {
    NotificationPriority["LOW"] = "low";
    NotificationPriority["NORMAL"] = "normal";
    NotificationPriority["HIGH"] = "high";
    NotificationPriority["URGENT"] = "urgent";
})(NotificationPriority || (exports.NotificationPriority = NotificationPriority = {}));
//# sourceMappingURL=notification.types.js.map