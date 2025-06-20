import { BaseService } from "../BaseService";
import { AnalyticsService } from "./AnalyticsService";
import { CacheService } from "../cache/CacheService";
import { 
  UserModel,
  ProductModel,
  OrderModel,
  OrderItemModel,
  InventoryModel,
  InventoryMovementModel
} from "../../models";
import { CONSTANTS } from "../../types";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

export interface ReportRequest {
  type: ReportType;
  startDate: Date;
  endDate: Date;
  format: 'excel' | 'pdf' | 'csv' | 'json';
  filters?: Record<string, any>;
  options?: Record<string, any>;
}

export type ReportType = 
  | 'sales_summary'
  | 'sales_detailed'
  | 'customer_analysis'
  | 'product_performance'
  | 'inventory_report'
  | 'financial_summary'
  | 'order_report'
  | 'marketing_performance'
  | 'operational_metrics';

export interface GeneratedReport {
  id: string;
  type: ReportType;
  format: string;
  filename: string;
  size: number;
  downloadUrl: string;
  generatedAt: Date;
  expiresAt: Date;
  status: 'generating' | 'completed' | 'failed';
  metadata: Record<string, any>;
}

export interface SalesSummaryData {
  period: { start: Date; end: Date };
  totals: {
    revenue: number;
    orders: number;
    customers: number;
    averageOrderValue: number;
    conversionRate: number;
  };
  trends: {
    revenueGrowth: number;
    orderGrowth: number;
    customerGrowth: number;
  };
  topProducts: Array<{
    id: string;
    name: string;
    revenue: number;
    quantity: number;
    margin: number;
  }>;
  topCategories: Array<{
    id: string;
    name: string;
    revenue: number;
    orders: number;
  }>;
  dailyBreakdown: Array<{
    date: string;
    revenue: number;
    orders: number;
    customers: number;
  }>;
}

export interface ProductPerformanceData {
  summary: {
    totalProducts: number;
    activeProducts: number;
    bestPerformers: number;
    underPerformers: number;
  };
  products: Array<{
    id: string;
    name: string;
    sku: string;
    category: string;
    revenue: number;
    quantitySold: number;
    averageRating: number;
    stockLevel: number;
    margin: number;
    performance: 'excellent' | 'good' | 'average' | 'poor';
  }>;
  categories: Array<{
    id: string;
    name: string;
    productCount: number;
    totalRevenue: number;
    averageMargin: number;
  }>;
}

export interface InventoryReportData {
  summary: {
    totalValue: number;
    totalProducts: number;
    lowStockItems: number;
    outOfStockItems: number;
    turnoverRate: number;
  };
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    currentStock: number;
    reservedStock: number;
    availableStock: number;
    reorderLevel: number;
    averageCost: number;
    totalValue: number;
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
    lastMovement: Date;
  }>;
  movements: Array<{
    date: Date;
    productName: string;
    type: string;
    quantity: number;
    reason: string;
    cost: number;
  }>;
}

export class ReportingService extends BaseService {
  private analytics: AnalyticsService;
  private cache: CacheService;

  constructor(analyticsService: AnalyticsService, cacheService: CacheService) {
    super();
    this.analytics = analyticsService;
    this.cache = cacheService;
  }

  /**
   * Generate report
   */
  async generateReport(request: ReportRequest): Promise<GeneratedReport> {
    try {
      const reportId = crypto.randomUUID();
      
      // Create initial report record
      const report: GeneratedReport = {
        id: reportId,
        type: request.type,
        format: request.format,
        filename: this.generateFilename(request),
        size: 0,
        downloadUrl: '',
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        status: 'generating',
        metadata: {
          startDate: request.startDate,
          endDate: request.endDate,
          filters: request.filters,
        },
      };

      // Store initial report status
      await this.cache.set(`report:${reportId}`, report, { ttl: 86400 });

      // Generate report asynchronously
      this.generateReportAsync(reportId, request).catch(error => {
        this.handleError("Async report generation failed", error);
      });

      return report;
    } catch (error) {
      this.handleError("Error initiating report generation", error);
      throw error;
    }
  }

