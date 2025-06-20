"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryMovementSchema = exports.InventoryMovementModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// InventoryMovement Model Schema
exports.InventoryMovementModel = prisma.inventoryMovement;
// InventoryMovement Schema Definition for Prisma
exports.InventoryMovementSchema = `
model InventoryMovement {
  id               String                @id @default(cuid())
  inventoryId      String                @map("inventory_id")
  productId        String                @map("product_id")
  type             InventoryMovementType
  quantity         Int
  previousQuantity Int                   @map("previous_quantity")
  newQuantity      Int                   @map("new_quantity")
  unitCost         Decimal?              @map("unit_cost") @db.Decimal(10, 2)
  totalCost        Decimal?              @map("total_cost") @db.Decimal(10, 2)
  referenceType    String?               @map("reference_type")
  referenceId      String?               @map("reference_id")
  reason           String?
  notes            String?
  metadata         Json?
  createdBy        String                @map("created_by")
  batchId          String?               @map("batch_id")
  createdAt        DateTime              @default(now()) @map("created_at")

  // Relations
  inventory        Inventory             @relation(fields: [inventoryId], references: [id])
  product          Product               @relation(fields: [productId], references: [id])

  @@map("inventory_movements")
}

enum InventoryMovementType {
  INITIAL_STOCK
  RESTOCK
  PURCHASE
  RETURN
  TRANSFER_IN
  ADJUSTMENT_IN
  SALE
  TRANSFER_OUT
  DAMAGE
  THEFT
  EXPIRED
  ADJUSTMENT_OUT
  RESERVE
  RELEASE_RESERVE
}
`;
exports.default = exports.InventoryMovementModel;
//# sourceMappingURL=InventoryMovement.js.map