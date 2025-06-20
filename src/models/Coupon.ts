import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Coupon Model Schema
export const CouponModel = prisma.coupon;

// Coupon Schema Definition for Prisma
export const CouponSchema = `
model Coupon {
  id                String    @id @default(cuid())
  code              String    @unique
  name              String
  description       String?
  discountType      String    // percentage, fixed
  discountValue     Decimal   @map("discount_value") @db.Decimal(10, 2)
  minimumAmount     Decimal?  @map("minimum_amount") @db.Decimal(10, 2)
  usageLimit        Int?      @map("usage_limit")
  usageCount        Int       @default(0) @map("usage_count")
  userUsageLimit    Int?      @map("user_usage_limit")
  isActive          Boolean   @default(true) @map("is_active")
  startsAt          DateTime? @map("starts_at")
  expiresAt         DateTime? @map("expires_at")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  @@map("coupons")
}
`;

export default CouponModel;
