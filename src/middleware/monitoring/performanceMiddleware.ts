import { Request, Response, NextFunction } from "express";
import { performance } from "perf_hooks";

interface PerformanceMetrics {
  timestamp: number;
  method: string;
  endpoint: string;
  responseTime: number;
  statusCode: number;
  userAgent?: string;
  ip?: string;
  userId?: string;
  memoryUsage: NodeJS.MemoryUsage;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 requests

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Performance monitoring middleware
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = performance.now();
      const startMemory = process.memoryUsage();

      // Override res.end to capture response time
      const originalEnd = res.end;
      res.end = function(this: Response, ...args: any[]) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        const endMemory = process.memoryUsage();

        // Create performance metric
        const metric: PerformanceMetrics = {
          timestamp: Date.now(),
          method: req.method,
          endpoint: req.route?.path || req.path,
          responseTime,
          statusCode: res.statusCode,
          userAgent: req.get('User-Agent'),
          ip: req.ip || req.connection.remoteAddress,
          userId: (req as any).user?.id,
          memoryUsage: {
            rss: endMemory.rss - startMemory.rss,
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            heapTotal: endMemory.heapTotal - startMemory.heapTotal,
            external: endMemory.external - startMemory.external,
            arrayBuffers: (endMemory as any).arrayBuffers - (startMemory as any).arrayBuffers || 0,
          }
        };

        PerformanceMonitor.getInstance().addMetric(metric);

        // Log slow requests (>2 seconds)
        if (responseTime > 2000) {
          console.warn(`🐌 Slow request detected: ${req.method} ${req.path} - ${responseTime.toFixed(2)}ms`);
        }

        return originalEnd.apply(this, args);
      };

      next();
    };
  }

  /**
   * Add performance metric
   */
  addMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    
    // Maintain rolling window
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * Get performance statistics
   */
  getStats(timeWindow?: number) {
    const now = Date.now();
    const windowMs = timeWindow || 60000; // Default 1 minute
    const recentMetrics = this.metrics.filter(m => now - m.timestamp <= windowMs);

    if (recentMetrics.length === 0) {
      return null;
    }

    const responseTimes = recentMetrics.map(m => m.responseTime);
    const statusCodes = recentMetrics.reduce((acc, m) => {
      acc[m.statusCode] = (acc[m.statusCode] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const endpointStats = recentMetrics.reduce((acc, m) => {
      const key = `${m.method} ${m.endpoint}`;
      if (!acc[key]) {
        acc[key] = { count: 0, totalTime: 0, avgTime: 0 };
      }
      acc[key].count++;
      acc[key].totalTime += m.responseTime;
      acc[key].avgTime = acc[key].totalTime / acc[key].count;
      return acc;
    }, {} as Record<string, { count: number; totalTime: number; avgTime: number }>);

    return {
      timeWindow: windowMs,
      totalRequests: recentMetrics.length,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      p95ResponseTime: this.percentile(responseTimes, 0.95),
      p99ResponseTime: this.percentile(responseTimes, 0.99),
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      statusCodeDistribution: statusCodes,
      errorRate: ((statusCodes[500] || 0) + (statusCodes[404] || 0) + (statusCodes[400] || 0)) / recentMetrics.length * 100,
      requestsPerSecond: recentMetrics.length / (windowMs / 1000),
      endpointStats,
      slowestEndpoints: Object.entries(endpointStats)
        .sort(([,a], [,b]) => b.avgTime - a.avgTime)
        .slice(0, 5)
        .map(([endpoint, stats]) => ({
          endpoint,
          avgResponseTime: stats.avgTime,
          requestCount: stats.count
        })),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      uptime: process.uptime()
    };
  }

  /**
   * Get real-time metrics
   */
  getRealTimeMetrics() {
    return {
      current: this.getStats(60000), // Last 1 minute
      last5Minutes: this.getStats(300000), // Last 5 minutes
      last15Minutes: this.getStats(900000), // Last 15 minutes
      trends: this.getTrends()
    };
  }

  /**
   * Get performance trends
   */
  private getTrends() {
    const now = Date.now();
    const intervals = [
      { name: '0-5min', start: now - 300000, end: now },
      { name: '5-10min', start: now - 600000, end: now - 300000 },
      { name: '10-15min', start: now - 900000, end: now - 600000 }
    ];

    return intervals.map(interval => {
      const metrics = this.metrics.filter(m => 
        m.timestamp >= interval.start && m.timestamp < interval.end
      );
      
      if (metrics.length === 0) return { period: interval.name, data: null };

      const responseTimes = metrics.map(m => m.responseTime);
      return {
        period: interval.name,
        data: {
          avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
          requestCount: metrics.length,
          errorRate: metrics.filter(m => m.statusCode >= 400).length / metrics.length * 100
        }
      };
    });
  }

  /**
   * Calculate percentile
   */
  private percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index] || 0;
  }

  /**
   * Clear old metrics (for memory management)
   */
  clearOldMetrics(olderThanMs: number = 3600000) { // 1 hour default
    const cutoff = Date.now() - olderThanMs;
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
  }
}

// Export middleware instance
export const performanceMiddleware = PerformanceMonitor.getInstance().middleware();
export const performanceMonitor = PerformanceMonitor.getInstance();