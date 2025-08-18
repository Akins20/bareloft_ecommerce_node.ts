/**
 * Job Service
 * 
 * Main service for managing background jobs in the Bareloft e-commerce system.
 * Integrates JobQueueManager with specific job processors and provides
 * a high-level API for job management.
 * 
 * Features:
 * - Job creation and scheduling
 * - Queue monitoring and statistics
 * - Job processor registration
 * - Error handling and retry logic
 * 
 * Author: Bareloft Development Team
 */

import { logger } from '../../utils/logger/winston';
import { JobQueueManager } from './JobQueueManager';
import { 
  EmailJobProcessor, 
  NotificationJobProcessor, 
  AnalyticsJobProcessor,
  PaymentVerificationJobProcessor,
  PaymentReconciliationJobProcessor
} from './processors';
import { 
  JobType, 
  JobData, 
  JobPriority,
  EmailJobData,
  NotificationJobData,
  AnalyticsJobData,
  CacheJobData,
  MaintenanceJobData,
  PaymentVerificationJobData,
  PaymentReconciliationJobData,
  QueueOptions
} from '../../types/job.types';
import { Job } from 'bull';

export class JobService {
  private queueManager: JobQueueManager;
  private isInitialized = false;

  constructor() {
    this.queueManager = new JobQueueManager();
  }

