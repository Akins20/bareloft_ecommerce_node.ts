import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// OrderItem Model Schema
export const OrderItemModel = prisma.orderItem;

// OrderItem Schema Definition for Prisma
export const OrderItemSchema = `
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

export default OrderItemModel;
