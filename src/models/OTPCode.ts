import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// OTPCode Model Schema
export const OTPCodeModel = prisma.oTPCode;

// OTPCode Schema Definition for Prisma
export const OTPCodeSchema = `
model OTPCode {
  id          String   @id @default(cuid())
  phoneNumber String   @map("phone_number")
  code        String
  purpose     String   @default("login") // login, signup, password_reset
  expiresAt   DateTime @map("expires_at")
  isUsed      Boolean  @default(false) @map("is_used")
  attempts    Int      @default(0)
  userId      String?  @map("user_id")
  createdAt   DateTime @default(now()) @map("created_at")

  // Relations
  user        User?    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("otp_codes")
}
`;

export default OTPCodeModel;
