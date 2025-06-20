"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderItemSchema = exports.OrderItemModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// OrderItem Model Schema
exports.OrderItemModel = prisma.orderItem;
// OrderItem Schema Definition for Prisma
exports.OrderItemSchema = `
model OrderItem {
  id           String   @id @default(cuid())
  orderId      String   @map("order_id")
  productId    String   @map("product_id")
  productName  String   @map("product_name")
  productSku   String   @map("product_sku")
  productImage String?  @map("product_image")
  quantity     Int
  unitPrice    Decimal  @map("unit_price") @db.Decimal(10, 2)
  totalPrice   Decimal  @map("total_price") @db.Decimal(10, 2)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // Relations
  order        Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product      Product  @relation(fields: [productId], references: [id])

  @@map("order_items")
}
`;
exports.default = exports.OrderItemModel;
//# sourceMappingURL=OrderItem.js.map