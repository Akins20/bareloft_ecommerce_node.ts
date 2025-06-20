import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Session Model Schema
export const SessionModel = prisma.session;

// Session Schema Definition for Prisma
export const SessionSchema = `
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

export default SessionModel;
