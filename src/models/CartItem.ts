import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// CartItem Model Schema
export const CartItemModel = prisma.cartItem;

// CartItem Schema Definition for Prisma
export const CartItemSchema = `
model CartItem {
  id         String   @id @default(cuid())
  cartId     String   @map("cart_id")
  productId  String   @map("product_id")
  quantity   Int
  unitPrice  Decimal  @map("unit_price") @db.Decimal(10, 2)
  totalPrice Decimal  @map("total_price") @db.Decimal(10, 2)
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  // Relations
  cart       Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([cartId, productId])
  @@map("cart_items")
}
`;

export default CartItemModel;
