import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// OrderTimelineEvent Model Schema
export const OrderTimelineEventModel = prisma.orderTimelineEvent;

// OrderTimelineEvent Schema Definition for Prisma
export const OrderTimelineEventSchema = `
model OrderTimelineEvent {
  id          String      @id @default(cuid())
  orderId     String      @map("order_id")
  status      OrderStatus
  description String
  notes       String?
  createdBy   String?     @map("created_by")
  createdAt   DateTime    @default(now()) @map("created_at")

  // Relations
  order       Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@map("order_timeline_events")
}
`;

export default OrderTimelineEventModel;
