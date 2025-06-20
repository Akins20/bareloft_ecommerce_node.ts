import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ProductImage Model Schema
export const ProductImageModel = prisma.productImage;

// ProductImage Schema Definition for Prisma
export const ProductImageSchema = `
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

export default ProductImageModel;
