import request from 'supertest';
import app from '../app';
import { ReturnsService } from '../services/returns/ReturnsService';
import { RefundsService } from '../services/returns/RefundsService';
import {
  ReturnStatus,
  ReturnReason,
  ReturnCondition,
  RefundStatus,
  RefundMethod,
} from '../types';

describe('Admin Returns and Refunds Management System', () => {
  let adminToken: string;
  let testUser: any;
  let testOrder: any;
  let returnsService: ReturnsService;
  let refundsService: RefundsService;

  beforeEach(async () => {
    // Setup test data
    const admin = createTestAdmin();
    adminToken = generateJWT(admin.id, admin.role);
    
    testUser = createTestUser();
    testOrder = createTestOrder(testUser.id);
    
    returnsService = new ReturnsService();
    refundsService = new RefundsService();
  });

  describe('Returns Management', () => {
    describe('GET /api/admin/returns', () => {
      it('should list all return requests with pagination', async () => {
        const response = await request(app)
          .get('/api/admin/returns')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({
            page: 1,
            limit: 20,
            status: 'PENDING,APPROVED',
            sortBy: 'createdAt',
            sortOrder: 'desc',
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('returns');
        expect(response.body.data).toHaveProperty('pagination');
        expect(response.body.data).toHaveProperty('summary');
      });

      it('should filter returns by status', async () => {
        const response = await request(app)
          .get('/api/admin/returns')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ status: 'PENDING' });

        expect(response.status).toBe(200);
        expect(response.body.data.returns).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              status: 'PENDING',
            }),
          ])
        );
      });

      it('should filter returns by Nigerian state', async () => {
        const response = await request(app)
          .get('/api/admin/returns')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ state: 'Lagos' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/admin/returns/dashboard', () => {
      it('should return returns dashboard data', async () => {
        const response = await request(app)
          .get('/api/admin/returns/dashboard')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ period: 30 });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('summary');
        expect(response.body.data).toHaveProperty('trends');
        expect(response.body.data).toHaveProperty('recentPendingReturns');
        expect(response.body.data).toHaveProperty('alerts');
      });

      it('should include Nigerian market insights', async () => {
        const response = await request(app)
          .get('/api/admin/returns/dashboard')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.summary).toHaveProperty('totalReturns');
        expect(response.body.data.summary).toHaveProperty('totalReturnValue');
        expect(response.body.data.trends).toHaveProperty('returnsByReason');
      });
    });

    describe('GET /api/admin/returns/analytics', () => {
      it('should return comprehensive returns analytics', async () => {
        const response = await request(app)
          .get('/api/admin/returns/analytics')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({
            startDate: '2024-01-01T00:00:00Z',
            endDate: '2024-12-31T23:59:59Z',
            state: 'Lagos',
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('totalReturns');
        expect(response.body.data).toHaveProperty('returnRate');
        expect(response.body.data).toHaveProperty('returnsByStatus');
        expect(response.body.data).toHaveProperty('returnsByReason');
        expect(response.body.data).toHaveProperty('qualityMetrics');
        expect(response.body.data).toHaveProperty('financialImpact');
      });
    });

    describe('POST /api/admin/returns/:returnId/approve', () => {
      it('should approve a return request with Nigerian logistics', async () => {
        const returnId = 'test-return-id';
        const approvalData = {
          approvalNotes: 'Approved for Lagos pickup service',
          estimatedPickupDate: '2024-02-15T10:00:00Z',
          timeSlot: 'morning',
          instructions: 'Use Jumia Logistics for Lagos area',
          refundPreApproval: {
            amount: 15000, // ₦150.00
            method: 'ORIGINAL_PAYMENT',
          },
        };

        const response = await request(app)
          .post(`/api/admin/returns/${returnId}/approve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(approvalData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.returnRequest.status).toBe('APPROVED');
        expect(response.body.data.estimatedProcessingTime).toContain('business days');
      });

      it('should handle Nigerian business hours for pickup scheduling', async () => {
        const returnId = 'test-return-id';
        const approvalData = {
          estimatedPickupDate: '2024-02-15T14:00:00Z', // 2 PM WAT
          timeSlot: 'afternoon',
        };

        const response = await request(app)
          .post(`/api/admin/returns/${returnId}/approve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(approvalData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /api/admin/returns/:returnId/inspect', () => {
      it('should inspect returned items with quality assessment', async () => {
        const returnId = 'test-return-id';
        const inspectionData = {
          items: [
            {
              returnItemId: 'item-1',
              condition: ReturnCondition.SELLABLE,
              conditionNotes: 'Item in perfect condition',
              inspectionPhotos: ['photo1.jpg', 'photo2.jpg'],
              restockable: true,
              restockLocation: 'Lagos Warehouse A1',
            },
            {
              returnItemId: 'item-2',
              condition: ReturnCondition.MINOR_DAMAGE,
              conditionNotes: 'Small scratch on surface',
              restockable: false,
            },
          ],
          qualityCheckNotes: 'Quality check completed by Lagos team',
          inspectorName: 'Adebayo Oluwaseun',
          recommendRefundAmount: 12000, // ₦120.00 (partial due to damage)
        };

        const response = await request(app)
          .post(`/api/admin/returns/${returnId}/inspect`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(inspectionData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.returnRequest.status).toBe('INSPECTED');
        expect(response.body.data.nextSteps).toContain('Refund will be processed');
      });

      it('should validate required inspection fields', async () => {
        const returnId = 'test-return-id';
        const invalidData = {
          items: [
            {
              returnItemId: 'item-1',
              // Missing required condition field
            },
          ],
        };

        const response = await request(app)
          .post(`/api/admin/returns/${returnId}/inspect`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/admin/returns/bulk-update', () => {
      it('should perform bulk approval of returns', async () => {
        const bulkData = {
          returnIds: ['return-1', 'return-2', 'return-3'],
          action: 'approve',
          data: {
            notes: 'Bulk approval for Lagos region returns',
          },
        };

        const response = await request(app)
          .post('/api/admin/returns/bulk-update')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(bulkData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('successful');
        expect(response.body.data).toHaveProperty('failed');
        expect(response.body.data).toHaveProperty('summary');
      });
    });

    describe('GET /api/admin/returns/export', () => {
      it('should export returns data as CSV', async () => {
        const response = await request(app)
          .get('/api/admin/returns/export')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({
            format: 'csv',
            startDate: '2024-01-01T00:00:00Z',
            endDate: '2024-12-31T23:59:59Z',
            status: 'COMPLETED',
          });

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
        expect(response.headers['content-disposition']).toContain('attachment');
      });

      it('should export returns data as JSON', async () => {
        const response = await request(app)
          .get('/api/admin/returns/export')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ format: 'json' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });
  });

  describe('Refunds Management', () => {
    describe('GET /api/admin/refunds', () => {
      it('should list all refunds with filtering', async () => {
        const response = await request(app)
          .get('/api/admin/refunds')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({
            page: 1,
            limit: 20,
            status: 'PENDING,COMPLETED',
            refundMethod: 'BANK_TRANSFER,ORIGINAL_PAYMENT',
            minAmount: 1000, // ₦10.00
            maxAmount: 100000, // ₦1,000.00
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('refunds');
        expect(response.body.data).toHaveProperty('pagination');
        expect(response.body.data).toHaveProperty('summary');
      });
    });

    describe('GET /api/admin/refunds/dashboard', () => {
      it('should return comprehensive refunds dashboard', async () => {
        const response = await request(app)
          .get('/api/admin/refunds/dashboard')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ period: 30 });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('summary');
        expect(response.body.data.summary).toHaveProperty('totalRefunds');
        expect(response.body.data.summary).toHaveProperty('totalRefundAmount');
        expect(response.body.data.summary).toHaveProperty('successRate');
        expect(response.body.data).toHaveProperty('trends');
        expect(response.body.data).toHaveProperty('quickActions');
      });
    });

    describe('POST /api/admin/refunds/process', () => {
      it('should process refund with original payment method', async () => {
        const refundData = {
          orderId: testOrder.id,
          amount: 15000, // ₦150.00
          refundMethod: RefundMethod.ORIGINAL_PAYMENT,
          reason: 'Product defective upon delivery',
          description: 'Customer reported hardware malfunction',
          adminNotes: 'Verified defect via customer video',
          notifyCustomer: true,
        };

        const response = await request(app)
          .post('/api/admin/refunds/process')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(refundData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.refund.refundMethod).toBe('ORIGINAL_PAYMENT');
        expect(response.body.data.refund.amount).toBe(refundData.amount);
        expect(response.body.data.estimatedCompletionTime).toContain('business days');
      });

      it('should process refund with Nigerian bank transfer', async () => {
        const refundData = {
          orderId: testOrder.id,
          amount: 25000, // ₦250.00
          refundMethod: RefundMethod.BANK_TRANSFER,
          reason: 'Wrong item delivered',
          bankAccountDetails: {
            accountNumber: '0123456789',
            accountName: 'Adebayo Oluwaseun',
            bankName: 'Guaranty Trust Bank',
            bankCode: '058',
          },
          adminNotes: 'Verified GT Bank account via Paystack',
          notifyCustomer: true,
        };

        const response = await request(app)
          .post('/api/admin/refunds/process')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(refundData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.refund.refundMethod).toBe('BANK_TRANSFER');
        expect(response.body.data.refund.bankAccountDetails).toEqual(
          expect.objectContaining({
            accountNumber: '0123456789',
            bankCode: '058',
          })
        );
      });

      it('should process wallet credit refund with bonus', async () => {
        const refundData = {
          orderId: testOrder.id,
          amount: 20000, // ₦200.00
          refundMethod: RefundMethod.WALLET_CREDIT,
          reason: 'Customer preference for wallet credit',
          adminNotes: '2% bonus applied for wallet refund',
        };

        const response = await request(app)
          .post('/api/admin/refunds/process')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(refundData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.refund.refundMethod).toBe('WALLET_CREDIT');
        expect(response.body.data.estimatedCompletionTime).toBe('Immediate');
      });
    });

    describe('POST /api/admin/refunds/bulk-process', () => {
      it('should process multiple refunds in batches', async () => {
        const bulkRefundData = {
          refundRequests: [
            {
              orderId: 'order-1',
              amount: 10000,
              refundMethod: RefundMethod.ORIGINAL_PAYMENT,
              reason: 'Defective product',
            },
            {
              orderId: 'order-2',
              amount: 15000,
              refundMethod: RefundMethod.BANK_TRANSFER,
              reason: 'Wrong item delivered',
            },
            {
              orderId: 'order-3',
              amount: 8000,
              refundMethod: RefundMethod.WALLET_CREDIT,
              reason: 'Customer changed mind',
            },
          ],
          processInBatches: true,
          batchSize: 2,
          notifyCustomers: true,
          adminNotes: 'Bulk processing for Lagos region',
        };

        const response = await request(app)
          .post('/api/admin/refunds/bulk-process')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(bulkRefundData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('jobId');
        expect(response.body.data).toHaveProperty('processedRefunds');
        expect(response.body.data).toHaveProperty('failedRefunds');
        expect(response.body.data.summary).toHaveProperty('totalAmount');
      });
    });

    describe('POST /api/admin/refunds/validate-bank-account', () => {
      it('should validate Nigerian bank account details', async () => {
        const bankDetails = {
          accountNumber: '0123456789',
          bankCode: '058', // GTBank
        };

        const response = await request(app)
          .post('/api/admin/refunds/validate-bank-account')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(bankDetails);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('isValid');
        expect(response.body.data).toHaveProperty('accountName');
      });

      it('should reject invalid bank code', async () => {
        const invalidBankDetails = {
          accountNumber: '0123456789',
          bankCode: '999', // Invalid code
        };

        const response = await request(app)
          .post('/api/admin/refunds/validate-bank-account')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidBankDetails);

        expect(response.status).toBe(200);
        expect(response.body.data.isValid).toBe(false);
        expect(response.body.data.error).toContain('Invalid bank code');
      });

      it('should reject invalid account number format', async () => {
        const invalidAccountDetails = {
          accountNumber: '12345', // Too short
          bankCode: '058',
        };

        const response = await request(app)
          .post('/api/admin/refunds/validate-bank-account')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidAccountDetails);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/admin/refunds/analytics', () => {
      it('should return comprehensive refund analytics', async () => {
        const response = await request(app)
          .get('/api/admin/refunds/analytics')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({
            startDate: '2024-01-01T00:00:00Z',
            endDate: '2024-12-31T23:59:59Z',
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('totalRefunds');
        expect(response.body.data).toHaveProperty('totalRefundAmount');
        expect(response.body.data).toHaveProperty('refundRate');
        expect(response.body.data).toHaveProperty('refundsByStatus');
        expect(response.body.data).toHaveProperty('refundsByMethod');
        expect(response.body.data).toHaveProperty('processingTimeMetrics');
        expect(response.body.data).toHaveProperty('financialMetrics');
      });
    });

    describe('GET /api/admin/refunds/stats/summary', () => {
      it('should return refund summary statistics', async () => {
        const response = await request(app)
          .get('/api/admin/refunds/stats/summary')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ period: 90 });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('totalRefunds');
        expect(response.body.data).toHaveProperty('averageRefundAmount');
        expect(response.body.data).toHaveProperty('performanceMetrics');
        expect(response.body.data).toHaveProperty('financialImpact');
        expect(response.body.data).toHaveProperty('topReasons');
      });
    });
  });

  describe('Nigerian Market-Specific Features', () => {
    it('should handle Nigerian business hours in processing', async () => {
      const refundData = {
        orderId: testOrder.id,
        amount: 10000,
        refundMethod: RefundMethod.BANK_TRANSFER,
        reason: 'Customer request',
        bankAccountDetails: {
          accountNumber: '0123456789',
          accountName: 'Test Customer',
          bankName: 'First Bank Nigeria',
          bankCode: '011',
        },
      };

      const response = await request(app)
        .post('/api/admin/refunds/process')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(refundData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should validate Nigerian phone numbers in return processing', async () => {
      const returnId = 'test-return-id';
      const approvalData = {
        approvalNotes: 'Approved with phone validation',
        estimatedPickupDate: '2024-02-15T10:00:00Z',
      };

      const response = await request(app)
        .post(`/api/admin/returns/${returnId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(approvalData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle Naira currency formatting in responses', async () => {
      const response = await request(app)
        .get('/api/admin/refunds/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.totalRefundAmount).toBeGreaterThanOrEqual(0);
      expect(typeof response.body.data.averageRefundAmount).toBe('number');
    });
  });

  describe('Error Handling and Validation', () => {
    it('should require admin authentication', async () => {
      const response = await request(app)
        .get('/api/admin/returns')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should validate refund amount limits', async () => {
      const invalidRefundData = {
        orderId: testOrder.id,
        amount: 10000000, // ₦100,000.00 - exceeds limit
        refundMethod: RefundMethod.ORIGINAL_PAYMENT,
        reason: 'Test refund',
      };

      const response = await request(app)
        .post('/api/admin/refunds/process')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidRefundData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate required fields for bank transfer refunds', async () => {
      const invalidRefundData = {
        orderId: testOrder.id,
        amount: 15000,
        refundMethod: RefundMethod.BANK_TRANSFER,
        reason: 'Test refund',
        // Missing bankAccountDetails
      };

      const response = await request(app)
        .post('/api/admin/refunds/process')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidRefundData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();
      
      const bulkData = {
        returnIds: Array.from({ length: 50 }, (_, i) => `return-${i + 1}`),
        action: 'approve',
        data: { notes: 'Bulk test operation' },
      };

      const response = await request(app)
        .post('/api/admin/returns/bulk-update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkData);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(response.body.data.summary.total).toBe(50);
    });

    it('should handle concurrent refund processing', async () => {
      const concurrentRefunds = Array.from({ length: 10 }, (_, i) => 
        request(app)
          .post('/api/admin/refunds/process')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            orderId: `order-${i + 1}`,
            amount: 5000,
            refundMethod: RefundMethod.WALLET_CREDIT,
            reason: `Concurrent test refund ${i + 1}`,
          })
      );

      const responses = await Promise.all(concurrentRefunds);
      
      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
    });
  });
});

// Helper functions for test data generation
function createTestUser() {
  return {
    id: 'test-user-id',
    firstName: 'Adebayo',
    lastName: 'Oluwaseun',
    email: 'adebayo.oluwaseun@email.com',
    phoneNumber: '+2348012345678',
    role: 'CUSTOMER',
  };
}

function createTestOrder(userId: string) {
  return {
    id: 'test-order-id',
    orderNumber: 'BL2024020100001',
    userId,
    status: 'DELIVERED',
    paymentStatus: 'COMPLETED',
    total: 50000, // ₦500.00 in kobo
    currency: 'NGN',
    items: [
      {
        id: 'order-item-1',
        productId: 'product-1',
        quantity: 1,
        price: 30000, // ₦300.00 in kobo
        total: 30000,
        product: {
          name: 'Samsung Galaxy A54',
          sku: 'SAM-A54-128',
        },
      },
      {
        id: 'order-item-2',
        productId: 'product-2',
        quantity: 1,
        price: 20000, // ₦200.00 in kobo
        total: 20000,
        product: {
          name: 'iPhone 13 Case',
          sku: 'IPH-13-CASE',
        },
      },
    ],
    shippingAddress: {
      firstName: 'Adebayo',
      lastName: 'Oluwaseun',
      addressLine1: '123 Ikeja Street',
      city: 'Lagos',
      state: 'Lagos',
      country: 'NG',
      phoneNumber: '+2348012345678',
    },
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-20T15:30:00Z'), // Delivered date
  };
}

function createTestAdmin() {
  return {
    id: 'test-admin-id',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@bareloft.com',
    role: 'ADMIN',
  };
}

function generateJWT(userId: string, role: string): string {
  // Mock JWT generation - in real tests, use actual JWT library
  return `mock-jwt-token-${userId}-${role}`;
}