  /**
   * Initialize the job service and register all processors
   */
  async initialize(): Promise<void> {
    try {
      logger.info('🔄 Initializing JobService...');

      // Initialize the queue manager
      await this.queueManager.initialize();

      // Register all job processors
      await this.registerProcessors();

      this.isInitialized = true;

      logger.info('✅ JobService initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize JobService', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Register all job processors with their respective queues
   */
  private async registerProcessors(): Promise<void> {
    // Register email processor
    this.queueManager.registerProcessor(JobType.EMAIL, async (job: Job) => {
      return await EmailJobProcessor.process(job);
    });

    // Register notification processor
    this.queueManager.registerProcessor(JobType.NOTIFICATION, async (job: Job) => {
      return await NotificationJobProcessor.process(job);
    });

    // Register OTP processor (uses email processor for now)
    this.queueManager.registerProcessor(JobType.OTP, async (job: Job) => {
      return await EmailJobProcessor.process(job);
    });

    // Register analytics processor
    this.queueManager.registerProcessor(JobType.ANALYTICS, async (job: Job) => {
      return await AnalyticsJobProcessor.process(job);
    });

    // Register payment verification processor
    this.queueManager.registerProcessor(JobType.PAYMENT_VERIFICATION, async (job: Job) => {
      const processor = new PaymentVerificationJobProcessor();
      return await processor.process(job);
    });

    // Register payment reconciliation processor
    this.queueManager.registerProcessor(JobType.PAYMENT_RECONCILIATION, async (job: Job) => {
      const processor = new PaymentReconciliationJobProcessor();
      return await processor.process(job);
    });

    // Register cache update processor
    this.queueManager.registerProcessor(JobType.CACHE_UPDATE, async (job: Job) => {
      return await this.processCacheUpdateJob(job);
    });

    // Register maintenance processor
    this.queueManager.registerProcessor(JobType.MAINTENANCE, async (job: Job) => {
      return await this.processMaintenanceJob(job);
    });

    // Register reporting processor
    this.queueManager.registerProcessor(JobType.REPORTING, async (job: Job) => {
      return await this.processReportingJob(job);
    });

    // Register cleanup processor
    this.queueManager.registerProcessor(JobType.CLEANUP, async (job: Job) => {
      return await this.processCleanupJob(job);
    });

    logger.info('📝 All job processors registered successfully');
  }

  /**
   * Add an email job to the queue
   */
  async addEmailJob(emailData: Omit<EmailJobData, 'type' | 'createdAt'>, options?: QueueOptions): Promise<Job<EmailJobData>> {
    this.ensureInitialized();

    const jobData: EmailJobData = {
      ...emailData,
      type: JobType.EMAIL,
      createdAt: new Date(),
      priority: emailData.priority || JobPriority.MEDIUM
    };

    return await this.queueManager.addJob(JobType.EMAIL, jobData, options);
  }

  /**
   * Add a notification job to the queue
   */
  async addNotificationJob(notificationData: Omit<NotificationJobData, 'type' | 'createdAt'>, options?: QueueOptions): Promise<Job<NotificationJobData>> {
    this.ensureInitialized();

    const jobData: NotificationJobData = {
      ...notificationData,
      type: JobType.NOTIFICATION,
      createdAt: new Date(),
      priority: notificationData.priority || JobPriority.MEDIUM
    };

    return await this.queueManager.addJob(JobType.NOTIFICATION, jobData, options);
  }

  /**
   * Add an analytics job to the queue
   */
  async addAnalyticsJob(analyticsData: Omit<AnalyticsJobData, 'type' | 'createdAt'>, options?: QueueOptions): Promise<Job<AnalyticsJobData>> {
    this.ensureInitialized();

    const jobData: AnalyticsJobData = {
      ...analyticsData,
      type: JobType.ANALYTICS,
      createdAt: new Date(),
      priority: analyticsData.priority || JobPriority.LOW
    };

    return await this.queueManager.addJob(JobType.ANALYTICS, jobData, options);
  }

  /**
   * Add a cache update job to the queue
   */
  async addCacheUpdateJob(cacheData: Omit<CacheJobData, 'type' | 'createdAt'>, options?: QueueOptions): Promise<Job<CacheJobData>> {
    this.ensureInitialized();

    const jobData: CacheJobData = {
      ...cacheData,
      type: JobType.CACHE_UPDATE,
      createdAt: new Date(),
      priority: cacheData.priority || JobPriority.MEDIUM
    };

    return await this.queueManager.addJob(JobType.CACHE_UPDATE, jobData, options);
  }

  /**
   * Add a maintenance job to the queue
   */
  async addMaintenanceJob(maintenanceData: Omit<MaintenanceJobData, 'type' | 'createdAt'>, options?: QueueOptions): Promise<Job<MaintenanceJobData>> {
    this.ensureInitialized();

    const jobData: MaintenanceJobData = {
      ...maintenanceData,
      type: JobType.MAINTENANCE,
      createdAt: new Date(),
      priority: maintenanceData.priority || JobPriority.LOW
    };

    return await this.queueManager.addJob(JobType.MAINTENANCE, jobData, options);
  }

  /**
   * Add a payment verification job to the queue
   */
  async addPaymentVerificationJob(
    paymentData: Omit<PaymentVerificationJobData, 'type' | 'createdAt'>, 
    priority: JobPriority = JobPriority.MEDIUM,
    options?: QueueOptions
  ): Promise<Job<PaymentVerificationJobData>> {
    this.ensureInitialized();

    const jobData: PaymentVerificationJobData = {
      ...paymentData,
      type: JobType.PAYMENT_VERIFICATION,
      createdAt: new Date(),
    };

    logger.info(`💳 [CRON JOB] Scheduling payment verification job`, {
      paymentReference: paymentData.paymentReference,
      orderNumber: paymentData.orderNumber,
      attemptNumber: paymentData.attemptNumber,
      maxAttempts: paymentData.maxAttempts,
      priority,
      delay: options?.delay ? `${options.delay}ms` : 'immediate'
    });

    return await this.queueManager.addJob(JobType.PAYMENT_VERIFICATION, jobData, {
      priority,
      ...options
    });
  }

  /**
   * Add a payment reconciliation job to the queue
   */
  async addPaymentReconciliationJob(
    reconciliationData: Omit<PaymentReconciliationJobData, 'type' | 'createdAt'>,
    options?: QueueOptions
  ): Promise<Job<PaymentReconciliationJobData>> {
    this.ensureInitialized();

    const jobData: PaymentReconciliationJobData = {
      ...reconciliationData,
      type: JobType.PAYMENT_RECONCILIATION,
      createdAt: new Date(),
      priority: reconciliationData.priority || JobPriority.MEDIUM
    };

    logger.info(`🔄 [RECONCILIATION] Scheduling payment reconciliation job`, {
      reconciliationType: reconciliationData.reconciliationType,
      timeRangeHours: reconciliationData.timeRangeHours,
      batchSize: reconciliationData.batchSize,
      onlyUnconfirmed: reconciliationData.onlyUnconfirmed,
      delay: options?.delay ? `${options.delay}ms` : 'immediate'
    });

    return await this.queueManager.addJob(JobType.PAYMENT_RECONCILIATION, jobData, options);
  }

  /**
   * Process cache update jobs
   */
  private async processCacheUpdateJob(job: Job<CacheJobData>) {
    const startTime = Date.now();
    const { cacheKeys, operation, data } = job.data;

    try {
      logger.info(`🔄 Processing cache ${operation} job ${job.id}`, {
        keys: cacheKeys.length,
        operation
      });

      await job.progress(20);

      // TODO: Implement cache update logic
      // This would integrate with Redis or other caching layer
      switch (operation) {
        case 'refresh':
          // Refresh cache entries
          break;
        case 'invalidate':
          // Remove cache entries
          break;
        case 'preload':
          // Pre-populate cache entries
          break;
      }

      await job.progress(80);

      const duration = Date.now() - startTime;
      
      logger.info(`✅ Cache ${operation} job ${job.id} completed`, {
        keys: cacheKeys.length,
        duration
      });

      return {
        success: true,
        result: { operation, keysProcessed: cacheKeys.length },
        duration,
        processedAt: new Date()
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Cache job ${job.id} failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cache job failed',
        duration,
        processedAt: new Date()
      };
    }
  }

  /**
   * Process maintenance jobs
   */
  private async processMaintenanceJob(job: Job<MaintenanceJobData>) {
    const startTime = Date.now();
    const { task, parameters } = job.data;

    try {
      logger.info(`🛠️ Processing maintenance job ${job.id}`, { task });

      await job.progress(10);

      let result: any;

      switch (task) {
        case 'session_cleanup':
          result = await this.processSessionCleanup(job, parameters);
          break;
        case 'log_rotation':
          result = await this.processLogRotation(job, parameters);
          break;
        case 'temp_file_cleanup':
          result = await this.processTempFileCleanup(job, parameters);
          break;
        case 'db_optimization':
          result = await this.processDatabaseOptimization(job, parameters);
          break;
        default:
          throw new Error(`Unknown maintenance task: ${task}`);
      }

      await job.progress(90);

      const duration = Date.now() - startTime;
      
      logger.info(`✅ Maintenance job ${job.id} completed`, {
        task,
        duration,
        result
      });

      return {
        success: true,
        result,
        duration,
        processedAt: new Date()
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Maintenance job ${job.id} failed`, {
        task,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Maintenance job failed',
        duration,
        processedAt: new Date()
      };
    }
  }

  /**
   * Process reporting jobs
   */
  private async processReportingJob(job: Job) {
    const startTime = Date.now();

    try {
      logger.info(`📊 Processing reporting job ${job.id}`);

      await job.progress(20);

      // TODO: Implement reporting logic
      // Generate reports, send to stakeholders, etc.

      await job.progress(80);

      const duration = Date.now() - startTime;
      
      logger.info(`✅ Reporting job ${job.id} completed`, { duration });

      return {
        success: true,
        result: { reportGenerated: true },
        duration,
        processedAt: new Date()
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Reporting job ${job.id} failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Reporting job failed',
        duration,
        processedAt: new Date()
      };
    }
  }

  /**
   * Process cleanup jobs
   */
  private async processCleanupJob(job: Job) {
    const startTime = Date.now();

    try {
      logger.info(`🧹 Processing cleanup job ${job.id}`);

      await job.progress(20);

      // TODO: Implement cleanup logic
      // Clean up old files, expired records, etc.

      await job.progress(80);

      const duration = Date.now() - startTime;
      
      logger.info(`✅ Cleanup job ${job.id} completed`, { duration });

      return {
        success: true,
        result: { cleanupCompleted: true },
        duration,
        processedAt: new Date()
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Cleanup job ${job.id} failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cleanup job failed',
        duration,
        processedAt: new Date()
      };
    }
  }

  // Maintenance task implementations
  private async processSessionCleanup(job: Job, parameters?: any) {
    await job.progress(30);
    // TODO: Clean up expired sessions
    await job.progress(70);
    return { sessionsDeleted: 0 };
  }

  private async processLogRotation(job: Job, parameters?: any) {
    await job.progress(30);
    // TODO: Rotate log files
    await job.progress(70);
    return { filesRotated: 0 };
  }

  private async processTempFileCleanup(job: Job, parameters?: any) {
    await job.progress(30);
    // TODO: Clean up temporary files
    await job.progress(70);
    return { filesDeleted: 0 };
  }

  private async processDatabaseOptimization(job: Job, parameters?: any) {
    await job.progress(30);
    // TODO: Optimize database (analyze tables, update statistics, etc.)
    await job.progress(70);
    return { tablesOptimized: 0 };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    this.ensureInitialized();
    return await this.queueManager.getQueueStats();
  }

  /**
   * Pause a queue
   */
  async pauseQueue(jobType: JobType) {
    this.ensureInitialized();
    return await this.queueManager.pauseQueue(jobType);
  }

  /**
   * Resume a queue
   */
  async resumeQueue(jobType: JobType) {
    this.ensureInitialized();
    return await this.queueManager.resumeQueue(jobType);
  }

  /**
   * Clean queues
   */
  async cleanQueues() {
    this.ensureInitialized();
    return await this.queueManager.cleanQueues();
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string) {
    this.ensureInitialized();
    return await this.queueManager.getJob(jobId);
  }

  /**
   * Health check for job service
   */
  async healthCheck() {
    this.ensureInitialized();
    return await this.queueManager.healthCheck();
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.isInitialized) {
      await this.queueManager.shutdown();
      this.isInitialized = false;
    }
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error('JobService not initialized. Call initialize() first.');
    }
  }

  /**
   * Get paginated list of jobs
   */
  async getJobs(options: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    search?: string;
  } = {}) {
    this.ensureInitialized();
    return await this.queueManager.getJobs(options);
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string) {
    this.ensureInitialized();
    return await this.queueManager.retryJob(jobId);
  }

  /**
   * Remove a job from queue
   */
  async removeJob(jobId: string) {
    this.ensureInitialized();
    return await this.queueManager.removeJob(jobId);
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      initialized: this.isInitialized,
      supportedJobTypes: Object.values(JobType),
      processors: [
        'EmailJobProcessor',
        'NotificationJobProcessor', 
        'AnalyticsJobProcessor',
        'CacheJobProcessor',
        'MaintenanceJobProcessor',
        'ReportingJobProcessor',
        'CleanupJobProcessor'
      ],
      features: [
        'Multi-queue job processing',
        'Automatic retry with exponential backoff',
        'Job prioritization and scheduling',
        'Real-time monitoring and statistics',
        'Graceful shutdown handling',
        'Nigerian market optimization'
      ]
    };
  }
}