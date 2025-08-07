import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Using JSON fields to store reorder data temporarily
// In production, you would want dedicated ReorderSuggestion and ReorderRequest tables
export const ReorderSuggestionModel = {
  // Store reorder suggestions in a JSON field temporarily
  create: async (data: any) => {
    // Using Notification model as temporary storage
    return prisma.notification.create({
      data: {
        type: "PRODUCT_ALERT" as any,
        title: "Reorder Suggestion",
        message: `Reorder suggested for ${data.productName}`,
        data: {
          type: "REORDER_SUGGESTION",
          productId: data.productId,
          productName: data.productName,
          status: data.status,
          priority: data.priority,
          suggestedQuantity: data.suggestedQuantity,
          estimatedCost: data.estimatedCost,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        userId: null,
      },
    });
  },

  findMany: async (where: any = {}) => {
    return prisma.notification.findMany({
      where: {
        type: "PRODUCT_ALERT",
        data: {
          path: ["type"],
          equals: "REORDER_SUGGESTION",
        },
        ...where,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  findUnique: async (id: string) => {
    return prisma.notification.findFirst({
      where: {
        id,
        data: {
          path: ["type"],
          equals: "REORDER_SUGGESTION",
        },
      },
    });
  },

  update: async (id: string, data: any) => {
    const existing = await prisma.notification.findUnique({
      where: { id },
    });

    if (!existing) return null;

    const updatedData = {
      ...existing.data,
      ...data,
      updatedAt: new Date(),
    };

    return prisma.notification.update({
      where: { id },
      data: {
        data: updatedData,
        updatedAt: new Date(),
      },
    });
  },
};

export const ReorderRequestModel = {
  create: async (data: any) => {
    return prisma.notification.create({
      data: {
        type: "PRODUCT_ALERT" as any,
        title: "Reorder Request",
        message: `Reorder request for ${data.productName || "product"}`,
        data: {
          type: "REORDER_REQUEST",
          productId: data.productId,
          supplierId: data.supplierId,
          quantity: data.quantity,
          unitCost: data.unitCost,
          totalCost: data.totalCost,
          status: data.status,
          requestedBy: data.requestedBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        userId: data.requestedBy || null,
      },
    });
  },

  findMany: async (where: any = {}) => {
    return prisma.notification.findMany({
      where: {
        type: "PRODUCT_ALERT",
        data: {
          path: ["type"],
          equals: "REORDER_REQUEST",
        },
        ...where,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  findUnique: async (id: string) => {
    return prisma.notification.findFirst({
      where: {
        id,
        data: {
          path: ["type"],
          equals: "REORDER_REQUEST",
        },
      },
    });
  },

  update: async (id: string, data: any) => {
    const existing = await prisma.notification.findUnique({
      where: { id },
    });

    if (!existing) return null;

    const updatedData = {
      ...existing.data,
      ...data,
      updatedAt: new Date(),
    };

    return prisma.notification.update({
      where: { id },
      data: {
        data: updatedData,
        updatedAt: new Date(),
      },
    });
  },

  count: async (where: any = {}) => {
    return prisma.notification.count({
      where: {
        type: "PRODUCT_ALERT",
        data: {
          path: ["type"],
          equals: "REORDER_REQUEST",
        },
        ...where,
      },
    });
  },
};

// Schema definitions for future database migration
export const ReorderSuggestionSchema = `
model ReorderSuggestion {
  id                    String        @id @default(cuid())
  productId             String        @map("product_id")
  productName           String        @map("product_name")
  productSku            String?       @map("product_sku")
  categoryName          String?       @map("category_name")
  
  // Current State
  currentStock          Int           @map("current_stock")
  reservedStock         Int           @default(0) @map("reserved_stock")
  availableStock        Int           @map("available_stock")
  reorderPoint          Int           @map("reorder_point")
  
  // Calculations
  suggestedQuantity     Int           @map("suggested_quantity")
  estimatedCost         Decimal       @map("estimated_cost") @db.Decimal(10, 2)
  currency              String        @default("NGN")
  
  // Velocity Analysis
  averageDailySales     Decimal       @map("average_daily_sales") @db.Decimal(8, 2)
  salesVelocity         Decimal       @map("sales_velocity") @db.Decimal(8, 2)
  daysOfStockLeft       Int           @map("days_of_stock_left")
  leadTimeDays          Int           @map("lead_time_days")
  
  // Supplier Information
  preferredSupplierId   String?       @map("preferred_supplier_id")
  supplierName          String?       @map("supplier_name")
  supplierContact       String?       @map("supplier_contact")
  lastOrderDate         DateTime?     @map("last_order_date")
  lastOrderQuantity     Int?          @map("last_order_quantity")
  lastOrderCost         Decimal?      @map("last_order_cost") @db.Decimal(10, 2)
  
  // Nigerian Business Context
  importRequired        Boolean       @default(false) @map("import_required")
  customsClearanceDays  Int?          @map("customs_clearance_days")
  localSupplierAvailable Boolean      @default(true) @map("local_supplier_available")
  businessDaysToReorder Int           @map("business_days_to_reorder")
  
  // Status
  status                String        @default("suggested")
  priority              String        @default("medium")
  reason                String
  notes                 String?
  
  // Approval Tracking
  createdBy             String?       @map("created_by")
  approvedBy            String?       @map("approved_by")
  approvedAt            DateTime?     @map("approved_at")
  rejectedBy            String?       @map("rejected_by")
  rejectedAt            DateTime?     @map("rejected_at")
  rejectionReason       String?       @map("rejection_reason")
  
  createdAt             DateTime      @default(now()) @map("created_at")
  updatedAt             DateTime      @updatedAt @map("updated_at")

  // Relations
  product               Product       @relation(fields: [productId], references: [id], onDelete: Cascade)
  supplier              Supplier?     @relation(fields: [preferredSupplierId], references: [id])
  reorderRequests       ReorderRequest[]

  @@map("reorder_suggestions")
}
`;

export const ReorderRequestSchema = `
model ReorderRequest {
  id                    String        @id @default(cuid())
  suggestionId          String?       @map("suggestion_id")
  productId             String        @map("product_id")
  supplierId            String?       @map("supplier_id")
  
  // Order Details
  quantity              Int
  unitCost              Decimal       @map("unit_cost") @db.Decimal(10, 2)
  totalCost             Decimal       @map("total_cost") @db.Decimal(10, 2)
  currency              String        @default("NGN")
  
  // Delivery
  expectedDeliveryDate  DateTime?     @map("expected_delivery_date")
  actualDeliveryDate    DateTime?     @map("actual_delivery_date")
  deliveryAddress       String?       @map("delivery_address")
  
  // Nigerian Business Details
  requiresImport        Boolean       @default(false) @map("requires_import")
  customsValue          Decimal?      @map("customs_value") @db.Decimal(10, 2)
  customsDuty           Decimal?      @map("customs_duty") @db.Decimal(10, 2)
  localPurchaseOrder    String?       @map("local_purchase_order")
  supplierInvoice       String?       @map("supplier_invoice")
  
  // Status and Tracking
  status                String        @default("pending_approval")
  orderReference        String?       @map("order_reference")
  supplierReference     String?       @map("supplier_reference")
  trackingNumber        String?       @map("tracking_number")
  
  // Approval Workflow
  requestedBy           String        @map("requested_by")
  approvedBy            String?       @map("approved_by")
  approvedAt            DateTime?     @map("approved_at")
  completedBy           String?       @map("completed_by")
  completedAt           DateTime?     @map("completed_at")
  
  // Notes
  notes                 String?
  
  createdAt             DateTime      @default(now()) @map("created_at")
  updatedAt             DateTime      @updatedAt @map("updated_at")

  // Relations
  suggestion            ReorderSuggestion? @relation(fields: [suggestionId], references: [id])
  product               Product       @relation(fields: [productId], references: [id], onDelete: Cascade)
  supplier              Supplier?     @relation(fields: [supplierId], references: [id])

  @@map("reorder_requests")
}
`;

export { ReorderSuggestionModel, ReorderRequestModel };