/**
 * Job Queue Manager
 * 
 * Central management system for all background job queues using Bull.
 * Handles job creation, processing, monitoring, and error management.
 * 
 * Features:
 * - Multiple specialized queues (email, notifications, analytics)
 * - Automatic retry with exponential backoff
 * - Job prioritization and scheduling
 * - Performance monitoring and statistics
 * - Graceful shutdown handling
 * 
 * Author: Bareloft Development Team
 */

import Bull, { Queue, Job } from 'bull';
import Redis from 'ioredis';
import { RedisService } from '../cache/RedisService';
import { config } from '../../config/environment';
import { logger } from '../../utils/logger/winston';
import { 
  JobType, 
  JobData, 
  JobPriority, 
  QueueOptions, 
  QueueStats, 
  BulkJobData,
  JobQueueConfig,
  EmailJobData,
  NotificationJobData,
  AnalyticsJobData,
  CacheJobData,
  MaintenanceJobData
} from '../../types/job.types';

export class JobQueueManager {
  private queues: Map<JobType, Queue> = new Map();
  private redis: Redis;
  private isInitialized = false;
  private processors: Map<JobType, (job: Job) => Promise<any>> = new Map();

  // Queue configuration with Nigerian market optimization
  private readonly queueConfig: JobQueueConfig = {
    redis: {
      host: config.redis.url.includes('://') ? new URL(config.redis.url).hostname : config.redis.url,
      port: config.redis.url.includes('://') ? parseInt(new URL(config.redis.url).port) || 6379 : 6379,
      password: config.redis.url.includes('://') ? new URL(config.redis.url).password || undefined : undefined,
      db: 0
    },
    queues: {
      [JobType.EMAIL]: {
        concurrency: 5, // Process 5 emails simultaneously
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: 'exponential',
          timeout: 30000 // 30 seconds
        }
      },
      [JobType.NOTIFICATION]: {
        concurrency: 10, // Higher concurrency for notifications
        defaultJobOptions: {
          removeOnComplete: 200,
          removeOnFail: 100,
          attempts: 5,
          backoff: 'fixed',
          timeout: 15000 // 15 seconds
        }
      },
      [JobType.OTP]: {
        concurrency: 15, // Critical - highest concurrency
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 25,
          attempts: 2, // Don't retry OTP too much
          backoff: 'fixed',
          timeout: 10000 // 10 seconds
        }
      },
      [JobType.ANALYTICS]: {
        concurrency: 3, // Lower priority
        defaultJobOptions: {
          removeOnComplete: 500,
          removeOnFail: 100,
          attempts: 2,
          backoff: 'exponential',
          timeout: 60000 // 1 minute
        }
      },
      [JobType.PAYMENT_VERIFICATION]: {
        concurrency: 8, // High concurrency for payment processing
        defaultJobOptions: {
          removeOnComplete: 1000, // Keep more records for audit trail
          removeOnFail: 500,
          attempts: 1, // Don't retry at job level - handled by processor logic
          backoff: 'exponential',
          timeout: 120000 // 2 minutes for Paystack API calls
        }
      },
      [JobType.PAYMENT_RECONCILIATION]: {
        concurrency: 2, // Lower concurrency for bulk reconciliation
        defaultJobOptions: {
          removeOnComplete: 100, // Keep reconciliation records
          removeOnFail: 50,
          attempts: 2, // Retry once if reconciliation fails
          backoff: 'exponential',
          timeout: 600000 // 10 minutes for bulk operations
        }
      },
      [JobType.CACHE_UPDATE]: {
        concurrency: 2,
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 25,
          attempts: 3,
          backoff: 'fixed',
          timeout: 45000 // 45 seconds
        }
      },
      [JobType.MAINTENANCE]: {
        concurrency: 1, // Serial processing for maintenance
        defaultJobOptions: {
          removeOnComplete: 20,
          removeOnFail: 10,
          attempts: 1, // Don't retry maintenance tasks
          timeout: 300000 // 5 minutes
        }
      },
      [JobType.REPORTING]: {
        concurrency: 1,
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 5,
          attempts: 2,
          backoff: 'exponential',
          timeout: 600000 // 10 minutes
        }
      },
      [JobType.CLEANUP]: {
        concurrency: 1,
        defaultJobOptions: {
          removeOnComplete: 5,
          removeOnFail: 3,
          attempts: 1,
          timeout: 300000 // 5 minutes
        }
      }
    },
    monitoring: {
      enabled: true,
      port: 3008,
      path: '/jobs'
    }
  };

  constructor(redisService?: RedisService) {
    if (redisService && redisService.getClient()) {
      this.redis = redisService.getClient() as Redis;
    } else {
      this.redis = new Redis(config.redis.url);
    }
  }

  /**
   * Initialize all job queues
   */
  async initialize(): Promise<void> {
    try {
      logger.info('🔄 Initializing job queue system...');

      // Create queues for each job type
      for (const [jobType, queueConfig] of Object.entries(this.queueConfig.queues)) {
        const queue = new Bull(jobType, {
          redis: this.queueConfig.redis,
          defaultJobOptions: queueConfig.defaultJobOptions as any
        });

        // Set up error handling
        queue.on('error', (error) => {
          logger.error(`❌ Queue error in ${jobType}:`, error);
        });

        queue.on('waiting', (jobId) => {
          logger.debug(`⏳ Job ${jobId} waiting in ${jobType} queue`);
        });

        queue.on('active', (job) => {
          logger.debug(`🔄 Processing job ${job.id} in ${jobType} queue`);
        });

        queue.on('completed', (job, result) => {
          logger.info(`✅ Job ${job.id} completed in ${jobType} queue`, { 
            duration: Date.now() - job.timestamp,
            result: typeof result === 'object' ? JSON.stringify(result) : result
          });
        });

        queue.on('failed', (job, err) => {
          logger.error(`❌ Job ${job.id} failed in ${jobType} queue:`, {
            error: err.message,
            attempts: job.attemptsMade,
            data: job.data
          });
        });

        queue.on('stalled', (job) => {
          logger.warn(`⚠️ Job ${job.id} stalled in ${jobType} queue`);
        });

        this.queues.set(jobType as JobType, queue);
      }

      this.isInitialized = true;
      logger.info('✅ Job queue system initialized successfully');

      // Log queue statistics
      await this.logQueueStatistics();

    } catch (error) {
      logger.error('❌ Failed to initialize job queue system:', error);
      throw error;
    }
  }

  /**
   * Register a job processor for a specific job type
   */
  registerProcessor(jobType: JobType, processor: (job: Job) => Promise<any>): void {
    if (!this.isInitialized) {
      throw new Error('Job queue system must be initialized before registering processors');
    }

    const queue = this.queues.get(jobType);
    if (!queue) {
      throw new Error(`Queue for job type ${jobType} not found`);
    }

    const concurrency = this.queueConfig.queues[jobType].concurrency;
    
    // Process jobs with specified concurrency
    queue.process(concurrency, async (job) => {
      const startTime = Date.now();
      
      try {
        logger.debug(`🔄 Processing ${jobType} job ${job.id}`, { data: job.data });
        
        const result = await processor(job);
        
        const duration = Date.now() - startTime;
        logger.info(`✅ Completed ${jobType} job ${job.id}`, { duration, result });
        
        return result;
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`❌ Failed ${jobType} job ${job.id}`, { 
          duration, 
          error: error instanceof Error ? error.message : String(error),
          attempts: job.attemptsMade
        });
        
        throw error;
      }
    });

    this.processors.set(jobType, processor);
    logger.info(`📝 Registered processor for ${jobType} jobs with concurrency ${concurrency}`);
  }

  /**
   * Add a job to the appropriate queue
   */
  async addJob<T extends JobData>(
    jobType: JobType, 
    jobData: T, 
    options?: QueueOptions
  ): Promise<Job<T>> {
    if (!this.isInitialized) {
      throw new Error('Job queue system not initialized');
    }

    const queue = this.queues.get(jobType);
    if (!queue) {
      throw new Error(`Queue for job type ${jobType} not found`);
    }

    // Merge with default options
    const jobOptions: QueueOptions = {
      ...this.queueConfig.queues[jobType].defaultJobOptions,
      ...options
    };

    // Set priority based on job data (Bull uses lower numbers for higher priority)
    if (jobData.priority !== undefined) {
      jobOptions.priority = jobData.priority;
    }

    // Schedule job if needed
    if (jobData.scheduledFor) {
      const delay = jobData.scheduledFor.getTime() - Date.now();
      if (delay > 0) {
        jobOptions.delay = delay;
      }
    }

    const job = await queue.add(jobData, jobOptions as any);
    
    logger.info(`➕ Added ${jobType} job ${job.id}`, {
      priority: jobData.priority,
      scheduledFor: jobData.scheduledFor,
      options: jobOptions
    });

    return job as Job<T>;
  }

  /**
   * Add multiple jobs to queues in bulk
   */
  async addBulkJobs(jobs: BulkJobData[]): Promise<Job[]> {
    const results: Job[] = [];
    
    for (const { name, data, options } of jobs) {
      const job = await this.addJob(data.type, data, options);
      results.push(job);
    }
    
    logger.info(`➕ Added ${jobs.length} bulk jobs`);
    return results;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats[]> {
    const stats: QueueStats[] = [];

    for (const [jobType, queue] of this.queues.entries()) {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(), 
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed()
      ]);

      const totalProcessed = completed.length + failed.length;
      const recentJobs = [...completed, ...failed]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 100);

      const avgProcessingTime = recentJobs.length > 0
        ? recentJobs.reduce((sum, job) => sum + (job.finishedOn! - job.processedOn!), 0) / recentJobs.length
        : 0;

      const processingRate = recentJobs.length > 0
        ? (recentJobs.length / ((Date.now() - recentJobs[recentJobs.length - 1].timestamp) / 60000)) || 0
        : 0;

      stats.push({
        name: jobType,
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        paused: await queue.isPaused(),
        totalProcessed,
        processingRate,
        avgProcessingTime
      });
    }

    return stats;
  }

  /**
   * Pause a specific queue
   */
  async pauseQueue(jobType: JobType): Promise<void> {
    const queue = this.queues.get(jobType);
    if (!queue) {
      throw new Error(`Queue for job type ${jobType} not found`);
    }

    await queue.pause();
    logger.info(`⏸️ Paused ${jobType} queue`);
  }

  /**
   * Resume a specific queue  
   */
  async resumeQueue(jobType: JobType): Promise<void> {
    const queue = this.queues.get(jobType);
    if (!queue) {
      throw new Error(`Queue for job type ${jobType} not found`);
    }

    await queue.resume();
    logger.info(`▶️ Resumed ${jobType} queue`);
  }

  /**
   * Clean completed and failed jobs from all queues
   */
  async cleanQueues(): Promise<void> {
    for (const [jobType, queue] of this.queues.entries()) {
      await queue.clean(24 * 60 * 60 * 1000, 'completed'); // Clean completed jobs older than 24 hours
      await queue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // Clean failed jobs older than 7 days
      
      logger.debug(`🧹 Cleaned ${jobType} queue`);
    }
    
    logger.info('✅ All queues cleaned successfully');
  }

  /**
   * Get job by ID from any queue
   */
  async getJob(jobId: string): Promise<Job | null> {
    for (const queue of this.queues.values()) {
      const job = await queue.getJob(jobId);
      if (job) return job;
    }
    return null;
  }

  /**
   * Log queue statistics for monitoring
   */
  private async logQueueStatistics(): Promise<void> {
    const stats = await this.getQueueStats();
    
    logger.info('📊 Job Queue Statistics:', {
      totalQueues: stats.length,
      totalWaiting: stats.reduce((sum, s) => sum + s.waiting, 0),
      totalActive: stats.reduce((sum, s) => sum + s.active, 0),
      totalCompleted: stats.reduce((sum, s) => sum + s.completed, 0),
      totalFailed: stats.reduce((sum, s) => sum + s.failed, 0),
      queues: stats.map(s => ({
        name: s.name,
        waiting: s.waiting,
        active: s.active,
        processingRate: `${s.processingRate.toFixed(1)}/min`
      }))
    });
  }

  /**
   * Graceful shutdown of all queues
   */
  async shutdown(): Promise<void> {
    logger.info('🔄 Shutting down job queue system...');

    // Close all queues
    const closePromises = Array.from(this.queues.values()).map(queue => queue.close());
    await Promise.all(closePromises);

    // Close Redis connection
    this.redis.disconnect();

    logger.info('✅ Job queue system shutdown complete');
  }

  /**
   * Get paginated list of jobs from all queues
   */
  async getJobs(options: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    search?: string;
  } = {}) {
    const { page = 1, limit = 20, status, type, search } = options;
    const allJobs = [];

    // Get jobs from all queues
    for (const [jobType, queue] of this.queues.entries()) {
      if (type && jobType !== type) continue;

      let jobs = [];
      
      if (status === 'waiting') {
        jobs = await queue.getWaiting();
      } else if (status === 'active') {
        jobs = await queue.getActive();
      } else if (status === 'completed') {
        jobs = await queue.getCompleted();
      } else if (status === 'failed') {
        jobs = await queue.getFailed();
      } else {
        // Get all job types
        const [waiting, active, completed, failed] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(), 
          queue.getCompleted(),
          queue.getFailed()
        ]);
        jobs = [...waiting, ...active, ...completed, ...failed];
      }

      allJobs.push(...jobs);
    }

    // Filter by search if provided
    let filteredJobs = allJobs;
    if (search) {
      filteredJobs = allJobs.filter(job => 
        job.id?.toString().includes(search) ||
        job.name?.toLowerCase().includes(search.toLowerCase()) ||
        JSON.stringify(job.data).toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort by timestamp (newest first)
    filteredJobs.sort((a, b) => b.timestamp - a.timestamp);

    // Paginate
    const total = filteredJobs.length;
    const pages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const data = filteredJobs.slice(startIndex, endIndex);

    return {
      data,
      page,
      limit,
      total,
      pages
    };
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<Job | null> {
    for (const queue of this.queues.values()) {
      const job = await queue.getJob(jobId);
      if (job) {
        if (job.finishedOn && job.failedReason) {
          // Job failed, retry it
          await job.retry();
          return job;
        }
        return job;
      }
    }
    return null;
  }

  /**
   * Remove a job from queue
   */
  async removeJob(jobId: string): Promise<boolean> {
    for (const queue of this.queues.values()) {
      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
        return true;
      }
    }
    return false;
  }

  /**
   * Health check for job queue system
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    queues: Record<string, { healthy: boolean; stats: QueueStats }>;
  }> {
    const result = {
      healthy: true,
      queues: {} as Record<string, { healthy: boolean; stats: QueueStats }>
    };

    const stats = await this.getQueueStats();
    
    for (const stat of stats) {
      const queueHealthy = !stat.paused && stat.active < 1000; // Consider unhealthy if too many active jobs
      
      result.queues[stat.name] = {
        healthy: queueHealthy,
        stats: stat
      };

      if (!queueHealthy) {
        result.healthy = false;
      }
    }

    return result;
  }
}