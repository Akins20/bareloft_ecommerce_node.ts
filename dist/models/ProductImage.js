"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductImageSchema = exports.ProductImageModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// ProductImage Model Schema
exports.ProductImageModel = prisma.productImage;
// ProductImage Schema Definition for Prisma
exports.ProductImageSchema = `
model ProductImage {
  id        String   @id @default(cuid())
  productId String   @map("product_id")
  imageUrl  String   @map("image_url")
  altText   String?  @map("alt_text")
  sortOrder Int      @default(0) @map("sort_order")
  isPrimary Boolean  @default(false) @map("is_primary")
  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@map("product_images")
}
`;
exports.default = exports.ProductImageModel;
//# sourceMappingURL=ProductImage.js.map