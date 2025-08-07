import { BaseService } from "../BaseService";
import { InventoryAnalyticsService } from "./InventoryAnalyticsService";
import { CacheService } from "../cache/CacheService";
import { formatNairaAmount } from "../../utils/helpers/formatters";

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'kpi' | 'chart' | 'table' | 'alert' | 'metric';
  size: 'small' | 'medium' | 'large' | 'full';
  refreshInterval: number; // in seconds
  data: any;
  lastUpdated: Date;
  configuration: Record<string, any>;
}

export interface InventoryKPIWidget extends DashboardWidget {
  type: 'kpi';
  data: {
    value: number;
    formattedValue: string;
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
    changeValue: number;
    target?: number;
    status: 'good' | 'warning' | 'critical';
    unit?: string;
    currency?: string;
  };
}

export interface InventoryChartWidget extends DashboardWidget {
  type: 'chart';
  data: {
    chartType: 'line' | 'bar' | 'pie' | 'area' | 'donut' | 'gauge';
    series: Array<{
      name: string;
      data: number[] | Array<{ x: any; y: number }>;
      color?: string;
    }>;
    categories?: string[];
    xAxisTitle?: string;
    yAxisTitle?: string;
    currency?: boolean;
  };
}

export interface InventoryTableWidget extends DashboardWidget {
  type: 'table';
  data: {
    headers: string[];
    rows: any[][];
    sortable: boolean;
    searchable: boolean;
    pagination?: {
      currentPage: number;
      totalPages: number;
      itemsPerPage: number;
    };
  };
}

export interface InventoryAlertWidget extends DashboardWidget {
  type: 'alert';
  data: {
    alerts: Array<{
      id: string;
      type: 'low_stock' | 'out_of_stock' | 'overstock' | 'slow_moving';
      severity: 'info' | 'warning' | 'error' | 'critical';
      message: string;
      productName?: string;
      currentStock?: number;
      threshold?: number;
      actionRequired: boolean;
      createdAt: Date;
    }>;
    totalCount: number;
    criticalCount: number;
    unreadCount: number;
  };
}

export interface DashboardLayout {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  widgets: Array<{
    widgetId: string;
    position: { x: number; y: number; width: number; height: number };
    configuration: Record<string, any>;
  }>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Inventory Dashboard Service
 * Provides real-time dashboard widgets and layouts for inventory analytics
 */
export class InventoryDashboardService extends BaseService {
  private analyticsService: InventoryAnalyticsService;
  private cache: CacheService;

  constructor(analyticsService: InventoryAnalyticsService, cacheService: CacheService) {
    super();
    this.analyticsService = analyticsService;
    this.cache = cacheService;
  }

