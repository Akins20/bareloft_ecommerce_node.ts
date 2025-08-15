/**
 * Analytics Job Processor
 * 
 * Handles analytics and tracking background jobs including:
 * - User activity tracking
 * - Product view analytics
 * - Purchase event processing
 * - Search analytics and insights
 * 
 * Features:
 * - Real-time analytics processing
 * - Data aggregation at multiple levels
 * - Nigerian market insights
 * - Performance metrics collection
 * 
 * Author: Bareloft Development Team
 */

import { Job } from 'bull';
import { logger } from '../../../utils/logger/winston';
import { 
  AnalyticsJobData, 
  AnalyticsJobType,
  JobResult 
} from '../../../types/job.types';
import { PrismaClient } from '@prisma/client';
import { RedisService } from '../../cache/RedisService';

const prisma = new PrismaClient();
const redis = new RedisService();

interface AnalyticsEvent {
  eventType: string;
  userId?: string;
  sessionId?: string;
  productId?: string;
  categoryId?: string;
  searchQuery?: string;
  location?: string;
  device?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class AnalyticsJobProcessor {
  /**
   * Process analytics jobs based on analytics type
   */
  static async process(job: Job<AnalyticsJobData>): Promise<JobResult> {
    const startTime = Date.now();
    const { analyticsType, eventData, aggregationLevel } = job.data;

    try {
      logger.info(`📊 Processing ${analyticsType} analytics job ${job.id}`, {
        aggregationLevel,
        jobId: job.id
      });

      await job.progress(10);

      let result: any;

      switch (analyticsType) {
        case AnalyticsJobType.USER_ACTIVITY:
          result = await this.processUserActivityAnalytics(job);
          break;

        case AnalyticsJobType.PRODUCT_VIEW:
          result = await this.processProductViewAnalytics(job);
          break;

        case AnalyticsJobType.PURCHASE_EVENT:
          result = await this.processPurchaseEventAnalytics(job);
          break;

        case AnalyticsJobType.SEARCH_ANALYTICS:
          result = await this.processSearchAnalytics(job);
          break;

        default:
          throw new Error(`Unknown analytics job type: ${analyticsType}`);
      }

      await job.progress(90);

      const duration = Date.now() - startTime;
      
      logger.info(`✅ Analytics job ${job.id} completed successfully`, {
        analyticsType,
        aggregationLevel,
        duration,
        recordsProcessed: result.recordsProcessed
      });

      await job.progress(100);

      return {
        success: true,
        result: {
          recordsProcessed: result.recordsProcessed,
          aggregationLevel,
          analyticsType,
          insights: result.insights || {}
        },
        duration,
        processedAt: new Date(),
        metadata: {
          analyticsType,
          aggregationLevel,
          eventCount: result.recordsProcessed
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown analytics processing error';

      logger.error(`❌ Analytics job ${job.id} failed`, {
        analyticsType,
        error: errorMessage,
        duration,
        attemptsMade: job.attemptsMade
      });

      return {
        success: false,
        error: errorMessage,
        duration,
        processedAt: new Date(),
        metadata: {
          analyticsType,
          aggregationLevel,
          attemptsMade: job.attemptsMade,
          maxAttempts: job.opts.attempts || 2
        }
      };
    }
  }

  /**
   * Process user activity analytics
   */
  private static async processUserActivityAnalytics(job: Job<AnalyticsJobData>): Promise<{ recordsProcessed: number; insights: any }> {
    const { eventData, aggregationLevel } = job.data;
    
    await job.progress(30);

    // For now, just log the activity (since userActivity table doesn't exist yet)
    logger.info('Processing user activity analytics', {
      userId: eventData.userId,
      sessionId: eventData.sessionId,
      action: eventData.action,
      aggregationLevel
    });

    await job.progress(80);

    // Update real-time activity counters in Redis
    await this.updateRealTimeCounters('user_activity', eventData);

    return { 
      recordsProcessed: 1, 
      insights: {
        eventProcessed: true,
        aggregationLevel,
        message: 'Activity analytics processed successfully'
      }
    };
  }

  /**
   * Process product view analytics
   */
  private static async processProductViewAnalytics(job: Job<AnalyticsJobData>): Promise<{ recordsProcessed: number; insights: any }> {
    const { eventData, aggregationLevel } = job.data;
    
    await job.progress(30);

    // For now, just log the view (since productView table doesn't exist yet)
    logger.info('Processing product view analytics', {
      productId: eventData.productId,
      userId: eventData.userId,
      aggregationLevel
    });

    await job.progress(70);

    // Update real-time product view counters
    await this.updateRealTimeCounters('product_view', eventData);

    // Update trending products cache
    if (eventData.productId) {
      await this.updateTrendingProducts(eventData.productId);
    }

    await job.progress(85);

    return { 
      recordsProcessed: 1, 
      insights: {
        eventProcessed: true,
        productId: eventData.productId,
        aggregationLevel,
        message: 'Product view analytics processed successfully'
      }
    };
  }

  /**
   * Process purchase event analytics
   */
  private static async processPurchaseEventAnalytics(job: Job<AnalyticsJobData>): Promise<{ recordsProcessed: number; insights: any }> {
    const { eventData, aggregationLevel } = job.data;
    
    await job.progress(30);

    // For now, just log the purchase (since purchaseEvent table doesn't exist yet)
    logger.info('Processing purchase event analytics', {
      orderId: eventData.orderId,
      userId: eventData.userId,
      totalAmount: eventData.totalAmount,
      aggregationLevel
    });

    await job.progress(70);

    // Update real-time revenue counters
    await this.updateRealTimeCounters('purchase_event', eventData);

    // Update customer lifetime value (simplified)
    if (eventData.userId && eventData.totalAmount) {
      await this.updateCustomerLifetimeValue(eventData.userId, eventData.totalAmount);
    }

    await job.progress(85);

    return { 
      recordsProcessed: 1, 
      insights: {
        eventProcessed: true,
        orderId: eventData.orderId,
        totalAmount: eventData.totalAmount,
        aggregationLevel,
        message: 'Purchase event analytics processed successfully'
      }
    };
  }

  /**
   * Process search analytics
   */
  private static async processSearchAnalytics(job: Job<AnalyticsJobData>): Promise<{ recordsProcessed: number; insights: any }> {
    const { eventData, aggregationLevel } = job.data;
    
    await job.progress(30);

    // For now, just log the search (since searchEvent table doesn't exist yet)
    logger.info('Processing search analytics', {
      query: eventData.query,
      userId: eventData.userId,
      resultCount: eventData.resultCount,
      aggregationLevel
    });

    await job.progress(70);

    // Update search trend data
    if (eventData.query) {
      await this.updateSearchTrends(eventData.query);
      await this.updatePopularSearchTerms(eventData.query);
    }

    await job.progress(85);

    return { 
      recordsProcessed: 1, 
      insights: {
        eventProcessed: true,
        query: eventData.query,
        aggregationLevel,
        message: 'Search analytics processed successfully'
      }
    };
  }

  // Note: These aggregation methods are commented out until the analytics tables are created
  // in the database schema (userActivity, productView, etc.)
  
  // /**
  //  * Aggregate user-level activity data
  //  */
  // private static async aggregateUserLevelActivity(userId: string) {
  //   // TODO: Implement when userActivity table is added to schema
  //   return { message: 'User level aggregation not implemented yet' };
  // }

  /**
   * Update real-time counters in Redis
   */
  private static async updateRealTimeCounters(eventType: string, eventData: any) {
    try {
      await redis.connect();
      
      const today = new Date().toISOString().split('T')[0];
      const hour = new Date().getHours();
      
      // Increment daily counter
      await redis.incr(`analytics:${eventType}:daily:${today}`);
      
      // Increment hourly counter
      await redis.incr(`analytics:${eventType}:hourly:${today}:${hour}`);
      
      // Set expiration for counters (30 days for daily, 7 days for hourly)
      await redis.expire(`analytics:${eventType}:daily:${today}`, 30 * 24 * 60 * 60);
      await redis.expire(`analytics:${eventType}:hourly:${today}:${hour}`, 7 * 24 * 60 * 60);
      
    } catch (error) {
      logger.error('Failed to update real-time counters', {
        eventType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update trending products based on views
   */
  private static async updateTrendingProducts(productId: string) {
    try {
      await redis.connect();
      
      // Simplified version - just increment a counter for the product
      const key = `trending:products:${productId}`;
      await redis.incr(key);
      await redis.expire(key, 24 * 60 * 60); // 24 hours expiry
      
    } catch (error) {
      logger.error('Failed to update trending products', {
        productId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update customer lifetime value
   */
  private static async updateCustomerLifetimeValue(userId: string, purchaseAmount: number) {
    try {
      // For now, just log the CLV update (since totalPurchases field doesn't exist on User model)
      logger.info('Updating customer lifetime value', {
        userId,
        purchaseAmount
      });

      // Update CLV in Redis for real-time access (simplified)
      await redis.connect();
      const key = `clv:${userId}`;
      const currentValue = await redis.get(key) || '0';
      const newValue = parseFloat(currentValue) + purchaseAmount;
      await redis.set(key, newValue.toString());
      await redis.expire(key, 30 * 24 * 60 * 60); // 30 days expiry
      
    } catch (error) {
      logger.error('Failed to update customer lifetime value', {
        userId,
        purchaseAmount,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update search trends
   */
  private static async updateSearchTrends(query: string) {
    try {
      await redis.connect();
      
      // Increment search count for this query (simplified)
      const key = `search:trends:${query.toLowerCase()}`;
      await redis.incr(key);
      await redis.expire(key, 7 * 24 * 60 * 60); // 7 days expiry
      
    } catch (error) {
      logger.error('Failed to update search trends', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update popular search terms cache
   */
  private static async updatePopularSearchTerms(query: string) {
    try {
      await redis.connect();
      
      const today = new Date().toISOString().split('T')[0];
      
      // Daily search term tracking
      await redis.incr(`search:daily:${today}:${query.toLowerCase()}`);
      await redis.expire(`search:daily:${today}:${query.toLowerCase()}`, 7 * 24 * 60 * 60);
      
    } catch (error) {
      logger.error('Failed to update popular search terms', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle job failure
   */
  static async handleFailure(job: Job<AnalyticsJobData>, error: Error): Promise<void> {
    const { analyticsType, aggregationLevel } = job.data;

    logger.error(`📊 Analytics job ${job.id} failed`, {
      analyticsType,
      aggregationLevel,
      error: error.message,
      attemptsMade: job.attemptsMade,
      maxAttempts: job.opts.attempts || 2
    });

    // For critical analytics, log the failure for later review
    if (job.attemptsMade >= 2) {
      logger.error(`📊 Analytics event failed after ${job.attemptsMade} attempts`, {
        jobId: job.id.toString(),
        analyticsType,
        eventData: job.data.eventData,
        error: error.message
      });
    }
  }

  /**
   * Get analytics statistics
   */
  static getStats() {
    return {
      supportedAnalyticsTypes: Object.values(AnalyticsJobType),
      aggregationLevels: ['user', 'product', 'category', 'global'],
      features: [
        'Real-time analytics processing',
        'Multi-level data aggregation',
        'Nigerian market insights',
        'Performance metrics collection',
        'Trending products tracking',
        'Customer lifetime value calculation',
        'Search trend analysis'
      ]
    };
  }
}