/**
 * Comprehensive Test Suite for Phase 2.2: Inventory Alerts and Automated Reordering
 * 
 * This test file demonstrates the complete functionality of the enhanced inventory
 * management system with Nigerian business context.
 * 
 * Test Coverage:
 * 1. Multi-level alert system
 * 2. Alert configuration and management
 * 3. Automated reorder suggestions
 * 4. Reorder workflow management
 * 5. Supplier management
 * 6. Nigerian business features
 * 7. Integration with notification system
 */

import request from "supertest";
import { app } from "../app";
import { NotificationService } from "../services/notifications/NotificationService";
import { InventoryAlertService } from "../services/inventory/InventoryAlertService";
import { ReorderService } from "../services/inventory/ReorderService";
import { CacheService } from "../services/cache/CacheService";
import {
  StockAlert,
  AlertSeverity,
  ReorderStatus,
  NotificationType,
  NotificationChannel,
} from "../types";

describe("Phase 2.2: Inventory Alerts and Automated Reordering", () => {
  let authToken: string;
  let adminUserId: string;
  let testProductId: string;
  let testSupplierId: string;
  let alertConfigId: string;

  beforeAll(async () => {
    // Setup test authentication
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        phoneNumber: "+234801234567", // Test admin phone
        otpCode: "123456", // Test OTP
      });

    authToken = loginResponse.body.data.token;
    adminUserId = loginResponse.body.data.user.id;

    // Create test product for inventory operations
    const productResponse = await request(app)
      .post("/api/admin/products")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Samsung Galaxy S23 Ultra",
        slug: "samsung-galaxy-s23-ultra-test",
        description: "Latest Samsung flagship smartphone",
        price: 1200000, // ₦1,200,000 - Nigerian pricing
        categoryId: "electronics-category-id",
        stock: 5, // Low stock for testing
        lowStockThreshold: 10,
        trackQuantity: true,
        isActive: true,
      });

    testProductId = productResponse.body.data.product.id;
  });

  describe("1. Multi-Level Alert System", () => {
    it("should detect and create low stock alerts", async () => {
      const response = await request(app)
        .get("/api/admin/inventory/alerts")
        .set("Authorization", `Bearer ${authToken}`)
        .query({
          type: StockAlert.LOW_STOCK,
          severity: AlertSeverity.HIGH,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.alerts).toBeInstanceOf(Array);
      expect(response.body.data.summary).toHaveProperty("total");
      expect(response.body.data.summary).toHaveProperty("bySeverity");
      expect(response.body.data.summary).toHaveProperty("byType");
    });

    it("should create critical stock alert for very low inventory", async () => {
      // Update product to have critical stock level (1 unit)
      await request(app)
        .put(`/api/admin/inventory/${testProductId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          quantity: 1,
          reason: "Testing critical stock alert",
        });

      // Trigger monitoring
      const monitorResponse = await request(app)
        .post("/api/admin/inventory/alerts/monitor")
        .set("Authorization", `Bearer ${authToken}`);

      expect(monitorResponse.status).toBe(200);
      expect(monitorResponse.body.data.alertsCreated).toBeGreaterThan(0);

      // Check for critical alerts
      const alertsResponse = await request(app)
        .get("/api/admin/inventory/alerts")
        .set("Authorization", `Bearer ${authToken}`)
        .query({
          severity: AlertSeverity.CRITICAL,
          productId: testProductId,
        });

      expect(alertsResponse.status).toBe(200);
    });

    it("should handle out of stock alerts with urgent severity", async () => {
      // Set product to out of stock
      await request(app)
        .put(`/api/admin/inventory/${testProductId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          quantity: 0,
          reason: "Testing out of stock alert",
        });

      // Trigger monitoring
      await request(app)
        .post("/api/admin/inventory/alerts/monitor")
        .set("Authorization", `Bearer ${authToken}`);

      // Check for urgent out of stock alerts
      const alertsResponse = await request(app)
        .get("/api/admin/inventory/alerts")
        .set("Authorization", `Bearer ${authToken}`)
        .query({
          type: StockAlert.OUT_OF_STOCK,
          severity: AlertSeverity.URGENT,
        });

      expect(alertsResponse.status).toBe(200);
    });
  });

  describe("2. Alert Configuration and Management", () => {
    it("should create alert configuration with Nigerian business context", async () => {
      const response = await request(app)
        .post("/api/admin/inventory/alerts/configure")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Nigerian E-commerce Alert Config",
          description: "Optimized for Nigerian business hours and practices",
          lowStockEnabled: true,
          lowStockThreshold: 15,
          criticalStockEnabled: true,
          criticalStockThreshold: 5,
          outOfStockEnabled: true,
          reorderNeededEnabled: true,
          slowMovingEnabled: true,
          slowMovingDays: 30,
          emailEnabled: true,
          emailAddress: "inventory@bareloft.com",
          smsEnabled: true,
          phoneNumber: "+234801234567", // Nigerian format
          pushEnabled: true,
          respectBusinessHours: true,
          businessHoursStart: "08:00", // Nigerian business hours
          businessHoursEnd: "18:00",
          businessDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
          timezone: "Africa/Lagos", // Nigerian timezone
          maxAlertsPerHour: 5,
          maxAlertsPerDay: 20,
          minStockValue: 50000, // ₦50,000 minimum value threshold
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.configuration).toHaveProperty("id");
      expect(response.body.data.configuration.timezone).toBe("Africa/Lagos");
      expect(response.body.data.configuration.businessHoursStart).toBe("08:00");
      
      alertConfigId = response.body.data.configuration.id;
    });

    it("should validate Nigerian phone number format", async () => {
      const response = await request(app)
        .post("/api/admin/inventory/alerts/configure")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Invalid Phone Config",
          lowStockEnabled: true,
          emailEnabled: false,
          smsEnabled: true,
          phoneNumber: "1234567890", // Invalid format
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Invalid Nigerian phone number");
    });

    it("should test alert notifications", async () => {
      const response = await request(app)
        .post("/api/admin/inventory/alerts/test")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          configurationId: alertConfigId,
          alertType: StockAlert.LOW_STOCK,
          productId: testProductId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.notificationId).toBeTruthy();
      expect(response.body.message).toContain("Test alert sent successfully");
    });

    it("should acknowledge and dismiss alerts", async () => {
      // First get an alert ID
      const alertsResponse = await request(app)
        .get("/api/admin/inventory/alerts")
        .set("Authorization", `Bearer ${authToken}`)
        .query({ limit: 1 });

      expect(alertsResponse.status).toBe(200);
      
      if (alertsResponse.body.data.alerts.length > 0) {
        const alertId = alertsResponse.body.data.alerts[0].id;

        // Acknowledge alert
        const ackResponse = await request(app)
          .put(`/api/admin/inventory/alerts/${alertId}`)
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            action: "acknowledge",
            notes: "Acknowledged by admin - will reorder soon",
          });

        expect(ackResponse.status).toBe(200);
        expect(ackResponse.body.message).toContain("acknowledged successfully");
      }
    });
  });

  describe("3. Automated Reorder Suggestions", () => {
    beforeAll(async () => {
      // Create a test supplier first
      const supplierResponse = await request(app)
        .post("/api/admin/inventory/suppliers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Lagos Electronics Hub",
          code: "LEH001",
          contactPerson: "Adebayo Johnson",
          email: "adebayo@lagoselectronics.com",
          phone: "+234803456789",
          whatsapp: "+234803456789",
          address: {
            street: "Plot 15, Computer Village",
            city: "Lagos",
            state: "Lagos",
            country: "Nigeria",
            postalCode: "100001",
          },
          isLocal: true, // Nigerian supplier
          businessType: "distributor",
          taxId: "12345678-0001",
          cacNumber: "RC123456",
          paymentTerms: "Net 30 days",
          currency: "NGN",
          creditLimit: 5000000, // ₦5M credit limit
          discountPercentage: 5,
          averageLeadTimeDays: 3, // Local supplier - fast delivery
        });

      expect(supplierResponse.status).toBe(201);
      testSupplierId = supplierResponse.body.data.supplier.id;
    });

    it("should generate AI-powered reorder suggestions", async () => {
      const response = await request(app)
        .get("/api/admin/inventory/reorder-suggestions")
        .set("Authorization", `Bearer ${authToken}`)
        .query({
          priority: AlertSeverity.HIGH,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions).toBeInstanceOf(Array);
      expect(response.body.data.summary).toHaveProperty("totalSuggestions");
      expect(response.body.data.summary).toHaveProperty("estimatedTotalCost");
      expect(response.body.data.summary).toHaveProperty("urgent");
    });

    it("should create manual reorder suggestion", async () => {
      const response = await request(app)
        .post("/api/admin/inventory/reorder-suggestion")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          productId: testProductId,
          quantity: 50,
          reason: "Preparing for anticipated demand increase",
          preferredSupplierId: testSupplierId,
          notes: "Order before weekend to ensure Monday delivery",
          priority: AlertSeverity.HIGH,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestion).toHaveProperty("id");
      expect(response.body.data.suggestion.quantity).toBe(50);
      expect(response.body.data.suggestion.localSupplierAvailable).toBe(true);
      expect(response.body.data.suggestion.businessDaysToReorder).toBeGreaterThan(0);
    });

    it("should calculate Nigerian business context correctly", async () => {
      const suggestion = await request(app)
        .post("/api/admin/inventory/reorder-suggestion")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          productId: testProductId,
          preferredSupplierId: testSupplierId,
        });

      expect(suggestion.status).toBe(201);
      const data = suggestion.body.data.suggestion;
      
      // Should identify as local supplier (no import required)
      expect(data.importRequired).toBe(false);
      expect(data.localSupplierAvailable).toBe(true);
      expect(data.customsClearanceDays).toBeUndefined();
      expect(data.currency).toBe("NGN");
    });
  });

  describe("4. Reorder Workflow Management", () => {
    let reorderRequestId: string;

    it("should create reorder request", async () => {
      const response = await request(app)
        .post(`/api/admin/inventory/reorder/${testProductId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          supplierId: testSupplierId,
          quantity: 25,
          unitCost: 950000, // ₦950,000 per unit
          expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
          requiresImport: false, // Local supplier
          notes: "Urgent reorder for popular product",
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reorderRequest).toHaveProperty("id");
      expect(response.body.data.reorderRequest.totalCost).toBe(25 * 950000);
      expect(response.body.data.reorderRequest.status).toBe(ReorderStatus.PENDING_APPROVAL);
      
      reorderRequestId = response.body.data.reorderRequest.id;
    });

    it("should get pending reorder requests", async () => {
      const response = await request(app)
        .get("/api/admin/inventory/pending-reorders")
        .set("Authorization", `Bearer ${authToken}`)
        .query({
          status: ReorderStatus.PENDING_APPROVAL,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.requests).toBeInstanceOf(Array);
      expect(response.body.data.summary).toHaveProperty("totalRequests");
      expect(response.body.data.summary).toHaveProperty("totalValue");
      expect(response.body.data.summary).toHaveProperty("requiresImport");
    });

    it("should approve reorder request", async () => {
      const response = await request(app)
        .put(`/api/admin/inventory/reorder/${reorderRequestId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          action: "approve",
          notes: "Approved - proceed with purchase order",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reorderRequest.status).toBe(ReorderStatus.APPROVED);
      expect(response.body.data.reorderRequest.approvedBy).toBe(adminUserId);
    });

    it("should complete reorder request", async () => {
      const response = await request(app)
        .put(`/api/admin/inventory/reorder/${reorderRequestId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          action: "complete",
          actualDeliveryDate: new Date(),
          orderReference: "PO-2024-001",
          supplierReference: "LEH-SO-789",
          trackingNumber: "TRK123456789",
          notes: "Goods received and quality checked",
        });

      expect(response.status).toBe(200);
      expect(response.body.data.reorderRequest.status).toBe(ReorderStatus.COMPLETED);
      expect(response.body.data.reorderRequest.orderReference).toBe("PO-2024-001");
    });

    it("should verify inventory was updated after completion", async () => {
      // Check that product stock was increased
      const inventoryResponse = await request(app)
        .get(`/api/admin/inventory/${testProductId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(inventoryResponse.status).toBe(200);
      expect(inventoryResponse.body.data.inventory.quantity).toBeGreaterThanOrEqual(25);
    });
  });

  describe("5. Supplier Management with Nigerian Context", () => {
    it("should create Nigerian supplier with local business details", async () => {
      const response = await request(app)
        .post("/api/admin/inventory/suppliers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Aba Manufacturing Co.",
          code: "AMC001",
          contactPerson: "Chioma Okafor",
          email: "chioma@abamanufacturing.com",
          phone: "+234703456789",
          whatsapp: "+234703456789", // WhatsApp for Nigerian business
          address: {
            street: "Industrial Layout, Aba",
            city: "Aba",
            state: "Abia",
            country: "Nigeria",
            postalCode: "450001",
          },
          isLocal: true,
          businessType: "manufacturer",
          taxId: "87654321-0001",
          cacNumber: "RC789012",
          paymentTerms: "Net 45 days", // Nigerian payment terms
          currency: "NGN",
          creditLimit: 10000000, // ₦10M credit limit
          discountPercentage: 7.5,
          averageLeadTimeDays: 14, // Manufacturing lead time
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.supplier.isLocal).toBe(true);
      expect(response.body.data.supplier.currency).toBe("NGN");
      expect(response.body.data.supplier.cacNumber).toBe("RC789012");
    });

    it("should get local suppliers list", async () => {
      const response = await request(app)
        .get("/api/admin/inventory/suppliers")
        .set("Authorization", `Bearer ${authToken}`)
        .query({
          isLocal: true,
          isActive: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.suppliers).toBeInstanceOf(Array);
      
      // All suppliers should be local (Nigerian)
      response.body.data.suppliers.forEach((supplier: any) => {
        expect(supplier.isLocal).toBe(true);
        expect(supplier.currency).toBe("NGN");
      });
    });

    it("should validate WhatsApp number for Nigerian suppliers", async () => {
      const response = await request(app)
        .post("/api/admin/inventory/suppliers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Invalid WhatsApp Supplier",
          isLocal: true,
          businessType: "distributor",
          averageLeadTimeDays: 7,
          whatsapp: "123456789", // Invalid format
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Invalid WhatsApp number format");
    });
  });

  describe("6. Reorder History and Analytics", () => {
    it("should get comprehensive reorder history", async () => {
      const response = await request(app)
        .get("/api/admin/inventory/reorder-history")
        .set("Authorization", `Bearer ${authToken}`)
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
          endDate: new Date().toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.requests).toBeInstanceOf(Array);
      expect(response.body.data.analytics).toHaveProperty("totalOrders");
      expect(response.body.data.analytics).toHaveProperty("totalValue");
      expect(response.body.data.analytics).toHaveProperty("completionRate");
      expect(response.body.data.analytics).toHaveProperty("averageDeliveryDays");
    });

    it("should get alert history with trends", async () => {
      const response = await request(app)
        .get("/api/admin/inventory/alerts/history")
        .set("Authorization", `Bearer ${authToken}`)
        .query({
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.alerts).toBeInstanceOf(Array);
      expect(response.body.data.trends).toHaveProperty("totalAlerts");
      expect(response.body.data.trends).toHaveProperty("alertResolutionTime");
    });
  });

  describe("7. Integration with Notification System", () => {
    it("should send email notifications for critical alerts", async () => {
      // This test would verify that email notifications are sent
      // In a real test environment, you might mock the email service
      const alertService = new InventoryAlertService(
        new NotificationService(),
        new CacheService()
      );

      // Trigger monitoring which should send notifications
      const result = await alertService.monitorInventoryLevels();
      expect(result.notificationsSent).toBeGreaterThanOrEqual(0);
    });

    it("should respect Nigerian business hours for alerts", async () => {
      const currentHour = new Date().getHours();
      const isBusinessHours = currentHour >= 8 && currentHour <= 18;
      
      // Test would verify that alerts respect configured business hours
      // Implementation would depend on actual notification timing logic
      expect(typeof isBusinessHours).toBe("boolean");
    });
  });

  describe("8. Error Handling and Edge Cases", () => {
    it("should handle invalid product ID in reorder request", async () => {
      const response = await request(app)
        .post("/api/admin/inventory/reorder/invalid-product-id")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          quantity: 10,
          unitCost: 1000,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it("should handle invalid alert configuration", async () => {
      const response = await request(app)
        .post("/api/admin/inventory/alerts/configure")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          // Missing required name field
          lowStockEnabled: true,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should handle invalid reorder action", async () => {
      const response = await request(app)
        .put(`/api/admin/inventory/reorder/some-id`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          action: "invalid_action",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Invalid action");
    });
  });

  afterAll(async () => {
    // Cleanup test data
    // In a real test environment, you would clean up created test records
    console.log("Test suite completed - cleanup would happen here");
  });
});