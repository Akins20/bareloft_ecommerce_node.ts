"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderTimelineEventSchema = exports.OrderTimelineEventModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// OrderTimelineEvent Model Schema
exports.OrderTimelineEventModel = prisma.orderTimelineEvent;
// OrderTimelineEvent Schema Definition for Prisma
exports.OrderTimelineEventSchema = `
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
exports.default = exports.OrderTimelineEventModel;
//# sourceMappingURL=OrderTimelineEvent.js.map