import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// WishlistItem Model Schema
export const WishlistItemModel = prisma.wishlistItem;

// WishlistItem Schema Definition for Prisma
export const WishlistItemSchema = `
model WishlistItem {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  productId String   @map("product_id")
  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([userId, productId])
  @@map("wishlist_items")
}
`;

export default WishlistItemModel;
