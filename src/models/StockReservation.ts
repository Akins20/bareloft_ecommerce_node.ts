import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// StockReservation Model Schema
export const StockReservationModel = prisma.stockReservation;

// StockReservation Schema Definition for Prisma
export const StockReservationSchema = `
model StockReservation {
  id          String    @id @default(cuid())
  inventoryId String    @map("inventory_id")
  productId   String    @map("product_id")
  orderId     String?   @map("order_id")
  cartId      String?   @map("cart_id")
  quantity    Int
  reason      String
  expiresAt   DateTime  @map("expires_at")
  isReleased  Boolean   @default(false) @map("is_released")
  createdAt   DateTime  @default(now()) @map("created_at")
  releasedAt  DateTime? @map("released_at")

  // Relations
  inventory   Inventory @relation(fields: [inventoryId], references: [id])
  order       Order?    @relation(fields: [orderId], references: [id])
  cart        Cart?     @relation(fields: [cartId], references: [id])

  @@map("stock_reservations")
}
`;

export default StockReservationModel;