  /**
   * Get report status
   */
  async getReportStatus(reportId: string): Promise<GeneratedReport | null> {
    try {
      return await this.cache.get<GeneratedReport>(`report:${reportId}`);
    } catch (error) {
      this.handleError("Error getting report status", error);
      return null;
    }
  }

  /**
   * Generate sales summary report
   */
  async generateSalesSummaryReport(
    startDate: Date,
    endDate: Date,
    format: 'excel' | 'pdf' = 'excel'
  ): Promise<Buffer> {
    try {
      const data = await this.getSalesSummaryData(startDate, endDate);
      
      if (format === 'excel') {
        return this.generateSalesSummaryExcel(data);
      } else {
        return this.generateSalesSummaryPDF(data);
      }
    } catch (error) {
      this.handleError("Error generating sales summary report", error);
      throw error;
    }
  }

  /**
   * Generate product performance report
   */
  async generateProductPerformanceReport(
    startDate: Date,
    endDate: Date,
    format: 'excel' | 'pdf' = 'excel'
  ): Promise<Buffer> {
    try {
      const data = await this.getProductPerformanceData(startDate, endDate);
      
      if (format === 'excel') {
        return this.generateProductPerformanceExcel(data);
      } else {
        return this.generateProductPerformancePDF(data);
      }
    } catch (error) {
      this.handleError("Error generating product performance report", error);
      throw error;
    }
  }

  /**
   * Generate inventory report
   */
  async generateInventoryReport(format: 'excel' | 'pdf' = 'excel'): Promise<Buffer> {
    try {
      const data = await this.getInventoryReportData();
      
      if (format === 'excel') {
        return this.generateInventoryExcel(data);
      } else {
        return this.generateInventoryPDF(data);
      }
    } catch (error) {
      this.handleError("Error generating inventory report", error);
      throw error;
    }
  }

  /**
   * Generate custom report based on filters
   */
  async generateCustomReport(
    type: ReportType,
    startDate: Date,
    endDate: Date,
    filters: Record<string, any> = {},
    format: 'excel' | 'pdf' | 'csv' = 'excel'
  ): Promise<Buffer> {
    try {
      switch (type) {
        case 'sales_summary':
          return this.generateSalesSummaryReport(startDate, endDate, format as 'excel' | 'pdf');
        case 'product_performance':
          return this.generateProductPerformanceReport(startDate, endDate, format as 'excel' | 'pdf');
        case 'inventory_report':
          return this.generateInventoryReport(format as 'excel' | 'pdf');
        default:
          throw new Error(`Report type ${type} not implemented`);
      }
    } catch (error) {
      this.handleError("Error generating custom report", error);
      throw error;
    }
  }

  // Private data collection methods

