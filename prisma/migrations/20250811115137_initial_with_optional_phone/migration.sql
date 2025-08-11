-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('CUSTOMER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "public"."AddressType" AS ENUM ('SHIPPING', 'BILLING');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."OTPPurpose" AS ENUM ('LOGIN', 'SIGNUP', 'PASSWORD_RESET', 'PHONE_VERIFICATION');

-- CreateEnum
CREATE TYPE "public"."MovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('ORDER_STATUS', 'PAYMENT_STATUS', 'PRODUCT_ALERT', 'SYSTEM_ALERT', 'PROMOTION');

-- CreateEnum
CREATE TYPE "public"."CouponType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING');

-- CreateEnum
CREATE TYPE "public"."ReturnRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'IN_TRANSIT', 'RECEIVED', 'INSPECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ReturnReason" AS ENUM ('DEFECTIVE', 'WRONG_ITEM', 'WRONG_SIZE', 'DAMAGED_SHIPPING', 'NOT_AS_DESCRIBED', 'CHANGED_MIND', 'DUPLICATE_ORDER', 'QUALITY_ISSUES', 'LATE_DELIVERY', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ReturnItemCondition" AS ENUM ('SELLABLE', 'MINOR_DAMAGE', 'MAJOR_DAMAGE', 'DEFECTIVE', 'UNSELLABLE');

-- CreateEnum
CREATE TYPE "public"."RefundProcessStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "public"."RefundMethod" AS ENUM ('ORIGINAL_PAYMENT', 'BANK_TRANSFER', 'WALLET_CREDIT', 'STORE_CREDIT', 'CASH');

-- CreateEnum
CREATE TYPE "public"."ReturnShippingMethod" AS ENUM ('CUSTOMER_DROP_OFF', 'PICKUP_SERVICE', 'COURIER_SERVICE', 'POSTAL_SERVICE');

-- CreateEnum
CREATE TYPE "public"."ShippingCarrierStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "public"."ShipmentStatus" AS ENUM ('PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_DELIVERY', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."DeliveryAttemptStatus" AS ENUM ('SUCCESSFUL', 'FAILED_NO_ONE_HOME', 'FAILED_WRONG_ADDRESS', 'FAILED_REFUSED', 'FAILED_DAMAGED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "public"."SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_INTERNAL', 'RESOLVED', 'CLOSED', 'CANCELLED', 'REOPENED');

-- CreateEnum
CREATE TYPE "public"."SupportTicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."SupportTicketCategory" AS ENUM ('GENERAL', 'ORDER_ISSUES', 'PAYMENT_PROBLEMS', 'RETURNS_REFUNDS', 'TECHNICAL_SUPPORT', 'ACCOUNT_ISSUES', 'SHIPPING_DELIVERY', 'PRODUCT_INQUIRY', 'BILLING', 'COMPLAINT', 'FEEDBACK', 'FEATURE_REQUEST');

-- CreateEnum
CREATE TYPE "public"."SupportChannelType" AS ENUM ('EMAIL', 'PHONE', 'SMS', 'WHATSAPP', 'LIVE_CHAT', 'SOCIAL_MEDIA', 'IN_APP', 'WEB_FORM', 'WALK_IN');

-- CreateEnum
CREATE TYPE "public"."SupportLanguage" AS ENUM ('ENGLISH', 'PIDGIN', 'HAUSA', 'YORUBA', 'IGBO');

-- CreateEnum
CREATE TYPE "public"."SupportAgentStatus" AS ENUM ('AVAILABLE', 'BUSY', 'AWAY', 'BREAK', 'OFFLINE', 'DO_NOT_DISTURB');

-- CreateEnum
CREATE TYPE "public"."SupportDepartment" AS ENUM ('GENERAL_SUPPORT', 'TECHNICAL_SUPPORT', 'BILLING_PAYMENTS', 'RETURNS_REFUNDS', 'ORDER_FULFILLMENT', 'PRODUCT_SPECIALIST', 'ESCALATION_TEAM', 'MANAGEMENT');

-- CreateEnum
CREATE TYPE "public"."SupportSkillLevel" AS ENUM ('TRAINEE', 'JUNIOR', 'SENIOR', 'SPECIALIST', 'TEAM_LEAD', 'MANAGER');

-- CreateEnum
CREATE TYPE "public"."SupportMessageType" AS ENUM ('MESSAGE', 'NOTE', 'SYSTEM_UPDATE', 'AUTO_REPLY', 'ESCALATION', 'ASSIGNMENT', 'RESOLUTION', 'FEEDBACK_REQUEST');

-- CreateEnum
CREATE TYPE "public"."SupportMessageDirection" AS ENUM ('INCOMING', 'OUTGOING', 'INTERNAL');

-- CreateEnum
CREATE TYPE "public"."EscalationType" AS ENUM ('TECHNICAL', 'BILLING', 'MANAGEMENT', 'URGENT', 'VIP_CUSTOMER', 'COMPLAINT', 'LEGAL');

-- CreateEnum
CREATE TYPE "public"."UrgencyLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."AssignmentType" AS ENUM ('MANUAL', 'AUTO_ROUND_ROBIN', 'AUTO_WORKLOAD', 'AUTO_SKILL_BASED', 'AUTO_GEOGRAPHIC');

-- CreateEnum
CREATE TYPE "public"."KnowledgeBaseStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."SupportTemplateType" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'AUTO_REPLY', 'CANNED_RESPONSE', 'ESCALATION', 'RESOLUTION', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "public"."SurveyType" AS ENUM ('POST_RESOLUTION', 'PERIODIC', 'FEEDBACK', 'NPS');

-- CreateEnum
CREATE TYPE "public"."ShiftType" AS ENUM ('REGULAR', 'OVERTIME', 'HOLIDAY', 'ON_CALL', 'PART_TIME');

-- CreateEnum
CREATE TYPE "public"."ShiftStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'MISSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PeriodType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "public"."NigerianState" AS ENUM ('ABIA', 'ADAMAWA', 'AKWA_IBOM', 'ANAMBRA', 'BAUCHI', 'BAYELSA', 'BENUE', 'BORNO', 'CROSS_RIVER', 'DELTA', 'EBONYI', 'EDO', 'EKITI', 'ENUGU', 'FCT', 'GOMBE', 'IMO', 'JIGAWA', 'KADUNA', 'KANO', 'KATSINA', 'KEBBI', 'KOGI', 'KWARA', 'LAGOS', 'NASARAWA', 'NIGER', 'OGUN', 'ONDO', 'OSUN', 'OYO', 'PLATEAU', 'RIVERS', 'SOKOTO', 'TARABA', 'YOBE', 'ZAMFARA');

-- CreateEnum
CREATE TYPE "public"."NigerianLanguage" AS ENUM ('ENGLISH', 'HAUSA', 'YORUBA', 'IGBO', 'PIDGIN', 'FULANI', 'KANURI', 'TIV', 'IJAW', 'IBIBIO');

-- CreateEnum
CREATE TYPE "public"."NigerianPaymentChannel" AS ENUM ('CARD', 'BANK_TRANSFER', 'USSD', 'QR_CODE', 'MOBILE_MONEY', 'POS', 'CASH', 'WALLET');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "email" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "avatar" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'CUSTOMER',
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."addresses" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "company" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'NG',
    "phoneNumber" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "type" "public"."AddressType" NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "shortDescription" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "comparePrice" DECIMAL(10,2),
    "costPrice" DECIMAL(10,2),
    "sku" TEXT,
    "barcode" TEXT,
    "weight" DECIMAL(8,2),
    "dimensions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isDigital" BOOLEAN NOT NULL DEFAULT false,
    "requiresShipping" BOOLEAN NOT NULL DEFAULT true,
    "trackQuantity" BOOLEAN NOT NULL DEFAULT true,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "categoryId" TEXT NOT NULL,
    "tags" TEXT[],
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_images" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_reviews" (
    "id" TEXT NOT NULL,
    "rating" SMALLINT NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "helpfulVotes" INTEGER NOT NULL DEFAULT 0,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cart_items" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wishlist_items" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "shippingCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "paymentStatus" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "shippingAddressId" TEXT,
    "billingAddressId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."order_items" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."order_timeline_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_transactions" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "public"."TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "gateway" TEXT NOT NULL,
    "gatewayData" JSONB,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceInfo" JSONB,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."otp_codes" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "email" TEXT,
    "code" TEXT NOT NULL,
    "purpose" "public"."OTPPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stock_reservations" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventory_movements" (
    "id" TEXT NOT NULL,
    "type" "public"."MovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reference" TEXT,
    "reason" TEXT,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "userId" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "public"."CouponType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "minAmount" DECIMAL(10,2),
    "maxAmount" DECIMAL(10,2),
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shipping_carriers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "public"."ShippingCarrierStatus" NOT NULL DEFAULT 'ACTIVE',
    "baseUrl" TEXT,
    "apiKey" TEXT,
    "secretKey" TEXT,
    "webhookUrl" TEXT,
    "supportedServices" JSONB,
    "coverageAreas" JSONB,
    "businessHours" JSONB,
    "maxWeight" DECIMAL(8,2),
    "maxDimensions" JSONB,
    "deliveryTimeframes" JSONB,
    "rateStructure" JSONB,
    "contactInfo" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_carriers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shipping_zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "states" JSONB NOT NULL,
    "cities" JSONB,
    "postalCodes" JSONB,
    "baseRate" DECIMAL(8,2) NOT NULL,
    "weightMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    "deliveryDays" INTEGER NOT NULL DEFAULT 3,
    "expressDeliveryDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shipping_rates" (
    "id" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "minWeight" DECIMAL(8,2) NOT NULL,
    "maxWeight" DECIMAL(8,2) NOT NULL,
    "baseRate" DECIMAL(8,2) NOT NULL,
    "weightRate" DECIMAL(8,2) NOT NULL,
    "dimensionalFactor" DECIMAL(4,2) NOT NULL DEFAULT 5000,
    "fuelSurcharge" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "insuranceRate" DECIMAL(4,2) NOT NULL DEFAULT 0.01,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shipments" (
    "id" TEXT NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "status" "public"."ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "originAddress" JSONB NOT NULL,
    "destinationAddress" JSONB NOT NULL,
    "packageWeight" DECIMAL(8,2) NOT NULL,
    "packageDimensions" JSONB NOT NULL,
    "declaredValue" DECIMAL(10,2) NOT NULL,
    "shippingCost" DECIMAL(8,2) NOT NULL,
    "insuranceCost" DECIMAL(8,2),
    "estimatedDelivery" TIMESTAMP(3),
    "actualDelivery" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "lastLocationUpdate" JSONB,
    "specialInstructions" TEXT,
    "customerNotes" TEXT,
    "labelUrl" TEXT,
    "manifestNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tracking_events" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "status" "public"."ShipmentStatus" NOT NULL,
    "location" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'NG',
    "description" TEXT NOT NULL,
    "carrierEventCode" TEXT,
    "eventData" JSONB,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "estimatedDelivery" TIMESTAMP(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."delivery_attempts" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "public"."DeliveryAttemptStatus" NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "recipientName" TEXT,
    "signatureUrl" TEXT,
    "photoUrl" TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shipping_analytics" (
    "id" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "state" TEXT NOT NULL,
    "totalShipments" INTEGER NOT NULL DEFAULT 0,
    "deliveredShipments" INTEGER NOT NULL DEFAULT 0,
    "failedDeliveries" INTEGER NOT NULL DEFAULT 0,
    "averageDeliveryDays" DECIMAL(4,2),
    "totalRevenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "averageShippingCost" DECIMAL(8,2),
    "onTimeDeliveryRate" DECIMAL(5,4),
    "customerSatisfaction" DECIMAL(3,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."return_requests" (
    "id" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "public"."ReturnRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" "public"."ReturnReason" NOT NULL,
    "description" TEXT,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "isEligible" BOOLEAN NOT NULL DEFAULT true,
    "eligibilityReason" TEXT,
    "returnShippingMethod" "public"."ReturnShippingMethod",
    "returnTrackingNumber" TEXT,
    "estimatedPickupDate" TIMESTAMP(3),
    "actualPickupDate" TIMESTAMP(3),
    "estimatedReturnDate" TIMESTAMP(3),
    "actualReturnDate" TIMESTAMP(3),
    "qualityCheckNotes" TEXT,
    "inspectionPhotos" JSONB,
    "adminNotes" TEXT,
    "customerNotes" TEXT,
    "processedBy" TEXT,
    "approvedBy" TEXT,
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."return_items" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productSku" TEXT,
    "productImage" TEXT,
    "quantityReturned" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "condition" "public"."ReturnItemCondition",
    "conditionNotes" TEXT,
    "inspectionPhotos" JSONB,
    "restockable" BOOLEAN NOT NULL DEFAULT false,
    "restockLocation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refunds" (
    "id" TEXT NOT NULL,
    "refundNumber" TEXT NOT NULL,
    "returnRequestId" TEXT,
    "orderId" TEXT NOT NULL,
    "transactionId" TEXT,
    "customerId" TEXT NOT NULL,
    "status" "public"."RefundProcessStatus" NOT NULL DEFAULT 'PENDING',
    "refundMethod" "public"."RefundMethod" NOT NULL DEFAULT 'ORIGINAL_PAYMENT',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "bankAccountDetails" JSONB,
    "providerRefundId" TEXT,
    "providerReference" TEXT,
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "adminNotes" TEXT,
    "customerNotes" TEXT,
    "processedBy" TEXT,
    "approvedBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."return_timeline_events" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "data" JSONB,
    "createdBy" TEXT,
    "createdByName" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."nigerian_bank_accounts" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nigerian_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."support_tickets" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "public"."SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "public"."SupportTicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "category" "public"."SupportTicketCategory" NOT NULL DEFAULT 'GENERAL',
    "subcategory" TEXT,
    "source" "public"."SupportChannelType" NOT NULL DEFAULT 'EMAIL',
    "language" "public"."SupportLanguage" NOT NULL DEFAULT 'ENGLISH',
    "customerId" TEXT NOT NULL,
    "assignedAgentId" TEXT,
    "orderId" TEXT,
    "returnRequestId" TEXT,
    "estimatedResolution" TIMESTAMP(3),
    "actualResolution" TIMESTAMP(3),
    "firstResponseTime" TIMESTAMP(3),
    "resolutionTime" TIMESTAMP(3),
    "slaBreached" BOOLEAN NOT NULL DEFAULT false,
    "customerSatisfaction" SMALLINT,
    "satisfactionComment" TEXT,
    "internalNotes" TEXT,
    "tags" JSONB,
    "metadata" JSONB,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "lastReplyAt" TIMESTAMP(3),
    "parentTicketId" TEXT,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."support_agents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentNumber" TEXT NOT NULL,
    "department" "public"."SupportDepartment" NOT NULL,
    "specializations" JSONB NOT NULL,
    "languages" JSONB NOT NULL,
    "status" "public"."SupportAgentStatus" NOT NULL DEFAULT 'AVAILABLE',
    "skillLevel" "public"."SupportSkillLevel" NOT NULL DEFAULT 'JUNIOR',
    "maxConcurrentTickets" INTEGER NOT NULL DEFAULT 10,
    "currentTicketCount" INTEGER NOT NULL DEFAULT 0,
    "workingHours" JSONB NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
    "performanceRating" DECIMAL(3,2),
    "totalTicketsResolved" INTEGER NOT NULL DEFAULT 0,
    "averageResolutionTime" DECIMAL(8,2),
    "averageResponseTime" DECIMAL(8,2),
    "customerSatisfactionRate" DECIMAL(5,4),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."support_ticket_messages" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT,
    "agentId" TEXT,
    "type" "public"."SupportMessageType" NOT NULL DEFAULT 'MESSAGE',
    "channel" "public"."SupportChannelType" NOT NULL DEFAULT 'EMAIL',
    "direction" "public"."SupportMessageDirection" NOT NULL DEFAULT 'INCOMING',
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "htmlContent" TEXT,
    "attachments" JSONB,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "messageId" TEXT,
    "threadId" TEXT,
    "replyToId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "template" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."support_ticket_escalations" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fromAgentId" TEXT,
    "toAgentId" TEXT,
    "escalationType" "public"."EscalationType" NOT NULL,
    "reason" TEXT NOT NULL,
    "priority" "public"."SupportTicketPriority" NOT NULL,
    "urgencyLevel" "public"."UrgencyLevel" NOT NULL,
    "notes" TEXT,
    "escalatedBy" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_escalations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."support_ticket_assignments" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignmentType" "public"."AssignmentType" NOT NULL DEFAULT 'MANUAL',
    "reason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),

    CONSTRAINT "support_ticket_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."support_knowledge_base" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "category" "public"."SupportTicketCategory" NOT NULL,
    "subcategory" TEXT,
    "tags" JSONB,
    "language" "public"."SupportLanguage" NOT NULL DEFAULT 'ENGLISH',
    "status" "public"."KnowledgeBaseStatus" NOT NULL DEFAULT 'DRAFT',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "helpfulVotes" INTEGER NOT NULL DEFAULT 0,
    "unhelpfulVotes" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "lastUpdatedBy" TEXT,
    "searchKeywords" TEXT,
    "relatedArticles" JSONB,
    "attachments" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_knowledge_base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."support_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "htmlContent" TEXT,
    "category" "public"."SupportTicketCategory" NOT NULL,
    "type" "public"."SupportTemplateType" NOT NULL,
    "language" "public"."SupportLanguage" NOT NULL DEFAULT 'ENGLISH',
    "variables" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."support_satisfaction_surveys" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "rating" SMALLINT NOT NULL,
    "feedback" TEXT,
    "categories" JSONB,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "surveyType" "public"."SurveyType" NOT NULL DEFAULT 'POST_RESOLUTION',
    "sentAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "remindersSent" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_satisfaction_surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."support_agent_shifts" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "shiftDate" DATE NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "breakStartTime" TIMESTAMP(3),
    "breakEndTime" TIMESTAMP(3),
    "shiftType" "public"."ShiftType" NOT NULL DEFAULT 'REGULAR',
    "status" "public"."ShiftStatus" NOT NULL DEFAULT 'SCHEDULED',
    "actualStartTime" TIMESTAMP(3),
    "actualEndTime" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_agent_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."support_agent_performance" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "periodType" "public"."PeriodType" NOT NULL DEFAULT 'WEEKLY',
    "ticketsAssigned" INTEGER NOT NULL DEFAULT 0,
    "ticketsResolved" INTEGER NOT NULL DEFAULT 0,
    "ticketsEscalated" INTEGER NOT NULL DEFAULT 0,
    "averageResponseTime" DECIMAL(8,2),
    "averageResolutionTime" DECIMAL(8,2),
    "firstContactResolution" INTEGER NOT NULL DEFAULT 0,
    "customerSatisfactionAvg" DECIMAL(3,2),
    "slaCompliance" DECIMAL(5,4),
    "totalWorkingHours" DECIMAL(6,2),
    "productivityScore" DECIMAL(5,4),
    "qualityScore" DECIMAL(5,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_agent_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."support_nigerian_features" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "stateRegion" "public"."NigerianState",
    "customerLanguage" "public"."NigerianLanguage",
    "paymentChannel" "public"."NigerianPaymentChannel",
    "shippingCarrier" TEXT,
    "bankIssue" TEXT,
    "ussdCode" TEXT,
    "culturalContext" JSONB,
    "localHolidays" JSONB,
    "businessHoursAdjust" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_nigerian_features_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "public"."users"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "public"."categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "public"."categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "public"."products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "public"."products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "public"."products"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "product_reviews_productId_userId_key" ON "public"."product_reviews"("productId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_productId_userId_key" ON "public"."cart_items"("productId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_items_productId_userId_key" ON "public"."wishlist_items"("productId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "public"."orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_reference_key" ON "public"."payment_transactions"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionId_key" ON "public"."sessions"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_accessToken_key" ON "public"."sessions"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshToken_key" ON "public"."sessions"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "public"."coupons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_carriers_name_key" ON "public"."shipping_carriers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_carriers_code_key" ON "public"."shipping_carriers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_rates_carrierId_zoneId_serviceType_key" ON "public"."shipping_rates"("carrierId", "zoneId", "serviceType");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_trackingNumber_key" ON "public"."shipments"("trackingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_orderId_key" ON "public"."shipments"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_analytics_carrierId_date_state_key" ON "public"."shipping_analytics"("carrierId", "date", "state");

-- CreateIndex
CREATE UNIQUE INDEX "return_requests_returnNumber_key" ON "public"."return_requests"("returnNumber");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_refundNumber_key" ON "public"."refunds"("refundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "nigerian_bank_accounts_customerId_accountNumber_bankCode_key" ON "public"."nigerian_bank_accounts"("customerId", "accountNumber", "bankCode");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticketNumber_key" ON "public"."support_tickets"("ticketNumber");

-- CreateIndex
CREATE UNIQUE INDEX "support_agents_userId_key" ON "public"."support_agents"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "support_agents_agentNumber_key" ON "public"."support_agents"("agentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "support_knowledge_base_slug_key" ON "public"."support_knowledge_base"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "support_agent_shifts_agentId_shiftDate_key" ON "public"."support_agent_shifts"("agentId", "shiftDate");

-- CreateIndex
CREATE UNIQUE INDEX "support_agent_performance_agentId_periodStart_periodEnd_per_key" ON "public"."support_agent_performance"("agentId", "periodStart", "periodEnd", "periodType");

-- CreateIndex
CREATE UNIQUE INDEX "support_nigerian_features_ticketId_key" ON "public"."support_nigerian_features"("ticketId");

-- AddForeignKey
ALTER TABLE "public"."addresses" ADD CONSTRAINT "addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_images" ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_reviews" ADD CONSTRAINT "product_reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_reviews" ADD CONSTRAINT "product_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_reviews" ADD CONSTRAINT "product_reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cart_items" ADD CONSTRAINT "cart_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wishlist_items" ADD CONSTRAINT "wishlist_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wishlist_items" ADD CONSTRAINT "wishlist_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "public"."addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_billingAddressId_fkey" FOREIGN KEY ("billingAddressId") REFERENCES "public"."addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_timeline_events" ADD CONSTRAINT "order_timeline_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_transactions" ADD CONSTRAINT "payment_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."otp_codes" ADD CONSTRAINT "otp_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_reservations" ADD CONSTRAINT "stock_reservations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_movements" ADD CONSTRAINT "inventory_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shipping_rates" ADD CONSTRAINT "shipping_rates_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "public"."shipping_carriers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shipping_rates" ADD CONSTRAINT "shipping_rates_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "public"."shipping_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shipments" ADD CONSTRAINT "shipments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shipments" ADD CONSTRAINT "shipments_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "public"."shipping_carriers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tracking_events" ADD CONSTRAINT "tracking_events_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "public"."shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."delivery_attempts" ADD CONSTRAINT "delivery_attempts_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "public"."shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shipping_analytics" ADD CONSTRAINT "shipping_analytics_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "public"."shipping_carriers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."return_requests" ADD CONSTRAINT "return_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."return_requests" ADD CONSTRAINT "return_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."return_items" ADD CONSTRAINT "return_items_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "public"."return_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."return_items" ADD CONSTRAINT "return_items_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "public"."order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."return_items" ADD CONSTRAINT "return_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refunds" ADD CONSTRAINT "refunds_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "public"."return_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refunds" ADD CONSTRAINT "refunds_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refunds" ADD CONSTRAINT "refunds_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refunds" ADD CONSTRAINT "refunds_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."return_timeline_events" ADD CONSTRAINT "return_timeline_events_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "public"."return_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nigerian_bank_accounts" ADD CONSTRAINT "nigerian_bank_accounts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_tickets" ADD CONSTRAINT "support_tickets_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_tickets" ADD CONSTRAINT "support_tickets_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "public"."support_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_tickets" ADD CONSTRAINT "support_tickets_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_tickets" ADD CONSTRAINT "support_tickets_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "public"."return_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_tickets" ADD CONSTRAINT "support_tickets_parentTicketId_fkey" FOREIGN KEY ("parentTicketId") REFERENCES "public"."support_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_agents" ADD CONSTRAINT "support_agents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."support_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "public"."support_ticket_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_ticket_escalations" ADD CONSTRAINT "support_ticket_escalations_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_ticket_escalations" ADD CONSTRAINT "support_ticket_escalations_fromAgentId_fkey" FOREIGN KEY ("fromAgentId") REFERENCES "public"."support_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_ticket_escalations" ADD CONSTRAINT "support_ticket_escalations_toAgentId_fkey" FOREIGN KEY ("toAgentId") REFERENCES "public"."support_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_ticket_assignments" ADD CONSTRAINT "support_ticket_assignments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_ticket_assignments" ADD CONSTRAINT "support_ticket_assignments_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."support_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_knowledge_base" ADD CONSTRAINT "support_knowledge_base_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_knowledge_base" ADD CONSTRAINT "support_knowledge_base_lastUpdatedBy_fkey" FOREIGN KEY ("lastUpdatedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_templates" ADD CONSTRAINT "support_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_satisfaction_surveys" ADD CONSTRAINT "support_satisfaction_surveys_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_satisfaction_surveys" ADD CONSTRAINT "support_satisfaction_surveys_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_agent_shifts" ADD CONSTRAINT "support_agent_shifts_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."support_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_agent_performance" ADD CONSTRAINT "support_agent_performance_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."support_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_nigerian_features" ADD CONSTRAINT "support_nigerian_features_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
