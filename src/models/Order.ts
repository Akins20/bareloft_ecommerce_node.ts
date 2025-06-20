import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Order Model Schema
export const OrderModel = prisma.order;

// Order Schema Definition for Prisma
export const OrderSchema = `
model Order {
  id                String             @id @default(cuid())
  orderNumber       String             @unique @map("order_number")
  userId            String             @map("user_id")
  status            OrderStatus        @default(PENDING)
  subtotal          Decimal            @db.Decimal(10, 2)
  taxAmount         Decimal            @default(0) @map("tax_amount") @db.Decimal(10, 2)
  shippingAmount    Decimal            @default(0) @map("shipping_amount") @db.Decimal(10, 2)
  discountAmount    Decimal            @default(0) @map("discount_amount") @db.Decimal(10, 2)
  totalAmount       Decimal            @map("total_amount") @db.Decimal(10, 2)
  currency          String             @default("NGN")
  paymentStatus     PaymentStatus      @default(PENDING) @map("payment_status")
  paymentMethod     PaymentMethod?     @map("payment_method")
  paymentReference  String?            @map("payment_reference")
  shippingAddress   Json               @map("shipping_address") // OrderAddress
  billingAddress    Json               @map("billing_address") // OrderAddress
  customerNotes     String?            @map("customer_notes")
  adminNotes        String?            @map("admin_notes")
  trackingNumber    String?            @map("tracking_number")
  estimatedDelivery DateTime?          @map("estimated_delivery")
  paidAt            DateTime?          @map("paid_at")
  shippedAt         DateTime?          @map("shipped_at")
  deliveredAt       DateTime?          @map("delivered_at")
  createdAt         DateTime           @default(now()) @map("created_at")
  updatedAt         DateTime           @updatedAt @map("updated_at")

  // Relations
  user              User               @relation(fields: [userId], references: [id])
  items             OrderItem[]
  transactions      PaymentTransaction[]
  reviews           ProductReview[]
  reservations      StockReservation[]
  timeline          OrderTimelineEvent[]

  @@map("orders")
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
  PARTIAL_REFUND
}

enum PaymentMethod {
  CARD
  BANK_TRANSFER
  USSD
  WALLET
}
`;

export default OrderModel;