  private async getSalesSummaryData(startDate: Date, endDate: Date): Promise<SalesSummaryData> {
    const [orders, previousPeriodOrders, orderItems] = await Promise.all([
      OrderModel.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: { not: 'CANCELLED' },
        },
        include: {
          user: true,
          items: {
            include: { product: true },
          },
        },
      }),
      OrderModel.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())),
            lt: startDate,
          },
          status: { not: 'CANCELLED' },
        },
      }),
      OrderItemModel.findMany({
        where: {
          order: {
            createdAt: { gte: startDate, lte: endDate },
            status: { not: 'CANCELLED' },
          },
        },
        include: { product: true },
      }),
    ]);

    // Calculate totals
    const revenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const orderCount = orders.length;
    const uniqueCustomers = new Set(orders.map(o => o.userId)).size;
    const averageOrderValue = orderCount > 0 ? revenue / orderCount : 0;

    // Calculate growth
    const previousRevenue = previousPeriodOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const revenueGrowth = previousRevenue > 0 ? ((revenue - previousRevenue) / previousRevenue) * 100 : 0;
    const orderGrowth = previousPeriodOrders.length > 0 ? 
      ((orderCount - previousPeriodOrders.length) / previousPeriodOrders.length) * 100 : 0;

    // Group products by sales
    const productSales = new Map<string, { revenue: number; quantity: number; product: any }>();
    orderItems.forEach(item => {
      const existing = productSales.get(item.productId) || { revenue: 0, quantity: 0, product: item.product };
      existing.revenue += Number(item.totalPrice);
      existing.quantity += item.quantity;
      productSales.set(item.productId, existing);
    });

    const topProducts = Array.from(productSales.entries())
      .map(([id, data]) => ({
        id,
        name: data.product.name,
        revenue: data.revenue,
        quantity: data.quantity,
        margin: data.revenue * 0.3, // Simplified margin calculation
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Daily breakdown
    const dailyMap = new Map<string, { revenue: number; orders: number; customers: Set<string> }>();
    orders.forEach(order => {
      const date = order.createdAt.toISOString().split('T')[0];
      const existing = dailyMap.get(date) || { revenue: 0, orders: 0, customers: new Set() };
      existing.revenue += Number(order.totalAmount);
      existing.orders += 1;
      existing.customers.add(order.userId);
      dailyMap.set(date, existing);
    });

    const dailyBreakdown = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      orders: data.orders,
      customers: data.customers.size,
    }));

    return {
      period: { start: startDate, end: endDate },
      totals: {
        revenue,
        orders: orderCount,
        customers: uniqueCustomers,
        averageOrderValue,
        conversionRate: 0, // Would need session data
      },
      trends: {
        revenueGrowth,
        orderGrowth,
        customerGrowth: 0, // Would calculate from user data
      },
      topProducts,
      topCategories: [], // Would group by category
      dailyBreakdown,
    };
  }

  private async getProductPerformanceData(startDate: Date, endDate: Date): Promise<ProductPerformanceData> {
    const [products, orderItems] = await Promise.all([
      ProductModel.findMany({
        include: {
          category: true,
          inventory: true,
          reviews: true,
        },
      }),
      OrderItemModel.findMany({
        where: {
          order: {
            createdAt: { gte: startDate, lte: endDate },
            status: { not: 'CANCELLED' },
          },
        },
        include: { product: true },
      }),
    ]);

    // Calculate product performance
    const productSales = new Map<string, { revenue: number; quantity: number }>();
    orderItems.forEach(item => {
      const existing = productSales.get(item.productId) || { revenue: 0, quantity: 0 };
      existing.revenue += Number(item.totalPrice);
      existing.quantity += item.quantity;
      productSales.set(item.productId, existing);
    });

    const productPerformance = products.map(product => {
      const sales = productSales.get(product.id) || { revenue: 0, quantity: 0 };
      const averageRating = product.reviews.length > 0 
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length 
        : 0;

      let performance: 'excellent' | 'good' | 'average' | 'poor' = 'poor';
      if (sales.revenue > 10000) performance = 'excellent';
      else if (sales.revenue > 5000) performance = 'good';
      else if (sales.revenue > 1000) performance = 'average';

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category.name,
        revenue: sales.revenue,
        quantitySold: sales.quantity,
        averageRating,
        stockLevel: product.inventory?.quantity || 0,
        margin: sales.revenue * 0.3, // Simplified
        performance,
      };
    });

    return {
      summary: {
        totalProducts: products.length,
        activeProducts: products.filter(p => p.isActive).length,
        bestPerformers: productPerformance.filter(p => p.performance === 'excellent').length,
        underPerformers: productPerformance.filter(p => p.performance === 'poor').length,
      },
      products: productPerformance,
      categories: [], // Would group by category
    };
  }

  private async getInventoryReportData(): Promise<InventoryReportData> {
    const [inventory, movements] = await Promise.all([
      InventoryModel.findMany({
        include: { product: true },
      }),
      InventoryMovementModel.findMany({
        include: { product: true },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
    ]);

    const totalValue = inventory.reduce((sum, item) => {
      return sum + (item.quantity * Number(item.averageCost));
    }, 0);

    const items = inventory.map(item => {
      let status: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
      if (item.quantity <= 0) status = 'out_of_stock';
      else if (item.quantity <= item.lowStockThreshold) status = 'low_stock';

      return {
        productId: item.productId,
        productName: item.product.name,
        sku: item.product.sku,
        currentStock: item.quantity,
        reservedStock: item.reservedQuantity,
        availableStock: item.quantity - item.reservedQuantity,
        reorderLevel: item.reorderPoint,
        averageCost: Number(item.averageCost),
        totalValue: item.quantity * Number(item.averageCost),
        status,
        lastMovement: item.updatedAt,
      };
    });

    const movementData = movements.map(movement => ({
      date: movement.createdAt,
      productName: movement.product.name,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason || '',
      cost: Number(movement.totalCost) || 0,
    }));

    return {
      summary: {
        totalValue,
        totalProducts: inventory.length,
        lowStockItems: items.filter(i => i.status === 'low_stock').length,
        outOfStockItems: items.filter(i => i.status === 'out_of_stock').length,
        turnoverRate: 0, // Would calculate from sales data
      },
      items,
      movements: movementData,
    };
  }

  // Private report generation methods

  private async generateSalesSummaryExcel(data: SalesSummaryData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Sales Summary');
    
    // Header
    summarySheet.addRow(['Bareloft Sales Summary Report']);
    summarySheet.addRow([`Period: ${data.period.start.toDateString()} - ${data.period.end.toDateString()}`]);
    summarySheet.addRow([]);

    // Totals
    summarySheet.addRow(['Metric', 'Value']);
    summarySheet.addRow(['Total Revenue', `₦${data.totals.revenue.toLocaleString()}`]);
    summarySheet.addRow(['Total Orders', data.totals.orders]);
    summarySheet.addRow(['Total Customers', data.totals.customers]);
    summarySheet.addRow(['Average Order Value', `₦${data.totals.averageOrderValue.toFixed(2)}`]);
    summarySheet.addRow([]);

    // Top Products
    summarySheet.addRow(['Top Products']);
    summarySheet.addRow(['Product Name', 'Revenue', 'Quantity', 'Margin']);
    data.topProducts.forEach(product => {
      summarySheet.addRow([
        product.name,
        `₦${product.revenue.toLocaleString()}`,
        product.quantity,
        `₦${product.margin.toLocaleString()}`,
      ]);
    });

    // Daily breakdown sheet
    const dailySheet = workbook.addWorksheet('Daily Breakdown');
    dailySheet.addRow(['Date', 'Revenue', 'Orders', 'Customers']);
    data.dailyBreakdown.forEach(day => {
      dailySheet.addRow([
        day.date,
        day.revenue,
        day.orders,
        day.customers,
      ]);
    });

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  private async generateSalesSummaryPDF(data: SalesSummaryData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Bareloft Sales Summary Report', { align: 'center' });
      doc.fontSize(12).text(`Period: ${data.period.start.toDateString()} - ${data.period.end.toDateString()}`, { align: 'center' });
      doc.moveDown();

      // Summary metrics
      doc.fontSize(16).text('Summary Metrics');
      doc.fontSize(12);
      doc.text(`Total Revenue: ₦${data.totals.revenue.toLocaleString()}`);
      doc.text(`Total Orders: ${data.totals.orders}`);
      doc.text(`Total Customers: ${data.totals.customers}`);
      doc.text(`Average Order Value: ₦${data.totals.averageOrderValue.toFixed(2)}`);
      doc.moveDown();

      // Top Products
      doc.fontSize(16).text('Top Products');
      doc.fontSize(12);
      data.topProducts.slice(0, 5).forEach(product => {
        doc.text(`${product.name}: ₦${product.revenue.toLocaleString()} (${product.quantity} sold)`);
      });

      doc.end();
    });
  }

  private async generateProductPerformanceExcel(data: ProductPerformanceData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Product Performance');

    // Header
    sheet.addRow(['Product Performance Report']);
    sheet.addRow([]);

    // Summary
    sheet.addRow(['Summary']);
    sheet.addRow(['Total Products', data.summary.totalProducts]);
    sheet.addRow(['Active Products', data.summary.activeProducts]);
    sheet.addRow(['Best Performers', data.summary.bestPerformers]);
    sheet.addRow(['Under Performers', data.summary.underPerformers]);
    sheet.addRow([]);

    // Product details
    sheet.addRow([
      'Product Name', 'SKU', 'Category', 'Revenue', 'Quantity Sold', 
      'Average Rating', 'Stock Level', 'Margin', 'Performance'
    ]);

    data.products.forEach(product => {
      sheet.addRow([
        product.name,
        product.sku,
        product.category,
        product.revenue,
        product.quantitySold,
        product.averageRating.toFixed(1),
        product.stockLevel,
        product.margin,
        product.performance,
      ]);
    });

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  private async generateProductPerformancePDF(data: ProductPerformanceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('Product Performance Report', { align: 'center' });
      doc.moveDown();

      doc.fontSize(16).text('Summary');
      doc.fontSize(12);
      doc.text(`Total Products: ${data.summary.totalProducts}`);
      doc.text(`Active Products: ${data.summary.activeProducts}`);
      doc.text(`Best Performers: ${data.summary.bestPerformers}`);
      doc.text(`Under Performers: ${data.summary.underPerformers}`);
      doc.moveDown();

      doc.fontSize(16).text('Top Performing Products');
      doc.fontSize(12);
      data.products
        .filter(p => p.performance === 'excellent')
        .slice(0, 10)
        .forEach(product => {
          doc.text(`${product.name}: ₦${product.revenue.toLocaleString()} revenue, ${product.quantitySold} sold`);
        });

      doc.end();
    });
  }

  private async generateInventoryExcel(data: InventoryReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Inventory Summary');
    summarySheet.addRow(['Inventory Report']);
    summarySheet.addRow([]);
    summarySheet.addRow(['Total Value', `₦${data.summary.totalValue.toLocaleString()}`]);
    summarySheet.addRow(['Total Products', data.summary.totalProducts]);
    summarySheet.addRow(['Low Stock Items', data.summary.lowStockItems]);
    summarySheet.addRow(['Out of Stock Items', data.summary.outOfStockItems]);

    // Inventory details
    const detailsSheet = workbook.addWorksheet('Inventory Details');
    detailsSheet.addRow([
      'Product Name', 'SKU', 'Current Stock', 'Reserved', 'Available', 
      'Reorder Level', 'Average Cost', 'Total Value', 'Status'
    ]);

    data.items.forEach(item => {
      detailsSheet.addRow([
        item.productName,
        item.sku,
        item.currentStock,
        item.reservedStock,
        item.availableStock,
        item.reorderLevel,
        item.averageCost,
        item.totalValue,
        item.status,
      ]);
    });

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  private async generateInventoryPDF(data: InventoryReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('Inventory Report', { align: 'center' });
      doc.moveDown();

      doc.fontSize(16).text('Summary');
      doc.fontSize(12);
      doc.text(`Total Value: ₦${data.summary.totalValue.toLocaleString()}`);
      doc.text(`Total Products: ${data.summary.totalProducts}`);
      doc.text(`Low Stock Items: ${data.summary.lowStockItems}`);
      doc.text(`Out of Stock Items: ${data.summary.outOfStockItems}`);
      doc.moveDown();

      if (data.summary.lowStockItems > 0) {
        doc.fontSize(16).text('Low Stock Alert');
        doc.fontSize(12);
        data.items
          .filter(item => item.status === 'low_stock')
          .slice(0, 10)
          .forEach(item => {
            doc.text(`${item.productName}: ${item.currentStock} remaining`);
          });
      }

      doc.end();
    });
  }

  // Private helper methods

  private async generateReportAsync(reportId: string, request: ReportRequest): Promise<void> {
    try {
      // Update status to generating
      const report = await this.cache.get<GeneratedReport>(`report:${reportId}`);
      if (report) {
        report.status = 'generating';
        await this.cache.set(`report:${reportId}`, report, { ttl: 86400 });
      }

      // Generate report buffer
      const buffer = await this.generateCustomReport(
        request.type,
        request.startDate,
        request.endDate,
        request.filters,
        request.format as any
      );

      // Save to storage (would implement actual file storage)
      const downloadUrl = `/api/reports/${reportId}/download`;

      // Update report with completion
      if (report) {
        report.status = 'completed';
        report.size = buffer.length;
        report.downloadUrl = downloadUrl;
        await this.cache.set(`report:${reportId}`, report, { ttl: 86400 });
      }

    } catch (error) {
      // Update status to failed
      const report = await this.cache.get<GeneratedReport>(`report:${reportId}`);
      if (report) {
        report.status = 'failed';
        await this.cache.set(`report:${reportId}`, report, { ttl: 86400 });
      }
      throw error;
    }
  }

  private generateFilename(request: ReportRequest): string {
    const date = new Date().toISOString().split('T')[0];
    const extension = request.format === 'excel' ? 'xlsx' : request.format;
    return `${request.type}_${date}.${extension}`;
  }
}