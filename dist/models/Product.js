"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductSchema = exports.ProductModel = void 0;
// src/models/Product.ts
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Product Model Schema
exports.ProductModel = prisma.product;
// Product Schema Definition for Prisma
exports.ProductSchema = `
model Product {
  id                String         @id @default(cuid())
  name              String
  slug              String         @unique
  description       String?
  shortDescription  String?        @map("short_description")
  sku               String         @unique
  price             Decimal        @db.Decimal(10, 2)
  comparePrice      Decimal?       @map("compare_price") @db.Decimal(10, 2)
  costPrice         Decimal?       @map("cost_price") @db.Decimal(10, 2)
  categoryId        String         @map("category_id")
  brand             String?
  weight            Decimal?       @db.Decimal(8, 3)
  dimensions        Json?          // {length, width, height, unit}
  isActive          Boolean        @default(true) @map("is_active")
  isFeatured        Boolean        @default(false) @map("is_featured")
  seoTitle          String?        @map("seo_title")
  seoDescription    String?        @map("seo_description")
  createdAt         DateTime       @default(now()) @map("created_at")
  updatedAt         DateTime       @updatedAt @map("updated_at")

  // Relations
  category          Category       @relation(fields: [categoryId], references: [id])
  images            ProductImage[]
  reviews           ProductReview[]
  inventory         Inventory?
  cartItems         CartItem[]
  orderItems        OrderItem[]
  wishlistItems     WishlistItem[]
  movements         InventoryMovement[]

  @@map("products")
}
`;
exports.default = exports.ProductModel;
//# sourceMappingURL=Product.js.map