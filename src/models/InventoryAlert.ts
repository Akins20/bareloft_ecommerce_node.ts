import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Using a JSON field in existing Notification model to store alert data temporarily
// In production, you would want a dedicated InventoryAlert table
export const InventoryAlertModel = {
  // Create alert using Notification model with specific metadata
  create: async (data: {
    productId: string;
    type: string;
    severity: string;
    message: string;
    description?: string;
    metadata?: any;
  }) => {
    return prisma.notification.create({
      data: {
        type: "PRODUCT_ALERT" as any,
        title: `${data.type} Alert`,
        message: data.message,
        data: {
          alertType: data.type,
          severity: data.severity,
          productId: data.productId,
          description: data.description,
          ...data.metadata,
        },
        userId: null, // System-generated alert
      },
    });
  },

  // Find alerts with filters
  findMany: async (where: any = {}) => {
    const notifications = await prisma.notification.findMany({
      where: {
        type: "PRODUCT_ALERT",
        ...where,
      },
      orderBy: { createdAt: "desc" },
    });

    return notifications;
  },

  // Find single alert
  findUnique: async (id: string) => {
    return prisma.notification.findUnique({
      where: { id },
    });
  },

  // Update alert (acknowledge, dismiss, etc.)
  update: async (id: string, data: any) => {
    return prisma.notification.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  },

  // Count alerts
  count: async (where: any = {}) => {
    return prisma.notification.count({
      where: {
        type: "PRODUCT_ALERT",
        ...where,
      },
    });
  },
};

// Alert Configuration Model Schema (would be a separate table)
export const AlertConfigurationSchema = `
model AlertConfiguration {
  id                    String   @id @default(cuid())
  userId                String?  @map("user_id")
  name                  String
  description           String?
  
  // Alert Types and Thresholds
  lowStockEnabled       Boolean  @default(true) @map("low_stock_enabled")
  lowStockThreshold     Int?     @map("low_stock_threshold")
  criticalStockEnabled  Boolean  @default(true) @map("critical_stock_enabled")
  criticalStockThreshold Int?    @map("critical_stock_threshold")
  outOfStockEnabled     Boolean  @default(true) @map("out_of_stock_enabled")
  reorderNeededEnabled  Boolean  @default(false) @map("reorder_needed_enabled")
  slowMovingEnabled     Boolean  @default(false) @map("slow_moving_enabled")
  slowMovingDays        Int?     @map("slow_moving_days")
  
  // Notification Preferences
  emailEnabled          Boolean  @default(true) @map("email_enabled")
  emailAddress          String?  @map("email_address")
  smsEnabled            Boolean  @default(false) @map("sms_enabled")
  phoneNumber           String?  @map("phone_number")
  pushEnabled           Boolean  @default(true) @map("push_enabled")
  
  // Business Hours
  respectBusinessHours  Boolean  @default(false) @map("respect_business_hours")
  businessHoursStart    String?  @map("business_hours_start")
  businessHoursEnd      String?  @map("business_hours_end")
  businessDays          String[] @map("business_days")
  timezone              String   @default("Africa/Lagos")
  
  // Frequency Control
  maxAlertsPerHour      Int?     @map("max_alerts_per_hour")
  maxAlertsPerDay       Int?     @map("max_alerts_per_day")
  
  // Filtering
  categoryIds           String[] @map("category_ids")
  productIds            String[] @map("product_ids")
  minStockValue         Decimal? @map("min_stock_value") @db.Decimal(10, 2)
  
  isActive              Boolean  @default(true) @map("is_active")
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  // Relations
  user                  User?    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("alert_configurations")
}
`;

export default InventoryAlertModel;