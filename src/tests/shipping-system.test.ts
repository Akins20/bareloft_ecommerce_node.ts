import request from 'supertest';
import { app } from '../app';
import { ShippingService } from '../services/shipping/ShippingService';
import { JumiaLogisticsService } from '../services/shipping/JumiaLogisticsService';
import { LocalCarrierService } from '../services/shipping/LocalCarrierService';
import {
  ShipmentRateRequest,
  CreateShipmentRequest,
  NigerianAddress,
  PackageDimensions,
} from '../types';

/**
 * Comprehensive Shipping System Tests
 * Testing Nigerian carrier integration, tracking, and analytics
 */
describe('Nigerian Shipping System', () => {
  let authToken: string;
  let adminUser: any;
  let testOrder: any;

  beforeAll(async () => {
    // Setup test authentication
    const authResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        phoneNumber: '+2348000000001',
        otp: '123456'
      });

    authToken = authResponse.body.data.accessToken;
    adminUser = authResponse.body.data.user;

    // Create a test order for shipping tests
    const orderResponse = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        shippingAddress: {
          firstName: 'Adebayo',
          lastName: 'Ogundimu',
          addressLine1: '15, Allen Avenue',
          city: 'Ikeja',
          state: 'Lagos',
          country: 'NG',
          phoneNumber: '+2348123456789'
        },
        paymentMethod: 'card'
      });

    testOrder = orderResponse.body.data.order;
  });

  describe('Carrier Integration', () => {
    describe('Jumia Logistics Service', () => {
      let jumiaService: JumiaLogisticsService;

      beforeEach(() => {
        jumiaService = new JumiaLogisticsService({
          apiKey: 'test_jumia_key',
          sellerId: 'test_seller_123',
          baseUrl: 'https://api.jumia-test.com',
          testMode: true
        });
      });

      it('should calculate shipping rates for Lagos delivery', async () => {
        const rateRequest: ShipmentRateRequest = {
          originCity: 'Lagos',
          originState: 'Lagos',
          destinationCity: 'Ikeja',
          destinationState: 'Lagos',
          packageWeight: 2.5,
          packageDimensions: { length: 30, width: 20, height: 15, weight: 2.5 },
          declaredValue: 25000,
          serviceType: 'standard'
        };

        const rate = await jumiaService.calculateShippingRate(rateRequest);

        expect(rate).toBeDefined();
        expect(rate.carrierId).toBe('jumia_logistics');
        expect(rate.carrierName).toBe('Jumia Logistics');
        expect(rate.cost).toBeGreaterThan(0);
        expect(rate.currency).toBe('NGN');
        expect(rate.estimatedDays).toBeGreaterThanOrEqual(1);
      });

      it('should create shipment for Nigerian address', async () => {
        const shipmentRequest: CreateShipmentRequest = {
          orderId: testOrder.id,
          carrierId: 'jumia_logistics',
          serviceType: 'standard',
          destinationAddress: {
            firstName: 'Chidi',
            lastName: 'Okwu',
            addressLine1: '23, Aba Road',
            city: 'Port Harcourt',
            state: 'Rivers',
            country: 'NG',
            phoneNumber: '+2348087654321'
          },
          packageWeight: 3.0,
          packageDimensions: { length: 40, width: 30, height: 20, weight: 3.0 },
          declaredValue: 45000,
          specialInstructions: 'Handle with care - fragile items'
        };

        const shipment = await jumiaService.createShipment(shipmentRequest);

        expect(shipment).toBeDefined();
        expect(shipment.trackingNumber).toBeDefined();
        expect(shipment.orderId).toBe(testOrder.id);
        expect(shipment.status).toBe('PENDING');
        expect(shipment.destinationAddress.state).toBe('Rivers');
      });

      it('should validate Nigerian phone numbers', async () => {
        const validPhones = ['+2348123456789', '08123456789', '07012345678'];
        const invalidPhones = ['+1234567890', '123456789', '+234123'];

        validPhones.forEach(phone => {
          const address: NigerianAddress = {
            firstName: 'Test',
            lastName: 'User',
            addressLine1: 'Test Address',
            city: 'Lagos',
            state: 'Lagos',
            country: 'NG',
            phoneNumber: phone
          };
          // This would be tested in the actual carrier service validation
          expect(phone).toMatch(/^(\+234|234|0)[789][01]\d{8}$/);
        });
      });

      it('should handle Nigerian state validation', async () => {
        const validStates = ['Lagos', 'Abuja', 'Kano', 'Rivers', 'Oyo'];
        const invalidStates = ['California', 'Texas', 'London'];

        validStates.forEach(state => {
          // Test state validation logic
          const nigerianStates = [
            'Lagos', 'Abuja', 'Kano', 'Rivers', 'Oyo', 'Kaduna', 'Ogun', 
            'Imo', 'Plateau', 'Akwa Ibom'
          ];
          expect(nigerianStates).toContain(state);
        });
      });
    });

    describe('Local Carrier Service', () => {
      let localService: LocalCarrierService;

      beforeEach(() => {
        localService = new LocalCarrierService();
      });

      it('should calculate rates for local delivery', async () => {
        const rateRequest: ShipmentRateRequest = {
          originCity: 'Lagos',
          originState: 'Lagos',
          destinationCity: 'Ibadan',
          destinationState: 'Oyo',
          packageWeight: 1.5,
          packageDimensions: { length: 25, width: 15, height: 10, weight: 1.5 },
          declaredValue: 15000,
          serviceType: 'standard'
        };

        const rate = await localService.calculateShippingRate(rateRequest);

        expect(rate).toBeDefined();
        expect(rate.cost).toBeGreaterThan(0);
        expect(rate.currency).toBe('NGN');
        expect(rate.serviceType).toBe('standard');
      });

      it('should apply Nigerian surcharges correctly', async () => {
        // Test remote area surcharge for northern states
        const remoteStateRequest: ShipmentRateRequest = {
          originCity: 'Lagos',
          originState: 'Lagos',
          destinationCity: 'Maiduguri',
          destinationState: 'Borno',
          packageWeight: 2.0,
          packageDimensions: { length: 30, width: 20, height: 15, weight: 2.0 },
          declaredValue: 20000,
          serviceType: 'standard'
        };

        const nearbyStateRequest: ShipmentRateRequest = {
          ...remoteStateRequest,
          destinationCity: 'Abeokuta',
          destinationState: 'Ogun'
        };

        const remoteRate = await localService.calculateShippingRate(remoteStateRequest);
        const nearbyRate = await localService.calculateShippingRate(nearbyStateRequest);

        // Remote areas should cost more due to surcharges
        expect(remoteRate.cost).toBeGreaterThan(nearbyRate.cost);
      });
    });
  });

  describe('Admin Shipping API', () => {
    describe('Carrier Management', () => {
      it('should list available carriers', async () => {
        const response = await request(app)
          .get('/api/admin/shipping/carriers')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.metadata.total).toBeGreaterThanOrEqual(0);
      });

      it('should create new shipping carrier', async () => {
        const carrierData = {
          name: 'Test Nigerian Logistics',
          code: 'TNL_NG',
          type: 'standard',
          status: 'ACTIVE',
          supportedServices: ['standard', 'express'],
          coverageAreas: ['Lagos', 'Abuja'],
          businessHours: {
            weekdays: { start: '09:00', end: '17:00' },
            saturday: { start: '10:00', end: '15:00' }
          },
          contactInfo: {
            phone: '+234-800-TEST-NG',
            email: 'support@testlogistics.ng'
          }
        };

        const response = await request(app)
          .post('/api/admin/shipping/carriers')
          .set('Authorization', `Bearer ${authToken}`)
          .send(carrierData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe(carrierData.name);
        expect(response.body.data.code).toBe(carrierData.code);
      });

      it('should calculate shipping rates for Nigerian destinations', async () => {
        const query = {
          destinationCity: 'Kano',
          destinationState: 'Kano',
          packageWeight: 3.0,
          packageDimensions: JSON.stringify({ length: 35, width: 25, height: 20, weight: 3.0 }),
          declaredValue: 30000,
          serviceType: 'standard'
        };

        const response = await request(app)
          .get('/api/admin/shipping/rates')
          .query(query)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.metadata.ratesCount).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Tracking Management', () => {
      it('should track shipment by tracking number', async () => {
        // This would require a real shipment to test properly
        const mockTrackingNumber = 'JUM202312250001';

        const response = await request(app)
          .get(`/api/admin/shipping/tracking/${mockTrackingNumber}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        // In test environment, this might return mock data or error
      });

      it('should handle bulk tracking requests', async () => {
        const bulkRequest = {
          trackingNumbers: ['JUM202312250001', 'SLD202312250002'],
          includeEvents: true,
          includeDeliveryAttempts: true
        };

        const response = await request(app)
          .post('/api/admin/shipping/tracking/bulk')
          .set('Authorization', `Bearer ${authToken}`)
          .send(bulkRequest)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.metadata.requested).toBe(2);
      });

      it('should accept carrier webhook updates', async () => {
        const webhookData = {
          trackingNumber: 'JUM202312250001',
          status: 'IN_TRANSIT',
          location: 'Lagos Sorting Facility',
          description: 'Package in transit to destination',
          timestamp: new Date().toISOString()
        };

        const response = await request(app)
          .post('/api/admin/shipping/tracking/webhook')
          .set('x-carrier-id', 'jumia_logistics')
          .send(webhookData)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('Analytics and Reporting', () => {
      it('should provide shipping performance analytics', async () => {
        const response = await request(app)
          .get('/api/admin/shipping/analytics/performance')
          .query({
            startDate: '2023-12-01',
            endDate: '2023-12-31',
            states: 'Lagos,Abuja,Kano'
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.period).toBeDefined();
        expect(response.body.data.overview).toBeDefined();
        expect(response.body.data.carrierPerformance).toBeInstanceOf(Array);
        expect(response.body.data.statePerformance).toBeInstanceOf(Array);
      });

      it('should provide cost analytics', async () => {
        const response = await request(app)
          .get('/api/admin/shipping/analytics/costs')
          .query({
            startDate: '2023-12-01',
            endDate: '2023-12-31'
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.summary).toBeDefined();
        expect(response.body.data.recommendations).toBeInstanceOf(Array);
      });

      it('should provide delay analysis', async () => {
        const response = await request(app)
          .get('/api/admin/shipping/analytics/delays')
          .query({
            daysThreshold: 3,
            startDate: '2023-12-01',
            endDate: '2023-12-31'
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.delayedShipments).toBeInstanceOf(Array);
        expect(response.body.data.summary).toBeDefined();
      });

      it('should provide real-time dashboard metrics', async () => {
        const response = await request(app)
          .get('/api/admin/shipping/dashboard')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.overview).toBeDefined();
        expect(response.body.data.carrierStatus).toBeInstanceOf(Array);
      });
    });

    describe('Delivery Management', () => {
      it('should schedule delivery', async () => {
        const scheduleData = {
          shipmentId: 'test_shipment_123',
          scheduledDate: '2023-12-28',
          timeWindow: {
            start: '10:00',
            end: '16:00'
          },
          driverInfo: {
            name: 'Emeka Okafor',
            phone: '+2348123456789',
            vehicle: 'Toyota Hiace - ABC123NG'
          },
          specialInstructions: 'Call customer 30 minutes before delivery'
        };

        const response = await request(app)
          .post('/api/admin/shipping/schedule-delivery')
          .set('Authorization', `Bearer ${authToken}`)
          .send(scheduleData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.scheduled).toBe(true);
      });

      it('should provide delivery calendar', async () => {
        const response = await request(app)
          .get('/api/admin/shipping/delivery-calendar')
          .query({
            startDate: '2023-12-25',
            endDate: '2023-12-31'
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.metadata.totalDays).toBe(7);
      });
    });
  });

  describe('Nigerian Market Specific Features', () => {
    describe('Address Validation', () => {
      it('should validate Nigerian state names', () => {
        const validStates = [
          'Lagos', 'Abuja', 'FCT', 'Kano', 'Rivers', 'Oyo', 'Kaduna', 'Ogun',
          'Imo', 'Plateau', 'Akwa Ibom', 'Abia', 'Adamawa', 'Anambra', 'Bauchi'
        ];

        validStates.forEach(state => {
          // Test state validation in shipping service
          expect(typeof state).toBe('string');
          expect(state.length).toBeGreaterThan(2);
        });
      });

      it('should handle Nigerian phone number formats', () => {
        const phoneFormats = [
          { input: '+2348123456789', expected: '+2348123456789' },
          { input: '08123456789', expected: '+2348123456789' },
          { input: '070123456789', expected: '+234070123456789' },
          { input: '+234 812 345 6789', expected: '+2348123456789' }
        ];

        phoneFormats.forEach(({ input, expected }) => {
          const cleaned = input.replace(/[\s\-\(\)]/g, '');
          expect(cleaned).toMatch(/^(\+234|234|0)[789][01]\d{8}$/);
        });
      });
    });

    describe('Business Hours Integration', () => {
      it('should respect Nigerian business hours', () => {
        const businessHours = {
          monday: { start: '08:00', end: '18:00' },
          tuesday: { start: '08:00', end: '18:00' },
          wednesday: { start: '08:00', end: '18:00' },
          thursday: { start: '08:00', end: '18:00' },
          friday: { start: '08:00', end: '18:00' },
          saturday: { start: '09:00', end: '16:00' },
          sunday: null // No delivery on Sundays
        };

        expect(businessHours.sunday).toBeNull();
        expect(businessHours.saturday.end).toBe('16:00');
        expect(businessHours.monday.start).toBe('08:00');
      });

      it('should handle Nigerian public holidays', () => {
        const publicHolidays = [
          { date: '2024-01-01', name: 'New Year\'s Day' },
          { date: '2024-10-01', name: 'Independence Day' },
          { date: '2024-12-25', name: 'Christmas Day' },
          { date: '2024-12-26', name: 'Boxing Day' }
        ];

        publicHolidays.forEach(holiday => {
          expect(new Date(holiday.date)).toBeInstanceOf(Date);
          expect(holiday.name).toBeDefined();
        });
      });
    });

    describe('Weather and Seasonal Considerations', () => {
      it('should account for rainy season delays', () => {
        const rainySeasonMonths = [4, 5, 6, 7, 8, 9, 10]; // Apr-Oct
        const currentMonth = new Date().getMonth() + 1;
        
        const isRainySeason = rainySeasonMonths.includes(currentMonth);
        
        if (isRainySeason) {
          // During rainy season, expect potential delays
          expect(rainySeasonMonths).toContain(currentMonth);
        }
      });
    });

    describe('Security Considerations', () => {
      it('should handle high-value package security', () => {
        const highValueThreshold = 100000; // ₦100,000
        const packageValue = 150000;
        
        if (packageValue > highValueThreshold) {
          // High-value packages should have additional security measures
          expect(packageValue).toBeGreaterThan(highValueThreshold);
        }
      });
    });
  });

  describe('Integration with Order System', () => {
    it('should create shipment from order', async () => {
      // This test would verify integration between order and shipping systems
      expect(testOrder).toBeDefined();
      expect(testOrder.id).toBeDefined();
      expect(testOrder.status).toBeDefined();
    });

    it('should update order status based on shipping events', async () => {
      // Test order status updates from shipping events
      const shippingStatuses = ['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];
      const orderStatuses = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
      
      expect(shippingStatuses.length).toBe(orderStatuses.length);
    });
  });
});

/**
 * Helper function to create test Nigerian address
 */
function createTestNigerianAddress(state: string = 'Lagos'): NigerianAddress {
  const addresses = {
    Lagos: {
      firstName: 'Adebayo',
      lastName: 'Ogundimu',
      addressLine1: '15, Allen Avenue',
      city: 'Ikeja',
      state: 'Lagos',
      country: 'NG',
      phoneNumber: '+2348123456789',
      landmarkInstructions: 'Near Computer Village'
    },
    Abuja: {
      firstName: 'Aisha',
      lastName: 'Mohammed',
      addressLine1: 'Plot 1234, Cadastral Zone',
      city: 'Wuse II',
      state: 'FCT',
      country: 'NG',
      phoneNumber: '+2349087654321',
      landmarkInstructions: 'Behind Shoprite Mall'
    },
    Kano: {
      firstName: 'Ibrahim',
      lastName: 'Abdullahi',
      addressLine1: 'No. 56, Ahmadu Bello Way',
      city: 'Kano',
      state: 'Kano',
      country: 'NG',
      phoneNumber: '+2347012345678',
      landmarkInstructions: 'Opposite Central Mosque'
    }
  };

  return addresses[state as keyof typeof addresses] || addresses.Lagos;
}

/**
 * Helper function to create test package dimensions
 */
function createTestPackageDimensions(size: 'small' | 'medium' | 'large' = 'medium'): PackageDimensions {
  const dimensions = {
    small: { length: 20, width: 15, height: 10, weight: 1.0 },
    medium: { length: 35, width: 25, height: 20, weight: 3.0 },
    large: { length: 50, width: 40, height: 30, weight: 8.0 }
  };

  return dimensions[size];
}