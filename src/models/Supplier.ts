import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Using JSON fields to store supplier data temporarily
// In production, you would want a dedicated Supplier table
export const SupplierModel = {
  create: async (data: any) => {
    // Using Notification model as temporary storage for suppliers
    return prisma.notification.create({
      data: {
        type: "SYSTEM_ALERT" as any,
        title: `Supplier: ${data.name}`,
        message: `Supplier ${data.name} created`,
        data: {
          type: "SUPPLIER",
          name: data.name,
          isLocal: data.isLocal,
          businessType: data.businessType,
          currency: data.currency,
          averageLeadTimeDays: data.averageLeadTimeDays,
          isActive: data.isActive !== false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        userId: null,
      },
    });
  },

  findMany: async (where: any = {}) => {
    const filters: any = {
      type: "SYSTEM_ALERT",
      data: {
        path: ["type"],
        equals: "SUPPLIER",
      },
    };

    // Add isActive filter if specified
    if (where.isActive !== undefined) {
      filters.data = {
        ...filters.data,
        path: ["isActive"],
        equals: where.isActive,
      };
    }

    return prisma.notification.findMany({
      where: filters,
      orderBy: { createdAt: "desc" },
    });
  },

  findUnique: async (id: string) => {
    return prisma.notification.findFirst({
      where: {
        id,
        data: {
          path: ["type"],
          equals: "SUPPLIER",
        },
      },
    });
  },

  findFirst: async (where: any) => {
    return prisma.notification.findFirst({
      where: {
        type: "SYSTEM_ALERT",
        data: {
          path: ["type"],
          equals: "SUPPLIER",
        },
        ...where,
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
        title: `Supplier: ${data.name || (existing.data as any)?.name || "Unknown"}`,
        data: updatedData,
        updatedAt: new Date(),
      },
    });
  },

  delete: async (id: string) => {
    // Soft delete by marking as inactive
    return SupplierModel.update(id, { isActive: false });
  },

  count: async (where: any = {}) => {
    const filters: any = {
      type: "SYSTEM_ALERT",
      data: {
        path: ["type"],
        equals: "SUPPLIER",
      },
    };

    if (where.isActive !== undefined) {
      filters.data = {
        ...filters.data,
        path: ["isActive"],
        equals: where.isActive,
      };
    }

    return prisma.notification.count({
      where: filters,
    });
  },

  // Helper methods for Nigerian suppliers
  findLocalSuppliers: async () => {
    return prisma.notification.findMany({
      where: {
        type: "SYSTEM_ALERT",
        data: {
          path: ["type"],
          equals: "SUPPLIER",
          AND: [
            { path: ["isLocal"], equals: true },
            { path: ["isActive"], equals: true },
          ],
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  findPreferredSuppliers: async () => {
    return prisma.notification.findMany({
      where: {
        type: "SYSTEM_ALERT",
        data: {
          path: ["type"],
          equals: "SUPPLIER",
          AND: [
            { path: ["isPreferred"], equals: true },
            { path: ["isActive"], equals: true },
          ],
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};

// Schema definition for future database migration
export const SupplierSchema = `
model Supplier {
  id                    String   @id @default(cuid())
  name                  String
  code                  String?  @unique
  contactPerson         String?  @map("contact_person")
  email                 String?
  phone                 String?
  whatsapp              String?  // Nigerian business context
  
  // Address
  addressStreet         String?  @map("address_street")
  addressCity           String?  @map("address_city")
  addressState          String?  @map("address_state")
  addressCountry        String?  @map("address_country")
  addressPostalCode     String?  @map("address_postal_code")
  
  // Business Details
  isLocal               Boolean  @default(true) @map("is_local") // Nigerian supplier
  businessType          String   @map("business_type") // manufacturer, distributor, importer, wholesaler
  taxId                 String?  @map("tax_id") // Nigerian tax ID
  cacNumber             String?  @map("cac_number") // Nigerian CAC registration
  
  // Performance
  rating                Decimal? @db.Decimal(3, 2)
  reliability           Decimal? @db.Decimal(3, 2)
  averageLeadTimeDays   Int      @default(7) @map("average_lead_time_days")
  onTimeDeliveryRate    Decimal? @map("on_time_delivery_rate") @db.Decimal(5, 2)
  qualityRating         Decimal? @map("quality_rating") @db.Decimal(3, 2)
  
  // Financial
  paymentTerms          String?  @map("payment_terms")
  currency              String   @default("NGN")
  creditLimit           Decimal? @map("credit_limit") @db.Decimal(15, 2)
  discountPercentage    Decimal? @map("discount_percentage") @db.Decimal(5, 2)
  
  // Status
  isActive              Boolean  @default(true) @map("is_active")
  isPreferred           Boolean  @default(false) @map("is_preferred")
  lastOrderDate         DateTime? @map("last_order_date")
  totalOrders           Int      @default(0) @map("total_orders")
  totalValue            Decimal  @default(0) @map("total_value") @db.Decimal(15, 2)
  
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  // Relations
  reorderSuggestions    ReorderSuggestion[]
  reorderRequests       ReorderRequest[]
  productSuppliers      ProductSupplier[]

  @@map("suppliers")
}
`;

// Product-Supplier relationship for multi-supplier support
export const ProductSupplierSchema = `
model ProductSupplier {
  id                    String   @id @default(cuid())
  productId             String   @map("product_id")
  supplierId            String   @map("supplier_id")
  
  // Supplier-specific details
  supplierSku           String?  @map("supplier_sku")
  unitCost              Decimal  @map("unit_cost") @db.Decimal(10, 2)
  minimumOrderQuantity  Int      @default(1) @map("minimum_order_quantity")
  leadTimeDays          Int      @default(7) @map("lead_time_days")
  
  // Status
  isPreferred           Boolean  @default(false) @map("is_preferred")
  isActive              Boolean  @default(true) @map("is_active")
  
  // Performance tracking
  lastOrderDate         DateTime? @map("last_order_date")
  lastUnitCost          Decimal?  @map("last_unit_cost") @db.Decimal(10, 2)
  averageDeliveryDays   Int?      @map("average_delivery_days")
  
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  // Relations
  product               Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  supplier              Supplier @relation(fields: [supplierId], references: [id], onDelete: Cascade)

  @@unique([productId, supplierId])
  @@map("product_suppliers")
}
`;

export default SupplierModel;