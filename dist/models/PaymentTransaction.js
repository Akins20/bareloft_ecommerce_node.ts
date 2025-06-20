"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentTransactionSchema = exports.PaymentTransactionModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// PaymentTransaction Model Schema
exports.PaymentTransactionModel = prisma.paymentTransaction;
// PaymentTransaction Schema Definition for Prisma
exports.PaymentTransactionSchema = `
model PaymentTransaction {
  id                    String        @id @default(cuid())
  orderId               String        @map("order_id")
  userId                String?       @map("user_id")
  provider              String        @default("paystack")
  channel               String        // card, bank, ussd, etc.
  status                String        @default("pending")
  amount                Int           // Amount in kobo
  amountPaid            Int           @default(0) @map("amount_paid")
  fees                  Int           @default(0)
  currency              String        @default("NGN")
  reference             String        @unique // Our reference
  providerReference     String        @map("provider_reference") // Paystack reference
  providerTransactionId String?       @map("provider_transaction_id")
  authorization         Json?         // Paystack authorization data
  gateway               Json?         // Gateway response data
  customer              Json          // Customer data from payment
  metadata              Json?
  paidAt                DateTime?     @map("paid_at")
  createdAt             DateTime      @default(now()) @map("created_at")
  updatedAt             DateTime      @updatedAt @map("updated_at")

  // Relations
  order                 Order         @relation(fields: [orderId], references: [id])

  @@map("payment_transactions")
}
`;
exports.default = exports.PaymentTransactionModel;
//# sourceMappingURL=PaymentTransaction.js.map