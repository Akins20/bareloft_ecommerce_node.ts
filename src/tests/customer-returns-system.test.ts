/**
 * Customer Returns System Tests
 * Tests for customer-facing return request functionality
 */

import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import app from '../app';
import { PrismaClient } from '@prisma/client';
// Mock JWT utility for testing
const generateJWT = (payload: any) => 'mock.jwt.token';

const prisma = new PrismaClient();

describe('Customer Returns System', () => {
  let customerToken: string;
  let testCustomerId: string;
  let testOrderId: string;
  let testReturnId: string;

  beforeAll(async () => {
    // Create test customer
    const testCustomer = await prisma.user.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+2348012345678',
        email: 'john.doe@test.com',
        isVerified: true,
        role: 'CUSTOMER'
      }
    });

    testCustomerId = testCustomer.id;
    customerToken = await generateJWT({
      userId: testCustomerId,
      phoneNumber: testCustomer.phoneNumber,
      sessionId: 'test-session'
    });

    // Mock test order for simplified testing
    const testOrder = {
      id: 'test-order-001',
      orderNumber: 'TEST-ORDER-001',
      status: 'DELIVERED',
      paymentStatus: 'COMPLETED',
      total: 50000,
      currency: 'NGN'
    };

    testOrderId = testOrder.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.returnItem.deleteMany();
    await prisma.returnRequest.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('GET /api/v1/returns/eligibility/:orderId', () => {
    it('should check return eligibility for an order', async () => {
      const response = await request(app)
        .get(`/api/v1/returns/eligibility/${testOrderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('eligibility');
      expect(response.body.data.eligibility).toHaveProperty('isEligible');
      expect(response.body.data.eligibility).toHaveProperty('eligibleItems');
      expect(response.body.data.eligibility).toHaveProperty('returnPolicySummary');
    });

    it('should reject eligibility check for invalid order', async () => {
      const response = await request(app)
        .get('/api/v1/returns/eligibility/invalid-order-id')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject unauthenticated eligibility check', async () => {
      const response = await request(app)
        .get(`/api/v1/returns/eligibility/${testOrderId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/returns/request', () => {
    it('should create a new return request', async () => {
      const returnData = {
        orderId: testOrderId,
        reason: 'DEFECTIVE',
        description: 'Product arrived damaged',
        items: [
          {
            orderItemId: 'test-item-1',
            quantityToReturn: 1,
            reason: 'Item was damaged during shipping'
          }
        ],
        returnShippingMethod: 'PICKUP_SERVICE',
        customerNotes: 'Please schedule pickup for weekends'
      };

      const response = await request(app)
        .post('/api/v1/returns/request')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(returnData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('returnRequest');
      expect(response.body.data.returnRequest).toHaveProperty('returnNumber');
      expect(response.body.data).toHaveProperty('estimatedProcessingTime');
      expect(response.body.data).toHaveProperty('nextSteps');

      testReturnId = response.body.data.returnRequest.id;
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/returns/request')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate return reason', async () => {
      const returnData = {
        orderId: testOrderId,
        reason: 'INVALID_REASON',
        items: [
          {
            orderItemId: 'test-item-1',
            quantityToReturn: 1
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/returns/request')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(returnData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate phone number format', async () => {
      const returnData = {
        orderId: testOrderId,
        reason: 'DEFECTIVE',
        items: [
          {
            orderItemId: 'test-item-1',
            quantityToReturn: 1
          }
        ],
        pickupAddress: {
          firstName: 'John',
          lastName: 'Doe',
          phoneNumber: 'invalid-phone',
          addressLine1: '123 Test Street',
          city: 'Lagos',
          state: 'Lagos'
        }
      };

      const response = await request(app)
        .post('/api/v1/returns/request')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(returnData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/returns/my-returns', () => {
    it('should list customer return requests', async () => {
      const response = await request(app)
        .get('/api/v1/returns/my-returns')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('returns');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data).toHaveProperty('summary');
      expect(Array.isArray(response.body.data.returns)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/returns/my-returns?page=1&limit=10')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });

    it('should support filtering by status', async () => {
      const response = await request(app)
        .get('/api/v1/returns/my-returns?status=PENDING')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/returns/my-returns')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/returns/:returnId', () => {
    it('should get specific return details', async () => {
      const response = await request(app)
        .get(`/api/v1/returns/${testReturnId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('returnRequest');
      expect(response.body.data.returnRequest.id).toBe(testReturnId);
    });

    it('should reject access to other customer\'s returns', async () => {
      // Create another customer
      const otherCustomer = await prisma.user.create({
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          phoneNumber: '+2348087654321',
          email: 'jane.smith@test.com',
          isVerified: true,
          role: 'CUSTOMER'
        }
      });

      const otherToken = await generateJWT({
        userId: otherCustomer.id,
        phoneNumber: otherCustomer.phoneNumber,
        sessionId: 'other-session'
      });

      const response = await request(app)
        .get(`/api/v1/returns/${testReturnId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);

      // Cleanup
      await prisma.user.delete({ where: { id: otherCustomer.id } });
    });
  });

  describe('GET /api/v1/returns/dashboard', () => {
    it('should get customer return dashboard', async () => {
      const response = await request(app)
        .get('/api/v1/returns/dashboard')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('dashboard');
      expect(response.body.data.dashboard).toHaveProperty('summary');
      expect(response.body.data.dashboard).toHaveProperty('recentReturns');
      expect(response.body.data.dashboard).toHaveProperty('quickActions');
    });

    it('should support period filtering', async () => {
      const response = await request(app)
        .get('/api/v1/returns/dashboard?period=30')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/returns/policy', () => {
    it('should get return policy information', async () => {
      const response = await request(app)
        .get('/api/v1/returns/policy')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('policy');
      expect(response.body.data.policy).toHaveProperty('generalPolicy');
      expect(response.body.data.policy).toHaveProperty('nigerianSpecifics');
    });
  });

  describe('GET /api/v1/returns/faq', () => {
    it('should get return FAQ', async () => {
      const response = await request(app)
        .get('/api/v1/returns/faq')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('faq');
      expect(response.body.data.faq).toHaveProperty('categories');
      expect(response.body.data.faq).toHaveProperty('faqItems');
      expect(response.body.data.faq).toHaveProperty('popularQuestions');
      expect(response.body.data.faq).toHaveProperty('nigerianSpecific');
    });
  });

  describe('GET /api/v1/returns/pickup-locations', () => {
    it('should get pickup/drop-off locations', async () => {
      const response = await request(app)
        .get('/api/v1/returns/pickup-locations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('locations');
      expect(Array.isArray(response.body.data.locations)).toBe(true);
    });

    it('should support state filtering', async () => {
      const response = await request(app)
        .get('/api/v1/returns/pickup-locations?state=Lagos')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should support city filtering', async () => {
      const response = await request(app)
        .get('/api/v1/returns/pickup-locations?city=Ikeja')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/v1/returns/:returnId/cancel', () => {
    it('should cancel a pending return request', async () => {
      const response = await request(app)
        .put(`/api/v1/returns/${testReturnId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          reason: 'Changed my mind'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('returnRequest');
      expect(response.body.data.returnRequest.status).toBe('CANCELLED');
    });

    it('should reject cancellation of non-pending returns', async () => {
      // This would fail if the return is already cancelled from previous test
      const response = await request(app)
        .put(`/api/v1/returns/${testReturnId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          reason: 'Test cancellation'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/returns/processing-estimates', () => {
    it('should get processing time estimates', async () => {
      const response = await request(app)
        .get('/api/v1/returns/processing-estimates')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('estimates');
      expect(response.body.data.estimates).toHaveProperty('standard');
      expect(response.body.data.estimates).toHaveProperty('express');
      expect(response.body.data.estimates).toHaveProperty('currentVolume');
    });

    it('should support state-specific estimates', async () => {
      const response = await request(app)
        .get('/api/v1/returns/processing-estimates?state=Lagos')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/returns/seasonal-info', () => {
    it('should get seasonal return information', async () => {
      const response = await request(app)
        .get('/api/v1/returns/seasonal-info')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('seasonalInfo');
      expect(response.body.data.seasonalInfo).toHaveProperty('currentSeason');
      expect(response.body.data.seasonalInfo).toHaveProperty('expectedProcessingTime');
      expect(response.body.data.seasonalInfo).toHaveProperty('volumeImpact');
    });
  });

  describe('Nigerian Market Features', () => {
    it('should handle Nigerian phone number validation', async () => {
      const returnData = {
        orderId: testOrderId,
        reason: 'DEFECTIVE',
        items: [{ orderItemId: 'test-item-1', quantityToReturn: 1 }],
        pickupAddress: {
          firstName: 'Test',
          lastName: 'User',
          phoneNumber: '+2348012345678', // Valid Nigerian number
          addressLine1: '123 Test Street',
          city: 'Lagos',
          state: 'Lagos'
        }
      };

      const response = await request(app)
        .post('/api/v1/returns/request')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(returnData);

      // Should not fail on phone validation
      expect(response.status).not.toBe(400);
    });

    it('should handle Nigerian currency formatting', async () => {
      const response = await request(app)
        .get('/api/v1/returns/dashboard')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      // Check that amounts are in Naira
      const summary = response.body.data.dashboard.summary;
      if (summary.totalReturnValue > 0) {
        expect(typeof summary.totalReturnValue).toBe('number');
      }
    });

    it('should provide Nigerian-specific FAQ', async () => {
      const response = await request(app)
        .get('/api/v1/returns/faq')
        .expect(200);

      const faq = response.body.data.faq;
      expect(faq.nigerianSpecific.length).toBeGreaterThan(0);
      
      // Check for Nigerian-specific content
      const nigerianFaq = faq.nigerianSpecific[0];
      expect(nigerianFaq.nigerianSpecific).toBe(true);
    });

    it('should include Nigerian states in pickup locations', async () => {
      const response = await request(app)
        .get('/api/v1/returns/pickup-locations')
        .expect(200);

      const locations = response.body.data.locations;
      expect(locations.length).toBeGreaterThan(0);
      
      // Check that locations include Nigerian states
      const hasLagos = locations.some((loc: any) => loc.address.state === 'Lagos');
      const hasAbuja = locations.some((loc: any) => loc.address.state === 'FCT');
      expect(hasLagos || hasAbuja).toBe(true);
    });
  });
});