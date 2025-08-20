/**
 * Performance Metrics Routes
 * 
 * Provides real-time performance monitoring and metrics endpoints
 * for system health, API performance, and resource utilization
 * 
 * All routes are prefixed with /api/v1/metrics
 */

import { Router } from "express";
import { performanceMonitor } from "../../middleware/monitoring/performanceMiddleware";
import { rateLimiter } from "../../middleware/security/rateLimiter";

const router = Router();

/**
 * @swagger
 * /api/v1/metrics/performance:
 *   get:
 *     summary: Get real-time API performance metrics
 *     description: Retrieve comprehensive performance metrics including response times, error rates, and resource utilization for monitoring system health
 *     tags: [Metrics]
 *     parameters:
 *       - in: query
 *         name: window
 *         schema:
 *           type: integer
 *           default: 60000
 *         description: Time window in milliseconds for metrics aggregation
 *     responses:
 *       200:
 *         description: Performance metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Performance metrics retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/PerformanceMetrics'
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.get(
  "/performance", 
  rateLimiter.general,
  (req, res) => {
    try {
      const window = req.query.window ? parseInt(req.query.window as string) : undefined;
      const stats = performanceMonitor.getStats(window);
      
      if (!stats) {
        return res.json({
          success: true,
          message: "No performance data available yet",
          data: null
        });
      }

      res.json({
        success: true,
        message: "Performance metrics retrieved successfully",
        data: stats
      });
    } catch (error) {
      console.error("Error retrieving performance metrics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve performance metrics",
        error: "INTERNAL_ERROR"
      });
    }
  }
);

/**
 * @route   GET /api/v1/metrics/realtime
 * @desc    Get comprehensive real-time metrics with trends
 * @access  Public (with rate limiting)
 * 
 * @response {
 *   success: true,
 *   message: "Real-time metrics retrieved successfully", 
 *   data: {
 *     current: object,        // Last 1 minute metrics
 *     last5Minutes: object,   // Last 5 minutes metrics
 *     last15Minutes: object,  // Last 15 minutes metrics
 *     trends: Array<{
 *       period: string,
 *       data: {
 *         avgResponseTime: number,
 *         requestCount: number,
 *         errorRate: number
 *       }
 *     }>
 *   }
 * }
 */
router.get(
  "/realtime",
  rateLimiter.general, 
  (req, res) => {
    try {
      const metrics = performanceMonitor.getRealTimeMetrics();
      
      res.json({
        success: true,
        message: "Real-time metrics retrieved successfully",
        data: {
          ...metrics,
          timestamp: new Date().toISOString(),
          server: {
            nodeVersion: process.version,
            platform: process.platform,
            uptime: process.uptime(),
            pid: process.pid
          }
        }
      });
    } catch (error) {
      console.error("Error retrieving real-time metrics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve real-time metrics", 
        error: "INTERNAL_ERROR"
      });
    }
  }
);

/**
 * @route   GET /api/v1/metrics/system
 * @desc    Get system-level performance metrics
 * @access  Public (with rate limiting)
 * 
 * @response {
 *   success: true,
 *   message: "System metrics retrieved successfully",
 *   data: {
 *     memory: {
 *       rss: number,           // Resident Set Size
 *       heapUsed: number,      // Heap actually used
 *       heapTotal: number,     // Total heap allocated
 *       external: number,      // External memory usage
 *       arrayBuffers: number   // ArrayBuffers memory
 *     },
 *     process: {
 *       uptime: number,        // Process uptime in seconds
 *       pid: number,           // Process ID
 *       version: string,       // Node.js version
 *       platform: string       // Operating system platform
 *     },
 *     performance: {
 *       eventLoop: object,     // Event loop metrics
 *       gc: object            // Garbage collection metrics
 *     }
 *   }
 * }
 */
