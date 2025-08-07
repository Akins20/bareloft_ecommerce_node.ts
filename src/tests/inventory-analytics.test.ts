import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../app';
import { UserModel, ProductModel, CategoryModel } from '../models';
import { JWTService } from '../services/auth/JWTService';

describe('Inventory Analytics API Tests', () => {
  let adminToken: string;
  let testUserId: string;
  let testCategoryId: string;
  let testProductIds: string[] = [];

  beforeAll(async () => {
    // Create test admin user
    const adminUser = await UserModel.create({
      data: {
        firstName: 'Admin',
        lastName: 'Test',
        email: 'admin.test@bareloft.com',
        phoneNumber: '+2348030000000',
        password: 'hashedpassword',
        role: 'ADMIN',
        isVerified: true,
        status: 'ACTIVE'
      }
    });

    testUserId = adminUser.id;
    const jwtService = new JWTService();
    adminToken = jwtService.generateAccessToken({ userId: adminUser.id, role: 'ADMIN' });

    // Create test category
    const category = await CategoryModel.create({
      data: {
        name: 'Test Electronics',
        description: 'Test electronics category',
        slug: 'test-electronics',
        isActive: true
      }
    });
    testCategoryId = category.id;

    // Create test products for analytics
    const productPromises = [];
    for (let i = 1; i <= 5; i++) {
      productPromises.push(
        ProductModel.create({
          data: {
            name: `Test Product ${i}`,
            description: `Test product ${i} for analytics`,
            slug: `test-product-${i}`,
            price: 50000 + (i * 10000), // Varying prices
            costPrice: 30000 + (i * 5000),
            sku: `TEST-${String(i).padStart(3, '0')}`,
            stock: 100 - (i * 10), // Varying stock levels
            lowStockThreshold: 20,
            trackQuantity: true,
            isActive: true,
            categoryId: testCategoryId,
            images: [],
            tags: []
          }
        })
      );
    }

    const products = await Promise.all(productPromises);
    testProductIds = products.map(p => p.id);
  });

  afterAll(async () => {
    // Cleanup test data
    await ProductModel.deleteMany({ where: { id: { in: testProductIds } } });
    await CategoryModel.delete({ where: { id: testCategoryId } });
    await UserModel.delete({ where: { id: testUserId } });
  });

  describe('GET /api/admin/inventory/analytics/overview', () => {
    it('should return comprehensive inventory overview analytics', async () => {
      const response = await request(app)
        .get('/api/admin/inventory/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      
      const { data } = response.body;
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('businessMetrics');
      expect(data).toHaveProperty('stockDistribution');
      expect(data).toHaveProperty('categoryBreakdown');
      expect(data).toHaveProperty('trends');

      // Verify summary structure
      expect(data.summary).toHaveProperty('totalProducts');
      expect(data.summary).toHaveProperty('totalStockValue');
      expect(data.summary).toHaveProperty('stockTurnoverRate');
      expect(data.summary).toHaveProperty('daysOfInventoryOnHand');

      // Verify Nigerian business metrics
      expect(data.businessMetrics).toHaveProperty('importVsLocalRatio');
      expect(data.businessMetrics).toHaveProperty('vatImpact');
      expect(data.businessMetrics).toHaveProperty('regionalDistribution');

      // Verify all values are properly formatted
      expect(typeof data.summary.totalProducts).toBe('number');
      expect(typeof data.summary.totalStockValue).toBe('number');
      expect(Array.isArray(data.categoryBreakdown)).toBe(true);
    });

    it('should filter by date range when provided', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/admin/inventory/analytics/overview?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
    });

    it('should require admin authentication', async () => {
      await request(app)
        .get('/api/admin/inventory/analytics/overview')
        .expect(401);
    });
  });

  describe('GET /api/admin/inventory/analytics/turnover', () => {
    it('should return inventory turnover analysis', async () => {
      const response = await request(app)
        .get('/api/admin/inventory/analytics/turnover')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const { data } = response.body;
      
      expect(data).toHaveProperty('overall');
      expect(data).toHaveProperty('categoryAnalysis');
      expect(data).toHaveProperty('productAnalysis');
      expect(data).toHaveProperty('seasonalPatterns');

      // Verify overall turnover metrics
      expect(data.overall).toHaveProperty('turnoverRate');
      expect(data.overall).toHaveProperty('averageDaysToTurn');
      expect(data.overall).toHaveProperty('fastMovingThreshold');
      expect(data.overall).toHaveProperty('slowMovingThreshold');
    });
  });

  describe('GET /api/admin/inventory/analytics/valuation', () => {
    it('should return inventory valuation with Nigerian formatting', async () => {
      const response = await request(app)
        .get('/api/admin/inventory/analytics/valuation')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const { data } = response.body;
      
      expect(data).toHaveProperty('totalValuation');
      expect(data).toHaveProperty('methodComparison');
      expect(data).toHaveProperty('categoryValuation');
      expect(data).toHaveProperty('historicalValuation');

      // Verify Nigerian currency formatting
      expect(data.totalValuation).toHaveProperty('totalValueFormatted');
      expect(data.totalValuation.totalValueFormatted).toContain('₦');

      // Verify valuation methods
      expect(data.methodComparison).toHaveProperty('fifo');
      expect(data.methodComparison).toHaveProperty('lifo');
      expect(data.methodComparison).toHaveProperty('averageCost');
      expect(data.methodComparison).toHaveProperty('currentMarketValue');
    });
  });

  describe('GET /api/admin/inventory/analytics/trends', () => {
    it('should return inventory trends analysis', async () => {
      const response = await request(app)
        .get('/api/admin/inventory/analytics/trends?timeframe=month')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const { data } = response.body;
      
      expect(data).toHaveProperty('stockLevelTrends');
      expect(data).toHaveProperty('seasonalAnalysis');
      expect(data).toHaveProperty('forecastData');

      // Verify forecast structure
      expect(data.forecastData).toHaveProperty('nextMonth');
      expect(data.forecastData).toHaveProperty('next3Months');
      expect(data.forecastData).toHaveProperty('nextYear');
    });

    it('should accept different timeframes', async () => {
      const timeframes = ['week', 'month', 'quarter', 'year'];
      
      for (const timeframe of timeframes) {
        const response = await request(app)
          .get(`/api/admin/inventory/analytics/trends?timeframe=${timeframe}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.stockLevelTrends).toHaveProperty('timeframe', timeframe);
      }
    });
  });

  describe('GET /api/admin/inventory/analytics/category', () => {
    it('should return category-wise analytics', async () => {
      const response = await request(app)
        .get('/api/admin/inventory/analytics/category')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        const categoryData = response.body.data[0];
        expect(categoryData).toHaveProperty('categoryId');
        expect(categoryData).toHaveProperty('categoryName');
        expect(categoryData).toHaveProperty('metrics');
        expect(categoryData).toHaveProperty('performance');
        expect(categoryData).toHaveProperty('nigerianContext');

        // Verify Nigerian context
        expect(categoryData.nigerianContext).toHaveProperty('localVsImported');
        expect(categoryData.nigerianContext).toHaveProperty('vatImpactFormatted');
        expect(categoryData.nigerianContext).toHaveProperty('seasonalDemand');
      }
    });

    it('should filter by specific category', async () => {
      const response = await request(app)
        .get(`/api/admin/inventory/analytics/category?categoryId=${testCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/admin/inventory/analytics/seasonal', () => {
    it('should return seasonal demand analysis for Nigeria', async () => {
      const response = await request(app)
        .get('/api/admin/inventory/analytics/seasonal')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const { data } = response.body;
      
      expect(data).toHaveProperty('pattern');
      expect(data).toHaveProperty('predictions');
      expect(data).toHaveProperty('historicalAccuracy');

      // Verify Nigerian seasonal patterns
      expect(data.pattern).toHaveProperty('festiveSeasons');
      expect(data.pattern.festiveSeasons).toHaveProperty('christmas');
      expect(data.pattern.festiveSeasons).toHaveProperty('eidFestivals');
      
      expect(data.pattern).toHaveProperty('schoolCalendar');
      expect(data.pattern).toHaveProperty('businessCycles');
      expect(data.pattern).toHaveProperty('weatherPatterns');
    });
  });

  describe('GET /api/admin/inventory/analytics/performance', () => {
    it('should return product performance metrics', async () => {
      const response = await request(app)
        .get('/api/admin/inventory/analytics/performance?limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        const productData = response.body.data[0];
        expect(productData).toHaveProperty('productId');
        expect(productData).toHaveProperty('productName');
        expect(productData).toHaveProperty('stockMetrics');
        expect(productData).toHaveProperty('salesMetrics');
        expect(productData).toHaveProperty('financialMetrics');
        expect(productData).toHaveProperty('operationalMetrics');
        expect(productData).toHaveProperty('rating');
        expect(productData).toHaveProperty('recommendations');

        // Verify Nigerian currency formatting
        expect(productData.salesMetrics).toHaveProperty('totalRevenueFormatted');
        expect(productData.financialMetrics).toHaveProperty('costPriceFormatted');
        expect(productData.financialMetrics).toHaveProperty('sellingPriceFormatted');
      }
    });

    it('should filter by specific product', async () => {
      const response = await request(app)
        .get(`/api/admin/inventory/analytics/performance?productId=${testProductIds[0]}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/admin/inventory/analytics/charts', () => {
    it('should return chart data for different chart types', async () => {
      const chartTypes = [
        'stock-value-trend',
        'turnover-comparison', 
        'category-distribution',
        'seasonal-patterns',
        'performance-matrix'
      ];

      for (const chartType of chartTypes) {
        const response = await request(app)
          .get(`/api/admin/inventory/analytics/charts?chartType=${chartType}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('type');
        expect(response.body.data).toHaveProperty('title');
      }
    });

    it('should return error for invalid chart type', async () => {
      const response = await request(app)
        .get('/api/admin/inventory/analytics/charts?chartType=invalid-chart')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/inventory/analytics/kpis', () => {
    it('should return inventory KPIs with targets', async () => {
      const response = await request(app)
        .get('/api/admin/inventory/analytics/kpis')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const { data } = response.body;
      
      expect(data).toHaveProperty('kpis');
      expect(data).toHaveProperty('targets');
      expect(data).toHaveProperty('period');

      // Verify KPI structure
      expect(data.kpis).toHaveProperty('stockValue');
      expect(data.kpis).toHaveProperty('turnoverRate');
      expect(data.kpis).toHaveProperty('stockoutRate');
      expect(data.kpis).toHaveProperty('fillRate');

      // Verify each KPI has proper structure
      expect(data.kpis.stockValue).toHaveProperty('current');
      expect(data.kpis.stockValue).toHaveProperty('previous');
      expect(data.kpis.stockValue).toHaveProperty('change');
      expect(data.kpis.stockValue).toHaveProperty('trend');
      expect(data.kpis.stockValue).toHaveProperty('formatted');
    });
  });

  describe('GET /api/admin/inventory/analytics/geographical', () => {
    it('should return geographical analysis for Nigerian states', async () => {
      const response = await request(app)
        .get('/api/admin/inventory/analytics/geographical')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const { data } = response.body;
      
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('states');
      expect(data).toHaveProperty('insights');
      expect(data).toHaveProperty('totalStockValue');
      expect(data).toHaveProperty('totalStockValueFormatted');

      expect(Array.isArray(data.states)).toBe(true);
      expect(Array.isArray(data.insights)).toBe(true);

      // Verify Nigerian states are included
      const stateNames = data.states.map((s: any) => s.state);
      expect(stateNames).toContain('Lagos');
      expect(stateNames).toContain('Abuja');
    });
  });

  describe('GET /api/admin/inventory/analytics/abc-analysis', () => {
    it('should return ABC analysis for inventory optimization', async () => {
      const response = await request(app)
        .get('/api/admin/inventory/analytics/abc-analysis')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const { data } = response.body;
      
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('categories');
      expect(data).toHaveProperty('recommendations');
      expect(data).toHaveProperty('methodology');

      // Verify ABC categories
      expect(data.categories).toHaveProperty('A');
      expect(data.categories).toHaveProperty('B');
      expect(data.categories).toHaveProperty('C');

      // Verify each category has proper structure
      expect(data.categories.A).toHaveProperty('name');
      expect(data.categories.A).toHaveProperty('productCount');
      expect(data.categories.A).toHaveProperty('salesContribution');
      expect(data.categories.A).toHaveProperty('managementFocus');

      expect(Array.isArray(data.recommendations)).toBe(true);
    });
  });

  describe('Inventory Reporting API Tests', () => {
    describe('GET /api/admin/inventory/reports/templates', () => {
      it('should return available report templates', async () => {
        const response = await request(app)
          .get('/api/admin/inventory/reports/templates')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('templates');
        expect(Array.isArray(response.body.data.templates)).toBe(true);

        if (response.body.data.templates.length > 0) {
          const template = response.body.data.templates[0];
          expect(template).toHaveProperty('id');
          expect(template).toHaveProperty('name');
          expect(template).toHaveProperty('type');
          expect(template).toHaveProperty('nigerianCompliant');
          expect(template).toHaveProperty('supportedFormats');
        }
      });
    });

    describe('POST /api/admin/inventory/reports/generate', () => {
      it('should generate inventory report successfully', async () => {
        const reportRequest = {
          templateId: 'inventory-overview',
          format: 'excel',
          includeCharts: true,
          includeNigerianFormatting: true,
          includeVATDetails: true,
          parameters: {
            period: 'last_30_days'
          }
        };

        const response = await request(app)
          .post('/api/admin/inventory/reports/generate')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(reportRequest)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('reportId');
        expect(response.body.data).toHaveProperty('downloadUrl');
        expect(response.body.data).toHaveProperty('filename');
        expect(response.body.data).toHaveProperty('status');
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/admin/inventory/reports/generate')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Missing required fields');
      });

      it('should validate template ID', async () => {
        const response = await request(app)
          .post('/api/admin/inventory/reports/generate')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ templateId: 'invalid-template' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errorCode).toBe('INVALID_TEMPLATE');
      });
    });

    describe('GET /api/admin/inventory/reports/export-options', () => {
      it('should return export options', async () => {
        const response = await request(app)
          .get('/api/admin/inventory/reports/export-options')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('formats');
        expect(response.body.data).toHaveProperty('nigerianOptions');
        expect(response.body.data).toHaveProperty('complianceOptions');

        // Verify Nigerian options
        expect(response.body.data.nigerianOptions).toHaveProperty('currency', 'NGN');
        expect(response.body.data.nigerianOptions).toHaveProperty('vatRate', 7.5);
        expect(response.body.data.nigerianOptions).toHaveProperty('timezone', 'Africa/Lagos');
      });
    });

    describe('POST /api/admin/inventory/reports/compliance', () => {
      it('should generate Nigerian compliance report', async () => {
        const complianceRequest = {
          complianceType: 'tax',
          format: 'excel'
        };

        const response = await request(app)
          .post('/api/admin/inventory/reports/compliance')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(complianceRequest)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('complianceReport');
        expect(response.body.data).toHaveProperty('downloadableReport');

        // Verify compliance report structure
        const { complianceReport } = response.body.data;
        expect(complianceReport).toHaveProperty('vatSummary');
        expect(complianceReport).toHaveProperty('taxValuation');
        expect(complianceReport).toHaveProperty('accountingStandards');

        // Verify VAT calculations
        expect(complianceReport.vatSummary).toHaveProperty('totalVatableValue');
        expect(complianceReport.vatSummary).toHaveProperty('vatCollected');
        expect(complianceReport.vatSummary).toHaveProperty('vatRemittable');
      });

      it('should validate compliance type', async () => {
        const response = await request(app)
          .post('/api/admin/inventory/reports/compliance')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ complianceType: 'invalid' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errorCode).toBe('INVALID_COMPLIANCE_TYPE');
      });
    });
  });

  describe('Dashboard Integration Tests', () => {
    describe('GET /api/admin/dashboard/inventory/widgets', () => {
      it('should return inventory dashboard widgets', async () => {
        const response = await request(app)
          .get('/api/admin/dashboard/inventory/widgets')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('widgets');
        expect(Array.isArray(response.body.data.widgets)).toBe(true);

        if (response.body.data.widgets.length > 0) {
          const widget = response.body.data.widgets[0];
          expect(widget).toHaveProperty('id');
          expect(widget).toHaveProperty('title');
          expect(widget).toHaveProperty('type');
          expect(widget).toHaveProperty('data');
          expect(widget).toHaveProperty('lastUpdated');
        }
      });
    });

    describe('GET /api/admin/dashboard/inventory/summary', () => {
      it('should return inventory summary for main dashboard', async () => {
        const response = await request(app)
          .get('/api/admin/dashboard/inventory/summary')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        const { data } = response.body;
        
        expect(data).toHaveProperty('keyMetrics');
        expect(data).toHaveProperty('alerts');
        expect(data).toHaveProperty('nigerianContext');
        expect(data).toHaveProperty('quickActions');

        // Verify key metrics
        expect(data.keyMetrics).toHaveProperty('totalStockValue');
        expect(data.keyMetrics).toHaveProperty('stockTurnoverRate');
        expect(data.keyMetrics).toHaveProperty('lowStockAlerts');

        // Verify Nigerian context
        expect(data.nigerianContext).toHaveProperty('vatCollectedFormatted');
        expect(data.nigerianContext).toHaveProperty('importVsLocal');
        expect(data.nigerianContext).toHaveProperty('businessHours');

        // Verify quick actions
        expect(Array.isArray(data.quickActions)).toBe(true);
        expect(data.quickActions.length).toBeGreaterThan(0);
      });
    });

    describe('GET /api/admin/dashboard/inventory/nigerian-widgets', () => {
      it('should return Nigerian-specific widgets', async () => {
        const response = await request(app)
          .get('/api/admin/dashboard/inventory/nigerian-widgets')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('widgets');
        expect(Array.isArray(response.body.data.widgets)).toBe(true);

        if (response.body.data.widgets.length > 0) {
          // Should contain VAT and regional widgets
          const widgetIds = response.body.data.widgets.map((w: any) => w.id);
          expect(widgetIds).toContain('vat-summary-kpi');
          expect(widgetIds).toContain('import-vs-local-chart');
        }
      });
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle invalid date parameters', async () => {
      const response = await request(app)
        .get('/api/admin/inventory/analytics/overview?startDate=invalid-date')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200); // Should still work, ignoring invalid date

      expect(response.body.success).toBe(true);
    });

    it('should handle missing authentication', async () => {
      const response = await request(app)
        .get('/api/admin/inventory/analytics/overview')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid widget ID', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/inventory/widgets/invalid-widget-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('WIDGET_NOT_FOUND');
    });
  });

  describe('Performance Tests', () => {
    it('should respond to analytics requests within reasonable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/admin/inventory/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    it('should handle concurrent requests', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .get('/api/admin/inventory/analytics/kpis')
            .set('Authorization', `Bearer ${adminToken}`)
        );
      }

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Data Validation Tests', () => {
    it('should return properly formatted Nigerian currency', async () => {
      const response = await request(app)
        .get('/api/admin/inventory/analytics/valuation')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const formattedValues = JSON.stringify(response.body);
      expect(formattedValues).toMatch(/₦[\d,]+\.?\d*/); // Should contain properly formatted Naira amounts
    });

    it('should return valid percentage values', async () => {
      const response = await request(app)
        .get('/api/admin/inventory/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const { data } = response.body;
      Object.values(data.stockDistribution).forEach((dist: any) => {
        expect(dist.percentage).toBeGreaterThanOrEqual(0);
        expect(dist.percentage).toBeLessThanOrEqual(100);
      });
    });

    it('should return consistent data across related endpoints', async () => {
      const [overviewResponse, kpiResponse] = await Promise.all([
        request(app).get('/api/admin/inventory/analytics/overview').set('Authorization', `Bearer ${adminToken}`),
        request(app).get('/api/admin/inventory/analytics/kpis').set('Authorization', `Bearer ${adminToken}`)
      ]);

      expect(overviewResponse.status).toBe(200);
      expect(kpiResponse.status).toBe(200);

      // Values should be consistent between endpoints
      const overviewStockValue = overviewResponse.body.data.summary.totalStockValue;
      const kpiStockValue = kpiResponse.body.data.kpis.stockValue.current;
      
      // Allow for some variance due to different calculation timing
      const variance = Math.abs(overviewStockValue - kpiStockValue) / overviewStockValue;
      expect(variance).toBeLessThan(0.1); // Less than 10% variance
    });
  });
});