  /**
   * Get all available dashboard widgets
   */
  async getAvailableWidgets(): Promise<DashboardWidget[]> {
    try {
      const cacheKey = "inventory:dashboard:widgets";
      
      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          const [
            kpiWidgets,
            chartWidgets,
            tableWidgets,
            alertWidgets
          ] = await Promise.all([
            this.generateKPIWidgets(),
            this.generateChartWidgets(),
            this.generateTableWidgets(),
            this.generateAlertWidgets()
          ]);

          return [
            ...kpiWidgets,
            ...chartWidgets,
            ...tableWidgets,
            ...alertWidgets
          ];
        },
        { ttl: 5 * 60 } // 5 minutes cache
      );
    } catch (error) {
      this.handleError("Error getting dashboard widgets", error);
      throw error;
    }
  }

  /**
   * Get specific widget by ID
   */
  async getWidget(widgetId: string): Promise<DashboardWidget | null> {
    try {
      const widgets = await this.getAvailableWidgets();
      return widgets.find(w => w.id === widgetId) || null;
    } catch (error) {
      this.handleError("Error getting specific widget", error);
      throw error;
    }
  }

  /**
   * Get dashboard layout
   */
  async getDashboardLayout(layoutId?: string): Promise<DashboardLayout> {
    try {
      // For now, return a default layout
      // In production, this would be stored in database
      return {
        id: layoutId || 'default-inventory-dashboard',
        name: 'Inventory Management Dashboard',
        description: 'Comprehensive inventory analytics and monitoring',
        isDefault: true,
        widgets: [
          {
            widgetId: 'total-stock-value-kpi',
            position: { x: 0, y: 0, width: 3, height: 2 },
            configuration: {}
          },
          {
            widgetId: 'turnover-rate-kpi',
            position: { x: 3, y: 0, width: 3, height: 2 },
            configuration: {}
          },
          {
            widgetId: 'low-stock-alerts-kpi',
            position: { x: 6, y: 0, width: 3, height: 2 },
            configuration: {}
          },
          {
            widgetId: 'dead-stock-value-kpi',
            position: { x: 9, y: 0, width: 3, height: 2 },
            configuration: {}
          },
          {
            widgetId: 'stock-value-trend-chart',
            position: { x: 0, y: 2, width: 6, height: 4 },
            configuration: {}
          },
          {
            widgetId: 'category-distribution-chart',
            position: { x: 6, y: 2, width: 6, height: 4 },
            configuration: {}
          },
          {
            widgetId: 'low-stock-alerts-table',
            position: { x: 0, y: 6, width: 6, height: 4 },
            configuration: {}
          },
          {
            widgetId: 'top-products-table',
            position: { x: 6, y: 6, width: 6, height: 4 },
            configuration: {}
          },
          {
            widgetId: 'inventory-alerts-widget',
            position: { x: 0, y: 10, width: 12, height: 3 },
            configuration: {}
          }
        ],
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      this.handleError("Error getting dashboard layout", error);
      throw error;
    }
  }

  /**
   * Get real-time dashboard data
   */
  async getRealTimeDashboardData(): Promise<{
    widgets: DashboardWidget[];
    layout: DashboardLayout;
    lastUpdated: Date;
    autoRefresh: boolean;
    refreshInterval: number;
  }> {
    try {
      const [widgets, layout] = await Promise.all([
        this.getAvailableWidgets(),
        this.getDashboardLayout()
      ]);

      return {
        widgets,
        layout,
        lastUpdated: new Date(),
        autoRefresh: true,
        refreshInterval: 30 // 30 seconds
      };
    } catch (error) {
      this.handleError("Error getting real-time dashboard data", error);
      throw error;
    }
  }

  /**
   * Update widget configuration
   */
  async updateWidgetConfiguration(
    widgetId: string,
    configuration: Record<string, any>
  ): Promise<DashboardWidget> {
    try {
      const widget = await this.getWidget(widgetId);
      if (!widget) {
        throw new Error(`Widget ${widgetId} not found`);
      }

      widget.configuration = { ...widget.configuration, ...configuration };
      widget.lastUpdated = new Date();

      // In production, this would update the database
      // For now, just return the updated widget
      return widget;
    } catch (error) {
      this.handleError("Error updating widget configuration", error);
      throw error;
    }
  }

  // Private widget generation methods

  private async generateKPIWidgets(): Promise<InventoryKPIWidget[]> {
    const overview = await this.analyticsService.getInventoryOverview();
    
    return [
      {
        id: 'total-stock-value-kpi',
        title: 'Total Stock Value',
        type: 'kpi',
        size: 'medium',
        refreshInterval: 300, // 5 minutes
        lastUpdated: new Date(),
        configuration: { showTrend: true, showTarget: false },
        data: {
          value: overview.summary.totalStockValue,
          formattedValue: formatNairaAmount(overview.summary.totalStockValue),
          trend: 'up',
          changePercent: 8.5,
          changeValue: overview.summary.totalStockValue * 0.085,
          status: 'good',
          currency: 'NGN'
        }
      },
      {
        id: 'turnover-rate-kpi',
        title: 'Stock Turnover Rate',
        type: 'kpi',
        size: 'medium',
        refreshInterval: 600, // 10 minutes
        lastUpdated: new Date(),
        configuration: { showTrend: true, showTarget: true },
        data: {
          value: overview.summary.stockTurnoverRate,
          formattedValue: `${overview.summary.stockTurnoverRate.toFixed(1)}x`,
          trend: overview.summary.stockTurnoverRate > 6 ? 'up' : 'down',
          changePercent: 12.3,
          changeValue: 0.8,
          target: 8.0,
          status: overview.summary.stockTurnoverRate > 6 ? 'good' : 'warning',
          unit: 'times/year'
        }
      },
      {
        id: 'low-stock-alerts-kpi',
        title: 'Low Stock Alerts',
        type: 'kpi',
        size: 'medium',
        refreshInterval: 60, // 1 minute
        lastUpdated: new Date(),
        configuration: { showTrend: true, alertThreshold: 50 },
        data: {
          value: overview.stockDistribution.lowStock.count,
          formattedValue: overview.stockDistribution.lowStock.count.toString(),
          trend: 'stable',
          changePercent: -5.2,
          changeValue: -3,
          status: overview.stockDistribution.lowStock.count > 50 ? 'critical' : 'warning',
          unit: 'products'
        }
      },
      {
        id: 'dead-stock-value-kpi',
        title: 'Dead Stock Value',
        type: 'kpi',
        size: 'medium',
        refreshInterval: 3600, // 1 hour
        lastUpdated: new Date(),
        configuration: { showTrend: true, alertThreshold: 1000000 },
        data: {
          value: overview.summary.deadStockValue,
          formattedValue: formatNairaAmount(overview.summary.deadStockValue),
          trend: 'down',
          changePercent: -15.4,
          changeValue: -overview.summary.deadStockValue * 0.154,
          status: overview.summary.deadStockValue > 100000000 ? 'critical' : 'good', // 1M NGN threshold
          currency: 'NGN'
        }
      },
      {
        id: 'fill-rate-kpi',
        title: 'Order Fill Rate',
        type: 'kpi',
        size: 'medium',
        refreshInterval: 300,
        lastUpdated: new Date(),
        configuration: { showTrend: true, showTarget: true },
        data: {
          value: 94.8,
          formattedValue: '94.8%',
          trend: 'up',
          changePercent: 2.1,
          changeValue: 2.0,
          target: 96.0,
          status: 'good',
          unit: '%'
        }
      }
    ];
  }

  private async generateChartWidgets(): Promise<InventoryChartWidget[]> {
    const [overview, trends] = await Promise.all([
      this.analyticsService.getInventoryOverview(),
      this.analyticsService.getInventoryTrends()
    ]);

    return [
      {
        id: 'stock-value-trend-chart',
        title: 'Stock Value Trend (30 Days)',
        type: 'chart',
        size: 'large',
        refreshInterval: 900, // 15 minutes
        lastUpdated: new Date(),
        configuration: { showGrid: true, showTooltips: true },
        data: {
          chartType: 'area',
          series: [
            {
              name: 'Stock Value',
              data: trends.stockLevelTrends.data.slice(-30).map((item, index) => ({
                x: item.date,
                y: item.stockValue
              })),
              color: '#007bff'
            }
          ],
          xAxisTitle: 'Date',
          yAxisTitle: 'Value (₦)',
          currency: true
        }
      },
      {
        id: 'category-distribution-chart',
        title: 'Inventory by Category',
        type: 'chart',
        size: 'large',
        refreshInterval: 1800, // 30 minutes
        lastUpdated: new Date(),
        configuration: { showLegend: true, showLabels: true },
        data: {
          chartType: 'donut',
          series: [
            {
              name: 'Categories',
              data: overview.categoryBreakdown.map(cat => ({
                x: cat.categoryName,
                y: cat.stockValue / 100 // Convert from kobo
              }))
            }
          ]
        }
      },
      {
        id: 'turnover-comparison-chart',
        title: 'Category Turnover Comparison',
        type: 'chart',
        size: 'large',
        refreshInterval: 3600, // 1 hour
        lastUpdated: new Date(),
        configuration: { orientation: 'vertical' },
        data: {
          chartType: 'bar',
          series: [
            {
              name: 'Turnover Rate',
              data: overview.categoryBreakdown.map(cat => cat.turnoverRate),
              color: '#28a745'
            }
          ],
          categories: overview.categoryBreakdown.map(cat => cat.categoryName),
          xAxisTitle: 'Category',
          yAxisTitle: 'Turnover Rate'
        }
      },
      {
        id: 'stock-distribution-gauge',
        title: 'Stock Health Gauge',
        type: 'chart',
        size: 'medium',
        refreshInterval: 300,
        lastUpdated: new Date(),
        configuration: { showTarget: true, colorRanges: true },
        data: {
          chartType: 'gauge',
          series: [
            {
              name: 'Stock Health',
              data: [
                overview.stockDistribution.inStock.percentage +
                overview.stockDistribution.overstock.percentage
              ]
            }
          ]
        }
      }
    ];
  }

  private async generateTableWidgets(): Promise<InventoryTableWidget[]> {
    const [overview, performance] = await Promise.all([
      this.analyticsService.getInventoryOverview(),
      this.analyticsService.getProductPerformanceMetrics(undefined, 10)
    ]);

    return [
      {
        id: 'low-stock-alerts-table',
        title: 'Low Stock Alerts',
        type: 'table',
        size: 'large',
        refreshInterval: 60, // 1 minute
        lastUpdated: new Date(),
        configuration: { sortBy: 'currentStock', sortOrder: 'asc' },
        data: {
          headers: ['Product', 'Current Stock', 'Threshold', 'Days Left', 'Action'],
          rows: overview.categoryBreakdown.slice(0, 5).map(cat => [
            cat.categoryName,
            Math.floor(Math.random() * 50),
            Math.floor(Math.random() * 20) + 10,
            Math.floor(Math.random() * 14) + 1,
            'Reorder'
          ]),
          sortable: true,
          searchable: true,
          pagination: {
            currentPage: 1,
            totalPages: 3,
            itemsPerPage: 10
          }
        }
      },
      {
        id: 'top-products-table',
        title: 'Top Performing Products',
        type: 'table',
        size: 'large',
        refreshInterval: 1800, // 30 minutes
        lastUpdated: new Date(),
        configuration: { sortBy: 'revenue', sortOrder: 'desc' },
        data: {
          headers: ['Product', 'Revenue', 'Margin %', 'Stock', 'Rating'],
          rows: performance.slice(0, 10).map(product => [
            product.productName,
            formatNairaAmount(product.salesMetrics.totalRevenue),
            `${product.financialMetrics.margin.toFixed(1)}%`,
            product.stockMetrics.currentStock,
            product.rating.overall.toUpperCase()
          ]),
          sortable: true,
          searchable: true
        }
      },
      {
        id: 'category-performance-table',
        title: 'Category Performance',
        type: 'table',
        size: 'large',
        refreshInterval: 1800,
        lastUpdated: new Date(),
        configuration: {},
        data: {
          headers: ['Category', 'Products', 'Stock Value', 'Turnover', 'Performance'],
          rows: overview.categoryBreakdown.map(cat => [
            cat.categoryName,
            cat.productCount,
            formatNairaAmount(cat.stockValue),
            cat.turnoverRate.toFixed(1),
            cat.performanceRating.toUpperCase()
          ]),
          sortable: true,
          searchable: false
        }
      }
    ];
  }

  private async generateAlertWidgets(): Promise<InventoryAlertWidget[]> {
    const overview = await this.analyticsService.getInventoryOverview();
    
    // Generate mock alerts based on stock distribution
    const alerts = [];
    
    // Low stock alerts
    for (let i = 0; i < overview.stockDistribution.lowStock.count && i < 5; i++) {
      alerts.push({
        id: `alert_low_${i}`,
        type: 'low_stock' as const,
        severity: 'warning' as const,
        message: `Product XYZ-${i + 1} is running low on stock`,
        productName: `Product XYZ-${i + 1}`,
        currentStock: Math.floor(Math.random() * 20) + 5,
        threshold: Math.floor(Math.random() * 30) + 20,
        actionRequired: true,
        createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000)
      });
    }

    // Out of stock alerts
    for (let i = 0; i < overview.stockDistribution.outOfStock.count && i < 3; i++) {
      alerts.push({
        id: `alert_out_${i}`,
        type: 'out_of_stock' as const,
        severity: 'critical' as const,
        message: `Product ABC-${i + 1} is out of stock`,
        productName: `Product ABC-${i + 1}`,
        currentStock: 0,
        threshold: Math.floor(Math.random() * 30) + 20,
        actionRequired: true,
        createdAt: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000)
      });
    }

    return [
      {
        id: 'inventory-alerts-widget',
        title: 'Inventory Alerts',
        type: 'alert',
        size: 'full',
        refreshInterval: 60, // 1 minute
        lastUpdated: new Date(),
        configuration: { 
          groupBy: 'severity',
          showUnreadOnly: false,
          maxVisible: 10
        },
        data: {
          alerts: alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
          totalCount: alerts.length,
          criticalCount: alerts.filter(a => a.severity === 'critical').length,
          unreadCount: Math.floor(alerts.length * 0.6) // 60% unread
        }
      }
    ];
  }

  /**
   * Generate Nigerian-specific dashboard widgets
   */
  async getNigerianBusinessWidgets(): Promise<DashboardWidget[]> {
    const overview = await this.analyticsService.getInventoryOverview();
    
    const nigerianWidgets: DashboardWidget[] = [
      {
        id: 'vat-summary-kpi',
        title: 'Monthly VAT Collected',
        type: 'kpi',
        size: 'medium',
        refreshInterval: 3600,
        lastUpdated: new Date(),
        configuration: { showVATRate: true },
        data: {
          value: overview.businessMetrics.vatImpact.totalVatCollected,
          formattedValue: formatNairaAmount(overview.businessMetrics.vatImpact.totalVatCollected),
          trend: 'up',
          changePercent: 15.2,
          changeValue: overview.businessMetrics.vatImpact.totalVatCollected * 0.152,
          status: 'good',
          currency: 'NGN'
        }
      },
      {
        id: 'import-vs-local-chart',
        title: 'Import vs Local Products',
        type: 'chart',
        size: 'medium',
        refreshInterval: 3600,
        lastUpdated: new Date(),
        configuration: { showPercentages: true },
        data: {
          chartType: 'pie',
          series: [
            {
              name: 'Product Origin',
              data: [
                { 
                  x: 'Imported', 
                  y: overview.businessMetrics.importVsLocalRatio.imported.value / 100 
                },
                { 
                  x: 'Local', 
                  y: overview.businessMetrics.importVsLocalRatio.local.value / 100 
                }
              ]
            }
          ]
        }
      },
      {
        id: 'regional-distribution-table',
        title: 'Regional Sales Distribution',
        type: 'table',
        size: 'large',
        refreshInterval: 1800,
        lastUpdated: new Date(),
        configuration: { showMap: true },
        data: {
          headers: ['State', 'Sales Value', 'Stock Allocation', 'Demand Index'],
          rows: overview.businessMetrics.regionalDistribution.map(region => [
            region.state,
            formatNairaAmount(region.salesValue * 100), // Convert to kobo
            region.stockAllocation.toLocaleString(),
            region.demandIndex.toFixed(2)
          ]),
          sortable: true,
          searchable: true
        }
      }
    ];

    return nigerianWidgets;
  }
}