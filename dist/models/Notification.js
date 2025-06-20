"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationSchema = exports.NotificationModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Notification Model Schema
exports.NotificationModel = prisma.notification;
// Notification Schema Definition for Prisma
exports.NotificationSchema = `
model Notification {
  id                  String             @id @default(cuid())
  userId              String?            @map("user_id")
  type                NotificationType
  channel             NotificationChannel
  templateId          String?            @map("template_id")
  subject             String?
  message             String
  htmlContent         String?            @map("html_content")
  recipientEmail      String?            @map("recipient_email")
  recipientPhone      String?            @map("recipient_phone")
  recipientName       String?            @map("recipient_name")
  status              NotificationStatus @default(PENDING)
  priority            String             @default("normal")
  providerMessageId   String?            @map("provider_message_id")
  deliveredAt         DateTime?          @map("delivered_at")
  readAt              DateTime?          @map("read_at")
  clickedAt           DateTime?          @map("clicked_at")
  errorMessage        String?            @map("error_message")
  retryCount          Int                @default(0) @map("retry_count")
  maxRetries          Int                @default(3) @map("max_retries")
  orderId             String?            @map("order_id")
  productId           String?            @map("product_id")
  referenceType       String?            @map("reference_type")
  referenceId         String?            @map("reference_id")
  metadata            Json?
  variables           Json?
  scheduledFor        DateTime?          @map("scheduled_for")
  expiresAt           DateTime?          @map("expires_at")
  createdAt           DateTime           @default(now()) @map("created_at")
  updatedAt           DateTime           @updatedAt @map("updated_at")

  // Relations
  user                User?              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notifications")
}

enum NotificationType {
  ORDER_CONFIRMATION
  ORDER_SHIPPED
  ORDER_DELIVERED
  ORDER_CANCELLED
  PAYMENT_SUCCESSFUL
  PAYMENT_FAILED
  LOW_STOCK_ALERT
  WELCOME_SERIES
  ABANDONED_CART
}

enum NotificationChannel {
  EMAIL
  SMS
  PUSH
  IN_APP
}

enum NotificationStatus {
  PENDING
  QUEUED
  SENT
  DELIVERED
  FAILED
  CANCELLED
}
`;
exports.default = exports.NotificationModel;
//# sourceMappingURL=Notification.js.map