"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressSchema = exports.AddressModel = void 0;
// src/models/Address.ts
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Address Model Schema
exports.AddressModel = prisma.address;
// Address Schema Definition for Prisma
exports.AddressSchema = `
model Address {
  id            String   @id @default(cuid())
  userId        String   @map("user_id")
  type          String   @default("shipping") // shipping, billing
  firstName     String   @map("first_name")
  lastName      String   @map("last_name")
  company       String?
  addressLine1  String   @map("address_line_1")
  addressLine2  String?  @map("address_line_2")
  city          String
  state         String
  postalCode    String?  @map("postal_code")
  country       String   @default("NG")
  phoneNumber   String   @map("phone_number")
  isDefault     Boolean  @default(false) @map("is_default")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  // Relations
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("addresses")
}
`;
exports.default = exports.AddressModel;
//# sourceMappingURL=Address.js.map