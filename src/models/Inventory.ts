import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Inventory Model Schema (maps to Product table since no separate inventory table exists)
export const InventoryModel = prisma.product;

// Inventory Schema Definition for Prisma
export const InventorySchema = `
model Inventory {
  id                String              @id @default(cuid())
  productId         String              @unique @map("product_id")
  quantity          Int                 @default(0)
  reservedQuantity  Int                 @default(0) @map("reserved_quantity")
  lowStockThreshold Int                 @default(10) @map("low_stock_threshold")
  reorderPoint      Int                 @default(5) @map("reorder_point")
  reorderQuantity   Int                 @default(50) @map("reorder_quantity")
  status            InventoryStatus     @default(ACTIVE)
  trackInventory    Boolean             @default(true) @map("track_inventory")
  allowBackorder    Boolean             @default(false) @map("allow_backorder")
  averageCost       Decimal             @default(0) @map("average_cost") @db.Decimal(10, 2)
  lastCost          Decimal             @default(0) @map("last_cost") @db.Decimal(10, 2)
  lastRestockedAt   DateTime?           @map("last_restocked_at")
  lastSoldAt        DateTime?           @map("last_sold_at")
  createdAt         DateTime            @default(now()) @map("created_at")
  updatedAt         DateTime            @updatedAt @map("updated_at")

  // Relations
  product           Product             @relation(fields: [productId], references: [id], onDelete: Cascade)
  movements         InventoryMovement[]
  reservations      StockReservation[]

  @@map("inventory")
}

enum InventoryStatus {
  ACTIVE
  INACTIVE
  DISCONTINUED
  OUT_OF_STOCK
  LOW_STOCK
  OVERSTOCKED
}
`;

export default InventoryModel;
