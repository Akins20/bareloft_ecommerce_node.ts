// src/models/User.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// User Model Schema
export const UserModel = prisma.user;

// User Schema Definition for Prisma
export const UserSchema = `
model User {
  id                String            @id @default(cuid())
  phoneNumber       String            @unique @map("phone_number")
  email             String?           @unique
  firstName         String            @map("first_name")
  lastName          String            @map("last_name")
  avatar            String?
  dateOfBirth       DateTime?         @map("date_of_birth")
  gender            String?
  role              UserRole          @default(CUSTOMER)
  status            UserStatus        @default(PENDING_VERIFICATION)
  isVerified        Boolean           @default(false) @map("is_verified")
  lastLoginAt       DateTime?         @map("last_login_at")
  createdAt         DateTime          @default(now()) @map("created_at")
  updatedAt         DateTime          @updatedAt @map("updated_at")

  // Relations
  addresses         Address[]
  orders            Order[]
  cart              Cart?
  reviews           ProductReview[]
  otpCodes          OTPCode[]
  sessions          Session[]
  wishlistItems     WishlistItem[]
  notifications     Notification[]
  
  @@map("users")
}

enum UserRole {
  CUSTOMER
  ADMIN
  SUPER_ADMIN
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  PENDING_VERIFICATION
}
`;

export default UserModel;
