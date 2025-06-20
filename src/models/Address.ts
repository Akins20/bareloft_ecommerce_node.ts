// src/models/Address.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Address Model Schema
export const AddressModel = prisma.address;

// Address Schema Definition for Prisma
export const AddressSchema = `
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

export default AddressModel;
