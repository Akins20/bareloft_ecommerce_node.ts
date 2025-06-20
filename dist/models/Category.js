"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategorySchema = exports.CategoryModel = void 0;
// src/models/Category.ts
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Category Model Schema
exports.CategoryModel = prisma.category;
// Category Schema Definition for Prisma
exports.CategorySchema = `
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
exports.default = exports.CategoryModel;
//# sourceMappingURL=Category.js.map