import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ProductReview Model Schema
export const ProductReviewModel = prisma.productReview;

// ProductReview Schema Definition for Prisma
export const ProductReviewSchema = `
model ProductReview {
  id          String   @id @default(cuid())
  productId   String   @map("product_id")
  userId      String   @map("user_id")
  orderId     String?  @map("order_id") // For verified purchases
  rating      Int      @db.SmallInt
  title       String?
  comment     String?
  isVerified  Boolean  @default(false) @map("is_verified")
  isApproved  Boolean  @default(true) @map("is_approved")
  helpfulVotes Int     @default(0) @map("helpful_votes")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  order       Order?   @relation(fields: [orderId], references: [id])

  @@unique([productId, userId, orderId])
  @@map("product_reviews")
}
`;

export default ProductReviewModel;
