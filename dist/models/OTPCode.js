"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTPCodeSchema = exports.OTPCodeModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// OTPCode Model Schema
exports.OTPCodeModel = prisma.oTPCode;
// OTPCode Schema Definition for Prisma
exports.OTPCodeSchema = `
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
exports.default = exports.OTPCodeModel;
//# sourceMappingURL=OTPCode.js.map