// src/models/Category.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Category Model Schema
export const CategoryModel = prisma.category;

// Category Schema Definition for Prisma
export const CategorySchema = `
model Category {
  id          String     @id @default(cuid())
  name        String
  slug        String     @unique
  description String?
  image       String?
  parentId    String?    @map("parent_id")
  isActive    Boolean    @default(true) @map("is_active")
  sortOrder   Int        @default(0) @map("sort_order")
  seoTitle    String?    @map("seo_title")
  seoDescription String? @map("seo_description")
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")

  // Relations
  parent      Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryHierarchy")
  products    Product[]

  @@map("categories")
}
`;

export default CategoryModel;
