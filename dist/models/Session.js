"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionSchema = exports.SessionModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Session Model Schema
exports.SessionModel = prisma.session;
// Session Schema Definition for Prisma
exports.SessionSchema = `
model Session {
  id           String    @id @default(cuid())
  userId       String    @map("user_id")
  accessToken  String    @unique @map("access_token")
  refreshToken String    @unique @map("refresh_token")
  deviceInfo   Json?     @map("device_info")
  ipAddress    String?   @map("ip_address")
  userAgent    String?   @map("user_agent")
  isActive     Boolean   @default(true) @map("is_active")
  expiresAt    DateTime  @map("expires_at")
  lastUsedAt   DateTime? @map("last_used_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  // Relations
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}
`;
exports.default = exports.SessionModel;
//# sourceMappingURL=Session.js.map