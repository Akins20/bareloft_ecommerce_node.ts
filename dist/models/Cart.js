"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartSchema = exports.CartModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Cart Model Schema
exports.CartModel = prisma.cart;
// Cart Schema Definition for Prisma
exports.CartSchema = `
model Cart {
  id               String             @id @default(cuid())
  userId           String?            @unique @map("user_id")
  sessionId        String?            @map("session_id")
  subtotal         Decimal            @default(0) @db.Decimal(10, 2)
  estimatedTax     Decimal            @default(0) @map("estimated_tax") @db.Decimal(10, 2)
  estimatedShipping Decimal           @default(0) @map("estimated_shipping") @db.Decimal(10, 2)
  estimatedTotal   Decimal            @default(0) @map("estimated_total") @db.Decimal(10, 2)
  currency         String             @default("NGN")
  appliedCoupon    Json?              @map("applied_coupon") // {code, discountAmount, discountType}
  shippingAddress  Json?              @map("shipping_address") // {state, city, postalCode}
  expiresAt        DateTime?          @map("expires_at")
  createdAt        DateTime           @default(now()) @map("created_at")
  updatedAt        DateTime           @updatedAt @map("updated_at")

  // Relations
  user             User?              @relation(fields: [userId], references: [id], onDelete: Cascade)
  items            CartItem[]
  reservations     StockReservation[]

  @@map("carts")
}
`;
exports.default = exports.CartModel;
//# sourceMappingURL=Cart.js.map