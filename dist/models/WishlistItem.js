"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WishlistItemSchema = exports.WishlistItemModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// WishlistItem Model Schema
exports.WishlistItemModel = prisma.wishlistItem;
// WishlistItem Schema Definition for Prisma
exports.WishlistItemSchema = `
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
exports.default = exports.WishlistItemModel;
//# sourceMappingURL=WishlistItem.js.map