router.get(
  "/system",
  rateLimiter.general,
  (req, res) => {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Convert bytes to MB for readability
      const formatBytes = (bytes: number) => Math.round(bytes / 1024 / 1024 * 100) / 100;
      
      const systemMetrics = {
        memory: {
          rss: formatBytes(memoryUsage.rss),
          heapUsed: formatBytes(memoryUsage.heapUsed),
          heapTotal: formatBytes(memoryUsage.heapTotal),
          external: formatBytes(memoryUsage.external),
          arrayBuffers: formatBytes((memoryUsage as any).arrayBuffers || 0),
          usage: {
            heapUtilization: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
            totalMB: formatBytes(memoryUsage.rss)
          }
        },
        process: {
          uptime: Math.round(process.uptime()),
          pid: process.pid,
          version: process.version,
          platform: process.platform,
          arch: process.arch
        },
        cpu: {
          user: Math.round(cpuUsage.user / 1000), // Convert to milliseconds
          system: Math.round(cpuUsage.system / 1000)
        },
        environment: {
          nodeEnv: process.env.NODE_ENV || 'development',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          locale: Intl.DateTimeFormat().resolvedOptions().locale
        }
      };

      res.json({
        success: true,
        message: "System metrics retrieved successfully",
        data: systemMetrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error retrieving system metrics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve system metrics",
        error: "INTERNAL_ERROR"
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/metrics/health:
 *   get:
 *     summary: Get comprehensive system health check
 *     description: Perform health assessment with performance indicators, memory usage analysis, and actionable recommendations for system optimization
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Health check completed - healthy"
 *                 data:
 *                   $ref: '#/components/schemas/HealthCheck'
 *       503:
 *         description: System is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Health check completed - unhealthy"
 *                 data:
 *                   $ref: '#/components/schemas/HealthCheck'
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
  "/health",
  rateLimiter.general,
  (req, res) => {
    try {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      const recentStats = performanceMonitor.getStats(300000); // Last 5 minutes
      
      // Health checks
      const memoryUtilization = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      const isMemoryHealthy = memoryUtilization < 80; // Less than 80% heap usage
      const isUptimeHealthy = uptime > 60; // Running for more than 1 minute
      const isPerformanceHealthy = !recentStats || recentStats.averageResponseTime < 1000; // Avg response < 1s
      
      let status = "healthy";
      const issues: string[] = [];
      const recommendations: string[] = [];
      
      if (!isMemoryHealthy) {
        status = "degraded";
        issues.push("High memory usage");
        recommendations.push("Consider restarting the application or investigating memory leaks");
      }
      
      if (!isPerformanceHealthy && recentStats) {
        status = status === "healthy" ? "degraded" : "unhealthy";
        issues.push("Slow API performance");
        recommendations.push("Investigate slow endpoints and optimize database queries");
      }
      
      if (recentStats && recentStats.errorRate > 5) {
        status = "unhealthy";
        issues.push("High error rate");
        recommendations.push("Check application logs and fix failing endpoints");
      }

      const healthData = {
        status,
        uptime: Math.round(uptime),
        version: process.version,
        timestamp: new Date().toISOString(),
        checks: {
          api: {
            status: isPerformanceHealthy ? "healthy" : "degraded",
            averageResponseTime: recentStats?.averageResponseTime || null,
            errorRate: recentStats?.errorRate || 0,
            requestsPerSecond: recentStats?.requestsPerSecond || 0
          },
          memory: {
            status: isMemoryHealthy ? "healthy" : "degraded", 
            utilizationPercent: Math.round(memoryUtilization),
            heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024)
          },
          system: {
            status: isUptimeHealthy ? "healthy" : "starting",
            uptime: Math.round(uptime),
            platform: process.platform,
            nodeVersion: process.version
          }
        },
        issues,
        recommendations
      };

      res.status(status === "unhealthy" ? 503 : 200).json({
        success: status !== "unhealthy",
        message: `Health check completed - ${status}`,
        data: healthData
      });
    } catch (error) {
      console.error("Error during health check:", error);
      res.status(503).json({
        success: false,
        message: "Health check failed",
        error: "HEALTH_CHECK_ERROR",
        data: {
          status: "unhealthy",
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

export default router;